-- Migration 0109: flag de curadoria para o assistente do paciente.
-- Nenhuma página entra no índice do paciente sem opt-in explícito (LGPD / Privacy First).

ALTER TABLE wiki_pages
  ADD COLUMN IF NOT EXISTS patient_visible BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_wiki_pages_patient_visible
  ON wiki_pages (patient_visible)
  WHERE patient_visible = true;
