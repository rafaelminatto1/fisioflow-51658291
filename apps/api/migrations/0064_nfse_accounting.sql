-- Migration: nfse_accounting_integration
-- Adiciona colunas para automação com contabilidades (ex: Contabilizei)

BEGIN;

ALTER TABLE nfse_config ADD COLUMN IF NOT EXISTS contabilidade_email TEXT;
ALTER TABLE nfse_config ADD COLUMN IF NOT EXISTS contabilidade_automacao_ativa BOOLEAN DEFAULT false;

COMMENT ON COLUMN nfse_config.contabilidade_email IS 'Email da contabilidade para onde as notas serão enviadas automaticamente';
COMMENT ON COLUMN nfse_config.contabilidade_automacao_ativa IS 'Se verdadeiro, envia email à contabilidade em cada emissão bem-sucedida';

-- Adiciona coluna na records para rastrear se foi enviado à contabilidade
ALTER TABLE nfse_records ADD COLUMN IF NOT EXISTS enviado_contabilidade_at TIMESTAMP WITH TIME ZONE;

-- Configurar padrão para o Rafael (Contabilizei)
UPDATE nfse_config
SET 
  contabilidade_email = 'rafael.minatto@yahoo.com.br', -- Placeholder, usuário deve atualizar no painel
  contabilidade_automacao_ativa = true
WHERE organization_id = (
  SELECT id FROM organizations WHERE cnpj = '54836577000167' LIMIT 1
);

COMMIT;
