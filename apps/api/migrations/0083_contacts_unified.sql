-- 0083_contacts_unified.sql
--
-- Cria o hub `contacts` que unifica leads e patients sob uma única identidade
-- de relacionamento, com timeline (`contact_activities`) e histórico de
-- scoring (`contact_scores`).
--
-- Estratégia:
--   1. Cria tabelas novas (idempotente via IF NOT EXISTS)
--   2. Adiciona `contact_id` (nullable) em leads, patients, appointments,
--      sessions, crm_campanha_envios — FK criada com NOT VALID e validada
--      depois para não bloquear writes durante deploy.
--   3. Backfill e NOT NULL ficam em 0084. Trigger de conversão fica em 0085.

BEGIN;

-- =========================================================================
-- 1. ENUM lifecycle_stage
-- =========================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contact_lifecycle_stage') THEN
    CREATE TYPE contact_lifecycle_stage AS ENUM (
      'lead',         -- captado, ainda não qualificado
      'mql',          -- marketing-qualified (engajou com campanha/conteúdo)
      'sql',          -- sales-qualified (avaliação agendada)
      'opportunity',  -- avaliação realizada, aguardando fechamento
      'customer',     -- paciente ativo
      'churned'       -- inativo / não retornou
    );
  END IF;
END$$;

-- =========================================================================
-- 2. contacts — hub central
-- =========================================================================
CREATE TABLE IF NOT EXISTS contacts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL,

  -- Identidade
  nome                  TEXT NOT NULL,
  telefone              TEXT,
  email                 TEXT,
  cpf                   VARCHAR(14),

  -- Estado de relacionamento
  lifecycle_stage       contact_lifecycle_stage NOT NULL DEFAULT 'lead',
  score                 INTEGER NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  score_temperature     TEXT CHECK (score_temperature IN ('cold','warm','hot')),
  scored_at             TIMESTAMPTZ,

  -- Atribuição & origem
  owner_id              TEXT,
  origem_first_touch    TEXT,
  origem_last_touch     TEXT,
  source_campaign_id    UUID,
  source_referral_code  TEXT,

  -- Sincronização frouxa com lead/patient
  primary_lead_id       UUID,
  primary_patient_id    UUID,

  -- Metadados
  tags                  TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  metadata              JSONB NOT NULL DEFAULT '{}'::JSONB,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
);

-- Dedup key: telefone OU email OU cpf precisam ser únicos por org.
-- Usamos índices únicos parciais (não constraint) para permitir NULLs
-- e múltiplos contatos sem identificadores ainda.
CREATE UNIQUE INDEX IF NOT EXISTS uq_contacts_org_phone
  ON contacts(organization_id, telefone)
  WHERE telefone IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_contacts_org_email
  ON contacts(organization_id, lower(email))
  WHERE email IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_contacts_org_cpf
  ON contacts(organization_id, cpf)
  WHERE cpf IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_org_stage     ON contacts(organization_id, lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_contacts_org_owner     ON contacts(organization_id, owner_id);
CREATE INDEX IF NOT EXISTS idx_contacts_org_temp      ON contacts(organization_id, score_temperature);
CREATE INDEX IF NOT EXISTS idx_contacts_org_updated   ON contacts(organization_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_metadata_gin  ON contacts USING gin (metadata jsonb_path_ops);

-- =========================================================================
-- 3. contact_activities — timeline unificada
-- =========================================================================
CREATE TABLE IF NOT EXISTS contact_activities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  contact_id      UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

  -- Tipos: contact (ligação/visita), whatsapp, email, sms, session,
  --        appointment, campaign, nps, automation, stage_change, conversion,
  --        note, task
  tipo            TEXT NOT NULL,
  titulo          TEXT,
  descricao       TEXT,

  -- Referências cruzadas opcionais para drill-down
  ref_lead_id           UUID,
  ref_patient_id        UUID,
  ref_appointment_id    UUID,
  ref_session_id        UUID,
  ref_campaign_id       UUID,
  ref_automation_id     UUID,

  payload         JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_activities_contact_created
  ON contact_activities(contact_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_activities_org_tipo
  ON contact_activities(organization_id, tipo);

-- =========================================================================
-- 4. contact_scores — histórico de scoring
-- =========================================================================
CREATE TABLE IF NOT EXISTS contact_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  contact_id      UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  score           INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  temperature     TEXT NOT NULL CHECK (temperature IN ('cold','warm','hot')),
  features        JSONB NOT NULL DEFAULT '{}'::JSONB,
  model           TEXT NOT NULL DEFAULT 'rules-v1',
  model_version   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_scores_contact_created
  ON contact_scores(contact_id, created_at DESC);

-- =========================================================================
-- 5. FKs de contact_id nas tabelas existentes
-- =========================================================================
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS contact_id UUID;

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS contact_id UUID;

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS contact_id UUID;

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS contact_id UUID;

-- crm_campanha_envios existe a partir de 0015_*; só altera se já criada.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_name = 'crm_campanha_envios') THEN
    EXECUTE 'ALTER TABLE crm_campanha_envios ADD COLUMN IF NOT EXISTS contact_id UUID';
  END IF;
END$$;

-- FKs NOT VALID (evita lock pesado em tabelas grandes; 0084 valida)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_leads_contact_id') THEN
    ALTER TABLE leads
      ADD CONSTRAINT fk_leads_contact_id
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_patients_contact_id') THEN
    ALTER TABLE patients
      ADD CONSTRAINT fk_patients_contact_id
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_appointments_contact_id') THEN
    ALTER TABLE appointments
      ADD CONSTRAINT fk_appointments_contact_id
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sessions_contact_id') THEN
    ALTER TABLE sessions
      ADD CONSTRAINT fk_sessions_contact_id
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL NOT VALID;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_leads_contact_id        ON leads(contact_id);
CREATE INDEX IF NOT EXISTS idx_patients_contact_id     ON patients(contact_id);
CREATE INDEX IF NOT EXISTS idx_appointments_contact_id ON appointments(contact_id);
CREATE INDEX IF NOT EXISTS idx_sessions_contact_id     ON sessions(contact_id);

-- =========================================================================
-- 6. Trigger updated_at em contacts
-- =========================================================================
CREATE OR REPLACE FUNCTION contacts_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contacts_set_updated_at ON contacts;
CREATE TRIGGER trg_contacts_set_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION contacts_set_updated_at();

COMMIT;
