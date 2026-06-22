-- Migration 0125: Adiciona UNIQUE(organization_id) em cancellation_rules e
-- aplica migration 0121 que nunca foi executada (scheduling_notification_settings).
--
-- Root cause: INSERT ... ON CONFLICT (organization_id) exige unique constraint.
-- Sem ela, o Postgres lança "there is no unique or exclusion constraint matching
-- the ON CONFLICT specification" em todo upsert — configurações nunca eram salvas.

DO $$
BEGIN
  -- cancellation_rules
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.cancellation_rules'::regclass
      AND conname = 'cancellation_rules_organization_id_key'
  ) THEN
    DELETE FROM cancellation_rules
    WHERE id NOT IN (
      SELECT DISTINCT ON (organization_id) id
      FROM cancellation_rules
      ORDER BY organization_id, updated_at DESC NULLS LAST, id DESC
    );

    ALTER TABLE cancellation_rules
      ADD CONSTRAINT cancellation_rules_organization_id_key
      UNIQUE (organization_id);
  END IF;

  -- scheduling_notification_settings (migration 0121 nunca aplicada)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.scheduling_notification_settings'::regclass
      AND conname = 'scheduling_notification_settings_organization_id_key'
  ) THEN
    DELETE FROM scheduling_notification_settings
    WHERE id NOT IN (
      SELECT DISTINCT ON (organization_id) id
      FROM scheduling_notification_settings
      ORDER BY organization_id, updated_at DESC NULLS LAST, id DESC
    );

    ALTER TABLE scheduling_notification_settings
      ADD CONSTRAINT scheduling_notification_settings_organization_id_key
      UNIQUE (organization_id);
  END IF;
END
$$;
