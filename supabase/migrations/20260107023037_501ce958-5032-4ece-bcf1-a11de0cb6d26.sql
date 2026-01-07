-- =============================================
-- MÓDULO 1: CADASTROS GERAIS - NOVAS TABELAS
-- =============================================

-- 1. Centros de Custo
CREATE TABLE IF NOT EXISTS public.centros_custo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.centros_custo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "centros_custo_select" ON public.centros_custo
  FOR SELECT USING (true);

CREATE POLICY "centros_custo_insert" ON public.centros_custo
  FOR INSERT WITH CHECK (true);

CREATE POLICY "centros_custo_update" ON public.centros_custo
  FOR UPDATE USING (true);

CREATE POLICY "centros_custo_delete" ON public.centros_custo
  FOR DELETE USING (true);

-- 2. Formas de Pagamento
CREATE TABLE IF NOT EXISTS public.formas_pagamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT DEFAULT 'geral' CHECK (tipo IN ('geral', 'entrada', 'saida')),
  taxa_percentual NUMERIC(5,2) DEFAULT 0,
  dias_recebimento INTEGER DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.formas_pagamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "formas_pagamento_select" ON public.formas_pagamento
  FOR SELECT USING (true);

CREATE POLICY "formas_pagamento_insert" ON public.formas_pagamento
  FOR INSERT WITH CHECK (true);

CREATE POLICY "formas_pagamento_update" ON public.formas_pagamento
  FOR UPDATE USING (true);

CREATE POLICY "formas_pagamento_delete" ON public.formas_pagamento
  FOR DELETE USING (true);

-- Inserir formas de pagamento padrão
INSERT INTO public.formas_pagamento (nome, tipo, taxa_percentual, dias_recebimento) VALUES
  ('Dinheiro', 'geral', 0, 0),
  ('PIX', 'geral', 0, 0),
  ('Cartão de Débito', 'geral', 1.5, 1),
  ('Cartão de Crédito', 'geral', 3.5, 30),
  ('Cartão Crédito 2x', 'geral', 4.0, 60),
  ('Cartão Crédito 3x', 'geral', 4.5, 90),
  ('Transferência Bancária', 'geral', 0, 1),
  ('Boleto', 'geral', 2.0, 3)
ON CONFLICT DO NOTHING;

-- 3. Convênios / Planos de Saúde
CREATE TABLE IF NOT EXISTS public.convenios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cnpj TEXT,
  telefone TEXT,
  email TEXT,
  contato_responsavel TEXT,
  valor_repasse NUMERIC(10,2) DEFAULT 0,
  prazo_pagamento_dias INTEGER DEFAULT 30,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.convenios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "convenios_select" ON public.convenios
  FOR SELECT USING (true);

CREATE POLICY "convenios_insert" ON public.convenios
  FOR INSERT WITH CHECK (true);

CREATE POLICY "convenios_update" ON public.convenios
  FOR UPDATE USING (true);

CREATE POLICY "convenios_delete" ON public.convenios
  FOR DELETE USING (true);

-- 4. Salas de Atendimento
CREATE TABLE IF NOT EXISTS public.salas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  capacidade INTEGER DEFAULT 1,
  descricao TEXT,
  cor TEXT DEFAULT '#3b82f6',
  equipamentos TEXT[],
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.salas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "salas_select" ON public.salas
  FOR SELECT USING (true);

CREATE POLICY "salas_insert" ON public.salas
  FOR INSERT WITH CHECK (true);

CREATE POLICY "salas_update" ON public.salas
  FOR UPDATE USING (true);

CREATE POLICY "salas_delete" ON public.salas
  FOR DELETE USING (true);

-- Inserir salas padrão
INSERT INTO public.salas (nome, capacidade, descricao, cor) VALUES
  ('Sala 01', 1, 'Sala de atendimento individual', '#3b82f6'),
  ('Sala 02', 1, 'Sala de atendimento individual', '#10b981'),
  ('Sala Pilates', 4, 'Sala com aparelhos de Pilates', '#8b5cf6'),
  ('Sala Funcional', 6, 'Sala para treino funcional', '#f59e0b')
ON CONFLICT DO NOTHING;

-- 5. Adicionar campos faltantes na tabela de serviços
ALTER TABLE public.servicos 
  ADD COLUMN IF NOT EXISTS nome_exibicao TEXT,
  ADD COLUMN IF NOT EXISTS mostrar_valor BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS experimental BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS valor_mensal NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS centro_custo_id uuid REFERENCES public.centros_custo(id),
  ADD COLUMN IF NOT EXISTS qtd_sessoes_pacote INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS profissional_padrao_id uuid,
  ADD COLUMN IF NOT EXISTS sala_padrao_id uuid REFERENCES public.salas(id);

-- Inserir centros de custo padrão
INSERT INTO public.centros_custo (nome, descricao) VALUES
  ('Fisioterapia', 'Atendimentos de fisioterapia geral'),
  ('Pilates', 'Aulas e atendimentos de Pilates'),
  ('Estética', 'Procedimentos estéticos'),
  ('Massagem', 'Serviços de massoterapia'),
  ('Avaliação', 'Avaliações e reavaliações'),
  ('Administrativo', 'Custos administrativos')
ON CONFLICT DO NOTHING;

-- Criar triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_centros_custo_updated_at ON public.centros_custo;
CREATE TRIGGER update_centros_custo_updated_at
  BEFORE UPDATE ON public.centros_custo
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_formas_pagamento_updated_at ON public.formas_pagamento;
CREATE TRIGGER update_formas_pagamento_updated_at
  BEFORE UPDATE ON public.formas_pagamento
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_convenios_updated_at ON public.convenios;
CREATE TRIGGER update_convenios_updated_at
  BEFORE UPDATE ON public.convenios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_salas_updated_at ON public.salas;
CREATE TRIGGER update_salas_updated_at
  BEFORE UPDATE ON public.salas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();