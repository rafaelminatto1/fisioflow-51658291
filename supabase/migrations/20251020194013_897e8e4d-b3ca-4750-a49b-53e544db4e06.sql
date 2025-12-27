-- Criar apenas tabela de transações que está faltando
CREATE TABLE IF NOT EXISTS public.transacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('voucher_compra', 'evento_receita', 'evento_despesa', 'estorno')),
  valor DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pendente', 'processando', 'concluido', 'falhou', 'estornado')) DEFAULT 'pendente',
  descricao TEXT,
  stripe_payment_intent_id VARCHAR(100),
  stripe_refund_id VARCHAR(100),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance de transacoes
CREATE INDEX IF NOT EXISTS idx_transacoes_user_id ON public.transacoes(user_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_status ON public.transacoes(status);
CREATE INDEX IF NOT EXISTS idx_transacoes_tipo ON public.transacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_transacoes_created_at ON public.transacoes(created_at DESC);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_transacoes_updated_at ON public.transacoes;
CREATE TRIGGER update_transacoes_updated_at
  BEFORE UPDATE ON public.transacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies para transacoes
ALTER TABLE public.transacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários veem suas transações" ON public.transacoes;
CREATE POLICY "Usuários veem suas transações"
  ON public.transacoes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.user_is_admin(auth.uid()));

DROP POLICY IF EXISTS "Apenas admins inserem transações" ON public.transacoes;
CREATE POLICY "Apenas admins inserem transações"
  ON public.transacoes FOR INSERT
  TO authenticated
  WITH CHECK (public.user_is_admin(auth.uid()));

DROP POLICY IF EXISTS "Apenas admins atualizam transações" ON public.transacoes;
CREATE POLICY "Apenas admins atualizam transações"
  ON public.transacoes FOR UPDATE
  TO authenticated
  USING (public.user_is_admin(auth.uid()));