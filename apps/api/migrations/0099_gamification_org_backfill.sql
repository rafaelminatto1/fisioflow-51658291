-- Backfill tenant columns used by gamification RLS policies.
-- Existing rows without organization_id become invisible to the Worker once RLS
-- is enabled, and can also make daily quest creation fail on the unique key.

ALTER TABLE daily_quests
  ADD COLUMN IF NOT EXISTS organization_id UUID;

ALTER TABLE patient_gamification
  ADD COLUMN IF NOT EXISTS organization_id UUID;

ALTER TABLE xp_transactions
  ADD COLUMN IF NOT EXISTS organization_id UUID;

ALTER TABLE achievements_log
  ADD COLUMN IF NOT EXISTS organization_id UUID;

UPDATE daily_quests dq
SET organization_id = p.organization_id
FROM patients p
WHERE dq.patient_id = p.id
  AND p.organization_id IS NOT NULL
  AND dq.organization_id IS DISTINCT FROM p.organization_id;

UPDATE patient_gamification pg
SET organization_id = p.organization_id
FROM patients p
WHERE pg.patient_id = p.id
  AND p.organization_id IS NOT NULL
  AND pg.organization_id IS DISTINCT FROM p.organization_id;

UPDATE xp_transactions xt
SET organization_id = p.organization_id
FROM patients p
WHERE xt.patient_id = p.id
  AND p.organization_id IS NOT NULL
  AND xt.organization_id IS DISTINCT FROM p.organization_id;

UPDATE achievements_log al
SET organization_id = p.organization_id
FROM patients p
WHERE al.patient_id = p.id
  AND p.organization_id IS NOT NULL
  AND al.organization_id IS DISTINCT FROM p.organization_id;

CREATE INDEX IF NOT EXISTS idx_daily_quests_org_patient_date
  ON daily_quests (organization_id, patient_id, date);

CREATE INDEX IF NOT EXISTS idx_patient_gamification_org_patient
  ON patient_gamification (organization_id, patient_id);

CREATE INDEX IF NOT EXISTS idx_xp_transactions_org_patient_created
  ON xp_transactions (organization_id, patient_id, created_at DESC);
