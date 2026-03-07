CREATE TABLE IF NOT EXISTS evolution_index (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  appointment_id TEXT,
  therapist_id TEXT,
  tags TEXT, -- JSON array of tags like ["#pos-op", "#dor-lombar"]
  preview_text TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patient_id ON evolution_index(patient_id);
CREATE INDEX IF NOT EXISTS idx_tags ON evolution_index(tags);
