-- Rollback 0053: Remove NFS-e SP direct columns from nfse_config
ALTER TABLE nfse_config DROP COLUMN IF EXISTS regime_tributario;
ALTER TABLE nfse_config DROP COLUMN IF EXISTS codigo_servico_padrao;
ALTER TABLE nfse_config DROP COLUMN IF EXISTS cnae;
ALTER TABLE nfse_config DROP COLUMN IF EXISTS tp_opcao_simples;
ALTER TABLE nfse_config DROP COLUMN IF EXISTS razao_social;
