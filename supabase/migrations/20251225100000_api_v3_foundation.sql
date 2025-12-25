-- =====================================================
-- FisioFlow v3.0 - API Foundation Migration
-- Criado em: 25/12/2025
-- Descrição: Tabelas necessárias para API REST v3.0
-- =====================================================

-- ========== PAIN MAPS ==========

-- Tabela de mapas de dor
CREATE TABLE IF NOT EXISTS pain_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  view TEXT NOT NULL CHECK (view IN ('front', 'back')),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pontos de dor no mapa
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
CREATE INDEX IF NOT EXISTS idx_pain_maps_session ON pain_maps(session_id);
CREATE INDEX IF NOT EXISTS idx_pain_maps_patient ON pain_maps(patient_id);
CREATE INDEX IF NOT EXISTS idx_pain_maps_org ON pain_maps(organization_id);
CREATE INDEX IF NOT EXISTS idx_pain_map_points_map ON pain_map_points(pain_map_id);

-- ========== WAITLIST (Lista de Espera) ==========

-- Tabela de lista de espera
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  preferred_days TEXT[] DEFAULT '{}',
  preferred_periods TEXT[] DEFAULT '{}',
  preferred_therapist_id UUID REFERENCES profiles(id),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'offered', 'scheduled', 'removed')),
  refusal_count INTEGER DEFAULT 0,
  offered_slot TIMESTAMPTZ,
  offered_at TIMESTAMPTZ,
  offer_expires_at TIMESTAMPTZ,
  removed_at TIMESTAMPTZ,
  notes TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Histórico de ofertas da lista de espera
CREATE TABLE IF NOT EXISTS waitlist_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waitlist_id UUID NOT NULL REFERENCES waitlist(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id),
  offered_slot TIMESTAMPTZ NOT NULL,
  response TEXT CHECK (response IN ('accepted', 'rejected', 'expired', 'pending')),
  responded_at TIMESTAMPTZ,
  offered_by UUID REFERENCES profiles(id),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para waitlist
CREATE INDEX IF NOT EXISTS idx_waitlist_patient ON waitlist(patient_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_priority ON waitlist(priority);
CREATE INDEX IF NOT EXISTS idx_waitlist_org ON waitlist(organization_id);

-- ========== PACKAGES (Pacotes de Sessões) ==========

-- Templates de pacotes
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

-- Pacotes comprados por pacientes
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

-- Histórico de uso de pacotes
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
CREATE INDEX IF NOT EXISTS idx_package_usage_package ON package_usage(patient_package_id);

-- ========== WHATSAPP ==========

-- Conexões WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_name TEXT NOT NULL,
  phone_number TEXT,
  is_connected BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'disconnected',
  api_url TEXT,
  api_key TEXT,
  last_seen_at TIMESTAMPTZ,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id)
);

-- Histórico de mensagens WhatsApp
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

-- Templates de mensagens
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

-- Índices para whatsapp
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_patient ON whatsapp_messages(patient_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone ON whatsapp_messages(phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_org ON whatsapp_messages(organization_id);

-- ========== MEDICAL RECORDS (Prontuário) ==========

-- Tabela de prontuário médico
CREATE TABLE IF NOT EXISTS medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  chief_complaint TEXT,
  history_current TEXT,
  history_past TEXT,
  medications TEXT[] DEFAULT '{}',
  allergies TEXT[] DEFAULT '{}',
  physical_activity TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(patient_id)
);

-- Patologias do paciente
CREATE TABLE IF NOT EXISTS patient_pathologies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icd_code TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'treated', 'monitoring')),
  diagnosed_at DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cirurgias do paciente
CREATE TABLE IF NOT EXISTS patient_surgeries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  surgery_date DATE,
  surgeon TEXT,
  hospital TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Metas de tratamento
CREATE TABLE IF NOT EXISTS treatment_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'achieved')),
  target_date DATE,
  achieved_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para medical records
CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_pathologies_patient ON patient_pathologies(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_surgeries_patient ON patient_surgeries(patient_id);
CREATE INDEX IF NOT EXISTS idx_treatment_goals_patient ON treatment_goals(patient_id);

-- ========== SESSIONS (Evoluções) ==========

-- Adicionar campos faltantes na tabela sessions se existir
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sessions') THEN
    -- Adicionar campos se não existirem
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'subjective') THEN
      ALTER TABLE sessions ADD COLUMN subjective TEXT;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'objective') THEN
      ALTER TABLE sessions ADD COLUMN objective TEXT;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'assessment') THEN
      ALTER TABLE sessions ADD COLUMN assessment TEXT;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'plan') THEN
      ALTER TABLE sessions ADD COLUMN plan TEXT;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'eva_score') THEN
      ALTER TABLE sessions ADD COLUMN eva_score INTEGER CHECK (eva_score >= 0 AND eva_score <= 10);
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'started_at') THEN
      ALTER TABLE sessions ADD COLUMN started_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'completed_at') THEN
      ALTER TABLE sessions ADD COLUMN completed_at TIMESTAMPTZ;
    END IF;
  ELSE
    -- Criar tabela sessions se não existir
    CREATE TABLE sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
      patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      therapist_id UUID REFERENCES profiles(id),
      status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
      subjective TEXT,
      objective TEXT,
      assessment TEXT,
      plan TEXT,
      eva_score INTEGER CHECK (eva_score >= 0 AND eva_score <= 10),
      started_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

-- Anexos de sessão
CREATE TABLE IF NOT EXISTS session_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_attachments_session ON session_attachments(session_id);

-- ========== EXERCISES & PRESCRIPTIONS ==========

-- Categorias de exercícios
CREATE TABLE IF NOT EXISTS exercise_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar campos faltantes em exercises se existir
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'exercises') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'exercises' AND column_name = 'difficulty') THEN
      ALTER TABLE exercises ADD COLUMN difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard'));
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'exercises' AND column_name = 'is_active') THEN
      ALTER TABLE exercises ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'exercises' AND column_name = 'deleted_at') THEN
      ALTER TABLE exercises ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;
  END IF;
END $$;

-- Prescrições
CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  therapist_id UUID REFERENCES profiles(id),
  frequency TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  deactivated_at TIMESTAMPTZ,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Itens da prescrição
CREATE TABLE IF NOT EXISTS prescription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id),
  sets INTEGER NOT NULL CHECK (sets > 0),
  reps INTEGER NOT NULL CHECK (reps > 0),
  hold_seconds INTEGER,
  notes TEXT,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescription_items_prescription ON prescription_items(prescription_id);

-- ========== PAYMENTS ==========

-- Adicionar campos faltantes em payments se existir
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payments') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'method') THEN
      ALTER TABLE payments ADD COLUMN method TEXT CHECK (method IN ('pix', 'credit_card', 'debit_card', 'cash', 'transfer'));
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'receipt_url') THEN
      ALTER TABLE payments ADD COLUMN receipt_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'paid_at') THEN
      ALTER TABLE payments ADD COLUMN paid_at TIMESTAMPTZ;
    END IF;
  END IF;
END $$;

-- ========== RLS POLICIES ==========

-- Habilitar RLS em todas as novas tabelas
ALTER TABLE pain_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE pain_map_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_pathologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_surgeries ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_items ENABLE ROW LEVEL SECURITY;

-- Policies básicas (acesso por organização)
CREATE POLICY "Users can access their organization's pain_maps" ON pain_maps
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can access their organization's waitlist" ON waitlist
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can access their organization's packages" ON session_packages
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can access their organization's patient_packages" ON patient_packages
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can access their organization's whatsapp_messages" ON whatsapp_messages
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can access their organization's medical_records" ON medical_records
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can access their organization's prescriptions" ON prescriptions
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- ========== TRIGGERS ==========

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em todas as tabelas com updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'pain_maps', 'waitlist', 'session_packages', 'patient_packages',
    'whatsapp_connections', 'message_templates', 'medical_records',
    'patient_pathologies', 'treatment_goals', 'prescriptions'
  ]
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
      CREATE TRIGGER update_%I_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    ', t, t, t, t);
  END LOOP;
END $$;

-- ========== SEED DATA ==========

-- Inserir categorias de exercícios padrão
INSERT INTO exercise_categories (name, description, icon) VALUES
  ('Fortalecimento', 'Exercícios para ganho de força muscular', 'dumbbell'),
  ('Alongamento', 'Exercícios de flexibilidade e alongamento', 'stretch'),
  ('Mobilidade', 'Exercícios para amplitude de movimento', 'move'),
  ('Equilíbrio', 'Exercícios de propriocepção e equilíbrio', 'scale'),
  ('Cardio', 'Exercícios cardiovasculares', 'heart'),
  ('Funcional', 'Exercícios funcionais do dia a dia', 'activity'),
  ('Respiratório', 'Exercícios respiratórios', 'wind'),
  ('Relaxamento', 'Exercícios de relaxamento e recuperação', 'moon')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE pain_maps IS 'Mapas de dor corporal registrados nas sessões';
COMMENT ON TABLE waitlist IS 'Lista de espera para agendamentos';
COMMENT ON TABLE session_packages IS 'Templates de pacotes de sessões disponíveis';
COMMENT ON TABLE patient_packages IS 'Pacotes adquiridos pelos pacientes';
COMMENT ON TABLE whatsapp_messages IS 'Histórico de mensagens WhatsApp';
COMMENT ON TABLE prescriptions IS 'Prescrições de exercícios para pacientes';

