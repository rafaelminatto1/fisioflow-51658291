-- Rollback 0039: Remove session package tables
DROP TABLE IF EXISTS package_usage;
DROP TABLE IF EXISTS patient_packages;
DROP TABLE IF EXISTS session_package_templates;
DROP TABLE IF EXISTS session_packages;
