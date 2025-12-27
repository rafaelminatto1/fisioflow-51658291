-- =====================================================
-- FisioFlow v3.0 - Correção Final de RLS e Índices
-- Criado em: 25/12/2025
-- Descrição: Corrige todos os problemas restantes identificados pelo advisor
-- 
-- Melhorias implementadas:
-- 1. Todas as políticas são condicionais (verificam existência de tabelas/colunas)
-- 2. Uso de (SELECT auth.uid()) para melhor performance em RLS policies
-- 3. Índices adicionais para otimizar queries de RLS
-- 4. Verificações de tabelas relacionadas em políticas com JOINs
-- 5. Views condicionais com verificação de colunas
-- =====================================================

-- ========== PARTE 1: ÍNDICES PARA FOREIGN KEYS FALTANTES ==========

-- Índices condicionais - apenas criar se as tabelas e colunas existirem
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'exercise_categories') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'exercise_categories' AND column_name = 'organization_id') THEN
      CREATE INDEX IF NOT EXISTS idx_exercise_categories_organization_id ON public.exercise_categories (organization_id);
    END IF;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'exercises') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'exercises' AND column_name = 'created_by') THEN
      CREATE INDEX IF NOT EXISTS idx_exercises_created_by ON public.exercises (created_by);
    END IF;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'message_templates') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'message_templates' AND column_name = 'created_by') THEN
      CREATE INDEX IF NOT EXISTS idx_message_templates_created_by ON public.message_templates (created_by);
    END IF;
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'message_templates' AND column_name = 'organization_id') THEN
      CREATE INDEX IF NOT EXISTS idx_message_templates_organization_id ON public.message_templates (organization_id);
    END IF;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'package_usage') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'package_usage' AND column_name = 'appointment_id') THEN
      CREATE INDEX IF NOT EXISTS idx_package_usage_appointment_id ON public.package_usage (appointment_id);
    END IF;
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'package_usage' AND column_name = 'organization_id') THEN
      CREATE INDEX IF NOT EXISTS idx_package_usage_organization_id ON public.package_usage (organization_id);
    END IF;
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'package_usage' AND column_name = 'patient_id') THEN
      CREATE INDEX IF NOT EXISTS idx_package_usage_patient_id ON public.package_usage (patient_id);
    END IF;
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'package_usage' AND column_name = 'session_id') THEN
      CREATE INDEX IF NOT EXISTS idx_package_usage_session_id ON public.package_usage (session_id);
    END IF;
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'package_usage' AND column_name = 'used_by') THEN
      CREATE INDEX IF NOT EXISTS idx_package_usage_used_by ON public.package_usage (used_by);
    END IF;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'pain_maps') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'pain_maps' AND column_name = 'created_by') THEN
      CREATE INDEX IF NOT EXISTS idx_pain_maps_created_by ON public.pain_maps (created_by);
    END IF;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'patient_packages') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'patient_packages' AND column_name = 'created_by') THEN
      CREATE INDEX IF NOT EXISTS idx_patient_packages_created_by ON public.patient_packages (created_by);
    END IF;
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'patient_packages' AND column_name = 'organization_id') THEN
      CREATE INDEX IF NOT EXISTS idx_patient_packages_organization_id ON public.patient_packages (organization_id);
    END IF;
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'patient_packages' AND column_name = 'package_id') THEN
      CREATE INDEX IF NOT EXISTS idx_patient_packages_package_id ON public.patient_packages (package_id);
    END IF;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payments') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'appointment_id') THEN
      CREATE INDEX IF NOT EXISTS idx_payments_appointment_id ON public.payments (appointment_id);
    END IF;
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'created_by') THEN
      CREATE INDEX IF NOT EXISTS idx_payments_created_by ON public.payments (created_by);
    END IF;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'prescription_items') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'prescription_items' AND column_name = 'exercise_id') THEN
      CREATE INDEX IF NOT EXISTS idx_prescription_items_exercise_id ON public.prescription_items (exercise_id);
    END IF;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'prescriptions') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'prescriptions' AND column_name = 'therapist_id') THEN
      CREATE INDEX IF NOT EXISTS idx_prescriptions_therapist_id ON public.prescriptions (therapist_id);
    END IF;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'session_packages') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'session_packages' AND column_name = 'created_by') THEN
      CREATE INDEX IF NOT EXISTS idx_session_packages_created_by ON public.session_packages (created_by);
    END IF;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'whatsapp_messages') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'whatsapp_messages' AND column_name = 'sent_by') THEN
      CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_sent_by ON public.whatsapp_messages (sent_by);
    END IF;
  END IF;
  
  -- Índices adicionais para otimizar performance de RLS policies
  -- Estes índices melhoram as queries que verificam organization_id em profiles
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'id') THEN
      CREATE INDEX IF NOT EXISTS idx_profiles_id_organization_id ON public.profiles (id) 
        WHERE organization_id IS NOT NULL;
    END IF;
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'organization_id') THEN
      CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles (organization_id) 
        WHERE organization_id IS NOT NULL;
    END IF;
  END IF;
END $$;

-- ========== PARTE 2: CORRIGIR RLS POLICIES ==========
-- Todas as políticas são condicionais: verificam se tabela e colunas existem antes de criar
-- Uso de (SELECT auth.uid()) para melhor performance em RLS policies
-- Uso de organization_id diretamente (sem COALESCE redundante)
-- Políticas organizadas por tabela para facilitar manutenção

-- == PATIENTS ==
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'patients') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'organization_id') THEN
      DROP POLICY IF EXISTS "Patients are viewable by authenticated users." ON public.patients;
      DROP POLICY IF EXISTS "Authenticated users can insert patients." ON public.patients;
      DROP POLICY IF EXISTS "Authenticated users can update patients." ON public.patients;
      DROP POLICY IF EXISTS "patients_select_optimized" ON public.patients;
      DROP POLICY IF EXISTS "patients_insert_optimized" ON public.patients;
      DROP POLICY IF EXISTS "patients_update_optimized" ON public.patients;
      DROP POLICY IF EXISTS "patients_delete_optimized" ON public.patients;
    
      CREATE POLICY "patients_org_select" ON public.patients
        FOR SELECT TO authenticated USING (
          organization_id = (SELECT organization_id FROM public.profiles WHERE id = (SELECT auth.uid()))
        );
    
      CREATE POLICY "patients_org_insert" ON public.patients
        FOR INSERT TO authenticated
        WITH CHECK (
          organization_id = (SELECT organization_id FROM public.profiles WHERE id = (SELECT auth.uid()))
        );
    
      CREATE POLICY "patients_org_update" ON public.patients
        FOR UPDATE TO authenticated USING (
          organization_id = (SELECT organization_id FROM public.profiles WHERE id = (SELECT auth.uid()))
        );
    
      CREATE POLICY "patients_org_delete" ON public.patients
        FOR DELETE TO authenticated USING (
          organization_id = (SELECT organization_id FROM public.profiles WHERE id = (SELECT auth.uid()))
        );
    END IF;
  END IF;
END $$;

-- == APPOINTMENTS ==
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'appointments') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'organization_id') THEN
      DROP POLICY IF EXISTS "Appointments are viewable by authenticated users." ON public.appointments;
      DROP POLICY IF EXISTS "Authenticated users can insert appointments." ON public.appointments;
      DROP POLICY IF EXISTS "Authenticated users can update appointments." ON public.appointments;
      DROP POLICY IF EXISTS "appointments_select_optimized" ON public.appointments;
      DROP POLICY IF EXISTS "appointments_insert_optimized" ON public.appointments;
      DROP POLICY IF EXISTS "appointments_update_optimized" ON public.appointments;
      DROP POLICY IF EXISTS "appointments_delete_optimized" ON public.appointments;
    
      CREATE POLICY "appointments_org_select" ON public.appointments
        FOR SELECT TO authenticated USING (
          organization_id = (SELECT organization_id FROM public.profiles WHERE id = (SELECT auth.uid()))
        );
    
      CREATE POLICY "appointments_org_insert" ON public.appointments
        FOR INSERT TO authenticated
        WITH CHECK (
          organization_id = (SELECT organization_id FROM public.profiles WHERE id = (SELECT auth.uid()))
        );
    
      CREATE POLICY "appointments_org_update" ON public.appointments
        FOR UPDATE TO authenticated USING (
          organization_id = (SELECT organization_id FROM public.profiles WHERE id = (SELECT auth.uid()))
        );
    
      CREATE POLICY "appointments_org_delete" ON public.appointments
        FOR DELETE TO authenticated USING (
          organization_id = (SELECT organization_id FROM public.profiles WHERE id = (SELECT auth.uid()))
        );
    END IF;
  END IF;
END $$;

-- == KNOWLEDGE_DOCUMENTS ==
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'knowledge_documents') THEN
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
  END IF;
END $$;

-- == KNOWLEDGE_SEARCH_HISTORY ==
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'knowledge_search_history') THEN
    DROP POLICY IF EXISTS "Users can view their own search history." ON public.knowledge_search_history;
    DROP POLICY IF EXISTS "Users can insert their own search history." ON public.knowledge_search_history;
    DROP POLICY IF EXISTS "knowledge_search_history_select_optimized" ON public.knowledge_search_history;
    DROP POLICY IF EXISTS "knowledge_search_history_insert_optimized" ON public.knowledge_search_history;
    
    CREATE POLICY "ksh_user_select" ON public.knowledge_search_history
      FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
    
    CREATE POLICY "ksh_user_insert" ON public.knowledge_search_history
      FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
  END IF;
END $$;

-- == ORGANIZATIONS ==
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'organizations') THEN
    DROP POLICY IF EXISTS "Users can view organizations they belong to" ON public.organizations;
    DROP POLICY IF EXISTS "organizations_select_optimized" ON public.organizations;
    
    CREATE POLICY "organizations_member_select" ON public.organizations
      FOR SELECT TO authenticated USING (
        id IN (SELECT organization_id FROM public.profiles WHERE id = (SELECT auth.uid()))
      );
  END IF;
END $$;

-- == SESSIONS ==
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sessions') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'organization_id') THEN
      DROP POLICY IF EXISTS "Physiotherapists can manage sessions" ON public.sessions;
      DROP POLICY IF EXISTS "Users can view sessions in their org" ON public.sessions;
      DROP POLICY IF EXISTS "sessions_select_optimized" ON public.sessions;
      DROP POLICY IF EXISTS "sessions_insert_optimized" ON public.sessions;
      DROP POLICY IF EXISTS "sessions_update_optimized" ON public.sessions;
      DROP POLICY IF EXISTS "sessions_delete_optimized" ON public.sessions;
    
      CREATE POLICY "sessions_org_select" ON public.sessions
        FOR SELECT TO authenticated USING (
          organization_id = (SELECT organization_id FROM public.profiles WHERE id = (SELECT auth.uid()))
        );
    
      CREATE POLICY "sessions_org_insert" ON public.sessions
        FOR INSERT TO authenticated
        WITH CHECK (
          organization_id = (SELECT organization_id FROM public.profiles WHERE id = (SELECT auth.uid()))
        );
    
      CREATE POLICY "sessions_org_update" ON public.sessions
        FOR UPDATE TO authenticated USING (
          organization_id = (SELECT organization_id FROM public.profiles WHERE id = (SELECT auth.uid()))
        );
    
      CREATE POLICY "sessions_org_delete" ON public.sessions
        FOR DELETE TO authenticated USING (
          organization_id = (SELECT organization_id FROM public.profiles WHERE id = (SELECT auth.uid()))
        );
    END IF;
  END IF;
END $$;

-- == BODY_PAIN_MAPS ==
-- Nota: Esta política depende da tabela 'sessions' existir
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'body_pain_maps') THEN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sessions') THEN
      IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'organization_id') THEN
        DROP POLICY IF EXISTS "Users can view pain maps in their org" ON public.body_pain_maps;
        DROP POLICY IF EXISTS "body_pain_maps_select_optimized" ON public.body_pain_maps;
        DROP POLICY IF EXISTS "body_pain_maps_insert_optimized" ON public.body_pain_maps;
        DROP POLICY IF EXISTS "body_pain_maps_update_optimized" ON public.body_pain_maps;
        DROP POLICY IF EXISTS "body_pain_maps_delete_optimized" ON public.body_pain_maps;
      
        CREATE POLICY "body_pain_maps_org_all" ON public.body_pain_maps
          FOR ALL TO authenticated USING (
            EXISTS (
              SELECT 1 FROM public.sessions s 
              WHERE s.id = body_pain_maps.session_id 
              AND s.organization_id = (SELECT organization_id FROM public.profiles WHERE id = (SELECT auth.uid()))
            )
          );
      END IF;
    END IF;
  END IF;
END $$;

-- == WAITLIST ==
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'waitlist') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'waitlist' AND column_name = 'organization_id') THEN
      DROP POLICY IF EXISTS "Users can view waitlist in their org" ON public.waitlist;
      DROP POLICY IF EXISTS "waitlist_select_optimized" ON public.waitlist;
      DROP POLICY IF EXISTS "waitlist_insert_optimized" ON public.waitlist;
      DROP POLICY IF EXISTS "waitlist_update_optimized" ON public.waitlist;
      DROP POLICY IF EXISTS "waitlist_delete_optimized" ON public.waitlist;
    
      CREATE POLICY "waitlist_org_all" ON public.waitlist
        FOR ALL TO authenticated USING (
          organization_id = (SELECT organization_id FROM public.profiles WHERE id = (SELECT auth.uid()))
        );
    END IF;
  END IF;
END $$;

-- == NOTIFICATIONS ==
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
    DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
    DROP POLICY IF EXISTS "notifications_select_optimized" ON public.notifications;
    DROP POLICY IF EXISTS "notifications_update_optimized" ON public.notifications;
    
    CREATE POLICY "notifications_user_all" ON public.notifications
      FOR ALL TO authenticated USING (user_id = (SELECT auth.uid()));
  END IF;
END $$;

-- == WAITING_LIST ==
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'waiting_list') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'waiting_list' AND column_name = 'organization_id') THEN
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
          organization_id = (SELECT organization_id FROM public.profiles WHERE id = (SELECT auth.uid()))
        );
    END IF;
  END IF;
END $$;

-- == ASSESSMENT_TEST_CONFIGS ==
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'assessment_test_configs') THEN
    DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.assessment_test_configs;
    DROP POLICY IF EXISTS "assessment_test_configs_select_optimized" ON public.assessment_test_configs;
    DROP POLICY IF EXISTS "assessment_test_configs_insert_optimized" ON public.assessment_test_configs;
    DROP POLICY IF EXISTS "assessment_test_configs_update_optimized" ON public.assessment_test_configs;
    
    CREATE POLICY "assessment_test_configs_auth_all" ON public.assessment_test_configs
      FOR ALL TO authenticated USING (true);
  END IF;
END $$;

-- == AUDIT_LOGS ==
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'organization_id') THEN
      DROP POLICY IF EXISTS "audit_logs_policy" ON public.audit_logs;
      DROP POLICY IF EXISTS "audit_logs_select_optimized" ON public.audit_logs;
      DROP POLICY IF EXISTS "audit_logs_insert_optimized" ON public.audit_logs;
    
      CREATE POLICY "audit_logs_org_select" ON public.audit_logs
        FOR SELECT TO authenticated USING (
          organization_id = (SELECT organization_id FROM public.profiles WHERE id = (SELECT auth.uid()))
        );
    
      CREATE POLICY "audit_logs_org_insert" ON public.audit_logs
        FOR INSERT TO authenticated
        WITH CHECK (
          organization_id = (SELECT organization_id FROM public.profiles WHERE id = (SELECT auth.uid()))
        );
    END IF;
  END IF;
END $$;

-- == BACKUPS ==
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'backups') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'backups' AND column_name = 'organization_id') THEN
      DROP POLICY IF EXISTS "backups_policy" ON public.backups;
      DROP POLICY IF EXISTS "backups_select_optimized" ON public.backups;
      DROP POLICY IF EXISTS "backups_insert_optimized" ON public.backups;
    
      CREATE POLICY "backups_org_all" ON public.backups
        FOR ALL TO authenticated USING (
          organization_id = (SELECT organization_id FROM public.profiles WHERE id = (SELECT auth.uid()))
        );
    END IF;
  END IF;
END $$;

-- == LEADS ==
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'leads') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'organization_id') THEN
      DROP POLICY IF EXISTS "leads_policy" ON public.leads;
      DROP POLICY IF EXISTS "leads_select_optimized" ON public.leads;
      DROP POLICY IF EXISTS "leads_insert_optimized" ON public.leads;
      DROP POLICY IF EXISTS "leads_update_optimized" ON public.leads;
      DROP POLICY IF EXISTS "leads_delete_optimized" ON public.leads;
    
      CREATE POLICY "leads_org_all" ON public.leads
        FOR ALL TO authenticated USING (
          organization_id = (SELECT organization_id FROM public.profiles WHERE id = (SELECT auth.uid()))
        );
    END IF;
  END IF;
END $$;

-- == LANDING_PAGES ==
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'landing_pages') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'landing_pages' AND column_name = 'organization_id') THEN
      IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'landing_pages' AND column_name = 'is_active') THEN
        DROP POLICY IF EXISTS "landing_pages_policy" ON public.landing_pages;
        DROP POLICY IF EXISTS "landing_pages_select_optimized" ON public.landing_pages;
        DROP POLICY IF EXISTS "landing_pages_insert_optimized" ON public.landing_pages;
        DROP POLICY IF EXISTS "landing_pages_update_optimized" ON public.landing_pages;
        DROP POLICY IF EXISTS "landing_pages_delete_optimized" ON public.landing_pages;
      
        CREATE POLICY "landing_pages_org_select" ON public.landing_pages
          FOR SELECT TO authenticated USING (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = (SELECT auth.uid()))
            OR is_active = true
          );
      
        CREATE POLICY "landing_pages_org_modify" ON public.landing_pages
          FOR ALL TO authenticated USING (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = (SELECT auth.uid()))
          );
      END IF;
    END IF;
  END IF;
END $$;

-- == MARKETING_CAMPAIGNS ==
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'marketing_campaigns') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'marketing_campaigns' AND column_name = 'organization_id') THEN
      DROP POLICY IF EXISTS "marketing_campaigns_policy" ON public.marketing_campaigns;
      DROP POLICY IF EXISTS "marketing_campaigns_select_optimized" ON public.marketing_campaigns;
      DROP POLICY IF EXISTS "marketing_campaigns_insert_optimized" ON public.marketing_campaigns;
      DROP POLICY IF EXISTS "marketing_campaigns_update_optimized" ON public.marketing_campaigns;
      DROP POLICY IF EXISTS "marketing_campaigns_delete_optimized" ON public.marketing_campaigns;
    
      CREATE POLICY "marketing_campaigns_org_all" ON public.marketing_campaigns
        FOR ALL TO authenticated USING (
          organization_id = (SELECT organization_id FROM public.profiles WHERE id = (SELECT auth.uid()))
        );
    END IF;
  END IF;
END $$;

-- == PATIENT_GOALS ==
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'patient_goals') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'patient_goals' AND column_name = 'organization_id') THEN
      DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.patient_goals;
      DROP POLICY IF EXISTS "patient_goals_policy" ON public.patient_goals;
      DROP POLICY IF EXISTS "patient_goals_select_optimized" ON public.patient_goals;
      DROP POLICY IF EXISTS "patient_goals_insert_optimized" ON public.patient_goals;
      DROP POLICY IF EXISTS "patient_goals_update_optimized" ON public.patient_goals;
      DROP POLICY IF EXISTS "patient_goals_delete_optimized" ON public.patient_goals;

      CREATE POLICY "patient_goals_org_all" ON public.patient_goals
        FOR ALL TO authenticated USING (
          organization_id = (SELECT organization_id FROM public.profiles WHERE id = (SELECT auth.uid()))
        );
    END IF;
  END IF;
END $$;

-- == ANALYTICS_EVENTS ==
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'analytics_events') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'analytics_events' AND column_name = 'organization_id') THEN
      DROP POLICY IF EXISTS "analytics_events_policy" ON public.analytics_events;
      DROP POLICY IF EXISTS "analytics_events_select_optimized" ON public.analytics_events;
      DROP POLICY IF EXISTS "analytics_events_insert_optimized" ON public.analytics_events;
    
      CREATE POLICY "analytics_events_org_select" ON public.analytics_events
        FOR SELECT TO authenticated USING (
          organization_id = (SELECT organization_id FROM public.profiles WHERE id = (SELECT auth.uid()))
        );
    
      CREATE POLICY "analytics_events_auth_insert" ON public.analytics_events
        FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
  END IF;
END $$;

-- == SESSION_TEMPLATES ==
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'session_templates') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'session_templates' AND column_name = 'organization_id') THEN
      IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'session_templates' AND column_name = 'is_public') THEN
        DROP POLICY IF EXISTS "session_templates_policy" ON public.session_templates;
        DROP POLICY IF EXISTS "session_templates_select_optimized" ON public.session_templates;
        DROP POLICY IF EXISTS "session_templates_insert_optimized" ON public.session_templates;
        DROP POLICY IF EXISTS "session_templates_update_optimized" ON public.session_templates;
        DROP POLICY IF EXISTS "session_templates_delete_optimized" ON public.session_templates;
      
        CREATE POLICY "session_templates_select" ON public.session_templates
          FOR SELECT TO authenticated USING (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = (SELECT auth.uid()))
            OR is_public = true
          );
      
        CREATE POLICY "session_templates_modify" ON public.session_templates
          FOR ALL TO authenticated USING (
            organization_id = (SELECT organization_id FROM public.profiles WHERE id = (SELECT auth.uid()))
          );
      END IF;
    END IF;
  END IF;
END $$;

-- == TREATMENT_PROCEDURES ==
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'treatment_procedures') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'treatment_procedures' AND column_name = 'organization_id') THEN
      DROP POLICY IF EXISTS "treatment_procedures_policy" ON public.treatment_procedures;
      DROP POLICY IF EXISTS "treatment_procedures_select_optimized" ON public.treatment_procedures;
      DROP POLICY IF EXISTS "treatment_procedures_insert_optimized" ON public.treatment_procedures;
      DROP POLICY IF EXISTS "treatment_procedures_update_optimized" ON public.treatment_procedures;
    
      CREATE POLICY "treatment_procedures_select" ON public.treatment_procedures
        FOR SELECT TO authenticated USING (
          organization_id = (SELECT organization_id FROM public.profiles WHERE id = (SELECT auth.uid()))
          OR organization_id IS NULL
        );
    
      CREATE POLICY "treatment_procedures_modify" ON public.treatment_procedures
        FOR ALL TO authenticated USING (
          organization_id = (SELECT organization_id FROM public.profiles WHERE id = (SELECT auth.uid()))
        );
    END IF;
  END IF;
END $$;

-- == SURGERIES ==
-- Nota: Esta política depende da tabela 'patients' existir
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'surgeries') THEN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'patients') THEN
      IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'organization_id') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'surgeries' AND column_name = 'patient_id') THEN
          DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.surgeries;
          DROP POLICY IF EXISTS "surgeries_select_optimized" ON public.surgeries;
          DROP POLICY IF EXISTS "surgeries_insert_optimized" ON public.surgeries;
          DROP POLICY IF EXISTS "surgeries_update_optimized" ON public.surgeries;
          DROP POLICY IF EXISTS "surgeries_delete_optimized" ON public.surgeries;
        
          CREATE POLICY "surgeries_patient_org_all" ON public.surgeries
            FOR ALL TO authenticated USING (
              EXISTS (
                SELECT 1 FROM public.patients p 
                WHERE p.id = surgeries.patient_id 
                AND p.organization_id = (SELECT organization_id FROM public.profiles WHERE id = (SELECT auth.uid()))
              )
            );
        END IF;
      END IF;
    END IF;
  END IF;
END $$;

-- == PATHOLOGIES ==
-- Nota: Esta política depende da tabela 'patients' existir
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'pathologies') THEN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'patients') THEN
      IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'organization_id') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'pathologies' AND column_name = 'patient_id') THEN
          DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.pathologies;
          DROP POLICY IF EXISTS "pathologies_select_optimized" ON public.pathologies;
          DROP POLICY IF EXISTS "pathologies_insert_optimized" ON public.pathologies;
          DROP POLICY IF EXISTS "pathologies_update_optimized" ON public.pathologies;
          DROP POLICY IF EXISTS "pathologies_delete_optimized" ON public.pathologies;
        
          CREATE POLICY "pathologies_patient_org_all" ON public.pathologies
            FOR ALL TO authenticated USING (
              EXISTS (
                SELECT 1 FROM public.patients p 
                WHERE p.id = pathologies.patient_id 
                AND p.organization_id = (SELECT organization_id FROM public.profiles WHERE id = (SELECT auth.uid()))
              )
            );
        END IF;
      END IF;
    END IF;
  END IF;
END $$;

-- == TEST_RESULTS ==
-- Nota: Esta política depende da tabela 'patients' existir
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'test_results') THEN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'patients') THEN
      IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'organization_id') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'test_results' AND column_name = 'patient_id') THEN
          DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.test_results;
          DROP POLICY IF EXISTS "test_results_select_optimized" ON public.test_results;
          DROP POLICY IF EXISTS "test_results_insert_optimized" ON public.test_results;
          DROP POLICY IF EXISTS "test_results_update_optimized" ON public.test_results;
        
          CREATE POLICY "test_results_patient_org_all" ON public.test_results
            FOR ALL TO authenticated USING (
              EXISTS (
                SELECT 1 FROM public.patients p 
                WHERE p.id = test_results.patient_id 
                AND p.organization_id = (SELECT organization_id FROM public.profiles WHERE id = (SELECT auth.uid()))
              )
            );
        END IF;
      END IF;
    END IF;
  END IF;
END $$;

-- == CONDUCT_TEMPLATES ==
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'conduct_templates') THEN
    DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.conduct_templates;
    DROP POLICY IF EXISTS "conduct_templates_select_optimized" ON public.conduct_templates;
    DROP POLICY IF EXISTS "conduct_templates_insert_optimized" ON public.conduct_templates;
    DROP POLICY IF EXISTS "conduct_templates_update_optimized" ON public.conduct_templates;
    
    CREATE POLICY "conduct_templates_auth_all" ON public.conduct_templates
      FOR ALL TO authenticated USING (true);
  END IF;
END $$;

-- ========== PARTE 3: CORRIGIR VIEWS SECURITY DEFINER ==========

-- Recriar views sem SECURITY DEFINER (usando as colunas corretas)
-- Todas as views são condicionais e verificam existência de tabelas e colunas
DO $$
BEGIN
  -- View: patient_package_summary
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'patient_packages')
     AND EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'session_packages')
     AND EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'patients') THEN
    
    DROP VIEW IF EXISTS public.patient_package_summary;
    
    -- Verificar quais colunas existem antes de criar a view
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'session_packages' AND column_name = 'name')
       AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'session_packages' AND column_name = 'price')
       AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'name') THEN
      
      EXECUTE '
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
      JOIN public.patients p ON pp.patient_id = p.id';
    END IF;
  END IF;
  
  -- View: today_appointments_with_packages
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'appointments')
     AND EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'patients')
     AND EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'patient_packages') THEN
    
    DROP VIEW IF EXISTS public.today_appointments_with_packages;
    
    -- Verificar quais colunas existem antes de criar a view
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'appointment_date')
       AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'name') THEN
      
      EXECUTE '
      CREATE VIEW public.today_appointments_with_packages AS
      SELECT 
        a.id,
        a.patient_id,
        a.appointment_date,
        a.start_time,
        a.end_time,
        a.status,
        a.organization_id,
        p.name AS patient_name,
        COALESCE(
          (SELECT pp.id 
           FROM public.patient_packages pp 
           WHERE pp.patient_id = a.patient_id 
           AND pp.sessions_used < pp.sessions_purchased
           AND (pp.expires_at IS NULL OR pp.expires_at > NOW())
           ORDER BY pp.expires_at DESC NULLS LAST
           LIMIT 1
          ), NULL
        ) AS active_package_id
      FROM public.appointments a
      JOIN public.patients p ON a.patient_id = p.id
      WHERE DATE(a.appointment_date) = CURRENT_DATE';
    END IF;
  END IF;
END $$;

-- ========== FIM ==========
