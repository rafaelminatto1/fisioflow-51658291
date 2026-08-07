ALTER TABLE patients DROP COLUMN IF EXISTS partnership_role;
ALTER TABLE patients DROP COLUMN IF EXISTS partnership_id;
DROP TABLE IF EXISTS partnerships;
