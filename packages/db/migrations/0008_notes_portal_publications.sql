CREATE TABLE IF NOT EXISTS "note_portal_publications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "note_id" uuid NOT NULL REFERENCES "notes"("id") ON DELETE CASCADE,
  "patient_id" uuid NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
  "title" varchar(500) NOT NULL,
  "content_html" text,
  "content_text" text NOT NULL,
  "published_by" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "revoked_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "note_portal_publications" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_note_portal_publications_patient" ON "note_portal_publications" ("organization_id", "patient_id", "expires_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_note_portal_publications_note" ON "note_portal_publications" ("organization_id", "note_id", "created_at");
--> statement-breakpoint
DROP POLICY IF EXISTS "policy_note_portal_publications_isolation" ON "note_portal_publications";
CREATE POLICY "policy_note_portal_publications_isolation" ON "note_portal_publications"
  AS PERMISSIVE FOR ALL TO "authenticated"
  USING ("organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid))
  WITH CHECK ("organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid));
