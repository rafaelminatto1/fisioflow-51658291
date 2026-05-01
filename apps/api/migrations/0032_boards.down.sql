-- Rollback 0032: Remove Boards system
ALTER TABLE tarefas DROP COLUMN IF EXISTS board_id;
ALTER TABLE tarefas DROP COLUMN IF EXISTS column_id;
DROP TABLE IF EXISTS board_columns;
DROP TABLE IF EXISTS boards;
