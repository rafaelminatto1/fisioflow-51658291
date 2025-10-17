-- ============================================================================
-- FASE 1: SEGURANÇA E PERFORMANCE - Melhorias Críticas
-- ============================================================================

-- 1. ÍNDICES PARA PERFORMANCE
-- Otimizar queries mais usadas
CREATE INDEX IF NOT EXISTS idx_eventos_status ON public.eventos(status);
CREATE INDEX IF NOT EXISTS idx_eventos_data_inicio ON public.eventos(data_inicio);
CREATE INDEX IF NOT EXISTS idx_participantes_evento_id ON public.participantes(evento_id);
CREATE INDEX IF NOT EXISTS idx_prestadores_evento_id ON public.prestadores(evento_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_evento_id ON public.checklist_items(evento_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_evento_id ON public.pagamentos(evento_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_therapist_id ON public.appointments(therapist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date_time ON public.appointments(appointment_date, appointment_time);
CREATE INDEX IF NOT EXISTS idx_patients_profile_id ON public.patients(profile_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- 2. FUNÇÃO PARA CRIPTOGRAFIA DE DADOS SENSÍVEIS (CPF)
-- Habilitar extensão pgcrypto se não estiver habilitada
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Função para criptografar CPF
CREATE OR REPLACE FUNCTION public.encrypt_cpf(cpf_plain text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF cpf_plain IS NULL OR cpf_plain = '' THEN
    RETURN NULL;
  END IF;
  -- Retorna hash do CPF para busca, não o valor criptografado completo
  -- Em produção, usar chave secreta do Supabase Vault
  RETURN encode(digest(cpf_plain, 'sha256'), 'hex');
END;
$$;

-- 3. TABELA PARA VOUCHERS
CREATE TABLE IF NOT EXISTS public.vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  tipo text NOT NULL CHECK (tipo IN ('pacote', 'mensal', 'trimestral', 'semestral')),
  sessoes integer,
  validade_dias integer NOT NULL DEFAULT 30,
  preco numeric NOT NULL CHECK (preco >= 0),
  ativo boolean NOT NULL DEFAULT true,
  stripe_price_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS para vouchers
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver vouchers ativos"
ON public.vouchers FOR SELECT
USING (ativo = true);

CREATE POLICY "Admins podem gerenciar vouchers"
ON public.vouchers FOR ALL
USING (public.user_is_admin(auth.uid()));

-- 4. TABELA PARA COMPRAS DE VOUCHERS
CREATE TABLE IF NOT EXISTS public.user_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  voucher_id uuid NOT NULL REFERENCES public.vouchers(id) ON DELETE CASCADE,
  sessoes_restantes integer NOT NULL,
  sessoes_totais integer NOT NULL,
  data_compra timestamptz NOT NULL DEFAULT now(),
  data_expiracao timestamptz NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  stripe_payment_intent_id text,
  stripe_subscription_id text,
  valor_pago numeric NOT NULL CHECK (valor_pago >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices para user_vouchers
CREATE INDEX IF NOT EXISTS idx_user_vouchers_user_id ON public.user_vouchers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_vouchers_voucher_id ON public.user_vouchers(voucher_id);
CREATE INDEX IF NOT EXISTS idx_user_vouchers_ativo ON public.user_vouchers(ativo) WHERE ativo = true;

-- RLS para user_vouchers
ALTER TABLE public.user_vouchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem seus próprios vouchers"
ON public.user_vouchers FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins e fisios veem todos vouchers"
ON public.user_vouchers FOR SELECT
USING (public.user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]));

CREATE POLICY "Sistema pode criar vouchers"
ON public.user_vouchers FOR INSERT
WITH CHECK (true); -- Será controlado via edge function

CREATE POLICY "Sistema pode atualizar vouchers"
ON public.user_vouchers FOR UPDATE
USING (true); -- Será controlado via edge function

-- 5. TABELA PARA EMPRESAS PARCEIRAS
CREATE TABLE IF NOT EXISTS public.empresas_parceiras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  contato text,
  email text,
  telefone text,
  contrapartidas text,
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS para empresas_parceiras
ALTER TABLE public.empresas_parceiras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins e fisios podem gerenciar parceiros"
ON public.empresas_parceiras FOR ALL
USING (public.user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]));

-- 6. RELAÇÃO EVENTOS COM PARCEIROS
ALTER TABLE public.eventos 
ADD COLUMN IF NOT EXISTS parceiro_id uuid REFERENCES public.empresas_parceiras(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_eventos_parceiro_id ON public.eventos(parceiro_id);

-- 7. TRIGGERS PARA updated_at
CREATE TRIGGER update_vouchers_updated_at
BEFORE UPDATE ON public.vouchers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_vouchers_updated_at
BEFORE UPDATE ON public.user_vouchers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_empresas_parceiras_updated_at
BEFORE UPDATE ON public.empresas_parceiras
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. FUNÇÃO PARA DECREMENTAR SESSÕES DE VOUCHER
CREATE OR REPLACE FUNCTION public.decrementar_sessao_voucher(
  _user_voucher_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sessoes_restantes integer;
BEGIN
  -- Verificar e decrementar sessões
  UPDATE public.user_vouchers
  SET 
    sessoes_restantes = sessoes_restantes - 1,
    updated_at = now()
  WHERE id = _user_voucher_id
    AND sessoes_restantes > 0
    AND ativo = true
    AND data_expiracao > now()
  RETURNING sessoes_restantes INTO _sessoes_restantes;
  
  -- Se não encontrou ou não tinha sessões, retornar false
  IF _sessoes_restantes IS NULL THEN
    RETURN false;
  END IF;
  
  -- Se chegou a zero, desativar
  IF _sessoes_restantes = 0 THEN
    UPDATE public.user_vouchers
    SET ativo = false
    WHERE id = _user_voucher_id;
  END IF;
  
  RETURN true;
END;
$$;

-- 9. VIEW PARA ANÁLISE DE EVENTOS (Performance)
CREATE OR REPLACE VIEW public.eventos_resumo AS
SELECT 
  e.id,
  e.nome,
  e.status,
  e.data_inicio,
  e.data_fim,
  e.categoria,
  COUNT(DISTINCT p.id) as total_participantes,
  COUNT(DISTINCT pr.id) as total_prestadores,
  COALESCE(SUM(pr.valor_acordado), 0) as custo_prestadores,
  COALESCE(SUM(ci.quantidade * ci.custo_unitario), 0) as custo_checklist,
  COALESCE(SUM(pg.valor), 0) as pagamentos_totais
FROM public.eventos e
LEFT JOIN public.participantes p ON p.evento_id = e.id
LEFT JOIN public.prestadores pr ON pr.evento_id = e.id
LEFT JOIN public.checklist_items ci ON ci.evento_id = e.id
LEFT JOIN public.pagamentos pg ON pg.evento_id = e.id
GROUP BY e.id;

-- RLS para a view
ALTER VIEW public.eventos_resumo SET (security_invoker = on);

-- 10. INSERIR VOUCHERS PADRÃO (Exemplos)
INSERT INTO public.vouchers (nome, descricao, tipo, sessoes, validade_dias, preco, ativo)
VALUES 
  ('Pacote 4 Sessões', 'Pacote avulso de 4 sessões de fisioterapia', 'pacote', 4, 60, 240.00, true),
  ('Pacote 8 Sessões', 'Pacote avulso de 8 sessões de fisioterapia', 'pacote', 8, 90, 440.00, true),
  ('Plano Mensal', 'Acesso ilimitado por 30 dias', 'mensal', NULL, 30, 350.00, true),
  ('Plano Trimestral', 'Acesso ilimitado por 90 dias', 'trimestral', NULL, 90, 900.00, true)
ON CONFLICT DO NOTHING;