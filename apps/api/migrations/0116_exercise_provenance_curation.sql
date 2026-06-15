-- 0116_exercise_provenance_curation.sql
-- Proveniência em exercises + tabela de candidatos de importação (staging/curadoria).

ALTER TABLE exercises ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS source_id TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS source_license TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'approved';
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS reviewed_by TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS exercise_import_candidates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dedup_key       TEXT NOT NULL,
  source          TEXT NOT NULL,
  source_id       TEXT,
  source_url      TEXT,
  source_license  TEXT,
  name            TEXT NOT NULL,
  name_en         TEXT,
  difficulty      TEXT,
  muscles_primary TEXT[] NOT NULL DEFAULT '{}',
  muscles_secondary TEXT[] NOT NULL DEFAULT '{}',
  equipment       TEXT[] NOT NULL DEFAULT '{}',
  body_parts      TEXT[] NOT NULL DEFAULT '{}',
  instructions    TEXT,
  category        TEXT,
  image_urls      TEXT[] NOT NULL DEFAULT '{}',
  raw             JSONB,
  status          TEXT NOT NULL DEFAULT 'pending',
  promoted_exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by     TEXT,
  reviewed_at     TIMESTAMPTZ,
  CONSTRAINT exercise_import_candidates_status_chk
    CHECK (status IN ('pending','approved','rejected'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_import_candidates_source
  ON exercise_import_candidates(source, source_id);
CREATE INDEX IF NOT EXISTS idx_import_candidates_status
  ON exercise_import_candidates(status);
CREATE INDEX IF NOT EXISTS idx_import_candidates_dedup
  ON exercise_import_candidates(dedup_key);
