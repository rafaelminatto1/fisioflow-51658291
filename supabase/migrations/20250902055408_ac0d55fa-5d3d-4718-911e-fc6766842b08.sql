-- Expandir tabela de pacientes com campos necessários
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS cpf TEXT,
ADD COLUMN IF NOT EXISTS rg TEXT,
ADD COLUMN IF NOT EXISTS insurance_plan TEXT,
ADD COLUMN IF NOT EXISTS insurance_number TEXT,
ADD COLUMN IF NOT EXISTS insurance_validity DATE,
ADD COLUMN IF NOT EXISTS marital_status TEXT,
ADD COLUMN IF NOT EXISTS profession TEXT,
ADD COLUMN IF NOT EXISTS education_level TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_relationship TEXT;

-- Criar tabela para documentos dos pacientes
CREATE TABLE IF NOT EXISTS public.patient_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('identity', 'medical_exam', 'insurance', 'consent', 'prescription', 'other')),
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para consentimentos LGPD
CREATE TABLE IF NOT EXISTS public.patient_consents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('data_processing', 'image_usage', 'treatment_terms', 'communication')),
  granted BOOLEAN NOT NULL DEFAULT false,
  granted_at TIMESTAMP WITH TIME ZONE,
  granted_by TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para prontuários SOAP
CREATE TABLE IF NOT EXISTS public.soap_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id),
  session_number INTEGER DEFAULT 1,
  subjective TEXT, -- Queixa do paciente
  objective JSONB, -- Exame físico estruturado
  assessment TEXT, -- Avaliação/Diagnóstico
  plan JSONB, -- Plano de tratamento
  vital_signs JSONB, -- Sinais vitais
  functional_tests JSONB, -- Testes funcionais
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  signed_at TIMESTAMP WITH TIME ZONE,
  signature_hash TEXT
);

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soap_records ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para patient_documents
CREATE POLICY "Authenticated users can view patient documents"
ON public.patient_documents FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create patient documents"
ON public.patient_documents FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update patient documents"
ON public.patient_documents FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete patient documents"
ON public.patient_documents FOR DELETE
TO authenticated
USING (true);

-- Políticas RLS para patient_consents
CREATE POLICY "Authenticated users can view patient consents"
ON public.patient_consents FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create patient consents"
ON public.patient_consents FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update patient consents"
ON public.patient_consents FOR UPDATE
TO authenticated
USING (true);

-- Políticas RLS para soap_records
CREATE POLICY "Authenticated users can view soap records"
ON public.soap_records FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create soap records"
ON public.soap_records FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update soap records"
ON public.soap_records FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete soap records"
ON public.soap_records FOR DELETE
TO authenticated
USING (true);

-- Triggers para updated_at
CREATE TRIGGER update_patient_documents_updated_at
  BEFORE UPDATE ON public.patient_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_soap_records_updated_at
  BEFORE UPDATE ON public.soap_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_patient_documents_patient_id ON public.patient_documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_documents_type ON public.patient_documents(type);
CREATE INDEX IF NOT EXISTS idx_patient_consents_patient_id ON public.patient_consents(patient_id);
CREATE INDEX IF NOT EXISTS idx_soap_records_patient_id ON public.soap_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_patients_cpf ON public.patients(cpf);
CREATE INDEX IF NOT EXISTS idx_patients_name_search ON public.patients USING gin(to_tsvector('portuguese', name));

-- Criar bucket para documentos dos pacientes
INSERT INTO storage.buckets (id, name, public) 
VALUES ('patient-documents', 'patient-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas para storage
CREATE POLICY "Authenticated users can upload patient documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'patient-documents');

CREATE POLICY "Authenticated users can view patient documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'patient-documents');

CREATE POLICY "Authenticated users can update patient documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'patient-documents');

CREATE POLICY "Authenticated users can delete patient documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'patient-documents');