-- Add record_type and title columns to medical_records table
ALTER TABLE medical_records 
ADD COLUMN IF NOT EXISTS record_type text DEFAULT 'anamnesis',
ADD COLUMN IF NOT EXISTS title text;

-- Update existing records to have a default title if needed
UPDATE medical_records SET title = 'Registro Anterior' WHERE title IS NULL;
