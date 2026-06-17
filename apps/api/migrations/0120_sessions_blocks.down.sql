-- 0120_sessions_blocks.down.sql
ALTER TABLE sessions DROP COLUMN IF EXISTS blocks;
