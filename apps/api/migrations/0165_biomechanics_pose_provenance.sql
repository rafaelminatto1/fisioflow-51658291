-- 0165 — procedência de métrica biomecânica e trava contra número sintético em laudo
--
-- Hoje `processBiomechanicsMedia` (apps/api/src/queue.ts) chama
-- `deterministicBiomechanicsMetrics()`: métricas SINTÉTICAS, número inventado.
-- E `POST /api/biomechanics/:id/pdf` não checa status nenhum. O caminho entre
-- um número falso e um laudo assinado com CREFITO está aberto.
--
-- Esta migration cria a base para fechá-lo em três níveis:
--
-- 1. `provenance` diz de onde cada número veio (pose no device, pose em nuvem,
--    medição manual, relato do paciente, derivado, ou demo sintética). O
--    DEFAULT é 'synthetic_demo' de propósito: quem inserir métrica sem declarar
--    procedência produz linha em quarentena, não linha promovida a clínica.
-- 2. Supersessão append-only (`superseded_at`/`superseded_by`) substitui o
--    DELETE-e-reinsere atual, preservando trilha de auditoria — obrigatório
--    para responder "por que o número mudou?" meses depois.
-- 3. Dois triggers como última linha de defesa, que valem mesmo se a API for
--    contornada: laudo não assina com métrica sintética viva, e métrica de
--    laudo assinado vira imutável.
--
-- Em produção todas as tabelas biomechanics_* estão vazias exceto
-- biomechanics_protocols (5 linhas de seed), então o backfill é trivial e o
-- risco é zero.
--
-- Reversível: ver .down.sql.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'biomechanics_metric_provenance') THEN
    CREATE TYPE biomechanics_metric_provenance AS ENUM (
      'device_pose',      -- Fase 1: landmarks calculados no aparelho
      'container_pose',   -- Fase 2: pose reextraída do vídeo no R2, em Container
      'manual',           -- goniometria digitada ou corrigida pelo profissional
      'patient_reported', -- EVA/dor
      'derived',          -- calculado a partir de métricas já validadas
      'synthetic_demo'    -- placeholder/demo. NUNCA pode chegar a laudo assinado.
    );
  END IF;
END $$;

-- ── métricas ────────────────────────────────────────────────────────────────
ALTER TABLE biomechanics_metrics
  ADD COLUMN IF NOT EXISTS provenance biomechanics_metric_provenance
    NOT NULL DEFAULT 'synthetic_demo',
  ADD COLUMN IF NOT EXISTS pose_engine      varchar(80),
  ADD COLUMN IF NOT EXISTS job_id           uuid REFERENCES biomechanics_jobs(id),
  ADD COLUMN IF NOT EXISTS media_id         uuid REFERENCES biomechanics_media(id),
  ADD COLUMN IF NOT EXISTS attempt          integer,
  ADD COLUMN IF NOT EXISTS sample_count     integer,
  ADD COLUMN IF NOT EXISTS superseded_by    uuid REFERENCES biomechanics_metrics(id),
  ADD COLUMN IF NOT EXISTS superseded_at    timestamptz,
  ADD COLUMN IF NOT EXISTS acknowledged_by  uuid,
  ADD COLUMN IF NOT EXISTS acknowledged_at  timestamptz,
  ADD COLUMN IF NOT EXISTS computed_at      timestamptz DEFAULT now();

-- `source` legado ('algorithm'|'manual') fica; `provenance` é a autoritativa.
UPDATE biomechanics_metrics
   SET provenance = CASE
         WHEN source = 'manual' THEN 'manual'::biomechanics_metric_provenance
         ELSE 'synthetic_demo'::biomechanics_metric_provenance
       END
 WHERE provenance = 'synthetic_demo';

-- Toda leitura de laudo/workbench filtra por métrica viva.
CREATE INDEX IF NOT EXISTS idx_bio_metric_live
  ON biomechanics_metrics (assessment_id)
  WHERE superseded_at IS NULL;

-- ── mídia: onde mora o bundle de landmarks ──────────────────────────────────
-- 10 s a 30 fps = 300 frames x 33 landmarks. Vai para o R2 como NDJSON.gz
-- (~50 KB), nunca como 9.000 linhas no Postgres via Hyperdrive.
ALTER TABLE biomechanics_media
  ADD COLUMN IF NOT EXISTS landmarks_r2_key text,
  ADD COLUMN IF NOT EXISTS landmarks_schema varchar(32),
  ADD COLUMN IF NOT EXISTS landmarks_sha256 varchar(64),
  ADD COLUMN IF NOT EXISTS landmarks_bytes  integer,
  ADD COLUMN IF NOT EXISTS frame_count      integer,
  ADD COLUMN IF NOT EXISTS attempt          integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS pose_engine      varchar(80),
  -- mirrored/rotationDegrees: sem isso a câmera frontal troca Esq/Dir em todo
  -- o laudo, silenciosamente.
  ADD COLUMN IF NOT EXISTS coordinate_space jsonb DEFAULT '{}'::jsonb;

-- ── frames e eventos ────────────────────────────────────────────────────────
ALTER TABLE biomechanics_frames
  ADD COLUMN IF NOT EXISTS provenance biomechanics_metric_provenance
    NOT NULL DEFAULT 'synthetic_demo',
  ADD COLUMN IF NOT EXISTS attempt integer,
  ADD COLUMN IF NOT EXISTS view varchar(50);

ALTER TABLE biomechanics_events
  ADD COLUMN IF NOT EXISTS provenance biomechanics_metric_provenance
    NOT NULL DEFAULT 'synthetic_demo',
  ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES biomechanics_jobs(id),
  ADD COLUMN IF NOT EXISTS superseded_at timestamptz;

-- ── jobs: idempotência e encadeamento device -> container ───────────────────
ALTER TABLE biomechanics_jobs
  ADD COLUMN IF NOT EXISTS phase varchar(20) NOT NULL DEFAULT 'device',
  ADD COLUMN IF NOT EXISTS input_digest varchar(64),
  ADD COLUMN IF NOT EXISTS supersedes_job_id uuid REFERENCES biomechanics_jobs(id);

-- O app reenvia em timeout/perda de rede; o digest do bundle torna o replay
-- seguro em vez de gerar um segundo job.
CREATE UNIQUE INDEX IF NOT EXISTS uq_bio_jobs_idempotency
  ON biomechanics_jobs (assessment_id, phase, input_digest)
  WHERE input_digest IS NOT NULL;

-- ── avaliação: retificação de laudo ─────────────────────────────────────────
-- Reprocessar um laudo assinado NUNCA o altera: cria-se uma nova avaliação que
-- o retifica. O original mantém report_hash/signed_at/PDF intactos para
-- sempre, então a verificação pública continua válida.
ALTER TABLE biomechanics_assessments
  ADD COLUMN IF NOT EXISTS pose_provenance biomechanics_metric_provenance,
  ADD COLUMN IF NOT EXISTS amends_assessment_id uuid REFERENCES biomechanics_assessments(id),
  ADD COLUMN IF NOT EXISTS superseded_by_assessment_id uuid REFERENCES biomechanics_assessments(id),
  ADD COLUMN IF NOT EXISTS locked_at timestamptz;

ALTER TABLE biomechanics_assessments
  DROP CONSTRAINT IF EXISTS chk_bio_assessment_status;
ALTER TABLE biomechanics_assessments
  ADD CONSTRAINT chk_bio_assessment_status CHECK (status IN (
    'draft','uploaded','awaiting_landmarks','queued','processing',
    'needs_review','validated','signed','failed','amended','superseded',
    -- legado: linhas antigas nasciam com este default
    'completed'));

-- ── trava 1: laudo não assina com métrica sintética viva ────────────────────
CREATE OR REPLACE FUNCTION bio_block_synthetic_on_signed() RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'signed' AND EXISTS (
    SELECT 1 FROM biomechanics_metrics m
     WHERE m.assessment_id = NEW.id
       AND m.superseded_at IS NULL
       AND m.provenance = 'synthetic_demo')
  THEN
    RAISE EXCEPTION 'BIO_SYNTHETIC_METRIC_IN_SIGNED_REPORT assessment=%', NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bio_block_synthetic_on_signed ON biomechanics_assessments;
CREATE TRIGGER trg_bio_block_synthetic_on_signed
  BEFORE UPDATE OF status ON biomechanics_assessments
  FOR EACH ROW EXECUTE FUNCTION bio_block_synthetic_on_signed();

-- ── trava 2: métrica de laudo assinado é imutável ───────────────────────────
CREATE OR REPLACE FUNCTION bio_block_metric_mutation_when_signed() RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM biomechanics_assessments a
     WHERE a.id = COALESCE(NEW.assessment_id, OLD.assessment_id)
       AND a.signed_at IS NOT NULL)
  THEN
    RAISE EXCEPTION 'BIO_SIGNED_ASSESSMENT_IMMUTABLE assessment=%',
      COALESCE(NEW.assessment_id, OLD.assessment_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bio_block_metric_mutation_when_signed ON biomechanics_metrics;
CREATE TRIGGER trg_bio_block_metric_mutation_when_signed
  BEFORE UPDATE OR DELETE ON biomechanics_metrics
  FOR EACH ROW EXECUTE FUNCTION bio_block_metric_mutation_when_signed();
