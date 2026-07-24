-- Migration 0142: Fila de espera automática por desistência / remarcação em horários lotados
CREATE TABLE IF NOT EXISTS appointment_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  patient_phone VARCHAR(64) NOT NULL,
  patient_name VARCHAR(255),
  target_date DATE NOT NULL,
  target_slot VARCHAR(10) NOT NULL,
  type VARCHAR(32) DEFAULT 'session',
  status VARCHAR(32) DEFAULT 'waiting', -- 'waiting', 'notified', 'fulfilled', 'declined', 'expired'
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_org_date_slot ON appointment_waitlist (organization_id, target_date, target_slot, status);
