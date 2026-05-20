-- 0095_sessions_archive_metadata.sql
-- S6.2 Fase 3 — metadados de arquivamento R2 Iceberg.
-- archived_at marca quando a sessao foi enviada ao Pipeline (e estara no R2).
-- session_archive_runs audita cada batch: quantas linhas, qual janela, erros.

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_sessions_archive_eligible
  ON public.sessions (created_at)
  WHERE archived_at IS NULL AND deleted_at IS NULL;

COMMENT ON COLUMN public.sessions.archived_at IS
  'LGPD S6.2 — timestamp do envio ao Pipeline R2 Iceberg. NULL = ainda quente.';

CREATE TABLE IF NOT EXISTS public.session_archive_runs (
  id              BIGSERIAL PRIMARY KEY,
  started_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  finished_at     TIMESTAMPTZ,
  trigger         VARCHAR(32)  NOT NULL DEFAULT 'cron' CHECK (trigger IN ('cron', 'manual', 'backfill')),
  window_start    TIMESTAMPTZ  NOT NULL,
  window_end      TIMESTAMPTZ  NOT NULL,
  rows_eligible   INTEGER      NOT NULL DEFAULT 0,
  rows_sent       INTEGER      NOT NULL DEFAULT 0,
  rows_marked     INTEGER      NOT NULL DEFAULT 0,
  status          VARCHAR(16)  NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'partial', 'failed')),
  error_message   TEXT,
  metadata        JSONB        DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_session_archive_runs_started
  ON public.session_archive_runs (started_at DESC);

COMMENT ON TABLE public.session_archive_runs IS
  'Audit log das execucoes do pipeline R2 archive. Retencao indeterminada.';
