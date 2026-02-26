-- Wiki Triage SLA with template targets (real vs target)
-- Project: fisioflow-migration
-- Dataset: fisioflow_analytics
--
-- Usage:
-- bq query --use_legacy_sql=false < scripts/bigquery/wiki_triage_sla_with_targets.sql

CREATE SCHEMA IF NOT EXISTS `fisioflow-migration.fisioflow_analytics`;

CREATE TABLE IF NOT EXISTS `fisioflow-migration.fisioflow_analytics.wiki_triage_template_targets` (
  organization_id STRING,
  template_id STRING,
  target_throughput_weekly INT64,
  target_done_conversion_rate FLOAT64,
  target_flow_efficiency_ratio FLOAT64,
  target_blocked_events_weekly INT64,
  updated_at TIMESTAMP
);

MERGE `fisioflow-migration.fisioflow_analytics.wiki_triage_template_targets` T
USING (
  SELECT '*' AS organization_id, 'incident-postmortem-v1' AS template_id, 8 AS target_throughput_weekly, 0.45 AS target_done_conversion_rate, 0.75 AS target_flow_efficiency_ratio, 4 AS target_blocked_events_weekly UNION ALL
  SELECT '*', 'meeting-notes-v1', 12, 0.60, 0.85, 2 UNION ALL
  SELECT '*', 'product-prd-v1', 6, 0.40, 0.70, 3 UNION ALL
  SELECT '*', 'manual', 5, 0.35, 0.65, 3
) S
ON T.organization_id = S.organization_id AND T.template_id = S.template_id
WHEN NOT MATCHED THEN
  INSERT (
    organization_id,
    template_id,
    target_throughput_weekly,
    target_done_conversion_rate,
    target_flow_efficiency_ratio,
    target_blocked_events_weekly,
    updated_at
  )
  VALUES (
    S.organization_id,
    S.template_id,
    S.target_throughput_weekly,
    S.target_done_conversion_rate,
    S.target_flow_efficiency_ratio,
    S.target_blocked_events_weekly,
    CURRENT_TIMESTAMP()
  );

CREATE OR REPLACE VIEW `fisioflow-migration.fisioflow_analytics.wiki_triage_sla_with_targets` AS
WITH daily AS (
  SELECT *
  FROM `fisioflow-migration.fisioflow_analytics.wiki_triage_sla_daily`
),
weekly AS (
  SELECT
    organization_id,
    template_id,
    week_start,
    SUM(automation_blocked_events) AS blocked_events_weekly
  FROM daily
  GROUP BY 1,2,3
),
joined AS (
  SELECT
    d.*,
    w.blocked_events_weekly,
    COALESCE(org_target.target_throughput_weekly, global_target.target_throughput_weekly) AS target_throughput_weekly,
    COALESCE(org_target.target_done_conversion_rate, global_target.target_done_conversion_rate) AS target_done_conversion_rate,
    COALESCE(org_target.target_flow_efficiency_ratio, global_target.target_flow_efficiency_ratio) AS target_flow_efficiency_ratio,
    COALESCE(org_target.target_blocked_events_weekly, global_target.target_blocked_events_weekly) AS target_blocked_events_weekly
  FROM daily d
  LEFT JOIN weekly w
    ON w.organization_id = d.organization_id
    AND w.template_id = d.template_id
    AND w.week_start = d.week_start
  LEFT JOIN `fisioflow-migration.fisioflow_analytics.wiki_triage_template_targets` org_target
    ON org_target.organization_id = d.organization_id
    AND org_target.template_id = d.template_id
  LEFT JOIN `fisioflow-migration.fisioflow_analytics.wiki_triage_template_targets` global_target
    ON global_target.organization_id = '*'
    AND global_target.template_id = d.template_id
)
SELECT
  organization_id,
  template_id,
  event_date,
  week_start,
  total_events,
  moved_to_done,
  throughput_weekly,
  done_conversion_rate,
  flow_efficiency_ratio,
  automation_blocked_events,
  blocked_events_weekly,
  unique_cards_touched,
  unique_actors,
  target_throughput_weekly,
  target_done_conversion_rate,
  target_flow_efficiency_ratio,
  target_blocked_events_weekly,
  throughput_weekly - target_throughput_weekly AS throughput_gap,
  done_conversion_rate - target_done_conversion_rate AS conversion_gap,
  flow_efficiency_ratio - target_flow_efficiency_ratio AS flow_gap,
  target_blocked_events_weekly - blocked_events_weekly AS blocked_gap,
  CASE
    WHEN throughput_weekly >= target_throughput_weekly THEN 'VERDE'
    WHEN throughput_weekly >= target_throughput_weekly * 0.8 THEN 'AMARELO'
    ELSE 'VERMELHO'
  END AS sla_throughput_status,
  CASE
    WHEN done_conversion_rate >= target_done_conversion_rate THEN 'VERDE'
    WHEN done_conversion_rate >= target_done_conversion_rate * 0.8 THEN 'AMARELO'
    ELSE 'VERMELHO'
  END AS sla_conversion_status,
  CASE
    WHEN flow_efficiency_ratio >= target_flow_efficiency_ratio THEN 'VERDE'
    WHEN flow_efficiency_ratio >= target_flow_efficiency_ratio * 0.8 THEN 'AMARELO'
    ELSE 'VERMELHO'
  END AS sla_flow_status,
  CASE
    WHEN blocked_events_weekly <= target_blocked_events_weekly THEN 'VERDE'
    WHEN blocked_events_weekly <= target_blocked_events_weekly * 1.5 THEN 'AMARELO'
    ELSE 'VERMELHO'
  END AS sla_blocked_status,
  (
    IF(throughput_weekly >= target_throughput_weekly, 25, IF(throughput_weekly >= target_throughput_weekly * 0.8, 15, 5))
    + IF(done_conversion_rate >= target_done_conversion_rate, 25, IF(done_conversion_rate >= target_done_conversion_rate * 0.8, 15, 5))
    + IF(flow_efficiency_ratio >= target_flow_efficiency_ratio, 25, IF(flow_efficiency_ratio >= target_flow_efficiency_ratio * 0.8, 15, 5))
    + IF(blocked_events_weekly <= target_blocked_events_weekly, 25, IF(blocked_events_weekly <= target_blocked_events_weekly * 1.5, 15, 5))
  ) AS sla_score
FROM joined;
