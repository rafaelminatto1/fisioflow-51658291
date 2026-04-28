OBSERVABILIDADE - FISIOFLOW

Objetivo
- Definir a estratégia de logs, métricas, tracing e health checks para visibilidade entre API/Workers, Web e Apps móveis.

Logs
- Estrutura de log: JSON com campos obrigatórios: timestamp, level, service, tenant_id, user_id (quando disponível), request_id, operation, status_code, duration_ms, message.
- Destino: stdout/arquivo local em dev; sink central (log streaming) em staging/prod (quando disponível).
- Nível de log: DEBUG apenas em development; INFO/WARN/ERROR em staging/prod.

Metrics
- Principais metrics: latency_api_p95, latency_api_p99, error_rate_5xx, requests_per_second (RPS).
- Dashboards: API latency por endpoint, latência de DB, throughput por tenant.

Tracing
- Suporte a tracing básico com correlação por request_id; propagação de trace_id/parent_id quando suportado pela stack (OpenTelemetry opcional).
- Mapear spans para fluxos críticos (auth, agendamento, prontuários, prescrição).

Health e SLOs
- Endpoints de liveness e readiness via /healthz; monitorar tempos de resposta e dependências externas.
- SLOs iniciais: latência de API p95 < 300ms em produção para fluxos críticos; disponibilidade > 99.9%.

Operações e Gateways
- Painéis de observabilidade (Grafana/Prometheus ou equivalente) para API, DB e fila de tasks.
- Revisão de logs sensíveis e retenção de logs.

Roadmap de melhorias
- Ativar tracing completo para as rotas mais sensíveis.
- Harmonizar labels e metadados nos logs para facilitar filtragem.
- Implementar alertas básicos (alta latência, erro 5xx, queda de disponibilidade).

Responsáveis
- Time de Observabilidade / SRE; canal de incidentes definido.
