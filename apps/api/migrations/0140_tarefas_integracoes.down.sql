DROP TABLE IF EXISTS tarefa_notification_log;
DROP TABLE IF EXISTS tarefa_templates;
DROP TABLE IF EXISTS tarefa_comments;
DROP INDEX IF EXISTS idx_tarefas_recurrence_parent;
ALTER TABLE tarefas DROP COLUMN IF EXISTS recurrence_parent_id;
ALTER TABLE tarefas DROP COLUMN IF EXISTS recurrence;
ALTER TABLE profiles DROP COLUMN IF EXISTS phone;
