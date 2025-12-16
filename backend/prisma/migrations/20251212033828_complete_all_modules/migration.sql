-- CreateTable
CREATE TABLE "blood_donors" (
    "id" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "gender" TEXT NOT NULL,
    "bloodType" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "lastDonationAt" TIMESTAMP(3),
    "totalDonations" INTEGER NOT NULL DEFAULT 0,
    "isEligible" BOOLEAN NOT NULL DEFAULT true,
    "screeningStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blood_donors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blood_donations" (
    "id" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "donationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bloodType" TEXT NOT NULL,
    "component" TEXT NOT NULL DEFAULT 'whole_blood',
    "volume" INTEGER NOT NULL DEFAULT 450,
    "bagNumber" TEXT NOT NULL,
    "collectedBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'collected',
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blood_donations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blood_inventory" (
    "id" TEXT NOT NULL,
    "donationId" TEXT,
    "bloodType" TEXT NOT NULL,
    "component" TEXT NOT NULL,
    "bagNumber" TEXT NOT NULL,
    "volume" INTEGER NOT NULL,
    "collectionDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blood_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blood_requests" (
    "id" TEXT NOT NULL,
    "patientId" TEXT,
    "patientName" TEXT NOT NULL,
    "patientMRN" TEXT,
    "bloodType" TEXT NOT NULL,
    "component" TEXT NOT NULL,
    "unitsRequested" INTEGER NOT NULL,
    "urgency" TEXT NOT NULL DEFAULT 'routine',
    "indication" TEXT,
    "requestedBy" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "crossMatchedAt" TIMESTAMP(3),
    "crossMatchedBy" TEXT,
    "crossMatchResult" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blood_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blood_issuances" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedBy" TEXT,
    "receivedBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'issued',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blood_issuances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "department" TEXT,
    "designation" TEXT,
    "joiningDate" TIMESTAMP(3),
    "salary" DECIMAL(12,2),
    "status" TEXT NOT NULL DEFAULT 'active',
    "shift" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_attendances" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "checkIn" TIMESTAMP(3),
    "checkOut" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'present',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "leaveType" TEXT NOT NULL,
    "fromDate" TIMESTAMP(3) NOT NULL,
    "toDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ambulance_vehicles" (
    "id" TEXT NOT NULL,
    "vehicleNumber" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'available',
    "lastMaintenance" TIMESTAMP(3),
    "currentLocation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ambulance_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_cases" (
    "id" TEXT NOT NULL,
    "patientId" TEXT,
    "patientName" TEXT NOT NULL,
    "patientAge" INTEGER,
    "patientGender" TEXT,
    "patientContact" TEXT,
    "arrivalTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triageCategory" TEXT NOT NULL,
    "chiefComplaint" TEXT,
    "vitalSigns" JSONB,
    "isMLC" BOOLEAN NOT NULL DEFAULT false,
    "mlcNumber" TEXT,
    "assignedDoctor" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "disposition" TEXT,
    "dischargeTime" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emergency_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "icu_beds" (
    "id" TEXT NOT NULL,
    "bedNumber" TEXT NOT NULL,
    "icuUnit" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'vacant',
    "currentPatient" TEXT,
    "admissionId" TEXT,
    "ventilatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "icu_beds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "icu_vitals" (
    "id" TEXT NOT NULL,
    "icuBedId" TEXT NOT NULL,
    "patientId" TEXT,
    "heartRate" INTEGER,
    "systolicBP" INTEGER,
    "diastolicBP" INTEGER,
    "temperature" DECIMAL(4,1),
    "spo2" INTEGER,
    "respiratoryRate" INTEGER,
    "gcs" INTEGER,
    "ventilatorMode" TEXT,
    "fio2" INTEGER,
    "peep" INTEGER,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedBy" TEXT,

    CONSTRAINT "icu_vitals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surgeries" (
    "id" TEXT NOT NULL,
    "patientId" TEXT,
    "patientName" TEXT NOT NULL,
    "patientMRN" TEXT,
    "procedureName" TEXT NOT NULL,
    "surgeonId" TEXT,
    "surgeonName" TEXT NOT NULL,
    "anesthetistId" TEXT,
    "anesthetistName" TEXT,
    "otRoomId" TEXT,
    "otRoom" TEXT,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "scheduledTime" TEXT,
    "estimatedDuration" INTEGER,
    "actualStartTime" TIMESTAMP(3),
    "actualEndTime" TIMESTAMP(3),
    "anesthesiaType" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'elective',
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "preOpChecklist" BOOLEAN NOT NULL DEFAULT false,
    "postOpNotes" TEXT,
    "complications" TEXT,
    "implants" JSONB,
    "consumables" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "surgeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ot_rooms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "floor" TEXT,
    "status" TEXT NOT NULL DEFAULT 'available',
    "currentSurgery" TEXT,
    "equipment" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ot_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blood_donors_donorId_key" ON "blood_donors"("donorId");

-- CreateIndex
CREATE UNIQUE INDEX "blood_donations_bagNumber_key" ON "blood_donations"("bagNumber");

-- CreateIndex
CREATE UNIQUE INDEX "blood_inventory_donationId_key" ON "blood_inventory"("donationId");

-- CreateIndex
CREATE UNIQUE INDEX "blood_inventory_bagNumber_key" ON "blood_inventory"("bagNumber");

-- CreateIndex
CREATE INDEX "blood_inventory_bloodType_component_status_idx" ON "blood_inventory"("bloodType", "component", "status");

-- CreateIndex
CREATE UNIQUE INDEX "employees_employeeId_key" ON "employees"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "employee_attendances_employeeId_date_key" ON "employee_attendances"("employeeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ambulance_vehicles_vehicleNumber_key" ON "ambulance_vehicles"("vehicleNumber");

-- CreateIndex
CREATE UNIQUE INDEX "icu_beds_bedNumber_key" ON "icu_beds"("bedNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ot_rooms_name_key" ON "ot_rooms"("name");

-- AddForeignKey
ALTER TABLE "blood_donations" ADD CONSTRAINT "blood_donations_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "blood_donors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blood_inventory" ADD CONSTRAINT "blood_inventory_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "blood_donations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blood_issuances" ADD CONSTRAINT "blood_issuances_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "blood_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blood_issuances" ADD CONSTRAINT "blood_issuances_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "blood_inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_attendances" ADD CONSTRAINT "employee_attendances_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "icu_vitals" ADD CONSTRAINT "icu_vitals_icuBedId_fkey" FOREIGN KEY ("icuBedId") REFERENCES "icu_beds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
