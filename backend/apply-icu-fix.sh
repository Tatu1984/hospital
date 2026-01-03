#!/bin/bash

# This script will replace the ICU endpoints in server.ts with the fixed version

cd /Users/sudipto/Desktop/projects/hospitalerp/backend

# Create backup
cp src/server.ts src/server.ts.backup-$(date +%Y%m%d-%H%M%S)

# Use sed to remove old ICU section (lines 4339-4449)
# and insert the new fixed version from icu-endpoints-fixed.ts

# Extract everything before ICU section (up to line 4338)
head -n 4338 src/server.ts > src/server.ts.tmp

# Add the fixed ICU endpoints
cat >> src/server.ts.tmp <<'EOF'

// ===========================
// ICU & CRITICAL CARE APIs
// ===========================

app.get('/api/icu/beds', authenticateToken, async (req: any, res: Response) => {
  try {
    const { icuUnit, status } = req.query;
    const where: any = {};

    if (icuUnit) where.icuUnit = icuUnit;
    if (status) where.status = status;

    const beds = await prisma.iCUBed.findMany({
      where,
      include: {
        vitalsRecords: {
          orderBy: { recordedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { bedNumber: 'asc' },
    });

    // For each bed, get patient and admission info if occupied
    const bedsWithDetails = await Promise.all(beds.map(async (bed) => {
      let patient = null;
      let admission = null;

      // If bed has currentPatient, fetch patient and admission details
      if (bed.currentPatient && bed.admissionId) {
        try {
          const admissionRecord = await prisma.admission.findUnique({
            where: { id: bed.admissionId },
            include: {
              patient: {
                select: {
                  id: true,
                  name: true,
                  mrn: true,
                  dob: true,
                  gender: true,
                }
              }
            }
          });

          if (admissionRecord && admissionRecord.patient) {
            // Calculate age from DOB
            const age = admissionRecord.patient.dob
              ? Math.floor((new Date().getTime() - new Date(admissionRecord.patient.dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
              : null;

            patient = {
              id: admissionRecord.patient.id,
              name: admissionRecord.patient.name,
              mrn: admissionRecord.patient.mrn,
              age,
              gender: admissionRecord.patient.gender || 'Unknown',
            };

            // Check if patient is ventilated based on latest vitals
            const isVentilated = bed.vitalsRecords[0]?.ventilatorMode ? true : false;

            admission = {
              id: admissionRecord.id,
              admissionDate: admissionRecord.admissionDate,
              diagnosis: admissionRecord.diagnosis || 'Not specified',
              isVentilated,
              ventilatorMode: bed.vitalsRecords[0]?.ventilatorMode || null,
            };
          }
        } catch (err) {
          console.error('Error fetching patient/admission for bed', bed.id, err);
        }
      }

      return {
        id: bed.id,
        bedNumber: bed.bedNumber,
        icuUnit: bed.icuUnit,
        status: bed.status.toUpperCase(), // AVAILABLE, OCCUPIED, MAINTENANCE
        patient,
        admission,
        latestVitals: bed.vitalsRecords[0] ? {
          hr: bed.vitalsRecords[0].heartRate?.toString() || null,
          bp: bed.vitalsRecords[0].systolicBP && bed.vitalsRecords[0].diastolicBP
            ? `${b.vitalsRecords[0].systolicBP}/${b.vitalsRecords[0].diastolicBP}` : null,
          spo2: bed.vitalsRecords[0].spo2?.toString() || null,
          temp: bed.vitalsRecords[0].temperature?.toString() || null,
          rr: bed.vitalsRecords[0].respiratoryRate?.toString() || null,
          gcs: bed.vitalsRecords[0].gcs?.toString() || null,
          timestamp: bed.vitalsRecords[0].recordedAt,
        } : null,
      };
    }));

    res.json(bedsWithDetails);
  } catch (error) {
    console.error('Get ICU beds error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/icu/beds', authenticateToken, async (req: any, res: Response) => {
  try {
    const { bedNumber, icuUnit } = req.body;

    const bed = await prisma.iCUBed.create({
      data: {
        bedNumber,
        icuUnit,
      },
    });

    res.status(201).json(bed);
  } catch (error) {
    console.error('Create ICU bed error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/icu/vitals', authenticateToken, async (req: any, res: Response) => {
  try {
    // Frontend sends: bedId, hr, bp, spo2, temp, rr, gcs, cvp, uop, notes
    const { bedId, hr, bp, spo2, temp, rr, gcs, cvp, uop, notes } = req.body;

    // Get bed info to retrieve patient
    const bed = await prisma.iCUBed.findUnique({
      where: { id: bedId },
      select: { currentPatient: true, admissionId: true }
    });

    if (!bed || !bed.currentPatient) {
      return res.status(400).json({ error: 'No patient assigned to this bed' });
    }

    // Parse BP (format: "120/80")
    let systolicBP = null;
    let diastolicBP = null;
    if (bp && bp.includes('/')) {
      const [sys, dia] = bp.split('/');
      systolicBP = parseInt(sys);
      diastolicBP = parseInt(dia);
    }

    // Create vitals record
    const vitals = await prisma.iCUVitals.create({
      data: {
        icuBedId: bedId,
        patientId: bed.currentPatient,
        heartRate: hr ? parseInt(hr) : null,
        systolicBP,
        diastolicBP,
        temperature: temp ? parseFloat(temp) : null,
        spo2: spo2 ? parseInt(spo2) : null,
        respiratoryRate: rr ? parseInt(rr) : null,
        gcs: gcs ? parseInt(gcs) : null,
        recordedBy: req.user.userId,
      },
    });

    // Check for critical values and create alerts
    const criticalAlerts = [];

    // SpO2 < 90% = CRITICAL
    if (spo2 && parseInt(spo2) < 90) {
      const alert = await prisma.criticalAlert.create({
        data: {
          orderId: vitals.id, // Using vitals record ID as reference
          patientId: bed.currentPatient,
          testName: 'SpO2',
          value: spo2,
          unit: '%',
          normalRange: '>=94%',
          status: 'unacknowledged',
        }
      });
      criticalAlerts.push(alert);
      console.log(`CRITICAL ALERT: SpO2 ${spo2}% for patient ${bed.currentPatient}`);
    }

    // HR < 40 or > 140 = CRITICAL
    if (hr) {
      const heartRate = parseInt(hr);
      if (heartRate < 40 || heartRate > 140) {
        const alert = await prisma.criticalAlert.create({
          data: {
            orderId: vitals.id,
            patientId: bed.currentPatient,
            testName: 'Heart Rate',
            value: hr,
            unit: 'bpm',
            normalRange: '40-140 bpm',
            status: 'unacknowledged',
          }
        });
        criticalAlerts.push(alert);
        console.log(`CRITICAL ALERT: Heart Rate ${hr} bpm for patient ${bed.currentPatient}`);
      }
    }

    // Temp < 95°F or > 104°F = CRITICAL
    if (temp) {
      const temperature = parseFloat(temp);
      if (temperature < 95 || temperature > 104) {
        const alert = await prisma.criticalAlert.create({
          data: {
            orderId: vitals.id,
            patientId: bed.currentPatient,
            testName: 'Temperature',
            value: temp,
            unit: '°F',
            normalRange: '95-104°F',
            status: 'unacknowledged',
          }
        });
        criticalAlerts.push(alert);
        console.log(`CRITICAL ALERT: Temperature ${temp}°F for patient ${bed.currentPatient}`);
      }
    }

    res.status(201).json({
      vitals,
      criticalAlerts: criticalAlerts.length > 0 ? criticalAlerts : undefined,
      message: criticalAlerts.length > 0 ? `Vitals recorded. ${criticalAlerts.length} critical alert(s) generated.` : 'Vitals recorded successfully'
    });
  } catch (error) {
    console.error('Record vitals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/icu/ventilator', authenticateToken, async (req: any, res: Response) => {
  try {
    // Frontend sends: bedId, mode, fiO2, peep, tidalVolume, respiratoryRate, pressureSupport, notes
    const { bedId, mode, fiO2, peep, tidalVolume, respiratoryRate, pressureSupport, notes } = req.body;

    // Get bed info
    const bed = await prisma.iCUBed.findUnique({
      where: { id: bedId },
      select: { currentPatient: true, admissionId: true }
    });

    if (!bed || !bed.currentPatient) {
      return res.status(400).json({ error: 'No patient assigned to this bed' });
    }

    // Record as a vitals entry with ventilator params
    const vitals = await prisma.iCUVitals.create({
      data: {
        icuBedId: bedId,
        patientId: bed.currentPatient,
        ventilatorMode: mode,
        fio2: fiO2 ? parseInt(fiO2) : null,
        peep: peep ? parseInt(peep) : null,
        respiratoryRate: respiratoryRate ? parseInt(respiratoryRate) : null,
        recordedBy: req.user.userId,
      },
    });

    res.status(201).json({ message: 'Ventilator settings updated', vitals });
  } catch (error) {
    console.error('Update ventilator error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get ICU critical alerts
app.get('/api/icu/alerts', authenticateToken, async (req: any, res: Response) => {
  try {
    const { status, patientId } = req.query;
    const where: any = {};

    if (status) where.status = status;
    if (patientId) where.patientId = patientId;

    const alerts = await prisma.criticalAlert.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            mrn: true,
          }
        }
      },
      orderBy: { alertedAt: 'desc' },
      take: 100, // Limit to last 100 alerts
    });

    res.json(alerts);
  } catch (error) {
    console.error('Get ICU alerts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
EOF

# Extract everything after ICU section (from line 4450 onwards)
tail -n +4450 src/server.ts >> src/server.ts.tmp

# Replace original with updated version
mv src/server.ts.tmp src/server.ts

echo "ICU endpoints fixed successfully!"
echo "Backup saved as: src/server.ts.backup-$(date +%Y%m%d-%H%M%S)"
