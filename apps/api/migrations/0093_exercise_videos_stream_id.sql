-- Migration: adiciona colunas Cloudflare Stream em exercise_videos
-- Data: 2026-05-18
-- Spec: specs/exercise-videos-stream-bindings/spec.md (S6.1)
--
-- Why: Stream Bindings (GA 2026-05-07) substituem upload R2 direto por
--      encoding adaptativo + HLS + thumbnails automáticos. Mantemos a coluna
--      video_url (R2) para backward-compat — novos uploads usam stream_id.
--
-- Idempotente — re-aplicar sem erro.

ALTER TABLE public.exercise_videos
  ADD COLUMN IF NOT EXISTS stream_id TEXT,
  ADD COLUMN IF NOT EXISTS stream_status TEXT,           -- pendingupload | downloading | queued | inprogress | ready | error
  ADD COLUMN IF NOT EXISTS stream_thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS stream_playback_id TEXT,      -- HLS playback URL hash
  ADD COLUMN IF NOT EXISTS stream_duration_seconds NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS stream_ready_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_exercise_videos_stream_id
  ON public.exercise_videos (stream_id)
  WHERE stream_id IS NOT NULL;

COMMENT ON COLUMN public.exercise_videos.stream_id IS
  'UID do Cloudflare Stream — null para vídeos legados em R2 (video_url)';
