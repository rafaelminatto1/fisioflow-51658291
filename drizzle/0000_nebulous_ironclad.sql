CREATE TYPE "public"."appointment_status" AS ENUM('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled');--> statement-breakpoint
CREATE TYPE "public"."appointment_type" AS ENUM('evaluation', 'session', 'reassessment', 'group', 'return');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'partial', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."exercise_difficulty" AS ENUM('iniciante', 'intermediario', 'avancado');--> statement-breakpoint
CREATE TYPE "public"."exercise_protocol_type" AS ENUM('pos_operatorio', 'patologia', 'preventivo', 'esportivo', 'funcional');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('M', 'F', 'O');--> statement-breakpoint
CREATE TYPE "public"."goal_status" AS ENUM('pending', 'in_progress', 'achieved', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."package_status" AS ENUM('active', 'expired', 'used', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."pathology_status" AS ENUM('active', 'treated', 'monitoring');--> statement-breakpoint
CREATE TYPE "public"."file_category" AS ENUM('exam', 'imaging', 'document', 'before_after', 'other');--> statement-breakpoint
CREATE TYPE "public"."file_type" AS ENUM('pdf', 'jpg', 'png', 'docx', 'other');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('draft', 'finalized', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."evidence_level" AS ENUM('A', 'B', 'C', 'D');--> statement-breakpoint
CREATE TYPE "public"."protocol_type" AS ENUM('pos_operatorio', 'patologia', 'preventivo', 'esportivo', 'funcional', 'neurologico', 'respiratorio');--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"therapist_id" uuid NOT NULL,
	"organization_id" uuid,
	"date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"duration_minutes" integer DEFAULT 60 NOT NULL,
	"status" "appointment_status" DEFAULT 'scheduled' NOT NULL,
	"type" "appointment_type" DEFAULT 'session' NOT NULL,
	"is_group" boolean DEFAULT false,
	"max_participants" integer DEFAULT 1,
	"current_participants" integer DEFAULT 1,
	"group_id" uuid,
	"room_id" uuid,
	"confirmed_at" timestamp,
	"confirmed_via" varchar(50),
	"reminder_sent_at" timestamp,
	"payment_status" "payment_status" DEFAULT 'pending',
	"payment_amount" numeric(10, 2),
	"paid_at" timestamp,
	"package_id" uuid,
	"notes" text,
	"cancellation_reason" text,
	"cancelled_at" timestamp,
	"cancelled_by" uuid,
	"rescheduled_from" uuid,
	"rescheduled_to" uuid,
	"is_recurring" boolean DEFAULT false,
	"recurrence_pattern" varchar(50),
	"recurrence_group_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "blocked_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"therapist_id" uuid,
	"room_id" uuid,
	"organization_id" uuid,
	"date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"reason" varchar(200),
	"is_all_day" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"name" varchar(100) NOT NULL,
	"capacity" integer DEFAULT 1,
	"is_active" boolean DEFAULT true,
	"working_hours" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"description" text NOT NULL,
	"target_date" timestamp,
	"status" text DEFAULT 'em_andamento' NOT NULL,
	"priority" text DEFAULT 'media',
	"achieved_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_pathologies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"diagnosed_at" timestamp,
	"status" text DEFAULT 'ativo' NOT NULL,
	"is_primary" boolean DEFAULT false,
	"icd_code" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evaluation_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"category" varchar(100),
	"content" jsonb,
	"is_global" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(100) NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"icon" varchar(50),
	"color" varchar(20),
	"order_index" integer DEFAULT 0,
	"parent_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "exercise_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "exercise_favorites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exercise_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(250),
	"name" varchar(250) NOT NULL,
	"category_id" uuid,
	"subcategory" varchar(100),
	"difficulty" "exercise_difficulty" DEFAULT 'iniciante',
	"description" text,
	"instructions" text,
	"tips" text,
	"precautions" text,
	"benefits" text,
	"muscles_primary" text[] DEFAULT '{}',
	"muscles_secondary" text[] DEFAULT '{}',
	"body_parts" text[] DEFAULT '{}',
	"equipment" text[] DEFAULT '{}',
	"sets_recommended" integer,
	"reps_recommended" integer,
	"duration_seconds" integer,
	"rest_seconds" integer,
	"image_url" text,
	"thumbnail_url" text,
	"video_url" text,
	"pathologies_indicated" text[] DEFAULT '{}',
	"pathologies_contraindicated" text[] DEFAULT '{}',
	"icd10_codes" text[] DEFAULT '{}',
	"tags" text[] DEFAULT '{}',
	"references" text,
	"embedding" vector(1536),
	"is_active" boolean DEFAULT true NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"organization_id" uuid,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "exercises_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"xp_reward" integer DEFAULT 50,
	"icon" text,
	"category" text DEFAULT 'general',
	"requirements" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "achievements_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "achievements_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"achievement_id" uuid NOT NULL,
	"achievement_title" text NOT NULL,
	"unlocked_at" timestamp with time zone,
	"xp_reward" integer
);
--> statement-breakpoint
CREATE TABLE "daily_quests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"date" date DEFAULT now(),
	"quests_data" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"completed_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "daily_quests_patient_id_date_unique" UNIQUE("patient_id","date")
);
--> statement-breakpoint
CREATE TABLE "patient_gamification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"current_xp" integer DEFAULT 0,
	"level" integer DEFAULT 1,
	"current_streak" integer DEFAULT 0,
	"longest_streak" integer DEFAULT 0,
	"total_points" integer DEFAULT 0,
	"last_activity_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "patient_gamification_patient_id_unique" UNIQUE("patient_id")
);
--> statement-breakpoint
CREATE TABLE "xp_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"reason" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"medical_record_id" uuid NOT NULL,
	"description" text NOT NULL,
	"target_date" date,
	"priority" integer DEFAULT 0,
	"status" "goal_status" DEFAULT 'pending',
	"achieved_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medical_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"organization_id" uuid,
	"record_date" date,
	"chief_complaint" text,
	"medical_history" text,
	"current_medications" text,
	"previous_surgeries" text,
	"lifestyle_habits" text,
	"current_history" text,
	"past_history" text,
	"family_history" text,
	"created_by" text,
	"medications" jsonb DEFAULT '[]'::jsonb,
	"allergies" jsonb DEFAULT '[]'::jsonb,
	"physical_activity" text,
	"lifestyle" jsonb,
	"physical_exam" jsonb,
	"diagnosis" text,
	"icd10_codes" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pathologies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"medical_record_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"icd_code" varchar(20),
	"status" "pathology_status" DEFAULT 'active',
	"diagnosed_at" date,
	"treated_at" date,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"total_sessions" integer NOT NULL,
	"used_sessions" integer DEFAULT 0 NOT NULL,
	"remaining_sessions" integer NOT NULL,
	"price" numeric(10, 2),
	"status" "package_status" DEFAULT 'active',
	"purchased_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" varchar(150) NOT NULL,
	"cpf" varchar(14),
	"rg" varchar(20),
	"birth_date" date,
	"gender" "gender",
	"phone" varchar(20),
	"phone_secondary" varchar(20),
	"email" varchar(255),
	"photo_url" text,
	"profession" varchar(100),
	"address" jsonb,
	"emergency_contact" jsonb,
	"insurance" jsonb,
	"organization_id" uuid,
	"profile_id" uuid,
	"user_id" text,
	"origin" varchar(100),
	"referred_by" varchar(150),
	"professional_id" uuid,
	"professional_name" varchar(150),
	"is_active" boolean DEFAULT true NOT NULL,
	"alerts" jsonb DEFAULT '[]'::jsonb,
	"observations" text,
	"notes" text,
	"incomplete_registration" boolean DEFAULT false NOT NULL,
	"consent_data" boolean DEFAULT true,
	"consent_image" boolean DEFAULT false,
	"blood_type" varchar(10),
	"weight_kg" numeric(6, 2),
	"height_cm" numeric(6, 2),
	"marital_status" varchar(50),
	"education_level" varchar(100),
	"weight" double precision,
	"progress" integer,
	"date_of_birth" date,
	"archived" boolean,
	"main_condition" text,
	"status" varchar(100),
	"session_value" numeric(10, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "patients_cpf_unique" UNIQUE("cpf")
);
--> statement-breakpoint
CREATE TABLE "surgeries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"medical_record_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"surgery_date" date,
	"surgeon" varchar(150),
	"hospital" varchar(150),
	"post_op_protocol" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255),
	"slug" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"name" varchar(255),
	"email" varchar(255),
	"full_name" varchar(255),
	"role" varchar(50),
	"organization_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"patient_id" uuid NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"original_name" varchar(255),
	"file_url" text NOT NULL,
	"thumbnail_url" text,
	"file_type" "file_type" DEFAULT 'other',
	"mime_type" varchar(100),
	"category" "file_category" DEFAULT 'other',
	"size_bytes" integer,
	"description" text,
	"uploaded_by" uuid,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"therapist_id" uuid,
	"name" varchar(200) NOT NULL,
	"description" text,
	"subjective" jsonb,
	"objective" jsonb,
	"assessment" jsonb,
	"plan" jsonb,
	"is_global" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"appointment_id" uuid,
	"therapist_id" uuid NOT NULL,
	"organization_id" uuid,
	"session_number" integer,
	"date" timestamp DEFAULT now() NOT NULL,
	"duration_minutes" integer,
	"subjective" jsonb,
	"objective" jsonb,
	"assessment" jsonb,
	"plan" jsonb,
	"status" "session_status" DEFAULT 'draft' NOT NULL,
	"last_auto_save_at" timestamp,
	"finalized_at" timestamp,
	"finalized_by" uuid,
	"replicated_from_id" uuid,
	"pdf_url" text,
	"pdf_generated_at" timestamp,
	"required_tests" jsonb,
	"alerts_acknowledged" boolean DEFAULT false,
	"time_to_peak" double precision,
	"total_reps" integer,
	"avg_peak_force" double precision,
	"peak_force_nkg" double precision,
	"body_weight" double precision,
	"rfd_50" double precision,
	"rfd_100" double precision,
	"rfd_200" double precision,
	"peak_force_n" double precision,
	"raw_force_data" jsonb,
	"peak_force" double precision,
	"avg_force" double precision,
	"rate_of_force_development" double precision,
	"sensitivity" integer,
	"device_battery" integer,
	"sample_rate" integer,
	"is_simulated" boolean,
	"repetitions" integer,
	"side" text,
	"device_firmware" text,
	"measurement_mode" text,
	"device_model" text,
	"protocol_name" text,
	"body_part" text,
	"duration" double precision,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise_protocols" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(250),
	"name" varchar(250) NOT NULL,
	"condition_name" varchar(250),
	"protocol_type" "protocol_type" DEFAULT 'patologia',
	"evidence_level" "evidence_level",
	"description" text,
	"objectives" text,
	"contraindications" text,
	"weeks_total" integer,
	"phases" jsonb DEFAULT '[]'::jsonb,
	"milestones" jsonb DEFAULT '[]'::jsonb,
	"restrictions" jsonb DEFAULT '[]'::jsonb,
	"progression_criteria" jsonb DEFAULT '[]'::jsonb,
	"references" jsonb DEFAULT '[]'::jsonb,
	"icd10_codes" text[] DEFAULT '{}',
	"tags" text[] DEFAULT '{}',
	"clinical_tests" text[] DEFAULT '{}',
	"is_active" boolean DEFAULT true NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"organization_id" uuid,
	"wiki_page_id" uuid,
	"embedding" vector(1536),
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "exercise_protocols_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "protocol_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"protocol_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"phase_week_start" integer NOT NULL,
	"phase_week_end" integer,
	"sets_recommended" integer,
	"reps_recommended" integer,
	"duration_seconds" integer,
	"frequency_per_week" integer,
	"progression_notes" text,
	"order_index" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wiki_page_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"content" text NOT NULL,
	"html_content" text,
	"version" integer NOT NULL,
	"comment" varchar(500),
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wiki_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(350) NOT NULL,
	"title" varchar(500) NOT NULL,
	"content" text DEFAULT '',
	"html_content" text,
	"icon" varchar(50),
	"cover_image" text,
	"parent_id" uuid,
	"category" varchar(100),
	"tags" text[] DEFAULT '{}',
	"is_published" boolean DEFAULT true NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"organization_id" uuid,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "wiki_pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "exercise_template_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"exercise_id" text NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"sets" integer,
	"repetitions" integer,
	"duration" integer,
	"notes" text,
	"week_start" integer,
	"week_end" integer,
	"clinical_notes" text,
	"focus_muscles" text[] DEFAULT '{}',
	"purpose" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(500) NOT NULL,
	"description" text,
	"category" varchar(200),
	"condition_name" varchar(500),
	"template_variant" varchar(200),
	"clinical_notes" text,
	"contraindications" text,
	"precautions" text,
	"progression_notes" text,
	"evidence_level" "evidence_level",
	"bibliographic_references" text[] DEFAULT '{}',
	"is_active" boolean DEFAULT true NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"organization_id" uuid,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_goals" ADD CONSTRAINT "patient_goals_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_pathologies" ADD CONSTRAINT "patient_pathologies_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_favorites" ADD CONSTRAINT "exercise_favorites_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_category_id_exercise_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."exercise_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievements_log" ADD CONSTRAINT "achievements_log_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievements_log" ADD CONSTRAINT "achievements_log_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_quests" ADD CONSTRAINT "daily_quests_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_gamification" ADD CONSTRAINT "patient_gamification_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_transactions" ADD CONSTRAINT "xp_transactions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_medical_record_id_medical_records_id_fk" FOREIGN KEY ("medical_record_id") REFERENCES "public"."medical_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pathologies" ADD CONSTRAINT "pathologies_medical_record_id_medical_records_id_fk" FOREIGN KEY ("medical_record_id") REFERENCES "public"."medical_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_packages" ADD CONSTRAINT "patient_packages_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surgeries" ADD CONSTRAINT "surgeries_medical_record_id_medical_records_id_fk" FOREIGN KEY ("medical_record_id") REFERENCES "public"."medical_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_attachments" ADD CONSTRAINT "session_attachments_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_attachments" ADD CONSTRAINT "session_attachments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_exercises" ADD CONSTRAINT "protocol_exercises_protocol_id_exercise_protocols_id_fk" FOREIGN KEY ("protocol_id") REFERENCES "public"."exercise_protocols"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiki_page_versions" ADD CONSTRAINT "wiki_page_versions_page_id_wiki_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."wiki_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_template_items" ADD CONSTRAINT "exercise_template_items_template_id_exercise_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."exercise_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_appointments_organization_id" ON "appointments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_appointments_patient_id" ON "appointments" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_appointments_therapist_date" ON "appointments" USING btree ("therapist_id","date");--> statement-breakpoint
CREATE INDEX "idx_appointments_status" ON "appointments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_appointments_room_id" ON "appointments" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "idx_blocked_slots_organization_id" ON "blocked_slots" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_blocked_slots_therapist_date" ON "blocked_slots" USING btree ("therapist_id","date");--> statement-breakpoint
CREATE INDEX "idx_blocked_slots_room_date" ON "blocked_slots" USING btree ("room_id","date");--> statement-breakpoint
CREATE INDEX "idx_rooms_organization_id" ON "rooms" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_rooms_is_active" ON "rooms" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_exercise_categories_slug" ON "exercise_categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_exercise_categories_parent_id" ON "exercise_categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_exercise_favorites_exercise_id" ON "exercise_favorites" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "idx_exercise_favorites_user_id" ON "exercise_favorites" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_exercise_favorites_organization_id" ON "exercise_favorites" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_exercises_slug" ON "exercises" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_exercises_category_id" ON "exercises" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_exercises_organization_id" ON "exercises" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_exercises_is_active" ON "exercises" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_goals_medical_record_id" ON "goals" USING btree ("medical_record_id");--> statement-breakpoint
CREATE INDEX "idx_goals_status" ON "goals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_medical_records_patient_id" ON "medical_records" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_pathologies_medical_record_id" ON "pathologies" USING btree ("medical_record_id");--> statement-breakpoint
CREATE INDEX "idx_pathologies_status" ON "pathologies" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_patient_packages_patient_id" ON "patient_packages" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_patient_packages_status" ON "patient_packages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_patients_organization_id" ON "patients" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_patients_profile_id" ON "patients" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "idx_patients_user_id" ON "patients" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_patients_cpf" ON "patients" USING btree ("cpf");--> statement-breakpoint
CREATE INDEX "idx_patients_is_active" ON "patients" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_patients_full_name" ON "patients" USING btree ("full_name");--> statement-breakpoint
CREATE INDEX "idx_surgeries_medical_record_id" ON "surgeries" USING btree ("medical_record_id");--> statement-breakpoint
CREATE INDEX "idx_session_attachments_session_id" ON "session_attachments" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_session_attachments_patient_id" ON "session_attachments" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_session_templates_organization_id" ON "session_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_session_templates_therapist_id" ON "session_templates" USING btree ("therapist_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_patient_id" ON "sessions" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_appointment_id" ON "sessions" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_therapist_id" ON "sessions" USING btree ("therapist_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_organization_id" ON "sessions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_date" ON "sessions" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_exercise_protocols_slug" ON "exercise_protocols" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_exercise_protocols_organization_id" ON "exercise_protocols" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_exercise_protocols_protocol_type" ON "exercise_protocols" USING btree ("protocol_type");--> statement-breakpoint
CREATE INDEX "idx_protocol_exercises_protocol_id" ON "protocol_exercises" USING btree ("protocol_id");--> statement-breakpoint
CREATE INDEX "idx_protocol_exercises_exercise_id" ON "protocol_exercises" USING btree ("exercise_id");