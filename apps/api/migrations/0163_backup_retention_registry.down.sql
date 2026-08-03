DELETE FROM operational_backup_registry
 WHERE table_name IN (
  'backup_appointments_therapist_20260730',
  'backup_sessions_therapist_20260730',
  'zenfisio_artifact_cleanup_backup_20260730'
 );
DELETE FROM schema_migration_ledger
 WHERE migration_key = '0163_backup_retention_registry';
DROP TABLE IF EXISTS operational_backup_registry;
