-- Fase 1: Infraestrutura de Banco de Dados

-- 1. Criar enum para roles (apenas se não existir)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('admin', 'fisioterapeuta', 'estagiario', 'paciente', 'parceiro');
    END IF;
END $$;

-- 2. Criar bucket para avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 
  'avatars', 
  true, 
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
);

-- 3. Expandir tabela profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS experience_years integer,
  ADD COLUMN IF NOT EXISTS consultation_fee numeric(10,2),
  ADD COLUMN IF NOT EXISTS available_hours jsonb DEFAULT '{"monday": {"start": "08:00", "end": "18:00"}, "tuesday": {"start": "08:00", "end": "18:00"}, "wednesday": {"start": "08:00", "end": "18:00"}, "thursday": {"start": "08:00", "end": "18:00"}, "friday": {"start": "08:00", "end": "18:00"}, "saturday": {"start": "08:00", "end": "12:00"}, "sunday": {"start": null, "end": null}}'::jsonb,
  ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{"email": true, "sms": false, "push": true}'::jsonb,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_login_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/Sao_Paulo';

-- Alterar coluna role apenas se existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role') THEN
        ALTER TABLE public.profiles 
          ALTER COLUMN role DROP DEFAULT;
        ALTER TABLE public.profiles 
          ALTER COLUMN role TYPE public.user_role USING role::text::public.user_role;
        ALTER TABLE public.profiles 
          ALTER COLUMN role SET DEFAULT 'fisioterapeuta'::public.user_role;
    END IF;
END $$;

-- 4. Criar políticas RLS para avatars
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 5. Atualizar função handle_new_user para incluir role (se existir)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role') THEN
    INSERT INTO public.profiles (
      user_id, 
      full_name, 
      role,
      onboarding_completed,
      last_login_at
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'paciente'::public.user_role),
      false,
      now()
    );
  ELSE
    INSERT INTO public.profiles (
      user_id, 
      full_name,
      onboarding_completed,
      last_login_at
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      false,
      now()
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- 6. Criar função para validar CREFITO
CREATE OR REPLACE FUNCTION public.validate_crefito(crefito_input text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
    crefito text;
BEGIN
    -- Remove caracteres não numéricos e converte para maiúsculo
    crefito := upper(regexp_replace(crefito_input, '[^0-9A-Z]', '', 'g'));
    
    -- Verifica formato básico (exemplo: CREFITO1-123456-F)
    IF crefito !~ '^CREFITO[0-9]{1,2}[0-9]{6}[A-Z]$' THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$function$;

-- 7. Criar trigger para atualizar last_login_at
CREATE OR REPLACE FUNCTION public.update_last_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
    UPDATE public.profiles 
    SET last_login_at = now()
    WHERE user_id = NEW.id;
    RETURN NEW;
END;
$function$;

CREATE TRIGGER on_auth_user_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW 
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION public.update_last_login();