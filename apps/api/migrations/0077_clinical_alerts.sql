-- Migration: Clinical Alerts (AI RTM)
-- Description: Creates table to store clinical anomalies and RTM alerts detected by IA.

CREATE TABLE IF NOT EXISTS clinical_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  type            VARCHAR(50) NOT NULL, -- pain_spike, compliance_drop, low_activity, anomaly
  severity        VARCHAR(20) NOT NULL, -- low, medium, high
  message         TEXT NOT NULL,
  data            JSONB DEFAULT '{}',
  status          VARCHAR(20) DEFAULT 'pending', -- pending, resolved, dismissed
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  resolved_at     TIMESTAMP WITH TIME ZONE,
  resolved_by     UUID REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_clinical_alerts_patient ON clinical_alerts(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_alerts_status ON clinical_alerts(status) WHERE status = 'pending';
