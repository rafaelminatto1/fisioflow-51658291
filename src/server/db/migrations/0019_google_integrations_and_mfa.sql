CREATE TABLE IF NOT EXISTS google_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  user_id text NOT NULL,
  provider text NOT NULL DEFAULT 'google',
  external_email text,
  status text NOT NULL DEFAULT 'disconnected',
  scopes text[] NOT NULL DEFAULT ARRAY[]::text[],
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  tokens jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at timestamptz,
  events_synced_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_google_integrations_org_provider
  ON google_integrations (organization_id, provider, updated_at DESC);

CREATE TABLE IF NOT EXISTS google_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid REFERENCES google_integrations(id) ON DELETE CASCADE,
  action text NOT NULL,
  status text NOT NULL DEFAULT 'success',
  event_type text,
  event_id text,
  external_event_id text,
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_google_sync_logs_integration_created
  ON google_sync_logs (integration_id, created_at DESC);

CREATE TABLE IF NOT EXISTS google_drive_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  user_id text NOT NULL,
  integration_id uuid REFERENCES google_integrations(id) ON DELETE SET NULL,
  provider_item_id text NOT NULL,
  name text NOT NULL,
  mime_type text,
  item_kind text NOT NULL DEFAULT 'file',
  parent_provider_item_id text,
  web_view_link text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_google_drive_items_user_kind
  ON google_drive_items (user_id, item_kind, created_at DESC);

CREATE TABLE IF NOT EXISTS security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  user_id text NOT NULL,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_events_user_created
  ON security_events (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS mfa_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE,
  organization_id uuid,
  mfa_enabled boolean NOT NULL DEFAULT false,
  mfa_method text,
  backup_codes text[] NOT NULL DEFAULT ARRAY[]::text[],
  pending_otp_code text,
  pending_otp_expires_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mfa_settings_org_user
  ON mfa_settings (organization_id, user_id);

CREATE TABLE IF NOT EXISTS mfa_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  organization_id uuid,
  factor_id text NOT NULL UNIQUE,
  type text NOT NULL,
  friendly_name text,
  secret text,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_mfa_enrollments_user_created
  ON mfa_enrollments (user_id, created_at DESC);
