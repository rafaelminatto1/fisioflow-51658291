-- =====================================================
-- FisioFlow v3.0 - Database Optimization Migration
-- Criado em: 25/12/2025
-- Descrição: Corrige problemas de segurança, performance e cria tabelas faltantes
-- =====================================================

-- ========== PARTE 1: SEGURANÇA - Mover extensões do schema public ==========

-- Mover pg_trgm para extensions schema (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_extension WHERE extname = 'pg_trgm') THEN
    ALTER EXTENSION pg_trgm SET SCHEMA extensions;
  END IF;
END $$;

-- Mover btree_gist para extensions schema (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_extension WHERE extname = 'btree_gist') THEN
    ALTER EXTENSION btree_gist SET SCHEMA extensions;
  END IF;
END $$;

-- ========== PARTE 2: PERFORMANCE - Índices em Foreign Keys ==========

-- analytics_events
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'analytics_events') THEN
    CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id_fk ON analytics_events(user_id);
  END IF;
END $$;

-- knowledge_documents
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'knowledge_documents') THEN
    CREATE INDEX IF NOT EXISTS idx_knowledge_documents_uploaded_by_fk ON knowledge_documents(uploaded_by);
  END IF;
END $$;

-- knowledge_search_history
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'knowledge_search_history') THEN
    CREATE INDEX IF NOT EXISTS idx_knowledge_search_history_clicked_document_id_fk ON knowledge_search_history(clicked_document_id);
    CREATE INDEX IF NOT EXISTS idx_knowledge_search_history_user_id_fk ON knowledge_search_history(user_id);
  END IF;
END $$;

-- leads
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'leads') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'converted_to_patient_id') THEN
      CREATE INDEX IF NOT EXISTS idx_leads_converted_to_patient_id_fk ON leads(converted_to_patient_id);
    END IF;
  END IF;
END $$;

-- pathologies
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'pathologies') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'pathologies' AND column_name = 'patient_id') THEN
      CREATE INDEX IF NOT EXISTS idx_pathologies_patient_id_fk ON pathologies(patient_id);
    END IF;
  END IF;
END $$;

-- patients
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'patients') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'therapist_id') THEN
      CREATE INDEX IF NOT EXISTS idx_patients_therapist_id_fk ON patients(therapist_id);
    END IF;
  END IF;
END $$;

-- profiles
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'org_id') THEN
      CREATE INDEX IF NOT EXISTS idx_profiles_org_id_fk ON profiles(org_id);
    END IF;
  END IF;
END $$;

-- session_templates
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'session_templates') THEN
    CREATE INDEX IF NOT EXISTS idx_session_templates_created_by_fk ON session_templates(created_by);
  END IF;
END $$;

-- surgeries
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'surgeries') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'surgeries' AND column_name = 'patient_id') THEN
      CREATE INDEX IF NOT EXISTS idx_surgeries_patient_id_fk ON surgeries(patient_id);
    END IF;
  END IF;
END $$;

-- test_results
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'test_results') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'test_results' AND column_name = 'patient_id') THEN
      CREATE INDEX IF NOT EXISTS idx_test_results_patient_id_fk ON test_results(patient_id);
    END IF;
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'test_results' AND column_name = 'session_id') THEN
      CREATE INDEX IF NOT EXISTS idx_test_results_session_id_fk ON test_results(session_id);
    END IF;
  END IF;
END $$;

-- waiting_list
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'waiting_list') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'waiting_list' AND column_name = 'org_id') THEN
      CREATE INDEX IF NOT EXISTS idx_waiting_list_org_id_fk ON waiting_list(org_id);
    END IF;
  END IF;
END $$;

-- ========== PARTE 3: TABELAS FALTANTES ==========

-- EXERCISES - Tabela de exercícios
CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  video_url TEXT,
  image_url TEXT,
  category TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  duration_seconds INTEGER,
  equipment TEXT[],
  muscle_groups TEXT[],
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para exercises
CREATE INDEX IF NOT EXISTS idx_exercises_org_id ON exercises(organization_id);
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);
CREATE INDEX IF NOT EXISTS idx_exercises_is_active ON exercises(is_active);

-- PAYMENTS - Tabela de pagamentos
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
  method TEXT CHECK (method IN ('pix', 'credit_card', 'debit_card', 'cash', 'transfer', 'insurance')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded')),
  description TEXT,
  receipt_url TEXT,
  stripe_payment_id TEXT,
  paid_at TIMESTAMPTZ,
  due_date DATE,
  notes TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para payments
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payments') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'patient_id') THEN
      CREATE INDEX IF NOT EXISTS idx_payments_patient_id ON payments(patient_id);
    END IF;
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'status') THEN
      CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
    END IF;
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'organization_id') THEN
      CREATE INDEX IF NOT EXISTS idx_payments_org_id ON payments(organization_id);
    END IF;
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'paid_at') THEN
      CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at);
    END IF;
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'due_date') THEN
      CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments(due_date);
    END IF;
  END IF;
END $$;

-- PAIN_MAPS - Tabela de mapas de dor (se não existir)
CREATE TABLE IF NOT EXISTS pain_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  view TEXT NOT NULL CHECK (view IN ('front', 'back')),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pontos de dor
CREATE TABLE IF NOT EXISTS pain_map_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pain_map_id UUID NOT NULL REFERENCES pain_maps(id) ON DELETE CASCADE,
  region_code TEXT NOT NULL,
  region TEXT NOT NULL,
  intensity INTEGER NOT NULL CHECK (intensity >= 0 AND intensity <= 10),
  pain_type TEXT NOT NULL CHECK (pain_type IN ('sharp', 'throbbing', 'burning', 'tingling', 'numbness', 'stiffness')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para pain_maps
CREATE INDEX IF NOT EXISTS idx_pain_maps_session_id ON pain_maps(session_id);
CREATE INDEX IF NOT EXISTS idx_pain_maps_patient_id ON pain_maps(patient_id);
CREATE INDEX IF NOT EXISTS idx_pain_maps_org_id ON pain_maps(organization_id);
CREATE INDEX IF NOT EXISTS idx_pain_map_points_pain_map_id ON pain_map_points(pain_map_id);

-- SESSION_PACKAGES - Templates de pacotes
CREATE TABLE IF NOT EXISTS session_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  sessions_count INTEGER NOT NULL CHECK (sessions_count > 0),
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  validity_days INTEGER NOT NULL CHECK (validity_days > 0),
  is_active BOOLEAN DEFAULT true,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PATIENT_PACKAGES - Pacotes comprados pelos pacientes
CREATE TABLE IF NOT EXISTS patient_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES session_packages(id),
  sessions_purchased INTEGER NOT NULL,
  sessions_used INTEGER DEFAULT 0,
  price_paid DECIMAL(10,2) NOT NULL,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PACKAGE_USAGE - Histórico de uso
CREATE TABLE IF NOT EXISTS package_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_package_id UUID NOT NULL REFERENCES patient_packages(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id),
  appointment_id UUID REFERENCES appointments(id),
  session_id UUID REFERENCES sessions(id),
  used_at TIMESTAMPTZ DEFAULT NOW(),
  used_by UUID REFERENCES profiles(id),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE
);

-- Índices para packages
CREATE INDEX IF NOT EXISTS idx_session_packages_org ON session_packages(organization_id);
CREATE INDEX IF NOT EXISTS idx_patient_packages_patient ON patient_packages(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_packages_expires ON patient_packages(expires_at);
CREATE INDEX IF NOT EXISTS idx_package_usage_patient_package ON package_usage(patient_package_id);

-- PRESCRIPTIONS - Prescrições de exercícios
CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  therapist_id UUID REFERENCES profiles(id),
  title TEXT,
  frequency TEXT NOT NULL,
  duration_days INTEGER,
  is_active BOOLEAN DEFAULT true,
  deactivated_at TIMESTAMPTZ,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PRESCRIPTION_ITEMS - Itens da prescrição
CREATE TABLE IF NOT EXISTS prescription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id),
  sets INTEGER NOT NULL CHECK (sets > 0),
  reps INTEGER NOT NULL CHECK (reps > 0),
  hold_seconds INTEGER,
  rest_seconds INTEGER,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para prescriptions
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_org ON prescriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_prescription_items_prescription ON prescription_items(prescription_id);

-- WHATSAPP_MESSAGES - Mensagens WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  message_id TEXT,
  error_message TEXT,
  sent_by UUID REFERENCES profiles(id),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para whatsapp
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_patient ON whatsapp_messages(patient_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone ON whatsapp_messages(phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_org ON whatsapp_messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at ON whatsapp_messages(created_at);

-- MESSAGE_TEMPLATES - Templates de mensagens
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  message TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- EXERCISE_CATEGORIES - Categorias de exercícios
CREATE TABLE IF NOT EXISTS exercise_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== PARTE 4: RLS POLICIES ==========

-- Habilitar RLS nas novas tabelas
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pain_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE pain_map_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_categories ENABLE ROW LEVEL SECURITY;

-- Função auxiliar para pegar org_id do usuário (se a coluna org_id existir)
-- Comentado temporariamente até que a estrutura de organização seja definida
-- DO $$
-- BEGIN
--   IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'org_id') THEN
--     EXECUTE 'CREATE OR REPLACE FUNCTION public.get_user_org_id()
--     RETURNS UUID
--     LANGUAGE sql
--     STABLE
--     SECURITY DEFINER
--     SET search_path = public
--     AS $func$
--       SELECT org_id FROM profiles WHERE id = (SELECT auth.uid());
--     $func$;';
--   ELSIF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'organization_id') THEN
--     EXECUTE 'CREATE OR REPLACE FUNCTION public.get_user_org_id()
--     RETURNS UUID
--     LANGUAGE sql
--     STABLE
--     SECURITY DEFINER
--     SET search_path = public
--     AS $func$
--       SELECT organization_id FROM profiles WHERE id = (SELECT auth.uid());
--     $func$;';
--   END IF;
-- END $$;

-- Policies para exercises (comentado temporariamente até que get_user_org_id seja criado)
-- CREATE POLICY "exercises_select_policy" ON exercises
--   FOR SELECT USING (
--     organization_id = (SELECT public.get_user_org_id())
--   );

-- CREATE POLICY "exercises_insert_policy" ON exercises
--   FOR INSERT WITH CHECK (
--     organization_id = (SELECT public.get_user_org_id())
--   );

-- CREATE POLICY "exercises_update_policy" ON exercises
--   FOR UPDATE USING (
--     organization_id = (SELECT public.get_user_org_id())
--   );

-- CREATE POLICY "exercises_delete_policy" ON exercises
--   FOR DELETE USING (
--     organization_id = (SELECT public.get_user_org_id())
--   );

-- Policies para payments (comentado temporariamente)
-- CREATE POLICY "payments_select_policy" ON payments
--   FOR SELECT USING (
--     organization_id = (SELECT public.get_user_org_id())
--   );

-- CREATE POLICY "payments_insert_policy" ON payments
--   FOR INSERT WITH CHECK (
--     organization_id = (SELECT public.get_user_org_id())
--   );

-- CREATE POLICY "payments_update_policy" ON payments
--   FOR UPDATE USING (
--     organization_id = (SELECT public.get_user_org_id())
--   );

-- Policies para pain_maps (comentado temporariamente)
-- CREATE POLICY "pain_maps_select_policy" ON pain_maps
--   FOR SELECT USING (
--     organization_id = (SELECT public.get_user_org_id())
--   );

-- CREATE POLICY "pain_maps_insert_policy" ON pain_maps
--   FOR INSERT WITH CHECK (
--     organization_id = (SELECT public.get_user_org_id())
--   );

-- CREATE POLICY "pain_maps_update_policy" ON pain_maps
--   FOR UPDATE USING (
--     organization_id = (SELECT public.get_user_org_id())
--   );

-- CREATE POLICY "pain_maps_delete_policy" ON pain_maps
--   FOR DELETE USING (
--     organization_id = (SELECT public.get_user_org_id())
--   );

-- Policies para pain_map_points (via pain_maps) - COMENTADO TEMPORARIAMENTE
-- CREATE POLICY "pain_map_points_select_policy" ON pain_map_points
--   FOR SELECT USING (
--     EXISTS (
--       SELECT 1 FROM pain_maps 
--       WHERE pain_maps.id = pain_map_points.pain_map_id 
--       AND pain_maps.organization_id = (SELECT public.get_user_org_id())
--     )
--   );

-- CREATE POLICY "pain_map_points_insert_policy" ON pain_map_points
--   FOR INSERT WITH CHECK (
--     EXISTS (
--       SELECT 1 FROM pain_maps 
--       WHERE pain_maps.id = pain_map_id 
--       AND pain_maps.organization_id = (SELECT public.get_user_org_id())
--     )
--   );

-- CREATE POLICY "pain_map_points_update_policy" ON pain_map_points
--   FOR UPDATE USING (
--     EXISTS (
--       SELECT 1 FROM pain_maps 
--       WHERE pain_maps.id = pain_map_points.pain_map_id 
--       AND pain_maps.organization_id = (SELECT public.get_user_org_id())
--     )
--   );

-- CREATE POLICY "pain_map_points_delete_policy" ON pain_map_points
--   FOR DELETE USING (
--     EXISTS (
--       SELECT 1 FROM pain_maps 
--       WHERE pain_maps.id = pain_map_points.pain_map_id 
--       AND pain_maps.organization_id = (SELECT public.get_user_org_id())
--     )
--   );

-- Policies para session_packages (comentado temporariamente)
-- CREATE POLICY "session_packages_select_policy" ON session_packages
--   FOR SELECT USING (
--     organization_id = (SELECT public.get_user_org_id())
--   );
-- ... (todas as outras políticas comentadas)

-- Policies para patient_packages (comentado temporariamente)
-- ... (todas as políticas comentadas)

-- Policies para package_usage (comentado temporariamente)
-- ... (todas as políticas comentadas)

-- Policies para prescriptions (comentado temporariamente)
-- ... (todas as políticas comentadas)

-- Policies para prescription_items (comentado temporariamente)
-- ... (todas as políticas comentadas)

-- Policies para whatsapp_messages (comentado temporariamente)
-- ... (todas as políticas comentadas)

-- Policies para message_templates (comentado temporariamente)
-- ... (todas as políticas comentadas)

-- Policies para exercise_categories (comentado temporariamente)
-- ... (todas as políticas comentadas)

-- ========== PARTE 5: TRIGGERS PARA updated_at ==========

-- Função atualizada com search_path definido
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers para novas tabelas
DROP TRIGGER IF EXISTS update_exercises_updated_at ON exercises;
DROP TRIGGER IF EXISTS update_exercises_updated_at ON exercises;
CREATE TRIGGER update_exercises_updated_at
  BEFORE UPDATE ON exercises
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pain_maps_updated_at ON pain_maps;
CREATE TRIGGER update_pain_maps_updated_at
  BEFORE UPDATE ON pain_maps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_session_packages_updated_at ON session_packages;
CREATE TRIGGER update_session_packages_updated_at
  BEFORE UPDATE ON session_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_patient_packages_updated_at ON patient_packages;
CREATE TRIGGER update_patient_packages_updated_at
  BEFORE UPDATE ON patient_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_prescriptions_updated_at ON prescriptions;
CREATE TRIGGER update_prescriptions_updated_at
  BEFORE UPDATE ON prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_message_templates_updated_at ON message_templates;
CREATE TRIGGER update_message_templates_updated_at
  BEFORE UPDATE ON message_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Triggers faltantes em tabelas existentes
DO $$
BEGIN
  -- appointments
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_appointments_updated_at') THEN
    -- Adicionar coluna updated_at se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'updated_at') THEN
      ALTER TABLE appointments ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    CREATE TRIGGER update_appointments_updated_at
      BEFORE UPDATE ON appointments
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- pathologies
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'pathologies') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_pathologies_updated_at') THEN
      CREATE TRIGGER update_pathologies_updated_at
        BEFORE UPDATE ON pathologies
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
  END IF;

  -- surgeries
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'surgeries') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_surgeries_updated_at') THEN
      CREATE TRIGGER update_surgeries_updated_at
        BEFORE UPDATE ON surgeries
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
  END IF;

  -- backups
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'backups') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_backups_updated_at') THEN
      -- Adicionar coluna updated_at se não existir
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'backups' AND column_name = 'updated_at') THEN
        ALTER TABLE backups ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
      END IF;
      CREATE TRIGGER update_backups_updated_at
        BEFORE UPDATE ON backups
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
  END IF;

  -- audit_logs
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_audit_logs_updated_at') THEN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'updated_at') THEN
        ALTER TABLE audit_logs ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
      END IF;
      CREATE TRIGGER update_audit_logs_updated_at
        BEFORE UPDATE ON audit_logs
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
  END IF;

  -- waiting_list
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'waiting_list') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_waiting_list_updated_at') THEN
      CREATE TRIGGER update_waiting_list_updated_at
        BEFORE UPDATE ON waiting_list
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
  END IF;

  -- profiles
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_profiles_updated_at') THEN
    CREATE TRIGGER update_profiles_updated_at
      BEFORE UPDATE ON profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- patients
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_patients_updated_at') THEN
    -- Adicionar coluna updated_at se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'updated_at') THEN
      ALTER TABLE patients ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    CREATE TRIGGER update_patients_updated_at
      BEFORE UPDATE ON patients
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ========== PARTE 6: FUNÇÕES ÚTEIS ==========

-- Função para descontar sessão do pacote (comentado - função já existe)
-- CREATE OR REPLACE FUNCTION public.use_package_session(
--   p_patient_id UUID,
--   p_appointment_id UUID DEFAULT NULL,
--   p_session_id UUID DEFAULT NULL
-- )
-- RETURNS UUID
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = public
-- AS $$
-- DECLARE
--   v_package_id UUID;
--   v_usage_id UUID;
--   v_org_id UUID;
-- BEGIN
--   -- Pegar org_id do usuário
--   SELECT COALESCE(organization_id, org_id) INTO v_org_id FROM profiles WHERE id = auth.uid();
--   -- ... (função já existe em outra migration)
-- END;
-- $$;

-- Função para verificar conflito de agendamento (atualizada)
CREATE OR REPLACE FUNCTION public.check_appointment_conflict(
  p_therapist_id UUID,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_exclude_appointment_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM appointments
    WHERE therapist_id = p_therapist_id
      AND status NOT IN ('cancelled')
      AND id != COALESCE(p_exclude_appointment_id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND (
        (start_time, end_time) OVERLAPS (p_start_time, p_end_time)
      )
  );
END;
$$;

-- Função para obter saldo de pacotes do paciente
CREATE OR REPLACE FUNCTION public.get_patient_package_balance(p_patient_id UUID)
RETURNS TABLE (
  package_id UUID,
  package_name TEXT,
  sessions_remaining INTEGER,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pp.id,
    sp.name,
    (pp.sessions_purchased - pp.sessions_used)::INTEGER,
    pp.expires_at
  FROM patient_packages pp
  JOIN session_packages sp ON sp.id = pp.package_id
  WHERE pp.patient_id = p_patient_id
    AND pp.sessions_used < pp.sessions_purchased
    AND pp.expires_at > NOW()
  ORDER BY pp.expires_at ASC;
END;
$$;

-- Função para calcular evolução da dor
CREATE OR REPLACE FUNCTION public.calculate_pain_evolution(
  p_patient_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  avg_intensity DECIMAL,
  session_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pm.created_at::DATE as date,
    AVG(pmp.intensity)::DECIMAL as avg_intensity,
    COUNT(DISTINCT pm.id)::INTEGER as session_count
  FROM pain_maps pm
  JOIN pain_map_points pmp ON pmp.pain_map_id = pm.id
  WHERE pm.patient_id = p_patient_id
    AND pm.created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY pm.created_at::DATE
  ORDER BY pm.created_at::DATE;
END;
$$;

-- ========== PARTE 7: VIEWS ÚTEIS ==========

-- View de pacientes com saldo de pacotes
CREATE OR REPLACE VIEW patient_package_summary AS
SELECT 
  p.id as patient_id,
  COALESCE(p.name, '') as full_name,
  p.email,
  p.phone,
  COALESCE(SUM(pp.sessions_purchased - pp.sessions_used) FILTER (WHERE pp.expires_at > NOW()), 0) as sessions_available,
  COUNT(pp.id) FILTER (WHERE pp.expires_at > NOW() AND pp.sessions_used < pp.sessions_purchased) as active_packages
FROM patients p
LEFT JOIN patient_packages pp ON pp.patient_id = p.id
GROUP BY p.id, COALESCE(p.name, ''), p.email, p.phone;

-- View de agendamentos do dia com status de pacote
CREATE OR REPLACE VIEW today_appointments_with_packages AS
SELECT 
  a.*,
  COALESCE(p.name, '') as patient_name,
  p.phone as patient_phone,
  COALESCE(
    (SELECT SUM(sessions_purchased - sessions_used) 
     FROM patient_packages 
     WHERE patient_id = a.patient_id 
     AND expires_at > NOW() 
     AND sessions_used < sessions_purchased
    ), 0
  ) as patient_package_balance
FROM appointments a
JOIN patients p ON p.id = a.patient_id
WHERE a.appointment_date = CURRENT_DATE
ORDER BY a.appointment_date, a.start_time;

-- ========== PARTE 8: SEED DATA ==========

-- Inserir categorias de exercícios padrão (globais)
INSERT INTO exercise_categories (name, description, icon)
VALUES
  ('Fortalecimento', 'Exercícios para ganho de força muscular', 'dumbbell'),
  ('Alongamento', 'Exercícios de flexibilidade', 'stretch'),
  ('Mobilidade', 'Exercícios para amplitude de movimento', 'move'),
  ('Equilíbrio', 'Exercícios proprioceptivos', 'scale'),
  ('Cardio', 'Exercícios cardiovasculares', 'heart'),
  ('Funcional', 'Exercícios funcionais', 'activity'),
  ('Respiratório', 'Exercícios respiratórios', 'wind'),
  ('Relaxamento', 'Exercícios de relaxamento', 'moon')
ON CONFLICT DO NOTHING;

-- Inserir templates de mensagens padrão
INSERT INTO message_templates (name, category, message, variables)
VALUES
  ('Confirmação de Agendamento', 'agendamento', 'Olá {{nome}}! Sua consulta está confirmada para {{data}} às {{hora}}. Endereço: {{endereco}}. Caso precise reagendar, entre em contato.', ARRAY['nome', 'data', 'hora', 'endereco']),
  ('Lembrete 24h', 'lembrete', 'Olá {{nome}}! Lembramos que sua consulta é amanhã, {{data}}, às {{hora}}. Confirme sua presença respondendo esta mensagem.', ARRAY['nome', 'data', 'hora']),
  ('Lembrete 2h', 'lembrete', 'Olá {{nome}}! Sua consulta é em 2 horas, às {{hora}}. Estamos te esperando!', ARRAY['nome', 'hora']),
  ('Aniversário', 'relacionamento', 'Feliz Aniversário, {{nome}}! 🎂 A equipe deseja um dia especial para você!', ARRAY['nome']),
  ('Exercícios Prescritos', 'tratamento', 'Olá {{nome}}! Sua nova prescrição de exercícios está disponível. Acesse o link para ver: {{link}}', ARRAY['nome', 'link'])
ON CONFLICT DO NOTHING;

-- ========== COMENTÁRIOS ==========

COMMENT ON TABLE exercises IS 'Biblioteca de exercícios disponíveis para prescrição';
COMMENT ON TABLE payments IS 'Pagamentos realizados pelos pacientes';
COMMENT ON TABLE pain_maps IS 'Mapas de dor corporal registrados nas sessões';
COMMENT ON TABLE pain_map_points IS 'Pontos individuais de dor em um mapa';
COMMENT ON TABLE session_packages IS 'Templates de pacotes de sessões disponíveis para venda';
COMMENT ON TABLE patient_packages IS 'Pacotes adquiridos pelos pacientes';
COMMENT ON TABLE package_usage IS 'Registro de uso das sessões dos pacotes';
COMMENT ON TABLE prescriptions IS 'Prescrições de exercícios para pacientes';
COMMENT ON TABLE prescription_items IS 'Exercícios individuais de uma prescrição';
COMMENT ON TABLE whatsapp_messages IS 'Histórico de mensagens WhatsApp enviadas/recebidas';
COMMENT ON TABLE message_templates IS 'Templates de mensagens para automação';
COMMENT ON TABLE exercise_categories IS 'Categorias para organização dos exercícios';

-- COMMENT ON FUNCTION get_user_org_id IS 'Retorna o org_id do usuário autenticado';
COMMENT ON FUNCTION use_package_session IS 'Desconta uma sessão do pacote ativo do paciente';
COMMENT ON FUNCTION get_patient_package_balance IS 'Retorna saldo de pacotes do paciente';
COMMENT ON FUNCTION calculate_pain_evolution IS 'Calcula evolução da dor ao longo do tempo';



