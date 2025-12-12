-- FASE 4, 5, 6: Financeiro, Relatórios e CRM

-- 4.1 & 4.2 Contas a Receber e Pagar
CREATE TABLE IF NOT EXISTS public.contas_financeiras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('receber', 'pagar')),
  descricao text NOT NULL,
  valor numeric NOT NULL,
  data_vencimento date NOT NULL,
  data_pagamento date,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado', 'cancelado')),
  categoria text,
  forma_pagamento text,
  parcelas integer DEFAULT 1,
  parcela_atual integer DEFAULT 1,
  recorrente boolean DEFAULT false,
  recorrencia_tipo text,
  patient_id uuid REFERENCES public.patients(id),
  fornecedor_id uuid REFERENCES public.fornecedores(id),
  profissional_id uuid REFERENCES public.profiles(id),
  appointment_id uuid REFERENCES public.appointments(id),
  comprovante_url text,
  observacoes text,
  organization_id uuid REFERENCES public.organizations(id),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4.3 Recibos
CREATE TABLE IF NOT EXISTS public.recibos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_recibo serial,
  patient_id uuid REFERENCES public.patients(id),
  valor numeric NOT NULL,
  valor_extenso text,
  referente text NOT NULL,
  data_emissao date NOT NULL DEFAULT CURRENT_DATE,
  emitido_por text NOT NULL,
  cpf_cnpj_emitente text,
  assinado boolean DEFAULT false,
  logo_url text,
  organization_id uuid REFERENCES public.organizations(id),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4.4 Comissões
CREATE TABLE IF NOT EXISTS public.comissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profissional_id uuid NOT NULL REFERENCES public.profiles(id),
  periodo_inicio date NOT NULL,
  periodo_fim date NOT NULL,
  total_atendimentos integer DEFAULT 0,
  valor_bruto numeric DEFAULT 0,
  percentual_comissao numeric DEFAULT 0,
  valor_comissao numeric DEFAULT 0,
  descontos numeric DEFAULT 0,
  valor_liquido numeric DEFAULT 0,
  status text DEFAULT 'pendente' CHECK (status IN ('pendente', 'calculado', 'pago')),
  data_pagamento date,
  organization_id uuid REFERENCES public.organizations(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4.5 & 4.7 Movimentações de Caixa
CREATE TABLE IF NOT EXISTS public.movimentacoes_caixa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL DEFAULT CURRENT_DATE,
  tipo text NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  valor numeric NOT NULL,
  descricao text NOT NULL,
  categoria text,
  forma_pagamento text,
  conta_financeira_id uuid REFERENCES public.contas_financeiras(id),
  usuario_id uuid,
  organization_id uuid REFERENCES public.organizations(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5.3 Retenção e Cancelamento
CREATE TABLE IF NOT EXISTS public.retencao_cancelamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  tipo text NOT NULL CHECK (tipo IN ('renovacao_possivel', 'renovado', 'cancelado')),
  data_evento date NOT NULL DEFAULT CURRENT_DATE,
  motivo text,
  valor_anterior numeric,
  valor_novo numeric,
  observacoes text,
  organization_id uuid REFERENCES public.organizations(id),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6.1 Leads/Prospecções
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  telefone text,
  email text,
  origem text,
  estagio text DEFAULT 'aguardando' CHECK (estagio IN ('aguardando', 'em_contato', 'avaliacao_agendada', 'avaliacao_realizada', 'efetivado', 'nao_efetivado')),
  responsavel_id uuid REFERENCES public.profiles(id),
  data_primeiro_contato date,
  data_ultimo_contato date,
  interesse text,
  observacoes text,
  motivo_nao_efetivacao text,
  organization_id uuid REFERENCES public.organizations(id),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6.2 Histórico de contatos com leads
CREATE TABLE IF NOT EXISTS public.lead_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  tipo_contato text NOT NULL,
  descricao text,
  resultado text,
  proximo_contato date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.contas_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recibos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_caixa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retencao_cancelamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins e fisios gerenciam contas" ON public.contas_financeiras
  FOR ALL USING (user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]));

CREATE POLICY "Admins e fisios gerenciam recibos" ON public.recibos
  FOR ALL USING (user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]));

CREATE POLICY "Admins gerenciam comissões" ON public.comissoes
  FOR ALL USING (user_is_admin(auth.uid()));

CREATE POLICY "Profissionais veem próprias comissões" ON public.comissoes
  FOR SELECT USING (profissional_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins e fisios gerenciam caixa" ON public.movimentacoes_caixa
  FOR ALL USING (user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]));

CREATE POLICY "Admins e fisios gerenciam retenção" ON public.retencao_cancelamentos
  FOR ALL USING (user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]));

CREATE POLICY "Admins e fisios gerenciam leads" ON public.leads
  FOR ALL USING (user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]));

CREATE POLICY "Admins e fisios gerenciam histórico de leads" ON public.lead_historico
  FOR ALL USING (user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]));

-- Triggers
CREATE TRIGGER update_contas_financeiras_updated_at
  BEFORE UPDATE ON public.contas_financeiras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_comissoes_updated_at
  BEFORE UPDATE ON public.comissoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Views
CREATE OR REPLACE VIEW public.fluxo_caixa_resumo WITH (security_invoker = true) AS
SELECT 
  date_trunc('month', data)::date as mes,
  SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END) as entradas,
  SUM(CASE WHEN tipo = 'saida' THEN valor ELSE 0 END) as saidas,
  SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE -valor END) as saldo,
  organization_id
FROM public.movimentacoes_caixa
GROUP BY date_trunc('month', data), organization_id;

CREATE OR REPLACE VIEW public.aniversariantes_mes WITH (security_invoker = true) AS
SELECT 
  id, name, birth_date,
  EXTRACT(DAY FROM birth_date) as dia,
  EXTRACT(YEAR FROM age(birth_date)) as idade,
  phone, email, organization_id
FROM public.patients
WHERE EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND status = 'ativo'
ORDER BY EXTRACT(DAY FROM birth_date);