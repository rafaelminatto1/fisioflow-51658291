CREATE TYPE "public"."exercise_difficulty" AS ENUM('iniciante', 'intermediario', 'avancado');--> statement-breakpoint
CREATE TYPE "public"."exercise_protocol_type" AS ENUM('pos_operatorio', 'patologia', 'preventivo', 'esportivo', 'funcional');--> statement-breakpoint
CREATE TYPE "public"."evidence_level" AS ENUM('A', 'B', 'C', 'D');--> statement-breakpoint
CREATE TYPE "public"."protocol_type" AS ENUM('pos_operatorio', 'patologia', 'preventivo', 'esportivo', 'funcional', 'neurologico', 'respiratorio');--> statement-breakpoint
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
	"firestore_id" varchar(255),
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
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "exercise_template_items_firestore_id_unique" UNIQUE("firestore_id")
);
--> statement-breakpoint
CREATE TABLE "exercise_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firestore_id" varchar(255),
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
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "exercise_templates_firestore_id_unique" UNIQUE("firestore_id")
);
--> statement-breakpoint
ALTER TABLE "patient_goals" ADD CONSTRAINT "patient_goals_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_pathologies" ADD CONSTRAINT "patient_pathologies_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_favorites" ADD CONSTRAINT "exercise_favorites_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_category_id_exercise_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."exercise_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievements_log" ADD CONSTRAINT "achievements_log_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievements_log" ADD CONSTRAINT "achievements_log_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_quests" ADD CONSTRAINT "daily_quests_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_gamification" ADD CONSTRAINT "patient_gamification_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_transactions" ADD CONSTRAINT "xp_transactions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_exercises" ADD CONSTRAINT "protocol_exercises_protocol_id_exercise_protocols_id_fk" FOREIGN KEY ("protocol_id") REFERENCES "public"."exercise_protocols"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiki_page_versions" ADD CONSTRAINT "wiki_page_versions_page_id_wiki_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."wiki_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_template_items" ADD CONSTRAINT "exercise_template_items_template_id_exercise_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."exercise_templates"("id") ON DELETE cascade ON UPDATE no action;