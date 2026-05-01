#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Create or upsert a super-admin user against any DATABASE_URL.
 *
 * Run locally — never commit DATABASE_URL anywhere.
 *
 *   cd backend  # so prisma client is reachable
 *   DATABASE_URL='postgresql://...neon.tech/...?sslmode=require' \
 *   ADMIN_USERNAME=sudipto \
 *   ADMIN_EMAIL=sudipto@example.com \
 *   ADMIN_NAME='Sudipto Mitra' \
 *   ADMIN_PASSWORD='<a-strong-password-min-12-chars>' \
 *   node ../scripts/create-admin.js
 *
 * What it does:
 *   1. Connects to the DB.
 *   2. Picks the most recent tenant + branch (or creates a default if none).
 *   3. If a user with the supplied username/email exists, rotates the
 *      password and ensures the ADMIN role. Otherwise inserts a new user.
 *   4. Prints the resulting user record.
 *
 * Safe to re-run. Idempotent. Won't touch anyone else.
 */

const path = require('path');
const bcrypt = require(path.join(__dirname, '..', 'backend', 'node_modules', 'bcryptjs'));
const { PrismaClient } = require(path.join(__dirname, '..', 'backend', 'node_modules', '@prisma/client'));

function need(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`ERROR: ${name} environment variable is required.`);
    process.exit(1);
  }
  return v;
}

async function main() {
  if (!process.env.DATABASE_URL) need('DATABASE_URL');
  const username = need('ADMIN_USERNAME');
  const email    = need('ADMIN_EMAIL');
  const name     = process.env.ADMIN_NAME || username;
  const password = need('ADMIN_PASSWORD');

  if (password.length < 12) {
    console.error('ERROR: ADMIN_PASSWORD must be at least 12 characters.');
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    // 1. Pick the tenant + branch the user will belong to.
    let tenant = await prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!tenant) {
      console.log('No tenant found — creating a default "Default Hospital" tenant…');
      tenant = await prisma.tenant.create({
        data: { name: 'Default Hospital', isActive: true },
      });
    }
    let branch = await prisma.branch.findFirst({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'asc' },
    });
    if (!branch) {
      console.log('No branch found — creating a default "Main Hospital" branch…');
      branch = await prisma.branch.create({
        data: {
          tenantId: tenant.id,
          name: 'Main Hospital',
          type: 'hospital',
          isActive: true,
        },
      });
    }
    console.log(`Tenant: ${tenant.id} (${tenant.name})`);
    console.log(`Branch: ${branch.id} (${branch.name})`);

    // 2. Hash the new password.
    const passwordHash = await bcrypt.hash(password, 10);

    // 3. Upsert by username (within tenant). Fall back to email match.
    const existing = await prisma.user.findFirst({
      where: {
        tenantId: tenant.id,
        OR: [{ username }, { email }],
      },
    });

    let user;
    if (existing) {
      const roleIds = Array.from(new Set([...(existing.roleIds || []), 'ADMIN']));
      user = await prisma.user.update({
        where: { id: existing.id },
        data: {
          username,
          email,
          name,
          passwordHash,
          roleIds,
          isActive: true,
        },
      });
      console.log(`✔ Existing user updated: ${user.username} (${user.email}) — password rotated, ADMIN role ensured.`);
    } else {
      user = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          username,
          email,
          name,
          passwordHash,
          roleIds: ['ADMIN'],
          isActive: true,
        },
      });
      console.log(`✔ New ADMIN user created: ${user.username} (${user.email})`);
    }

    console.log('\nLog in at the frontend with:');
    console.log(`  username: ${user.username}`);
    console.log(`  password: <the value of ADMIN_PASSWORD you supplied>`);
    console.log('\nNext step (recommended): log in, then disable the seeded `admin` user from System Control.');
  } catch (e) {
    console.error('FAILED:', e?.message || e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
