-- Fase 3: Cadastros Clínicos

-- 3.1 Padrão de Evolução (Evolution Templates)
CREATE TABLE public.evolution_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'fisioterapia', -- fisioterapia, pilates, rpg, etc
  descricao text,
  conteudo text NOT NULL, -- Template content with placeholders
  campos_padrao jsonb DEFAULT '[]'::jsonb, -- Default fields to include
  ativo boolean NOT NULL DEFAULT true,
  organization_id uuid REFERENCES public.organizations(id),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3.2 Fichas de Avaliação Personalizáveis
CREATE TABLE public.evaluation_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  tipo text NOT NULL DEFAULT 'anamnese', -- anamnese, avaliacao_postural, custom
  ativo boolean NOT NULL DEFAULT true,
  organization_id uuid REFERENCES public.organizations(id),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Campos/perguntas das fichas de avaliação
CREATE TABLE public.evaluation_form_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.evaluation_forms(id) ON DELETE CASCADE,
  grupo text, -- Group/section name
  ordem integer NOT NULL DEFAULT 0,
  label text NOT NULL,
  tipo_campo text NOT NULL DEFAULT 'texto_curto', -- texto_curto, texto_longo, lista, opcao_unica, selecao
  opcoes jsonb, -- Options for lista, opcao_unica, selecao types
  obrigatorio boolean NOT NULL DEFAULT false,
  placeholder text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Respostas das fichas de avaliação dos pacientes
CREATE TABLE public.patient_evaluation_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  form_id uuid NOT NULL REFERENCES public.evaluation_forms(id),
  respostas jsonb NOT NULL DEFAULT '{}'::jsonb, -- {field_id: value}
  preenchido_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3.4 Interesses/Objetivos do Paciente
CREATE TABLE public.patient_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  categoria text, -- alongamento, emagrecimento, postura, fortalecimento, etc
  ativo boolean NOT NULL DEFAULT true,
  organization_id uuid REFERENCES public.organizations(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Vinculação de objetivos aos pacientes
CREATE TABLE public.patient_objective_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  objective_id uuid NOT NULL REFERENCES public.patient_objectives(id) ON DELETE CASCADE,
  prioridade integer DEFAULT 1, -- 1 = alta, 2 = média, 3 = baixa
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(patient_id, objective_id)
);

-- RLS Policies
ALTER TABLE public.evolution_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_evaluation_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_objective_assignments ENABLE ROW LEVEL SECURITY;

-- Evolution Templates Policies
CREATE POLICY "Membros veem templates de evolução" ON public.evolution_templates
  FOR SELECT USING (organization_id IS NULL OR user_belongs_to_organization(auth.uid(), organization_id));

CREATE POLICY "Admins e fisios gerenciam templates de evolução" ON public.evolution_templates
  FOR ALL USING (
    user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
    AND (organization_id IS NULL OR user_belongs_to_organization(auth.uid(), organization_id))
  );

-- Evaluation Forms Policies
CREATE POLICY "Membros veem fichas de avaliação" ON public.evaluation_forms
  FOR SELECT USING (organization_id IS NULL OR user_belongs_to_organization(auth.uid(), organization_id));

CREATE POLICY "Admins e fisios gerenciam fichas de avaliação" ON public.evaluation_forms
  FOR ALL USING (
    user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
    AND (organization_id IS NULL OR user_belongs_to_organization(auth.uid(), organization_id))
  );

-- Evaluation Form Fields Policies
CREATE POLICY "Membros veem campos de fichas" ON public.evaluation_form_fields
  FOR SELECT USING (
    form_id IN (SELECT id FROM public.evaluation_forms)
  );

CREATE POLICY "Admins e fisios gerenciam campos de fichas" ON public.evaluation_form_fields
  FOR ALL USING (
    user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
  );

-- Patient Evaluation Responses Policies
CREATE POLICY "Admins e fisios veem respostas" ON public.patient_evaluation_responses
  FOR SELECT USING (
    user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
  );

CREATE POLICY "Admins e fisios gerenciam respostas" ON public.patient_evaluation_responses
  FOR ALL USING (
    user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
  );

CREATE POLICY "Estagiários gerenciam respostas de pacientes atribuídos" ON public.patient_evaluation_responses
  FOR ALL USING (
    user_has_role(auth.uid(), 'estagiario'::app_role) 
    AND estagiario_pode_acessar_paciente(auth.uid(), patient_id)
  );

-- Patient Objectives Policies
CREATE POLICY "Membros veem objetivos" ON public.patient_objectives
  FOR SELECT USING (organization_id IS NULL OR user_belongs_to_organization(auth.uid(), organization_id));

CREATE POLICY "Admins e fisios gerenciam objetivos" ON public.patient_objectives
  FOR ALL USING (
    user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
    AND (organization_id IS NULL OR user_belongs_to_organization(auth.uid(), organization_id))
  );

-- Patient Objective Assignments Policies
CREATE POLICY "Admins e fisios veem atribuições de objetivos" ON public.patient_objective_assignments
  FOR SELECT USING (
    user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
  );

CREATE POLICY "Admins e fisios gerenciam atribuições de objetivos" ON public.patient_objective_assignments
  FOR ALL USING (
    user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
  );

-- Triggers for updated_at
CREATE TRIGGER update_evolution_templates_updated_at
  BEFORE UPDATE ON public.evolution_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_evaluation_forms_updated_at
  BEFORE UPDATE ON public.evaluation_forms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_patient_evaluation_responses_updated_at
  BEFORE UPDATE ON public.patient_evaluation_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial objectives
INSERT INTO public.patient_objectives (nome, categoria, descricao) VALUES
  ('Alongamento', 'flexibilidade', 'Melhorar flexibilidade e amplitude de movimento'),
  ('Fortalecimento Muscular', 'força', 'Aumentar força e resistência muscular'),
  ('Melhora da Postura', 'postura', 'Corrigir desvios posturais e alinhamento'),
  ('Alívio da Dor', 'dor', 'Reduzir ou eliminar dores crônicas ou agudas'),
  ('Emagrecimento', 'composição', 'Perda de peso e melhora da composição corporal'),
  ('Ganho de Massa', 'composição', 'Aumento de massa muscular'),
  ('Mobilidade', 'funcional', 'Melhorar mobilidade articular'),
  ('Equilíbrio', 'funcional', 'Desenvolver equilíbrio e propriocepção'),
  ('Condicionamento', 'cardio', 'Melhorar capacidade cardiovascular'),
  ('Reabilitação Pós-Cirúrgica', 'reabilitação', 'Recuperação após procedimento cirúrgico'),
  ('Prevenção de Lesões', 'prevenção', 'Prevenir lesões esportivas ou ocupacionais'),
  ('Qualidade de Vida', 'bem-estar', 'Melhorar bem-estar geral e qualidade de vida');