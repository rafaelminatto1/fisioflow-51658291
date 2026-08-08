CREATE TYPE "public"."biomechanics_metric_provenance" AS ENUM('device_pose', 'container_pose', 'manual', 'patient_reported', 'derived', 'synthetic_demo');--> statement-breakpoint
CREATE TABLE "restore_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"restored_at" timestamp DEFAULT now() NOT NULL,
	"restore_point_timestamp" timestamp NOT NULL,
	"reason" text NOT NULL,
	"operator_id" uuid NOT NULL,
	"branch_name" varchar(255) NOT NULL,
	"status" varchar(50) NOT NULL,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "restore_audit_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "knowledge_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"assignment_type" text DEFAULT 'owner' NOT NULL,
	"assignee_id" text NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"due_at" timestamp with time zone,
	"assigned_by" text NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_assignments_assignment_type_check" CHECK ("knowledge_assignments"."assignment_type" IN ('owner','reviewer')),
	CONSTRAINT "knowledge_assignments_priority_check" CHECK ("knowledge_assignments"."priority" IN ('low','normal','high','urgent'))
);
--> statement-breakpoint
ALTER TABLE "knowledge_assignments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "knowledge_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"actor_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"request_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "knowledge_audit_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "knowledge_capability_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"capability" text NOT NULL,
	"granted_by" text NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_by" text,
	"revoked_at" timestamp with time zone,
	"reason" text,
	CONSTRAINT "knowledge_capability_grants_organization_id_user_id_capability_key" UNIQUE("organization_id","user_id","capability"),
	CONSTRAINT "knowledge_capability_grants_capability_check" CHECK ("knowledge_capability_grants"."capability" IN ('manage_library','clinical_review','publish_knowledge','manage_library_policy')),
	CONSTRAINT "knowledge_capability_grants_reason_check" CHECK ("knowledge_capability_grants"."reason" IS NULL OR char_length("knowledge_capability_grants"."reason") <= 500)
);
--> statement-breakpoint
ALTER TABLE "knowledge_capability_grants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "knowledge_idempotency_keys" (
	"organization_id" uuid NOT NULL,
	"actor_id" text NOT NULL,
	"operation" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"payload_hash" text NOT NULL,
	"response_status" integer,
	"response_body" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone DEFAULT now() + interval '24 hours' NOT NULL,
	CONSTRAINT "knowledge_idempotency_keys_pkey" PRIMARY KEY("organization_id","actor_id","operation","idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "knowledge_idempotency_keys" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "knowledge_item_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"title" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"editorial_status" text DEFAULT 'draft' NOT NULL,
	"technical_status" text DEFAULT 'not_started' NOT NULL,
	"authored_by" text NOT NULL,
	"submitted_by" text,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_item_versions_organization_id_id_key" UNIQUE("organization_id","id"),
	CONSTRAINT "knowledge_item_versions_organization_id_item_id_id_key" UNIQUE("organization_id","item_id","id"),
	CONSTRAINT "knowledge_item_versions_organization_id_item_id_version_number_key" UNIQUE("organization_id","item_id","version_number"),
	CONSTRAINT "knowledge_item_versions_version_number_check" CHECK ("knowledge_item_versions"."version_number" > 0),
	CONSTRAINT "knowledge_item_versions_title_check" CHECK (char_length("knowledge_item_versions"."title") BETWEEN 1 AND 500),
	CONSTRAINT "knowledge_item_versions_editorial_status_check" CHECK ("knowledge_item_versions"."editorial_status" IN ('draft','triage','clinical_review','changes_requested','rejected','approved','published','review_due','superseded','archived')),
	CONSTRAINT "knowledge_item_versions_technical_status_check" CHECK ("knowledge_item_versions"."technical_status" IN ('not_started','queued','processing','indexed','failed'))
);
--> statement-breakpoint
ALTER TABLE "knowledge_item_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "knowledge_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"slug" text,
	"row_version" integer DEFAULT 1 NOT NULL,
	"approved_version_id" uuid,
	"published_version_id" uuid,
	"created_by" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_items_organization_id_id_key" UNIQUE("organization_id","id"),
	CONSTRAINT "knowledge_items_kind_check" CHECK ("knowledge_items"."kind" IN ('guidance','protocol','trail','test','exercise','source','term','page')),
	CONSTRAINT "knowledge_items_title_check" CHECK (char_length("knowledge_items"."title") BETWEEN 1 AND 500),
	CONSTRAINT "knowledge_items_row_version_check" CHECK ("knowledge_items"."row_version" > 0)
);
--> statement-breakpoint
ALTER TABLE "knowledge_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "knowledge_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"action" text NOT NULL,
	"from_status" text NOT NULL,
	"to_status" text NOT NULL,
	"reviewer_id" text,
	"approved_by" text,
	"reason" text,
	"valid_until" date,
	"request_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_reviews_reason_check" CHECK ("knowledge_reviews"."reason" IS NULL OR char_length("knowledge_reviews"."reason") <= 4000)
);
--> statement-breakpoint
ALTER TABLE "knowledge_reviews" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "knowledge_source_map" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text NOT NULL,
	"knowledge_item_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_source_map_organization_id_source_type_source_id_key" UNIQUE("organization_id","source_type","source_id"),
	CONSTRAINT "knowledge_source_map_source_type_check" CHECK ("knowledge_source_map"."source_type" IN ('wiki_pages','knowledge_articles','evidence_resources','organization_evidence'))
);
--> statement-breakpoint
ALTER TABLE "knowledge_source_map" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "knowledge_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"version_id" uuid,
	"source_type" text NOT NULL,
	"source_id" text,
	"title" text NOT NULL,
	"url" text,
	"doi" text,
	"pmid" text,
	"license" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "knowledge_sources" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "note_favorites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"note_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "note_favorites" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "note_portal_publications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"note_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
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
ALTER TABLE "note_portal_publications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "partnerships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" text,
	"student_session_fee" numeric(10, 2) DEFAULT '160.00' NOT NULL,
	"professor_pays" boolean DEFAULT false NOT NULL,
	"professor_session_fee" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "partnerships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ai_usage_events" ALTER COLUMN "status" SET DATA TYPE varchar(32);--> statement-breakpoint
ALTER TABLE "ai_usage_events" ALTER COLUMN "status" SET DEFAULT 'completed';--> statement-breakpoint
ALTER TABLE "ai_usage_events" ALTER COLUMN "status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "clinical_embeddings" ALTER COLUMN "embedding" SET DATA TYPE vector(1024);--> statement-breakpoint
ALTER TABLE "biomechanics_assessments" ADD COLUMN "pose_provenance" "biomechanics_metric_provenance";--> statement-breakpoint
ALTER TABLE "biomechanics_assessments" ADD COLUMN "amends_assessment_id" uuid;--> statement-breakpoint
ALTER TABLE "biomechanics_assessments" ADD COLUMN "superseded_by_assessment_id" uuid;--> statement-breakpoint
ALTER TABLE "biomechanics_assessments" ADD COLUMN "locked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "biomechanics_events" ADD COLUMN "provenance" "biomechanics_metric_provenance" DEFAULT 'synthetic_demo' NOT NULL;--> statement-breakpoint
ALTER TABLE "biomechanics_events" ADD COLUMN "job_id" uuid;--> statement-breakpoint
ALTER TABLE "biomechanics_events" ADD COLUMN "superseded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "biomechanics_frames" ADD COLUMN "provenance" "biomechanics_metric_provenance" DEFAULT 'synthetic_demo' NOT NULL;--> statement-breakpoint
ALTER TABLE "biomechanics_frames" ADD COLUMN "attempt" integer;--> statement-breakpoint
ALTER TABLE "biomechanics_frames" ADD COLUMN "view" varchar(50);--> statement-breakpoint
ALTER TABLE "biomechanics_jobs" ADD COLUMN "phase" varchar(20) DEFAULT 'device' NOT NULL;--> statement-breakpoint
ALTER TABLE "biomechanics_jobs" ADD COLUMN "input_digest" varchar(64);--> statement-breakpoint
ALTER TABLE "biomechanics_jobs" ADD COLUMN "supersedes_job_id" uuid;--> statement-breakpoint
ALTER TABLE "biomechanics_media" ADD COLUMN "landmarks_r2_key" text;--> statement-breakpoint
ALTER TABLE "biomechanics_media" ADD COLUMN "landmarks_schema" varchar(32);--> statement-breakpoint
ALTER TABLE "biomechanics_media" ADD COLUMN "landmarks_sha256" varchar(64);--> statement-breakpoint
ALTER TABLE "biomechanics_media" ADD COLUMN "landmarks_bytes" integer;--> statement-breakpoint
ALTER TABLE "biomechanics_media" ADD COLUMN "frame_count" integer;--> statement-breakpoint
ALTER TABLE "biomechanics_media" ADD COLUMN "attempt" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "biomechanics_media" ADD COLUMN "pose_engine" varchar(80);--> statement-breakpoint
ALTER TABLE "biomechanics_media" ADD COLUMN "coordinate_space" jsonb DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "biomechanics_metrics" ADD COLUMN "provenance" "biomechanics_metric_provenance" DEFAULT 'synthetic_demo' NOT NULL;--> statement-breakpoint
ALTER TABLE "biomechanics_metrics" ADD COLUMN "pose_engine" varchar(80);--> statement-breakpoint
ALTER TABLE "biomechanics_metrics" ADD COLUMN "job_id" uuid;--> statement-breakpoint
ALTER TABLE "biomechanics_metrics" ADD COLUMN "media_id" uuid;--> statement-breakpoint
ALTER TABLE "biomechanics_metrics" ADD COLUMN "attempt" integer;--> statement-breakpoint
ALTER TABLE "biomechanics_metrics" ADD COLUMN "sample_count" integer;--> statement-breakpoint
ALTER TABLE "biomechanics_metrics" ADD COLUMN "superseded_by" uuid;--> statement-breakpoint
ALTER TABLE "biomechanics_metrics" ADD COLUMN "superseded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "biomechanics_metrics" ADD COLUMN "acknowledged_by" uuid;--> statement-breakpoint
ALTER TABLE "biomechanics_metrics" ADD COLUMN "acknowledged_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "biomechanics_metrics" ADD COLUMN "computed_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "exercise_prescriptions" ADD COLUMN "target_weekly_frequency" integer DEFAULT 3;--> statement-breakpoint
ALTER TABLE "exercise_prescriptions" ADD COLUMN "has_home_exercises" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "partnership_id" uuid;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "partnership_role" varchar(50);--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "yjs_state" "bytea";--> statement-breakpoint
ALTER TABLE "restore_audit_logs" ADD CONSTRAINT "restore_audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_assignments" ADD CONSTRAINT "knowledge_assignments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_assignments" ADD CONSTRAINT "knowledge_assignments_organization_id_item_id_fkey" FOREIGN KEY ("organization_id","item_id") REFERENCES "public"."knowledge_items"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_assignments" ADD CONSTRAINT "knowledge_assignments_organization_id_item_id_version_id_fkey" FOREIGN KEY ("organization_id","item_id","version_id") REFERENCES "public"."knowledge_item_versions"("organization_id","item_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_audit_events" ADD CONSTRAINT "knowledge_audit_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_capability_grants" ADD CONSTRAINT "knowledge_capability_grants_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_idempotency_keys" ADD CONSTRAINT "knowledge_idempotency_keys_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_item_versions" ADD CONSTRAINT "knowledge_item_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_item_versions" ADD CONSTRAINT "knowledge_item_versions_organization_id_item_id_fkey" FOREIGN KEY ("organization_id","item_id") REFERENCES "public"."knowledge_items"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_items" ADD CONSTRAINT "knowledge_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_reviews" ADD CONSTRAINT "knowledge_reviews_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_reviews" ADD CONSTRAINT "knowledge_reviews_organization_id_item_id_fkey" FOREIGN KEY ("organization_id","item_id") REFERENCES "public"."knowledge_items"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_reviews" ADD CONSTRAINT "knowledge_reviews_organization_id_item_id_version_id_fkey" FOREIGN KEY ("organization_id","item_id","version_id") REFERENCES "public"."knowledge_item_versions"("organization_id","item_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_source_map" ADD CONSTRAINT "knowledge_source_map_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_source_map" ADD CONSTRAINT "knowledge_source_map_organization_id_knowledge_item_id_fkey" FOREIGN KEY ("organization_id","knowledge_item_id") REFERENCES "public"."knowledge_items"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_sources" ADD CONSTRAINT "knowledge_sources_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_sources" ADD CONSTRAINT "knowledge_sources_organization_id_item_id_fkey" FOREIGN KEY ("organization_id","item_id") REFERENCES "public"."knowledge_items"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_sources" ADD CONSTRAINT "knowledge_sources_organization_id_item_id_version_id_fkey" FOREIGN KEY ("organization_id","item_id","version_id") REFERENCES "public"."knowledge_item_versions"("organization_id","item_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_favorites" ADD CONSTRAINT "note_favorites_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_favorites" ADD CONSTRAINT "note_favorites_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_portal_publications" ADD CONSTRAINT "note_portal_publications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_portal_publications" ADD CONSTRAINT "note_portal_publications_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_portal_publications" ADD CONSTRAINT "note_portal_publications_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partnerships" ADD CONSTRAINT "partnerships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_restore_audit_logs_org_date" ON "restore_audit_logs" USING btree ("organization_id","restored_at");--> statement-breakpoint
CREATE INDEX "idx_restore_audit_logs_operator" ON "restore_audit_logs" USING btree ("operator_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_knowledge_assignments_active" ON "knowledge_assignments" USING btree ("organization_id","version_id","assignment_type") WHERE "knowledge_assignments"."completed_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_knowledge_assignments_queue" ON "knowledge_assignments" USING btree ("organization_id","assignee_id","due_at") WHERE "knowledge_assignments"."completed_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_knowledge_audit_events_entity" ON "knowledge_audit_events" USING btree ("organization_id","entity_type","entity_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_knowledge_capability_grants_active" ON "knowledge_capability_grants" USING btree ("organization_id","user_id","capability") WHERE "knowledge_capability_grants"."revoked_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_knowledge_idempotency_expiry" ON "knowledge_idempotency_keys" USING btree ("organization_id","expires_at");--> statement-breakpoint
CREATE INDEX "idx_knowledge_idempotency_cleanup" ON "knowledge_idempotency_keys" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_knowledge_versions_queue" ON "knowledge_item_versions" USING btree ("organization_id","editorial_status","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_knowledge_items_slug_active" ON "knowledge_items" USING btree ("organization_id","slug") WHERE "knowledge_items"."slug" IS NOT NULL AND "knowledge_items"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_knowledge_items_queue" ON "knowledge_items" USING btree ("organization_id","updated_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "knowledge_items"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_knowledge_reviews_item" ON "knowledge_reviews" USING btree ("organization_id","item_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_knowledge_reviews_version_latest" ON "knowledge_reviews" USING btree ("organization_id","version_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_knowledge_source_map_item" ON "knowledge_source_map" USING btree ("organization_id","knowledge_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_knowledge_sources_version_source" ON "knowledge_sources" USING btree ("organization_id","version_id","source_type","source_id") WHERE "knowledge_sources"."version_id" IS NOT NULL AND "knowledge_sources"."source_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_knowledge_sources_item" ON "knowledge_sources" USING btree ("organization_id","item_id","version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_note_favorites_user_note" ON "note_favorites" USING btree ("organization_id","user_id","note_id");--> statement-breakpoint
CREATE INDEX "idx_note_favorites_user_created" ON "note_favorites" USING btree ("organization_id","user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_note_portal_publications_patient" ON "note_portal_publications" USING btree ("organization_id","patient_id","expires_at");--> statement-breakpoint
CREATE INDEX "idx_note_portal_publications_note" ON "note_portal_publications" USING btree ("organization_id","note_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_partnerships_org" ON "partnerships" USING btree ("organization_id");--> statement-breakpoint
CREATE POLICY "policy_restore_audit_logs_isolation" ON "restore_audit_logs" AS PERMISSIVE FOR ALL TO "authenticated" USING ("restore_audit_logs"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid)) WITH CHECK ("restore_audit_logs"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "knowledge_assignments_org_isolation" ON "knowledge_assignments" AS PERMISSIVE FOR ALL TO public USING ("knowledge_assignments"."organization_id"::text = current_setting('app.org_id', true)) WITH CHECK ("knowledge_assignments"."organization_id"::text = current_setting('app.org_id', true));--> statement-breakpoint
CREATE POLICY "knowledge_audit_events_org_isolation" ON "knowledge_audit_events" AS PERMISSIVE FOR ALL TO public USING ("knowledge_audit_events"."organization_id"::text = current_setting('app.org_id', true)) WITH CHECK ("knowledge_audit_events"."organization_id"::text = current_setting('app.org_id', true));--> statement-breakpoint
CREATE POLICY "knowledge_capability_grants_org_isolation" ON "knowledge_capability_grants" AS PERMISSIVE FOR ALL TO public USING ("knowledge_capability_grants"."organization_id"::text = current_setting('app.org_id', true)) WITH CHECK ("knowledge_capability_grants"."organization_id"::text = current_setting('app.org_id', true));--> statement-breakpoint
CREATE POLICY "knowledge_idempotency_keys_org_isolation" ON "knowledge_idempotency_keys" AS PERMISSIVE FOR ALL TO public USING ("knowledge_idempotency_keys"."organization_id"::text = current_setting('app.org_id', true)) WITH CHECK ("knowledge_idempotency_keys"."organization_id"::text = current_setting('app.org_id', true));--> statement-breakpoint
CREATE POLICY "knowledge_item_versions_org_isolation" ON "knowledge_item_versions" AS PERMISSIVE FOR ALL TO public USING ("knowledge_item_versions"."organization_id"::text = current_setting('app.org_id', true)) WITH CHECK ("knowledge_item_versions"."organization_id"::text = current_setting('app.org_id', true));--> statement-breakpoint
CREATE POLICY "knowledge_items_org_isolation" ON "knowledge_items" AS PERMISSIVE FOR ALL TO public USING ("knowledge_items"."organization_id"::text = current_setting('app.org_id', true)) WITH CHECK ("knowledge_items"."organization_id"::text = current_setting('app.org_id', true));--> statement-breakpoint
CREATE POLICY "knowledge_reviews_org_isolation" ON "knowledge_reviews" AS PERMISSIVE FOR ALL TO public USING ("knowledge_reviews"."organization_id"::text = current_setting('app.org_id', true)) WITH CHECK ("knowledge_reviews"."organization_id"::text = current_setting('app.org_id', true));--> statement-breakpoint
CREATE POLICY "knowledge_source_map_org_isolation" ON "knowledge_source_map" AS PERMISSIVE FOR ALL TO public USING ("knowledge_source_map"."organization_id"::text = current_setting('app.org_id', true)) WITH CHECK ("knowledge_source_map"."organization_id"::text = current_setting('app.org_id', true));--> statement-breakpoint
CREATE POLICY "knowledge_sources_org_isolation" ON "knowledge_sources" AS PERMISSIVE FOR ALL TO public USING ("knowledge_sources"."organization_id"::text = current_setting('app.org_id', true)) WITH CHECK ("knowledge_sources"."organization_id"::text = current_setting('app.org_id', true));--> statement-breakpoint
CREATE POLICY "policy_note_favorites_isolation" ON "note_favorites" AS PERMISSIVE FOR ALL TO "authenticated" USING ("note_favorites"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid)) WITH CHECK ("note_favorites"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "policy_note_portal_publications_isolation" ON "note_portal_publications" AS PERMISSIVE FOR ALL TO "authenticated" USING ("note_portal_publications"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid)) WITH CHECK ("note_portal_publications"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "policy_partnerships_isolation" ON "partnerships" AS PERMISSIVE FOR ALL TO "authenticated" USING ("partnerships"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid)) WITH CHECK ("partnerships"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid));