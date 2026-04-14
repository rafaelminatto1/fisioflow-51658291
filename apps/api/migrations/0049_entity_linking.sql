-- Migration 0049: Entity linking for tasks + time entries → tasks
-- Applied: 2026-04-14

-- Entity linking for tasks (patient / appointment / session / goal / exercise_plan)
ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS linked_entity_type VARCHAR(50);
ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS linked_entity_id   UUID;
CREATE INDEX IF NOT EXISTS idx_tarefas_linked_entity ON tarefas(linked_entity_type, linked_entity_id) WHERE linked_entity_id IS NOT NULL;

-- Time entries linked to tasks
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tarefas(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_time_entries_task_id ON time_entries(task_id) WHERE task_id IS NOT NULL;
