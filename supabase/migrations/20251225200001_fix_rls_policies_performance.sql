-- =====================================================
-- FisioFlow v3.0 - Fix RLS Policies Performance
-- Criado em: 25/12/2025
-- Descrição: Corrige policies com auth.<function>() para usar (select auth.<function>())
--            e remove policies duplicadas
-- =====================================================

-- ========== PARTE 1: REMOVER POLICIES DUPLICADAS ==========

-- patient_goals - remover duplicatas
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON patient_goals;
DROP POLICY IF EXISTS "patient_goals_policy" ON patient_goals;

-- sessions - remover duplicatas
DROP POLICY IF EXISTS "Physiotherapists can manage sessions" ON sessions;
DROP POLICY IF EXISTS "Users can view sessions in their org" ON sessions;

-- ========== PARTE 2: RECRIAR POLICIES COM PERFORMANCE OTIMIZADA ==========

-- Usando (SELECT auth.uid()) ao invés de auth.uid() para evitar re-avaliação por linha

-- == PATIENTS ==
DROP POLICY IF EXISTS "Patients are viewable by authenticated users." ON patients;
DROP POLICY IF EXISTS "Authenticated users can insert patients." ON patients;
DROP POLICY IF EXISTS "Authenticated users can update patients." ON patients;

CREATE POLICY "patients_select_optimized" ON patients
  FOR SELECT USING (
    (SELECT auth.uid()) IS NOT NULL
    AND (org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid())))
  );

CREATE POLICY "patients_insert_optimized" ON patients
  FOR INSERT WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND (org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid())))
  );

CREATE POLICY "patients_update_optimized" ON patients
  FOR UPDATE USING (
    (SELECT auth.uid()) IS NOT NULL
    AND (org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid())))
  );

CREATE POLICY "patients_delete_optimized" ON patients
  FOR DELETE USING (
    (SELECT auth.uid()) IS NOT NULL
    AND (org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid())))
  );

-- == APPOINTMENTS ==
DROP POLICY IF EXISTS "Appointments are viewable by authenticated users." ON appointments;
DROP POLICY IF EXISTS "Authenticated users can insert appointments." ON appointments;
DROP POLICY IF EXISTS "Authenticated users can update appointments." ON appointments;

CREATE POLICY "appointments_select_optimized" ON appointments
  FOR SELECT USING (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "appointments_insert_optimized" ON appointments
  FOR INSERT WITH CHECK (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "appointments_update_optimized" ON appointments
  FOR UPDATE USING (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "appointments_delete_optimized" ON appointments
  FOR DELETE USING (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

-- == KNOWLEDGE_DOCUMENTS ==
DROP POLICY IF EXISTS "Knowledge documents viewable by authenticated users." ON knowledge_documents;
DROP POLICY IF EXISTS "Authenticated users can insert knowledge documents." ON knowledge_documents;
DROP POLICY IF EXISTS "Authenticated users can update knowledge documents." ON knowledge_documents;
DROP POLICY IF EXISTS "Authenticated users can delete knowledge documents." ON knowledge_documents;

CREATE POLICY "knowledge_documents_select_optimized" ON knowledge_documents
  FOR SELECT USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "knowledge_documents_insert_optimized" ON knowledge_documents
  FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "knowledge_documents_update_optimized" ON knowledge_documents
  FOR UPDATE USING (uploaded_by = (SELECT auth.uid()));

CREATE POLICY "knowledge_documents_delete_optimized" ON knowledge_documents
  FOR DELETE USING (uploaded_by = (SELECT auth.uid()));

-- == KNOWLEDGE_SEARCH_HISTORY ==
DROP POLICY IF EXISTS "Users can view their own search history." ON knowledge_search_history;
DROP POLICY IF EXISTS "Users can insert their own search history." ON knowledge_search_history;

CREATE POLICY "knowledge_search_history_select_optimized" ON knowledge_search_history
  FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY "knowledge_search_history_insert_optimized" ON knowledge_search_history
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

-- == ORGANIZATIONS ==
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON organizations;

CREATE POLICY "organizations_select_optimized" ON organizations
  FOR SELECT USING (
    id IN (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

-- == SESSIONS ==
CREATE POLICY "sessions_select_optimized" ON sessions
  FOR SELECT USING (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "sessions_insert_optimized" ON sessions
  FOR INSERT WITH CHECK (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "sessions_update_optimized" ON sessions
  FOR UPDATE USING (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "sessions_delete_optimized" ON sessions
  FOR DELETE USING (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

-- == BODY_PAIN_MAPS ==
DROP POLICY IF EXISTS "Users can view pain maps in their org" ON body_pain_maps;

CREATE POLICY "body_pain_maps_select_optimized" ON body_pain_maps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions s 
      WHERE s.id = session_id 
      AND s.org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
    )
  );

CREATE POLICY "body_pain_maps_insert_optimized" ON body_pain_maps
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions s 
      WHERE s.id = session_id 
      AND s.org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
    )
  );

CREATE POLICY "body_pain_maps_update_optimized" ON body_pain_maps
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM sessions s 
      WHERE s.id = session_id 
      AND s.org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
    )
  );

CREATE POLICY "body_pain_maps_delete_optimized" ON body_pain_maps
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM sessions s 
      WHERE s.id = session_id 
      AND s.org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
    )
  );

-- == WAITLIST ==
DROP POLICY IF EXISTS "Users can view waitlist in their org" ON waitlist;

CREATE POLICY "waitlist_select_optimized" ON waitlist
  FOR SELECT USING (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "waitlist_insert_optimized" ON waitlist
  FOR INSERT WITH CHECK (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "waitlist_update_optimized" ON waitlist
  FOR UPDATE USING (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "waitlist_delete_optimized" ON waitlist
  FOR DELETE USING (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

-- == NOTIFICATIONS ==
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;

CREATE POLICY "notifications_select_optimized" ON notifications
  FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY "notifications_update_optimized" ON notifications
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

-- == WAITING_LIST ==
DROP POLICY IF EXISTS "Users can view waiting list in their organization" ON waiting_list;
DROP POLICY IF EXISTS "Users can insert waiting list in their organization" ON waiting_list;
DROP POLICY IF EXISTS "Users can update waiting list in their organization" ON waiting_list;
DROP POLICY IF EXISTS "Users can delete waiting list in their organization" ON waiting_list;

CREATE POLICY "waiting_list_select_optimized" ON waiting_list
  FOR SELECT USING (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "waiting_list_insert_optimized" ON waiting_list
  FOR INSERT WITH CHECK (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "waiting_list_update_optimized" ON waiting_list
  FOR UPDATE USING (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "waiting_list_delete_optimized" ON waiting_list
  FOR DELETE USING (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

-- == ASSESSMENT_TEST_CONFIGS ==
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON assessment_test_configs;

CREATE POLICY "assessment_test_configs_select_optimized" ON assessment_test_configs
  FOR SELECT USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "assessment_test_configs_insert_optimized" ON assessment_test_configs
  FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "assessment_test_configs_update_optimized" ON assessment_test_configs
  FOR UPDATE USING ((SELECT auth.uid()) IS NOT NULL);

-- == AUDIT_LOGS ==
DROP POLICY IF EXISTS "audit_logs_policy" ON audit_logs;

CREATE POLICY "audit_logs_select_optimized" ON audit_logs
  FOR SELECT USING (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "audit_logs_insert_optimized" ON audit_logs
  FOR INSERT WITH CHECK (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

-- == BACKUPS ==
DROP POLICY IF EXISTS "backups_policy" ON backups;

CREATE POLICY "backups_select_optimized" ON backups
  FOR SELECT USING (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "backups_insert_optimized" ON backups
  FOR INSERT WITH CHECK (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

-- == LEADS ==
DROP POLICY IF EXISTS "leads_policy" ON leads;

CREATE POLICY "leads_select_optimized" ON leads
  FOR SELECT USING (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "leads_insert_optimized" ON leads
  FOR INSERT WITH CHECK (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "leads_update_optimized" ON leads
  FOR UPDATE USING (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "leads_delete_optimized" ON leads
  FOR DELETE USING (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

-- == LANDING_PAGES ==
DROP POLICY IF EXISTS "landing_pages_policy" ON landing_pages;

CREATE POLICY "landing_pages_select_optimized" ON landing_pages
  FOR SELECT USING (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
    OR is_active = true  -- Páginas públicas ativas
  );

CREATE POLICY "landing_pages_insert_optimized" ON landing_pages
  FOR INSERT WITH CHECK (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "landing_pages_update_optimized" ON landing_pages
  FOR UPDATE USING (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "landing_pages_delete_optimized" ON landing_pages
  FOR DELETE USING (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

-- == MARKETING_CAMPAIGNS ==
DROP POLICY IF EXISTS "marketing_campaigns_policy" ON marketing_campaigns;

CREATE POLICY "marketing_campaigns_select_optimized" ON marketing_campaigns
  FOR SELECT USING (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "marketing_campaigns_insert_optimized" ON marketing_campaigns
  FOR INSERT WITH CHECK (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "marketing_campaigns_update_optimized" ON marketing_campaigns
  FOR UPDATE USING (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "marketing_campaigns_delete_optimized" ON marketing_campaigns
  FOR DELETE USING (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

-- == PATIENT_GOALS ==
CREATE POLICY "patient_goals_select_optimized" ON patient_goals
  FOR SELECT USING (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "patient_goals_insert_optimized" ON patient_goals
  FOR INSERT WITH CHECK (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "patient_goals_update_optimized" ON patient_goals
  FOR UPDATE USING (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "patient_goals_delete_optimized" ON patient_goals
  FOR DELETE USING (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

-- == ANALYTICS_EVENTS ==
DROP POLICY IF EXISTS "analytics_events_policy" ON analytics_events;

CREATE POLICY "analytics_events_select_optimized" ON analytics_events
  FOR SELECT USING (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "analytics_events_insert_optimized" ON analytics_events
  FOR INSERT WITH CHECK (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
    OR (SELECT auth.uid()) IS NOT NULL  -- Permite eventos mesmo sem org
  );

-- == SESSION_TEMPLATES ==
DROP POLICY IF EXISTS "session_templates_policy" ON session_templates;

CREATE POLICY "session_templates_select_optimized" ON session_templates
  FOR SELECT USING (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
    OR is_public = true
  );

CREATE POLICY "session_templates_insert_optimized" ON session_templates
  FOR INSERT WITH CHECK (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "session_templates_update_optimized" ON session_templates
  FOR UPDATE USING (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "session_templates_delete_optimized" ON session_templates
  FOR DELETE USING (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

-- == TREATMENT_PROCEDURES ==
DROP POLICY IF EXISTS "treatment_procedures_policy" ON treatment_procedures;

CREATE POLICY "treatment_procedures_select_optimized" ON treatment_procedures
  FOR SELECT USING (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
    OR org_id IS NULL  -- Procedimentos globais
  );

CREATE POLICY "treatment_procedures_insert_optimized" ON treatment_procedures
  FOR INSERT WITH CHECK (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "treatment_procedures_update_optimized" ON treatment_procedures
  FOR UPDATE USING (
    org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

-- == SURGERIES ==
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON surgeries;

CREATE POLICY "surgeries_select_optimized" ON surgeries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patients p 
      WHERE p.id = patient_id 
      AND p.org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
    )
  );

CREATE POLICY "surgeries_insert_optimized" ON surgeries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients p 
      WHERE p.id = patient_id 
      AND p.org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
    )
  );

CREATE POLICY "surgeries_update_optimized" ON surgeries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM patients p 
      WHERE p.id = patient_id 
      AND p.org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
    )
  );

CREATE POLICY "surgeries_delete_optimized" ON surgeries
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM patients p 
      WHERE p.id = patient_id 
      AND p.org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
    )
  );

-- == PATHOLOGIES ==
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON pathologies;

CREATE POLICY "pathologies_select_optimized" ON pathologies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patients p 
      WHERE p.id = patient_id 
      AND p.org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
    )
  );

CREATE POLICY "pathologies_insert_optimized" ON pathologies
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients p 
      WHERE p.id = patient_id 
      AND p.org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
    )
  );

CREATE POLICY "pathologies_update_optimized" ON pathologies
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM patients p 
      WHERE p.id = patient_id 
      AND p.org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
    )
  );

CREATE POLICY "pathologies_delete_optimized" ON pathologies
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM patients p 
      WHERE p.id = patient_id 
      AND p.org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
    )
  );

-- == TEST_RESULTS ==
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON test_results;

CREATE POLICY "test_results_select_optimized" ON test_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patients p 
      WHERE p.id = patient_id 
      AND p.org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
    )
  );

CREATE POLICY "test_results_insert_optimized" ON test_results
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients p 
      WHERE p.id = patient_id 
      AND p.org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
    )
  );

CREATE POLICY "test_results_update_optimized" ON test_results
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM patients p 
      WHERE p.id = patient_id 
      AND p.org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
    )
  );

-- == CONDUCT_TEMPLATES ==
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON conduct_templates;

CREATE POLICY "conduct_templates_select_optimized" ON conduct_templates
  FOR SELECT USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "conduct_templates_insert_optimized" ON conduct_templates
  FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "conduct_templates_update_optimized" ON conduct_templates
  FOR UPDATE USING (
    created_by = (SELECT auth.uid()) 
    OR created_by IS NULL
  );

-- == PROFILES ==
-- Adicionar policy otimizada para profiles
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;

CREATE POLICY "profiles_select_optimized" ON profiles
  FOR SELECT USING (
    id = (SELECT auth.uid())
    OR org_id = (SELECT org_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

CREATE POLICY "profiles_update_optimized" ON profiles
  FOR UPDATE USING (id = (SELECT auth.uid()));

-- ========== PARTE 3: COMENTÁRIOS ==========

COMMENT ON POLICY "patients_select_optimized" ON patients IS 
  'Otimizado: usa (SELECT auth.uid()) para evitar re-avaliação por linha';

COMMENT ON POLICY "appointments_select_optimized" ON appointments IS 
  'Otimizado: usa subselect para performance';



