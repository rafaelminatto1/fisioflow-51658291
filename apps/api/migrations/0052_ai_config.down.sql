-- Rollback 0052: Remove AI config tables
DROP TABLE IF EXISTS ai_usage_logs;
DROP TABLE IF EXISTS ai_config;
DROP TABLE IF EXISTS ai_models;
