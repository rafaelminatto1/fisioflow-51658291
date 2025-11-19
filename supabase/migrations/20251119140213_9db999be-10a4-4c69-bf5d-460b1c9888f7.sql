-- ============================================
-- SPRINT 1: FUNCIONALIDADES CRÍTICAS
-- Migration segura com verificações
-- ============================================

-- 1. PACOTES DE SESSÕES
DO $$ BEGIN
  CREATE TYPE package_status AS ENUM ('ativo', 'consumido', 'expirado', 'cancelado');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.session_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  package_name TEXT NOT NULL,
  total_sessions INT NOT NULL CHECK (total_sessions > 0),
  used_sessions INT NOT NULL DEFAULT 0 CHECK (used_sessions >= 0),
  remaining_sessions INT GENERATED ALWAYS AS (total_sessions - used_sessions) STORED,
  total_value NUMERIC(10, 2) NOT NULL CHECK (total_value > 0),
  discount_value NUMERIC(10, 2) DEFAULT 0,
  final_value NUMERIC(10, 2) NOT NULL CHECK (final_value > 0),
  value_per_session NUMERIC(10, 2) GENERATED ALWAYS AS (final_value / total_sessions) STORED,
  payment_status TEXT NOT NULL DEFAULT 'pendente',
  payment_method TEXT,
  paid_at TIMESTAMPTZ,
  status package_status NOT NULL DEFAULT 'ativo',
  valid_until DATE,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_packages_org ON public.session_packages(organization_id);
CREATE INDEX IF NOT EXISTS idx_packages_patient ON public.session_packages(patient_id);
CREATE INDEX IF NOT EXISTS idx_packages_status ON public.session_packages(status);

-- 2. PRÉ-CADASTRO DE PACIENTES
DO $$ BEGIN
  CREATE TYPE precadastro_status AS ENUM ('pendente', 'concluido', 'expirado', 'cancelado');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.patient_precadastro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  
  full_name TEXT,
  email TEXT,
  phone TEXT,
  cpf TEXT,
  birth_date DATE,
  gender TEXT,
  address TEXT,
  emergency_contact TEXT,
  emergency_relationship TEXT,
  
  main_complaint TEXT,
  medical_history TEXT,
  current_medications TEXT,
  allergies TEXT,
  
  insurance_plan TEXT,
  insurance_number TEXT,
  
  status precadastro_status NOT NULL DEFAULT 'pendente',
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_precadastro_token ON public.patient_precadastro(token);
CREATE INDEX IF NOT EXISTS idx_precadastro_org ON public.patient_precadastro(organization_id);
CREATE INDEX IF NOT EXISTS idx_precadastro_status ON public.patient_precadastro(status);

-- 3. PESQUISAS DE SATISFAÇÃO (NPS)
CREATE TABLE IF NOT EXISTS public.satisfaction_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  therapist_id UUID,
  
  nps_score INT CHECK (nps_score >= 0 AND nps_score <= 10),
  
  q_care_quality INT CHECK (q_care_quality >= 1 AND q_care_quality <= 5),
  q_professionalism INT CHECK (q_professionalism >= 1 AND q_professionalism <= 5),
  q_facility_cleanliness INT CHECK (q_facility_cleanliness >= 1 AND q_facility_cleanliness <= 5),
  q_scheduling_ease INT CHECK (q_scheduling_ease >= 1 AND q_scheduling_ease <= 5),
  q_communication INT CHECK (q_communication >= 1 AND q_communication <= 5),
  
  comments TEXT,
  suggestions TEXT,
  
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  response_time_hours INT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_surveys_org ON public.satisfaction_surveys(organization_id);
CREATE INDEX IF NOT EXISTS idx_surveys_patient ON public.satisfaction_surveys(patient_id);
CREATE INDEX IF NOT EXISTS idx_surveys_therapist ON public.satisfaction_surveys(therapist_id);
CREATE INDEX IF NOT EXISTS idx_surveys_responded ON public.satisfaction_surveys(responded_at);

-- 4. BIBLIOTECA DE MATERIAIS CLÍNICOS
DO $$ BEGIN
  CREATE TYPE material_specialty AS ENUM ('ortopedia', 'neurologia', 'geriatria', 'esportiva', 'pediatria', 'respiratoria', 'geral');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.clinical_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  specialty material_specialty NOT NULL DEFAULT 'geral',
  
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INT,
  file_type TEXT,
  
  is_public BOOLEAN NOT NULL DEFAULT false,
  download_count INT NOT NULL DEFAULT 0,
  
  tags TEXT[],
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_materials_org ON public.clinical_materials(organization_id);
CREATE INDEX IF NOT EXISTS idx_materials_category ON public.clinical_materials(category);
CREATE INDEX IF NOT EXISTS idx_materials_specialty ON public.clinical_materials(specialty);
CREATE INDEX IF NOT EXISTS idx_materials_public ON public.clinical_materials(is_public);

-- 5. LOG DE COMUNICAÇÕES
DO $$ BEGIN
  CREATE TYPE communication_type AS ENUM ('whatsapp', 'sms', 'email', 'push');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE communication_status AS ENUM ('pendente', 'enviado', 'entregue', 'lido', 'falha');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.communication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  
  type communication_type NOT NULL,
  template_name TEXT,
  subject TEXT,
  body TEXT NOT NULL,
  recipient TEXT NOT NULL,
  
  status communication_status NOT NULL DEFAULT 'pendente',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  
  response_received BOOLEAN DEFAULT false,
  response_text TEXT,
  response_at TIMESTAMPTZ,
  
  provider TEXT,
  external_id TEXT,
  cost NUMERIC(10, 4),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comm_logs_org ON public.communication_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_comm_logs_patient ON public.communication_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_comm_logs_status ON public.communication_logs(status);
CREATE INDEX IF NOT EXISTS idx_comm_logs_type ON public.communication_logs(type);
CREATE INDEX IF NOT EXISTS idx_comm_logs_sent ON public.communication_logs(sent_at);

-- 6. TRIGGERS

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_packages_updated_at ON public.session_packages;
CREATE TRIGGER update_packages_updated_at
  BEFORE UPDATE ON public.session_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_precadastro_updated_at ON public.patient_precadastro;
CREATE TRIGGER update_precadastro_updated_at
  BEFORE UPDATE ON public.patient_precadastro
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_surveys_updated_at ON public.satisfaction_surveys;
CREATE TRIGGER update_surveys_updated_at
  BEFORE UPDATE ON public.satisfaction_surveys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_materials_updated_at ON public.clinical_materials;
CREATE TRIGGER update_materials_updated_at
  BEFORE UPDATE ON public.clinical_materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. FUNÇÃO PARA USAR SESSÃO DO PACOTE
CREATE OR REPLACE FUNCTION use_package_session(_package_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _remaining INT;
BEGIN
  UPDATE session_packages
  SET used_sessions = used_sessions + 1,
      updated_at = NOW()
  WHERE id = _package_id
    AND status = 'ativo'
    AND used_sessions < total_sessions
    AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
  RETURNING remaining_sessions INTO _remaining;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  IF _remaining = 0 THEN
    UPDATE session_packages
    SET status = 'consumido'
    WHERE id = _package_id;
  END IF;
  
  RETURN true;
END;
$$;

-- 8. FUNÇÃO PARA CALCULAR TEMPO DE RESPOSTA
CREATE OR REPLACE FUNCTION calculate_survey_response_time()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.responded_at IS NOT NULL AND OLD.responded_at IS NULL THEN
    NEW.response_time_hours := EXTRACT(EPOCH FROM (NEW.responded_at - NEW.sent_at)) / 3600;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calc_survey_response_time ON public.satisfaction_surveys;
CREATE TRIGGER calc_survey_response_time
  BEFORE UPDATE ON public.satisfaction_surveys
  FOR EACH ROW EXECUTE FUNCTION calculate_survey_response_time();

-- 9. RLS POLICIES

ALTER TABLE public.session_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_precadastro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.satisfaction_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;

-- Session Packages
DROP POLICY IF EXISTS "Membros da org gerenciam pacotes" ON public.session_packages;
CREATE POLICY "Membros da org gerenciam pacotes"
ON public.session_packages
FOR ALL
USING (user_belongs_to_organization(auth.uid(), organization_id))
WITH CHECK (user_belongs_to_organization(auth.uid(), organization_id));

-- Patient Precadastro
DROP POLICY IF EXISTS "Qualquer um pode criar pré-cadastro" ON public.patient_precadastro;
CREATE POLICY "Qualquer um pode criar pré-cadastro"
ON public.patient_precadastro
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Público pode ler via token" ON public.patient_precadastro;
CREATE POLICY "Público pode ler via token"
ON public.patient_precadastro
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Público pode atualizar via token" ON public.patient_precadastro;
CREATE POLICY "Público pode atualizar via token"
ON public.patient_precadastro
FOR UPDATE
USING (true);

-- Satisfaction Surveys
DROP POLICY IF EXISTS "Admins e fisios gerenciam pesquisas" ON public.satisfaction_surveys;
CREATE POLICY "Admins e fisios gerenciam pesquisas"
ON public.satisfaction_surveys
FOR ALL
USING (
  user_belongs_to_organization(auth.uid(), organization_id) 
  AND user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
);

DROP POLICY IF EXISTS "Pacientes veem suas pesquisas" ON public.satisfaction_surveys;
CREATE POLICY "Pacientes veem suas pesquisas"
ON public.satisfaction_surveys
FOR SELECT
USING (
  patient_id IN (
    SELECT p.id FROM patients p
    JOIN profiles pr ON pr.id = p.profile_id
    WHERE pr.user_id = auth.uid()
  )
);

-- Clinical Materials
DROP POLICY IF EXISTS "Materiais públicos visíveis" ON public.clinical_materials;
CREATE POLICY "Materiais públicos visíveis"
ON public.clinical_materials
FOR SELECT
USING (is_public = true OR organization_id IS NULL);

DROP POLICY IF EXISTS "Membros da org veem materiais" ON public.clinical_materials;
CREATE POLICY "Membros da org veem materiais"
ON public.clinical_materials
FOR SELECT
USING (
  organization_id IS NULL 
  OR user_belongs_to_organization(auth.uid(), organization_id)
);

DROP POLICY IF EXISTS "Admins e fisios gerenciam materiais" ON public.clinical_materials;
CREATE POLICY "Admins e fisios gerenciam materiais"
ON public.clinical_materials
FOR ALL
USING (
  (organization_id IS NULL AND user_is_admin(auth.uid()))
  OR (user_belongs_to_organization(auth.uid(), organization_id) 
      AND user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]))
);

-- Communication Logs
DROP POLICY IF EXISTS "Membros veem logs de comunicação" ON public.communication_logs;
CREATE POLICY "Membros veem logs de comunicação"
ON public.communication_logs
FOR SELECT
USING (user_belongs_to_organization(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Sistema cria logs de comunicação" ON public.communication_logs;
CREATE POLICY "Sistema cria logs de comunicação"
ON public.communication_logs
FOR INSERT
WITH CHECK (true);