# Feature Specification: R2 SQL Archive Pipeline (S6.2)

**Feature Branch**: `feat/sessions-r2-archive-pipeline`
**Created**: 2026-05-18
**Status**: Aprovado para implementação (S6.2) — parecer DPO em [dpo-approval.md](./dpo-approval.md), assinado 2026-05-19 por Rafael Minatto (DPO designado)

## Contexto

R2 SQL JOINs/CTEs (GA 2026-05-14) permite arquivar dados frios em Iceberg/Parquet e consultar com SQL completo via R2 sem ETL. Neon cresce $0.x/GB-mês — mover sessions antigas reduz custo e mantém auditoria.

## User Scenarios

### US1 — Arquivamento mensal de sessions > 90d (P1)

**Persona**: DPO / Tech Lead.

**Why**: LGPD prevê retenção mínima de prontuário (CFM exige 20 anos), mas dados podem ficar fora do banco "quente". Arquivar reduz custo Neon sem violar retenção.

**Acceptance**:
1. Cron Worker mensal copia `sessions.created_at < now() - interval '90 days'` para R2 Iceberg
2. Origem mantida intocada (write-once, read-many) até auditoria validar parity
3. Query analítica `SELECT s.observacao, p.name FROM fisioflow_archive.sessions_archive s JOIN patients_archive p ON s.patient_id = p.id WHERE s.created_at BETWEEN ... LIMIT 100` funciona via R2 SQL
4. Documentação LGPD atualizada: arquivo = "dado em retenção fria"

### US2 — Purge de Neon após 1 ano de arquivamento validado (P3, futuro)

**Persona**: Tech Lead reduzindo custo.

**Acceptance**: Após 12 meses de arquivamento sem incidente, script `purge-archived-sessions.mjs` deleta de Neon o que está em R2.

### Edge Cases
- Session arquivada precisa ser editada pelo fisio: retornar 410 Gone + instrução para criar nova sessão referente
- R2 SQL retorna stale: idempotência via `last_archived_at`

## Requirements

- **FR-001**: Namespace R2 Data Catalog `fisioflow_archive` com tabelas Iceberg `sessions_archive`, `patients_archive` (snapshot mínimo: nome, id), `appointments_archive`
- **FR-002**: Cron Worker `workflows/sessions-archive.ts` rodando todo dia 1 do mês 03:00 UTC
- **FR-003**: Worker query Neon por org com batch 1000, escreve Parquet via R2 Data Catalog API
- **FR-004**: Idempotência: tabela `sessions.archived_at` (timestamp) — não re-arquivar
- **FR-005**: Validação parity: amostragem aleatória 0.1% compara linha Neon vs R2 antes de marcar `archived_at`
- **FR-006**: Documentação `docs/lgpd/archiving.md` com parecer DPO + RTBF (right-to-be-forgotten) workflow

## Success Criteria

- **SC-001**: Pipeline arquiva 10K linhas em < 10min
- **SC-002**: Custo R2 storage + SQL < US$ 5/mês
- **SC-003**: Query analítica em R2 SQL retorna em < 5s para 100K linhas
- **SC-004**: 0 incidente LGPD reportado em 90 dias após go-live

## Assumptions

- DPO assina parecer escrito ANTES de cron rodar em prod
- R2 Data Catalog está habilitado na conta
- Schema `sessions` é estável (sem migrations destrutivas nos próximos 6 meses)

## Out of Scope (desta spec)

- Delete de Neon (US2 fica para 2027)
- Arquivamento de outras tabelas (appointments, exercises)
- Encryption-at-rest custom (R2 default cobre)
