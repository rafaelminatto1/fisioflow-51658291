-- Rollback 0038: Remove Focus NFe reference columns from nfse_records
DROP INDEX IF EXISTS idx_nfse_records_focus_ref;
ALTER TABLE nfse_records DROP COLUMN IF EXISTS focus_nfe_ref;
ALTER TABLE nfse_records DROP COLUMN IF EXISTS focus_status;
ALTER TABLE nfse_records DROP COLUMN IF EXISTS focus_pdf_url;
