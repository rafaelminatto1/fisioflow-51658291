DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'notes', 'note_revisions', 'note_permissions', 'note_mentions', 'note_relations',
    'note_comments', 'note_attachments', 'note_tasks', 'note_audit_logs'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I NO FORCE ROW LEVEL SECURITY', table_name);
  END LOOP;
END $$;
