-- Migration 0121: Ensure scheduling_notification_settings has UNIQUE(organization_id)
-- Required for INSERT ... ON CONFLICT (organization_id) upsert to work correctly.
-- Without this constraint, every INSERT creates a duplicate row.

DO $$
BEGIN
  -- Add UNIQUE constraint if it doesn't already exist
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.scheduling_notification_settings'::regclass
      AND conname = 'scheduling_notification_settings_organization_id_key'
  ) THEN
    -- First, deduplicate: keep only the most recent row per organization_id
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
