-- Drop the public-booking lead table — consolidating into `appointments`.
DROP TABLE IF EXISTS "appointment_requests";

-- Make doctorId nullable so unassigned (website-lead) appointments
-- live in the same table. The existing FK constraint already permits
-- nulls; we only relax the NOT NULL.
ALTER TABLE "appointments" ALTER COLUMN "doctorId" DROP NOT NULL;

-- Same for appointmentTime — website visitors pick a vague preference,
-- not a real slot. Staff fill it in on confirm.
ALTER TABLE "appointments" ALTER COLUMN "appointmentTime" DROP NOT NULL;
