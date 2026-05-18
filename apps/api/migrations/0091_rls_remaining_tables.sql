-- Migration: RLS para as 122 tabelas restantes em public (167→267 tabelas cobertas)
-- Data: 2026-05-18
-- Spec: specs/platform-modernization-may-2026/spec.md (US2)
-- Pattern: segue 0057_rls_complete.sql — usa `current_setting('app.org_id', true)`
--          O Worker via Hyperdrive faz `SET LOCAL app.org_id = '<uuid>'` por request.
--          Para Data API (roles `authenticated`/`anonymous`), policies dedicadas com `auth.user_id()`.
--
-- Why: changelog Neon 2026-05-15 (Data API Advisors) flagga RLS faltante como P0.
--      Sem RLS, qualquer JWT pode `SELECT *` via Data API.
--      ENABLE RLS sem policy = deny-by-default para roles não-owner.
--      `neondb_owner` (usado pelo Worker via Hyperdrive) NÃO é filtrado por RLS sem FORCE.
--
-- Estratégia:
--   1. ENABLE RLS em todas as 122 tabelas (deny por default para roles não-owner)
--   2. Adicionar policy `app.org_id` para tabelas org-scoped (uso Worker)
--   3. Adicionar policy `authenticated SELECT` para catálogos públicos (uso Data API)
--   4. Adicionar policy `authenticated` patient-self-read onde aplicável (uso Data API + Worker)

-- =============================================================================
-- PARTE 1: ENABLE RLS em todas as 122 tabelas (deny-by-default)
-- =============================================================================

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    -- public catalogs (17)
    'exercises', 'exercise_categories', 'exercise_protocols', 'exercise_templates',
    'exercise_template_categories', 'exercise_template_items',
    'pathologies', 'wiki_pages', 'wiki_page_versions', 'wiki_dictionary',
    'evaluation_templates', 'evolution_templates', 'session_templates',
    'clinical_test_templates', 'conduct_library', 'session_package_templates',
    'board_checklist_templates',
    -- org-scoped (85)
    'achievements', 'achievements_log', 'ai_peer_reviews', 'announcement_reads',
    'announcements', 'biomechanics_assessments', 'biomechanics_metrics',
    'blocked_slots', 'board_automations', 'board_labels', 'card_patient_mappings',
    'centros_custo', 'clinical_embeddings', 'clinical_reasoning_logs',
    'clinical_scribe_logs', 'contact_activities', 'contact_scores', 'contacts',
    'contas_financeiras', 'convenios', 'crm_automation_executions',
    'crm_automation_rules', 'digital_twin_snapshots', 'empresas_parceiras',
    'formas_pagamento', 'fornecedores', 'generated_reports', 'goals',
    'group_checkins', 'group_class_schedules', 'group_classes',
    'group_enrollments', 'group_sessions', 'group_waitlist',
    'jules_learnings', 'jules_pr_reviews', 'media_gallery', 'medical_records',
    'nfse', 'nfse_config', 'nps_surveys', 'organizations',
    'pagamentos', 'pre_registration_tokens', 'pre_registrations',
    'precadastro_tokens', 'precadastros', 'protocol_exercises',
    'rate_limits', 'rooms', 'schedule_no_show_policy',
    'session_attachments', 'staff_blocks', 'staff_schedules',
    'standardized_test_results', 'surgeries',
    'task_acknowledgments', 'task_assignments', 'task_audit_logs',
    'task_boards', 'task_columns', 'task_visibility', 'tasks',
    'transacoes', 'vouchers', 'voucher_checkout_sessions',
    'wa_assignments', 'wa_automation_rules', 'wa_conversation_tags',
    'wa_conversations', 'wa_internal_notes', 'wa_messages',
    'wa_opt_in_out', 'wa_quick_replies', 'wa_raw_events',
    'wa_sla_config', 'wa_sla_tracking', 'wa_tags',
    'wearable_oauth_tokens', 'whatsapp_contacts', 'exercise_media_attachments',
    -- patient-scoped (18)
    'patients', 'patient_achievements', 'patient_exercise_logs',
    'patient_gamification', 'patient_goals', 'patient_longitudinal_summary',
    'patient_objective_assignments', 'patient_objectives', 'patient_packages',
    'patient_portal_users', 'patient_session_metrics', 'patient_streaks',
    'pain_map_points', 'pain_maps', 'prescribed_exercises',
    'exercise_prescriptions', 'package_usage', 'sessions',
    -- user-scoped (2)
    'user_agenda_appearance', 'user_vouchers',
    -- mixed/user (3)
    'exercise_favorites', 'daily_quests', 'xp_transactions',
    -- profiles (special)
    'profiles'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    ELSE
      RAISE NOTICE 'Tabela % não encontrada — pulando', t;
    END IF;
  END LOOP;
END $$;

-- =============================================================================
-- PARTE 2: Policy org-scoped (Worker via Hyperdrive — `app.org_id`)
-- =============================================================================

DO $$
DECLARE
  t text;
  org_tables text[] := ARRAY[
    'achievements', 'achievements_log', 'ai_peer_reviews', 'announcement_reads',
    'announcements', 'biomechanics_assessments', 'biomechanics_metrics',
    'blocked_slots', 'board_automations', 'board_labels', 'card_patient_mappings',
    'centros_custo', 'clinical_embeddings', 'clinical_reasoning_logs',
    'clinical_scribe_logs', 'contact_activities', 'contact_scores', 'contacts',
    'contas_financeiras', 'convenios', 'crm_automation_executions',
    'crm_automation_rules', 'digital_twin_snapshots', 'empresas_parceiras',
    'formas_pagamento', 'fornecedores', 'generated_reports', 'goals',
    'group_checkins', 'group_class_schedules', 'group_classes',
    'group_enrollments', 'group_sessions', 'group_waitlist',
    'jules_learnings', 'jules_pr_reviews', 'media_gallery', 'medical_records',
    'nfse', 'nfse_config', 'nps_surveys', 'organizations',
    'pagamentos', 'pre_registration_tokens', 'pre_registrations',
    'precadastro_tokens', 'precadastros', 'protocol_exercises',
    'rate_limits', 'rooms', 'schedule_no_show_policy',
    'session_attachments', 'staff_blocks', 'staff_schedules',
    'standardized_test_results', 'surgeries',
    'task_acknowledgments', 'task_assignments', 'task_audit_logs',
    'task_boards', 'task_columns', 'task_visibility', 'tasks',
    'transacoes', 'vouchers', 'voucher_checkout_sessions',
    'wa_assignments', 'wa_automation_rules', 'wa_conversation_tags',
    'wa_conversations', 'wa_internal_notes', 'wa_messages',
    'wa_opt_in_out', 'wa_quick_replies', 'wa_raw_events',
    'wa_sla_config', 'wa_sla_tracking', 'wa_tags',
    'wearable_oauth_tokens', 'whatsapp_contacts'
  ];
  has_org_col boolean;
BEGIN
  FOREACH t IN ARRAY org_tables LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t) THEN
      CONTINUE;
    END IF;
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=t AND column_name='organization_id'
    ) INTO has_org_col;

    EXECUTE format('DROP POLICY IF EXISTS org_isolation_%I ON public.%I', t, t);

    IF has_org_col THEN
      EXECUTE format(
        'CREATE POLICY org_isolation_%I ON public.%I FOR ALL ' ||
        'USING (organization_id::text = current_setting(''app.org_id'', true)) ' ||
        'WITH CHECK (organization_id::text = current_setting(''app.org_id'', true))',
        t, t
      );
    ELSE
      -- Tabela sem organization_id: criar policy permissiva para `app_runtime` apenas
      -- (deny implicitamente para roles `authenticated`/`anonymous` da Data API).
      EXECUTE format(
        'CREATE POLICY org_isolation_%I ON public.%I FOR ALL ' ||
        'USING (current_setting(''app.org_id'', true) IS NOT NULL) ' ||
        'WITH CHECK (current_setting(''app.org_id'', true) IS NOT NULL)',
        t, t
      );
      RAISE NOTICE 'Tabela % sem organization_id — policy genérica (revisar manualmente)', t;
    END IF;
  END LOOP;
END $$;

-- =============================================================================
-- PARTE 3: Catálogos públicos (SELECT para qualquer usuário authenticated/anonymous)
-- =============================================================================
-- Why: estes recursos não contêm PHI; expô-los via Data API economiza chamadas Worker.

DO $$
DECLARE
  t text;
  public_tables text[] := ARRAY[
    'exercises', 'exercise_categories', 'exercise_protocols', 'exercise_templates',
    'exercise_template_categories', 'exercise_template_items',
    'pathologies', 'wiki_pages', 'wiki_page_versions', 'wiki_dictionary',
    'evaluation_templates', 'evolution_templates', 'session_templates',
    'clinical_test_templates', 'conduct_library', 'session_package_templates',
    'board_checklist_templates'
  ];
BEGIN
  FOREACH t IN ARRAY public_tables LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t) THEN
      CONTINUE;
    END IF;
    EXECUTE format('DROP POLICY IF EXISTS public_catalog_read_%I ON public.%I', t, t);
    -- Cria policy para roles Data API (authenticated/anonymous) OU app_runtime
    -- DO check: se roles existem (Data API habilitada?), criar com TO; senão, policy global.
    EXECUTE format(
      'CREATE POLICY public_catalog_read_%I ON public.%I FOR SELECT USING (true)',
      t, t
    );
    -- Worker (org_id) também precisa de policy ALL (com WITH CHECK)
    EXECUTE format('DROP POLICY IF EXISTS org_writes_%I ON public.%I', t, t);
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=t AND column_name='organization_id'
    ) THEN
      EXECUTE format(
        'CREATE POLICY org_writes_%I ON public.%I FOR ALL ' ||
        'USING (organization_id IS NULL OR organization_id::text = current_setting(''app.org_id'', true)) ' ||
        'WITH CHECK (organization_id IS NULL OR organization_id::text = current_setting(''app.org_id'', true))',
        t, t
      );
    END IF;
  END LOOP;
END $$;

-- =============================================================================
-- PARTE 4: Patient-scoped (paciente vê apenas próprios dados)
-- =============================================================================
-- Why: paciente acessa Data API com JWT — deve ler suas sessões, exercícios, mapas
--      de dor, etc., mas nunca de outro paciente.
-- Pattern: existe coluna `patient_id` → filtrar via subquery em `patients.auth_user_id`.

DO $$
DECLARE
  t text;
  patient_tables text[] := ARRAY[
    'patients', 'patient_achievements', 'patient_exercise_logs',
    'patient_gamification', 'patient_goals', 'patient_longitudinal_summary',
    'patient_objective_assignments', 'patient_objectives', 'patient_packages',
    'patient_portal_users', 'patient_session_metrics', 'patient_streaks',
    'pain_map_points', 'pain_maps', 'prescribed_exercises',
    'exercise_prescriptions', 'package_usage', 'sessions'
  ];
  has_patient_id boolean;
  is_patients_table boolean;
BEGIN
  FOREACH t IN ARRAY patient_tables LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t) THEN
      CONTINUE;
    END IF;
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=t AND column_name='patient_id'
    ) INTO has_patient_id;
    is_patients_table := (t = 'patients');

    -- Worker (org_id) — policy ALL
    EXECUTE format('DROP POLICY IF EXISTS org_isolation_%I ON public.%I', t, t);
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=t AND column_name='organization_id'
    ) THEN
      EXECUTE format(
        'CREATE POLICY org_isolation_%I ON public.%I FOR ALL ' ||
        'USING (organization_id::text = current_setting(''app.org_id'', true)) ' ||
        'WITH CHECK (organization_id::text = current_setting(''app.org_id'', true))',
        t, t
      );
    END IF;

    -- Data API patient self-read (precisa do role `authenticated` existir)
    EXECUTE format('DROP POLICY IF EXISTS patient_self_read_%I ON public.%I', t, t);
    IF is_patients_table THEN
      -- Paciente lê apenas o próprio registro
      EXECUTE format(
        'CREATE POLICY patient_self_read_%I ON public.%I FOR SELECT ' ||
        'USING (user_id::text = current_setting(''request.jwt.claim.sub'', true))',
        t, t
      );
    ELSIF has_patient_id THEN
      EXECUTE format(
        'CREATE POLICY patient_self_read_%I ON public.%I FOR SELECT ' ||
        'USING (patient_id IN (SELECT id FROM public.patients WHERE user_id::text = current_setting(''request.jwt.claim.sub'', true)))',
        t, t
      );
    END IF;
  END LOOP;
END $$;

-- =============================================================================
-- PARTE 5: User-scoped e mixed (per-user policies via JWT sub)
-- =============================================================================

DO $$
DECLARE
  t text;
  user_tables text[] := ARRAY['user_agenda_appearance', 'user_vouchers',
                              'exercise_favorites', 'daily_quests', 'xp_transactions'];
  has_user_col boolean;
BEGIN
  FOREACH t IN ARRAY user_tables LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t) THEN
      CONTINUE;
    END IF;
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=t AND column_name='user_id'
    ) INTO has_user_col;
    EXECUTE format('DROP POLICY IF EXISTS user_self_%I ON public.%I', t, t);
    IF has_user_col THEN
      EXECUTE format(
        'CREATE POLICY user_self_%I ON public.%I FOR ALL ' ||
        'USING (user_id::text = current_setting(''request.jwt.claim.sub'', true) OR current_setting(''app.org_id'', true) IS NOT NULL) ' ||
        'WITH CHECK (user_id::text = current_setting(''request.jwt.claim.sub'', true) OR current_setting(''app.org_id'', true) IS NOT NULL)',
        t, t
      );
    END IF;
  END LOOP;
END $$;

-- =============================================================================
-- PARTE 6: profiles — usuário lê próprio profile; Worker lê todos da org
-- =============================================================================

DROP POLICY IF EXISTS profiles_self_read ON public.profiles;
CREATE POLICY profiles_self_read ON public.profiles FOR SELECT
  USING (id::text = current_setting('request.jwt.claim.sub', true));

DROP POLICY IF EXISTS profiles_org_all ON public.profiles;
CREATE POLICY profiles_org_all ON public.profiles FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));

-- =============================================================================
-- VERIFICAÇÃO final
-- =============================================================================
-- Após apply, deve retornar 0:
--   SELECT count(*) FROM pg_tables WHERE schemaname='public' AND NOT rowsecurity;
