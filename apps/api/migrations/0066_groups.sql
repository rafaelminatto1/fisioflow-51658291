-- Sprint 7: Group sessions management (Pilates, Hidro, group therapy)

CREATE TABLE IF NOT EXISTS group_classes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL,
  name              TEXT NOT NULL,
  description       TEXT,
  modality          TEXT NOT NULL DEFAULT 'pilates', -- pilates, hidro, grupo, yoga, funcional
  therapist_id      TEXT,                            -- profiles.user_id
  location          TEXT,
  max_capacity      INTEGER NOT NULL DEFAULT 10,
  duration_minutes  INTEGER NOT NULL DEFAULT 60,
  color             TEXT NOT NULL DEFAULT '#6366f1',
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

-- Recurring schedule for a class (which weekdays + time)
CREATE TABLE IF NOT EXISTS group_class_schedules (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id          UUID NOT NULL REFERENCES group_classes(id) ON DELETE CASCADE,
  organization_id   UUID NOT NULL,
  weekday           SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6), -- 0=Sunday
  start_time        TIME NOT NULL,
  effective_from    DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until   DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Individual occurrences of a class (generated or manual)
CREATE TABLE IF NOT EXISTS group_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id          UUID NOT NULL REFERENCES group_classes(id) ON DELETE CASCADE,
  organization_id   UUID NOT NULL,
  date              DATE NOT NULL,
  start_time        TIME NOT NULL,
  end_time          TIME,
  therapist_id      TEXT,
  location          TEXT,
  status            TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, completed, cancelled
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

-- Patient enrollments in a class (ongoing subscription)
CREATE TABLE IF NOT EXISTS group_enrollments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id          UUID NOT NULL REFERENCES group_classes(id) ON DELETE CASCADE,
  patient_id        UUID NOT NULL,
  organization_id   UUID NOT NULL,
  enrolled_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unenrolled_at     TIMESTAMPTZ,
  notes             TEXT,
  UNIQUE (class_id, patient_id)
);

-- Per-session check-ins (presence tracking)
CREATE TABLE IF NOT EXISTS group_checkins (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID NOT NULL REFERENCES group_sessions(id) ON DELETE CASCADE,
  patient_id        UUID NOT NULL,
  organization_id   UUID NOT NULL,
  checked_in_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  method            TEXT NOT NULL DEFAULT 'manual', -- manual, qr_code
  notes             TEXT,
  UNIQUE (session_id, patient_id)
);

-- Waitlist for classes at capacity
CREATE TABLE IF NOT EXISTS group_waitlist (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id          UUID NOT NULL REFERENCES group_classes(id) ON DELETE CASCADE,
  patient_id        UUID NOT NULL,
  organization_id   UUID NOT NULL,
  position          INTEGER NOT NULL DEFAULT 1,
  added_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notified_at       TIMESTAMPTZ,
  status            TEXT NOT NULL DEFAULT 'waiting', -- waiting, offered, enrolled, expired
  UNIQUE (class_id, patient_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_group_classes_org ON group_classes(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_group_sessions_class_date ON group_sessions(class_id, date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_group_sessions_org_date ON group_sessions(organization_id, date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_group_enrollments_class ON group_enrollments(class_id) WHERE unenrolled_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_group_enrollments_patient ON group_enrollments(patient_id) WHERE unenrolled_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_group_checkins_session ON group_checkins(session_id);
CREATE INDEX IF NOT EXISTS idx_group_waitlist_class ON group_waitlist(class_id, position) WHERE status = 'waiting';
