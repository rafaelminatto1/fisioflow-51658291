-- 0096_clinical_alerts.sql
-- S9 — Fix 5xx em GET /api/clinic-metrics/clinical-alerts e RTMAlertsService.triggerAlert.
-- Schema inferido do INSERT em apps/api/src/services/rtm-alerts.ts:135 e
-- do SELECT em apps/api/src/routes/clinicMetrics.ts:411.

CREATE TABLE IF NOT EXISTS public.clinical_alerts (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  UUID         NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  type        VARCHAR(64)  NOT NULL,
  severity    VARCHAR(16)  NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message     TEXT         NOT NULL,
  data        JSONB        DEFAULT '{}'::jsonb,
  status      VARCHAR(16)  NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'resolved', 'dismissed')),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinical_alerts_patient_pending
  ON public.clinical_alerts (patient_id, created_at DESC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_clinical_alerts_status_created
  ON public.clinical_alerts (status, created_at DESC);

ALTER TABLE public.clinical_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clinical_alerts_org_isolation ON public.clinical_alerts;
CREATE POLICY clinical_alerts_org_isolation
  ON public.clinical_alerts
  USING (
    patient_id IN (
      SELECT id FROM public.patients WHERE organization_id::text = current_setting('app.org_id', true)
    )
  );

COMMENT ON TABLE public.clinical_alerts IS
  'S9 — alertas RTM (Real-time Monitoring) gerados por RTMAlertsService. Pending = ainda nao tratado.';
