-- CORRIGIR POLÍTICAS RLS DUPLICADAS
-- Remover políticas existentes que causaram conflito
DROP POLICY IF EXISTS "Admins can view audit log" ON public.audit_log;
DROP POLICY IF EXISTS "Admins can manage clinic settings" ON public.clinic_settings;
DROP POLICY IF EXISTS "Staff can view clinic settings" ON public.clinic_settings;
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Recriar as políticas RLS corretamente
CREATE POLICY "Admins can view audit log" ON public.audit_log
    FOR SELECT USING (
        EXISTS(SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can manage clinic settings" ON public.clinic_settings
    FOR ALL USING (
        EXISTS(SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Staff can view clinic settings" ON public.clinic_settings
    FOR SELECT USING (
        EXISTS(SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('fisioterapeuta', 'estagiario'))
    );

CREATE POLICY "Users can view their notifications" ON public.notifications
    FOR SELECT USING (recipient_id = auth.uid());

CREATE POLICY "Users can update their notifications" ON public.notifications
    FOR UPDATE USING (recipient_id = auth.uid());

CREATE POLICY "System can create notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

-- ADICIONAR PUBLICAÇÕES PARA REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;