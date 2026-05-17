-- 0090_organizations_metadata.sql
--
-- Adiciona coluna `metadata` em organizations. Usada pelo trigger
-- lead_efetivado_to_patient (migration 0085) para ler a flag
-- `auto_convert_on_efetivado`. Sem essa coluna o trigger falha.
--
-- Esta migration DEVE ser aplicada ANTES de 0085 na primeira execução
-- (ordem numérica não reflete a dependência — aplicar manualmente
-- quando rodar 0083-0089 do zero).

BEGIN;
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
COMMIT;
