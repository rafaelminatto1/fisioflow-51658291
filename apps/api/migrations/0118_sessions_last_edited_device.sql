-- 0118_sessions_last_edited_device.sql
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS last_edited_device_id varchar(120);
