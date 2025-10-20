-- Adicionar campo para marcar pacientes com cadastro incompleto
ALTER TABLE patients
ADD COLUMN incomplete_registration BOOLEAN DEFAULT FALSE;

-- Criar índice para busca rápida de pacientes com cadastro incompleto
CREATE INDEX idx_patients_incomplete_registration 
ON patients(incomplete_registration) 
WHERE incomplete_registration = TRUE;