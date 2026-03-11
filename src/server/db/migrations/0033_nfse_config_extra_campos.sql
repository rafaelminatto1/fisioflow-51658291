-- Adiciona campos extras ao nfse_config para emissão de NFS-e São Paulo
ALTER TABLE nfse_config
  ADD COLUMN IF NOT EXISTS razao_social_prestador text,
  ADD COLUMN IF NOT EXISTS endereco_prestador text,
  ADD COLUMN IF NOT EXISTS telefone_prestador text,
  ADD COLUMN IF NOT EXISTS codigo_tuss text DEFAULT '04391',
  ADD COLUMN IF NOT EXISTS nome_responsavel text,
  ADD COLUMN IF NOT EXISTS conselho_tipo text DEFAULT 'CREFITO-3',
  ADD COLUMN IF NOT EXISTS conselho_numero text,
  ADD COLUMN IF NOT EXISTS percentual_impostos numeric(5,2) DEFAULT 8.70;
