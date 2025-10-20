-- Remover política antiga de INSERT de pacientes
DROP POLICY IF EXISTS "Therapists can create patients" ON public.patients;

-- Criar nova política que permite admins, fisios E estagiários criarem pacientes
CREATE POLICY "Terapeutas e estagiários podem criar pacientes"
ON public.patients
FOR INSERT
WITH CHECK (
  user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role, 'estagiario'::app_role])
);