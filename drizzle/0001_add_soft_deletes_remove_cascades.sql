CREATE TYPE "public"."biomechanics_assessment_type" AS ENUM('static_posture', 'gait_analysis', 'running_analysis', 'functional_movement');--> statement-breakpoint
ALTER TYPE "public"."protocol_type" ADD VALUE 'conservador';--> statement-breakpoint
ALTER TYPE "public"."protocol_type" ADD VALUE 'geriatria';--> statement-breakpoint
CREATE TABLE "biomechanics_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"organization_id" uuid,
	"professional_id" uuid,
	"type" "biomechanics_assessment_type" NOT NULL,
	"status" varchar(50) DEFAULT 'completed',
	"media_url" text NOT NULL,
	"thumbnail_url" text,
	"analysis_data" jsonb,
	"observations" text,
	"conclusions" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise_template_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"icon" text,
	"order_index" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jules_learnings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" varchar(100) NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"pr_review_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jules_pr_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pr_number" integer NOT NULL,
	"repo_name" varchar(255) NOT NULL,
	"summary" text,
	"review_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "announcement_reads" DROP CONSTRAINT "announcement_reads_announcement_id_announcements_id_fk";
--> statement-breakpoint
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_patient_id_patients_id_fk";
--> statement-breakpoint
ALTER TABLE "exercise_prescriptions" DROP CONSTRAINT "exercise_prescriptions_patient_id_patients_id_fk";
--> statement-breakpoint
ALTER TABLE "generated_reports" DROP CONSTRAINT "generated_reports_patient_id_patients_id_fk";
--> statement-breakpoint
ALTER TABLE "pain_map_points" DROP CONSTRAINT "pain_map_points_pain_map_id_pain_maps_id_fk";
--> statement-breakpoint
ALTER TABLE "pain_maps" DROP CONSTRAINT "pain_maps_patient_id_patients_id_fk";
--> statement-breakpoint
ALTER TABLE "patient_objective_assignments" DROP CONSTRAINT "patient_objective_assignments_patient_id_patients_id_fk";
--> statement-breakpoint
ALTER TABLE "patient_objective_assignments" DROP CONSTRAINT "patient_objective_assignments_objective_id_patient_objectives_id_fk";
--> statement-breakpoint
ALTER TABLE "patient_session_metrics" DROP CONSTRAINT "patient_session_metrics_patient_id_patients_id_fk";
--> statement-breakpoint
ALTER TABLE "prescribed_exercises" DROP CONSTRAINT "prescribed_exercises_patient_id_patients_id_fk";
--> statement-breakpoint
ALTER TABLE "standardized_test_results" DROP CONSTRAINT "standardized_test_results_patient_id_patients_id_fk";
--> statement-breakpoint
ALTER TABLE "exercise_favorites" DROP CONSTRAINT "exercise_favorites_exercise_id_exercises_id_fk";
--> statement-breakpoint
ALTER TABLE "centros_custo" DROP CONSTRAINT "centros_custo_organization_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "contas_financeiras" DROP CONSTRAINT "contas_financeiras_organization_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "empresas_parceiras" DROP CONSTRAINT "empresas_parceiras_organization_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "formas_pagamento" DROP CONSTRAINT "formas_pagamento_organization_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "fornecedores" DROP CONSTRAINT "fornecedores_organization_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "nfse" DROP CONSTRAINT "nfse_organization_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "nfse_config" DROP CONSTRAINT "nfse_config_organization_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "package_usage" DROP CONSTRAINT "package_usage_organization_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "pagamentos" DROP CONSTRAINT "pagamentos_organization_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "patient_packages" DROP CONSTRAINT "patient_packages_organization_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "patient_packages" DROP CONSTRAINT "patient_packages_patient_id_patients_id_fk";
--> statement-breakpoint
ALTER TABLE "session_package_templates" DROP CONSTRAINT "session_package_templates_organization_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "user_vouchers" DROP CONSTRAINT "user_vouchers_organization_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "user_vouchers" DROP CONSTRAINT "user_vouchers_voucher_id_vouchers_id_fk";
--> statement-breakpoint
ALTER TABLE "voucher_checkout_sessions" DROP CONSTRAINT "voucher_checkout_sessions_organization_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "voucher_checkout_sessions" DROP CONSTRAINT "voucher_checkout_sessions_voucher_id_vouchers_id_fk";
--> statement-breakpoint
ALTER TABLE "vouchers" DROP CONSTRAINT "vouchers_organization_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "achievements_log" DROP CONSTRAINT "achievements_log_patient_id_patients_id_fk";
--> statement-breakpoint
ALTER TABLE "daily_quests" DROP CONSTRAINT "daily_quests_patient_id_patients_id_fk";
--> statement-breakpoint
ALTER TABLE "patient_gamification" DROP CONSTRAINT "patient_gamification_patient_id_patients_id_fk";
--> statement-breakpoint
ALTER TABLE "xp_transactions" DROP CONSTRAINT "xp_transactions_patient_id_patients_id_fk";
--> statement-breakpoint
ALTER TABLE "goals" DROP CONSTRAINT "goals_medical_record_id_medical_records_id_fk";
--> statement-breakpoint
ALTER TABLE "medical_records" DROP CONSTRAINT "medical_records_patient_id_patients_id_fk";
--> statement-breakpoint
ALTER TABLE "pathologies" DROP CONSTRAINT "pathologies_medical_record_id_medical_records_id_fk";
--> statement-breakpoint
ALTER TABLE "surgeries" DROP CONSTRAINT "surgeries_medical_record_id_medical_records_id_fk";
--> statement-breakpoint
ALTER TABLE "session_attachments" DROP CONSTRAINT "session_attachments_session_id_sessions_id_fk";
--> statement-breakpoint
ALTER TABLE "session_attachments" DROP CONSTRAINT "session_attachments_patient_id_patients_id_fk";
--> statement-breakpoint
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_patient_id_patients_id_fk";
--> statement-breakpoint
ALTER TABLE "protocol_exercises" DROP CONSTRAINT "protocol_exercises_protocol_id_exercise_protocols_id_fk";
--> statement-breakpoint
ALTER TABLE "wiki_page_versions" DROP CONSTRAINT "wiki_page_versions_page_id_wiki_pages_id_fk";
--> statement-breakpoint
ALTER TABLE "task_acknowledgments" DROP CONSTRAINT "task_acknowledgments_task_id_tasks_id_fk";
--> statement-breakpoint
ALTER TABLE "task_assignments" DROP CONSTRAINT "task_assignments_task_id_tasks_id_fk";
--> statement-breakpoint
ALTER TABLE "task_audit_logs" DROP CONSTRAINT "task_audit_logs_task_id_tasks_id_fk";
--> statement-breakpoint
ALTER TABLE "task_columns" DROP CONSTRAINT "task_columns_board_id_task_boards_id_fk";
--> statement-breakpoint
ALTER TABLE "task_visibility" DROP CONSTRAINT "task_visibility_task_id_tasks_id_fk";
--> statement-breakpoint
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_column_id_task_columns_id_fk";
--> statement-breakpoint
ALTER TABLE "exercise_template_items" DROP CONSTRAINT "exercise_template_items_template_id_exercise_templates_id_fk";
--> statement-breakpoint
ALTER TABLE "exercise_protocols" ALTER COLUMN "embedding" SET DATA TYPE vector(768);--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "blocked_slots" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "clinical_test_templates" ADD COLUMN "initial_position_image_url" text;--> statement-breakpoint
ALTER TABLE "clinical_test_templates" ADD COLUMN "final_position_image_url" text;--> statement-breakpoint
ALTER TABLE "clinical_test_templates" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "conduct_library" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "evolution_templates" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "exercise_prescriptions" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "generated_reports" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "pain_map_points" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "pain_maps" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "patient_goals" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "patient_objective_assignments" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "patient_objectives" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "patient_pathologies" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "patient_session_metrics" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "prescribed_exercises" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "standardized_test_results" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "centros_custo" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "contas_financeiras" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "convenios" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "empresas_parceiras" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "formas_pagamento" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "fornecedores" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "nfse" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "pagamentos" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "patient_packages" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "session_package_templates" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "transacoes" ADD COLUMN "dre_categoria" varchar(100);--> statement-breakpoint
ALTER TABLE "transacoes" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "user_vouchers" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "voucher_checkout_sessions" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "vouchers" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "medical_records" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "pathologies" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "surgeries" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "session_templates" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "wiki_pages" ADD COLUMN "embedding" vector(768);--> statement-breakpoint
ALTER TABLE "exercise_templates" ADD COLUMN "template_type" text DEFAULT 'custom' NOT NULL;--> statement-breakpoint
ALTER TABLE "exercise_templates" ADD COLUMN "patient_profile" text;--> statement-breakpoint
ALTER TABLE "exercise_templates" ADD COLUMN "source_template_id" uuid;--> statement-breakpoint
ALTER TABLE "exercise_templates" ADD COLUMN "is_draft" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "exercise_templates" ADD COLUMN "exercise_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "biomechanics_assessments" ADD CONSTRAINT "biomechanics_assessments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jules_learnings" ADD CONSTRAINT "jules_learnings_pr_review_id_jules_pr_reviews_id_fk" FOREIGN KEY ("pr_review_id") REFERENCES "public"."jules_pr_reviews"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_biomechanics_patient_id" ON "biomechanics_assessments" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_biomechanics_organization_id" ON "biomechanics_assessments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_biomechanics_type" ON "biomechanics_assessments" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_jules_learnings_category" ON "jules_learnings" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_jules_pr_repo_number" ON "jules_pr_reviews" USING btree ("repo_name","pr_number");--> statement-breakpoint
CREATE INDEX "idx_jules_pr_created_at" ON "jules_pr_reviews" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "announcement_reads" ADD CONSTRAINT "announcement_reads_announcement_id_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_prescriptions" ADD CONSTRAINT "exercise_prescriptions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_reports" ADD CONSTRAINT "generated_reports_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pain_map_points" ADD CONSTRAINT "pain_map_points_pain_map_id_pain_maps_id_fk" FOREIGN KEY ("pain_map_id") REFERENCES "public"."pain_maps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pain_maps" ADD CONSTRAINT "pain_maps_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_objective_assignments" ADD CONSTRAINT "patient_objective_assignments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_objective_assignments" ADD CONSTRAINT "patient_objective_assignments_objective_id_patient_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."patient_objectives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_session_metrics" ADD CONSTRAINT "patient_session_metrics_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescribed_exercises" ADD CONSTRAINT "prescribed_exercises_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standardized_test_results" ADD CONSTRAINT "standardized_test_results_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_favorites" ADD CONSTRAINT "exercise_favorites_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "centros_custo" ADD CONSTRAINT "centros_custo_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contas_financeiras" ADD CONSTRAINT "contas_financeiras_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empresas_parceiras" ADD CONSTRAINT "empresas_parceiras_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formas_pagamento" ADD CONSTRAINT "formas_pagamento_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fornecedores" ADD CONSTRAINT "fornecedores_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfse" ADD CONSTRAINT "nfse_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfse_config" ADD CONSTRAINT "nfse_config_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_usage" ADD CONSTRAINT "package_usage_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_packages" ADD CONSTRAINT "patient_packages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_packages" ADD CONSTRAINT "patient_packages_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_package_templates" ADD CONSTRAINT "session_package_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_vouchers" ADD CONSTRAINT "user_vouchers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_vouchers" ADD CONSTRAINT "user_vouchers_voucher_id_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_checkout_sessions" ADD CONSTRAINT "voucher_checkout_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_checkout_sessions" ADD CONSTRAINT "voucher_checkout_sessions_voucher_id_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievements_log" ADD CONSTRAINT "achievements_log_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_quests" ADD CONSTRAINT "daily_quests_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_gamification" ADD CONSTRAINT "patient_gamification_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_transactions" ADD CONSTRAINT "xp_transactions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_medical_record_id_medical_records_id_fk" FOREIGN KEY ("medical_record_id") REFERENCES "public"."medical_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pathologies" ADD CONSTRAINT "pathologies_medical_record_id_medical_records_id_fk" FOREIGN KEY ("medical_record_id") REFERENCES "public"."medical_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surgeries" ADD CONSTRAINT "surgeries_medical_record_id_medical_records_id_fk" FOREIGN KEY ("medical_record_id") REFERENCES "public"."medical_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_attachments" ADD CONSTRAINT "session_attachments_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_attachments" ADD CONSTRAINT "session_attachments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_exercises" ADD CONSTRAINT "protocol_exercises_protocol_id_exercise_protocols_id_fk" FOREIGN KEY ("protocol_id") REFERENCES "public"."exercise_protocols"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiki_page_versions" ADD CONSTRAINT "wiki_page_versions_page_id_wiki_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."wiki_pages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_acknowledgments" ADD CONSTRAINT "task_acknowledgments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_audit_logs" ADD CONSTRAINT "task_audit_logs_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_columns" ADD CONSTRAINT "task_columns_board_id_task_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."task_boards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_visibility" ADD CONSTRAINT "task_visibility_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_column_id_task_columns_id_fk" FOREIGN KEY ("column_id") REFERENCES "public"."task_columns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_template_items" ADD CONSTRAINT "exercise_template_items_template_id_exercise_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."exercise_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" DROP COLUMN "birth_date";--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "biomechanics_type";--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "biomechanics_data";--> statement-breakpoint
ALTER TABLE "exercise_templates" ADD CONSTRAINT "chk_template_type" CHECK ("exercise_templates"."template_type" IN ('system', 'custom'));--> statement-breakpoint
ALTER TABLE "exercise_templates" ADD CONSTRAINT "chk_patient_profile" CHECK ("exercise_templates"."patient_profile" IS NULL OR "exercise_templates"."patient_profile" IN ('ortopedico', 'esportivo', 'pos_operatorio', 'prevencao', 'idosos'));--> statement-breakpoint
DROP TYPE "public"."biomechanics_type";