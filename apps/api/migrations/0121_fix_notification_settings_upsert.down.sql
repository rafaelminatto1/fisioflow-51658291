-- Down migration: remove the UNIQUE constraint (reverses 0121)
ALTER TABLE scheduling_notification_settings
  DROP CONSTRAINT IF EXISTS scheduling_notification_settings_organization_id_key;
