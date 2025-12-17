-- CreateTable
CREATE TABLE "patient_insurances" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "tpaId" TEXT NOT NULL,
    "policyNumber" TEXT NOT NULL,
    "policyHolderName" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTill" TIMESTAMP(3) NOT NULL,
    "sumInsured" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_insurances_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_admittingDoctorId_fkey" FOREIGN KEY ("admittingDoctorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_insurances" ADD CONSTRAINT "patient_insurances_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_insurances" ADD CONSTRAINT "patient_insurances_tpaId_fkey" FOREIGN KEY ("tpaId") REFERENCES "tpa_master"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
