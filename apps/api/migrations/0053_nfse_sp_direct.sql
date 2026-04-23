-- Migration: nfse_sp_direct — Colunas para emissão direta via Prefeitura SP
-- Adiciona colunas que faltam na nfse_config e nfse_records para suportar
-- emissão direta via webservice SOAP com certificado digital (sem Focus NFe).

BEGIN;

-- nfse_config: adicionar colunas para emissão SP direta
ALTER TABLE nfse_config ADD COLUMN IF NOT EXISTS razao_social TEXT;
ALTER TABLE nfse_config ADD COLUMN IF NOT EXISTS tp_opcao_simples INTEGER DEFAULT 4;
ALTER TABLE nfse_config ADD COLUMN IF NOT EXISTS cnae TEXT DEFAULT '8650-0/04';
ALTER TABLE nfse_config ADD COLUMN IF NOT EXISTS codigo_servico_padrao TEXT DEFAULT '14.01';
ALTER TABLE nfse_config ADD COLUMN IF NOT EXISTS regime_tributario TEXT DEFAULT 'simples_nacional';
ALTER TABLE nfse_config ADD COLUMN IF NOT EXISTS optante_simples BOOLEAN DEFAULT true;
ALTER TABLE nfse_config ADD COLUMN IF NOT EXISTS incentivo_fiscal BOOLEAN DEFAULT false;
ALTER TABLE nfse_config ADD COLUMN IF NOT EXISTS discriminacao_padrao TEXT;

COMMENT ON COLUMN nfse_config.razao_social IS 'Razão social do prestador de serviços';
COMMENT ON COLUMN nfse_config.tp_opcao_simples IS 'Código opção Simples Nacional (4 = Simples Nacional Anexo III)';
COMMENT ON COLUMN nfse_config.cnae IS 'Código CNAE principal (8650-0/04 = fisioterapeuta)';
COMMENT ON COLUMN nfse_config.codigo_servico_padrao IS 'Código de serviço padrão NFS-e SP (14.01 = fisioterapia)';

-- nfse_records: adicionar colunas para emissão SP direta
ALTER TABLE nfse_records ADD COLUMN IF NOT EXISTS sp_lote_numero TEXT;
ALTER TABLE nfse_records ADD COLUMN IF NOT EXISTS link_danfse TEXT;

COMMENT ON COLUMN nfse_records.sp_lote_numero IS 'Número do lote informado pela Prefeitura SP';
COMMENT ON COLUMN nfse_records.link_danfse IS 'URL do PDF DANFSe stored no Cloudflare R2';

-- Atualizar registro da organização do Rafael com dados reais se ainda vazio
UPDATE nfse_config
SET
  razao_social = COALESCE(razao_social, 'MOOCA FISIOTERAPIA RA LTDA'),
  cnpj_prestador = COALESCE(cnpj_prestador, '54836577000167'),
  inscricao_municipal = COALESCE(inscricao_municipal, '01353415'),
  municipio_codigo = COALESCE(municipio_codigo, '3550308'),
  tp_opcao_simples = COALESCE(tp_opcao_simples, 4),
  cnae = COALESCE(cnae, '8650-0/04'),
  codigo_servico_padrao = COALESCE(codigo_servico_padrao, '14.01'),
  aliquota_iss = COALESCE(aliquota_iss, 0.02),
  ambiente = COALESCE(ambiente, 'homologacao')
WHERE organization_id = (
  SELECT id FROM organizations WHERE cnpj = '54836577000167' LIMIT 1
);

COMMIT;