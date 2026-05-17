ALTER TABLE "patients" ADD COLUMN "sessions_completed" integer DEFAULT 0;
ALTER TABLE "patients" ADD COLUMN "total_appointments" integer DEFAULT 0;
ALTER TABLE "patients" ADD COLUMN "open_balance" numeric(10, 2) DEFAULT '0';
ALTER TABLE "patients" ADD COLUMN "last_appointment_date" date;
ALTER TABLE "patients" ADD COLUMN "next_appointment_date" date;