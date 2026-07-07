CREATE TABLE "ai_usage_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"user_id" uuid,
	"patient_id" uuid,
	"task_type" varchar(50) NOT NULL,
	"model" varchar(100) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"input_tokens" integer DEFAULT 0,
	"output_tokens" integer DEFAULT 0,
	"total_tokens" integer DEFAULT 0,
	"estimated_cost_usd" double precision DEFAULT 0,
	"estimated_cost_brl" double precision DEFAULT 0,
	"latency_ms" integer,
	"status" integer DEFAULT 200,
	"gateway_used" boolean DEFAULT false,
	"cache_hit" boolean DEFAULT false,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audio_transcription_budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"professional_user_id" text,
	"monthly_limit_minutes" integer DEFAULT 0 NOT NULL,
	"warn_at_percent" integer DEFAULT 80 NOT NULL,
	"hard_stop" boolean DEFAULT true NOT NULL,
	"effective_from" date DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "biomechanics_annotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"media_id" uuid,
	"frame_index" integer,
	"time_ms" integer,
	"tool" varchar(50) NOT NULL,
	"geometry" jsonb DEFAULT '{}',
	"label" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "biomechanics_annotations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "biomechanics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"media_id" uuid,
	"event_type" varchar(80) NOT NULL,
	"time_ms" integer NOT NULL,
	"frame_index" integer,
	"confidence" numeric(5, 2),
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "biomechanics_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "biomechanics_frames" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"media_id" uuid,
	"frame_index" integer NOT NULL,
	"time_ms" integer NOT NULL,
	"thumbnail_key" text,
	"landmarks" jsonb DEFAULT '[]',
	"confidence" numeric(5, 2),
	"events" jsonb DEFAULT '[]',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "biomechanics_frames" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "biomechanics_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"media_id" uuid,
	"status" varchar(50) DEFAULT 'queued' NOT NULL,
	"stage" varchar(80) DEFAULT 'ingest' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"error_code" varchar(80),
	"error_message" text,
	"model_provider" varchar(80) DEFAULT 'fisioflow',
	"model_name" varchar(120) DEFAULT 'deterministic-v1',
	"model_version" varchar(50) DEFAULT '1.0.0',
	"algorithm_version" varchar(50) DEFAULT 'bio-pipeline-1.0.0',
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "biomechanics_jobs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "biomechanics_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"r2_key" text,
	"stream_uid" varchar(160),
	"media_type" varchar(40) DEFAULT 'video' NOT NULL,
	"view" varchar(50) DEFAULT 'sagittal' NOT NULL,
	"duration_ms" integer,
	"fps" numeric(8, 2),
	"width" integer,
	"height" integer,
	"content_type" varchar(120),
	"size_bytes" integer,
	"quality_score" numeric(5, 2),
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "biomechanics_media" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "biomechanics_protocols" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"slug" varchar(120) NOT NULL,
	"name" varchar(180) NOT NULL,
	"category" varchar(80) NOT NULL,
	"description" text,
	"assessment_type" "biomechanics_assessment_type" DEFAULT 'functional_movement' NOT NULL,
	"capture_requirements" jsonb DEFAULT '{}',
	"metric_definitions" jsonb DEFAULT '[]',
	"quality_rules" jsonb DEFAULT '{}',
	"progression_gates" jsonb DEFAULT '[]',
	"red_flags" jsonb DEFAULT '[]',
	"evidence_refs" jsonb DEFAULT '[]',
	"is_system" boolean DEFAULT false NOT NULL,
	"version" varchar(30) DEFAULT '1.0.0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "biomechanics_protocols" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "biomechanics_review_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"action" varchar(80) NOT NULL,
	"from_status" varchar(50),
	"to_status" varchar(50),
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "biomechanics_review_actions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "autocomplete_catalog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"is_approved" boolean DEFAULT true NOT NULL,
	"organization_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "autocomplete_catalog" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "patient_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"professional_id" uuid,
	"photo_type" varchar(50) DEFAULT 'clinical' NOT NULL,
	"r2_key" text NOT NULL,
	"file_name" varchar(500),
	"file_size" integer,
	"mime_type" varchar(100) DEFAULT 'image/jpeg',
	"session_id" uuid,
	"body_region" varchar(100),
	"side" varchar(10),
	"notes" text,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"series_id" uuid,
	"series_order" integer DEFAULT 1 NOT NULL,
	"comparison_group_title" varchar(160),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_risk_score_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"previous_score" integer NOT NULL,
	"new_score" integer NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "patient_risk_score_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "patient_risk_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"no_show_risk" integer DEFAULT 0 NOT NULL,
	"dropout_risk" integer DEFAULT 0 NOT NULL,
	"non_adherence_risk" integer DEFAULT 0 NOT NULL,
	"needs_active_contact" integer DEFAULT 0,
	"features" jsonb NOT NULL,
	"last_ai_explanation_at" timestamp,
	"last_ai_explanation" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "patient_risk_scores_patient_id_unique" UNIQUE("patient_id")
);
--> statement-breakpoint
ALTER TABLE "patient_risk_scores" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ai_usage" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "ai_usage" CASCADE;--> statement-breakpoint
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_patient_id_patients_id_fk";
--> statement-breakpoint
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_patient_id_patients_id_fk";
--> statement-breakpoint
ALTER TABLE "financial_accounts" ALTER COLUMN "amount" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "financial_accounts" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "amount" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "amount" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "clinical_scribe_logs" ADD COLUMN "capture_mode" integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "clinical_scribe_logs" ADD COLUMN "capture_reason" varchar(40) DEFAULT 'soap_section' NOT NULL;--> statement-breakpoint
ALTER TABLE "clinical_scribe_logs" ADD COLUMN "captured_seconds" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "clinical_scribe_logs" ADD COLUMN "session_coverage_percent" integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "clinical_scribe_logs" ADD COLUMN "audio_policy_version" varchar(20) DEFAULT '2026-06-11' NOT NULL;--> statement-breakpoint
ALTER TABLE "clinical_scribe_logs" ADD COLUMN "capture_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "biomechanics_assessments" ADD COLUMN "protocol_id" uuid;--> statement-breakpoint
ALTER TABLE "biomechanics_assessments" ADD COLUMN "primary_media_id" uuid;--> statement-breakpoint
ALTER TABLE "biomechanics_assessments" ADD COLUMN "job_id" uuid;--> statement-breakpoint
ALTER TABLE "biomechanics_assessments" ADD COLUMN "quality_score" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "biomechanics_assessments" ADD COLUMN "capture_context" jsonb DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "biomechanics_assessments" ADD COLUMN "symmetry_score" numeric;--> statement-breakpoint
ALTER TABLE "biomechanics_assessments" ADD COLUMN "trajectory_data" jsonb DEFAULT '[]';--> statement-breakpoint
ALTER TABLE "biomechanics_assessments" ADD COLUMN "ai_validation_status" varchar(50) DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "biomechanics_assessments" ADD COLUMN "algorithm_version" varchar(50);--> statement-breakpoint
ALTER TABLE "biomechanics_assessments" ADD COLUMN "validated_by" uuid;--> statement-breakpoint
ALTER TABLE "biomechanics_assessments" ADD COLUMN "validated_at" timestamp;--> statement-breakpoint
ALTER TABLE "biomechanics_assessments" ADD COLUMN "report_hash" varchar(128);--> statement-breakpoint
ALTER TABLE "biomechanics_assessments" ADD COLUMN "signed_at" timestamp;--> statement-breakpoint
ALTER TABLE "biomechanics_assessments" ADD COLUMN "signature_metadata" jsonb DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "biomechanics_metrics" ADD COLUMN "side" varchar(20);--> statement-breakpoint
ALTER TABLE "biomechanics_metrics" ADD COLUMN "phase" varchar(50);--> statement-breakpoint
ALTER TABLE "biomechanics_metrics" ADD COLUMN "view" varchar(50);--> statement-breakpoint
ALTER TABLE "biomechanics_metrics" ADD COLUMN "confidence" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "biomechanics_metrics" ADD COLUMN "source" varchar(50) DEFAULT 'algorithm';--> statement-breakpoint
ALTER TABLE "biomechanics_metrics" ADD COLUMN "normal_range" jsonb DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "biomechanics_metrics" ADD COLUMN "severity" varchar(30);--> statement-breakpoint
ALTER TABLE "biomechanics_metrics" ADD COLUMN "algorithm_version" varchar(50);--> statement-breakpoint
ALTER TABLE "clinical_test_templates" ADD COLUMN "wiki_page_id" uuid;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "allergies_general" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "allergies_medicines" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "medications_in_use" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "pathologies_active" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "type" varchar(50) DEFAULT 'clinic';--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "pix_city" varchar(100);--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "settings" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "is_active" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "blocks" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "last_edited_device_id" varchar(120);--> statement-breakpoint
ALTER TABLE "wiki_pages" ADD COLUMN "patient_visible" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "wa_raw_events" ADD COLUMN "phone_number_id" varchar(64);--> statement-breakpoint
ALTER TABLE "wa_raw_events" ADD COLUMN "processing_state" varchar(40) DEFAULT 'received';--> statement-breakpoint
ALTER TABLE "wa_raw_events" ADD COLUMN "failure_reason" text;--> statement-breakpoint
ALTER TABLE "wa_raw_events" ADD COLUMN "provider_event_id" text;--> statement-breakpoint
ALTER TABLE "wa_raw_events" ADD COLUMN "signature_valid" boolean;--> statement-breakpoint
ALTER TABLE "wa_raw_events" ADD COLUMN "request_path" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "organization_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_usage_events" ADD CONSTRAINT "ai_usage_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_events" ADD CONSTRAINT "ai_usage_events_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_events" ADD CONSTRAINT "ai_usage_events_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audio_transcription_budgets" ADD CONSTRAINT "audio_transcription_budgets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biomechanics_annotations" ADD CONSTRAINT "biomechanics_annotations_assessment_id_biomechanics_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."biomechanics_assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biomechanics_annotations" ADD CONSTRAINT "biomechanics_annotations_media_id_biomechanics_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."biomechanics_media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biomechanics_events" ADD CONSTRAINT "biomechanics_events_assessment_id_biomechanics_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."biomechanics_assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biomechanics_events" ADD CONSTRAINT "biomechanics_events_media_id_biomechanics_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."biomechanics_media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biomechanics_frames" ADD CONSTRAINT "biomechanics_frames_assessment_id_biomechanics_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."biomechanics_assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biomechanics_frames" ADD CONSTRAINT "biomechanics_frames_media_id_biomechanics_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."biomechanics_media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biomechanics_jobs" ADD CONSTRAINT "biomechanics_jobs_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biomechanics_jobs" ADD CONSTRAINT "biomechanics_jobs_assessment_id_biomechanics_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."biomechanics_assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biomechanics_jobs" ADD CONSTRAINT "biomechanics_jobs_media_id_biomechanics_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."biomechanics_media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biomechanics_media" ADD CONSTRAINT "biomechanics_media_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biomechanics_media" ADD CONSTRAINT "biomechanics_media_assessment_id_biomechanics_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."biomechanics_assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biomechanics_review_actions" ADD CONSTRAINT "biomechanics_review_actions_assessment_id_biomechanics_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."biomechanics_assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_photos" ADD CONSTRAINT "patient_photos_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_photos" ADD CONSTRAINT "patient_photos_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_photos" ADD CONSTRAINT "patient_photos_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_risk_score_events" ADD CONSTRAINT "patient_risk_score_events_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_risk_scores" ADD CONSTRAINT "patient_risk_scores_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_bio_annotations_assessment" ON "biomechanics_annotations" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX "idx_bio_annotations_media" ON "biomechanics_annotations" USING btree ("media_id");--> statement-breakpoint
CREATE INDEX "idx_bio_events_assessment" ON "biomechanics_events" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX "idx_bio_events_type" ON "biomechanics_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_bio_frames_assessment" ON "biomechanics_frames" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX "idx_bio_frames_media" ON "biomechanics_frames" USING btree ("media_id");--> statement-breakpoint
CREATE INDEX "idx_bio_jobs_assessment" ON "biomechanics_jobs" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX "idx_bio_jobs_patient" ON "biomechanics_jobs" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_bio_jobs_org_status" ON "biomechanics_jobs" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_bio_media_assessment" ON "biomechanics_media" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX "idx_bio_media_patient" ON "biomechanics_media" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_bio_media_org" ON "biomechanics_media" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_bio_protocol_org" ON "biomechanics_protocols" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_bio_protocol_slug" ON "biomechanics_protocols" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_bio_protocol_category" ON "biomechanics_protocols" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_bio_review_assessment" ON "biomechanics_review_actions" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX "idx_bio_review_org" ON "biomechanics_review_actions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_autocomplete_type_approved" ON "autocomplete_catalog" USING btree ("type","is_approved");--> statement-breakpoint
CREATE INDEX "idx_autocomplete_name" ON "autocomplete_catalog" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_patient_photos_patient" ON "patient_photos" USING btree ("patient_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_patient_photos_org" ON "patient_photos" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_patient_photos_series" ON "patient_photos" USING btree ("series_id");--> statement-breakpoint
CREATE INDEX "idx_patient_photos_type" ON "patient_photos" USING btree ("photo_type","patient_id");--> statement-breakpoint
CREATE INDEX "idx_risk_events_patient" ON "patient_risk_score_events" USING btree ("patient_id");--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_exercises_embedding" ON "exercises" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "idx_wa_events_phone_number_id" ON "wa_raw_events" USING btree ("phone_number_id");--> statement-breakpoint
CREATE INDEX "idx_wa_events_processing_state" ON "wa_raw_events" USING btree ("processing_state","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_wa_events_provider_event_id" ON "wa_raw_events" USING btree ("provider_event_id");--> statement-breakpoint
DROP POLICY "policy_exercise_categories_hybrid_isolation" ON "exercise_categories" CASCADE;--> statement-breakpoint
DROP POLICY "policy_wiki_dictionary_hybrid_isolation" ON "wiki_dictionary" CASCADE;--> statement-breakpoint
DROP POLICY "policy_wiki_page_versions_hybrid_isolation" ON "wiki_page_versions" CASCADE;--> statement-breakpoint
DROP POLICY "policy_wiki_pages_hybrid_isolation" ON "wiki_pages" CASCADE;--> statement-breakpoint
DROP POLICY "policy_exercise_template_categories_hybrid_isolation" ON "exercise_template_categories" CASCADE;--> statement-breakpoint
DROP POLICY "policy_exercise_templates_hybrid_isolation" ON "exercise_templates" CASCADE;--> statement-breakpoint
CREATE POLICY "policy_exercise_categories_hybrid_select" ON "exercise_categories" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("exercise_categories"."organization_id" IS NULL) OR ("exercise_categories"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid)));--> statement-breakpoint
CREATE POLICY "policy_exercise_categories_hybrid_write" ON "exercise_categories" AS PERMISSIVE FOR ALL TO "authenticated" USING ("exercise_categories"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid)) WITH CHECK ("exercise_categories"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "policy_profiles_isolation" ON "profiles" AS PERMISSIVE FOR ALL TO "authenticated" USING ("profiles"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid)) WITH CHECK ("profiles"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "policy_wiki_dictionary_hybrid_select" ON "wiki_dictionary" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("wiki_dictionary"."organization_id" IS NULL) OR ("wiki_dictionary"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid)));--> statement-breakpoint
CREATE POLICY "policy_wiki_dictionary_hybrid_write" ON "wiki_dictionary" AS PERMISSIVE FOR ALL TO "authenticated" USING ("wiki_dictionary"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid)) WITH CHECK ("wiki_dictionary"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "policy_wiki_page_versions_hybrid_select" ON "wiki_page_versions" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("wiki_page_versions"."organization_id" IS NULL) OR ("wiki_page_versions"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid)));--> statement-breakpoint
CREATE POLICY "policy_wiki_page_versions_hybrid_write" ON "wiki_page_versions" AS PERMISSIVE FOR ALL TO "authenticated" USING ("wiki_page_versions"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid)) WITH CHECK ("wiki_page_versions"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "policy_wiki_pages_hybrid_select" ON "wiki_pages" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("wiki_pages"."organization_id" IS NULL) OR ("wiki_pages"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid)));--> statement-breakpoint
CREATE POLICY "policy_wiki_pages_hybrid_write" ON "wiki_pages" AS PERMISSIVE FOR ALL TO "authenticated" USING ("wiki_pages"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid)) WITH CHECK ("wiki_pages"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "policy_exercise_template_categories_hybrid_select" ON "exercise_template_categories" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("exercise_template_categories"."organization_id" IS NULL) OR ("exercise_template_categories"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid)));--> statement-breakpoint
CREATE POLICY "policy_exercise_template_categories_hybrid_write" ON "exercise_template_categories" AS PERMISSIVE FOR ALL TO "authenticated" USING ("exercise_template_categories"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid)) WITH CHECK ("exercise_template_categories"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "policy_exercise_templates_hybrid_select" ON "exercise_templates" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("exercise_templates"."organization_id" IS NULL) OR ("exercise_templates"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid)));--> statement-breakpoint
CREATE POLICY "policy_exercise_templates_hybrid_write" ON "exercise_templates" AS PERMISSIVE FOR ALL TO "authenticated" USING ("exercise_templates"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid)) WITH CHECK ("exercise_templates"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "policy_messages_isolation" ON "messages" AS PERMISSIVE FOR ALL TO "authenticated" USING ("messages"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid)) WITH CHECK ("messages"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "policy_biomechanics_annotations_isolation" ON "biomechanics_annotations" AS PERMISSIVE FOR ALL TO "authenticated" USING ("biomechanics_annotations"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid)) WITH CHECK ("biomechanics_annotations"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "policy_biomechanics_events_isolation" ON "biomechanics_events" AS PERMISSIVE FOR ALL TO "authenticated" USING ("biomechanics_events"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid)) WITH CHECK ("biomechanics_events"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "policy_biomechanics_frames_isolation" ON "biomechanics_frames" AS PERMISSIVE FOR ALL TO "authenticated" USING ("biomechanics_frames"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid)) WITH CHECK ("biomechanics_frames"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "policy_biomechanics_jobs_isolation" ON "biomechanics_jobs" AS PERMISSIVE FOR ALL TO "authenticated" USING ("biomechanics_jobs"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid)) WITH CHECK ("biomechanics_jobs"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "policy_biomechanics_media_isolation" ON "biomechanics_media" AS PERMISSIVE FOR ALL TO "authenticated" USING ("biomechanics_media"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid)) WITH CHECK ("biomechanics_media"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "policy_biomechanics_protocols_hybrid_select" ON "biomechanics_protocols" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("biomechanics_protocols"."organization_id" IS NULL) OR ("biomechanics_protocols"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid)));--> statement-breakpoint
CREATE POLICY "policy_biomechanics_protocols_hybrid_write" ON "biomechanics_protocols" AS PERMISSIVE FOR ALL TO "authenticated" USING ("biomechanics_protocols"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid)) WITH CHECK ("biomechanics_protocols"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "policy_biomechanics_review_actions_isolation" ON "biomechanics_review_actions" AS PERMISSIVE FOR ALL TO "authenticated" USING ("biomechanics_review_actions"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid)) WITH CHECK ("biomechanics_review_actions"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "policy_autocomplete_catalog_hybrid_select" ON "autocomplete_catalog" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("autocomplete_catalog"."organization_id" IS NULL) OR ("autocomplete_catalog"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid)));--> statement-breakpoint
CREATE POLICY "policy_autocomplete_catalog_hybrid_write" ON "autocomplete_catalog" AS PERMISSIVE FOR ALL TO "authenticated" USING ("autocomplete_catalog"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid)) WITH CHECK ("autocomplete_catalog"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "policy_patient_risk_score_events_isolation" ON "patient_risk_score_events" AS PERMISSIVE FOR ALL TO "authenticated" USING ("patient_risk_score_events"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid)) WITH CHECK ("patient_risk_score_events"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "policy_patient_risk_scores_isolation" ON "patient_risk_scores" AS PERMISSIVE FOR ALL TO "authenticated" USING ("patient_risk_scores"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid)) WITH CHECK ("patient_risk_scores"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid));--> statement-breakpoint
ALTER POLICY "policy_pre_registrations_public_insert" ON "pre_registrations" TO anon,authenticated WITH CHECK (("pre_registrations"."organization_id" = (NULLIF(current_setting('app.org_id', true), '')::uuid)) OR (NULLIF(current_setting('app.org_id', true), '') IS NULL));