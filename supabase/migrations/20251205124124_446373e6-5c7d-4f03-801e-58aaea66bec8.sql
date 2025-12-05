-- Create tasks table for Kanban board
CREATE TABLE public.tarefas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  status TEXT NOT NULL DEFAULT 'A_FAZER',
  prioridade TEXT NOT NULL DEFAULT 'MEDIA',
  data_vencimento DATE,
  responsavel_id UUID REFERENCES public.profiles(id),
  organization_id UUID REFERENCES public.organizations(id),
  created_by UUID,
  order_index INTEGER NOT NULL DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Membros veem tarefas da org"
ON public.tarefas FOR SELECT
USING (user_belongs_to_organization(auth.uid(), organization_id));

CREATE POLICY "Membros podem criar tarefas"
ON public.tarefas FOR INSERT
WITH CHECK (user_belongs_to_organization(auth.uid(), organization_id));

CREATE POLICY "Membros podem atualizar tarefas"
ON public.tarefas FOR UPDATE
USING (user_belongs_to_organization(auth.uid(), organization_id));

CREATE POLICY "Admins e fisios podem deletar tarefas"
ON public.tarefas FOR DELETE
USING (user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]));

-- Trigger for updated_at
CREATE TRIGGER update_tarefas_updated_at
BEFORE UPDATE ON public.tarefas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();