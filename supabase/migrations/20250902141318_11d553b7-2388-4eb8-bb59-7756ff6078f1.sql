-- Insert demo appointments with fixed dates
INSERT INTO public.appointments (
    id,
    patient_id,
    appointment_date,
    appointment_time,
    duration,
    type,
    status,
    notes
) 
SELECT 
    gen_random_uuid(),
    p.id,
    CASE 
        WHEN p.name = 'Maria Silva' THEN CURRENT_DATE
        WHEN p.name = 'João Santos' THEN CURRENT_DATE + interval '1 day'
        WHEN p.name = 'Ana Oliveira' THEN CURRENT_DATE + interval '2 days'
        WHEN p.name = 'Carlos Pereira' THEN CURRENT_DATE + interval '3 days'
        ELSE CURRENT_DATE + interval '4 days'
    END,
    CASE 
        WHEN p.name = 'Maria Silva' THEN '09:00:00'::time
        WHEN p.name = 'João Santos' THEN '10:00:00'::time
        WHEN p.name = 'Ana Oliveira' THEN '11:00:00'::time
        WHEN p.name = 'Carlos Pereira' THEN '14:00:00'::time
        ELSE '15:00:00'::time
    END,
    60,
    CASE 
        WHEN p.name = 'Maria Silva' THEN 'Consulta Inicial'
        WHEN p.name = 'João Santos' THEN 'Sessão de Fisioterapia'
        ELSE 'Reavaliação'
    END,
    'Confirmado',
    'Agendamento demo para ' || p.name
FROM public.patients p
WHERE p.name IN ('Maria Silva', 'João Santos', 'Ana Oliveira', 'Carlos Pereira', 'Fernanda Costa')
ON CONFLICT DO NOTHING;

-- Insert some exercise plans
INSERT INTO public.exercise_plans (
    id,
    patient_id,
    name,
    description,
    status
) 
SELECT 
    gen_random_uuid(),
    p.id,
    'Plano de ' || p.main_condition || ' - ' || p.name,
    'Plano personalizado para tratamento de ' || p.main_condition,
    'Ativo'
FROM public.patients p
WHERE p.name IN ('Maria Silva', 'João Santos', 'Ana Oliveira')
ON CONFLICT DO NOTHING;

-- Insert some patient progress data
INSERT INTO public.patient_progress (
    id,
    patient_id,
    progress_date,
    pain_level,
    functional_score,
    exercise_compliance,
    notes
) 
SELECT 
    gen_random_uuid(),
    p.id,
    CURRENT_DATE - interval '1 day',
    CASE 
        WHEN p.name = 'Maria Silva' THEN 4
        WHEN p.name = 'João Santos' THEN 3
        ELSE 5
    END,
    CASE 
        WHEN p.name = 'Maria Silva' THEN 70
        WHEN p.name = 'João Santos' THEN 80
        ELSE 60
    END,
    CASE 
        WHEN p.name = 'Maria Silva' THEN 85
        WHEN p.name = 'João Santos' THEN 90
        ELSE 75
    END,
    'Evolução satisfatória. Paciente demonstra boa aderência ao tratamento.'
FROM public.patients p
WHERE p.name IN ('Maria Silva', 'João Santos', 'Ana Oliveira')
ON CONFLICT DO NOTHING;