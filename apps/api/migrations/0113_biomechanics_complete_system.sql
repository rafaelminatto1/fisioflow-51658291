-- Biomechanics complete system foundation

ALTER TABLE biomechanics_assessments
  ADD COLUMN IF NOT EXISTS protocol_id uuid,
  ADD COLUMN IF NOT EXISTS primary_media_id uuid,
  ADD COLUMN IF NOT EXISTS job_id uuid,
  ADD COLUMN IF NOT EXISTS quality_score numeric(5, 2),
  ADD COLUMN IF NOT EXISTS capture_context jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS algorithm_version varchar(50),
  ADD COLUMN IF NOT EXISTS validated_by uuid,
  ADD COLUMN IF NOT EXISTS validated_at timestamp,
  ADD COLUMN IF NOT EXISTS report_hash varchar(128),
  ADD COLUMN IF NOT EXISTS signed_at timestamp,
  ADD COLUMN IF NOT EXISTS signature_metadata jsonb DEFAULT '{}'::jsonb;

ALTER TABLE biomechanics_metrics
  ADD COLUMN IF NOT EXISTS side varchar(20),
  ADD COLUMN IF NOT EXISTS phase varchar(50),
  ADD COLUMN IF NOT EXISTS view varchar(50),
  ADD COLUMN IF NOT EXISTS confidence numeric(5, 2),
  ADD COLUMN IF NOT EXISTS source varchar(50) DEFAULT 'algorithm',
  ADD COLUMN IF NOT EXISTS normal_range jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS severity varchar(30),
  ADD COLUMN IF NOT EXISTS algorithm_version varchar(50);

CREATE TABLE IF NOT EXISTS biomechanics_protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  slug varchar(120) NOT NULL,
  name varchar(180) NOT NULL,
  category varchar(80) NOT NULL,
  description text,
  assessment_type biomechanics_assessment_type NOT NULL DEFAULT 'functional_movement',
  capture_requirements jsonb DEFAULT '{}'::jsonb,
  metric_definitions jsonb DEFAULT '[]'::jsonb,
  quality_rules jsonb DEFAULT '{}'::jsonb,
  progression_gates jsonb DEFAULT '[]'::jsonb,
  red_flags jsonb DEFAULT '[]'::jsonb,
  evidence_refs jsonb DEFAULT '[]'::jsonb,
  is_system boolean NOT NULL DEFAULT false,
  version varchar(30) NOT NULL DEFAULT '1.0.0',
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS biomechanics_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  patient_id uuid NOT NULL REFERENCES patients(id),
  assessment_id uuid NOT NULL REFERENCES biomechanics_assessments(id),
  r2_key text,
  stream_uid varchar(160),
  media_type varchar(40) NOT NULL DEFAULT 'video',
  view varchar(50) NOT NULL DEFAULT 'sagittal',
  duration_ms integer,
  fps numeric(8, 2),
  width integer,
  height integer,
  content_type varchar(120),
  size_bytes integer,
  quality_score numeric(5, 2),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS biomechanics_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  patient_id uuid NOT NULL REFERENCES patients(id),
  assessment_id uuid NOT NULL REFERENCES biomechanics_assessments(id),
  media_id uuid REFERENCES biomechanics_media(id),
  status varchar(50) NOT NULL DEFAULT 'queued',
  stage varchar(80) NOT NULL DEFAULT 'ingest',
  progress integer NOT NULL DEFAULT 0,
  error_code varchar(80),
  error_message text,
  model_provider varchar(80) DEFAULT 'fisioflow',
  model_name varchar(120) DEFAULT 'deterministic-v1',
  model_version varchar(50) DEFAULT '1.0.0',
  algorithm_version varchar(50) DEFAULT 'bio-pipeline-1.0.0',
  started_at timestamp,
  completed_at timestamp,
  created_by uuid,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS biomechanics_frames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  assessment_id uuid NOT NULL REFERENCES biomechanics_assessments(id),
  media_id uuid REFERENCES biomechanics_media(id),
  frame_index integer NOT NULL,
  time_ms integer NOT NULL,
  thumbnail_key text,
  landmarks jsonb DEFAULT '[]'::jsonb,
  confidence numeric(5, 2),
  events jsonb DEFAULT '[]'::jsonb,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS biomechanics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  assessment_id uuid NOT NULL REFERENCES biomechanics_assessments(id),
  media_id uuid REFERENCES biomechanics_media(id),
  event_type varchar(80) NOT NULL,
  time_ms integer NOT NULL,
  frame_index integer,
  confidence numeric(5, 2),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS biomechanics_annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  assessment_id uuid NOT NULL REFERENCES biomechanics_assessments(id),
  media_id uuid REFERENCES biomechanics_media(id),
  frame_index integer,
  time_ms integer,
  tool varchar(50) NOT NULL,
  geometry jsonb DEFAULT '{}'::jsonb,
  label text,
  created_by uuid,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS biomechanics_review_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  assessment_id uuid NOT NULL REFERENCES biomechanics_assessments(id),
  action varchar(80) NOT NULL,
  from_status varchar(50),
  to_status varchar(50),
  notes text,
  created_by uuid,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bio_protocol_org ON biomechanics_protocols(organization_id);
CREATE INDEX IF NOT EXISTS idx_bio_protocol_slug ON biomechanics_protocols(slug);
CREATE INDEX IF NOT EXISTS idx_bio_protocol_category ON biomechanics_protocols(category);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bio_protocol_system_slug_unique
  ON biomechanics_protocols(slug)
  WHERE organization_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_bio_protocol_org_slug_unique
  ON biomechanics_protocols(organization_id, slug)
  WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bio_media_assessment ON biomechanics_media(assessment_id);
CREATE INDEX IF NOT EXISTS idx_bio_media_patient ON biomechanics_media(patient_id);
CREATE INDEX IF NOT EXISTS idx_bio_media_org ON biomechanics_media(organization_id);
CREATE INDEX IF NOT EXISTS idx_bio_jobs_assessment ON biomechanics_jobs(assessment_id);
CREATE INDEX IF NOT EXISTS idx_bio_jobs_patient ON biomechanics_jobs(patient_id);
CREATE INDEX IF NOT EXISTS idx_bio_jobs_org_status ON biomechanics_jobs(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_bio_frames_assessment ON biomechanics_frames(assessment_id);
CREATE INDEX IF NOT EXISTS idx_bio_frames_media ON biomechanics_frames(media_id);
CREATE INDEX IF NOT EXISTS idx_bio_events_assessment ON biomechanics_events(assessment_id);
CREATE INDEX IF NOT EXISTS idx_bio_events_type ON biomechanics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_bio_annotations_assessment ON biomechanics_annotations(assessment_id);
CREATE INDEX IF NOT EXISTS idx_bio_annotations_media ON biomechanics_annotations(media_id);
CREATE INDEX IF NOT EXISTS idx_bio_review_assessment ON biomechanics_review_actions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_bio_review_org ON biomechanics_review_actions(organization_id);

ALTER TABLE biomechanics_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE biomechanics_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE biomechanics_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE biomechanics_frames ENABLE ROW LEVEL SECURITY;
ALTER TABLE biomechanics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE biomechanics_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE biomechanics_review_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS policy_biomechanics_protocols_hybrid_isolation ON biomechanics_protocols;
CREATE POLICY policy_biomechanics_protocols_hybrid_isolation ON biomechanics_protocols
  AS PERMISSIVE FOR ALL TO authenticated
  USING (organization_id IS NULL OR organization_id = (current_setting('app.org_id')::uuid))
  WITH CHECK (organization_id IS NULL OR organization_id = (current_setting('app.org_id')::uuid));

DROP POLICY IF EXISTS policy_biomechanics_media_isolation ON biomechanics_media;
CREATE POLICY policy_biomechanics_media_isolation ON biomechanics_media
  AS PERMISSIVE FOR ALL TO authenticated
  USING (organization_id = (current_setting('app.org_id')::uuid))
  WITH CHECK (organization_id = (current_setting('app.org_id')::uuid));

DROP POLICY IF EXISTS policy_biomechanics_jobs_isolation ON biomechanics_jobs;
CREATE POLICY policy_biomechanics_jobs_isolation ON biomechanics_jobs
  AS PERMISSIVE FOR ALL TO authenticated
  USING (organization_id = (current_setting('app.org_id')::uuid))
  WITH CHECK (organization_id = (current_setting('app.org_id')::uuid));

DROP POLICY IF EXISTS policy_biomechanics_frames_isolation ON biomechanics_frames;
CREATE POLICY policy_biomechanics_frames_isolation ON biomechanics_frames
  AS PERMISSIVE FOR ALL TO authenticated
  USING (organization_id = (current_setting('app.org_id')::uuid))
  WITH CHECK (organization_id = (current_setting('app.org_id')::uuid));

DROP POLICY IF EXISTS policy_biomechanics_events_isolation ON biomechanics_events;
CREATE POLICY policy_biomechanics_events_isolation ON biomechanics_events
  AS PERMISSIVE FOR ALL TO authenticated
  USING (organization_id = (current_setting('app.org_id')::uuid))
  WITH CHECK (organization_id = (current_setting('app.org_id')::uuid));

DROP POLICY IF EXISTS policy_biomechanics_annotations_isolation ON biomechanics_annotations;
CREATE POLICY policy_biomechanics_annotations_isolation ON biomechanics_annotations
  AS PERMISSIVE FOR ALL TO authenticated
  USING (organization_id = (current_setting('app.org_id')::uuid))
  WITH CHECK (organization_id = (current_setting('app.org_id')::uuid));

DROP POLICY IF EXISTS policy_biomechanics_review_actions_isolation ON biomechanics_review_actions;
CREATE POLICY policy_biomechanics_review_actions_isolation ON biomechanics_review_actions
  AS PERMISSIVE FOR ALL TO authenticated
  USING (organization_id = (current_setting('app.org_id')::uuid))
  WITH CHECK (organization_id = (current_setting('app.org_id')::uuid));

INSERT INTO biomechanics_protocols (
  organization_id, slug, name, category, description, assessment_type,
  capture_requirements, metric_definitions, quality_rules, progression_gates,
  red_flags, evidence_refs, is_system, version
) VALUES
  (
    NULL,
    'running-gait-sagittal-posterior',
    'Analise de corrida',
    'corrida',
    'Protocolo para corrida em esteira ou rua com views sagital e posterior.',
    'running_analysis',
    '{"views":["sagittal","posterior"],"minDurationMs":8000,"recommendedFps":60,"attempts":2}'::jsonb,
    '[{"key":"cadence","unit":"spm"},{"key":"contact_time","unit":"ms"},{"key":"trunk_inclination","unit":"deg"},{"key":"dynamic_valgus","unit":"deg"},{"key":"symmetry","unit":"%"}]'::jsonb,
    '{"minConfidence":0.72,"fullBodyRequired":true,"scaleRecommended":true}'::jsonb,
    '[{"metric":"pain","operator":"<=","value":3},{"metric":"symmetry","operator":">=","value":85}]'::jsonb,
    '["dor > 5/10 por 24h","queda de performance > 20%","claudicacao importante"]'::jsonb,
    '["wiki:corrida-biomecanica","wiki:retorno-corrida"]'::jsonb,
    true,
    '1.0.0'
  ),
  (
    NULL,
    'walking-gait-6m',
    'Analise de marcha 6m',
    'marcha',
    'Protocolo de marcha em corredor de 6 metros com foco em simetria e fases.',
    'gait_analysis',
    '{"views":["sagittal","frontal"],"minDurationMs":6000,"distanceMeters":6,"attempts":2}'::jsonb,
    '[{"key":"cadence","unit":"spm"},{"key":"stance_time","unit":"ms"},{"key":"step_symmetry","unit":"%"},{"key":"pelvic_drop","unit":"deg"}]'::jsonb,
    '{"minConfidence":0.7,"fullBodyRequired":true,"scaleRequired":false}'::jsonb,
    '[{"metric":"step_symmetry","operator":">=","value":85}]'::jsonb,
    '["instabilidade importante","dor aguda progressiva","risco de queda"]'::jsonb,
    '["wiki:marcha-avaliacao"]'::jsonb,
    true,
    '1.0.0'
  ),
  (
    NULL,
    'cmj-hop-performance',
    'Salto e Hop Test',
    'salto',
    'CMJ, hop test e aterrissagem com foco em LSI, controle e performance.',
    'functional_movement',
    '{"views":["frontal","sagittal"],"minDurationMs":3000,"attempts":3}'::jsonb,
    '[{"key":"flight_time","unit":"ms"},{"key":"jump_height","unit":"cm"},{"key":"lsi","unit":"%"},{"key":"landing_valgus","unit":"deg"}]'::jsonb,
    '{"minConfidence":0.75,"feetVisibleRequired":true}'::jsonb,
    '[{"metric":"lsi","operator":">=","value":90},{"metric":"pain","operator":"<=","value":2}]'::jsonb,
    '["dor no salto","falseio","aterrissagem insegura"]'::jsonb,
    '["wiki:return-to-sport-hop-tests"]'::jsonb,
    true,
    '1.0.0'
  ),
  (
    NULL,
    'posture-static-3views',
    'Avaliacao postural 3 views',
    'postura',
    'Avaliacao postural estatica em frontal, sagital e posterior.',
    'static_posture',
    '{"views":["frontal","sagittal","posterior"],"photoMode":true,"attempts":1}'::jsonb,
    '[{"key":"head_alignment","unit":"deg"},{"key":"shoulder_asymmetry","unit":"deg"},{"key":"pelvic_tilt","unit":"deg"},{"key":"knee_alignment","unit":"deg"}]'::jsonb,
    '{"minConfidence":0.7,"plumbLineRecommended":true}'::jsonb,
    '[]'::jsonb,
    '["dor neurologica associada","perda de forca progressiva"]'::jsonb,
    '["wiki:avaliacao-postural"]'::jsonb,
    true,
    '1.0.0'
  ),
  (
    NULL,
    'functional-squat-stepdown',
    'Agachamento e Step-down',
    'funcional',
    'Teste funcional para MMII com ROM, valgo dinamico, tronco e controle pelvico.',
    'functional_movement',
    '{"views":["frontal","sagittal"],"minDurationMs":5000,"repetitions":5,"attempts":2}'::jsonb,
    '[{"key":"knee_rom","unit":"deg"},{"key":"dynamic_valgus","unit":"deg"},{"key":"trunk_inclination","unit":"deg"},{"key":"pelvic_drop","unit":"deg"},{"key":"symmetry","unit":"%"}]'::jsonb,
    '{"minConfidence":0.72,"fullBodyRequired":true}'::jsonb,
    '[{"metric":"dynamic_valgus","operator":"<=","value":10},{"metric":"pain","operator":"<=","value":3}]'::jsonb,
    '["dor > 5/10","perda de controle motor","edema reativo"]'::jsonb,
    '["wiki:valgo-dinamico","wiki:step-down-test"]'::jsonb,
    true,
    '1.0.0'
  )
ON CONFLICT DO NOTHING;

COMMENT ON TABLE biomechanics_jobs IS 'Durable processing jobs for biomechanics media analysis.';
COMMENT ON TABLE biomechanics_annotations IS 'Manual and assisted clinical annotations saved from the biomechanics workbench.';
