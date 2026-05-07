-- New clinical & operational modules:
--   • Dialysis (machines + sessions, with full clinical data)
--   • Mortuary (deceased registry + cold-storage tracking)
--   • Phlebotomy rounds (collection batches)
--   • Physiotherapy (treatment plans + sessions)
--   • CSSD (sterilization cycles + instrument tracking)
--   • Pathology cases (specialized diagnostics beyond routine lab)
--   • Equipment maintenance tickets
--
-- All tables use idempotent CREATE / ADD so re-running is safe.

-- =============== DIALYSIS ===============
CREATE TABLE IF NOT EXISTS "dialysis_machines" (
  "id"            TEXT          PRIMARY KEY,
  "tenantId"      TEXT          NOT NULL,
  "branchId"      TEXT,
  "machineName"   TEXT          NOT NULL,
  "machineCode"   TEXT          NOT NULL,
  "modality"      TEXT          NOT NULL DEFAULT 'HD',
  "manufacturer"  TEXT,
  "model"         TEXT,
  "serialNumber"  TEXT,
  "installDate"   TIMESTAMP(3),
  "lastServiceAt" TIMESTAMP(3),
  "status"        TEXT          NOT NULL DEFAULT 'available',
  "location"      TEXT,
  "notes"         TEXT,
  "createdAt"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "dialysis_machines_tenant_code_uidx" ON "dialysis_machines"("tenantId", "machineCode");
CREATE INDEX IF NOT EXISTS "dialysis_machines_tenant_idx" ON "dialysis_machines"("tenantId");

CREATE TABLE IF NOT EXISTS "dialysis_sessions" (
  "id"             TEXT          PRIMARY KEY,
  "tenantId"       TEXT          NOT NULL,
  "patientId"      TEXT          NOT NULL,
  "machineId"      TEXT,
  "nephrologistId" TEXT,
  "nurseId"        TEXT,
  "scheduledDate"  TIMESTAMP(3)  NOT NULL,
  "scheduledTime"  TEXT,
  "startedAt"      TIMESTAMP(3),
  "endedAt"        TIMESTAMP(3),
  "durationMin"    INTEGER,
  "modality"       TEXT          NOT NULL DEFAULT 'HD',
  "vascularAccess" TEXT,
  "dialyzer"       TEXT,
  "bloodFlowRate"  INTEGER,
  "dialysateFlow"  INTEGER,
  "ufGoalMl"       INTEGER,
  "ufActualMl"     INTEGER,
  "preWeightKg"    DECIMAL(5,2),
  "postWeightKg"   DECIMAL(5,2),
  "preBpSys"       INTEGER,
  "preBpDia"       INTEGER,
  "postBpSys"      INTEGER,
  "postBpDia"      INTEGER,
  "heparin"        TEXT,
  "complications"  TEXT,
  "notes"          TEXT,
  "status"         TEXT          NOT NULL DEFAULT 'scheduled',
  "createdAt"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dialysis_sessions_machine_fk" FOREIGN KEY ("machineId") REFERENCES "dialysis_machines"("id")
);
CREATE INDEX IF NOT EXISTS "dialysis_sessions_tenant_idx"   ON "dialysis_sessions"("tenantId");
CREATE INDEX IF NOT EXISTS "dialysis_sessions_patient_idx"  ON "dialysis_sessions"("patientId");
CREATE INDEX IF NOT EXISTS "dialysis_sessions_date_idx"     ON "dialysis_sessions"("scheduledDate");

-- =============== MORTUARY ===============
CREATE TABLE IF NOT EXISTS "mortuary_records" (
  "id"              TEXT          PRIMARY KEY,
  "tenantId"        TEXT          NOT NULL,
  "patientId"       TEXT,
  "bodyNumber"      TEXT          NOT NULL,
  "deceasedName"    TEXT          NOT NULL,
  "age"             INTEGER,
  "gender"          TEXT,
  "contact"         TEXT,
  "dateOfDeath"     TIMESTAMP(3)  NOT NULL,
  "causeOfDeath"    TEXT,
  "doctorOnDuty"    TEXT,
  "fridgeUnit"      TEXT,
  "shelfNumber"     TEXT,
  "storedAt"        TIMESTAMP(3),
  "releasedAt"      TIMESTAMP(3),
  "releasedTo"      TEXT,
  "releaseAuthBy"   TEXT,
  "autopsyRequired" BOOLEAN       NOT NULL DEFAULT false,
  "autopsyAt"       TIMESTAMP(3),
  "autopsyFindings" TEXT,
  "remarks"         TEXT,
  "status"          TEXT          NOT NULL DEFAULT 'stored',
  "createdAt"       TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "mortuary_records_tenant_body_uidx" ON "mortuary_records"("tenantId", "bodyNumber");
CREATE INDEX IF NOT EXISTS "mortuary_records_tenant_idx" ON "mortuary_records"("tenantId");

-- =============== PHLEBOTOMY ROUNDS ===============
CREATE TABLE IF NOT EXISTS "phlebotomy_rounds" (
  "id"            TEXT          PRIMARY KEY,
  "tenantId"      TEXT          NOT NULL,
  "branchId"      TEXT,
  "phlebotomist"  TEXT,
  "shift"         TEXT,
  "scheduledDate" TIMESTAMP(3)  NOT NULL,
  "area"          TEXT,
  "totalSamples"  INTEGER       NOT NULL DEFAULT 0,
  "collected"     INTEGER       NOT NULL DEFAULT 0,
  "rejected"      INTEGER       NOT NULL DEFAULT 0,
  "status"        TEXT          NOT NULL DEFAULT 'planned',
  "notes"         TEXT,
  "createdAt"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "phlebotomy_rounds_tenant_idx" ON "phlebotomy_rounds"("tenantId");
CREATE INDEX IF NOT EXISTS "phlebotomy_rounds_date_idx"   ON "phlebotomy_rounds"("scheduledDate");

-- =============== PHYSIOTHERAPY ===============
CREATE TABLE IF NOT EXISTS "physio_plans" (
  "id"             TEXT          PRIMARY KEY,
  "tenantId"       TEXT          NOT NULL,
  "patientId"      TEXT          NOT NULL,
  "therapistId"    TEXT,
  "diagnosis"      TEXT,
  "goals"          TEXT,
  "protocol"       TEXT,
  "totalSessions"  INTEGER       NOT NULL DEFAULT 10,
  "completedCount" INTEGER       NOT NULL DEFAULT 0,
  "startDate"      TIMESTAMP(3)  NOT NULL,
  "endDate"        TIMESTAMP(3),
  "status"         TEXT          NOT NULL DEFAULT 'active',
  "notes"          TEXT,
  "createdAt"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "physio_plans_tenant_idx"  ON "physio_plans"("tenantId");
CREATE INDEX IF NOT EXISTS "physio_plans_patient_idx" ON "physio_plans"("patientId");

CREATE TABLE IF NOT EXISTS "physio_sessions" (
  "id"            TEXT          PRIMARY KEY,
  "tenantId"      TEXT          NOT NULL,
  "planId"        TEXT,
  "patientId"     TEXT          NOT NULL,
  "therapistId"   TEXT,
  "scheduledDate" TIMESTAMP(3)  NOT NULL,
  "scheduledTime" TEXT,
  "durationMin"   INTEGER,
  "modalities"    TEXT,
  "exercises"     TEXT,
  "painPre"       INTEGER,
  "painPost"      INTEGER,
  "rangeOfMotion" TEXT,
  "notes"         TEXT,
  "status"        TEXT          NOT NULL DEFAULT 'scheduled',
  "createdAt"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "physio_sessions_plan_fk" FOREIGN KEY ("planId") REFERENCES "physio_plans"("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "physio_sessions_tenant_idx"  ON "physio_sessions"("tenantId");
CREATE INDEX IF NOT EXISTS "physio_sessions_patient_idx" ON "physio_sessions"("patientId");
CREATE INDEX IF NOT EXISTS "physio_sessions_date_idx"    ON "physio_sessions"("scheduledDate");

-- =============== CSSD ===============
CREATE TABLE IF NOT EXISTS "sterilization_cycles" (
  "id"                 TEXT          PRIMARY KEY,
  "tenantId"           TEXT          NOT NULL,
  "cycleNumber"        TEXT          NOT NULL,
  "machineId"          TEXT,
  "machineName"        TEXT,
  "cycleType"          TEXT          NOT NULL,
  "loadType"           TEXT,
  "startedAt"          TIMESTAMP(3)  NOT NULL,
  "endedAt"            TIMESTAMP(3),
  "temperatureC"       DECIMAL(5,1),
  "pressureBar"        DECIMAL(4,2),
  "durationMin"        INTEGER,
  "loadCount"          INTEGER,
  "biologicalIndicator" TEXT,
  "chemicalIndicator"  TEXT,
  "releasedBy"         TEXT,
  "status"             TEXT          NOT NULL DEFAULT 'running',
  "notes"              TEXT,
  "createdAt"          TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "sterilization_cycles_tenant_cyc_uidx" ON "sterilization_cycles"("tenantId", "cycleNumber");
CREATE INDEX IF NOT EXISTS "sterilization_cycles_tenant_idx" ON "sterilization_cycles"("tenantId");

CREATE TABLE IF NOT EXISTS "cssd_instruments" (
  "id"               TEXT          PRIMARY KEY,
  "tenantId"         TEXT          NOT NULL,
  "instrumentCode"   TEXT          NOT NULL,
  "name"             TEXT          NOT NULL,
  "category"         TEXT,
  "status"           TEXT          NOT NULL DEFAULT 'available',
  "lastSterilizedAt" TIMESTAMP(3),
  "expiresAt"        TIMESTAMP(3),
  "location"         TEXT,
  "notes"            TEXT,
  "createdAt"        TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "cssd_instruments_tenant_code_uidx" ON "cssd_instruments"("tenantId", "instrumentCode");
CREATE INDEX IF NOT EXISTS "cssd_instruments_tenant_idx" ON "cssd_instruments"("tenantId");

-- =============== PATHOLOGY ===============
CREATE TABLE IF NOT EXISTS "pathology_cases" (
  "id"                 TEXT          PRIMARY KEY,
  "tenantId"           TEXT          NOT NULL,
  "caseNumber"         TEXT          NOT NULL,
  "patientId"          TEXT          NOT NULL,
  "referringDoctor"    TEXT,
  "pathologistId"      TEXT,
  "caseType"           TEXT          NOT NULL,
  "specimenSource"     TEXT,
  "clinicalHistory"    TEXT,
  "grossDescription"   TEXT,
  "microscopicFindings" TEXT,
  "impression"         TEXT,
  "ihcMarkers"         JSONB,
  "receivedAt"         TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reportedAt"         TIMESTAMP(3),
  "status"             TEXT          NOT NULL DEFAULT 'received',
  "priority"           TEXT          NOT NULL DEFAULT 'routine',
  "remarks"            TEXT,
  "createdAt"          TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "pathology_cases_tenant_case_uidx" ON "pathology_cases"("tenantId", "caseNumber");
CREATE INDEX IF NOT EXISTS "pathology_cases_tenant_idx"  ON "pathology_cases"("tenantId");
CREATE INDEX IF NOT EXISTS "pathology_cases_patient_idx" ON "pathology_cases"("patientId");

-- =============== EQUIPMENT MAINTENANCE ===============
CREATE TABLE IF NOT EXISTS "maintenance_tickets" (
  "id"            TEXT          PRIMARY KEY,
  "tenantId"      TEXT          NOT NULL,
  "ticketNumber"  TEXT          NOT NULL,
  "assetId"       TEXT,
  "assetName"     TEXT          NOT NULL,
  "assetCategory" TEXT,
  "type"          TEXT          NOT NULL,
  "priority"      TEXT          NOT NULL DEFAULT 'normal',
  "reportedBy"    TEXT,
  "assignedTo"    TEXT,
  "vendor"        TEXT,
  "reportedAt"    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt"     TIMESTAMP(3),
  "completedAt"   TIMESTAMP(3),
  "description"   TEXT          NOT NULL,
  "rootCause"     TEXT,
  "partsReplaced" TEXT,
  "costAmount"    DECIMAL(10,2),
  "downtimeHours" DECIMAL(6,2),
  "status"        TEXT          NOT NULL DEFAULT 'open',
  "notes"         TEXT,
  "createdAt"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "maintenance_tickets_tenant_ticket_uidx" ON "maintenance_tickets"("tenantId", "ticketNumber");
CREATE INDEX IF NOT EXISTS "maintenance_tickets_tenant_idx" ON "maintenance_tickets"("tenantId");
