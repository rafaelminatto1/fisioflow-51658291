-- =====================================================
-- FisioFlow v3.0 - Correção Final de RLS e Índices
-- Criado em: 25/12/2025
-- Descrição: Corrige todos os problemas restantes identificados pelo advisor
-- =====================================================

-- ========== PARTE 1: ÍNDICES PARA FOREIGN KEYS FALTANTES ==========

CREATE INDEX IF NOT EXISTS idx_exercise_categories_organization_id ON public.exercise_categories (organization_id);
CREATE INDEX IF NOT EXISTS idx_exercises_created_by ON public.exercises (created_by);
CREATE INDEX IF NOT EXISTS idx_message_templates_created_by ON public.message_templates (created_by);
CREATE INDEX IF NOT EXISTS idx_message_templates_organization_id ON public.message_templates (organization_id);
CREATE INDEX IF NOT EXISTS idx_package_usage_appointment_id ON public.package_usage (appointment_id);
CREATE INDEX IF NOT EXISTS idx_package_usage_organization_id ON public.package_usage (organization_id);
CREATE INDEX IF NOT EXISTS idx_package_usage_patient_id ON public.package_usage (patient_id);
CREATE INDEX IF NOT EXISTS idx_package_usage_session_id ON public.package_usage (session_id);
CREATE INDEX IF NOT EXISTS idx_package_usage_used_by ON public.package_usage (used_by);
CREATE INDEX IF NOT EXISTS idx_pain_maps_created_by ON public.pain_maps (created_by);
CREATE INDEX IF NOT EXISTS idx_patient_packages_created_by ON public.patient_packages (created_by);
CREATE INDEX IF NOT EXISTS idx_patient_packages_organization_id ON public.patient_packages (organization_id);
CREATE INDEX IF NOT EXISTS idx_patient_packages_package_id ON public.patient_packages (package_id);
CREATE INDEX IF NOT EXISTS idx_payments_appointment_id ON public.payments (appointment_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_by ON public.payments (created_by);
CREATE INDEX IF NOT EXISTS idx_prescription_items_exercise_id ON public.prescription_items (exercise_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_therapist_id ON public.prescriptions (therapist_id);
CREATE INDEX IF NOT EXISTS idx_session_packages_created_by ON public.session_packages (created_by);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_sent_by ON public.whatsapp_messages (sent_by);

-- ========== PARTE 2: CORRIGIR RLS POLICIES (auth.uid() -> (SELECT auth.uid())) ==========

-- == PATIENTS ==
DROP POLICY IF EXISTS "Patients are viewable by authenticated users." ON public.patients;
DROP POLICY IF EXISTS "Authenticated users can insert patients." ON public.patients;
DROP POLICY IF EXISTS "Authenticated users can update patients." ON public.patients;
DROP POLICY IF EXISTS "patients_select_optimized" ON public.patients;
DROP POLICY IF EXISTS "patients_insert_optimized" ON public.patients;
DROP POLICY IF EXISTS "patients_update_optimized" ON public.patients;
DROP POLICY IF EXISTS "patients_delete_optimized" ON public.patients;

CREATE POLICY "patients_org_select" ON public.patients
  FOR SELECT TO authenticated USING (
    org_id = (SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "patients_org_insert" ON public.patients
  FOR INSERT TO authenticated WITH CHECK (
    org_id = (SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "patients_org_update" ON public.patients
  FOR UPDATE TO authenticated USING (
    org_id = (SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "patients_org_delete" ON public.patients
  FOR DELETE TO authenticated USING (
    org_id = (SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

-- == APPOINTMENTS ==
DROP POLICY IF EXISTS "Appointments are viewable by authenticated users." ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can insert appointments." ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can update appointments." ON public.appointments;
DROP POLICY IF EXISTS "appointments_select_optimized" ON public.appointments;
DROP POLICY IF EXISTS "appointments_insert_optimized" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update_optimized" ON public.appointments;
DROP POLICY IF EXISTS "appointments_delete_optimized" ON public.appointments;

CREATE POLICY "appointments_org_select" ON public.appointments
  FOR SELECT TO authenticated USING (
    org_id = (SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "appointments_org_insert" ON public.appointments
  FOR INSERT TO authenticated WITH CHECK (
    org_id = (SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "appointments_org_update" ON public.appointments
  FOR UPDATE TO authenticated USING (
    org_id = (SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "appointments_org_delete" ON public.appointments
  FOR DELETE TO authenticated USING (
    org_id = (SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

-- == KNOWLEDGE_DOCUMENTS ==
DROP POLICY IF EXISTS "Knowledge documents viewable by authenticated users." ON public.knowledge_documents;
DROP POLICY IF EXISTS "Authenticated users can insert knowledge documents." ON public.knowledge_documents;
DROP POLICY IF EXISTS "Authenticated users can update knowledge documents." ON public.knowledge_documents;
DROP POLICY IF EXISTS "Authenticated users can delete knowledge documents." ON public.knowledge_documents;
DROP POLICY IF EXISTS "knowledge_documents_select_optimized" ON public.knowledge_documents;
DROP POLICY IF EXISTS "knowledge_documents_insert_optimized" ON public.knowledge_documents;
DROP POLICY IF EXISTS "knowledge_documents_update_optimized" ON public.knowledge_documents;
DROP POLICY IF EXISTS "knowledge_documents_delete_optimized" ON public.knowledge_documents;

CREATE POLICY "knowledge_documents_auth_select" ON public.knowledge_documents
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "knowledge_documents_auth_insert" ON public.knowledge_documents
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "knowledge_documents_owner_update" ON public.knowledge_documents
  FOR UPDATE TO authenticated USING (uploaded_by = (SELECT auth.uid()));

CREATE POLICY "knowledge_documents_owner_delete" ON public.knowledge_documents
  FOR DELETE TO authenticated USING (uploaded_by = (SELECT auth.uid()));

-- == KNOWLEDGE_SEARCH_HISTORY ==
DROP POLICY IF EXISTS "Users can view their own search history." ON public.knowledge_search_history;
DROP POLICY IF EXISTS "Users can insert their own search history." ON public.knowledge_search_history;
DROP POLICY IF EXISTS "knowledge_search_history_select_optimized" ON public.knowledge_search_history;
DROP POLICY IF EXISTS "knowledge_search_history_insert_optimized" ON public.knowledge_search_history;

CREATE POLICY "ksh_user_select" ON public.knowledge_search_history
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

CREATE POLICY "ksh_user_insert" ON public.knowledge_search_history
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));

-- == ORGANIZATIONS ==
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON public.organizations;
DROP POLICY IF EXISTS "organizations_select_optimized" ON public.organizations;

CREATE POLICY "organizations_member_select" ON public.organizations
  FOR SELECT TO authenticated USING (
    id IN (SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

-- == SESSIONS ==
DROP POLICY IF EXISTS "Physiotherapists can manage sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can view sessions in their org" ON public.sessions;
DROP POLICY IF EXISTS "sessions_select_optimized" ON public.sessions;
DROP POLICY IF EXISTS "sessions_insert_optimized" ON public.sessions;
DROP POLICY IF EXISTS "sessions_update_optimized" ON public.sessions;
DROP POLICY IF EXISTS "sessions_delete_optimized" ON public.sessions;

CREATE POLICY "sessions_org_select" ON public.sessions
  FOR SELECT TO authenticated USING (
    org_id = (SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "sessions_org_insert" ON public.sessions
  FOR INSERT TO authenticated WITH CHECK (
    org_id = (SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "sessions_org_update" ON public.sessions
  FOR UPDATE TO authenticated USING (
    org_id = (SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "sessions_org_delete" ON public.sessions
  FOR DELETE TO authenticated USING (
    org_id = (SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

-- == BODY_PAIN_MAPS ==
DROP POLICY IF EXISTS "Users can view pain maps in their org" ON public.body_pain_maps;
DROP POLICY IF EXISTS "body_pain_maps_select_optimized" ON public.body_pain_maps;
DROP POLICY IF EXISTS "body_pain_maps_insert_optimized" ON public.body_pain_maps;
DROP POLICY IF EXISTS "body_pain_maps_update_optimized" ON public.body_pain_maps;
DROP POLICY IF EXISTS "body_pain_maps_delete_optimized" ON public.body_pain_maps;

CREATE POLICY "body_pain_maps_org_all" ON public.body_pain_maps
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.sessions s 
      WHERE s.id = session_id 
      AND s.org_id = (SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid()))
    )
  );

-- == WAITLIST ==
DROP POLICY IF EXISTS "Users can view waitlist in their org" ON public.waitlist;
DROP POLICY IF EXISTS "waitlist_select_optimized" ON public.waitlist;
DROP POLICY IF EXISTS "waitlist_insert_optimized" ON public.waitlist;
DROP POLICY IF EXISTS "waitlist_update_optimized" ON public.waitlist;
DROP POLICY IF EXISTS "waitlist_delete_optimized" ON public.waitlist;

CREATE POLICY "waitlist_org_all" ON public.waitlist
  FOR ALL TO authenticated USING (
    org_id = (SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

-- == NOTIFICATIONS ==
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select_optimized" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_optimized" ON public.notifications;

CREATE POLICY "notifications_user_all" ON public.notifications
  FOR ALL TO authenticated USING (user_id = (SELECT auth.uid()));

-- == WAITING_LIST ==
DROP POLICY IF EXISTS "Users can view waiting list in their organization" ON public.waiting_list;
DROP POLICY IF EXISTS "Users can insert waiting list in their organization" ON public.waiting_list;
DROP POLICY IF EXISTS "Users can update waiting list in their organization" ON public.waiting_list;
DROP POLICY IF EXISTS "Users can delete waiting list in their organization" ON public.waiting_list;
DROP POLICY IF EXISTS "waiting_list_select_optimized" ON public.waiting_list;
DROP POLICY IF EXISTS "waiting_list_insert_optimized" ON public.waiting_list;
DROP POLICY IF EXISTS "waiting_list_update_optimized" ON public.waiting_list;
DROP POLICY IF EXISTS "waiting_list_delete_optimized" ON public.waiting_list;

CREATE POLICY "waiting_list_org_all" ON public.waiting_list
  FOR ALL TO authenticated USING (
    org_id = (SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

-- == ASSESSMENT_TEST_CONFIGS ==
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.assessment_test_configs;
DROP POLICY IF EXISTS "assessment_test_configs_select_optimized" ON public.assessment_test_configs;
DROP POLICY IF EXISTS "assessment_test_configs_insert_optimized" ON public.assessment_test_configs;
DROP POLICY IF EXISTS "assessment_test_configs_update_optimized" ON public.assessment_test_configs;

CREATE POLICY "assessment_test_configs_auth_all" ON public.assessment_test_configs
  FOR ALL TO authenticated USING (true);

-- == AUDIT_LOGS ==
DROP POLICY IF EXISTS "audit_logs_policy" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_select_optimized" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_optimized" ON public.audit_logs;

CREATE POLICY "audit_logs_org_select" ON public.audit_logs
  FOR SELECT TO authenticated USING (
    org_id = (SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "audit_logs_org_insert" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (
    org_id = (SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

-- == BACKUPS ==
DROP POLICY IF EXISTS "backups_policy" ON public.backups;
DROP POLICY IF EXISTS "backups_select_optimized" ON public.backups;
DROP POLICY IF EXISTS "backups_insert_optimized" ON public.backups;

CREATE POLICY "backups_org_all" ON public.backups
  FOR ALL TO authenticated USING (
    org_id = (SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

-- == LEADS ==
DROP POLICY IF EXISTS "leads_policy" ON public.leads;
DROP POLICY IF EXISTS "leads_select_optimized" ON public.leads;
DROP POLICY IF EXISTS "leads_insert_optimized" ON public.leads;
DROP POLICY IF EXISTS "leads_update_optimized" ON public.leads;
DROP POLICY IF EXISTS "leads_delete_optimized" ON public.leads;

CREATE POLICY "leads_org_all" ON public.leads
  FOR ALL TO authenticated USING (
    org_id = (SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

-- == LANDING_PAGES ==
DROP POLICY IF EXISTS "landing_pages_policy" ON public.landing_pages;
DROP POLICY IF EXISTS "landing_pages_select_optimized" ON public.landing_pages;
DROP POLICY IF EXISTS "landing_pages_insert_optimized" ON public.landing_pages;
DROP POLICY IF EXISTS "landing_pages_update_optimized" ON public.landing_pages;
DROP POLICY IF EXISTS "landing_pages_delete_optimized" ON public.landing_pages;

CREATE POLICY "landing_pages_org_select" ON public.landing_pages
  FOR SELECT TO authenticated USING (
    org_id = (SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid()))
    OR is_active = true
  );

CREATE POLICY "landing_pages_org_modify" ON public.landing_pages
  FOR ALL TO authenticated USING (
    org_id = (SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

-- == MARKETING_CAMPAIGNS ==
DROP POLICY IF EXISTS "marketing_campaigns_policy" ON public.marketing_campaigns;
DROP POLICY IF EXISTS "marketing_campaigns_select_optimized" ON public.marketing_campaigns;
DROP POLICY IF EXISTS "marketing_campaigns_insert_optimized" ON public.marketing_campaigns;
DROP POLICY IF EXISTS "marketing_campaigns_update_optimized" ON public.marketing_campaigns;
DROP POLICY IF EXISTS "marketing_campaigns_delete_optimized" ON public.marketing_campaigns;

CREATE POLICY "marketing_campaigns_org_all" ON public.marketing_campaigns
  FOR ALL TO authenticated USING (
    org_id = (SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

-- == PATIENT_GOALS (múltiplas policies duplicadas) ==
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.patient_goals;
DROP POLICY IF EXISTS "patient_goals_policy" ON public.patient_goals;
DROP POLICY IF EXISTS "patient_goals_select_optimized" ON public.patient_goals;
DROP POLICY IF EXISTS "patient_goals_insert_optimized" ON public.patient_goals;
DROP POLICY IF EXISTS "patient_goals_update_optimized" ON public.patient_goals;
DROP POLICY IF EXISTS "patient_goals_delete_optimized" ON public.patient_goals;

CREATE POLICY "patient_goals_org_all" ON public.patient_goals
  FOR ALL TO authenticated USING (
    org_id = (SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

-- == ANALYTICS_EVENTS ==
DROP POLICY IF EXISTS "analytics_events_policy" ON public.analytics_events;
DROP POLICY IF EXISTS "analytics_events_select_optimized" ON public.analytics_events;
DROP POLICY IF EXISTS "analytics_events_insert_optimized" ON public.analytics_events;

CREATE POLICY "analytics_events_org_select" ON public.analytics_events
  FOR SELECT TO authenticated USING (
    org_id = (SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "analytics_events_auth_insert" ON public.analytics_events
  FOR INSERT TO authenticated WITH CHECK (true);

-- == SESSION_TEMPLATES ==
DROP POLICY IF EXISTS "session_templates_policy" ON public.session_templates;
DROP POLICY IF EXISTS "session_templates_select_optimized" ON public.session_templates;
DROP POLICY IF EXISTS "session_templates_insert_optimized" ON public.session_templates;
DROP POLICY IF EXISTS "session_templates_update_optimized" ON public.session_templates;
DROP POLICY IF EXISTS "session_templates_delete_optimized" ON public.session_templates;

CREATE POLICY "session_templates_select" ON public.session_templates
  FOR SELECT TO authenticated USING (
    org_id = (SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid()))
    OR is_public = true
  );

CREATE POLICY "session_templates_modify" ON public.session_templates
  FOR ALL TO authenticated USING (
    org_id = (SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

-- == TREATMENT_PROCEDURES ==
DROP POLICY IF EXISTS "treatment_procedures_policy" ON public.treatment_procedures;
DROP POLICY IF EXISTS "treatment_procedures_select_optimized" ON public.treatment_procedures;
DROP POLICY IF EXISTS "treatment_procedures_insert_optimized" ON public.treatment_procedures;
DROP POLICY IF EXISTS "treatment_procedures_update_optimized" ON public.treatment_procedures;

CREATE POLICY "treatment_procedures_select" ON public.treatment_procedures
  FOR SELECT TO authenticated USING (
    org_id = (SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid()))
    OR org_id IS NULL
  );

CREATE POLICY "treatment_procedures_modify" ON public.treatment_procedures
  FOR ALL TO authenticated USING (
    org_id = (SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

-- == SURGERIES ==
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.surgeries;
DROP POLICY IF EXISTS "surgeries_select_optimized" ON public.surgeries;
DROP POLICY IF EXISTS "surgeries_insert_optimized" ON public.surgeries;
DROP POLICY IF EXISTS "surgeries_update_optimized" ON public.surgeries;
DROP POLICY IF EXISTS "surgeries_delete_optimized" ON public.surgeries;

CREATE POLICY "surgeries_patient_org_all" ON public.surgeries
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.patients p 
      WHERE p.id = patient_id 
      AND p.org_id = (SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid()))
    )
  );

-- == PATHOLOGIES ==
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.pathologies;
DROP POLICY IF EXISTS "pathologies_select_optimized" ON public.pathologies;
DROP POLICY IF EXISTS "pathologies_insert_optimized" ON public.pathologies;
DROP POLICY IF EXISTS "pathologies_update_optimized" ON public.pathologies;
DROP POLICY IF EXISTS "pathologies_delete_optimized" ON public.pathologies;

CREATE POLICY "pathologies_patient_org_all" ON public.pathologies
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.patients p 
      WHERE p.id = patient_id 
      AND p.org_id = (SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid()))
    )
  );

-- == TEST_RESULTS ==
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.test_results;
DROP POLICY IF EXISTS "test_results_select_optimized" ON public.test_results;
DROP POLICY IF EXISTS "test_results_insert_optimized" ON public.test_results;
DROP POLICY IF EXISTS "test_results_update_optimized" ON public.test_results;

CREATE POLICY "test_results_patient_org_all" ON public.test_results
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.patients p 
      WHERE p.id = patient_id 
      AND p.org_id = (SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid()))
    )
  );

-- == CONDUCT_TEMPLATES ==
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.conduct_templates;
DROP POLICY IF EXISTS "conduct_templates_select_optimized" ON public.conduct_templates;
DROP POLICY IF EXISTS "conduct_templates_insert_optimized" ON public.conduct_templates;
DROP POLICY IF EXISTS "conduct_templates_update_optimized" ON public.conduct_templates;

CREATE POLICY "conduct_templates_auth_all" ON public.conduct_templates
  FOR ALL TO authenticated USING (true);

-- ========== PARTE 3: CORRIGIR VIEWS SECURITY DEFINER ==========

-- Recriar views sem SECURITY DEFINER (usando as colunas corretas)
DROP VIEW IF EXISTS public.patient_package_summary;
DROP VIEW IF EXISTS public.today_appointments_with_packages;

CREATE VIEW public.patient_package_summary AS
SELECT 
  pp.id,
  pp.patient_id,
  pp.package_id,
  pp.sessions_purchased,
  pp.sessions_used,
  pp.sessions_purchased - pp.sessions_used AS sessions_remaining,
  pp.expires_at,
  pp.organization_id,
  sp.name AS package_name,
  sp.price AS package_price,
  p.name AS patient_name
FROM public.patient_packages pp
JOIN public.session_packages sp ON pp.package_id = sp.id
JOIN public.patients p ON pp.patient_id = p.id;

CREATE VIEW public.today_appointments_with_packages AS
SELECT 
  a.id,
  a.patient_id,
  a.appointment_date,
  a.start_time,
  a.end_time,
  a.status,
  a.org_id,
  p.name AS patient_name,
  COALESCE(
    (SELECT pp.id 
     FROM public.patient_packages pp 
     WHERE pp.patient_id = a.patient_id 
     AND pp.sessions_used < pp.sessions_purchased
     AND (pp.expires_at IS NULL OR pp.expires_at > NOW())
     LIMIT 1
    ), NULL
  ) AS active_package_id
FROM public.appointments a
JOIN public.patients p ON a.patient_id = p.id
WHERE a.appointment_date = CURRENT_DATE;

-- ========== FIM ==========


