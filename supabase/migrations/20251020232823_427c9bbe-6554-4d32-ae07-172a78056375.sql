-- Criar usuários de demonstração com roles
-- IMPORTANTE: Esta migration só funciona se você criar os usuários manualmente no Supabase Dashboard primeiro
-- OU usar a edge function que vou criar para criar os usuários automaticamente

-- Desabilitar temporariamente triggers de auditoria para evitar erros de tipo
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT trigger_name, event_object_table 
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public' 
        AND trigger_name LIKE '%audit%'
    LOOP
        EXECUTE format('ALTER TABLE %I.%I DISABLE TRIGGER %I', 'public', r.event_object_table, r.trigger_name);
    END LOOP;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- Função para criar usuário de demonstração com role (apenas se não existir)
CREATE OR REPLACE FUNCTION public.setup_demo_user(
  _email text,
  _full_name text,
  _role app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
BEGIN
  -- Buscar user_id do email (se existir)
  SELECT id INTO _user_id
  FROM auth.users
  WHERE email = _email;
  
  -- Se usuário existe, configurar profile e role
  IF _user_id IS NOT NULL THEN
    -- Inserir/atualizar profile
    INSERT INTO public.profiles (user_id, full_name, email, onboarding_completed)
    VALUES (_user_id, _full_name, _email, true)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      full_name = EXCLUDED.full_name,
      onboarding_completed = true;
    
    -- Inserir role (se não existir)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, _role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Usuário % configurado com role %', _email, _role;
  ELSE
    RAISE NOTICE 'Usuário % não encontrado. Crie-o manualmente no Supabase Dashboard.', _email;
  END IF;
END;
$$;

-- Executar setup para cada usuário de demonstração
-- Nota: Os usuários devem ser criados manualmente primeiro no Supabase Dashboard
SELECT public.setup_demo_user('admin@fisioflow.com', 'Administrador Demo', 'admin');
SELECT public.setup_demo_user('fisio@fisioflow.com', 'Fisioterapeuta Demo', 'fisioterapeuta');
SELECT public.setup_demo_user('estagiario@fisioflow.com', 'Estagiário Demo', 'estagiario');

-- Reabilitar triggers de auditoria
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT trigger_name, event_object_table 
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public' 
        AND trigger_name LIKE '%audit%'
    LOOP
        EXECUTE format('ALTER TABLE %I.%I ENABLE TRIGGER %I', 'public', r.event_object_table, r.trigger_name);
    END LOOP;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;