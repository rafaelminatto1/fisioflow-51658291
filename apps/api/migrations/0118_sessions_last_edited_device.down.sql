-- 0118_sessions_last_edited_device.down.sql
ALTER TABLE sessions
  DROP COLUMN IF EXISTS last_edited_device_id;
