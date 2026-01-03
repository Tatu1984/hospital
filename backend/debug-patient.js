const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
  // Find CCU-01 bed
  const ccuBed = await prisma.iCUBed.findFirst({
    where: { bedNumber: 'CCU-01' }
  });

  console.log('CCU-01 Bed:');
  console.log('  currentPatient ID:', ccuBed.currentPatient);
  console.log('  admissionId:', ccuBed.admissionId);

  // Get patient by the ID stored in bed
  if (ccuBed.currentPatient) {
    const patient = await prisma.patient.findUnique({
      where: { id: ccuBed.currentPatient }
    });
    console.log('\nPatient from currentPatient ID:');
    console.log('  Name:', patient?.name);
    console.log('  MRN:', patient?.mrn);
  }

  // Get admission if exists
  if (ccuBed.admissionId) {
    const admission = await prisma.admission.findUnique({
      where: { id: ccuBed.admissionId },
      include: { patient: true }
    });
    console.log('\nAdmission:');
    console.log('  ID:', admission?.id);
    console.log('  Patient Name:', admission?.patient?.name);
    console.log('  Patient MRN:', admission?.patient?.mrn);
  }

  // List all patients named Amit or Rajesh
  const patients = await prisma.patient.findMany({
    where: {
      OR: [
        { name: { contains: 'Amit', mode: 'insensitive' } },
        { name: { contains: 'Rajesh', mode: 'insensitive' } }
      ]
    }
  });
  console.log('\nPatients matching Amit or Rajesh:');
  patients.forEach(p => console.log('  ' + p.id + ' | ' + p.name + ' | ' + p.mrn));
}

debug().finally(() => prisma.$disconnect());
