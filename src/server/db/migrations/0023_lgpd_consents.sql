CREATE TABLE IF NOT EXISTS lgpd_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  organization_id uuid NOT NULL,
  consent_type text NOT NULL,
  granted boolean NOT NULL DEFAULT false,
  granted_at timestamptz,
  revoked_at timestamptz,
  version text NOT NULL DEFAULT '1.0',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lgpd_consents_user_type_unique UNIQUE (user_id, consent_type)
);

CREATE INDEX IF NOT EXISTS idx_lgpd_consents_user_updated
  ON lgpd_consents (user_id, updated_at DESC);
