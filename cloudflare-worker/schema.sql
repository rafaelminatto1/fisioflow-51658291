CREATE TABLE IF NOT EXISTS evolution_index (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  appointment_id TEXT,
  therapist_id TEXT,
  tags JSONB DEFAULT '[]', 
  preview_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices de alta performance para busca clínica
CREATE INDEX IF NOT EXISTS idx_evolution_patient_date ON evolution_index(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_evolution_tags_gin ON evolution_index USING GIN (tags);

-- Índices para Agenda (buscas por data são as mais comuns)
-- Nota: Como é clínica única, o organization_id é constante, mas mantemos para integridade
CREATE INDEX IF NOT EXISTS idx_appointments_date_time ON appointments(date, start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- Índices para busca de pacientes
CREATE INDEX IF NOT EXISTS idx_patients_name_trgm ON patients USING gin (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_patients_status_last_visit ON patients(status, last_visit_date);
