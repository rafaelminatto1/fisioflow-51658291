-- Rollback: 0054_patient_directory_filters
-- Remove colunas de filtros estruturados adicionadas em patients

ALTER TABLE patients DROP COLUMN IF EXISTS care_profiles;
ALTER TABLE patients DROP COLUMN IF EXISTS sports_practiced;
-- Adicione aqui outras colunas adicionadas pela migration 0054, se houver
