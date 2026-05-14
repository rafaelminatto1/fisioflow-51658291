-- Rollback: 0081_evolution_observacao
-- ATENÇÃO: rollback restaura colunas vazias (dados não recuperáveis).

BEGIN;

ALTER TABLE sessions
  DROP COLUMN IF EXISTS observacao,
  DROP COLUMN IF EXISTS pain_scale,
  DROP COLUMN IF EXISTS procedures,
  DROP COLUMN IF EXISTS exercises,
  DROP COLUMN IF EXISTS measurements,
  DROP COLUMN IF EXISTS home_exercises;

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS subjective JSONB,
  ADD COLUMN IF NOT EXISTS objective JSONB,
  ADD COLUMN IF NOT EXISTS assessment JSONB,
  ADD COLUMN IF NOT EXISTS plan JSONB;

ALTER TABLE session_templates
  DROP COLUMN IF EXISTS body_html,
  DROP COLUMN IF EXISTS category;

ALTER TABLE session_templates
  ADD COLUMN IF NOT EXISTS subjective JSONB,
  ADD COLUMN IF NOT EXISTS objective JSONB,
  ADD COLUMN IF NOT EXISTS assessment JSONB,
  ADD COLUMN IF NOT EXISTS plan JSONB;

COMMIT;
