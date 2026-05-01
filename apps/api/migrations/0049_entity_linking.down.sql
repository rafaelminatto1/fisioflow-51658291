-- Rollback 0049: Remove entity linking columns
DROP INDEX IF EXISTS idx_time_entries_task_id;
ALTER TABLE time_entries DROP COLUMN IF EXISTS task_id;
DROP INDEX IF EXISTS idx_tarefas_linked_entity;
ALTER TABLE tarefas DROP COLUMN IF EXISTS linked_entity_id;
ALTER TABLE tarefas DROP COLUMN IF EXISTS linked_entity_type;
