-- Criar tabela de prescrições de exercícios
CREATE TABLE public.exercise_prescriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  therapist_id UUID REFERENCES public.profiles(id),
  qr_code TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL DEFAULT 'Prescrição de Reabilitação',
  exercises JSONB NOT NULL DEFAULT '[]',
  notes TEXT,
  validity_days INTEGER DEFAULT 30,
  valid_until DATE,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'concluido', 'expirado', 'cancelado')),
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  completed_exercises JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  organization_id UUID REFERENCES public.organizations(id)
);

-- Enable RLS
ALTER TABLE public.exercise_prescriptions ENABLE ROW LEVEL SECURITY;

-- Políticas para terapeutas e admins
CREATE POLICY "Admins e fisios gerenciam prescrições"
ON public.exercise_prescriptions
FOR ALL
USING (user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]));

-- Política para acesso público via QR code (somente leitura)
CREATE POLICY "Acesso público via QR code"
ON public.exercise_prescriptions
FOR SELECT
USING (true);

-- Política para atualizar exercícios concluídos (paciente via link público)
CREATE POLICY "Pacientes podem marcar exercícios concluídos"
ON public.exercise_prescriptions
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_exercise_prescriptions_updated_at
  BEFORE UPDATE ON public.exercise_prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices
CREATE INDEX idx_prescriptions_patient ON public.exercise_prescriptions(patient_id);
CREATE INDEX idx_prescriptions_qr_code ON public.exercise_prescriptions(qr_code);
CREATE INDEX idx_prescriptions_status ON public.exercise_prescriptions(status);