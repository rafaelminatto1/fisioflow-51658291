-- Tabela de templates de exercícios (por patologia ou pós-operatório)
CREATE TABLE IF NOT EXISTS public.exercise_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'patologia' ou 'pos_operatorio'
  condition_name TEXT NOT NULL, -- ex: 'LCA', 'Pata de Ganso', 'Cervicalgia'
  template_variant TEXT, -- ex: 'conservador', 'agressivo', 'inicial'
  organization_id UUID REFERENCES public.organizations(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(condition_name, template_variant, organization_id)
);

-- Tabela de exercícios dentro de cada template
CREATE TABLE IF NOT EXISTS public.exercise_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.exercise_templates(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  sets INTEGER,
  repetitions INTEGER,
  duration INTEGER,
  notes TEXT,
  week_start INTEGER, -- Semana de início (útil para pós-operatórios)
  week_end INTEGER, -- Semana de fim
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(template_id, exercise_id, week_start)
);

-- Tabela de protocolos (para regras de progressão)
CREATE TABLE IF NOT EXISTS public.exercise_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  condition_name TEXT NOT NULL,
  protocol_type TEXT NOT NULL, -- 'pos_operatorio', 'patologia'
  weeks_total INTEGER,
  milestones JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{week: 4, description: "Descarga total permitida"}, ...]
  restrictions JSONB NOT NULL DEFAULT '[]'::jsonb, -- Restrições por semana
  progression_criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
  organization_id UUID REFERENCES public.organizations(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_exercise_templates_condition ON public.exercise_templates(condition_name);
CREATE INDEX IF NOT EXISTS idx_exercise_templates_category ON public.exercise_templates(category);
CREATE INDEX IF NOT EXISTS idx_exercise_template_items_template ON public.exercise_template_items(template_id);
CREATE INDEX IF NOT EXISTS idx_exercise_protocols_condition ON public.exercise_protocols(condition_name);

-- RLS Policies para exercise_templates
ALTER TABLE public.exercise_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros veem templates da org ou públicos"
  ON public.exercise_templates FOR SELECT
  USING (
    organization_id IS NULL OR 
    user_belongs_to_organization(auth.uid(), organization_id)
  );

CREATE POLICY "Terapeutas gerenciam templates da org"
  ON public.exercise_templates FOR ALL
  USING (
    (organization_id IS NULL AND user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])) OR
    (user_belongs_to_organization(auth.uid(), organization_id) AND user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]))
  );

-- RLS Policies para exercise_template_items
ALTER TABLE public.exercise_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros veem itens de templates"
  ON public.exercise_template_items FOR SELECT
  USING (
    template_id IN (
      SELECT id FROM public.exercise_templates
    )
  );

CREATE POLICY "Terapeutas gerenciam itens de templates"
  ON public.exercise_template_items FOR ALL
  USING (
    template_id IN (
      SELECT id FROM public.exercise_templates
      WHERE (organization_id IS NULL AND user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]))
         OR (user_belongs_to_organization(auth.uid(), organization_id) AND user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]))
    )
  );

-- RLS Policies para exercise_protocols
ALTER TABLE public.exercise_protocols ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver protocolos"
  ON public.exercise_protocols FOR SELECT
  USING (
    organization_id IS NULL OR 
    user_belongs_to_organization(auth.uid(), organization_id)
  );

CREATE POLICY "Terapeutas gerenciam protocolos"
  ON public.exercise_protocols FOR ALL
  USING (
    (organization_id IS NULL AND user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])) OR
    (user_belongs_to_organization(auth.uid(), organization_id) AND user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]))
  );

-- Trigger para updated_at
CREATE TRIGGER update_exercise_templates_updated_at
  BEFORE UPDATE ON public.exercise_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_exercise_protocols_updated_at
  BEFORE UPDATE ON public.exercise_protocols
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();