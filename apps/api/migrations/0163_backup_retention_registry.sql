-- Registra backups operacionais para retenção explícita antes de qualquer remoção.
CREATE TABLE IF NOT EXISTS operational_backup_registry (
  table_name text PRIMARY KEY,
  purpose text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  retain_until timestamptz,
  protected boolean NOT NULL DEFAULT true,
  notes text
);

INSERT INTO operational_backup_registry (table_name, purpose, retain_until, notes)
VALUES
  ('backup_appointments_therapist_20260730', 'auditoria de restauração de terapeuta', now() + interval '90 days', 'Não remover sem export e confirmação operacional'),
  ('backup_sessions_therapist_20260730', 'auditoria de restauração de terapeuta', now() + interval '90 days', 'Não remover sem export e confirmação operacional'),
  ('zenfisio_artifact_cleanup_backup_20260730', 'rollback de limpeza de artefatos', now() + interval '90 days', 'Não remover sem export e confirmação operacional')
ON CONFLICT (table_name) DO NOTHING;

INSERT INTO schema_migration_ledger (migration_key, checksum, notes)
VALUES (
  '0163_backup_retention_registry',
  'repository-0163-backup-retention-registry',
  'Registro de retenção sem remoção destrutiva'
)
ON CONFLICT (migration_key) DO NOTHING;
