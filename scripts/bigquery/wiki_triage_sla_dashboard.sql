-- Dashboard base for Wiki Triage SLA analytics
-- Project: fisioflow-migration
-- Dataset: fisioflow_analytics
-- View: wiki_triage_sla_daily
--
-- Usage (CLI):
-- bq query --use_legacy_sql=false < scripts/bigquery/wiki_triage_sla_dashboard.sql

CREATE SCHEMA IF NOT EXISTS `fisioflow-migration.fisioflow_analytics`;

CREATE TABLE IF NOT EXISTS `fisioflow-migration.fisioflow_analytics.wiki_triage_events_raw` (
  id STRING,
  organization_id STRING,
  page_id STRING,
  page_title STRING,
  template_id STRING,
  from_status STRING,
  to_status STRING,
  source STRING,
  reason STRING,
  changed_by STRING,
  created_at TIMESTAMP
);

CREATE OR REPLACE VIEW `fisioflow-migration.fisioflow_analytics.wiki_triage_sla_daily` AS
WITH base AS (
  SELECT
    organization_id,
    COALESCE(template_id, 'manual') AS template_id,
    page_id,
    page_title,
    from_status,
    to_status,
    source,
    reason,
    changed_by,
    TIMESTAMP(created_at) AS created_ts,
    DATE(TIMESTAMP(created_at)) AS event_date
  FROM `fisioflow-migration.fisioflow_analytics.wiki_triage_events_raw`
),
aggregated AS (
  SELECT
    organization_id,
    template_id,
    event_date,
    COUNT(*) AS total_events,
    COUNTIF(source = 'drag') AS drag_moves,
    COUNTIF(source = 'quick-action') AS quick_action_moves,
    COUNTIF(source = 'automation-checklist') AS automation_checklist_moves,
    COUNTIF(source = 'automation-blocked') AS automation_blocked_events,
    COUNTIF(to_status = 'done') AS moved_to_done,
    COUNT(DISTINCT page_id) AS unique_cards_touched,
    COUNTIF(from_status = 'in-progress' AND to_status = 'done') AS in_progress_to_done,
    COUNTIF(from_status = 'backlog' AND to_status = 'in-progress') AS backlog_to_in_progress,
    APPROX_COUNT_DISTINCT(changed_by) AS unique_actors
  FROM base
  GROUP BY 1,2,3
),
weekly_throughput AS (
  SELECT
    organization_id,
    template_id,
    DATE_TRUNC(event_date, WEEK(MONDAY)) AS week_start,
    SUM(moved_to_done) AS throughput_weekly
  FROM aggregated
  GROUP BY 1,2,3
)
SELECT
  a.organization_id,
  a.template_id,
  a.event_date,
  a.total_events,
  a.drag_moves,
  a.quick_action_moves,
  a.automation_checklist_moves,
  a.automation_blocked_events,
  a.moved_to_done,
  a.unique_cards_touched,
  a.in_progress_to_done,
  a.backlog_to_in_progress,
  a.unique_actors,
  w.week_start,
  w.throughput_weekly,
  SAFE_DIVIDE(a.moved_to_done, NULLIF(a.total_events, 0)) AS done_conversion_rate,
  SAFE_DIVIDE(a.in_progress_to_done, NULLIF(a.backlog_to_in_progress, 0)) AS flow_efficiency_ratio
FROM aggregated a
LEFT JOIN weekly_throughput w
  ON w.organization_id = a.organization_id
  AND w.template_id = a.template_id
  AND w.week_start = DATE_TRUNC(a.event_date, WEEK(MONDAY));
