CREATE UNIQUE INDEX IF NOT EXISTS "idx_notes_active_session_unique"
  ON "notes" USING btree ("organization_id", "session_id")
  WHERE "session_id" IS NOT NULL AND "deleted_at" IS NULL;
