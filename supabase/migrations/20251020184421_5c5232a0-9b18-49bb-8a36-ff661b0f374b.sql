-- Otimizações de Performance: Índices estratégicos

-- Índices para eventos (queries mais comuns)
CREATE INDEX IF NOT EXISTS idx_eventos_status ON public.eventos(status);
CREATE INDEX IF NOT EXISTS idx_eventos_data_inicio ON public.eventos(data_inicio);
CREATE INDEX IF NOT EXISTS idx_eventos_categoria ON public.eventos(categoria);
CREATE INDEX IF NOT EXISTS idx_eventos_parceiro_id ON public.eventos(parceiro_id);

-- Índices para prestadores (busca por evento)
CREATE INDEX IF NOT EXISTS idx_prestadores_evento_id ON public.prestadores(evento_id);
CREATE INDEX IF NOT EXISTS idx_prestadores_status_pagamento ON public.prestadores(status_pagamento);

-- Índices para participantes
CREATE INDEX IF NOT EXISTS idx_participantes_evento_id ON public.participantes(evento_id);
CREATE INDEX IF NOT EXISTS idx_participantes_nome ON public.participantes(nome);

-- Índices para checklist
CREATE INDEX IF NOT EXISTS idx_checklist_evento_id ON public.checklist_items(evento_id);
CREATE INDEX IF NOT EXISTS idx_checklist_status ON public.checklist_items(status);

-- Índices para pagamentos
CREATE INDEX IF NOT EXISTS idx_pagamentos_evento_id ON public.pagamentos(evento_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_tipo ON public.pagamentos(tipo);

-- Índices para appointments (queries de agenda)
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_therapist_id ON public.appointments(therapist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);

-- Índices para patients (busca comum)
CREATE INDEX IF NOT EXISTS idx_patients_name ON public.patients(name);
CREATE INDEX IF NOT EXISTS idx_patients_status ON public.patients(status);
CREATE INDEX IF NOT EXISTS idx_patients_incomplete ON public.patients(incomplete_registration) WHERE incomplete_registration = true;

-- Índices para profiles (lookup comum)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Índices para SOAP records
CREATE INDEX IF NOT EXISTS idx_soap_patient_id ON public.soap_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_soap_record_date ON public.soap_records(record_date DESC);
CREATE INDEX IF NOT EXISTS idx_soap_signed ON public.soap_records(signed_at) WHERE signed_at IS NOT NULL;

-- Índices para medical records
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id ON public.medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_date ON public.medical_records(record_date DESC);

-- Índices para exercise plans
CREATE INDEX IF NOT EXISTS idx_exercise_plans_patient_id ON public.exercise_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_exercise_plans_status ON public.exercise_plans(status);

-- Índices compostos para queries complexas
CREATE INDEX IF NOT EXISTS idx_appointments_date_therapist ON public.appointments(appointment_date, therapist_id);
CREATE INDEX IF NOT EXISTS idx_eventos_status_data ON public.eventos(status, data_inicio);

COMMENT ON INDEX idx_eventos_status IS 'Otimiza filtros por status de evento';
COMMENT ON INDEX idx_appointments_date IS 'Otimiza queries de agenda por data';
COMMENT ON INDEX idx_patients_incomplete IS 'Otimiza busca de cadastros incompletos';