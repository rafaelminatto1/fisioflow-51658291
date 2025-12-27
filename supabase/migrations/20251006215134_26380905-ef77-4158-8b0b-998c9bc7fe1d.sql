-- Criar enum para roles (apenas se não existir)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE app_role AS ENUM ('admin', 'fisioterapeuta', 'estagiario', 'paciente');
    END IF;
END $$;

-- Criar tabela de roles separada (segurança crítica)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Habilitar RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Política: usuários podem ver suas próprias roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política: apenas admins podem gerenciar roles
DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;
CREATE POLICY "Only admins can manage roles"
  ON public.user_roles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
  );

-- Criar função security definer para verificar roles (evita recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Criar função para verificar se é admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::app_role)
$$;

-- Criar função para verificar se é fisio ou admin
CREATE OR REPLACE FUNCTION public.is_fisio_or_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin'::app_role, 'fisioterapeuta'::app_role)
  )
$$;

-- Criar função para obter roles do usuário
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS SETOF app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
$$;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_user_roles_updated_at ON public.user_roles;
CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Migrar roles existentes da tabela profiles para user_roles (apenas se a coluna role existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role') THEN
        INSERT INTO public.user_roles (user_id, role)
        SELECT user_id, role::app_role
        FROM public.profiles
        WHERE role IS NOT NULL
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Ignorar erros (migration não é crítica)
        NULL;
END $$;

-- Comentários para documentação
COMMENT ON TABLE public.user_roles IS 'Tabela de roles dos usuários - separada para segurança';
COMMENT ON FUNCTION public.has_role IS 'Verifica se usuário tem uma role específica';
COMMENT ON FUNCTION public.is_admin IS 'Verifica se usuário é admin';
COMMENT ON FUNCTION public.is_fisio_or_admin IS 'Verifica se usuário é fisio ou admin';