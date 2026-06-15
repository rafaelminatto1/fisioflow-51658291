---
description: "Tasks — S6.2 R2 SQL Archive"
---

# Tasks: R2 SQL Archive Pipeline (S6.2)

**⚠️ BLOQUEADO até parecer DPO escrito**

## Phase 0: LGPD Gate

- [ ] T001 [BLOCKING] DPO revisa proposta + aprova por escrito → `docs/lgpd/archiving-approval-2026.md`

## Phase 1: Setup

- [ ] T010 Verificar conta tem R2 Data Catalog habilitado: `npx wrangler r2 catalog list`
- [ ] T011 Criar namespace `fisioflow_archive` no R2 Data Catalog
- [ ] T012 Migration `0094_sessions_archived_at.sql`: ADD COLUMN `archived_at TIMESTAMPTZ`

## Phase 2: Workflow

- [ ] T020 [US1] Criar `apps/api/src/workflows/sessions-archive.ts` (Cloudflare Workflow durável)
  - Step 1: SELECT batch 1000 sessions com `created_at < NOW() - INTERVAL '90 days' AND archived_at IS NULL`
  - Step 2: Escrever Parquet em R2 via Data Catalog (`fisioflow_archive.sessions_archive`)
  - Step 3: Validação parity 0.1% amostral
  - Step 4: UPDATE Neon `archived_at = NOW()` por id
- [ ] T021 [US1] Registrar workflow em `wrangler.toml` (`[[workflows]] name = "sessions-archive"`)
- [ ] T022 [US1] Cron trigger mensal: `0 3 1 * *` em `[triggers]`

## Phase 3: Snapshot mínimo patients/appointments

- [ ] T030 [US1] Criar tabelas Iceberg `patients_archive` (id, name, created_at) e `appointments_archive`
- [ ] T031 [US1] Workflow opcional: snapshot semanal das duas dimensões

## Phase 4: Read API

- [ ] T040 [US1] Nova rota `GET /api/sessions/:id/archived` → R2 SQL query, retorna readonly
- [ ] T041 [US1] `PatientEvolution.tsx`: badge "Arquivada" + read-only mode quando session vem de R2

## Phase 5: Polish

- [ ] T050 PR `feat(archive): R2 SQL pipeline para sessions >90d`
- [ ] T051 `docs/lgpd/archiving.md` final com runbook RTBF
