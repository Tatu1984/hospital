#!/usr/bin/env node
/**
 * Script to apply nursing module API updates to server.ts
 * Run with: node apply-nursing-updates.js
 */

const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'src', 'server.ts');

console.log('Reading server.ts...');
let content = fs.readFileSync(serverPath, 'utf8');

// Update 1: POST /api/nursing/vitals - Add frontend parameter support
console.log('Updating POST /api/nursing/vitals endpoint...');
const vitalsPostOld = `app.post('/api/nursing/vitals', authenticateToken, async (req: any, res: Response) => {
  try {
    const {
      patientId,
      admissionId,
      heartRate,
      systolicBP,
      diastolicBP,
      temperature,
      spo2,
      respiratoryRate,
      weight,
      height,
      bmi,
      painScore,
      consciousness,
      notes,
    } = req.body;
    const { tenantId, branchId, userId, name } = req.user;

    const vitals = await prisma.nursingVitals.create({
      data: {
        tenantId,
        branchId,
        patientId,
        admissionId,
        heartRate,
        systolicBP,
        diastolicBP,
        temperature,
        spo2,
        respiratoryRate,
        weight,
        height,
        bmi,
        painScore,
        consciousness,
        notes,
        recordedAt: new Date(),
        recordedBy: userId,
        recordedByName: name,
      },
    });

    res.status(201).json(vitals);
  } catch (error) {
    console.error('Record nursing vitals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});`;

const vitalsPostNew = `app.post('/api/nursing/vitals', authenticateToken, async (req: any, res: Response) => {
  try {
    const {
      patientId,
      admissionId,
      heartRate,
      pulse,
      systolicBP,
      diastolicBP,
      bloodPressure,
      temperature,
      spo2,
      oxygenSaturation,
      respiratoryRate,
      weight,
      height,
      bmi,
      painScore,
      consciousness,
      notes,
    } = req.body;
    const { tenantId, branchId, userId, name } = req.user;

    // Parse blood pressure if provided as a string (e.g., "120/80")
    let parsedSystolicBP = systolicBP;
    let parsedDiastolicBP = diastolicBP;
    if (bloodPressure && typeof bloodPressure === 'string') {
      const bpParts = bloodPressure.split('/');
      if (bpParts.length === 2) {
        parsedSystolicBP = parseInt(bpParts[0], 10);
        parsedDiastolicBP = parseInt(bpParts[1], 10);
      }
    }

    // Handle pulse vs heartRate (frontend uses pulse)
    const finalHeartRate = pulse ? parseInt(pulse, 10) : (heartRate ? parseInt(heartRate, 10) : null);

    // Handle oxygenSaturation vs spo2 (frontend uses oxygenSaturation)
    const finalSpo2 = oxygenSaturation ? parseInt(oxygenSaturation, 10) : (spo2 ? parseInt(spo2, 10) : null);

    const vitals = await prisma.nursingVitals.create({
      data: {
        tenantId,
        branchId,
        patientId,
        admissionId,
        heartRate: finalHeartRate,
        systolicBP: parsedSystolicBP,
        diastolicBP: parsedDiastolicBP,
        temperature: temperature ? parseFloat(temperature) : null,
        spo2: finalSpo2,
        respiratoryRate: respiratoryRate ? parseInt(respiratoryRate, 10) : null,
        weight,
        height,
        bmi,
        painScore,
        consciousness,
        notes,
        recordedAt: new Date(),
        recordedBy: userId,
        recordedByName: name,
      },
    });

    res.status(201).json(vitals);
  } catch (error) {
    console.error('Record nursing vitals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});`;

if (content.includes(vitalsPostOld)) {
  content = content.replace(vitalsPostOld, vitalsPostNew);
  console.log('✓ Updated POST /api/nursing/vitals');
} else {
  console.log('⚠ Could not find exact match for POST /api/nursing/vitals - may need manual update');
}

// Write updated content
console.log('Writing updated server.ts...');
fs.writeFileSync(serverPath, content, 'utf8');
console.log('✓ Done! Server.ts has been updated.');
console.log('\nPlease review the changes and test the endpoints.');
