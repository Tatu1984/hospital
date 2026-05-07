-- HR — leave balance + payslip persistence
--
-- Adds three things:
--   1. leave_requests.days     — pre-computed working-day count, used by
--                                 payroll to count paid-leave days
--   2. leave_balances          — per-employee annual entitlement +
--                                 used + carry-forward + encashable cap
--   3. payslips                — persisted payroll output so historical
--                                 calculations don't drift if attendance
--                                 is corrected later

-- 1. leave_requests.days
ALTER TABLE "leave_requests"
  ADD COLUMN IF NOT EXISTS "days" DECIMAL(5, 1);

-- 2. leave_balances
CREATE TABLE IF NOT EXISTS "leave_balances" (
  "id"         TEXT          PRIMARY KEY,
  "tenantId"   TEXT          NOT NULL,
  "employeeId" TEXT          NOT NULL,
  "leaveType"  TEXT          NOT NULL,
  "year"       INTEGER       NOT NULL,
  "entitled"   DECIMAL(5, 1) NOT NULL,
  "used"       DECIMAL(5, 1) NOT NULL DEFAULT 0,
  "carriedFwd" DECIMAL(5, 1) NOT NULL DEFAULT 0,
  "encashable" DECIMAL(5, 1),
  "remarks"    TEXT,
  "createdAt"  TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "leave_balances_emp_type_year_uidx"
  ON "leave_balances" ("employeeId", "leaveType", "year");
CREATE INDEX IF NOT EXISTS "leave_balances_tenant_idx"
  ON "leave_balances" ("tenantId");
CREATE INDEX IF NOT EXISTS "leave_balances_emp_idx"
  ON "leave_balances" ("employeeId");

-- 3. payslips
CREATE TABLE IF NOT EXISTS "payslips" (
  "id"              TEXT          PRIMARY KEY,
  "tenantId"        TEXT          NOT NULL,
  "employeeId"      TEXT          NOT NULL,
  "month"           INTEGER       NOT NULL,
  "year"            INTEGER       NOT NULL,
  "payslipNumber"   TEXT          NOT NULL UNIQUE,
  "monthDays"       INTEGER       NOT NULL,
  "workingDays"     INTEGER       NOT NULL,
  "daysPresent"     DECIMAL(5, 1) NOT NULL,
  "daysHalfDay"     DECIMAL(5, 1) NOT NULL DEFAULT 0,
  "daysOnPaidLeave" DECIMAL(5, 1) NOT NULL,
  "daysLOP"         DECIMAL(5, 1) NOT NULL,
  "baseSalary"      DECIMAL(12,2) NOT NULL,
  "perDayRate"      DECIMAL(12,2) NOT NULL,
  "earnedGross"     DECIMAL(12,2) NOT NULL,
  "deductions"      JSONB,
  "totalDeductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "netPay"          DECIMAL(12,2) NOT NULL,
  "status"          TEXT          NOT NULL DEFAULT 'draft',
  "finalizedAt"     TIMESTAMP(3),
  "paidAt"          TIMESTAMP(3),
  "paidBy"          TEXT,
  "paymentRef"      TEXT,
  "remarks"         TEXT,
  "createdAt"       TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "payslips_emp_period_uidx"
  ON "payslips" ("employeeId", "month", "year");
CREATE INDEX IF NOT EXISTS "payslips_tenant_idx" ON "payslips" ("tenantId");
CREATE INDEX IF NOT EXISTS "payslips_emp_idx" ON "payslips" ("employeeId");
