-- Tarefas (task management)
CREATE TABLE IF NOT EXISTS tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  created_by TEXT NOT NULL,
  responsavel_id TEXT,
  project_id UUID,
  parent_id UUID,
  titulo TEXT NOT NULL,
  descricao TEXT,
  status TEXT NOT NULL DEFAULT 'A_FAZER',
  prioridade TEXT NOT NULL DEFAULT 'MEDIA',
  tipo TEXT NOT NULL DEFAULT 'TAREFA',
  data_vencimento TIMESTAMPTZ,
  start_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  order_index INTEGER NOT NULL DEFAULT 0,
  tags TEXT[] NOT NULL DEFAULT '{}',
  checklists JSONB NOT NULL DEFAULT '[]',
  attachments JSONB NOT NULL DEFAULT '[]',
  task_references JSONB NOT NULL DEFAULT '[]',
  dependencies JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tarefas_org_status ON tarefas (organization_id, status, order_index);
CREATE INDEX IF NOT EXISTS idx_tarefas_project ON tarefas (project_id, order_index);

-- User invitations
CREATE TABLE IF NOT EXISTS user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'fisioterapeuta',
  token TEXT NOT NULL UNIQUE,
  invited_by TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations (email, used_at);
CREATE INDEX IF NOT EXISTS idx_user_invitations_org ON user_invitations (organization_id, created_at DESC);

-- Satisfaction surveys (NPS)
CREATE TABLE IF NOT EXISTS satisfaction_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  patient_id UUID,
  appointment_id UUID,
  therapist_id TEXT,
  nps_score INTEGER,
  q_care_quality INTEGER,
  q_professionalism INTEGER,
  q_facility_cleanliness INTEGER,
  q_scheduling_ease INTEGER,
  q_communication INTEGER,
  comments TEXT,
  suggestions TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  response_time_hours NUMERIC(6,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_satisfaction_surveys_org ON satisfaction_surveys (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_satisfaction_surveys_patient ON satisfaction_surveys (patient_id, created_at DESC);
