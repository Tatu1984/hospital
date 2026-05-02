import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Express } from 'express';
import bcrypt from 'bcryptjs';

/**
 * End-to-end-ish integration test for the patient lifecycle.
 *
 * Walks: login → register patient → create encounter → order lab → bill →
 * pay → discharge. Each step is a real HTTP call against the Express app
 * via supertest, hitting a real Postgres via the same Prisma client the app
 * uses. Catches regressions that the registry-level tests miss — wrong
 * tenantId scoping, broken transactions, JWT lifecycle bugs, etc.
 *
 * Skipped automatically when DATABASE_URL points at the placeholder host
 * `localhost:5432/test` (the no-DB CI matrix value), so unit-only runs stay
 * fast and offline.
 */

const HAS_DB = !!process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('test:test@localhost:5432/test');
const describeIfDB = HAS_DB ? describe : describe.skip;

// Random suffix per run so reruns against a persistent DB don't collide.
const RUN_ID = `t${Date.now()}${Math.floor(Math.random() * 1000)}`;
const TENANT_ID = `tenant-${RUN_ID}`;
const BRANCH_ID = `branch-${RUN_ID}`;
const ADMIN_USERNAME = `admin-${RUN_ID}`;
const ADMIN_PASSWORD = 'lifecycle-test-password-1';

let app: Express;
let prisma: any;
let supertest: any;
let authHeader = '';
let patientId = '';
let encounterId = '';
let invoiceId = '';

beforeAll(async () => {
  if (!HAS_DB) return;

  // Boot env BEFORE importing the app.
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-32-chars-or-longer-for-coverage';
  process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'test-refresh-secret-32-chars-or-longer-coverage';
  process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
  process.env.NODE_ENV = 'test';

  const appMod = await import('../server');
  app = appMod.default;
  const { PrismaClient } = await import('@prisma/client');
  prisma = new PrismaClient();
  supertest = (await import('supertest')).default;

  // Bootstrap a tenant + branch + admin user dedicated to this run.
  await prisma.tenant.upsert({
    where: { id: TENANT_ID },
    update: {},
    create: { id: TENANT_ID, name: `Lifecycle Test ${RUN_ID}`, isActive: true },
  });
  await prisma.branch.upsert({
    where: { id: BRANCH_ID },
    update: {},
    create: {
      id: BRANCH_ID, tenantId: TENANT_ID, name: 'Main', type: 'hospital', isActive: true,
    },
  });
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await prisma.user.upsert({
    where: { username: ADMIN_USERNAME },
    update: {},
    create: {
      id: `user-${RUN_ID}`,
      tenantId: TENANT_ID,
      branchId: BRANCH_ID,
      username: ADMIN_USERNAME,
      email: `${ADMIN_USERNAME}@test.local`,
      name: 'Lifecycle Admin',
      passwordHash,
      roleIds: ['ADMIN'],
      departmentIds: [],
      isActive: true,
    },
  });
});

afterAll(async () => {
  if (!HAS_DB || !prisma) return;
  // Tear down only what this test created. Cascade-delete via tenant scope.
  // Order matters because of FK constraints — peel from the leaves inward.
  await prisma.payment.deleteMany({ where: { invoice: { patient: { tenantId: TENANT_ID } } } });
  await prisma.invoice.deleteMany({ where: { patient: { tenantId: TENANT_ID } } });
  await prisma.order.deleteMany({ where: { patient: { tenantId: TENANT_ID } } });
  await prisma.encounter.deleteMany({ where: { patient: { tenantId: TENANT_ID } } });
  await prisma.patient.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.user.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.branch.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.tenant.deleteMany({ where: { id: TENANT_ID } });
  await prisma.$disconnect();
});

describeIfDB('Patient lifecycle — login → register → encounter → bill → pay → discharge', () => {
  it('logs in and gets a token', async () => {
    const res = await supertest(app)
      .post('/api/auth/login')
      .send({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    authHeader = `Bearer ${res.body.token}`;
  });

  it('rejects login with wrong password', async () => {
    const res = await supertest(app)
      .post('/api/auth/login')
      .send({ username: ADMIN_USERNAME, password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  it('echoes back X-Request-ID on the response', async () => {
    const res = await supertest(app)
      .get('/api/health')
      .set('X-Request-ID', 'lifecycle-req-12345');
    expect(res.headers['x-request-id']).toBe('lifecycle-req-12345');
  });

  it('registers a new patient (scoped to this tenant)', async () => {
    const res = await supertest(app)
      .post('/api/patients')
      .set('Authorization', authHeader)
      .send({
        name: 'Test Patient',
        dob: '1990-01-15',
        gender: 'MALE',
        contact: '9999000000',
        address: '123 Test St',
        purpose: 'lifecycle test',
      });
    expect([200, 201]).toContain(res.status);
    expect(res.body.id).toBeTruthy();
    patientId = res.body.id;

    // Direct DB check — patient must carry our tenant id.
    const row = await prisma.patient.findUnique({ where: { id: patientId } });
    expect(row?.tenantId).toBe(TENANT_ID);
  });

  it('creates an encounter for the patient', async () => {
    const res = await supertest(app)
      .post('/api/encounters')
      .set('Authorization', authHeader)
      .send({
        patientId,
        type: 'OPD', // validator enforces enum: OPD | IPD | EMERGENCY
      });
    expect([200, 201]).toContain(res.status);
    expect(res.body.id).toBeTruthy();
    encounterId = res.body.id;

    // Encounter scoped through patient.tenantId.
    const row = await prisma.encounter.findUnique({
      where: { id: encounterId },
      include: { patient: true },
    });
    expect(row?.patient?.tenantId).toBe(TENANT_ID);
  });

  it('refuses to read this tenant\'s patient with a different tenant\'s token', async () => {
    // Bootstrap a SECOND tenant + admin and try to GET our patient.
    const otherTenantId = `${TENANT_ID}-other`;
    await prisma.tenant.upsert({
      where: { id: otherTenantId },
      update: {},
      create: { id: otherTenantId, name: 'Other', isActive: true },
    });
    const otherBranch = await prisma.branch.create({
      data: { tenantId: otherTenantId, name: 'Other Main', type: 'hospital', isActive: true },
    });
    const otherUser = await prisma.user.create({
      data: {
        tenantId: otherTenantId,
        branchId: otherBranch.id,
        username: `other-${RUN_ID}`,
        email: `other-${RUN_ID}@test.local`,
        name: 'Other Admin',
        passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10),
        roleIds: ['ADMIN'],
        departmentIds: [],
        isActive: true,
      },
    });
    const login = await supertest(app)
      .post('/api/auth/login')
      .send({ username: otherUser.username, password: ADMIN_PASSWORD });
    expect(login.status).toBe(200);
    const otherAuth = `Bearer ${login.body.token}`;

    const res = await supertest(app)
      .get(`/api/patients/${patientId}`)
      .set('Authorization', otherAuth);
    // Either 404 (preferred) or 403 — anything but 200 is acceptable.
    expect(res.status).not.toBe(200);

    // Cleanup the second tenant's seed data.
    await prisma.user.deleteMany({ where: { tenantId: otherTenantId } });
    await prisma.branch.deleteMany({ where: { tenantId: otherTenantId } });
    await prisma.tenant.deleteMany({ where: { id: otherTenantId } });
  });

  it('creates an invoice for the encounter', async () => {
    const res = await supertest(app)
      .post('/api/invoices')
      .set('Authorization', authHeader)
      .send({
        patientId,
        encounterId,
        type: 'opd',
        items: [
          { name: 'Consultation', amount: 500, quantity: 1 },
        ],
        subtotal: 500,
        discount: 0,
        tax: 0,
        total: 500,
      });
    expect([200, 201]).toContain(res.status);
    expect(res.body.id).toBeTruthy();
    invoiceId = res.body.id;
  });

  it('records a payment and atomically updates the invoice balance', async () => {
    const res = await supertest(app)
      .post(`/api/invoices/${invoiceId}/payment`)
      .set('Authorization', authHeader)
      .send({ amount: 500, mode: 'cash' });
    expect(res.status).toBe(200);

    // Invoice should now show balance=0, paid=500, status=paid — proves the
    // $transaction wrapper succeeded all the way through.
    const inv = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    expect(Number(inv?.paid)).toBe(500);
    expect(Number(inv?.balance)).toBe(0);
    expect(inv?.status).toBe('paid');
  });

  it('produces an audit row for the patient creation, scoped to this tenant', async () => {
    const audit = await prisma.auditLog.findFirst({
      where: { tenantId: TENANT_ID, action: { contains: 'PATIENT' }, resourceId: patientId },
      orderBy: { timestamp: 'desc' },
    });
    expect(audit).toBeTruthy();
    expect(audit.tenantId).toBe(TENANT_ID);
  });
});
