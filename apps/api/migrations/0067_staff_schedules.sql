-- Sprint 8: Staff work schedules and availability blocking

CREATE TABLE IF NOT EXISTS staff_schedules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  therapist_id    TEXT NOT NULL,           -- profiles.user_id
  weekday         SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One-off blocks (folgas, férias, feriados)
CREATE TABLE IF NOT EXISTS staff_blocks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  therapist_id    TEXT NOT NULL,
  block_date      DATE NOT NULL,
  start_time      TIME,                    -- null = full day
  end_time        TIME,
  reason          TEXT NOT NULL DEFAULT 'folga',  -- folga, ferias, feriado, outro
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_schedules_org_therapist ON staff_schedules(organization_id, therapist_id);
CREATE INDEX IF NOT EXISTS idx_staff_blocks_org_date ON staff_blocks(organization_id, block_date);
