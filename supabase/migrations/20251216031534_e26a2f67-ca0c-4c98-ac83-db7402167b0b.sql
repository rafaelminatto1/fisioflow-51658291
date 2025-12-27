-- Tabela para assinaturas digitais de documentos
CREATE TABLE IF NOT EXISTS public.document_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL,
  document_type TEXT NOT NULL,
  document_title TEXT NOT NULL,
  signer_name TEXT NOT NULL,
  signer_id UUID REFERENCES auth.users(id),
  signature_image TEXT NOT NULL,
  signature_hash TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  organization_id UUID REFERENCES organizations(id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_document_signatures_document_id ON public.document_signatures(document_id);
CREATE INDEX IF NOT EXISTS idx_document_signatures_signer_id ON public.document_signatures(signer_id);
CREATE INDEX IF NOT EXISTS idx_document_signatures_hash ON public.document_signatures(signature_hash);

-- RLS
ALTER TABLE public.document_signatures ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DROP POLICY IF EXISTS "Users can view signatures from their organization" ON public.document_signatures;
CREATE POLICY "Users can view signatures from their organization"
ON public.document_signatures
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Fisio and admin can create signatures" ON public.document_signatures;
CREATE POLICY "Fisio and admin can create signatures"
ON public.document_signatures
FOR INSERT
WITH CHECK (
  public.user_is_fisio_or_admin(auth.uid())
);

-- Tabela de gamificação de pacientes (se não existir)
CREATE TABLE IF NOT EXISTS public.patient_gamification (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  achievements JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(patient_id)
);

-- Tabela de transações de XP
CREATE TABLE IF NOT EXISTS public.xp_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  xp_amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para gamificação
ALTER TABLE public.patient_gamification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view patient gamification" ON public.patient_gamification;
CREATE POLICY "Anyone can view patient gamification"
ON public.patient_gamification
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Fisio and admin can manage gamification" ON public.patient_gamification;
CREATE POLICY "Fisio and admin can manage gamification"
ON public.patient_gamification
FOR ALL
USING (public.user_is_fisio_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Anyone can view xp transactions" ON public.xp_transactions;
CREATE POLICY "Anyone can view xp transactions"
ON public.xp_transactions
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Fisio and admin can create xp transactions" ON public.xp_transactions;
CREATE POLICY "Fisio and admin can create xp transactions"
ON public.xp_transactions
FOR INSERT
WITH CHECK (public.user_is_fisio_or_admin(auth.uid()));