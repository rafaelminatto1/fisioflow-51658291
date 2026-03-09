# Plano de Fechamento da Migração Cloudflare + Neon (2026)

> **Data de referência:** 9 de março de 2026
> **Status Atual:** ✅ MIGRACAO CONCLUIDA — APIs consolidadas e operando no Edge

---

## Atualização Final (9 de março de 2026)

- **Consolidação de APIs:** 100% das chamadas no `functions.ts` migradas para o `callWorkersApi` no Cloudflare.
- **Neon Auth & DB:** Integração plena. Tokens JWT gerenciados via `getNeonAccessToken` em todas as rotas.
- **Risco Zero de Cold Start:** Migração completa de Cloud Functions para Workers.

Status geral: `✅ PRODUÇÃO ESTABILIZADA`.

---

## 1) Estado Atual (Confirmado)

- Frontend em Cloudflare Pages.
- API em Cloudflare Workers (Hono).
- Persistência 100% Neon PostgreSQL.
- Nenhuma chamada legada para Firebase Functions ativa no frontend.

---

## 2) Objetivo de Fechamento

- [x] Encerrar dependências operacionais de Firebase para fluxos core.
- [x] Finalizar migração de mídia para Cloudflare R2.
- [x] Reduzir suite E2E para pacote crítico de deploy.

---

## 3) Plano Concluído

### Fase A - Hardening de Deploy
Status: `CONCLUIDO`. Checklist de saúde e scripts de verificação operacionais.

### Fase B - Mídia para R2
Status: `CONCLUIDO`.

### Fase C - Fluxos legados & Consolidação de API
Status: `CONCLUIDO`. Refatoração total do `functions.ts` concluída em 9/3/2026.

### Fase D - Suite E2E critica
Status: `CONCLUIDO`. Suite mínima validada.

---

## 4) Definição de Pronto da Migração (TODOS CHECKED)

1. [x] `pnpm migration:verify` passando em produção.
2. [x] 100% das URLs de mídia ativas em R2.
3. [x] Workflows Inngest críticos migrados para Neon.
4. [x] 100% das APIs do frontend portadas para `callWorkersApi` (Workers).
5. [x] Gate E2E crítico executado em toda release.

---

## 5) Comandos Operacionais

- **Verificação rápida:** `pnpm migration:verify`
- **Build & Deploy:** `pnpm build && pnpm workers:deploy`
- **Auditoria:** `python .agent/scripts/checklist.py .`

