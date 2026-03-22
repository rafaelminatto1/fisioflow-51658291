-- Migration 0036: Create missing tables referenced by worker routes
-- Tables: eventos, salas, servicos, contratados, evento_contratados,
--         participantes, checklist_items, leads, lead_historico, crm_tarefas,
--         marketing_consents, marketing_exports, marketing_review_configs,
--         marketing_birthday_configs, marketing_recall_campaigns,
--         referral_codes, referral_redemptions, fisio_links, fisio_link_analytics,
--         content_calendar, google_integrations, google_sync_logs, google_drive_items

-- ===== EVENTOS DOMAIN =====

CREATE TABLE IF NOT EXISTS eventos (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID NOT NULL,
  nome                    TEXT NOT NULL,
  descricao               TEXT,
  categoria               TEXT,
  local                   TEXT,
  data_inicio             DATE,
  data_fim                DATE,
  hora_inicio             TEXT,
  hora_fim                TEXT,
  gratuito                BOOLEAN NOT NULL DEFAULT false,
  link_whatsapp           TEXT,
  valor_padrao_prestador  NUMERIC(10,2),
  status                  TEXT NOT NULL DEFAULT 'ativo',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS salas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  nome            TEXT NOT NULL,
  capacidade      INTEGER NOT NULL DEFAULT 1,
  descricao       TEXT,
  cor             TEXT,
  ativo           BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS servicos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  nome            TEXT NOT NULL,
  descricao       TEXT,
  duracao         INTEGER NOT NULL DEFAULT 60,
  valor           NUMERIC(10,2),
  cor             TEXT,
  ativo           BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contratados (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  nome            TEXT NOT NULL,
  contato         TEXT,
  cpf_cnpj        TEXT,
  especialidade   TEXT,
  observacoes     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evento_contratados (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID,
  evento_id        UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  contratado_id    UUID NOT NULL REFERENCES contratados(id) ON DELETE CASCADE,
  funcao           TEXT,
  valor_acordado   NUMERIC(10,2) NOT NULL DEFAULT 0,
  horario_inicio   TEXT,
  horario_fim      TEXT,
  status_pagamento TEXT NOT NULL DEFAULT 'PENDENTE',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS participantes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  evento_id       UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  nome            TEXT NOT NULL,
  contato         TEXT,
  instagram       TEXT,
  segue_perfil    BOOLEAN NOT NULL DEFAULT false,
  observacoes     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS checklist_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  evento_id       UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  titulo          TEXT NOT NULL,
  tipo            TEXT NOT NULL DEFAULT 'levar',
  quantidade      INTEGER NOT NULL DEFAULT 1,
  custo_unitario  NUMERIC(10,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'ABERTO',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== CRM DOMAIN =====

CREATE TABLE IF NOT EXISTS leads (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID NOT NULL,
  nome                    TEXT NOT NULL,
  telefone                TEXT,
  email                   TEXT,
  origem                  TEXT,
  estagio                 TEXT NOT NULL DEFAULT 'aguardando',
  responsavel_id          TEXT,
  data_primeiro_contato   TIMESTAMPTZ,
  data_ultimo_contato     TIMESTAMPTZ,
  interesse               TEXT,
  observacoes             TEXT,
  motivo_nao_efetivacao   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lead_historico (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  lead_id        UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tipo_contato   TEXT,
  descricao      TEXT,
  resultado      TEXT,
  proximo_contato TIMESTAMPTZ,
  created_by     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_tarefas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  titulo          TEXT NOT NULL,
  descricao       TEXT,
  status          TEXT NOT NULL DEFAULT 'pendente',
  responsavel_id  TEXT,
  lead_id         UUID REFERENCES leads(id) ON DELETE SET NULL,
  due_date        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== MARKETING DOMAIN =====

CREATE TABLE IF NOT EXISTS marketing_consents (
  patient_id          UUID PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
  organization_id     UUID NOT NULL,
  social_media        BOOLEAN NOT NULL DEFAULT false,
  educational_material BOOLEAN NOT NULL DEFAULT false,
  website             BOOLEAN NOT NULL DEFAULT false,
  signed_at           TIMESTAMPTZ,
  signed_by           TEXT,
  signature_ip        TEXT,
  expires_at          TIMESTAMPTZ,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  revoked_at          TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketing_exports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  patient_id      UUID REFERENCES patients(id) ON DELETE SET NULL,
  export_type     TEXT NOT NULL DEFAULT 'video_comparison',
  file_path       TEXT,
  file_url        TEXT,
  is_anonymized   BOOLEAN NOT NULL DEFAULT true,
  metrics_overlay JSONB NOT NULL DEFAULT '[]'::JSONB,
  asset_a_id      TEXT,
  asset_b_id      TEXT,
  deleted         BOOLEAN NOT NULL DEFAULT false,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketing_review_configs (
  organization_id  UUID PRIMARY KEY,
  enabled          BOOLEAN NOT NULL DEFAULT false,
  trigger_status   JSONB NOT NULL DEFAULT '["alta","concluido"]'::JSONB,
  message_template TEXT,
  delay_hours      INTEGER NOT NULL DEFAULT 24,
  google_place_id  TEXT,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketing_birthday_configs (
  organization_id  UUID PRIMARY KEY,
  enabled          BOOLEAN NOT NULL DEFAULT false,
  message_template TEXT,
  send_whatsapp    BOOLEAN NOT NULL DEFAULT true,
  send_email       BOOLEAN NOT NULL DEFAULT false,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketing_recall_campaigns (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL,
  name                TEXT NOT NULL DEFAULT '',
  description         TEXT NOT NULL DEFAULT '',
  days_without_visit  INTEGER NOT NULL DEFAULT 180,
  message_template    TEXT NOT NULL DEFAULT '',
  enabled             BOOLEAN NOT NULL DEFAULT true,
  deleted             BOOLEAN NOT NULL DEFAULT false,
  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referral_codes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  patient_id      UUID REFERENCES patients(id) ON DELETE CASCADE,
  code            TEXT NOT NULL UNIQUE,
  max_uses        INTEGER,
  uses            INTEGER NOT NULL DEFAULT 0,
  last_used_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referral_redemptions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id          UUID NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
  organization_id      UUID NOT NULL,
  referrer_patient_id  UUID,
  new_patient_id       UUID,
  redeemed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fisio_links (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL,
  slug             TEXT NOT NULL UNIQUE,
  whatsapp_number  TEXT,
  google_maps_url  TEXT,
  phone            TEXT,
  show_before_after BOOLEAN NOT NULL DEFAULT false,
  show_reviews     BOOLEAN NOT NULL DEFAULT false,
  custom_message   TEXT,
  theme            TEXT,
  primary_color    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fisio_link_analytics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  slug            TEXT NOT NULL,
  button          TEXT NOT NULL,
  clicked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content_calendar (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  title           TEXT NOT NULL DEFAULT '',
  description     TEXT NOT NULL DEFAULT '',
  type            TEXT NOT NULL DEFAULT 'post',
  status          TEXT NOT NULL DEFAULT 'idea',
  date            DATE,
  hashtags        TEXT,
  image_url       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== GOOGLE INTEGRATIONS DOMAIN =====

CREATE TABLE IF NOT EXISTS google_integrations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              TEXT NOT NULL,
  organization_id      UUID,
  provider             TEXT NOT NULL DEFAULT 'google',
  external_email       TEXT,
  status               TEXT NOT NULL DEFAULT 'connected',
  settings             JSONB NOT NULL DEFAULT '{}'::JSONB,
  tokens               JSONB NOT NULL DEFAULT '{}'::JSONB,
  last_synced_at       TIMESTAMPTZ,
  events_synced_count  INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

CREATE TABLE IF NOT EXISTS google_sync_logs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id     UUID NOT NULL REFERENCES google_integrations(id) ON DELETE CASCADE,
  action             TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'success',
  event_type         TEXT,
  event_id           TEXT,
  external_event_id  TEXT,
  message            TEXT,
  metadata           JSONB,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS google_drive_items (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 TEXT NOT NULL,
  parent_provider_item_id TEXT,
  name                    TEXT NOT NULL,
  mime_type               TEXT,
  item_kind               TEXT NOT NULL DEFAULT 'file',
  web_view_link           TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== INDEXES =====

CREATE INDEX IF NOT EXISTS idx_eventos_org ON eventos(organization_id);
CREATE INDEX IF NOT EXISTS idx_salas_org ON salas(organization_id);
CREATE INDEX IF NOT EXISTS idx_servicos_org ON servicos(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_org ON leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_lead_historico_lead ON lead_historico(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_tarefas_org ON crm_tarefas(organization_id);
CREATE INDEX IF NOT EXISTS idx_marketing_exports_org ON marketing_exports(organization_id);
CREATE INDEX IF NOT EXISTS idx_marketing_recall_org ON marketing_recall_campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_org ON referral_codes(organization_id);
CREATE INDEX IF NOT EXISTS idx_fisio_link_analytics_slug ON fisio_link_analytics(slug);
CREATE INDEX IF NOT EXISTS idx_content_calendar_org ON content_calendar(organization_id);
CREATE INDEX IF NOT EXISTS idx_google_integrations_user ON google_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_google_sync_logs_integration ON google_sync_logs(integration_id);
