-- Corrigir policy para staff_performance_metrics usando therapist_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'staff_performance_metrics' AND schemaname = 'public') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view performance metrics" ON public.staff_performance_metrics';
    EXECUTE 'CREATE POLICY "Admins veem métricas de performance" ON public.staff_performance_metrics FOR SELECT USING (user_is_admin(auth.uid()))';
    EXECUTE 'CREATE POLICY "Profissionais veem próprias métricas" ON public.staff_performance_metrics FOR SELECT USING ((therapist_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())))';
    EXECUTE 'CREATE POLICY "Sistema cria métricas" ON public.staff_performance_metrics FOR INSERT WITH CHECK (true)';
  END IF;
END $$;