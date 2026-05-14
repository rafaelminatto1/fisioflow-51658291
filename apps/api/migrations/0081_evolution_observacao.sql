-- Migration: Evolução em texto livre (observação única)
-- Description: Remove modelo SOAP (subjective/objective/assessment/plan) e adopta
--              um único campo `observacao` (TEXT/HTML) + dados estruturados adjacentes
--              (pain_scale, procedures, exercises). Não preserva dados antigos —
--              decisão do produto: sistema parte fresh do novo padrão.
-- Author: refactor SOAP→observação (feat/evolucao-observacao-livre)
-- Date: 2026-05-14

BEGIN;

-- ===== SESSIONS =====
ALTER TABLE sessions
  DROP COLUMN IF EXISTS subjective,
  DROP COLUMN IF EXISTS objective,
  DROP COLUMN IF EXISTS assessment,
  DROP COLUMN IF EXISTS plan;

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS observacao TEXT,
  ADD COLUMN IF NOT EXISTS pain_scale SMALLINT
    CHECK (pain_scale IS NULL OR (pain_scale >= 0 AND pain_scale <= 10)),
  ADD COLUMN IF NOT EXISTS procedures JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS measurements JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS home_exercises JSONB NOT NULL DEFAULT '[]'::jsonb;

-- ===== SESSION TEMPLATES (Drizzle) =====
-- Convertendo templates SOAP para body_html (texto único).
ALTER TABLE session_templates
  DROP COLUMN IF EXISTS subjective,
  DROP COLUMN IF EXISTS objective,
  DROP COLUMN IF EXISTS assessment,
  DROP COLUMN IF EXISTS plan;

ALTER TABLE session_templates
  ADD COLUMN IF NOT EXISTS body_html TEXT,
  ADD COLUMN IF NOT EXISTS category VARCHAR(50);

-- ===== EVOLUTION INDEX (D1 é separado; aqui só PG) =====
-- O preview_text já existe; nada a fazer no PG.

COMMIT;
