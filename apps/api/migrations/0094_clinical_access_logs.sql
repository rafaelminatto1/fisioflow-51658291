-- 0094_clinical_access_logs.sql
-- LGPD G2 (Parecer DPO 2026-05-19) — Logs de acesso a prontuário/evolução.
-- Retenção 2 anos (LGPDPro recomendação). Indexado para auditoria por paciente,
-- por usuário, por janela temporal.

CREATE TABLE IF NOT EXISTS public.clinical_access_logs (
  id              BIGSERIAL PRIMARY KEY,
  organization_id UUID         NOT NULL REFERENCES public.organizations(id),
  user_id         UUID         NOT NULL,
  patient_id      UUID         REFERENCES public.patients(id),
  session_id      UUID         REFERENCES public.sessions(id),
  resource        VARCHAR(64)  NOT NULL,
  action          VARCHAR(16)  NOT NULL CHECK (action IN ('read', 'create', 'update', 'delete', 'export')),
  source          VARCHAR(16)  NOT NULL DEFAULT 'neon' CHECK (source IN ('neon', 'r2_archive')),
  request_ip      INET,
  user_agent      TEXT,
  metadata        JSONB        DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinical_access_logs_org_created
  ON public.clinical_access_logs (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clinical_access_logs_patient_created
  ON public.clinical_access_logs (patient_id, created_at DESC)
  WHERE patient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clinical_access_logs_user_created
  ON public.clinical_access_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clinical_access_logs_session
  ON public.clinical_access_logs (session_id)
  WHERE session_id IS NOT NULL;

ALTER TABLE public.clinical_access_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clinical_access_logs_org_isolation ON public.clinical_access_logs;
CREATE POLICY clinical_access_logs_org_isolation
  ON public.clinical_access_logs
  USING (organization_id::text = current_setting('app.org_id', true));

DROP POLICY IF EXISTS clinical_access_logs_insert_anyone ON public.clinical_access_logs;
CREATE POLICY clinical_access_logs_insert_anyone
  ON public.clinical_access_logs
  FOR INSERT
  WITH CHECK (organization_id::text = current_setting('app.org_id', true));

COMMENT ON TABLE public.clinical_access_logs IS
  'LGPD G2 — log de acesso a recursos clínicos. Retenção 2 anos. Parecer DPO 2026-05-19.';

-- ============================================================================
-- LGPD data deletion requests — registro de pedidos do titular (art. 18 IV).
-- Resposta automatizada distingue dado clínico (mantém 20 anos) de cadastral (apaga).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.lgpd_deletion_requests (
  id                BIGSERIAL PRIMARY KEY,
  organization_id   UUID         NOT NULL REFERENCES public.organizations(id),
  patient_id        UUID         REFERENCES public.patients(id),
  requester_email   TEXT         NOT NULL,
  requester_name    TEXT,
  request_origin    VARCHAR(32)  NOT NULL DEFAULT 'patient_portal',
  scope             VARCHAR(32)  NOT NULL CHECK (scope IN ('all', 'cadastral', 'marketing')),
  status            VARCHAR(32)  NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'in_review', 'partial_done', 'denied_clinical_retention', 'completed', 'rejected')),
  response_summary  TEXT,
  legal_basis       TEXT,
  responded_at      TIMESTAMPTZ,
  due_at            TIMESTAMPTZ  NOT NULL DEFAULT now() + interval '15 days',
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lgpd_deletion_requests_org_due
  ON public.lgpd_deletion_requests (organization_id, due_at)
  WHERE status NOT IN ('completed', 'rejected', 'denied_clinical_retention');

CREATE INDEX IF NOT EXISTS idx_lgpd_deletion_requests_patient
  ON public.lgpd_deletion_requests (patient_id)
  WHERE patient_id IS NOT NULL;

ALTER TABLE public.lgpd_deletion_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lgpd_deletion_requests_org_isolation ON public.lgpd_deletion_requests;
CREATE POLICY lgpd_deletion_requests_org_isolation
  ON public.lgpd_deletion_requests
  USING (organization_id::text = current_setting('app.org_id', true));

COMMENT ON TABLE public.lgpd_deletion_requests IS
  'LGPD G3 — registro de pedidos de exclusão (art. 18 IV). Prontuário mantido por 20 anos sob art. 16 II. Parecer DPO 2026-05-19.';
