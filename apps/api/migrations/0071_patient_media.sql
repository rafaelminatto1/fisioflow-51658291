-- Migration: Patient Media (photos, videos, medical requests)
-- Stores metadata for patient clinical media in Neon.
-- Actual files stored in R2 (fisioflow-exams bucket).

-- ── Patient Clinical Photos (antes/depois, evolução, postural) ──────────────
CREATE TABLE IF NOT EXISTS patient_photos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  professional_id UUID,

  -- Classificação
  photo_type      VARCHAR(50) NOT NULL DEFAULT 'clinical',
  -- 'before' | 'after' | 'progress' | 'postural' | 'clinical' | 'wound'

  -- Localização no R2
  r2_key          TEXT NOT NULL,
  file_name       VARCHAR(500),
  file_size       INTEGER,
  mime_type       VARCHAR(100) DEFAULT 'image/jpeg',

  -- Metadados clínicos
  session_id      UUID,
  body_region     VARCHAR(100),
  side            VARCHAR(10), -- 'left' | 'right' | 'bilateral' | 'anterior' | 'posterior'
  notes           TEXT,
  tags            TEXT[] DEFAULT '{}',

  -- Série (before/after do mesmo episódio)
  series_id       UUID, -- agrupa before + after + progress do mesmo tratamento
  series_order    INTEGER DEFAULT 1,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_patient_photos_patient  ON patient_photos(patient_id, created_at DESC);
CREATE INDEX idx_patient_photos_org      ON patient_photos(organization_id);
CREATE INDEX idx_patient_photos_series   ON patient_photos(series_id) WHERE series_id IS NOT NULL;
CREATE INDEX idx_patient_photos_type     ON patient_photos(photo_type, patient_id);

-- ── Patient Clinical Videos (biomecânica, marcha, ADM, pré/pós) ─────────────
CREATE TABLE IF NOT EXISTS patient_videos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  professional_id UUID,

  -- Classificação
  video_type      VARCHAR(50) NOT NULL DEFAULT 'clinical',
  -- 'gait' | 'biomechanics' | 'range_of_motion' | 'before' | 'after' | 'exercise' | 'clinical'

  -- Localização no R2
  r2_key          TEXT NOT NULL,
  file_name       VARCHAR(500),
  file_size       INTEGER,
  mime_type       VARCHAR(100) DEFAULT 'video/mp4',
  duration_seconds INTEGER,

  -- Metadados clínicos
  session_id      UUID,
  body_region     VARCHAR(100),
  notes           TEXT,
  tags            TEXT[] DEFAULT '{}',
  thumbnail_r2_key TEXT,

  -- Status de processamento (geração de thumbnail, etc.)
  status          VARCHAR(30) DEFAULT 'ready',
  -- 'uploading' | 'ready' | 'processing' | 'failed'

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_patient_videos_patient  ON patient_videos(patient_id, created_at DESC);
CREATE INDEX idx_patient_videos_org      ON patient_videos(organization_id);
CREATE INDEX idx_patient_videos_type     ON patient_videos(video_type, patient_id);

-- ── Pedidos Médicos (encaminhamentos, solicitações de exames) ─────────────────
-- OBS: tabela medical_requests já pode existir. Este bloco cria apenas se não existir.
CREATE TABLE IF NOT EXISTS medical_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  professional_id UUID,

  request_type    VARCHAR(50) DEFAULT 'exam_request',
  -- 'exam_request' | 'referral' | 'prescription' | 'certificate' | 'other'

  title           VARCHAR(500),
  notes           TEXT,

  -- Localização no R2 (PDF ou imagem digitalizada)
  r2_key          TEXT,
  file_name       VARCHAR(500),
  file_size       INTEGER,
  mime_type       VARCHAR(100),

  -- Metadados do pedido
  request_date    DATE,
  requested_by    VARCHAR(300), -- médico solicitante
  specialty       VARCHAR(200),
  status          VARCHAR(30) DEFAULT 'pending',
  -- 'pending' | 'scheduled' | 'done'

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_requests_patient ON medical_requests(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_medical_requests_org     ON medical_requests(organization_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE patient_photos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_photos   FORCE ROW LEVEL SECURITY;
ALTER TABLE patient_videos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_videos   FORCE ROW LEVEL SECURITY;
ALTER TABLE medical_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_requests FORCE ROW LEVEL SECURITY;

-- Reutiliza o role app_runtime criado em 0056
CREATE POLICY org_isolation_patient_photos ON patient_photos
  FOR ALL TO app_runtime
  USING (organization_id = current_setting('app.org_id', true)::uuid);

CREATE POLICY org_isolation_patient_videos ON patient_videos
  FOR ALL TO app_runtime
  USING (organization_id = current_setting('app.org_id', true)::uuid);

CREATE POLICY org_isolation_medical_requests ON medical_requests
  FOR ALL TO app_runtime
  USING (organization_id = current_setting('app.org_id', true)::uuid);
