-- Down: remove apenas a constraint que a 0125 adiciona de fato (cancellation_rules).
--
-- A UNIQUE de scheduling_notification_settings pertence à migration 0121 — a 0125
-- só a cria quando ausente (IF NOT EXISTS). Derrubá-la no rollback deixaria o
-- schema inconsistente com as migrations até 0124 e quebraria de novo o upsert
-- de notificações (ON CONFLICT (organization_id)) em bancos onde 0121 já existia.
-- Por isso a constraint de notificações é mantida intacta no rollback.
ALTER TABLE cancellation_rules
  DROP CONSTRAINT IF EXISTS cancellation_rules_organization_id_key;
