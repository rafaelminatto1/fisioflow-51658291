-- Migration: RLS completo para todas as tabelas multi-tenant
-- Data: 2026-04-12
-- Padrao: app.org_id via set_config, WITH CHECK para INSERT/UPDATE
-- Role: app_runtime (NOBYPASSRLS)

-- Fix existing: add WITH CHECK to patients
DROP POLICY IF EXISTS org_isolation_patients ON patients;
CREATE POLICY org_isolation_patients ON patients FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));

-- Fix existing: add WITH CHECK to appointments
DROP POLICY IF EXISTS org_isolation_appointments ON appointments;
CREATE POLICY org_isolation_appointments ON appointments FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));

-- Fix existing: add WITH CHECK to sessions
DROP POLICY IF EXISTS org_isolation_sessions ON sessions;
CREATE POLICY org_isolation_sessions ON sessions FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));

-- Fix existing: add WITH CHECK to standardized_test_results
DROP POLICY IF EXISTS org_isolation_standardized_test_results ON standardized_test_results;
CREATE POLICY org_isolation_standardized_test_results ON standardized_test_results FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));

-- Fix existing: add WITH CHECK to exercise_plans
DROP POLICY IF EXISTS org_isolation_exercise_plans ON exercise_plans;
CREATE POLICY org_isolation_exercise_plans ON exercise_plans FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));

-- Fix existing: standardize exercises to app.org_id with WITH CHECK
DROP POLICY IF EXISTS exercises_org_isolation ON exercises;
CREATE POLICY exercises_org_isolation ON exercises FOR ALL
  USING (organization_id IS NULL OR organization_id = NULLIF(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (organization_id IS NULL OR organization_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

-- Fix existing: standardize exercise_protocols to app.org_id with WITH CHECK
DROP POLICY IF EXISTS exercise_protocols_org_isolation ON exercise_protocols;
CREATE POLICY exercise_protocols_org_isolation ON exercise_protocols FOR ALL
  USING (organization_id IS NULL OR organization_id = NULLIF(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (organization_id IS NULL OR organization_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

-- Fix existing: standardize exercise_templates to app.org_id with WITH CHECK
DROP POLICY IF EXISTS exercise_templates_org_isolation ON exercise_templates;
CREATE POLICY exercise_templates_org_isolation ON exercise_templates FOR ALL
  USING (organization_id IS NULL OR organization_id = NULLIF(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (organization_id IS NULL OR organization_id = NULLIF(current_setting('app.org_id', true), '')::uuid);

-- Fix existing: standardize doctors to app.org_id
DO \$\$ BEGIN IF EXISTS (SELECT 1 FROM pg_policy WHERE polname LIKE '%doctor%') THEN
  DROP POLICY IF EXISTS doctors_org_policy ON doctors;
  DROP POLICY IF EXISTS doctors_org_isolation ON doctors;
END IF; END \$\$;
CREATE POLICY doctors_org_isolation ON doctors FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_achievements ON achievements FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE achievements_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements_log FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_achievements-log ON achievements_log FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE activity_lab_clinic_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_lab_clinic_profiles FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_activity-lab-clinic-profiles ON activity_lab_clinic_profiles FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE activity_lab_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_lab_sessions FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_activity-lab-sessions ON activity_lab_sessions FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_announcement-reads ON announcement_reads FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_announcements ON announcements FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_articles ON articles FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE atestado_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE atestado_templates FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_atestado-templates ON atestado_templates FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_audit-logs ON audit_logs FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_automation-logs ON automation_logs FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE blocked_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_slots FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_blocked-slots ON blocked_slots FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE blocked_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_times FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_blocked-times ON blocked_times FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_boards ON boards FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_business-hours ON business_hours FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE cancellation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancellation_rules FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_cancellation-rules ON cancellation_rules FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE centros_custo ENABLE ROW LEVEL SECURITY;
ALTER TABLE centros_custo FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_centros-custo ON centros_custo FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_checklist-items ON checklist_items FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE clinic_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_inventory FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_clinic-inventory ON clinic_inventory FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE clinic_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_profiles FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_clinic-profiles ON clinic_profiles FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE clinical_test_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_test_templates FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_clinical-test-templates ON clinical_test_templates FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE commission_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_payouts FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_commission-payouts ON commission_payouts FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE communication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_communication-logs ON communication_logs FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE conduct_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE conduct_library FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_conduct-library ON conduct_library FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE contas_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE contas_financeiras FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_contas-financeiras ON contas_financeiras FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE content_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_calendar FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_content-calendar ON content_calendar FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE contratados ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratados FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_contratados ON contratados FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE contrato_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contrato_templates FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_contrato-templates ON contrato_templates FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE convenio_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE convenio_reports FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_convenio-reports ON convenio_reports FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE convenios ENABLE ROW LEVEL SECURITY;
ALTER TABLE convenios FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_convenios ON convenios FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE crm_campanhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_campanhas FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_crm-campanhas ON crm_campanhas FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE crm_tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tarefas FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_crm-tarefas ON crm_tarefas FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE daily_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_quests FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_daily-quests ON daily_quests FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE empresas_parceiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresas_parceiras FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_empresas-parceiras ON empresas_parceiras FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE evaluation_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_forms FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_evaluation-forms ON evaluation_forms FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE evaluation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_templates FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_evaluation-templates ON evaluation_templates FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE evento_contratados ENABLE ROW LEVEL SECURITY;
ALTER TABLE evento_contratados FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_evento-contratados ON evento_contratados FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE evento_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE evento_templates FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_evento-templates ON evento_templates FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_eventos ON eventos FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE evolution_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE evolution_measurements FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_evolution-measurements ON evolution_measurements FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE evolution_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE evolution_templates FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_evolution-templates ON evolution_templates FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE exercise_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_categories FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_exercise-categories ON exercise_categories FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE exercise_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_favorites FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_exercise-favorites ON exercise_favorites FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE exercise_prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_prescriptions FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_exercise-prescriptions ON exercise_prescriptions FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE exercise_template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_template_categories FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_exercise-template-categories ON exercise_template_categories FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE exercise_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_template_items FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_exercise-template-items ON exercise_template_items FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE exercise_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_videos FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_exercise-videos ON exercise_videos FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE feriados ENABLE ROW LEVEL SECURITY;
ALTER TABLE feriados FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_feriados ON feriados FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE fisio_link_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE fisio_link_analytics FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_fisio-link-analytics ON fisio_link_analytics FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE fisio_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE fisio_links FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_fisio-links ON fisio_links FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE force_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE force_sessions FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_force-sessions ON force_sessions FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE formas_pagamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE formas_pagamento FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_formas-pagamento ON formas_pagamento FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedores FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_fornecedores ON fornecedores FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_reports FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_generated-reports ON generated_reports FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE goal_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_profiles FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_goal-profiles ON goal_profiles FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_goals ON goals FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE google_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_integrations FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_google-integrations ON google_integrations FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE identity_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_history FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_identity-history ON identity_history FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_inventory-movements ON inventory_movements FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE jules_learnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE jules_learnings FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_jules-learnings ON jules_learnings FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE jules_pr_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE jules_pr_reviews FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_jules-pr-reviews ON jules_pr_reviews FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE knowledge_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_annotations FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_knowledge-annotations ON knowledge_annotations FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE knowledge_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_articles FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_knowledge-articles ON knowledge_articles FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE knowledge_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_audit FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_knowledge-audit ON knowledge_audit FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE knowledge_curation ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_curation FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_knowledge-curation ON knowledge_curation FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE knowledge_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_notes FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_knowledge-notes ON knowledge_notes FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE lead_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_historico FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_lead-historico ON lead_historico FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_leads ON leads FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE lgpd_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE lgpd_consents FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_lgpd-consents ON lgpd_consents FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE marketing_birthday_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_birthday_configs FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_marketing-birthday-configs ON marketing_birthday_configs FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE marketing_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_consents FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_marketing-consents ON marketing_consents FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE marketing_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_exports FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_marketing-exports ON marketing_exports FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE marketing_recall_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_recall_campaigns FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_marketing-recall-campaigns ON marketing_recall_campaigns FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE marketing_review_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_review_configs FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_marketing-review-configs ON marketing_review_configs FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE medical_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_attachments FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_medical-attachments ON medical_attachments FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE medical_report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_report_templates FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_medical-report-templates ON medical_report_templates FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE medical_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_reports FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_medical-reports ON medical_reports FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE medical_request_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_request_files FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_medical-request-files ON medical_request_files FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE medical_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_requests FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_medical-requests ON medical_requests FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_messages ON messages FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE mfa_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfa_enrollments FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_mfa-enrollments ON mfa_enrollments FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE mfa_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfa_settings FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_mfa-settings ON mfa_settings FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE ml_training_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_training_data FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_ml-training-data ON ml_training_data FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE nfse ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfse FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_nfse ON nfse FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE nfse_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfse_config FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_nfse-config ON nfse_config FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE nfse_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfse_records FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_nfse-records ON nfse_records FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_notification-preferences ON notification_preferences FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_notifications ON notifications FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_organization-members ON organization_members FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE package_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_usage FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_package-usage ON package_usage FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_pagamentos ON pagamentos FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE pain_map_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE pain_map_points FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_pain-map-points ON pain_map_points FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE pain_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE pain_maps FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_pain-maps ON pain_maps FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE participantes FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_participantes ON participantes FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE pathologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE pathologies FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_pathologies ON pathologies FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE pathology_required_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE pathology_required_measurements FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_pathology-required-measurements ON pathology_required_measurements FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE patient_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_documents FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_patient-documents ON patient_documents FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE patient_evaluation_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_evaluation_responses FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_patient-evaluation-responses ON patient_evaluation_responses FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE patient_exam_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_exam_files FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_patient-exam-files ON patient_exam_files FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE patient_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_exams FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_patient-exams ON patient_exams FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE patient_gamification ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_gamification FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_patient-gamification ON patient_gamification FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE patient_goal_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_goal_tracking FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_patient-goal-tracking ON patient_goal_tracking FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE patient_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_goals FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_patient-goals ON patient_goals FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE patient_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_insights FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_patient-insights ON patient_insights FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE patient_lifecycle_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_lifecycle_events FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_patient-lifecycle-events ON patient_lifecycle_events FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE patient_medical_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_medical_returns FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_patient-medical-returns ON patient_medical_returns FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE patient_objective_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_objective_assignments FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_patient-objective-assignments ON patient_objective_assignments FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE patient_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_objectives FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_patient-objectives ON patient_objectives FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE patient_outcome_measures ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_outcome_measures FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_patient-outcome-measures ON patient_outcome_measures FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE patient_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_packages FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_patient-packages ON patient_packages FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE patient_pathologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_pathologies FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_patient-pathologies ON patient_pathologies FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE patient_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_predictions FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_patient-predictions ON patient_predictions FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE patient_self_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_self_assessments FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_patient-self-assessments ON patient_self_assessments FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE patient_session_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_session_metrics FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_patient-session-metrics ON patient_session_metrics FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE patient_surgeries ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_surgeries FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_patient-surgeries ON patient_surgeries FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE physical_examinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE physical_examinations FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_physical-examinations ON physical_examinations FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE precadastro_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE precadastro_tokens FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_precadastro-tokens ON precadastro_tokens FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE precadastros ENABLE ROW LEVEL SECURITY;
ALTER TABLE precadastros FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_precadastros ON precadastros FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE prescribed_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescribed_exercises FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_prescribed-exercises ON prescribed_exercises FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_profiles ON profiles FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_projects ON projects FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE protocol_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocol_exercises FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_protocol-exercises ON protocol_exercises FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE public_booking_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_booking_requests FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_public-booking-requests ON public_booking_requests FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_push-subscriptions ON push_subscriptions FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE recibos ENABLE ROW LEVEL SECURITY;
ALTER TABLE recibos FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_recibos ON recibos FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE recurring_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_series FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_recurring-series ON recurring_series FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_referral-codes ON referral_codes FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE referral_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_redemptions FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_referral-redemptions ON referral_redemptions FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE revenue_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_forecasts FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_revenue-forecasts ON revenue_forecasts FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_rooms ON rooms FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE salas ENABLE ROW LEVEL SECURITY;
ALTER TABLE salas FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_salas ON salas FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE satisfaction_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE satisfaction_surveys FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_satisfaction-surveys ON satisfaction_surveys FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE schedule_capacity ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_capacity FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_schedule-capacity ON schedule_capacity FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE scheduling_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduling_notification_settings FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_scheduling-notification-settings ON scheduling_notification_settings FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_security-events ON security_events FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicos FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_servicos ON servicos FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE session_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_attachments FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_session-attachments ON session_attachments FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE session_package_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_package_templates FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_session-package-templates ON session_package_templates FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE session_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_packages FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_session-packages ON session_packages FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE session_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_templates FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_session-templates ON session_templates FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE staff_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_performance_metrics FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_staff-performance-metrics ON staff_performance_metrics FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE surgeries ENABLE ROW LEVEL SECURITY;
ALTER TABLE surgeries FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_surgeries ON surgeries FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_tarefas ON tarefas FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE task_acknowledgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_acknowledgments FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_task-acknowledgments ON task_acknowledgments FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_task-assignments ON task_assignments FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE task_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_audit_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_task-audit-logs ON task_audit_logs FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE task_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_boards FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_task-boards ON task_boards FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE task_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_columns FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_task-columns ON task_columns FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE task_visibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_visibility FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_task-visibility ON task_visibility FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_tasks ON tasks FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE telemedicine_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemedicine_rooms FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_telemedicine-rooms ON telemedicine_rooms FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE therapist_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapist_commissions FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_therapist-commissions ON therapist_commissions FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_time-entries ON time_entries FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE transacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacoes FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_transacoes ON transacoes FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_plans FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_treatment-plans ON treatment_plans FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE treatment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_sessions FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_treatment-sessions ON treatment_sessions FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invitations FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_user-invitations ON user_invitations FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE user_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_vouchers FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_user-vouchers ON user_vouchers FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE voucher_checkout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE voucher_checkout_sessions FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_voucher-checkout-sessions ON voucher_checkout_sessions FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_vouchers ON vouchers FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE wa_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_assignments FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_wa-assignments ON wa_assignments FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE wa_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_automation_rules FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_wa-automation-rules ON wa_automation_rules FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE wa_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_conversations FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_wa-conversations ON wa_conversations FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE wa_internal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_internal_notes FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_wa-internal-notes ON wa_internal_notes FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE wa_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_messages FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_wa-messages ON wa_messages FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE wa_opt_in_out ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_opt_in_out FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_wa-opt-in-out ON wa_opt_in_out FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE wa_quick_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_quick_replies FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_wa-quick-replies ON wa_quick_replies FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE wa_raw_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_raw_events FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_wa-raw-events ON wa_raw_events FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE wa_sla_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_sla_config FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_wa-sla-config ON wa_sla_config FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE wa_sla_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_sla_tracking FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_wa-sla-tracking ON wa_sla_tracking FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE wa_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_tags FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_wa-tags ON wa_tags FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_waitlist ON waitlist FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE waitlist_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_offers FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_waitlist-offers ON waitlist_offers FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE wearable_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE wearable_data FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_wearable-data ON wearable_data FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE whatsapp_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_contacts FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_whatsapp-contacts ON whatsapp_contacts FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE whatsapp_exercise_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_exercise_queue FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_whatsapp-exercise-queue ON whatsapp_exercise_queue FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_whatsapp-messages ON whatsapp_messages FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE wiki_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_categories FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_wiki-categories ON wiki_categories FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE wiki_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_comments FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_wiki-comments ON wiki_comments FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE wiki_dictionary ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_dictionary FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_wiki-dictionary ON wiki_dictionary FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE wiki_page_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_page_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_wiki-page-versions ON wiki_page_versions FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE wiki_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_pages FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_wiki-pages ON wiki_pages FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_xp-transactions ON xp_transactions FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
