-- ============================================
-- FASE 2: Gestão de Cadastros Gerais
-- ============================================

-- 2.1 Tabela de Serviços/Preços
CREATE TABLE public.servicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  nome TEXT NOT NULL,
  descricao TEXT,
  duracao_padrao INTEGER NOT NULL DEFAULT 60, -- em minutos
  tipo_cobranca TEXT NOT NULL DEFAULT 'unitario' CHECK (tipo_cobranca IN ('unitario', 'mensal', 'pacote')),
  valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  centro_custo TEXT,
  permite_agendamento_online BOOLEAN NOT NULL DEFAULT true,
  cor TEXT DEFAULT '#3b82f6',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2.2 Modelos de Atestados
CREATE TABLE public.atestado_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  nome TEXT NOT NULL,
  descricao TEXT,
  conteudo TEXT NOT NULL, -- Template com variáveis como #cliente-nome, #data-hoje
  variaveis_disponiveis JSONB DEFAULT '["#cliente-nome", "#cliente-cpf", "#data-hoje", "#hora-atual", "#clinica-cidade", "#profissional-nome"]'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2.3 Modelos de Contratos
CREATE TABLE public.contrato_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL DEFAULT 'servico' CHECK (tipo IN ('servico', 'pacote', 'mensal', 'outro')),
  conteudo TEXT NOT NULL, -- Template com variáveis
  variaveis_disponiveis JSONB DEFAULT '["#cliente-nome", "#cliente-cpf", "#cliente-endereco", "#data-hoje", "#valor-total", "#servico-nome", "#profissional-nome"]'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2.4 Gestão de Fornecedores
CREATE TABLE public.fornecedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  tipo_pessoa TEXT NOT NULL DEFAULT 'pj' CHECK (tipo_pessoa IN ('pf', 'pj')),
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cpf_cnpj TEXT,
  inscricao_estadual TEXT,
  email TEXT,
  telefone TEXT,
  celular TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  observacoes TEXT,
  categoria TEXT, -- Materiais, Equipamentos, Serviços, etc.
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2.5 Gestão de Feriados
CREATE TABLE public.feriados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  nome TEXT NOT NULL,
  data DATE NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'nacional' CHECK (tipo IN ('nacional', 'estadual', 'municipal', 'ponto_facultativo')),
  recorrente BOOLEAN NOT NULL DEFAULT true, -- Se repete todo ano
  bloqueia_agenda BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, data, nome)
);

-- Enable RLS
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atestado_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contrato_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feriados ENABLE ROW LEVEL SECURITY;

-- RLS Policies for servicos
CREATE POLICY "Membros veem serviços da org" ON public.servicos
  FOR SELECT USING (
    organization_id IS NULL OR user_belongs_to_organization(auth.uid(), organization_id)
  );

CREATE POLICY "Admins e fisios gerenciam serviços" ON public.servicos
  FOR ALL USING (
    user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
    AND (organization_id IS NULL OR user_belongs_to_organization(auth.uid(), organization_id))
  );

-- RLS Policies for atestado_templates
CREATE POLICY "Membros veem templates de atestados" ON public.atestado_templates
  FOR SELECT USING (
    organization_id IS NULL OR user_belongs_to_organization(auth.uid(), organization_id)
  );

CREATE POLICY "Admins e fisios gerenciam templates de atestados" ON public.atestado_templates
  FOR ALL USING (
    user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
    AND (organization_id IS NULL OR user_belongs_to_organization(auth.uid(), organization_id))
  );

-- RLS Policies for contrato_templates
CREATE POLICY "Membros veem templates de contratos" ON public.contrato_templates
  FOR SELECT USING (
    organization_id IS NULL OR user_belongs_to_organization(auth.uid(), organization_id)
  );

CREATE POLICY "Admins e fisios gerenciam templates de contratos" ON public.contrato_templates
  FOR ALL USING (
    user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
    AND (organization_id IS NULL OR user_belongs_to_organization(auth.uid(), organization_id))
  );

-- RLS Policies for fornecedores
CREATE POLICY "Membros veem fornecedores da org" ON public.fornecedores
  FOR SELECT USING (
    organization_id IS NULL OR user_belongs_to_organization(auth.uid(), organization_id)
  );

CREATE POLICY "Admins e fisios gerenciam fornecedores" ON public.fornecedores
  FOR ALL USING (
    user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
    AND (organization_id IS NULL OR user_belongs_to_organization(auth.uid(), organization_id))
  );

-- RLS Policies for feriados
CREATE POLICY "Membros veem feriados" ON public.feriados
  FOR SELECT USING (
    organization_id IS NULL OR user_belongs_to_organization(auth.uid(), organization_id)
  );

CREATE POLICY "Admins e fisios gerenciam feriados" ON public.feriados
  FOR ALL USING (
    user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
    AND (organization_id IS NULL OR user_belongs_to_organization(auth.uid(), organization_id))
  );

-- Trigger for updated_at
CREATE TRIGGER update_servicos_updated_at BEFORE UPDATE ON public.servicos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  
CREATE TRIGGER update_atestado_templates_updated_at BEFORE UPDATE ON public.atestado_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  
CREATE TRIGGER update_contrato_templates_updated_at BEFORE UPDATE ON public.contrato_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  
CREATE TRIGGER update_fornecedores_updated_at BEFORE UPDATE ON public.fornecedores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  
CREATE TRIGGER update_feriados_updated_at BEFORE UPDATE ON public.feriados
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed feriados nacionais brasileiros
INSERT INTO public.feriados (nome, data, tipo, recorrente, bloqueia_agenda, organization_id) VALUES
  ('Confraternização Universal', '2025-01-01', 'nacional', true, true, NULL),
  ('Carnaval', '2025-03-03', 'nacional', false, true, NULL),
  ('Carnaval', '2025-03-04', 'nacional', false, true, NULL),
  ('Sexta-feira Santa', '2025-04-18', 'nacional', false, true, NULL),
  ('Tiradentes', '2025-04-21', 'nacional', true, true, NULL),
  ('Dia do Trabalho', '2025-05-01', 'nacional', true, true, NULL),
  ('Corpus Christi', '2025-06-19', 'nacional', false, true, NULL),
  ('Independência do Brasil', '2025-09-07', 'nacional', true, true, NULL),
  ('Nossa Senhora Aparecida', '2025-10-12', 'nacional', true, true, NULL),
  ('Finados', '2025-11-02', 'nacional', true, true, NULL),
  ('Proclamação da República', '2025-11-15', 'nacional', true, true, NULL),
  ('Natal', '2025-12-25', 'nacional', true, true, NULL);
