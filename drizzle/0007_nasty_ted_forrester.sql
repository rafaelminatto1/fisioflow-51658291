CREATE TABLE "clinical_scribe_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"therapist_id" uuid NOT NULL,
	"section" varchar(1) NOT NULL,
	"raw_text" text,
	"formatted_text" text,
	"tokens_used" integer DEFAULT 0,
	"consent_timestamp" timestamp DEFAULT now() NOT NULL,
	"consent_source" varchar(50) DEFAULT 'verbal_confirmed_by_therapist',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "biomechanics_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"metric_key" varchar(100) NOT NULL,
	"metric_value" numeric(10, 2) NOT NULL,
	"unit" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "biomechanics_metrics" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "clinical_reasoning_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"evolution_id" uuid,
	"rationale" text NOT NULL,
	"suggested_diagnosis" text,
	"evidence_references" jsonb,
	"confidence_score" numeric(5, 2),
	"therapist_feedback" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clinical_reasoning_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "patient_longitudinal_summary" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"cluster_id" text,
	"ai_risk_level" text DEFAULT 'low',
	"predicted_recovery_weeks" integer,
	"confidence_score" numeric(5, 2),
	"adherence_score" numeric(5, 2),
	"last_ai_assessment_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "patient_longitudinal_summary" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "appointments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "blocked_slots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "rooms" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "biomechanics_assessments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "evaluation_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "centros_custo" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "contas_financeiras" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "convenios" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "empresas_parceiras" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "formas_pagamento" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "fornecedores" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "nfse" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "nfse_config" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "package_usage" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pagamentos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "patient_packages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "session_package_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "transacoes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_vouchers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "voucher_checkout_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "vouchers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "achievements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "achievements_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "daily_quests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "patient_gamification" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "xp_transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "medical_records" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "patients" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "session_attachments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "session_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "wiki_dictionary" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "wiki_page_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "wiki_pages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "task_acknowledgments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "task_assignments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "task_audit_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "task_boards" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "task_columns" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "task_visibility" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "exercise_template_categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "exercise_template_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "exercise_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "wa_assignments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "wa_automation_rules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "wa_conversation_tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "wa_conversations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "wa_internal_notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "wa_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "wa_opt_in_out" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "wa_quick_replies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "wa_raw_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "wa_sla_config" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "wa_sla_tracking" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "wa_tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "whatsapp_contacts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "precadastro_tokens" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "precadastros" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "billing_status" varchar(50) DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "invoice_id" uuid;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "primary_professional_id" uuid;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "ai_preferences" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "care_profiles" text[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "sports_practiced" text[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "therapy_focuses" text[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "payer_model" varchar(50);--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "partner_company_name" varchar(150);--> statement-breakpoint
ALTER TABLE "clinical_scribe_logs" ADD CONSTRAINT "clinical_scribe_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_scribe_logs" ADD CONSTRAINT "clinical_scribe_logs_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_scribe_logs" ADD CONSTRAINT "clinical_scribe_logs_therapist_id_profiles_user_id_fk" FOREIGN KEY ("therapist_id") REFERENCES "public"."profiles"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biomechanics_metrics" ADD CONSTRAINT "biomechanics_metrics_assessment_id_biomechanics_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."biomechanics_assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biomechanics_metrics" ADD CONSTRAINT "biomechanics_metrics_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_reasoning_logs" ADD CONSTRAINT "clinical_reasoning_logs_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_reasoning_logs" ADD CONSTRAINT "clinical_reasoning_logs_evolution_id_sessions_id_fk" FOREIGN KEY ("evolution_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_longitudinal_summary" ADD CONSTRAINT "patient_longitudinal_summary_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_bio_metric_key" ON "biomechanics_metrics" USING btree ("metric_key");--> statement-breakpoint
CREATE INDEX "idx_bio_metric_patient" ON "biomechanics_metrics" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_reasoning_patient" ON "clinical_reasoning_logs" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_reasoning_evolution" ON "clinical_reasoning_logs" USING btree ("evolution_id");--> statement-breakpoint
CREATE INDEX "idx_longitudinal_patient" ON "patient_longitudinal_summary" USING btree ("patient_id");--> statement-breakpoint
CREATE POLICY "policy_appointments_isolation" ON "appointments" AS PERMISSIVE FOR ALL TO "authenticated" USING ("appointments"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_blocked_slots_isolation" ON "blocked_slots" AS PERMISSIVE FOR ALL TO "authenticated" USING ("blocked_slots"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_rooms_isolation" ON "rooms" AS PERMISSIVE FOR ALL TO "authenticated" USING ("rooms"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_biomechanics_assessments_isolation" ON "biomechanics_assessments" AS PERMISSIVE FOR ALL TO "authenticated" USING ("biomechanics_assessments"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_evaluation_templates_isolation" ON "evaluation_templates" AS PERMISSIVE FOR ALL TO "authenticated" USING ("evaluation_templates"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_centros_custo_isolation" ON "centros_custo" AS PERMISSIVE FOR ALL TO "authenticated" USING ("centros_custo"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_contas_financeiras_isolation" ON "contas_financeiras" AS PERMISSIVE FOR ALL TO "authenticated" USING ("contas_financeiras"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_convenios_isolation" ON "convenios" AS PERMISSIVE FOR ALL TO "authenticated" USING ("convenios"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_empresas_parceiras_isolation" ON "empresas_parceiras" AS PERMISSIVE FOR ALL TO "authenticated" USING ("empresas_parceiras"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_formas_pagamento_isolation" ON "formas_pagamento" AS PERMISSIVE FOR ALL TO "authenticated" USING ("formas_pagamento"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_fornecedores_isolation" ON "fornecedores" AS PERMISSIVE FOR ALL TO "authenticated" USING ("fornecedores"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_nfse_isolation" ON "nfse" AS PERMISSIVE FOR ALL TO "authenticated" USING ("nfse"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_nfse_config_isolation" ON "nfse_config" AS PERMISSIVE FOR ALL TO "authenticated" USING ("nfse_config"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_package_usage_isolation" ON "package_usage" AS PERMISSIVE FOR ALL TO "authenticated" USING ("package_usage"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_pagamentos_isolation" ON "pagamentos" AS PERMISSIVE FOR ALL TO "authenticated" USING ("pagamentos"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_patient_packages_isolation" ON "patient_packages" AS PERMISSIVE FOR ALL TO "authenticated" USING ("patient_packages"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_session_package_templates_isolation" ON "session_package_templates" AS PERMISSIVE FOR ALL TO "authenticated" USING ("session_package_templates"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_transacoes_isolation" ON "transacoes" AS PERMISSIVE FOR ALL TO "authenticated" USING ("transacoes"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_user_vouchers_isolation" ON "user_vouchers" AS PERMISSIVE FOR ALL TO "authenticated" USING ("user_vouchers"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_voucher_checkout_sessions_isolation" ON "voucher_checkout_sessions" AS PERMISSIVE FOR ALL TO "authenticated" USING ("voucher_checkout_sessions"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_vouchers_isolation" ON "vouchers" AS PERMISSIVE FOR ALL TO "authenticated" USING ("vouchers"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_achievements_isolation" ON "achievements" AS PERMISSIVE FOR ALL TO "authenticated" USING ("achievements"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_achievements_log_isolation" ON "achievements_log" AS PERMISSIVE FOR ALL TO "authenticated" USING ("achievements_log"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_daily_quests_isolation" ON "daily_quests" AS PERMISSIVE FOR ALL TO "authenticated" USING ("daily_quests"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_patient_gamification_isolation" ON "patient_gamification" AS PERMISSIVE FOR ALL TO "authenticated" USING ("patient_gamification"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_xp_transactions_isolation" ON "xp_transactions" AS PERMISSIVE FOR ALL TO "authenticated" USING ("xp_transactions"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_medical_records_isolation" ON "medical_records" AS PERMISSIVE FOR ALL TO "authenticated" USING ("medical_records"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_patients_isolation" ON "patients" AS PERMISSIVE FOR ALL TO "authenticated" USING ("patients"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_session_attachments_isolation" ON "session_attachments" AS PERMISSIVE FOR ALL TO "authenticated" USING ("session_attachments"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_session_templates_isolation" ON "session_templates" AS PERMISSIVE FOR ALL TO "authenticated" USING ("session_templates"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_sessions_isolation" ON "sessions" AS PERMISSIVE FOR ALL TO "authenticated" USING ("sessions"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_wiki_dictionary_hybrid_isolation" ON "wiki_dictionary" AS PERMISSIVE FOR ALL TO "authenticated" USING (("wiki_dictionary"."organization_id" IS NULL) OR ("wiki_dictionary"."organization_id" = (current_setting('app.org_id')::uuid)));--> statement-breakpoint
CREATE POLICY "policy_wiki_page_versions_hybrid_isolation" ON "wiki_page_versions" AS PERMISSIVE FOR ALL TO "authenticated" USING (("wiki_page_versions"."organization_id" IS NULL) OR ("wiki_page_versions"."organization_id" = (current_setting('app.org_id')::uuid)));--> statement-breakpoint
CREATE POLICY "policy_wiki_pages_hybrid_isolation" ON "wiki_pages" AS PERMISSIVE FOR ALL TO "authenticated" USING (("wiki_pages"."organization_id" IS NULL) OR ("wiki_pages"."organization_id" = (current_setting('app.org_id')::uuid)));--> statement-breakpoint
CREATE POLICY "policy_task_acknowledgments_isolation" ON "task_acknowledgments" AS PERMISSIVE FOR ALL TO "authenticated" USING ("task_acknowledgments"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_task_assignments_isolation" ON "task_assignments" AS PERMISSIVE FOR ALL TO "authenticated" USING ("task_assignments"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_task_audit_logs_isolation" ON "task_audit_logs" AS PERMISSIVE FOR ALL TO "authenticated" USING ("task_audit_logs"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_task_boards_isolation" ON "task_boards" AS PERMISSIVE FOR ALL TO "authenticated" USING ("task_boards"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_task_columns_isolation" ON "task_columns" AS PERMISSIVE FOR ALL TO "authenticated" USING ("task_columns"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_task_visibility_isolation" ON "task_visibility" AS PERMISSIVE FOR ALL TO "authenticated" USING ("task_visibility"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_tasks_isolation" ON "tasks" AS PERMISSIVE FOR ALL TO "authenticated" USING ("tasks"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_exercise_template_categories_hybrid_isolation" ON "exercise_template_categories" AS PERMISSIVE FOR ALL TO "authenticated" USING (("exercise_template_categories"."organization_id" IS NULL) OR ("exercise_template_categories"."organization_id" = (current_setting('app.org_id')::uuid)));--> statement-breakpoint
CREATE POLICY "policy_exercise_template_items_isolation" ON "exercise_template_items" AS PERMISSIVE FOR ALL TO "authenticated" USING ("exercise_template_items"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_exercise_templates_hybrid_isolation" ON "exercise_templates" AS PERMISSIVE FOR ALL TO "authenticated" USING (("exercise_templates"."organization_id" IS NULL) OR ("exercise_templates"."organization_id" = (current_setting('app.org_id')::uuid)));--> statement-breakpoint
CREATE POLICY "policy_wa_assignments_isolation" ON "wa_assignments" AS PERMISSIVE FOR ALL TO "authenticated" USING ("wa_assignments"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_wa_automation_rules_isolation" ON "wa_automation_rules" AS PERMISSIVE FOR ALL TO "authenticated" USING ("wa_automation_rules"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_wa_conversation_tags_isolation" ON "wa_conversation_tags" AS PERMISSIVE FOR ALL TO "authenticated" USING ("wa_conversation_tags"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_wa_conversations_isolation" ON "wa_conversations" AS PERMISSIVE FOR ALL TO "authenticated" USING ("wa_conversations"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_wa_internal_notes_isolation" ON "wa_internal_notes" AS PERMISSIVE FOR ALL TO "authenticated" USING ("wa_internal_notes"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_wa_messages_isolation" ON "wa_messages" AS PERMISSIVE FOR ALL TO "authenticated" USING ("wa_messages"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_wa_opt_in_out_isolation" ON "wa_opt_in_out" AS PERMISSIVE FOR ALL TO "authenticated" USING ("wa_opt_in_out"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_wa_quick_replies_isolation" ON "wa_quick_replies" AS PERMISSIVE FOR ALL TO "authenticated" USING ("wa_quick_replies"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_wa_raw_events_isolation" ON "wa_raw_events" AS PERMISSIVE FOR ALL TO "authenticated" USING ("wa_raw_events"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_wa_sla_config_isolation" ON "wa_sla_config" AS PERMISSIVE FOR ALL TO "authenticated" USING ("wa_sla_config"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_wa_sla_tracking_isolation" ON "wa_sla_tracking" AS PERMISSIVE FOR ALL TO "authenticated" USING ("wa_sla_tracking"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_wa_tags_isolation" ON "wa_tags" AS PERMISSIVE FOR ALL TO "authenticated" USING ("wa_tags"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_whatsapp_contacts_isolation" ON "whatsapp_contacts" AS PERMISSIVE FOR ALL TO "authenticated" USING ("whatsapp_contacts"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_precadastro_tokens_isolation" ON "precadastro_tokens" AS PERMISSIVE FOR ALL TO "authenticated" USING ("precadastro_tokens"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_precadastros_public_insert" ON "precadastros" AS PERMISSIVE FOR INSERT TO "anon", "authenticated" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "policy_precadastros_tenant_isolation" ON "precadastros" AS PERMISSIVE FOR ALL TO "authenticated" USING ("precadastros"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_biomechanics_metrics_isolation" ON "biomechanics_metrics" AS PERMISSIVE FOR ALL TO "authenticated" USING ("biomechanics_metrics"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_clinical_reasoning_logs_isolation" ON "clinical_reasoning_logs" AS PERMISSIVE FOR ALL TO "authenticated" USING ("clinical_reasoning_logs"."organization_id" = (current_setting('app.org_id')::uuid));--> statement-breakpoint
CREATE POLICY "policy_patient_longitudinal_summary_isolation" ON "patient_longitudinal_summary" AS PERMISSIVE FOR ALL TO "authenticated" USING ("patient_longitudinal_summary"."organization_id" = (current_setting('app.org_id')::uuid));