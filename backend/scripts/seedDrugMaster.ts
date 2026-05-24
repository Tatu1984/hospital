// One-shot seeder for the DrugMaster catalog. Run with:
//   npx tsx scripts/seedDrugMaster.ts
//
// Idempotent — re-running just upserts.
// To refresh from a fresh CDSCO CSV, replace the import below with your
// CSV parser (the underlying upsert logic stays the same).

import { PrismaClient } from '@prisma/client';
import { DRUG_MASTER_SEED } from '../src/data/drugMasterSeed';

const prisma = new PrismaClient();

async function main() {
  let inserted = 0;
  let updated = 0;
  for (const d of DRUG_MASTER_SEED) {
    const existing = await prisma.drugMaster.findFirst({
      where: {
        genericName: d.genericName,
        strength: d.strength || null,
        form: d.form || null,
      },
    });
    if (existing) {
      await prisma.drugMaster.update({
        where: { id: existing.id },
        data: {
          brandNames: d.brandNames || [],
          manufacturer: d.manufacturer ?? null,
          therapeuticClass: d.therapeuticClass,
          atcCode: d.atcCode ?? null,
          strength: d.strength ?? null,
          form: d.form ?? null,
          schedule: d.schedule ?? '',
          isEssential: d.isEssential ?? false,
          hsnCode: d.hsnCode ?? null,
          pregnancyCategory: d.pregnancyCategory ?? null,
          indications: d.indications ?? null,
          contraindications: d.contraindications ?? null,
          source: d.source ?? 'manual',
        },
      });
      updated++;
    } else {
      await prisma.drugMaster.create({
        data: {
          genericName: d.genericName,
          brandNames: d.brandNames || [],
          manufacturer: d.manufacturer ?? null,
          therapeuticClass: d.therapeuticClass,
          atcCode: d.atcCode ?? null,
          strength: d.strength ?? null,
          form: d.form ?? null,
          schedule: d.schedule ?? '',
          isEssential: d.isEssential ?? false,
          hsnCode: d.hsnCode ?? null,
          pregnancyCategory: d.pregnancyCategory ?? null,
          indications: d.indications ?? null,
          contraindications: d.contraindications ?? null,
          source: d.source ?? 'manual',
        },
      });
      inserted++;
    }
  }
  const total = await prisma.drugMaster.count();
  console.log(`drug master seeded: ${inserted} inserted, ${updated} updated. Catalog total: ${total} drugs.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
