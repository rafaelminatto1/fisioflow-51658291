CREATE UNIQUE INDEX IF NOT EXISTS "idx_notes_active_appointment_unique"
  ON "notes" USING btree ("organization_id", "appointment_id")
  WHERE "appointment_id" IS NOT NULL AND "deleted_at" IS NULL;
