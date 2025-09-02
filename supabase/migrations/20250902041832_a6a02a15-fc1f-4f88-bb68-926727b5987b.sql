-- Corrigir migração - lidar com política existente

-- 1. Remover política que usa a coluna role
DROP POLICY IF EXISTS "Admins can view audit log" ON public.audit_log;

-- 2. Criar enum para roles
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('admin', 'fisioterapeuta', 'estagiario', 'paciente', 'parceiro');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Criar bucket para avatars (se não existir)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 
  'avatars', 
  true, 
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- 4. Expandir tabela profiles
ALTER TABLE public.profiles 
  ALTER COLUMN role DROP DEFAULT,
  ALTER COLUMN role TYPE public.user_role USING role::public.user_role,
  ALTER COLUMN role SET DEFAULT 'fisioterapeuta'::public.user_role;

-- Adicionar novas colunas se não existirem
DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN bio text;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN experience_years integer;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN consultation_fee numeric(10,2);
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN available_hours jsonb DEFAULT '{"monday": {"start": "08:00", "end": "18:00"}, "tuesday": {"start": "08:00", "end": "18:00"}, "wednesday": {"start": "08:00", "end": "18:00"}, "thursday": {"start": "08:00", "end": "18:00"}, "friday": {"start": "08:00", "end": "18:00"}, "saturday": {"start": "08:00", "end": "12:00"}, "sunday": {"start": null, "end": null}}'::jsonb;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN notification_preferences jsonb DEFAULT '{"email": true, "sms": false, "push": true}'::jsonb;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN onboarding_completed boolean DEFAULT false;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN last_login_at timestamp with time zone;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN timezone text DEFAULT 'America/Sao_Paulo';
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- 5. Recriar política do audit_log com novo tipo
CREATE POLICY "Admins can view audit log" 
ON public.audit_log 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'::public.user_role
  )
);

-- 6. Criar políticas RLS para avatars
DO $$ BEGIN
  CREATE POLICY "Avatar images are publicly accessible" 
  ON storage.objects 
  FOR SELECT 
  USING (bucket_id = 'avatars');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can upload their own avatar" 
  ON storage.objects 
  FOR INSERT 
  WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update their own avatar" 
  ON storage.objects 
  FOR UPDATE 
  USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete their own avatar" 
  ON storage.objects 
  FOR DELETE 
  USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;