import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

// Auth middleware
const authenticateToken = (req: any, res: Response, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        tenant: true,
        branch: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        tenantId: user.tenantId,
        branchId: user.branchId,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        roleIds: user.roleIds,
        tenant: user.tenant,
        branch: user.branch,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Patient routes
app.get('/api/patients', authenticateToken, async (req: any, res: Response) => {
  try {
    const { search, limit = 50 } = req.query;

    const where: any = {
      tenantId: req.user.tenantId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { mrn: { contains: search, mode: 'insensitive' } },
        { contact: { contains: search, mode: 'insensitive' } },
      ];
    }

    const patients = await prisma.patient.findMany({
      where,
      take: parseInt(limit as string),
      orderBy: { createdAt: 'desc' },
      include: {
        branch: { select: { name: true } },
      },
    });

    res.json(patients);
  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/patients', authenticateToken, async (req: any, res: Response) => {
  try {
    const { name, dob, gender, contact, email, address, bloodGroup, allergies, referralSourceId } = req.body;

    // Generate MRN
    const lastPatient = await prisma.patient.findFirst({
      where: { tenantId: req.user.tenantId },
      orderBy: { createdAt: 'desc' },
    });

    let mrnNumber = 1;
    if (lastPatient) {
      const lastMrnNum = parseInt(lastPatient.mrn.replace(/\D/g, ''));
      mrnNumber = lastMrnNum + 1;
    }

    const mrn = `MRN${mrnNumber.toString().padStart(6, '0')}`;

    const patient = await prisma.patient.create({
      data: {
        tenantId: req.user.tenantId,
        branchId: req.user.branchId,
        mrn,
        name,
        dob: dob ? new Date(dob) : null,
        gender,
        contact,
        email,
        address,
        bloodGroup,
        allergies,
        referralSourceId: referralSourceId || null,
      },
      include: {
        branch: { select: { name: true } },
        referralSource: { select: { name: true, code: true, type: true } },
      },
    });

    res.status(201).json(patient);
  } catch (error) {
    console.error('Create patient error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/patients/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const patient = await prisma.patient.findFirst({
      where: {
        id,
        tenantId: req.user.tenantId,
      },
      include: {
        branch: true,
        encounters: {
          orderBy: { visitDate: 'desc' },
          take: 10,
          include: {
            doctor: { select: { name: true } },
          },
        },
      },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json(patient);
  } catch (error) {
    console.error('Get patient error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Users/Doctors routes
app.get('/api/users', authenticateToken, async (req: any, res: Response) => {
  try {
    const { role } = req.query;
    const where: any = { tenantId: req.user.tenantId, isActive: true };

    if (role) {
      where.roleIds = { has: role };
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        roleIds: true,
        departmentIds: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/doctors', authenticateToken, async (req: any, res: Response) => {
  try {
    const doctors = await prisma.user.findMany({
      where: {
        tenantId: req.user.tenantId,
        isActive: true,
        roleIds: { has: 'doctor' },
      },
      select: {
        id: true,
        name: true,
        email: true,
        departmentIds: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json(doctors);
  } catch (error) {
    console.error('Get doctors error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Encounter routes
app.post('/api/encounters', authenticateToken, async (req: any, res: Response) => {
  try {
    const { patientId, type, chiefComplaint } = req.body;

    const encounter = await prisma.encounter.create({
      data: {
        patientId,
        branchId: req.user.branchId,
        type: type || 'OP',
        doctorId: req.user.userId,
        chiefComplaint,
        status: 'active',
      },
      include: {
        patient: true,
        doctor: { select: { name: true } },
      },
    });

    res.status(201).json(encounter);
  } catch (error) {
    console.error('Create encounter error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/encounters', authenticateToken, async (req: any, res: Response) => {
  try {
    const { patientId, status = 'active' } = req.query;

    const where: any = {
      branchId: req.user.branchId,
    };

    if (patientId) {
      where.patientId = patientId;
    }

    if (status) {
      where.status = status;
    }

    const encounters = await prisma.encounter.findMany({
      where,
      orderBy: { visitDate: 'desc' },
      include: {
        patient: { select: { id: true, mrn: true, name: true, age: true } },
        doctor: { select: { name: true } },
      },
    });

    res.json(encounters);
  } catch (error) {
    console.error('Get encounters error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// OPD Notes
app.post('/api/opd-notes', authenticateToken, async (req: any, res: Response) => {
  try {
    const {
      encounterId,
      patientId,
      chiefComplaint,
      history,
      vitals,
      examination,
      assessment,
      plan,
      prescription,
    } = req.body;

    const opdNote = await prisma.opdNote.create({
      data: {
        encounterId,
        patientId,
        doctorId: req.user.userId,
        chiefComplaint,
        history,
        vitals,
        examination,
        assessment,
        plan,
      },
    });

    // Create prescription if provided
    if (prescription && prescription.drugs && prescription.drugs.length > 0) {
      await prisma.prescription.create({
        data: {
          opdNoteId: opdNote.id,
          doctorId: req.user.userId,
          drugs: prescription.drugs,
        },
      });
    }

    const result = await prisma.opdNote.findUnique({
      where: { id: opdNote.id },
      include: {
        prescriptions: true,
        doctor: { select: { name: true } },
      },
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Create OPD note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/opd-notes/:encounterId', authenticateToken, async (req: any, res: Response) => {
  try {
    const { encounterId } = req.params;

    const opdNotes = await prisma.opdNote.findMany({
      where: { encounterId },
      include: {
        prescriptions: true,
        doctor: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(opdNotes);
  } catch (error) {
    console.error('Get OPD notes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Invoice routes
app.post('/api/invoices', authenticateToken, async (req: any, res: Response) => {
  try {
    const { patientId, encounterId, type, items } = req.body;

    const subtotal = items.reduce((sum: number, item: any) => sum + parseFloat(item.amount), 0);
    const total = subtotal;
    const balance = total;

    const invoice = await prisma.invoice.create({
      data: {
        patientId,
        encounterId,
        type: type || 'OP',
        items,
        subtotal,
        total,
        balance,
        status: 'draft',
      },
      include: {
        patient: { select: { name: true, mrn: true } },
      },
    });

    res.status(201).json(invoice);
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/invoices/:id/payment', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, mode, transactionRef } = req.body;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        patient: { include: { referralSource: true } },
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const payment = await prisma.payment.create({
      data: {
        invoiceId: id,
        amount: parseFloat(amount),
        mode,
        transactionRef,
        receivedBy: req.user.userId,
      },
    });

    const totalPaid = parseFloat(invoice.paid.toString()) + parseFloat(amount);
    const newBalance = parseFloat(invoice.total.toString()) - totalPaid;

    await prisma.invoice.update({
      where: { id },
      data: {
        paid: totalPaid,
        balance: newBalance,
        status: newBalance <= 0 ? 'paid' : 'final',
      },
    });

    // Auto-create commission if patient has referral source and invoice is fully paid
    if (newBalance <= 0 && invoice.patient.referralSourceId && invoice.patient.referralSource) {
      const referralSource = invoice.patient.referralSource;
      const invoiceTotal = parseFloat(invoice.total.toString());

      const commissionAmount = calculateCommission(invoiceTotal, referralSource);

      if (commissionAmount > 0) {
        await prisma.commission.create({
          data: {
            referralSourceId: referralSource.id,
            patientId: invoice.patientId,
            invoiceId: invoice.id,
            invoiceAmount: invoiceTotal,
            commissionType: referralSource.commissionType,
            commissionRate: referralSource.commissionType === 'percentage' ? parseFloat(referralSource.commissionValue.toString()) : null,
            commissionAmount,
            status: 'pending',
          },
        });
      }
    }

    res.json(payment);
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/invoices', authenticateToken, async (req: any, res: Response) => {
  try {
    const { patientId, status } = req.query;

    const where: any = {};
    if (patientId) where.patientId = patientId;
    if (status) where.status = status;

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        patient: { select: { name: true, mrn: true } },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(invoices);
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Dashboard stats
app.get('/api/dashboard/stats', authenticateToken, async (req: any, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      todayPatients,
      todayEncounters,
      activeAdmissions,
      todayRevenue,
    ] = await Promise.all([
      prisma.patient.count({
        where: {
          branchId: req.user.branchId,
          createdAt: { gte: today },
        },
      }),
      prisma.encounter.count({
        where: {
          branchId: req.user.branchId,
          visitDate: { gte: today },
        },
      }),
      prisma.admission.count({
        where: {
          status: 'active',
        },
      }),
      prisma.invoice.aggregate({
        where: {
          createdAt: { gte: today },
          status: { in: ['final', 'paid'] },
        },
        _sum: { total: true },
      }),
    ]);

    res.json({
      todayPatients,
      todayEncounters,
      activeAdmissions,
      todayRevenue: todayRevenue._sum.total || 0,
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// BROKER/REFERRAL COMMISSION SYSTEM APIs
// ===========================

// Get all referral sources
app.get('/api/referral-sources', authenticateToken, async (req: any, res: Response) => {
  try {
    const { type, search } = req.query;
    const where: any = { tenantId: req.user.tenantId };

    if (type) where.type = type;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { contact: { contains: search, mode: 'insensitive' } },
      ];
    }

    const sources = await prisma.referralSource.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { patients: true, commissions: true }
        }
      }
    });

    res.json(sources);
  } catch (error) {
    console.error('Get referral sources error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create referral source
app.post('/api/referral-sources', authenticateToken, async (req: any, res: Response) => {
  try {
    const source = await prisma.referralSource.create({
      data: {
        tenantId: req.user.tenantId,
        ...req.body,
      },
    });

    res.status(201).json(source);
  } catch (error) {
    console.error('Create referral source error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update referral source
app.put('/api/referral-sources/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const source = await prisma.referralSource.update({
      where: { id },
      data: req.body,
    });

    res.json(source);
  } catch (error) {
    console.error('Update referral source error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Calculate commission for an invoice
const calculateCommission = (invoiceAmount: number, source: any) => {
  if (source.commissionType === 'percentage') {
    return (invoiceAmount * parseFloat(source.commissionValue)) / 100;
  } else if (source.commissionType === 'fixed') {
    return parseFloat(source.commissionValue);
  } else if (source.commissionType === 'tiered' && source.commissionTiers) {
    const tier = source.commissionTiers.find((t: any) =>
      invoiceAmount >= t.min && (t.max === null || invoiceAmount < t.max)
    );
    if (tier) {
      return (invoiceAmount * tier.value) / 100;
    }
  }
  return 0;
};

// Get commissions
app.get('/api/commissions', authenticateToken, async (req: any, res: Response) => {
  try {
    const { status, referralSourceId, fromDate, toDate } = req.query;
    const where: any = {};

    if (status) where.status = status;
    if (referralSourceId) where.referralSourceId = referralSourceId;
    if (fromDate) where.createdAt = { ...where.createdAt, gte: new Date(fromDate as string) };
    if (toDate) where.createdAt = { ...where.createdAt, lte: new Date(toDate as string) };

    const commissions = await prisma.commission.findMany({
      where,
      include: {
        referralSource: { select: { name: true, code: true } },
        patient: { select: { name: true, mrn: true } },
        invoice: { select: { id: true, total: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(commissions);
  } catch (error) {
    console.error('Get commissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve commission
app.post('/api/commissions/:id/approve', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const commission = await prisma.commission.update({
      where: { id },
      data: {
        status: 'approved',
        approvedBy: req.user.userId,
        approvedAt: new Date(),
      },
    });

    res.json(commission);
  } catch (error) {
    console.error('Approve commission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create commission payout
app.post('/api/commission-payouts', authenticateToken, async (req: any, res: Response) => {
  try {
    const { referralSourceId, fromDate, toDate, paymentMode, paymentReference, remarks } = req.body;

    // Get approved commissions for this source in date range
    const commissions = await prisma.commission.findMany({
      where: {
        referralSourceId,
        status: 'approved',
        createdAt: {
          gte: new Date(fromDate),
          lte: new Date(toDate),
        },
      },
    });

    if (commissions.length === 0) {
      return res.status(400).json({ error: 'No approved commissions found for payout' });
    }

    const totalAmount = commissions.reduce((sum, c) => sum + parseFloat(c.commissionAmount.toString()), 0);

    // Generate payout number
    const lastPayout = await prisma.commissionPayout.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    const payoutNumber = `CPAY${(lastPayout ? parseInt(lastPayout.payoutNumber.slice(4)) + 1 : 1).toString().padStart(6, '0')}`;

    // Create payout
    const payout = await prisma.commissionPayout.create({
      data: {
        referralSourceId,
        payoutNumber,
        fromDate: new Date(fromDate),
        toDate: new Date(toDate),
        totalAmount,
        paymentMode,
        paymentReference,
        paidBy: req.user.userId,
        remarks,
      },
    });

    // Update commissions
    await prisma.commission.updateMany({
      where: { id: { in: commissions.map(c => c.id) } },
      data: {
        status: 'paid',
        paidAt: new Date(),
        payoutId: payout.id,
      },
    });

    res.status(201).json(payout);
  } catch (error) {
    console.error('Create commission payout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get commission payouts
app.get('/api/commission-payouts', authenticateToken, async (req: any, res: Response) => {
  try {
    const { referralSourceId, status } = req.query;
    const where: any = {};

    if (referralSourceId) where.referralSourceId = referralSourceId;
    if (status) where.status = status;

    const payouts = await prisma.commissionPayout.findMany({
      where,
      include: {
        referralSource: { select: { name: true, code: true } },
        commissions: { select: { commissionAmount: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(payouts);
  } catch (error) {
    console.error('Get commission payouts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Commission summary by referral source
app.get('/api/commissions/summary', authenticateToken, async (req: any, res: Response) => {
  try {
    const summary = await prisma.commission.groupBy({
      by: ['referralSourceId', 'status'],
      _sum: { commissionAmount: true },
      _count: true,
    });

    const sources = await prisma.referralSource.findMany({
      where: { id: { in: summary.map(s => s.referralSourceId) } },
      select: { id: true, name: true, code: true },
    });

    const result = sources.map(source => {
      const sourceSummary = summary.filter(s => s.referralSourceId === source.id);
      return {
        ...source,
        pending: sourceSummary.find(s => s.status === 'pending')?._sum.commissionAmount || 0,
        approved: sourceSummary.find(s => s.status === 'approved')?._sum.commissionAmount || 0,
        paid: sourceSummary.find(s => s.status === 'paid')?._sum.commissionAmount || 0,
        totalCount: sourceSummary.reduce((sum, s) => sum + s._count, 0),
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Get commission summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// ACCOUNTS SYSTEM APIs
// ===========================

// Get account heads (Chart of Accounts)
app.get('/api/account-heads', authenticateToken, async (req: any, res: Response) => {
  try {
    const { type, search } = req.query;
    const where: any = { tenantId: req.user.tenantId };

    if (type) where.type = type;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const accounts = await prisma.accountHead.findMany({
      where,
      include: { group: { select: { name: true, type: true } } },
      orderBy: { code: 'asc' },
    });

    res.json(accounts);
  } catch (error) {
    console.error('Get account heads error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create account head
app.post('/api/account-heads', authenticateToken, async (req: any, res: Response) => {
  try {
    const account = await prisma.accountHead.create({
      data: {
        tenantId: req.user.tenantId,
        ...req.body,
      },
    });

    res.status(201).json(account);
  } catch (error) {
    console.error('Create account head error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get journal entries
app.get('/api/journal-entries', authenticateToken, async (req: any, res: Response) => {
  try {
    const { fromDate, toDate, entryType } = req.query;
    const where: any = { tenantId: req.user.tenantId };

    if (entryType) where.entryType = entryType;
    if (fromDate) where.entryDate = { ...where.entryDate, gte: new Date(fromDate as string) };
    if (toDate) where.entryDate = { ...where.entryDate, lte: new Date(toDate as string) };

    const entries = await prisma.journalEntry.findMany({
      where,
      include: {
        lines: {
          include: {
            accountHead: { select: { name: true, code: true } },
          },
        },
      },
      orderBy: { entryDate: 'desc' },
    });

    res.json(entries);
  } catch (error) {
    console.error('Get journal entries error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create journal entry
app.post('/api/journal-entries', authenticateToken, async (req: any, res: Response) => {
  try {
    const { description, lines, fiscalYearId } = req.body;

    // Validate debit = credit
    const totalDebit = lines.reduce((sum: number, line: any) => sum + parseFloat(line.debitAmount || 0), 0);
    const totalCredit = lines.reduce((sum: number, line: any) => sum + parseFloat(line.creditAmount || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return res.status(400).json({ error: 'Total debit must equal total credit' });
    }

    // Generate entry number
    const lastEntry = await prisma.journalEntry.findFirst({
      where: { tenantId: req.user.tenantId },
      orderBy: { createdAt: 'desc' },
    });
    const entryNumber = `JV${(lastEntry ? parseInt(lastEntry.entryNumber.slice(2)) + 1 : 1).toString().padStart(6, '0')}`;

    const entry = await prisma.journalEntry.create({
      data: {
        tenantId: req.user.tenantId,
        fiscalYearId,
        entryNumber,
        description,
        entryType: 'manual',
        totalDebit,
        totalCredit,
        createdBy: req.user.userId,
        lines: {
          create: lines.map((line: any) => ({
            accountHeadId: line.accountHeadId,
            description: line.description,
            debitAmount: parseFloat(line.debitAmount || 0),
            creditAmount: parseFloat(line.creditAmount || 0),
          })),
        },
      },
      include: {
        lines: {
          include: {
            accountHead: { select: { name: true, code: true } },
          },
        },
      },
    });

    res.status(201).json(entry);
  } catch (error) {
    console.error('Create journal entry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get ledger for an account
app.get('/api/ledger/:accountHeadId', authenticateToken, async (req: any, res: Response) => {
  try {
    const { accountHeadId } = req.params;
    const { fromDate, toDate } = req.query;

    const where: any = {
      tenantId: req.user.tenantId,
      accountHeadId,
    };

    if (fromDate) where.entryDate = { ...where.entryDate, gte: new Date(fromDate as string) };
    if (toDate) where.entryDate = { ...where.entryDate, lte: new Date(toDate as string) };

    const ledger = await prisma.ledgerEntry.findMany({
      where,
      include: {
        journalEntry: { select: { entryNumber: true, description: true } },
      },
      orderBy: { entryDate: 'asc' },
    });

    res.json(ledger);
  } catch (error) {
    console.error('Get ledger error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Trial balance
app.get('/api/trial-balance', authenticateToken, async (req: any, res: Response) => {
  try {
    const accounts = await prisma.accountHead.findMany({
      where: { tenantId: req.user.tenantId },
      select: { id: true, name: true, code: true, type: true, currentBalance: true },
      orderBy: { code: 'asc' },
    });

    const trialBalance = accounts.map(account => ({
      ...account,
      debit: ['asset', 'expense'].includes(account.type) ? account.currentBalance : 0,
      credit: ['liability', 'equity', 'income'].includes(account.type) ? account.currentBalance : 0,
    }));

    const totalDebit = trialBalance.reduce((sum, acc) => sum + parseFloat(acc.debit.toString()), 0);
    const totalCredit = trialBalance.reduce((sum, acc) => sum + parseFloat(acc.credit.toString()), 0);

    res.json({ accounts: trialBalance, totalDebit, totalCredit });
  } catch (error) {
    console.error('Get trial balance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// DOCTOR REVENUE SHARING APIs
// ===========================

// Get doctor contracts
app.get('/api/doctor-contracts', authenticateToken, async (req: any, res: Response) => {
  try {
    const contracts = await prisma.doctorContract.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.json(contracts);
  } catch (error) {
    console.error('Get doctor contracts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create doctor contract
app.post('/api/doctor-contracts', authenticateToken, async (req: any, res: Response) => {
  try {
    const contract = await prisma.doctorContract.create({
      data: req.body,
    });

    res.status(201).json(contract);
  } catch (error) {
    console.error('Create doctor contract error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get doctor revenues
app.get('/api/doctor-revenues', authenticateToken, async (req: any, res: Response) => {
  try {
    const { doctorId, status, fromDate, toDate } = req.query;
    const where: any = {};

    if (doctorId) where.doctorId = doctorId;
    if (status) where.status = status;
    if (fromDate) where.createdAt = { ...where.createdAt, gte: new Date(fromDate as string) };
    if (toDate) where.createdAt = { ...where.createdAt, lte: new Date(toDate as string) };

    const revenues = await prisma.doctorRevenue.findMany({
      where,
      include: {
        contract: { select: { contractNumber: true } },
        invoice: { select: { id: true, total: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(revenues);
  } catch (error) {
    console.error('Get doctor revenues error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create doctor payout
app.post('/api/doctor-payouts', authenticateToken, async (req: any, res: Response) => {
  try {
    const { contractId, doctorId, fromDate, toDate, paymentMode, paymentReference, deductions, remarks } = req.body;

    // Get approved revenues
    const revenues = await prisma.doctorRevenue.findMany({
      where: {
        doctorId,
        contractId,
        status: 'approved',
        createdAt: {
          gte: new Date(fromDate),
          lte: new Date(toDate),
        },
      },
    });

    if (revenues.length === 0) {
      return res.status(400).json({ error: 'No approved revenues found for payout' });
    }

    const totalRevenue = revenues.reduce((sum, r) => sum + parseFloat(r.revenueAmount.toString()), 0);
    const totalShare = revenues.reduce((sum, r) => sum + parseFloat(r.shareAmount.toString()), 0);
    const netAmount = totalShare - parseFloat(deductions || 0);

    // Generate payout number
    const lastPayout = await prisma.doctorPayout.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    const payoutNumber = `DPAY${(lastPayout ? parseInt(lastPayout.payoutNumber.slice(4)) + 1 : 1).toString().padStart(6, '0')}`;

    const payout = await prisma.doctorPayout.create({
      data: {
        contractId,
        doctorId,
        payoutNumber,
        fromDate: new Date(fromDate),
        toDate: new Date(toDate),
        totalRevenue,
        totalShare,
        deductions: parseFloat(deductions || 0),
        netAmount,
        paymentMode,
        paymentReference,
        paidBy: req.user.userId,
        remarks,
      },
    });

    // Update revenues
    await prisma.doctorRevenue.updateMany({
      where: { id: { in: revenues.map(r => r.id) } },
      data: {
        status: 'paid',
        paidAt: new Date(),
        payoutId: payout.id,
      },
    });

    res.status(201).json(payout);
  } catch (error) {
    console.error('Create doctor payout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get doctor payouts
app.get('/api/doctor-payouts', authenticateToken, async (req: any, res: Response) => {
  try {
    const { doctorId, contractId, status } = req.query;
    const where: any = {};

    if (doctorId) where.doctorId = doctorId;
    if (contractId) where.contractId = contractId;
    if (status) where.status = status;

    const payouts = await prisma.doctorPayout.findMany({
      where,
      include: {
        contract: { select: { contractNumber: true } },
        revenues: { select: { shareAmount: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(payouts);
  } catch (error) {
    console.error('Get doctor payouts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// MASTER DATA APIs
// ===========================

// Drugs
app.get('/api/drugs', authenticateToken, async (req: any, res: Response) => {
  try {
    const { search } = req.query;
    const where: any = { isActive: true };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { genericName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const drugs = await prisma.drug.findMany({ where, orderBy: { name: 'asc' } });
    res.json(drugs);
  } catch (error) {
    console.error('Get drugs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/drugs', authenticateToken, async (req: any, res: Response) => {
  try {
    const drug = await prisma.drug.create({ data: req.body });
    res.status(201).json(drug);
  } catch (error) {
    console.error('Create drug error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/drugs/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const drug = await prisma.drug.update({ where: { id }, data: req.body });
    res.json(drug);
  } catch (error) {
    console.error('Update drug error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Lab Tests
app.get('/api/lab-tests', authenticateToken, async (req: any, res: Response) => {
  try {
    const { search, category } = req.query;
    const where: any = { isActive: true };

    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const tests = await prisma.labTestMaster.findMany({ where, orderBy: { name: 'asc' } });
    res.json(tests);
  } catch (error) {
    console.error('Get lab tests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/lab-tests', authenticateToken, async (req: any, res: Response) => {
  try {
    const test = await prisma.labTestMaster.create({ data: req.body });
    res.status(201).json(test);
  } catch (error) {
    console.error('Create lab test error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Radiology Tests
app.get('/api/radiology-tests', authenticateToken, async (req: any, res: Response) => {
  try {
    const { search, modality } = req.query;
    const where: any = { isActive: true };

    if (modality) where.modality = modality;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const tests = await prisma.radiologyTestMaster.findMany({ where, orderBy: { name: 'asc' } });
    res.json(tests);
  } catch (error) {
    console.error('Get radiology tests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/radiology-tests', authenticateToken, async (req: any, res: Response) => {
  try {
    const test = await prisma.radiologyTestMaster.create({ data: req.body });
    res.status(201).json(test);
  } catch (error) {
    console.error('Create radiology test error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Procedures
app.get('/api/procedures', authenticateToken, async (req: any, res: Response) => {
  try {
    const { search } = req.query;
    const where: any = { isActive: true };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const procedures = await prisma.procedureMaster.findMany({ where, orderBy: { name: 'asc' } });
    res.json(procedures);
  } catch (error) {
    console.error('Get procedures error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Packages
app.get('/api/packages', authenticateToken, async (req: any, res: Response) => {
  try {
    const packages = await prisma.packageMaster.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    res.json(packages);
  } catch (error) {
    console.error('Get packages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Wards
app.get('/api/wards', authenticateToken, async (req: any, res: Response) => {
  try {
    const wards = await prisma.ward.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    res.json(wards);
  } catch (error) {
    console.error('Get wards error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// APPOINTMENT APIs
// ===========================

app.get('/api/appointments', authenticateToken, async (req: any, res: Response) => {
  try {
    const { date, patientId, doctorId, status } = req.query;
    const where: any = { tenantId: req.user.tenantId };

    if (date) {
      const startDate = new Date(date as string);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      where.appointmentDate = { gte: startDate, lt: endDate };
    }
    if (patientId) where.patientId = patientId;
    if (doctorId) where.doctorId = doctorId;
    if (status) where.status = status;

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, mrn: true, contact: true } },
        doctor: { select: { id: true, name: true } },
      },
      orderBy: [{ appointmentDate: 'asc' }, { appointmentTime: 'asc' }],
    });

    res.json(appointments);
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/appointments', authenticateToken, async (req: any, res: Response) => {
  try {
    const { patientId, doctorId, appointmentDate, appointmentTime, type, reason, notes, department } = req.body;

    if (!patientId || !doctorId || !appointmentDate || !appointmentTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const appointment = await prisma.appointment.create({
      data: {
        tenantId: req.user.tenantId,
        patientId,
        doctorId,
        appointmentDate: new Date(appointmentDate),
        appointmentTime,
        type: type || 'consultation',
        status: 'scheduled',
        reason,
        notes,
        department,
        createdBy: req.user.userId,
      },
      include: {
        patient: { select: { id: true, name: true, mrn: true, contact: true } },
        doctor: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(appointment);
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/appointments/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { appointmentDate, appointmentTime, type, reason, notes, status, department } = req.body;

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        ...(appointmentDate && { appointmentDate: new Date(appointmentDate) }),
        ...(appointmentTime && { appointmentTime }),
        ...(type && { type }),
        ...(reason !== undefined && { reason }),
        ...(notes !== undefined && { notes }),
        ...(status && { status }),
        ...(department !== undefined && { department }),
      },
      include: {
        patient: { select: { id: true, name: true, mrn: true, contact: true } },
        doctor: { select: { id: true, name: true } },
      },
    });

    res.json(appointment);
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/appointments/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.appointment.delete({ where: { id } });

    res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    console.error('Delete appointment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/appointments/:id/check-in', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const appointment = await prisma.appointment.update({
      where: { id },
      data: { status: 'checked-in' },
      include: {
        patient: { select: { id: true, name: true, mrn: true, contact: true } },
        doctor: { select: { id: true, name: true } },
      },
    });

    res.json(appointment);
  } catch (error) {
    console.error('Check-in appointment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/appointments/:id/cancel', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const appointment = await prisma.appointment.update({
      where: { id },
      data: { status: 'cancelled' },
      include: {
        patient: { select: { id: true, name: true, mrn: true, contact: true } },
        doctor: { select: { id: true, name: true } },
      },
    });

    res.json(appointment);
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// LABORATORY APIs
// ===========================

app.post('/api/lab-orders', authenticateToken, async (req: any, res: Response) => {
  try {
    const { patientId, encounterId, tests } = req.body;

    const order = await prisma.order.create({
      data: {
        patientId,
        encounterId,
        orderType: 'lab',
        orderedBy: req.user.userId,
        priority: req.body.priority || 'routine',
        details: { tests },
        status: 'pending',
      },
    });

    res.status(201).json(order);
  } catch (error) {
    console.error('Create lab order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/lab-orders', authenticateToken, async (req: any, res: Response) => {
  try {
    const { status, patientId } = req.query;
    const where: any = { orderType: 'lab' };

    if (status) where.status = status;
    if (patientId) where.patientId = patientId;

    const orders = await prisma.order.findMany({
      where,
      include: {
        patient: { select: { name: true, mrn: true } },
        results: true,
      },
      orderBy: { orderedAt: 'desc' },
    });

    res.json(orders);
  } catch (error) {
    console.error('Get lab orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/lab-orders/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        patient: { select: { name: true, mrn: true } },
        results: true,
      },
    });

    res.json(order);
  } catch (error) {
    console.error('Update lab order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/lab-results', authenticateToken, async (req: any, res: Response) => {
  try {
    const { orderId, resultData, isCritical } = req.body;

    const result = await prisma.result.create({
      data: {
        orderId,
        resultData,
        isCritical: isCritical || false,
        verifiedBy: req.user.userId,
      },
    });

    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'completed' },
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Create lab result error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// RADIOLOGY APIs
// ===========================

app.post('/api/radiology-orders', authenticateToken, async (req: any, res: Response) => {
  try {
    const { patientId, encounterId, tests } = req.body;

    const order = await prisma.order.create({
      data: {
        patientId,
        encounterId,
        orderType: 'radiology',
        orderedBy: req.user.userId,
        priority: req.body.priority || 'routine',
        details: { tests },
        status: 'pending',
      },
    });

    res.status(201).json(order);
  } catch (error) {
    console.error('Create radiology order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/radiology-orders/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        patient: { select: { name: true, mrn: true } },
        results: true,
      },
    });

    res.json(order);
  } catch (error) {
    console.error('Update radiology order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/radiology-orders', authenticateToken, async (req: any, res: Response) => {
  try {
    const { status, patientId } = req.query;
    const where: any = { orderType: 'radiology' };

    if (status) where.status = status;
    if (patientId) where.patientId = patientId;

    const orders = await prisma.order.findMany({
      where,
      include: {
        patient: { select: { name: true, mrn: true } },
        results: true,
      },
      orderBy: { orderedAt: 'desc' },
    });

    res.json(orders);
  } catch (error) {
    console.error('Get radiology orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// PHARMACY APIs
// ===========================

app.get('/api/pharmacy/pending-prescriptions', authenticateToken, async (req: any, res: Response) => {
  try {
    const prescriptions = await prisma.prescription.findMany({
      include: {
        opdNote: {
          include: {
            patient: { select: { name: true, mrn: true } },
            doctor: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(prescriptions);
  } catch (error) {
    console.error('Get pending prescriptions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// IPD (INPATIENT) APIs
// ===========================

app.post('/api/admissions', authenticateToken, async (req: any, res: Response) => {
  try {
    const { encounterId, patientId, bedId, diagnosis } = req.body;

    const admission = await prisma.admission.create({
      data: {
        encounterId,
        patientId,
        bedId,
        admittingDoctorId: req.user.userId,
        diagnosis,
        status: 'active',
      },
      include: {
        patient: { select: { name: true, mrn: true } },
        bed: { select: { bedNumber: true, category: true } },
      },
    });

    // Update bed status
    if (bedId) {
      await prisma.bed.update({
        where: { id: bedId },
        data: { status: 'occupied' },
      });
    }

    res.status(201).json(admission);
  } catch (error) {
    console.error('Create admission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/admissions', authenticateToken, async (req: any, res: Response) => {
  try {
    const { status } = req.query;
    const where: any = {};

    if (status) where.status = status;

    const admissions = await prisma.admission.findMany({
      where,
      include: {
        patient: { select: { name: true, mrn: true, dob: true, gender: true } },
        bed: { select: { bedNumber: true, category: true } },
      },
      orderBy: { admissionDate: 'desc' },
    });

    res.json(admissions);
  } catch (error) {
    console.error('Get admissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/admissions/:id/discharge', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { dischargeSummary } = req.body;

    const admission = await prisma.admission.update({
      where: { id },
      data: {
        status: 'discharged',
        dischargeDate: new Date(),
      },
      include: { bed: true },
    });

    // Update bed status
    if (admission.bedId) {
      await prisma.bed.update({
        where: { id: admission.bedId },
        data: { status: 'dirty' },
      });
    }

    res.json(admission);
  } catch (error) {
    console.error('Discharge patient error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/beds', authenticateToken, async (req: any, res: Response) => {
  try {
    const { status, category } = req.query;
    const where: any = { branchId: req.user.branchId };

    if (status) where.status = status;
    if (category) where.category = category;

    const beds = await prisma.bed.findMany({
      where,
      orderBy: { bedNumber: 'asc' },
    });

    res.json(beds);
  } catch (error) {
    console.error('Get beds error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// EMERGENCY/CASUALTY APIs
// ===========================

app.get('/api/emergency/cases', authenticateToken, async (req: any, res: Response) => {
  try {
    const { status } = req.query;
    const where: any = { tenantId: req.user.tenantId };

    if (status) where.status = status;

    // Mock data for now - replace with actual DB queries
    const cases = [
      {
        id: '1',
        patientId: 'p1',
        patientName: 'John Doe',
        patientMRN: 'MRN000001',
        age: 45,
        gender: 'Male',
        arrivalTime: new Date().toISOString(),
        triageCategory: 'RED',
        chiefComplaint: 'Chest pain',
        vitalSigns: { bp: '140/90', pulse: '110', temperature: '98.6', spo2: '95', respiratoryRate: '22' },
        status: 'ACTIVE',
        assignedDoctor: 'Dr. Smith',
        isMLC: false,
        waitingTime: '15 min'
      }
    ];

    res.json(cases);
  } catch (error) {
    console.error('Get emergency cases error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/emergency/cases', authenticateToken, async (req: any, res: Response) => {
  try {
    const caseData = req.body;

    // Mock response - replace with actual DB insert
    const newCase = {
      id: Date.now().toString(),
      ...caseData,
      arrivalTime: new Date().toISOString(),
      status: 'ACTIVE'
    };

    res.status(201).json(newCase);
  } catch (error) {
    console.error('Create emergency case error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/emergency/cases/:id/admit', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    // Mock response
    res.json({ message: 'Patient admitted to IPD', caseId: id });
  } catch (error) {
    console.error('Admit emergency case error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/emergency/cases/:id/discharge', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    // Mock response
    res.json({ message: 'Patient discharged', caseId: id });
  } catch (error) {
    console.error('Discharge emergency case error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// ICU & CRITICAL CARE APIs
// ===========================

app.get('/api/icu/beds', authenticateToken, async (req: any, res: Response) => {
  try {
    const { icuUnit, status } = req.query;

    // Mock data
    const beds = [
      {
        id: '1',
        bedNumber: 'ICU-01',
        icuUnit: 'MICU',
        status: 'OCCUPIED',
        patient: { id: 'p1', name: 'Jane Smith', mrn: 'MRN000002', age: 62, gender: 'Female' },
        admission: {
          id: 'adm1',
          admissionDate: new Date().toISOString(),
          diagnosis: 'Respiratory failure',
          isVentilated: true,
          ventilatorMode: 'SIMV'
        },
        latestVitals: {
          hr: '88',
          bp: '120/80',
          spo2: '96',
          temp: '99.2',
          rr: '18',
          timestamp: new Date().toISOString()
        }
      }
    ];

    res.json(beds);
  } catch (error) {
    console.error('Get ICU beds error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/icu/vitals', authenticateToken, async (req: any, res: Response) => {
  try {
    const vitalData = req.body;

    // Mock response
    res.status(201).json({ message: 'Vitals recorded', data: vitalData });
  } catch (error) {
    console.error('Record vitals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/icu/ventilator', authenticateToken, async (req: any, res: Response) => {
  try {
    const ventilatorData = req.body;

    // Mock response
    res.status(201).json({ message: 'Ventilator settings updated', data: ventilatorData });
  } catch (error) {
    console.error('Update ventilator error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// OPERATION THEATRE APIs
// ===========================

app.get('/api/surgeries', authenticateToken, async (req: any, res: Response) => {
  try {
    const { status, date } = req.query;

    // Mock data
    const surgeries = [
      {
        id: '1',
        patientId: 'p1',
        patientName: 'Robert Johnson',
        patientMRN: 'MRN000003',
        age: 55,
        gender: 'Male',
        procedureName: 'Appendectomy',
        surgeonName: 'Dr. Williams',
        otRoom: 'OT-1',
        scheduledDate: new Date().toISOString().split('T')[0],
        scheduledTime: '10:00 AM',
        duration: 120,
        status: 'SCHEDULED',
        priority: 'URGENT',
        anesthesiaType: 'General',
        preOpChecklist: true,
        notes: 'Patient allergic to penicillin'
      }
    ];

    res.json(surgeries);
  } catch (error) {
    console.error('Get surgeries error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/surgeries', authenticateToken, async (req: any, res: Response) => {
  try {
    const surgeryData = req.body;

    // Mock response
    const newSurgery = {
      id: Date.now().toString(),
      ...surgeryData,
      status: 'SCHEDULED'
    };

    res.status(201).json(newSurgery);
  } catch (error) {
    console.error('Schedule surgery error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/ot-rooms', authenticateToken, async (req: any, res: Response) => {
  try {
    // Mock data
    const rooms = [
      { id: '1', name: 'OT-1', status: 'AVAILABLE', currentSurgery: null },
      { id: '2', name: 'OT-2', status: 'IN_USE', currentSurgery: 'Appendectomy' }
    ];

    res.json(rooms);
  } catch (error) {
    console.error('Get OT rooms error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/surgeries/:id/start', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    res.json({ message: 'Surgery started', surgeryId: id });
  } catch (error) {
    console.error('Start surgery error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/surgeries/:id/complete', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    res.json({ message: 'Surgery completed', surgeryId: id });
  } catch (error) {
    console.error('Complete surgery error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/surgeries/:id/cancel', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    res.json({ message: 'Surgery cancelled', surgeryId: id });
  } catch (error) {
    console.error('Cancel surgery error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// BLOOD BANK APIs
// ===========================

app.get('/api/blood-bank/inventory', authenticateToken, async (req: any, res: Response) => {
  try {
    // Mock data
    const inventory = [
      { id: '1', bloodType: 'A+', component: 'Whole Blood', quantity: 12, expiringIn7Days: 2, expiringIn3Days: 1, expired: 0 },
      { id: '2', bloodType: 'O+', component: 'Whole Blood', quantity: 15, expiringIn7Days: 3, expiringIn3Days: 1, expired: 0 },
      { id: '3', bloodType: 'B+', component: 'Platelets', quantity: 8, expiringIn7Days: 1, expiringIn3Days: 0, expired: 0 }
    ];

    res.json(inventory);
  } catch (error) {
    console.error('Get blood inventory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/blood-bank/donors', authenticateToken, async (req: any, res: Response) => {
  try {
    // Mock data
    const donors = [
      {
        id: '1',
        donorId: 'D001',
        name: 'Mike Wilson',
        bloodType: 'A+',
        phone: '555-0101',
        lastDonation: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        totalDonations: 5,
        status: 'ELIGIBLE'
      }
    ];

    res.json(donors);
  } catch (error) {
    console.error('Get donors error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/blood-bank/donors', authenticateToken, async (req: any, res: Response) => {
  try {
    const donorData = req.body;

    const newDonor = {
      id: Date.now().toString(),
      donorId: `D${String(Date.now()).slice(-4)}`,
      ...donorData,
      totalDonations: 0,
      status: 'ELIGIBLE'
    };

    res.status(201).json(newDonor);
  } catch (error) {
    console.error('Register donor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/blood-bank/requests', authenticateToken, async (req: any, res: Response) => {
  try {
    const { status } = req.query;

    // Mock data
    const requests = [
      {
        id: '1',
        patientName: 'Sarah Brown',
        patientMRN: 'MRN000004',
        bloodType: 'A+',
        component: 'Whole Blood',
        unitsRequired: 2,
        urgency: 'URGENT',
        requestedBy: 'Dr. Davis',
        requestDate: new Date().toISOString(),
        status: 'PENDING',
        crossMatchStatus: 'PENDING'
      }
    ];

    res.json(requests);
  } catch (error) {
    console.error('Get blood requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/blood-bank/requests', authenticateToken, async (req: any, res: Response) => {
  try {
    const requestData = req.body;

    const newRequest = {
      id: Date.now().toString(),
      ...requestData,
      requestDate: new Date().toISOString(),
      status: 'PENDING',
      crossMatchStatus: 'PENDING'
    };

    res.status(201).json(newRequest);
  } catch (error) {
    console.error('Create blood request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/blood-bank/requests/:id/cross-match', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    res.json({ message: 'Cross-matching completed', requestId: id });
  } catch (error) {
    console.error('Cross-match error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/blood-bank/requests/:id/issue', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    res.json({ message: 'Blood issued successfully', requestId: id });
  } catch (error) {
    console.error('Issue blood error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// HR & STAFF MANAGEMENT APIs
// ===========================

app.get('/api/hr/employees', authenticateToken, async (req: any, res: Response) => {
  try {
    const { department, status } = req.query;

    // Mock data
    const employees = [
      {
        id: '1',
        employeeId: 'EMP001',
        name: 'Alice Cooper',
        designation: 'Senior Nurse',
        department: 'Emergency',
        phone: '555-0201',
        email: 'alice@hospital.com',
        joiningDate: '2020-01-15',
        status: 'ACTIVE',
        shift: 'Morning'
      }
    ];

    res.json(employees);
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/hr/employees', authenticateToken, async (req: any, res: Response) => {
  try {
    const employeeData = req.body;

    const newEmployee = {
      id: Date.now().toString(),
      employeeId: `EMP${String(Date.now()).slice(-4)}`,
      ...employeeData,
      status: 'ACTIVE'
    };

    res.status(201).json(newEmployee);
  } catch (error) {
    console.error('Add employee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/hr/attendance', authenticateToken, async (req: any, res: Response) => {
  try {
    const { date } = req.query;

    // Mock data
    const attendance = [
      {
        id: '1',
        employeeId: 'EMP001',
        employeeName: 'Alice Cooper',
        date: new Date().toISOString().split('T')[0],
        status: 'PRESENT',
        checkIn: '09:00 AM',
        checkOut: '05:00 PM'
      }
    ];

    res.json(attendance);
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/hr/attendance', authenticateToken, async (req: any, res: Response) => {
  try {
    const attendanceData = req.body;

    res.status(201).json({ message: 'Attendance marked', data: attendanceData });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/hr/leaves', authenticateToken, async (req: any, res: Response) => {
  try {
    const { status } = req.query;

    // Mock data
    const leaves = [
      {
        id: '1',
        employeeId: 'EMP001',
        employeeName: 'Alice Cooper',
        leaveType: 'Sick Leave',
        fromDate: new Date().toISOString().split('T')[0],
        toDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        reason: 'Medical checkup',
        status: 'PENDING',
        appliedDate: new Date().toISOString()
      }
    ];

    res.json(leaves);
  } catch (error) {
    console.error('Get leaves error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/hr/leaves/:id/approve', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    res.json({ message: 'Leave approved', leaveId: id });
  } catch (error) {
    console.error('Approve leave error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/hr/leaves/:id/reject', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    res.json({ message: 'Leave rejected', leaveId: id });
  } catch (error) {
    console.error('Reject leave error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// INVENTORY & PROCUREMENT APIs
// ===========================

app.get('/api/inventory/items', authenticateToken, async (req: any, res: Response) => {
  try {
    const { category, lowStock } = req.query;

    // Mock data
    const items = [
      {
        id: '1',
        itemCode: 'SUR001',
        name: 'Surgical Gloves',
        category: 'Consumables',
        currentStock: 450,
        reorderLevel: 200,
        unitPrice: 15.50,
        unit: 'Box',
        supplier: 'MedSupply Co.',
        lastRestocked: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '2',
        itemCode: 'SUR002',
        name: 'Syringes 5ml',
        category: 'Consumables',
        currentStock: 120,
        reorderLevel: 300,
        unitPrice: 8.25,
        unit: 'Pack',
        supplier: 'MedSupply Co.',
        lastRestocked: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    res.json(items);
  } catch (error) {
    console.error('Get inventory items error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/inventory/items', authenticateToken, async (req: any, res: Response) => {
  try {
    const itemData = req.body;

    const newItem = {
      id: Date.now().toString(),
      itemCode: `ITM${String(Date.now()).slice(-4)}`,
      ...itemData
    };

    res.status(201).json(newItem);
  } catch (error) {
    console.error('Add inventory item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/inventory/purchase-orders', authenticateToken, async (req: any, res: Response) => {
  try {
    const { status } = req.query;

    // Mock data
    const orders = [
      {
        id: '1',
        poNumber: 'PO2024001',
        supplier: 'MedSupply Co.',
        orderDate: new Date().toISOString(),
        expectedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        totalAmount: 5500,
        status: 'PENDING',
        items: [
          { name: 'Surgical Gloves', quantity: 100, unitPrice: 15.50 }
        ]
      }
    ];

    res.json(orders);
  } catch (error) {
    console.error('Get purchase orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/inventory/purchase-orders', authenticateToken, async (req: any, res: Response) => {
  try {
    const orderData = req.body;

    const newOrder = {
      id: Date.now().toString(),
      poNumber: `PO${new Date().getFullYear()}${String(Date.now()).slice(-4)}`,
      ...orderData,
      orderDate: new Date().toISOString(),
      status: 'PENDING'
    };

    res.status(201).json(newOrder);
  } catch (error) {
    console.error('Create purchase order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// AMBULANCE & TRANSPORT APIs
// ===========================

app.get('/api/ambulance/vehicles', authenticateToken, async (req: any, res: Response) => {
  try {
    const { status } = req.query;

    // Mock data
    const vehicles = [
      {
        id: '1',
        vehicleNumber: 'AMB-001',
        type: 'ALS',
        driverName: 'Tom Harris',
        driverPhone: '555-0301',
        status: 'AVAILABLE',
        currentLocation: 'Hospital',
        lastMaintenance: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    res.json(vehicles);
  } catch (error) {
    console.error('Get ambulance vehicles error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/ambulance/trips', authenticateToken, async (req: any, res: Response) => {
  try {
    const { status } = req.query;

    // Mock data
    const trips = [
      {
        id: '1',
        patientName: 'Emma Davis',
        patientPhone: '555-0401',
        pickupLocation: '123 Main St',
        dropLocation: 'City Hospital',
        requestTime: new Date().toISOString(),
        tripType: 'EMERGENCY',
        status: 'PENDING',
        assignedVehicle: null,
        estimatedTime: '15 min'
      }
    ];

    res.json(trips);
  } catch (error) {
    console.error('Get ambulance trips error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/ambulance/trips', authenticateToken, async (req: any, res: Response) => {
  try {
    const tripData = req.body;

    const newTrip = {
      id: Date.now().toString(),
      ...tripData,
      requestTime: new Date().toISOString(),
      status: 'PENDING'
    };

    res.status(201).json(newTrip);
  } catch (error) {
    console.error('Create trip request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/ambulance/trips/:id/assign', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { vehicleId } = req.body;

    res.json({ message: 'Vehicle assigned to trip', tripId: id, vehicleId });
  } catch (error) {
    console.error('Assign vehicle error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/ambulance/trips/:id/complete', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    res.json({ message: 'Trip completed', tripId: id });
  } catch (error) {
    console.error('Complete trip error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// HOUSEKEEPING & LINEN APIs
// ===========================

app.get('/api/housekeeping/tasks', authenticateToken, async (req: any, res: Response) => {
  try {
    const { status } = req.query;

    // Mock data
    const tasks = [
      {
        id: '1',
        location: 'Ward A',
        area: 'Room 101',
        taskType: 'Deep Cleaning',
        assignedTo: 'Maria Garcia',
        scheduledTime: '10:00 AM',
        status: 'PENDING',
        priority: 'HIGH'
      }
    ];

    res.json(tasks);
  } catch (error) {
    console.error('Get housekeeping tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/housekeeping/tasks/:id/complete', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    res.json({ message: 'Task completed', taskId: id });
  } catch (error) {
    console.error('Complete task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/housekeeping/laundry', authenticateToken, async (req: any, res: Response) => {
  try {
    // Mock data
    const laundry = [
      {
        id: '1',
        department: 'ICU',
        itemType: 'Bed Sheets',
        quantity: 50,
        requestDate: new Date().toISOString(),
        status: 'PENDING'
      }
    ];

    res.json(laundry);
  } catch (error) {
    console.error('Get laundry requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// DIET & KITCHEN APIs
// ===========================

app.get('/api/diet/orders', authenticateToken, async (req: any, res: Response) => {
  try {
    const { mealType } = req.query;

    // Mock data
    const orders = [
      {
        id: '1',
        patientName: 'John Smith',
        ward: 'Ward A',
        bedNumber: 'A-101',
        dietType: 'Diabetic',
        mealType: 'BREAKFAST',
        status: 'PENDING',
        scheduledTime: '08:00 AM'
      },
      {
        id: '2',
        patientName: 'Mary Jones',
        ward: 'Ward B',
        bedNumber: 'B-205',
        dietType: 'Low Sodium',
        mealType: 'LUNCH',
        status: 'DELIVERED',
        scheduledTime: '12:30 PM'
      }
    ];

    res.json(orders);
  } catch (error) {
    console.error('Get diet orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// QUALITY, COMPLIANCE & FEEDBACK APIs
// ===========================

app.get('/api/quality/incidents', authenticateToken, async (req: any, res: Response) => {
  try {
    const { status } = req.query;

    // Mock data
    const incidents = [
      {
        id: '1',
        type: 'Medication Error',
        description: 'Wrong dosage administered',
        reportedBy: 'Nurse Wilson',
        date: new Date().toISOString(),
        severity: 'MEDIUM',
        status: 'PENDING'
      }
    ];

    res.json(incidents);
  } catch (error) {
    console.error('Get incidents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/quality/feedbacks', authenticateToken, async (req: any, res: Response) => {
  try {
    // Mock data
    const feedbacks = [
      {
        id: '1',
        patientName: 'David Lee',
        department: 'Emergency',
        rating: 4,
        comments: 'Good service, prompt attention',
        date: new Date().toISOString()
      },
      {
        id: '2',
        patientName: 'Susan White',
        department: 'OPD',
        rating: 5,
        comments: 'Excellent care and friendly staff',
        date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    res.json(feedbacks);
  } catch (error) {
    console.error('Get feedbacks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// REPORTS/MIS APIs
// ===========================

app.get('/api/reports/dashboard', authenticateToken, async (req: any, res: Response) => {
  try {
    // Mock data for dashboard charts
    const dashboardData = {
      patientFlow: [
        { month: 'Jan', opd: 450, ipd: 120, emergency: 80 },
        { month: 'Feb', opd: 520, ipd: 135, emergency: 95 },
        { month: 'Mar', opd: 480, ipd: 140, emergency: 88 }
      ],
      revenue: [
        { month: 'Jan', amount: 125000 },
        { month: 'Feb', amount: 142000 },
        { month: 'Mar', amount: 138000 }
      ],
      departmentPerformance: [
        { department: 'Emergency', patients: 350, revenue: 45000 },
        { department: 'OPD', patients: 890, revenue: 78000 },
        { department: 'IPD', patients: 210, revenue: 125000 }
      ]
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('Get dashboard data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🏥 HMS Backend running on http://localhost:${PORT}`);
  console.log(`📊 API Health: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
