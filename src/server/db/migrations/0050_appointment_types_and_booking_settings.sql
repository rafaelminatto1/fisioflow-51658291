-- Migration 0050: appointment_types, schedule_booking_window, schedule_slot_config
-- Part of the Schedule Settings Redesign (Capacity as HERO feature)

-- ============================================================
-- 1. appointment_types
-- ============================================================
CREATE TABLE IF NOT EXISTS appointment_types (
  id                      TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
  organization_id         TEXT NOT NULL,
  name                    TEXT NOT NULL,
  duration_minutes        INTEGER NOT NULL DEFAULT 30,
  buffer_before_minutes   INTEGER NOT NULL DEFAULT 0,
  buffer_after_minutes    INTEGER NOT NULL DEFAULT 0,
  color                   TEXT NOT NULL DEFAULT '#195de6',
  max_per_day             INTEGER,
  is_active               BOOLEAN NOT NULL DEFAULT TRUE,
  is_default              BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order              INTEGER NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointment_types_org ON appointment_types (organization_id);

ALTER TABLE appointment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_types FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_appointment_types ON appointment_types FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));

-- ============================================================
-- 2. schedule_booking_window (single row per org)
-- ============================================================
CREATE TABLE IF NOT EXISTS schedule_booking_window (
  id                      TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
  organization_id         TEXT UNIQUE NOT NULL,
  min_advance_days        INTEGER NOT NULL DEFAULT 0,
  max_advance_days        INTEGER NOT NULL DEFAULT 60,
  same_day_booking        BOOLEAN NOT NULL DEFAULT TRUE,
  online_booking          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE schedule_booking_window ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_booking_window FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_schedule_booking_window ON schedule_booking_window FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));

-- ============================================================
-- 3. schedule_slot_config (single row per org)
-- ============================================================
CREATE TABLE IF NOT EXISTS schedule_slot_config (
  id                      TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
  organization_id         TEXT UNIQUE NOT NULL,
  slot_interval_minutes   INTEGER NOT NULL DEFAULT 30,
  alignment_type          TEXT NOT NULL DEFAULT 'fixed',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE schedule_slot_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_slot_config FORCE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_schedule_slot_config ON schedule_slot_config FOR ALL
  USING (organization_id::text = current_setting('app.org_id', true))
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));
