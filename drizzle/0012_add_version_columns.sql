ALTER TABLE "sessions" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;
ALTER TABLE "patients" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;