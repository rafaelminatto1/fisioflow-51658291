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
ALTER TABLE "appointments" ADD COLUMN "firestore_id" varchar(150);--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "firestore_id" varchar(150);--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "embedding" vector(1536);--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "weight" double precision;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "progress" integer;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "date_of_birth" date;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "archived" boolean;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "firestore_id" varchar(150);--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "main_condition" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "status" varchar(100);--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "time_to_peak" double precision;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "total_reps" integer;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "avg_peak_force" double precision;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "peak_force_nkg" double precision;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "body_weight" double precision;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "rfd_50" double precision;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "rfd_100" double precision;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "rfd_200" double precision;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "peak_force_n" double precision;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "raw_force_data" jsonb;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "peak_force" double precision;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "avg_force" double precision;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "rate_of_force_development" double precision;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "sensitivity" integer;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "device_battery" integer;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "sample_rate" integer;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "is_simulated" boolean;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "repetitions" integer;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "side" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "device_firmware" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "measurement_mode" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "device_model" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "protocol_name" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "body_part" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "duration" double precision;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "firestore_id" varchar(150);--> statement-breakpoint
ALTER TABLE "exercise_protocols" ADD COLUMN "firestore_id" varchar(150);--> statement-breakpoint
ALTER TABLE "exercise_protocols" ADD COLUMN "embedding" vector(1536);