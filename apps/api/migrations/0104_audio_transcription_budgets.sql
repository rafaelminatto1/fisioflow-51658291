CREATE TABLE IF NOT EXISTS audio_transcription_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  professional_user_id text NULL,
  monthly_limit_minutes integer NOT NULL DEFAULT 0,
  warn_at_percent integer NOT NULL DEFAULT 80,
  hard_stop boolean NOT NULL DEFAULT true,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audio_transcription_budgets_limit_check CHECK (monthly_limit_minutes >= 0),
  CONSTRAINT audio_transcription_budgets_warn_check CHECK (warn_at_percent BETWEEN 1 AND 100)
);

CREATE UNIQUE INDEX IF NOT EXISTS audio_transcription_budgets_org_unique
  ON audio_transcription_budgets (organization_id)
  WHERE professional_user_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS audio_transcription_budgets_professional_unique
  ON audio_transcription_budgets (organization_id, professional_user_id)
  WHERE professional_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS audio_transcription_budgets_org_idx
  ON audio_transcription_budgets (organization_id, professional_user_id);

INSERT INTO audio_transcription_budgets (
  organization_id,
  professional_user_id,
  monthly_limit_minutes,
  warn_at_percent,
  hard_stop
)
SELECT id, NULL, 1200, 80, true
FROM organizations
ON CONFLICT DO NOTHING;
