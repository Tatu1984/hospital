import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { DRUGS, LAB_TESTS, RADIOLOGY_TESTS, PROCEDURES, PACKAGES, WARDS, OT_THEATRES } from './masterData';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create Tenant
  const tenant = await prisma.tenant.upsert({
    where: { id: 'tenant-1' },
    update: {},
    create: {
      id: 'tenant-1',
      name: 'Demo Hospital Group',
      contact: '+91-9876543210',
      address: '123 Medical Street, Healthcare City',
      isActive: true,
    },
  });
  console.log('✅ Tenant created:', tenant.name);

  // Create Branch
  const branch = await prisma.branch.upsert({
    where: { id: 'branch-1' },
    update: {},
    create: {
      id: 'branch-1',
      tenantId: tenant.id,
      name: 'Main Hospital',
      type: 'hospital',
      address: '123 Medical Street, Healthcare City',
      isActive: true,
    },
  });
  console.log('✅ Branch created:', branch.name);

  // Create Modules
  const modules = [
    { id: 'mod-admin', name: 'Core Platform & Admin', code: 'ADMIN', category: 'admin' },
    { id: 'mod-front-office', name: 'Front Office & Registration', code: 'FRONT_OFFICE', category: 'clinical' },
    { id: 'mod-opd', name: 'Outpatient (OPD)', code: 'OPD', category: 'clinical' },
    { id: 'mod-ipd', name: 'Inpatient (IPD)', code: 'IPD', category: 'clinical' },
    { id: 'mod-emergency', name: 'Emergency', code: 'EMERGENCY', category: 'clinical' },
    { id: 'mod-ot', name: 'Operation Theatre', code: 'OT', category: 'clinical' },
    { id: 'mod-icu', name: 'ICU & Critical Care', code: 'ICU', category: 'clinical' },
    { id: 'mod-lab', name: 'Laboratory (LIS)', code: 'LAB', category: 'clinical' },
    { id: 'mod-radiology', name: 'Radiology (RIS)', code: 'RADIOLOGY', category: 'clinical' },
    { id: 'mod-pharmacy', name: 'Pharmacy', code: 'PHARMACY', category: 'operations' },
    { id: 'mod-billing', name: 'Billing & Revenue', code: 'BILLING', category: 'finance' },
    { id: 'mod-hr', name: 'HR & Biometric', code: 'HR', category: 'operations' },
    { id: 'mod-inventory', name: 'Inventory', code: 'INVENTORY', category: 'operations' },
    { id: 'mod-analytics', name: 'Analytics & MIS', code: 'ANALYTICS', category: 'admin' },
  ];

  for (const mod of modules) {
    await prisma.module.upsert({
      where: { id: mod.id },
      update: {},
      create: mod,
    });
  }
  console.log('✅ Modules created:', modules.length);

  // Activate modules for branch
  for (const mod of modules) {
    await prisma.branchModule.upsert({
      where: {
        branchId_moduleId: {
          branchId: branch.id,
          moduleId: mod.id,
        },
      },
      update: {},
      create: {
        branchId: branch.id,
        moduleId: mod.id,
        isActive: true,
        activatedAt: new Date(),
      },
    });
  }
  console.log('✅ Modules activated for branch');

  // Create Departments
  const departments = [
    { id: 'dept-1', name: 'General Medicine', type: 'clinical' },
    { id: 'dept-2', name: 'Cardiology', type: 'clinical' },
    { id: 'dept-3', name: 'Orthopedics', type: 'clinical' },
    { id: 'dept-4', name: 'Pediatrics', type: 'clinical' },
    { id: 'dept-5', name: 'Laboratory', type: 'support' },
    { id: 'dept-6', name: 'Radiology', type: 'support' },
    { id: 'dept-7', name: 'Pharmacy', type: 'support' },
    { id: 'dept-8', name: 'Administration', type: 'support' },
  ];

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { id: dept.id },
      update: {},
      create: {
        ...dept,
        branchId: branch.id,
        isActive: true,
      },
    });
  }
  console.log('✅ Departments created:', departments.length);

  // Create Users
  const passwordHash = await bcrypt.hash('password123', 10);

  const users = [
    {
      id: 'user-admin',
      username: 'admin',
      email: 'admin@hospital.com',
      name: 'System Administrator',
      roleIds: ['ADMIN'],
      departmentIds: ['dept-8'],
    },
    {
      id: 'user-doctor1',
      username: 'doctor1',
      email: 'doctor@hospital.com',
      name: 'Dr. John Smith',
      roleIds: ['DOCTOR'],
      departmentIds: ['dept-1'],
    },
    {
      id: 'user-nurse1',
      username: 'nurse1',
      email: 'nurse@hospital.com',
      name: 'Nurse Mary Johnson',
      roleIds: ['NURSE'],
      departmentIds: ['dept-1'],
    },
    {
      id: 'user-frontdesk',
      username: 'frontdesk',
      email: 'frontdesk@hospital.com',
      name: 'Reception Staff',
      roleIds: ['FRONT_OFFICE'],
      departmentIds: ['dept-8'],
    },
    {
      id: 'user-billing',
      username: 'billing',
      email: 'billing@hospital.com',
      name: 'Billing Staff',
      roleIds: ['BILLING'],
      departmentIds: ['dept-8'],
    },
    {
      id: 'user-lab',
      username: 'lab',
      email: 'lab@hospital.com',
      name: 'Lab Technician',
      roleIds: ['LAB_TECH'],
      departmentIds: ['dept-5'],
    },
  ];

  for (const userData of users) {
    await prisma.user.upsert({
      where: { id: userData.id },
      update: {},
      create: {
        ...userData,
        tenantId: tenant.id,
        branchId: branch.id,
        passwordHash,
        isActive: true,
      },
    });
  }
  console.log('✅ Users created:', users.length);

  // Create some beds
  const wards = ['General Ward', 'ICU', 'Private'];
  let bedCount = 0;

  for (const ward of wards) {
    for (let i = 1; i <= 5; i++) {
      const bedNumber = `${ward.substring(0, 2).toUpperCase()}-${i}`;
      await prisma.bed.upsert({
        where: {
          branchId_bedNumber: {
            branchId: branch.id,
            bedNumber: bedNumber,
          },
        },
        update: {},
        create: {
          branchId: branch.id,
          wardId: ward,
          bedNumber: bedNumber,
          category: ward === 'Private' ? 'private' : ward === 'ICU' ? 'semi-private' : 'general',
          status: 'vacant',
        },
      });
      bedCount++;
    }
  }
  console.log('✅ Beds created:', bedCount);

  // Create sample patients
  const patients = [
    {
      mrn: 'MRN000001',
      name: 'Rajesh Kumar',
      dob: new Date('1980-05-15'),
      gender: 'Male',
      contact: '+91-9876543210',
      bloodGroup: 'O+',
    },
    {
      mrn: 'MRN000002',
      name: 'Priya Sharma',
      dob: new Date('1992-08-22'),
      gender: 'Female',
      contact: '+91-9876543211',
      bloodGroup: 'A+',
      allergies: 'Penicillin',
    },
    {
      mrn: 'MRN000003',
      name: 'Amit Patel',
      dob: new Date('1975-12-10'),
      gender: 'Male',
      contact: '+91-9876543212',
      bloodGroup: 'B+',
    },
  ];

  for (const patientData of patients) {
    await prisma.patient.upsert({
      where: {
        tenantId_mrn: {
          tenantId: tenant.id,
          mrn: patientData.mrn,
        },
      },
      update: {},
      create: {
        ...patientData,
        tenantId: tenant.id,
        branchId: branch.id,
      },
    });
  }
  console.log('✅ Sample patients created:', patients.length);

  // Seed Master Data
  console.log('\n📦 Seeding Master Data...');

  // Drugs
  for (const drug of DRUGS) {
    await prisma.drug.create({ data: drug });
  }
  console.log('✅ Drugs master:', DRUGS.length);

  // Lab Tests
  for (const test of LAB_TESTS) {
    await prisma.labTestMaster.create({ data: test });
  }
  console.log('✅ Lab tests master:', LAB_TESTS.length);

  // Radiology Tests
  for (const test of RADIOLOGY_TESTS) {
    await prisma.radiologyTestMaster.create({ data: test });
  }
  console.log('✅ Radiology tests master:', RADIOLOGY_TESTS.length);

  // Procedures
  for (const proc of PROCEDURES) {
    await prisma.procedureMaster.create({ data: proc });
  }
  console.log('✅ Procedures master:', PROCEDURES.length);

  // Packages
  for (const pkg of PACKAGES) {
    await prisma.packageMaster.create({ data: pkg });
  }
  console.log('✅ Packages master:', PACKAGES.length);

  // Wards
  for (const ward of WARDS) {
    await prisma.ward.create({ data: ward });
  }
  console.log('✅ Wards master:', WARDS.length);

  // OT Theatres
  for (const ot of OT_THEATRES) {
    await prisma.oTTheatre.create({ data: ot });
  }
  console.log('✅ OT theatres master:', OT_THEATRES.length);

  // Sample TPAs
  const tpas = [
    { name: 'Star Health Insurance', type: 'TPA', contact: '1800-102-4477', creditLimit: 500000, discountPercent: 10 },
    { name: 'ICICI Lombard', type: 'TPA', contact: '1800-266-7780', creditLimit: 1000000, discountPercent: 12 },
    { name: 'HDFC ERGO', type: 'TPA', contact: '1800-266-0700', creditLimit: 750000, discountPercent: 8 },
    { name: 'Corporate - TCS', type: 'Corporate', contact: '9876543210', creditLimit: 250000, discountPercent: 15 },
  ];
  for (const tpa of tpas) {
    await prisma.tPAMaster.create({ data: tpa });
  }
  console.log('✅ TPA/Corporate master:', tpas.length);

  // ===========================
  // BROKER/REFERRAL COMMISSION SYSTEM
  // ===========================
  console.log('\n💼 Seeding Broker/Referral Commission System...');

  const referralSources = [
    {
      tenantId: tenant.id,
      code: 'BR001',
      name: 'Dr. Rajesh Kumar',
      type: 'doctor',
      contact: '+91-9876543210',
      email: 'rajesh.kumar@example.com',
      commissionType: 'percentage',
      commissionValue: 10.00, // 10% commission
      bankName: 'HDFC Bank',
      accountNumber: '50100123456789',
      ifscCode: 'HDFC0001234',
      panNumber: 'ABCDE1234F',
    },
    {
      tenantId: tenant.id,
      code: 'BR002',
      name: 'Medicare Agents & Associates',
      type: 'broker',
      contact: '+91-9988776655',
      email: 'info@medicareagents.com',
      address: '456 Business Park, Medical District',
      commissionType: 'tiered',
      commissionValue: 0,
      commissionTiers: [
        { min: 0, max: 50000, value: 5 },
        { min: 50000, max: 100000, value: 7 },
        { min: 100000, max: null, value: 10 }
      ],
      bankName: 'ICICI Bank',
      accountNumber: '601234567890',
      ifscCode: 'ICIC0006789',
      panNumber: 'XYZAB9876C',
      gstNumber: '29XYZAB9876C1ZX',
    },
    {
      tenantId: tenant.id,
      code: 'BR003',
      name: 'City Health Clinic',
      type: 'hospital',
      contact: '+91-9123456789',
      email: 'admin@cityhealthclinic.com',
      address: '789 Medical Avenue, Healthcare Zone',
      commissionType: 'fixed',
      commissionValue: 500.00, // Rs. 500 per patient
      paymentTerms: 'Monthly payment within 15 days',
      bankName: 'SBI',
      accountNumber: '30123456789012',
      ifscCode: 'SBIN0001234',
      gstNumber: '27ABCDE1234F1Z5',
    },
    {
      tenantId: tenant.id,
      code: 'BR004',
      name: 'Corporate Wellness - Tech Corp',
      type: 'corporate',
      contact: '+91-9000111222',
      email: 'hr@techcorp.com',
      commissionType: 'percentage',
      commissionValue: 5.00,
      paymentTerms: 'Quarterly settlement',
    },
    {
      tenantId: tenant.id,
      code: 'SELF',
      name: 'Walk-in / Self',
      type: 'self',
      commissionType: 'percentage',
      commissionValue: 0,
    }
  ];

  for (const source of referralSources) {
    await prisma.referralSource.create({ data: source });
  }
  console.log('✅ Referral sources:', referralSources.length);

  // ===========================
  // ACCOUNTS SYSTEM
  // ===========================
  console.log('\n📊 Seeding Accounts System...');

  // Create Fiscal Year
  const fiscalYear = await prisma.fiscalYear.create({
    data: {
      tenantId: tenant.id,
      name: 'FY 2024-25',
      startDate: new Date('2024-04-01'),
      endDate: new Date('2025-03-31'),
      isActive: true,
    }
  });
  console.log('✅ Fiscal year created:', fiscalYear.name);

  // Create Account Groups (Chart of Accounts Structure)
  const accountGroups = [
    // Assets
    { id: 'grp-assets', tenantId: tenant.id, code: 'ASSETS', name: 'Assets', type: 'asset', parentId: null },
    { id: 'grp-current-assets', tenantId: tenant.id, code: 'CURRENT_ASSETS', name: 'Current Assets', type: 'asset', parentId: 'grp-assets' },
    { id: 'grp-fixed-assets', tenantId: tenant.id, code: 'FIXED_ASSETS', name: 'Fixed Assets', type: 'asset', parentId: 'grp-assets' },

    // Liabilities
    { id: 'grp-liabilities', tenantId: tenant.id, code: 'LIABILITIES', name: 'Liabilities', type: 'liability', parentId: null },
    { id: 'grp-current-liabilities', tenantId: tenant.id, code: 'CURRENT_LIABILITIES', name: 'Current Liabilities', type: 'liability', parentId: 'grp-liabilities' },

    // Equity
    { id: 'grp-equity', tenantId: tenant.id, code: 'EQUITY', name: 'Equity', type: 'equity', parentId: null },

    // Income
    { id: 'grp-income', tenantId: tenant.id, code: 'INCOME', name: 'Income', type: 'income', parentId: null },
    { id: 'grp-medical-income', tenantId: tenant.id, code: 'MEDICAL_INCOME', name: 'Medical Income', type: 'income', parentId: 'grp-income' },

    // Expenses
    { id: 'grp-expenses', tenantId: tenant.id, code: 'EXPENSES', name: 'Expenses', type: 'expense', parentId: null },
    { id: 'grp-operating-expenses', tenantId: tenant.id, code: 'OPERATING_EXPENSES', name: 'Operating Expenses', type: 'expense', parentId: 'grp-expenses' },
  ];

  for (const group of accountGroups) {
    await prisma.accountGroup.create({ data: group });
  }
  console.log('✅ Account groups:', accountGroups.length);

  // Create Account Heads (Individual Accounts)
  const accountHeads = [
    // Current Assets
    { tenantId: tenant.id, groupId: 'grp-current-assets', code: 'CASH001', name: 'Cash in Hand', type: 'asset', subType: 'current_asset', openingBalance: 50000, currentBalance: 50000, isSystemAccount: true },
    { tenantId: tenant.id, groupId: 'grp-current-assets', code: 'BANK001', name: 'HDFC Bank Current Account', type: 'asset', subType: 'current_asset', openingBalance: 500000, currentBalance: 500000, isSystemAccount: true },
    { tenantId: tenant.id, groupId: 'grp-current-assets', code: 'BANK002', name: 'ICICI Bank Savings Account', type: 'asset', subType: 'current_asset', openingBalance: 200000, currentBalance: 200000, isSystemAccount: false },
    { tenantId: tenant.id, groupId: 'grp-current-assets', code: 'AR001', name: 'Accounts Receivable - Patients', type: 'asset', subType: 'current_asset', openingBalance: 150000, currentBalance: 150000, isSystemAccount: true },
    { tenantId: tenant.id, groupId: 'grp-current-assets', code: 'AR002', name: 'Accounts Receivable - Insurance/TPA', type: 'asset', subType: 'current_asset', openingBalance: 300000, currentBalance: 300000, isSystemAccount: true },

    // Fixed Assets
    { tenantId: tenant.id, groupId: 'grp-fixed-assets', code: 'FA001', name: 'Medical Equipment', type: 'asset', subType: 'fixed_asset', openingBalance: 5000000, currentBalance: 5000000, isSystemAccount: false },
    { tenantId: tenant.id, groupId: 'grp-fixed-assets', code: 'FA002', name: 'Furniture & Fixtures', type: 'asset', subType: 'fixed_asset', openingBalance: 500000, currentBalance: 500000, isSystemAccount: false },
    { tenantId: tenant.id, groupId: 'grp-fixed-assets', code: 'FA003', name: 'Building', type: 'asset', subType: 'fixed_asset', openingBalance: 10000000, currentBalance: 10000000, isSystemAccount: false },

    // Current Liabilities
    { tenantId: tenant.id, groupId: 'grp-current-liabilities', code: 'AP001', name: 'Accounts Payable - Suppliers', type: 'liability', subType: 'current_liability', openingBalance: 200000, currentBalance: 200000, isSystemAccount: true },
    { tenantId: tenant.id, groupId: 'grp-current-liabilities', code: 'AP002', name: 'Salaries Payable', type: 'liability', subType: 'current_liability', openingBalance: 150000, currentBalance: 150000, isSystemAccount: true },
    { tenantId: tenant.id, groupId: 'grp-current-liabilities', code: 'AP003', name: 'Commission Payable - Brokers', type: 'liability', subType: 'current_liability', openingBalance: 0, currentBalance: 0, isSystemAccount: true },
    { tenantId: tenant.id, groupId: 'grp-current-liabilities', code: 'AP004', name: 'Doctor Revenue Share Payable', type: 'liability', subType: 'current_liability', openingBalance: 0, currentBalance: 0, isSystemAccount: true },

    // Equity
    { tenantId: tenant.id, groupId: 'grp-equity', code: 'EQ001', name: 'Capital', type: 'equity', subType: null, openingBalance: 15000000, currentBalance: 15000000, isSystemAccount: true },
    { tenantId: tenant.id, groupId: 'grp-equity', code: 'EQ002', name: 'Retained Earnings', type: 'equity', subType: null, openingBalance: 950000, currentBalance: 950000, isSystemAccount: true },

    // Medical Income
    { tenantId: tenant.id, groupId: 'grp-medical-income', code: 'INC001', name: 'OPD Consultation Income', type: 'income', subType: null, openingBalance: 0, currentBalance: 0, isSystemAccount: true },
    { tenantId: tenant.id, groupId: 'grp-medical-income', code: 'INC002', name: 'IPD Room Charges', type: 'income', subType: null, openingBalance: 0, currentBalance: 0, isSystemAccount: true },
    { tenantId: tenant.id, groupId: 'grp-medical-income', code: 'INC003', name: 'Laboratory Income', type: 'income', subType: null, openingBalance: 0, currentBalance: 0, isSystemAccount: true },
    { tenantId: tenant.id, groupId: 'grp-medical-income', code: 'INC004', name: 'Radiology Income', type: 'income', subType: null, openingBalance: 0, currentBalance: 0, isSystemAccount: true },
    { tenantId: tenant.id, groupId: 'grp-medical-income', code: 'INC005', name: 'Pharmacy Sales', type: 'income', subType: null, openingBalance: 0, currentBalance: 0, isSystemAccount: true },
    { tenantId: tenant.id, groupId: 'grp-medical-income', code: 'INC006', name: 'Procedure Income', type: 'income', subType: null, openingBalance: 0, currentBalance: 0, isSystemAccount: true },

    // Operating Expenses
    { tenantId: tenant.id, groupId: 'grp-operating-expenses', code: 'EXP001', name: 'Staff Salaries', type: 'expense', subType: null, openingBalance: 0, currentBalance: 0, isSystemAccount: true },
    { tenantId: tenant.id, groupId: 'grp-operating-expenses', code: 'EXP002', name: 'Medical Supplies', type: 'expense', subType: null, openingBalance: 0, currentBalance: 0, isSystemAccount: false },
    { tenantId: tenant.id, groupId: 'grp-operating-expenses', code: 'EXP003', name: 'Utilities (Electricity, Water)', type: 'expense', subType: null, openingBalance: 0, currentBalance: 0, isSystemAccount: false },
    { tenantId: tenant.id, groupId: 'grp-operating-expenses', code: 'EXP004', name: 'Rent', type: 'expense', subType: null, openingBalance: 0, currentBalance: 0, isSystemAccount: false },
    { tenantId: tenant.id, groupId: 'grp-operating-expenses', code: 'EXP005', name: 'Maintenance & Repairs', type: 'expense', subType: null, openingBalance: 0, currentBalance: 0, isSystemAccount: false },
    { tenantId: tenant.id, groupId: 'grp-operating-expenses', code: 'EXP006', name: 'Commission Expense - Brokers', type: 'expense', subType: null, openingBalance: 0, currentBalance: 0, isSystemAccount: true },
    { tenantId: tenant.id, groupId: 'grp-operating-expenses', code: 'EXP007', name: 'Doctor Revenue Share Expense', type: 'expense', subType: null, openingBalance: 0, currentBalance: 0, isSystemAccount: true },
  ];

  for (const account of accountHeads) {
    await prisma.accountHead.create({ data: account });
  }
  console.log('✅ Account heads (Chart of Accounts):', accountHeads.length);

  // ===========================
  // DOCTOR REVENUE SHARING SYSTEM
  // ===========================
  console.log('\n👨‍⚕️ Seeding Doctor Revenue Sharing System...');

  // Get doctor user IDs
  const doctor1 = users.find(u => u.username === 'doctor1');

  if (doctor1) {
    const doctorContract = await prisma.doctorContract.create({
      data: {
        doctorId: doctor1.id,
        contractNumber: 'DOC-CONTRACT-001',
        startDate: new Date('2024-01-01'),
        revenueShareType: 'percentage',
        revenueShareValue: 40.00, // 40% revenue share
        consultationFeeShare: 60.00, // 60% of consultation fees
        procedureFeeShare: 40.00, // 40% of procedure fees
        paymentCycle: 'monthly',
        bankName: 'HDFC Bank',
        accountNumber: '50200987654321',
        ifscCode: 'HDFC0001234',
        panNumber: 'ABCDE5678X',
        isActive: true,
      }
    });
    console.log('✅ Doctor contract created for:', doctor1.name);
  }

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📝 Login credentials:');
  console.log('   Admin:      admin / password123');
  console.log('   Doctor:     doctor1 / password123');
  console.log('   Nurse:      nurse1 / password123');
  console.log('   Front Desk: frontdesk / password123');
  console.log('   Billing:    billing / password123');
  console.log('   Lab:        lab / password123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
