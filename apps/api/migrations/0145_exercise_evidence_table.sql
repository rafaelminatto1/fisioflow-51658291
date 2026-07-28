-- 0145_exercise_evidence_table.sql
-- Create exercise_evidence table for structured literature evidence (US-L2).

CREATE TABLE exercise_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id uuid NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  pmid text,
  doi text UNIQUE,
  title text NOT NULL,
  abstract text,
  evidence_level text NOT NULL CHECK (evidence_level IN ('1a','1b','2a','2b','3a','3b','4','5')),
  clinical_recommendation text,
  icd10_codes text[],
  source_db text NOT NULL CHECK (source_db IN ('pubmed','arxiv','crossref','semantic','scholar')),
  retrieved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exercise_id, doi)
);

CREATE INDEX idx_exercise_evidence_exercise ON exercise_evidence(exercise_id);
CREATE INDEX idx_exercise_evidence_level ON exercise_evidence(evidence_level);