-- Migration 0105: Performance indices for high-volume FK lookups
-- Creates indices on frequently queried foreign key columns to avoid sequential scans.

-- Appointments: most queried by patient and by org+date
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_org_date ON appointments(organization_id, date);

-- Sessions: most queried by patient and by org+date
CREATE INDEX IF NOT EXISTS idx_sessions_patient_id ON sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_sessions_appointment_id ON sessions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_sessions_org_date ON sessions(organization_id, date);

-- Patients: search by name within org
CREATE INDEX IF NOT EXISTS idx_patients_org_name ON patients(organization_id, full_name);

-- Prescribed exercises (home exercises): queried by patient
CREATE INDEX IF NOT EXISTS idx_prescribed_exercises_patient_id ON prescribed_exercises(patient_id);

-- Pain maps: queried by patient
CREATE INDEX IF NOT EXISTS idx_pain_maps_patient_id ON pain_maps(patient_id);
