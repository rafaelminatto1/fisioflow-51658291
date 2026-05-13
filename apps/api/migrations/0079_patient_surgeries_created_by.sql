-- Add created_by column to patient_surgeries (missing from original table creation)
ALTER TABLE patient_surgeries
  ADD COLUMN IF NOT EXISTS created_by TEXT;
