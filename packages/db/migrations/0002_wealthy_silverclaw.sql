CREATE TYPE "public"."note_access_role" AS ENUM('owner', 'editor', 'commenter', 'viewer', 'no_access');--> statement-breakpoint
CREATE TYPE "public"."note_attachment_storage" AS ENUM('r2');--> statement-breakpoint
CREATE TYPE "public"."note_audit_outcome" AS ENUM('allowed', 'denied');--> statement-breakpoint
CREATE TYPE "public"."note_capability" AS ENUM('view', 'comment', 'edit_content', 'edit_properties', 'share', 'export', 'publish', 'manage_permissions', 'delete');--> statement-breakpoint
CREATE TYPE "public"."note_classification" AS ENUM('private', 'team', 'operational', 'clinical');--> statement-breakpoint
CREATE TYPE "public"."note_comment_status" AS ENUM('open', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."note_mention_type" AS ENUM('patient', 'profile', 'team', 'task', 'appointment', 'session', 'note', 'document', 'protocol', 'exercise');--> statement-breakpoint
CREATE TYPE "public"."note_permission_subject" AS ENUM('user', 'team', 'role', 'organization', 'patient_portal', 'share_link');--> statement-breakpoint
CREATE TYPE "public"."note_relation_type" AS ENUM('mentions', 'references', 'relates_to', 'created_from', 'derived_from', 'blocks', 'follows_up');--> statement-breakpoint
CREATE TYPE "public"."note_sensitivity" AS ENUM('internal', 'patient_personal', 'clinical_sensitive', 'restricted');--> statement-breakpoint
CREATE TYPE "public"."note_status" AS ENUM('draft', 'active', 'under_review', 'archived');--> statement-breakpoint
CREATE TYPE "public"."note_task_sync_mode" AS ENUM('one_way', 'two_way');--> statement-breakpoint
CREATE TYPE "public"."note_type" AS ENUM('personal', 'team', 'patient_context', 'appointment', 'meeting', 'clinical_protocol', 'operational', 'template');--> statement-breakpoint
CREATE TABLE "note_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"note_id" uuid NOT NULL,
	"storage" "note_attachment_storage" DEFAULT 'r2' NOT NULL,
	"storage_key" text NOT NULL,
	"original_name" varchar(500) NOT NULL,
	"mime_type" varchar(255) NOT NULL,
	"size_bytes" integer NOT NULL,
	"checksum" varchar(128),
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"uploaded_by" text NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "note_attachments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "note_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"note_id" uuid NOT NULL,
	"patient_id" uuid,
	"actor_id" text,
	"action" varchar(100) NOT NULL,
	"outcome" "note_audit_outcome" NOT NULL,
	"authorization_reason" varchar(255),
	"request_id" varchar(120),
	"ip_address" "inet",
	"user_agent" text,
	"channel" varchar(50),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "note_audit_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "note_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"note_id" uuid NOT NULL,
	"block_id" varchar(255),
	"parent_comment_id" uuid,
	"selection" jsonb,
	"body" text NOT NULL,
	"status" "note_comment_status" DEFAULT 'open' NOT NULL,
	"author_id" text NOT NULL,
	"resolved_by" text,
	"resolved_at" timestamp,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "note_comments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "note_mentions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"note_id" uuid NOT NULL,
	"block_id" varchar(255),
	"mention_type" "note_mention_type" NOT NULL,
	"target_id" uuid NOT NULL,
	"display_label" varchar(255),
	"start_offset" integer,
	"end_offset" integer,
	"created_by" text NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "note_mentions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "note_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"note_id" uuid NOT NULL,
	"subject_type" "note_permission_subject" NOT NULL,
	"subject_id" text,
	"access_role" "note_access_role" NOT NULL,
	"capabilities" "note_capability"[] NOT NULL,
	"inherited" boolean DEFAULT false NOT NULL,
	"granted_by" text NOT NULL,
	"expires_at" timestamp,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "note_permissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "note_relations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"source_note_id" uuid NOT NULL,
	"block_id" varchar(255),
	"target_type" "note_mention_type" NOT NULL,
	"target_id" uuid NOT NULL,
	"relation_type" "note_relation_type" NOT NULL,
	"is_derived" boolean DEFAULT false NOT NULL,
	"created_by" text NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "note_relations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "note_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"note_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"snapshot_json" jsonb NOT NULL,
	"content_html" text,
	"content_text" text,
	"change_summary" varchar(500),
	"reason" varchar(100),
	"restored_from_revision_id" uuid,
	"created_by" text NOT NULL,
	"is_immutable" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "note_revisions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "note_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"note_id" uuid NOT NULL,
	"block_id" varchar(255),
	"task_id" uuid NOT NULL,
	"sync_mode" "note_task_sync_mode" DEFAULT 'two_way' NOT NULL,
	"created_by" text NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "note_tasks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"type" "note_type" DEFAULT 'personal' NOT NULL,
	"status" "note_status" DEFAULT 'draft' NOT NULL,
	"classification" "note_classification" DEFAULT 'private' NOT NULL,
	"sensitivity" "note_sensitivity" DEFAULT 'internal' NOT NULL,
	"purpose_of_use" varchar(100),
	"parent_note_id" uuid,
	"patient_id" uuid,
	"appointment_id" uuid,
	"session_id" uuid,
	"related_task_id" uuid,
	"content_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"content_html" text,
	"content_text" text,
	"icon" varchar(50),
	"cover_image" text,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"owner_id" text NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"is_template" boolean DEFAULT false NOT NULL,
	"template_source_id" uuid,
	"acl_version" integer DEFAULT 1 NOT NULL,
	"metadata_version" integer DEFAULT 1 NOT NULL,
	"last_auto_save_at" timestamp,
	"archived_at" timestamp,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "note_attachments" ADD CONSTRAINT "note_attachments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_attachments" ADD CONSTRAINT "note_attachments_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_audit_logs" ADD CONSTRAINT "note_audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_audit_logs" ADD CONSTRAINT "note_audit_logs_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_audit_logs" ADD CONSTRAINT "note_audit_logs_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_comments" ADD CONSTRAINT "note_comments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_comments" ADD CONSTRAINT "note_comments_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_comments" ADD CONSTRAINT "note_comments_parent_comment_id_note_comments_id_fk" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."note_comments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_mentions" ADD CONSTRAINT "note_mentions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_mentions" ADD CONSTRAINT "note_mentions_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_permissions" ADD CONSTRAINT "note_permissions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_permissions" ADD CONSTRAINT "note_permissions_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_relations" ADD CONSTRAINT "note_relations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_relations" ADD CONSTRAINT "note_relations_source_note_id_notes_id_fk" FOREIGN KEY ("source_note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_revisions" ADD CONSTRAINT "note_revisions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_revisions" ADD CONSTRAINT "note_revisions_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_revisions" ADD CONSTRAINT "note_revisions_restored_from_revision_id_note_revisions_id_fk" FOREIGN KEY ("restored_from_revision_id") REFERENCES "public"."note_revisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_tasks" ADD CONSTRAINT "note_tasks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_tasks" ADD CONSTRAINT "note_tasks_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_parent_note_id_notes_id_fk" FOREIGN KEY ("parent_note_id") REFERENCES "public"."notes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_template_source_id_notes_id_fk" FOREIGN KEY ("template_source_id") REFERENCES "public"."notes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_note_attachments_note" ON "note_attachments" USING btree ("note_id","sort_order");--> statement-breakpoint
CREATE INDEX "idx_note_attachments_storage_key" ON "note_attachments" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "idx_note_audit_logs_org_note_created" ON "note_audit_logs" USING btree ("organization_id","note_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_note_audit_logs_org_patient_created" ON "note_audit_logs" USING btree ("organization_id","patient_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_note_audit_logs_actor_created" ON "note_audit_logs" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_note_comments_note_status" ON "note_comments" USING btree ("note_id","status","created_at");--> statement-breakpoint
CREATE INDEX "idx_note_comments_parent" ON "note_comments" USING btree ("parent_comment_id");--> statement-breakpoint
CREATE INDEX "idx_note_mentions_note" ON "note_mentions" USING btree ("note_id","block_id");--> statement-breakpoint
CREATE INDEX "idx_note_mentions_target" ON "note_mentions" USING btree ("organization_id","mention_type","target_id");--> statement-breakpoint
CREATE INDEX "idx_note_permissions_note" ON "note_permissions" USING btree ("note_id");--> statement-breakpoint
CREATE INDEX "idx_note_permissions_principal" ON "note_permissions" USING btree ("organization_id","subject_type","subject_id");--> statement-breakpoint
CREATE INDEX "idx_note_relations_source" ON "note_relations" USING btree ("source_note_id");--> statement-breakpoint
CREATE INDEX "idx_note_relations_target" ON "note_relations" USING btree ("organization_id","target_type","target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_note_revisions_note_version" ON "note_revisions" USING btree ("note_id","version_number");--> statement-breakpoint
CREATE INDEX "idx_note_revisions_org_note" ON "note_revisions" USING btree ("organization_id","note_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_note_tasks_note_task" ON "note_tasks" USING btree ("note_id","task_id");--> statement-breakpoint
CREATE INDEX "idx_note_tasks_task" ON "note_tasks" USING btree ("organization_id","task_id");--> statement-breakpoint
CREATE INDEX "idx_notes_org_updated" ON "notes" USING btree ("organization_id","updated_at");--> statement-breakpoint
CREATE INDEX "idx_notes_org_patient_updated" ON "notes" USING btree ("organization_id","patient_id","updated_at");--> statement-breakpoint
CREATE INDEX "idx_notes_org_status_updated" ON "notes" USING btree ("organization_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "idx_notes_org_owner_updated" ON "notes" USING btree ("organization_id","owner_id","updated_at");--> statement-breakpoint
CREATE INDEX "idx_notes_parent" ON "notes" USING btree ("parent_note_id");--> statement-breakpoint
CREATE POLICY "policy_note_attachments_isolation" ON "note_attachments" AS PERMISSIVE FOR ALL TO "authenticated" USING ("note_attachments"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid)) WITH CHECK ("note_attachments"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "policy_note_audit_logs_isolation" ON "note_audit_logs" AS PERMISSIVE FOR ALL TO "authenticated" USING ("note_audit_logs"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid)) WITH CHECK ("note_audit_logs"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "policy_note_comments_isolation" ON "note_comments" AS PERMISSIVE FOR ALL TO "authenticated" USING ("note_comments"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid)) WITH CHECK ("note_comments"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "policy_note_mentions_isolation" ON "note_mentions" AS PERMISSIVE FOR ALL TO "authenticated" USING ("note_mentions"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid)) WITH CHECK ("note_mentions"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "policy_note_permissions_isolation" ON "note_permissions" AS PERMISSIVE FOR ALL TO "authenticated" USING ("note_permissions"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid)) WITH CHECK ("note_permissions"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "policy_note_relations_isolation" ON "note_relations" AS PERMISSIVE FOR ALL TO "authenticated" USING ("note_relations"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid)) WITH CHECK ("note_relations"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "policy_note_revisions_isolation" ON "note_revisions" AS PERMISSIVE FOR ALL TO "authenticated" USING ("note_revisions"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid)) WITH CHECK ("note_revisions"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "policy_note_tasks_isolation" ON "note_tasks" AS PERMISSIVE FOR ALL TO "authenticated" USING ("note_tasks"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid)) WITH CHECK ("note_tasks"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "policy_notes_isolation" ON "notes" AS PERMISSIVE FOR ALL TO "authenticated" USING ("notes"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid)) WITH CHECK ("notes"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid));
