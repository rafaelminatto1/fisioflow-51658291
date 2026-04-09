-- Migration 0038: adiciona coluna focus_nfe_ref em nfse_records
-- Armazena a referência da nota na Focus NFe para consulta de status

ALTER TABLE nfse_records
  ADD COLUMN IF NOT EXISTS focus_nfe_ref VARCHAR(128);

CREATE INDEX IF NOT EXISTS idx_nfse_records_focus_ref ON nfse_records(focus_nfe_ref)
  WHERE focus_nfe_ref IS NOT NULL;
