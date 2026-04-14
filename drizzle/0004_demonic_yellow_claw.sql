CREATE TABLE "wiki_dictionary" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pt" varchar(500) NOT NULL,
	"en" varchar(500) NOT NULL,
	"category" varchar(100) NOT NULL,
	"subcategory" varchar(200),
	"aliases_pt" text[] DEFAULT '{}',
	"aliases_en" text[] DEFAULT '{}',
	"description_pt" text,
	"description_en" text,
	"organization_id" uuid,
	"is_global" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "exercises" ALTER COLUMN "embedding" SET DATA TYPE vector(768);--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "additional_names" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "is_unlimited" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "phone" varchar(20);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "crefito" varchar(50);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "specialties" jsonb;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "avatar_url" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "address" jsonb;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "birth_date" date;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "is_active" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "email_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "preferences" jsonb;--> statement-breakpoint
ALTER TABLE "exercise_templates" ADD COLUMN "difficulty_level" text;--> statement-breakpoint
ALTER TABLE "exercise_templates" ADD COLUMN "treatment_phase" text;--> statement-breakpoint
ALTER TABLE "exercise_templates" ADD COLUMN "body_part" text;--> statement-breakpoint
ALTER TABLE "exercise_templates" ADD COLUMN "estimated_duration" integer;--> statement-breakpoint
CREATE INDEX "idx_exercises_name_search" ON "exercises" USING gin (to_tsvector('portuguese', "name"));--> statement-breakpoint
ALTER TABLE "exercise_templates" ADD CONSTRAINT "chk_difficulty_level" CHECK ("exercise_templates"."difficulty_level" IS NULL OR "exercise_templates"."difficulty_level" IN ('iniciante', 'intermediario', 'avancado'));--> statement-breakpoint
ALTER TABLE "exercise_templates" ADD CONSTRAINT "chk_treatment_phase" CHECK ("exercise_templates"."treatment_phase" IS NULL OR "exercise_templates"."treatment_phase" IN ('fase_aguda', 'fase_subaguda', 'remodelacao', 'retorno_ao_esporte'));