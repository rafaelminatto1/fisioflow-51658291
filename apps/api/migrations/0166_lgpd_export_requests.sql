-- 0166_lgpd_export_requests.sql
-- LGPD art. 18 V/VI — portabilidade e acesso: registra pedidos de EXPORTAÇÃO de
-- dados, espelhando lgpd_deletion_requests (0094).
--
-- Motivo: a tela de exportação do app profissional chamava POST /api/export, rota
-- que nunca existiu no Worker. O usuário via "sua solicitação está sendo
-- processada" e nada era registrado em lugar nenhum — obrigação legal com prazo
-- de 15 dias que ninguém conseguia sequer auditar.

CREATE TABLE IF NOT EXISTS public.lgpd_export_requests (
  id                BIGSERIAL PRIMARY KEY,
  organization_id   UUID         NOT NULL REFERENCES public.organizations(id),
  requester_user_id TEXT         NOT NULL,
  requester_email   TEXT         NOT NULL,
  requester_name    TEXT,
  request_origin    VARCHAR(32)  NOT NULL DEFAULT 'professional_app',
  format            VARCHAR(16)  NOT NULL DEFAULT 'json'
    CHECK (format IN ('json', 'csv', 'pdf')),
  -- Categorias pedidas: appointments, evolutions, exercises, profile.
  types             TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
  date_range_start  DATE,
  date_range_end    DATE,
  status            VARCHAR(32)  NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'in_progress', 'completed', 'rejected')),
  result_url        TEXT,
  response_summary  TEXT,
  responded_at      TIMESTAMPTZ,
  due_at            TIMESTAMPTZ  NOT NULL DEFAULT now() + interval '15 days',
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lgpd_export_requests_org_due
  ON public.lgpd_export_requests (organization_id, due_at)
  WHERE status NOT IN ('completed', 'rejected');

CREATE INDEX IF NOT EXISTS idx_lgpd_export_requests_requester
  ON public.lgpd_export_requests (requester_user_id, created_at DESC);

ALTER TABLE public.lgpd_export_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lgpd_export_requests_org_isolation ON public.lgpd_export_requests;
CREATE POLICY lgpd_export_requests_org_isolation
  ON public.lgpd_export_requests
  USING (organization_id::text = current_setting('app.org_id', true));

COMMENT ON TABLE public.lgpd_export_requests IS
  'Pedidos de portabilidade/acesso a dados (LGPD art. 18 V e VI). Prazo legal de resposta: 15 dias.';
