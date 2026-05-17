-- 0087_nps_surveys.sql
--
-- Pesquisa NPS pós-alta (e ad-hoc). Cada survey tem token público para
-- responder sem login. Score 0-10 (padrão NPS): 9-10 promotor, 7-8 neutro,
-- 0-6 detrator.
--
-- Integra com:
--   - contact_activities (cria entry tipo='nps' ao responder)
--   - crm_automation_rules (template "Alta — NPS em 7d" agenda envio)
--   - referral_codes (promotores podem gerar código automaticamente)

BEGIN;

CREATE TABLE IF NOT EXISTS nps_surveys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  contact_id      UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  patient_id      UUID,

  -- Token público (URL: /nps/:token) com entropia suficiente
  token           TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18), 'base64'),

  -- Resposta
  score           SMALLINT CHECK (score IS NULL OR score BETWEEN 0 AND 10),
  comentario      TEXT,
  classification  TEXT CHECK (classification IS NULL OR classification IN ('promoter','passive','detractor')),

  -- Origem
  rule_id         UUID,           -- crm_automation_rules.id se enviado por automação
  campaign_id     UUID,
  channel         TEXT,           -- whatsapp | email | manual
  message_sent    TEXT,

  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nps_org_sent       ON nps_surveys(organization_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_nps_org_responded  ON nps_surveys(organization_id, responded_at DESC) WHERE responded_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_nps_contact        ON nps_surveys(contact_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_nps_classification ON nps_surveys(organization_id, classification) WHERE classification IS NOT NULL;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION nps_surveys_touch() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_nps_surveys_touch ON nps_surveys;
CREATE TRIGGER trg_nps_surveys_touch
  BEFORE UPDATE ON nps_surveys
  FOR EACH ROW EXECUTE FUNCTION nps_surveys_touch();

-- Trigger: ao gravar score, classifica e cria contact_activity
CREATE OR REPLACE FUNCTION nps_on_response() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.score IS NULL THEN RETURN NEW; END IF;

  NEW.responded_at := COALESCE(NEW.responded_at, NOW());
  NEW.classification := CASE
    WHEN NEW.score >= 9 THEN 'promoter'
    WHEN NEW.score >= 7 THEN 'passive'
    ELSE 'detractor'
  END;

  -- Activity na timeline do contato
  INSERT INTO contact_activities (
    organization_id, contact_id, tipo, titulo, descricao,
    ref_campaign_id, ref_automation_id, payload
  ) VALUES (
    NEW.organization_id, NEW.contact_id, 'nps',
    'NPS respondido: ' || NEW.score::text || ' (' || NEW.classification || ')',
    LEFT(COALESCE(NEW.comentario, ''), 500),
    NEW.campaign_id, NEW.rule_id,
    jsonb_build_object('score', NEW.score, 'classification', NEW.classification)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_nps_on_response ON nps_surveys;
CREATE TRIGGER trg_nps_on_response
  BEFORE UPDATE OF score ON nps_surveys
  FOR EACH ROW
  WHEN (OLD.score IS DISTINCT FROM NEW.score)
  EXECUTE FUNCTION nps_on_response();

COMMIT;
