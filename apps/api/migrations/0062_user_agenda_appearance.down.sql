-- Rollback 0062: Persist per-user agenda appearance settings

DROP INDEX IF EXISTS idx_user_agenda_appearance_profile;
DROP INDEX IF EXISTS idx_user_agenda_appearance_unique;
DROP TABLE IF EXISTS user_agenda_appearance;
