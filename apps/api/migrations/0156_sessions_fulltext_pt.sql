-- 0156_sessions_fulltext_pt.sql
-- Índice full-text em português sobre a observação clínica.
--
-- Why full-text ALÉM do vetor: o texto da clínica é cheio de jargão abreviado
-- criado internamente — TFS, IQT, QDP, TTFFSS, PQD, EENM, MWM. Modelo de
-- embedding não foi treinado nisso e erra justamente nesses termos, que são os
-- mais discriminativos para a busca ("quais pacientes fizeram TENS em TFS?").
-- Léxico acerta onde o vetor erra, e vice-versa para paráfrase clínica
-- ("paciente melhorou da dor lombar"), daí a busca híbrida.
--
-- Coluna GERADA em vez de trigger: não há como esquecer de atualizar, e não há
-- estado a divergir. O custo é recalcular no UPDATE de `observacao`, que é
-- aceitável — a evolução é escrita uma vez e lida muitas.

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS observacao_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('portuguese', coalesce(observacao, ''))) STORED;

CREATE INDEX IF NOT EXISTS idx_sessions_observacao_tsv
  ON sessions USING gin (observacao_tsv);

COMMENT ON COLUMN sessions.observacao_tsv IS
  'Full-text em português da observação clínica. Compõe a busca híbrida com clinical_embeddings — o léxico acerta o jargão local (TFS, IQT, QDP) onde o embedding erra.';
