-- CreateTable
CREATE TABLE "drug_interactions" (
    "id" TEXT NOT NULL,
    "drug1Id" TEXT NOT NULL,
    "drug2Id" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "clinicalEffect" TEXT NOT NULL,
    "management" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drug_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_allergies" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "allergen" TEXT NOT NULL,
    "reaction" TEXT,
    "severity" TEXT NOT NULL,
    "onsetDate" TIMESTAMP(3),
    "notes" TEXT,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_allergies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "drug_interactions_severity_idx" ON "drug_interactions"("severity");

-- CreateIndex
CREATE INDEX "drug_interactions_drug1Id_idx" ON "drug_interactions"("drug1Id");

-- CreateIndex
CREATE INDEX "drug_interactions_drug2Id_idx" ON "drug_interactions"("drug2Id");

-- CreateIndex
CREATE UNIQUE INDEX "drug_interactions_drug1Id_drug2Id_key" ON "drug_interactions"("drug1Id", "drug2Id");

-- CreateIndex
CREATE INDEX "patient_allergies_patientId_idx" ON "patient_allergies"("patientId");

-- CreateIndex
CREATE INDEX "patient_allergies_severity_idx" ON "patient_allergies"("severity");

-- AddForeignKey
ALTER TABLE "drug_interactions" ADD CONSTRAINT "drug_interactions_drug1Id_fkey" FOREIGN KEY ("drug1Id") REFERENCES "drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_interactions" ADD CONSTRAINT "drug_interactions_drug2Id_fkey" FOREIGN KEY ("drug2Id") REFERENCES "drugs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
