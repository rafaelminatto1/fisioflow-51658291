CREATE TYPE "public"."appointment_status" AS ENUM('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled');--> statement-breakpoint
CREATE TYPE "public"."appointment_type" AS ENUM('evaluation', 'session', 'reassessment', 'group', 'return');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'partial', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('M', 'F', 'O');--> statement-breakpoint
CREATE TYPE "public"."goal_status" AS ENUM('pending', 'in_progress', 'achieved', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."package_status" AS ENUM('active', 'expired', 'used', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."pathology_status" AS ENUM('active', 'treated', 'monitoring');--> statement-breakpoint
CREATE TYPE "public"."file_category" AS ENUM('exam', 'imaging', 'document', 'before_after', 'other');--> statement-breakpoint
CREATE TYPE "public"."file_type" AS ENUM('pdf', 'jpg', 'png', 'docx', 'other');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('draft', 'finalized', 'cancelled');--> statement-breakpoint
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
	"chief_complaint" text,
	"current_history" text,
	"past_history" text,
	"family_history" text,
	"medications" jsonb DEFAULT '[]'::jsonb,
	"allergies" jsonb DEFAULT '[]'::jsonb,
	"physical_activity" text,
	"lifestyle" jsonb,
	"physical_exam" jsonb,
	"diagnosis" text,
	"icd10_codes" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "medical_records_patient_id_unique" UNIQUE("patient_id")
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
	"phone" varchar(20) NOT NULL,
	"phone_secondary" varchar(20),
	"email" varchar(255),
	"photo_url" text,
	"profession" varchar(100),
	"address" jsonb,
	"emergency_contact" jsonb,
	"insurance" jsonb,
	"organization_id" uuid,
	"origin" varchar(100),
	"referred_by" varchar(150),
	"is_active" boolean DEFAULT true NOT NULL,
	"alerts" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
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
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_medical_record_id_medical_records_id_fk" FOREIGN KEY ("medical_record_id") REFERENCES "public"."medical_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pathologies" ADD CONSTRAINT "pathologies_medical_record_id_medical_records_id_fk" FOREIGN KEY ("medical_record_id") REFERENCES "public"."medical_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_packages" ADD CONSTRAINT "patient_packages_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surgeries" ADD CONSTRAINT "surgeries_medical_record_id_medical_records_id_fk" FOREIGN KEY ("medical_record_id") REFERENCES "public"."medical_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_attachments" ADD CONSTRAINT "session_attachments_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_attachments" ADD CONSTRAINT "session_attachments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;