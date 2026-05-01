-- Rollback 0036: Remove misc tables (eventos domain, CRM, marketing, google integrations)
-- WARNING: This is destructive — ensure backups exist before running
DROP TABLE IF EXISTS google_drive_items;
DROP TABLE IF EXISTS google_sync_logs;
DROP TABLE IF EXISTS google_integrations;
DROP TABLE IF EXISTS content_calendar;
DROP TABLE IF EXISTS fisio_link_analytics;
DROP TABLE IF EXISTS fisio_links;
DROP TABLE IF EXISTS referral_redemptions;
DROP TABLE IF EXISTS referral_codes;
DROP TABLE IF EXISTS marketing_recall_campaigns;
DROP TABLE IF EXISTS marketing_birthday_configs;
DROP TABLE IF EXISTS marketing_review_configs;
DROP TABLE IF EXISTS marketing_exports;
DROP TABLE IF EXISTS marketing_consents;
DROP TABLE IF EXISTS crm_tarefas;
DROP TABLE IF EXISTS lead_historico;
DROP TABLE IF EXISTS leads;
DROP TABLE IF EXISTS checklist_items;
DROP TABLE IF EXISTS participantes;
DROP TABLE IF EXISTS evento_contratados;
DROP TABLE IF EXISTS contratados;
DROP TABLE IF EXISTS servicos;
DROP TABLE IF EXISTS salas;
DROP TABLE IF EXISTS eventos;
