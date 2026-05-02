-- Appointment status settings per organization.
-- Allows clinics to rename, recolor, activate/deactivate and add custom statuses.

DROP INDEX IF EXISTS idx_appointments_stats;
DROP INDEX IF EXISTS idx_appointments_time_conflict;

ALTER TABLE appointments
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE appointments
  ALTER COLUMN status TYPE VARCHAR(80)
  USING status::text;

ALTER TABLE appointments
  ALTER COLUMN status SET DEFAULT 'agendado';

CREATE TABLE IF NOT EXISTS appointment_status_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  key VARCHAR(80) NOT NULL,
  label VARCHAR(120) NOT NULL,
  color VARCHAR(20) NOT NULL DEFAULT '#3b82f6',
  bg_color VARCHAR(20) NOT NULL DEFAULT '#dbeafe',
  border_color VARCHAR(20) NOT NULL DEFAULT '#3b82f6',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  allowed_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  counts_toward_capacity BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT appointment_status_settings_org_key_unique UNIQUE (organization_id, key),
  CONSTRAINT appointment_status_settings_key_format CHECK (key ~ '^[a-z0-9_]{2,80}$'),
  CONSTRAINT appointment_status_settings_color_format CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT appointment_status_settings_bg_color_format CHECK (bg_color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT appointment_status_settings_border_color_format CHECK (border_color ~ '^#[0-9A-Fa-f]{6}$')
);

CREATE INDEX IF NOT EXISTS idx_appointment_status_settings_org
  ON appointment_status_settings (organization_id);

CREATE INDEX IF NOT EXISTS idx_appointment_status_settings_org_active_sort
  ON appointment_status_settings (organization_id, is_active, sort_order);

CREATE INDEX IF NOT EXISTS idx_appointments_stats
  ON appointments (organization_id, patient_id, date DESC, status)
  WHERE (
    status IN ('completed', 'scheduled', 'confirmed', 'realizado', 'agendado', 'confirmado')
    OR status IS NULL
  );

CREATE INDEX IF NOT EXISTS idx_appointments_time_conflict
  ON appointments (therapist_id, date, start_time, end_time)
  WHERE status NOT IN ('cancelled', 'no_show', 'rescheduled', 'cancelado', 'faltou', 'remarcado');

ALTER TABLE appointment_status_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_status_settings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS policy_appointment_status_settings_isolation ON appointment_status_settings;
CREATE POLICY policy_appointment_status_settings_isolation ON appointment_status_settings FOR ALL
  TO authenticated
  USING (organization_id = (NULLIF(current_setting('app.org_id', true), '')::uuid))
  WITH CHECK (organization_id = (NULLIF(current_setting('app.org_id', true), '')::uuid));
