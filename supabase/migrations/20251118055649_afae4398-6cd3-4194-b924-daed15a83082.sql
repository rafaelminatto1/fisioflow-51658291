-- Criar bucket de storage para documentos de pacientes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'patient-documents',
  'patient-documents',
  false,
  10485760, -- 10MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- Políticas RLS para patient-documents
CREATE POLICY "Terapeutas podem fazer upload de documentos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'patient-documents' AND
  user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
);

CREATE POLICY "Terapeutas podem ver documentos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'patient-documents' AND
  user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
);

CREATE POLICY "Terapeutas podem atualizar documentos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'patient-documents' AND
  user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
);

CREATE POLICY "Terapeutas podem deletar documentos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'patient-documents' AND
  user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
);

-- Tabela para metadados de documentos
CREATE TABLE public.patient_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('laudo', 'exame', 'receita', 'termo', 'outro')),
  description TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para patient_documents
ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Terapeutas gerenciam documentos"
ON public.patient_documents
FOR ALL
TO authenticated
USING (
  user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
);

-- Índices
CREATE INDEX idx_patient_documents_patient_id ON public.patient_documents(patient_id);
CREATE INDEX idx_patient_documents_category ON public.patient_documents(category);

-- Trigger para updated_at
CREATE TRIGGER update_patient_documents_updated_at
  BEFORE UPDATE ON public.patient_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela para biblioteca de condutas comuns
CREATE TABLE public.conduct_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  conduct_text TEXT NOT NULL,
  category TEXT NOT NULL,
  organization_id UUID REFERENCES public.organizations(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para conduct_library
ALTER TABLE public.conduct_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Terapeutas veem condutas da org"
ON public.conduct_library
FOR SELECT
TO authenticated
USING (
  (organization_id IS NULL) OR 
  user_belongs_to_organization(auth.uid(), organization_id)
);

CREATE POLICY "Terapeutas gerenciam condutas da org"
ON public.conduct_library
FOR ALL
TO authenticated
USING (
  ((organization_id IS NULL) AND user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])) OR
  (user_belongs_to_organization(auth.uid(), organization_id) AND user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]))
);

-- Índices
CREATE INDEX idx_conduct_library_category ON public.conduct_library(category);
CREATE INDEX idx_conduct_library_org ON public.conduct_library(organization_id);

-- Trigger para updated_at
CREATE TRIGGER update_conduct_library_updated_at
  BEFORE UPDATE ON public.conduct_library
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar campos ao vouchers para melhor controle de pacotes
ALTER TABLE public.vouchers ADD COLUMN IF NOT EXISTS sessions_per_week INTEGER DEFAULT 2;
ALTER TABLE public.vouchers ADD COLUMN IF NOT EXISTS duration_weeks INTEGER;
ALTER TABLE public.vouchers ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT false;

-- Adicionar campos ao user_vouchers para tracking
ALTER TABLE public.user_vouchers ADD COLUMN IF NOT EXISTS first_session_date TIMESTAMPTZ;
ALTER TABLE public.user_vouchers ADD COLUMN IF NOT EXISTS last_session_date TIMESTAMPTZ;
ALTER TABLE public.user_vouchers ADD COLUMN IF NOT EXISTS sessions_per_week_actual NUMERIC(3,1);

-- Comentários para documentação
COMMENT ON TABLE public.patient_documents IS 'Armazena metadados de documentos anexados aos prontuários';
COMMENT ON TABLE public.conduct_library IS 'Biblioteca de condutas fisioterapêuticas reutilizáveis';
COMMENT ON COLUMN public.vouchers.sessions_per_week IS 'Frequência recomendada de sessões por semana';
COMMENT ON COLUMN public.vouchers.duration_weeks IS 'Duração estimada do pacote em semanas';