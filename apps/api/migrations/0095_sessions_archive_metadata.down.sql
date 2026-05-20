-- Rollback 0095_sessions_archive_metadata
DROP TABLE IF EXISTS public.session_archive_runs;
DROP INDEX IF EXISTS public.idx_sessions_archive_eligible;
ALTER TABLE public.sessions DROP COLUMN IF EXISTS archived_at;
