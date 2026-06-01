ALTER TABLE "patients" DROP COLUMN IF EXISTS "sessions_completed";
ALTER TABLE "patients" DROP COLUMN IF EXISTS "total_appointments";
ALTER TABLE "patients" DROP COLUMN IF EXISTS "open_balance";
ALTER TABLE "patients" DROP COLUMN IF EXISTS "last_appointment_date";
ALTER TABLE "patients" DROP COLUMN IF EXISTS "next_appointment_date";