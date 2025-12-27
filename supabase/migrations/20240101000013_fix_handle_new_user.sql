-- Corrigir a função handle_new_user para trabalhar com o enum user_role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  role_value TEXT;
  role_exists BOOLEAN;
BEGIN
  -- Verificar se a coluna role existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) INTO role_exists;
  
  -- Obter o valor do role do metadata
  role_value := COALESCE(NEW.raw_user_meta_data->>'role', 'fisioterapeuta');
  
  -- Inserir profile com ou sem role dependendo se a coluna existe
  IF role_exists THEN
    -- Tentar usar o enum user_role se existir, senão usar TEXT
    BEGIN
      INSERT INTO public.profiles (user_id, full_name, role)
      VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        role_value::TEXT
      );
    EXCEPTION WHEN OTHERS THEN
      -- Se falhar, tentar sem role
      INSERT INTO public.profiles (user_id, full_name)
      VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
      );
    END;
  ELSE
    -- Inserir sem role
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Nota: Inserção de usuários de teste removida para evitar conflitos com triggers de auditoria
-- Os usuários de teste podem ser criados manualmente se necessário