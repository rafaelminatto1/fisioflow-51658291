CREATE TYPE "public"."media_type" AS ENUM('image', 'video', 'youtube');--> statement-breakpoint
CREATE TABLE "exercise_media_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exercise_id" uuid NOT NULL,
	"media_id" uuid,
	"type" "media_type" NOT NULL,
	"url" text NOT NULL,
	"caption" text,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_gallery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"name" varchar(255) NOT NULL,
	"type" "media_type" DEFAULT 'image' NOT NULL,
	"url" text NOT NULL,
	"thumbnail_url" text,
	"folder" varchar(255) DEFAULT 'Geral' NOT NULL,
	"size" integer,
	"mime_type" varchar(100),
	"metadata" jsonb,
	"is_active" text DEFAULT 'true',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "patient_pathologies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "exercise_media_attachments" ADD CONSTRAINT "exercise_media_attachments_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_media_attachments" ADD CONSTRAINT "exercise_media_attachments_media_id_media_gallery_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media_gallery"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_gallery" ADD CONSTRAINT "media_gallery_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_exercise_media_exercise_id" ON "exercise_media_attachments" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "idx_exercise_media_order" ON "exercise_media_attachments" USING btree ("order_index");--> statement-breakpoint
CREATE INDEX "idx_media_gallery_org_id" ON "media_gallery" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_media_gallery_folder" ON "media_gallery" USING btree ("folder");--> statement-breakpoint
CREATE INDEX "idx_media_gallery_type" ON "media_gallery" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_appointments_org_patient" ON "appointments" USING btree ("organization_id","patient_id");--> statement-breakpoint
CREATE INDEX "idx_patient_pathologies_org_patient" ON "patient_pathologies" USING btree ("organization_id","patient_id");--> statement-breakpoint
CREATE INDEX "idx_contas_financeiras_org_patient" ON "contas_financeiras" USING btree ("organization_id","patient_id");--> statement-breakpoint
CREATE INDEX "idx_patients_org_status" ON "patients" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_patients_org_active" ON "patients" USING btree ("organization_id","is_active");--> statement-breakpoint
CREATE POLICY "policy_patient_pathologies_isolation" ON "patient_pathologies" AS PERMISSIVE FOR ALL TO "authenticated" USING ("patient_pathologies"."organization_id" = (current_setting('app.org_id')::uuid));