-- 0120_sessions_blocks.sql
-- Editor modular de evolução (blocos estilo Notion). Mantém `observacao` (texto/HTML legado).
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS blocks JSONB NOT NULL DEFAULT '[]'::jsonb;
