-- =============================================
-- CRM AVANÇADO - Tabelas e Funcionalidades
-- =============================================

-- 1. Adicionar campos de lead scoring e temperatura
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS score integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS temperatura text DEFAULT 'morno',
ADD COLUMN IF NOT EXISTS valor_potencial numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS proxima_acao text,
ADD COLUMN IF NOT EXISTS data_proxima_acao date,
ADD COLUMN IF NOT EXISTS convertido_patient_id uuid REFERENCES public.patients(id);

-- 2. Tabela de Tarefas/Follow-ups do CRM
CREATE TABLE IF NOT EXISTS public.crm_tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  tipo text NOT NULL DEFAULT 'follow_up', -- follow_up, ligacao, email, whatsapp, reuniao
  prioridade text DEFAULT 'normal', -- baixa, normal, alta, urgente
  status text DEFAULT 'pendente', -- pendente, em_andamento, concluida, cancelada
  data_vencimento date,
  hora_vencimento time,
  responsavel_id uuid,
  concluida_em timestamp with time zone,
  concluida_por uuid,
  lembrete_enviado boolean DEFAULT false,
  organization_id uuid REFERENCES public.organizations(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 3. Tabela de Campanhas de Marketing
CREATE TABLE IF NOT EXISTS public.crm_campanhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  tipo text NOT NULL, -- email, whatsapp, sms
  status text DEFAULT 'rascunho', -- rascunho, agendada, enviando, concluida, pausada
  assunto text, -- para email
  conteudo text NOT NULL,
  template_id text,
  filtro_estagios text[] DEFAULT '{}',
  filtro_origens text[] DEFAULT '{}',
  filtro_tags text[] DEFAULT '{}',
  agendada_para timestamp with time zone,
  iniciada_em timestamp with time zone,
  concluida_em timestamp with time zone,
  total_destinatarios integer DEFAULT 0,
  total_enviados integer DEFAULT 0,
  total_abertos integer DEFAULT 0,
  total_clicados integer DEFAULT 0,
  total_respondidos integer DEFAULT 0,
  organization_id uuid REFERENCES public.organizations(id),
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 4. Tabela de Envios de Campanha (tracking individual)
CREATE TABLE IF NOT EXISTS public.crm_campanha_envios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id uuid REFERENCES public.crm_campanhas(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  status text DEFAULT 'pendente', -- pendente, enviado, entregue, aberto, clicado, respondido, erro
  enviado_em timestamp with time zone,
  entregue_em timestamp with time zone,
  aberto_em timestamp with time zone,
  clicado_em timestamp with time zone,
  erro_mensagem text,
  created_at timestamp with time zone DEFAULT now()
);

-- 5. Tabela de NPS/Pesquisas de Satisfação
CREATE TABLE IF NOT EXISTS public.crm_pesquisas_nps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  nota integer NOT NULL CHECK (nota >= 0 AND nota <= 10),
  categoria text, -- promotor (9-10), neutro (7-8), detrator (0-6)
  comentario text,
  motivo_nota text,
  sugestoes text,
  respondido_em timestamp with time zone DEFAULT now(),
  origem text, -- pos_avaliacao, pos_tratamento, periodica
  organization_id uuid REFERENCES public.organizations(id),
  created_at timestamp with time zone DEFAULT now()
);

-- 6. Tabela de Automações
CREATE TABLE IF NOT EXISTS public.crm_automacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  tipo text NOT NULL, -- aniversario, reengajamento, pos_avaliacao, boas_vindas, follow_up_automatico
  ativo boolean DEFAULT true,
  gatilho_config jsonb DEFAULT '{}', -- configuração do gatilho (dias sem contato, etc)
  acao_config jsonb DEFAULT '{}', -- configuração da ação (template, canal, etc)
  canal text DEFAULT 'whatsapp', -- whatsapp, email, sms
  template_mensagem text,
  total_executado integer DEFAULT 0,
  ultima_execucao timestamp with time zone,
  organization_id uuid REFERENCES public.organizations(id),
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 7. Log de execução de automações
CREATE TABLE IF NOT EXISTS public.crm_automacao_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automacao_id uuid REFERENCES public.crm_automacoes(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  status text DEFAULT 'executado', -- executado, erro, ignorado
  detalhes jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- 8. View para métricas avançadas de leads
CREATE OR REPLACE VIEW public.crm_metricas_leads AS
SELECT 
  l.estagio,
  l.origem,
  COUNT(*) as total,
  COUNT(CASE WHEN l.estagio = 'efetivado' THEN 1 END) as convertidos,
  ROUND(AVG(EXTRACT(EPOCH FROM (
    CASE WHEN l.estagio IN ('efetivado', 'nao_efetivado') 
    THEN l.updated_at 
    ELSE now() 
    END - l.created_at
  )) / 86400)::numeric, 1) as dias_medio_no_funil,
  ROUND(AVG(l.score)::numeric, 1) as score_medio,
  COUNT(CASE WHEN l.data_ultimo_contato < CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as leads_frios
FROM public.leads l
GROUP BY l.estagio, l.origem;

-- RLS Policies
ALTER TABLE public.crm_tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_campanhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_campanha_envios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_pesquisas_nps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_automacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_automacao_logs ENABLE ROW LEVEL SECURITY;

-- Policies para tarefas
DROP POLICY IF EXISTS "Membros gerenciam tarefas CRM" ON public.crm_tarefas;
CREATE POLICY "Membros gerenciam tarefas CRM" ON public.crm_tarefas
  FOR ALL USING (user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]));

-- Policies para campanhas
DROP POLICY IF EXISTS "Admins e fisios gerenciam campanhas" ON public.crm_campanhas;
CREATE POLICY "Admins e fisios gerenciam campanhas" ON public.crm_campanhas
  FOR ALL USING (user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]));

DROP POLICY IF EXISTS "Membros veem envios de campanhas" ON public.crm_campanha_envios;
CREATE POLICY "Membros veem envios de campanhas" ON public.crm_campanha_envios
  FOR SELECT USING (user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]));

DROP POLICY IF EXISTS "Sistema gerencia envios" ON public.crm_campanha_envios;
CREATE POLICY "Sistema gerencia envios" ON public.crm_campanha_envios
  FOR ALL USING (true);

-- Policies para NPS
DROP POLICY IF EXISTS "Membros veem pesquisas NPS" ON public.crm_pesquisas_nps;
CREATE POLICY "Membros veem pesquisas NPS" ON public.crm_pesquisas_nps
  FOR SELECT USING (user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]));

DROP POLICY IF EXISTS "Qualquer um pode responder NPS" ON public.crm_pesquisas_nps;
CREATE POLICY "Qualquer um pode responder NPS" ON public.crm_pesquisas_nps
  FOR INSERT WITH CHECK (true);

-- Policies para automações
DROP POLICY IF EXISTS "Admins gerenciam automações" ON public.crm_automacoes;
CREATE POLICY "Admins gerenciam automações" ON public.crm_automacoes
  FOR ALL USING (user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]));

DROP POLICY IF EXISTS "Membros veem logs de automação" ON public.crm_automacao_logs;
CREATE POLICY "Membros veem logs de automação" ON public.crm_automacao_logs
  FOR SELECT USING (user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]));

DROP POLICY IF EXISTS "Sistema cria logs" ON public.crm_automacao_logs;
CREATE POLICY "Sistema cria logs" ON public.crm_automacao_logs
  FOR INSERT WITH CHECK (true);

-- Função para calcular score do lead
CREATE OR REPLACE FUNCTION public.calcular_lead_score(lead_row public.leads)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  score integer := 0;
BEGIN
  -- Pontos por origem (algumas origens convertem mais)
  IF lead_row.origem = 'Indicação' THEN score := score + 30;
  ELSIF lead_row.origem IN ('Google', 'Site') THEN score := score + 20;
  ELSIF lead_row.origem = 'Instagram' THEN score := score + 15;
  ELSE score := score + 10;
  END IF;
  
  -- Pontos por engajamento (contato recente)
  IF lead_row.data_ultimo_contato IS NOT NULL THEN
    IF lead_row.data_ultimo_contato >= CURRENT_DATE - INTERVAL '3 days' THEN
      score := score + 25;
    ELSIF lead_row.data_ultimo_contato >= CURRENT_DATE - INTERVAL '7 days' THEN
      score := score + 15;
    ELSIF lead_row.data_ultimo_contato >= CURRENT_DATE - INTERVAL '14 days' THEN
      score := score + 5;
    END IF;
  END IF;
  
  -- Pontos por estágio avançado
  IF lead_row.estagio = 'avaliacao_realizada' THEN score := score + 30;
  ELSIF lead_row.estagio = 'avaliacao_agendada' THEN score := score + 20;
  ELSIF lead_row.estagio = 'em_contato' THEN score := score + 10;
  END IF;
  
  -- Pontos por ter email e telefone
  IF lead_row.email IS NOT NULL THEN score := score + 5; END IF;
  IF lead_row.telefone IS NOT NULL THEN score := score + 5; END IF;
  
  RETURN LEAST(score, 100); -- Max 100
END;
$$;

-- Trigger para atualizar score automaticamente
CREATE OR REPLACE FUNCTION public.atualizar_lead_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.score := public.calcular_lead_score(NEW);
  
  -- Definir temperatura baseada no score
  IF NEW.score >= 70 THEN NEW.temperatura := 'quente';
  ELSIF NEW.score >= 40 THEN NEW.temperatura := 'morno';
  ELSE NEW.temperatura := 'frio';
  END IF;
  
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_atualizar_lead_score ON public.leads;
CREATE TRIGGER trigger_atualizar_lead_score
  BEFORE INSERT OR UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_lead_score();

-- Atualizar scores existentes
UPDATE public.leads SET score = 0 WHERE score IS NULL;