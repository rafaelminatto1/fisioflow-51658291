-- Criar tabela de templates de eventos
CREATE TABLE IF NOT EXISTS public.evento_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT NOT NULL,
  gratuito BOOLEAN NOT NULL DEFAULT false,
  valor_padrao_prestador NUMERIC NOT NULL DEFAULT 0,
  checklist_padrao JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.evento_templates ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins e fisios podem ver templates"
  ON public.evento_templates
  FOR SELECT
  USING (user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]));

CREATE POLICY "Admins e fisios podem criar templates"
  ON public.evento_templates
  FOR INSERT
  WITH CHECK (user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]));

CREATE POLICY "Admins e fisios podem atualizar templates"
  ON public.evento_templates
  FOR UPDATE
  USING (user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]));

CREATE POLICY "Admins e fisios podem deletar templates"
  ON public.evento_templates
  FOR DELETE
  USING (user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]));

-- Trigger para updated_at
CREATE TRIGGER update_evento_templates_updated_at
  BEFORE UPDATE ON public.evento_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();