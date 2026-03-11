-- Adiciona campos para integração com Nuvem Fiscal (API NFS-e) no nfse_config
ALTER TABLE nfse_config
  ADD COLUMN IF NOT EXISTS nuvem_fiscal_api_key text,
  ADD COLUMN IF NOT EXISTS nuvem_fiscal_ambiente text DEFAULT 'homologacao',
  ADD COLUMN IF NOT EXISTS optante_simples_nacional boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS incentivador_cultural boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS natureza_operacao integer DEFAULT 1;

-- Adiciona campos no registro da NFS-e para rastrear a emissão
ALTER TABLE nfse
  ADD COLUMN IF NOT EXISTS pdf_url text,
  ADD COLUMN IF NOT EXISTS nuvem_fiscal_id text,
  ADD COLUMN IF NOT EXISTS patient_phone text,
  ADD COLUMN IF NOT EXISTS patient_email text;
