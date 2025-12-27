-- Criar tabela de eventos
CREATE TABLE IF NOT EXISTS public.eventos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT NOT NULL CHECK (categoria IN ('corrida', 'corporativo', 'ativacao', 'outro')),
  local TEXT NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'AGENDADO' CHECK (status IN ('AGENDADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO')),
  gratuito BOOLEAN NOT NULL DEFAULT false,
  link_whatsapp TEXT,
  valor_padrao_prestador DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de prestadores
CREATE TABLE IF NOT EXISTS public.prestadores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  contato TEXT,
  cpf_cnpj TEXT,
  valor_acordado DECIMAL(10,2) NOT NULL DEFAULT 0,
  status_pagamento TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status_pagamento IN ('PENDENTE', 'PAGO')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de checklist
CREATE TABLE IF NOT EXISTS public.checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('levar', 'alugar', 'comprar')),
  quantidade INTEGER NOT NULL DEFAULT 1,
  custo_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ABERTO' CHECK (status IN ('ABERTO', 'OK')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de participantes
CREATE TABLE IF NOT EXISTS public.participantes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  contato TEXT,
  instagram TEXT,
  segue_perfil BOOLEAN NOT NULL DEFAULT false,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de pagamentos (financeiro)
CREATE TABLE IF NOT EXISTS public.pagamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('prestador', 'insumo', 'outro')),
  descricao TEXT NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  pago_em DATE NOT NULL,
  comprovante_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_eventos_status ON public.eventos(status);
CREATE INDEX IF NOT EXISTS idx_eventos_categoria ON public.eventos(categoria);
CREATE INDEX IF NOT EXISTS idx_eventos_data_inicio ON public.eventos(data_inicio);
CREATE INDEX IF NOT EXISTS idx_prestadores_evento_id ON public.prestadores(evento_id);
CREATE INDEX IF NOT EXISTS idx_prestadores_status ON public.prestadores(status_pagamento);
CREATE INDEX IF NOT EXISTS idx_checklist_evento_id ON public.checklist_items(evento_id);
CREATE INDEX IF NOT EXISTS idx_checklist_status ON public.checklist_items(status);
CREATE INDEX IF NOT EXISTS idx_participantes_evento_id ON public.participantes(evento_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_evento_id ON public.pagamentos(evento_id);

-- Criar triggers para updated_at
DROP TRIGGER IF EXISTS update_eventos_updated_at ON public.eventos;
CREATE TRIGGER update_eventos_updated_at
BEFORE UPDATE ON public.eventos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_prestadores_updated_at ON public.prestadores;
CREATE TRIGGER update_prestadores_updated_at
BEFORE UPDATE ON public.prestadores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_checklist_items_updated_at ON public.checklist_items;
CREATE TRIGGER update_checklist_items_updated_at
BEFORE UPDATE ON public.checklist_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_participantes_updated_at ON public.participantes;
CREATE TRIGGER update_participantes_updated_at
BEFORE UPDATE ON public.participantes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_pagamentos_updated_at ON public.pagamentos;
CREATE TRIGGER update_pagamentos_updated_at
BEFORE UPDATE ON public.pagamentos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prestadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para eventos
DROP POLICY IF EXISTS "Admins e fisios podem ver todos os eventos" ON public.eventos;
CREATE POLICY "Admins e fisios podem ver todos os eventos"
ON public.eventos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('admin', 'fisioterapeuta')
  )
);

DROP POLICY IF EXISTS "Admins e fisios podem criar eventos" ON public.eventos;
CREATE POLICY "Admins e fisios podem criar eventos"
ON public.eventos FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('admin', 'fisioterapeuta')
  )
);

DROP POLICY IF EXISTS "Admins e fisios podem atualizar eventos" ON public.eventos;
CREATE POLICY "Admins e fisios podem atualizar eventos"
ON public.eventos FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('admin', 'fisioterapeuta')
  )
);

DROP POLICY IF EXISTS "Apenas admins podem deletar eventos" ON public.eventos;
CREATE POLICY "Apenas admins podem deletar eventos"
ON public.eventos FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Políticas RLS para prestadores (herdam acesso dos eventos)
DROP POLICY IF EXISTS "Acesso a prestadores segue acesso aos eventos" ON public.prestadores;
CREATE POLICY "Acesso a prestadores segue acesso aos eventos"
ON public.prestadores FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('admin', 'fisioterapeuta')
  )
);

-- Políticas RLS para checklist (herdam acesso dos eventos)
DROP POLICY IF EXISTS "Acesso ao checklist segue acesso aos eventos" ON public.checklist_items;
CREATE POLICY "Acesso ao checklist segue acesso aos eventos"
ON public.checklist_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('admin', 'fisioterapeuta', 'estagiario')
  )
);

-- Políticas RLS para participantes (herdam acesso dos eventos)
DROP POLICY IF EXISTS "Acesso aos participantes segue acesso aos eventos" ON public.participantes;
CREATE POLICY "Acesso aos participantes segue acesso aos eventos"
ON public.participantes FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('admin', 'fisioterapeuta', 'estagiario')
  )
);

-- Políticas RLS para pagamentos (apenas admin e fisio)
DROP POLICY IF EXISTS "Apenas admins e fisios acessam pagamentos" ON public.pagamentos;
CREATE POLICY "Apenas admins e fisios acessam pagamentos"
ON public.pagamentos FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('admin', 'fisioterapeuta')
  )
);