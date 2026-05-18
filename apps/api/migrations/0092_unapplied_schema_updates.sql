-- Unapplied Drizzle schema updates (from drizzle/0011, 0012)
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "sessions_completed" integer DEFAULT 0;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "total_appointments" integer DEFAULT 0;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "open_balance" numeric(10, 2) DEFAULT '0';
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "last_appointment_date" date;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "next_appointment_date" date;

ALTER TABLE "exercises" ADD COLUMN IF NOT EXISTS "pdf_url" text;

ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1 NOT NULL;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1 NOT NULL;
