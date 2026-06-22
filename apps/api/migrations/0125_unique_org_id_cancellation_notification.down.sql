-- Down: remove unique constraints adicionadas pela 0125
ALTER TABLE cancellation_rules
  DROP CONSTRAINT IF EXISTS cancellation_rules_organization_id_key;

ALTER TABLE scheduling_notification_settings
  DROP CONSTRAINT IF EXISTS scheduling_notification_settings_organization_id_key;
