-- Down migration for 0072_group_management
DROP TABLE IF EXISTS group_sessions CASCADE;
DROP TABLE IF EXISTS group_enrollments CASCADE;
DROP TABLE IF EXISTS group_waitlist CASCADE;
