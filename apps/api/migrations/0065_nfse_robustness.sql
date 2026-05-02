-- Migration: nfse_robustness_and_status
-- Adiciona colunas para melhor visibilidade de status e rastreio de erros

BEGIN;

-- Novos status sugeridos para a aplicação:
-- 'rascunho', 'aguardando_internet', 'aguardando_prefeitura', 'autorizado', 'falhou', 'cancelado'

ALTER TABLE nfse_records ADD COLUMN IF NOT EXISTS tentativas_envio INTEGER DEFAULT 0;
ALTER TABLE nfse_records ADD COLUMN IF NOT EXISTS ultimo_erro TEXT;
ALTER TABLE nfse_records ADD COLUMN IF NOT EXISTS workflow_id TEXT;

COMMENT ON COLUMN nfse_records.tentativas_envio IS 'Número de vezes que o sistema tentou transmitir esta nota';
COMMENT ON COLUMN nfse_records.ultimo_erro IS 'Log do último erro retornado pela prefeitura ou sistema';

COMMIT;
