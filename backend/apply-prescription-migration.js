const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false }
});

async function applyMigration() {
  const client = await pool.connect();

  try {
    console.log('Starting migration...');

    // Start transaction
    await client.query('BEGIN');

    // Add new fields to Prescription table
    console.log('Adding new fields to prescriptions table...');
    await client.query(`
      ALTER TABLE "prescriptions"
        ADD COLUMN IF NOT EXISTS "admissionId" TEXT,
        ADD COLUMN IF NOT EXISTS "patientId" TEXT,
        ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    `);

    // Make opdNoteId nullable
    console.log('Making opdNoteId nullable...');
    await client.query(`
      ALTER TABLE "prescriptions"
        ALTER COLUMN "opdNoteId" DROP NOT NULL;
    `);

    // Update existing prescriptions to have a patientId
    console.log('Updating existing prescriptions with patientId...');
    await client.query(`
      UPDATE "prescriptions" p
      SET "patientId" = (
        SELECT "patientId"
        FROM "opd_notes" o
        WHERE o.id = p."opdNoteId"
      )
      WHERE p."patientId" IS NULL AND p."opdNoteId" IS NOT NULL;
    `);

    // For any remaining prescriptions without patientId, set a placeholder
    const { rows } = await client.query('SELECT id FROM "patients" LIMIT 1');
    if (rows.length > 0) {
      const firstPatientId = rows[0].id;
      await client.query(`
        UPDATE "prescriptions"
        SET "patientId" = $1
        WHERE "patientId" IS NULL;
      `, [firstPatientId]);
    }

    // Now make patientId NOT NULL
    console.log('Making patientId NOT NULL...');
    await client.query(`
      ALTER TABLE "prescriptions"
        ALTER COLUMN "patientId" SET NOT NULL;
    `);

    // Create indexes
    console.log('Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS "prescriptions_patientId_idx" ON "prescriptions"("patientId");
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS "prescriptions_status_idx" ON "prescriptions"("status");
    `);

    // Add prescriptionId to PharmacySale
    console.log('Adding prescriptionId to pharmacy_sales...');
    await client.query(`
      ALTER TABLE "pharmacy_sales"
        ADD COLUMN IF NOT EXISTS "prescriptionId" TEXT;
    `);

    // Create index for prescriptionId in PharmacySale
    await client.query(`
      CREATE INDEX IF NOT EXISTS "pharmacy_sales_prescriptionId_idx" ON "pharmacy_sales"("prescriptionId");
    `);

    // Commit transaction
    await client.query('COMMIT');

    console.log('Migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
