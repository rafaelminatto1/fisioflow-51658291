-- CORRIGIR POLÍTICAS RLS DUPLICADAS
-- Remover políticas existentes que causaram conflito
DROP POLICY IF EXISTS "Admins can view audit log" ON public.audit_log;
DROP POLICY IF EXISTS "Admins can manage clinic settings" ON public.clinic_settings;
DROP POLICY IF EXISTS "Staff can view clinic settings" ON public.clinic_settings;
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Recriar as políticas RLS corretamente usando EXECUTE para evitar erros de sintaxe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role') THEN
        EXECUTE 'CREATE POLICY "Admins can view audit log" ON public.audit_log
            FOR SELECT USING (
                EXISTS(SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = ''admin'')
                OR EXISTS(SELECT 1 FROM public.organization_members WHERE user_id = auth.uid() AND role = ''admin'')
            )';
        EXECUTE 'CREATE POLICY "Admins can manage clinic settings" ON public.clinic_settings
            FOR ALL USING (
                EXISTS(SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = ''admin'')
                OR EXISTS(SELECT 1 FROM public.organization_members WHERE user_id = auth.uid() AND role = ''admin'')
            )';
        EXECUTE 'CREATE POLICY "Staff can view clinic settings" ON public.clinic_settings
            FOR SELECT USING (
                EXISTS(SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN (''fisioterapeuta'', ''estagiario''))
            )';
    ELSE
        EXECUTE 'CREATE POLICY "Admins can view audit log" ON public.audit_log
            FOR SELECT USING (
                EXISTS(SELECT 1 FROM public.organization_members WHERE user_id = auth.uid() AND role = ''admin'')
            )';
        EXECUTE 'CREATE POLICY "Admins can manage clinic settings" ON public.clinic_settings
            FOR ALL USING (
                EXISTS(SELECT 1 FROM public.organization_members WHERE user_id = auth.uid() AND role = ''admin'')
            )';
        EXECUTE 'CREATE POLICY "Staff can view clinic settings" ON public.clinic_settings
            FOR SELECT USING (true)';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'recipient_id') THEN
        EXECUTE 'CREATE POLICY "Users can view their notifications" ON public.notifications
            FOR SELECT USING (recipient_id = auth.uid())';
        EXECUTE 'CREATE POLICY "Users can update their notifications" ON public.notifications
            FOR UPDATE USING (recipient_id = auth.uid())';
    ELSE
        EXECUTE 'CREATE POLICY "Users can view their notifications" ON public.notifications
            FOR SELECT USING (true)';
        EXECUTE 'CREATE POLICY "Users can update their notifications" ON public.notifications
            FOR UPDATE USING (true)';
    END IF;
    
    EXECUTE 'CREATE POLICY "System can create notifications" ON public.notifications
        FOR INSERT WITH CHECK (true)';
END $$;

-- ADICIONAR PUBLICAÇÕES PARA REALTIME (apenas se não estiverem já adicionadas)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'appointments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
END $$;