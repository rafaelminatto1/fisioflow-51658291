CREATE TABLE IF NOT EXISTS "note_favorites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "note_id" uuid NOT NULL REFERENCES "notes"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "note_favorites" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_note_favorites_user_note"
  ON "note_favorites" USING btree ("organization_id", "user_id", "note_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_note_favorites_user_created"
  ON "note_favorites" USING btree ("organization_id", "user_id", "created_at");
--> statement-breakpoint
DROP POLICY IF EXISTS "policy_note_favorites_isolation" ON "note_favorites";
CREATE POLICY "policy_note_favorites_isolation" ON "note_favorites"
  AS PERMISSIVE FOR ALL TO "authenticated"
  USING ("organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid))
  WITH CHECK ("organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid));
