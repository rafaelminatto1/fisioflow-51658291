# Wiki Triage SLA Dashboard (BigQuery + Looker Studio)

## Objetivo
Criar um dashboard operacional com SLA por template/time usando `wiki_triage_events`.

## Pré-requisitos
1. Tabela de eventos disponível em:
   - `fisioflow-migration.fisioflow_analytics.wiki_triage_events_raw`
2. (Opcional recomendado) Pipeline/Extensão para preencher essa tabela a partir do Firestore `wiki_triage_events`.
3. Permissão BigQuery Data Editor no projeto.

## 1) Criar view analítica
Execute:

```bash
bq query --use_legacy_sql=false < scripts/bigquery/wiki_triage_sla_dashboard.sql
```

Isso cria/atualiza a view:
- `fisioflow-migration.fisioflow_analytics.wiki_triage_sla_daily`
E cria a tabela base `wiki_triage_events_raw` se ainda não existir.

## 1.1) Criar camada de metas por template (real x meta)
Execute:

```bash
bq query --use_legacy_sql=false < scripts/bigquery/wiki_triage_sla_with_targets.sql
```

Isso cria:
- Tabela de metas: `fisioflow_analytics.wiki_triage_template_targets`
- View comparativa: `fisioflow_analytics.wiki_triage_sla_with_targets`

Observação:
- Use `organization_id='*'` para metas globais.
- Para meta específica de uma organização, insira uma linha com `organization_id` real + `template_id`.

## 2) Métricas recomendadas no Looker Studio
Fonte: `fisioflow_analytics.wiki_triage_sla_with_targets`

Dimensões:
- `event_date`
- `organization_id`
- `template_id`
- `week_start`

Métricas:
- `total_events`
- `moved_to_done`
- `throughput_weekly`
- `done_conversion_rate`
- `flow_efficiency_ratio`
- `target_throughput_weekly`
- `target_done_conversion_rate`
- `target_flow_efficiency_ratio`
- `automation_blocked_events`
- `blocked_events_weekly`
- `target_blocked_events_weekly`
- `sla_score`
- `sla_throughput_status`
- `sla_conversion_status`
- `sla_flow_status`
- `sla_blocked_status`
- `unique_cards_touched`
- `unique_actors`

Filtros:
- período (`event_date`)
- template (`template_id`)
- organização (`organization_id`)

## 3) Layout sugerido
1. Scorecards: `throughput_weekly`, `done_conversion_rate`, `flow_efficiency_ratio`.
2. Série temporal: `moved_to_done` por `event_date`.
3. Barras empilhadas: `drag_moves`, `quick_action_moves`, `automation_checklist_moves` por `template_id`.
4. Tabela de risco: `template_id`, `automation_blocked_events`, `done_conversion_rate`.

## 4) SLA operacional sugerido
- SLA Lead Flow: `flow_efficiency_ratio >= 0.8`
- SLA Blockers: `automation_blocked_events <= 3` por semana/template
- SLA Throughput: mínimo semanal por template definido pelo time

## Observações
- Se a tabela `fisioflow_analytics.wiki_triage_events_raw` estiver vazia, o dashboard abrirá sem dados até o pipeline de ingestão ser habilitado.
- O dashboard já fica compatível com eventos de origem manual (`drag`, `quick-action`) e automações (`automation-checklist`, `automation-blocked`).
