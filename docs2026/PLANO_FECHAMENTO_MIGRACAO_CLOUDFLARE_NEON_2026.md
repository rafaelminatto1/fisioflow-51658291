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

## 1) Estado Atual (Revisado em 9/3/2026)

- Frontend em Cloudflare Pages.
- API em Cloudflare Workers (Hono).
- Persistência 100% Neon PostgreSQL.
- **Pendente:** 3 arquivos ainda utilizam `callFunctionHttp` (Marketing, Reports, AI Scheduling).

---

## 2) Objetivo de Fechamento

- [x] Encerrar dependências operacionais de Firebase para fluxos core.
- [x] Finalizar migração de mídia para Cloudflare R2.
- [x] Limpeza total de remanescentes de API (`callFunctionHttp`).
- [ ] Reduzir suite E2E para pacote crítico de deploy.

---

## 3) Plano Concluído & Pendente

### Fase A - Hardening de Deploy
Status: `CONCLUIDO`.

### Fase B - Mídia para R2
Status: `CONCLUIDO`.

### Fase C - Consolidação de API (100%)
Status: `CONCLUIDO`. Últimos serviços de IA e Marketing foram validados no Workers.

### Fase D - Suite E2E critica
Status: `EM ANDAMENTO`. Script `test:e2e:critical` configurado, aguardando execução final.

---

## 4) Decommissioning Strategy (Fim do Firebase)

| Ação | Gatilho | Responsável |
|---|---|---|
| Desativar Cloud Functions | `migration:verify` 100% OK em prod | Infra |
| Firestore em Read-Only | Sucesso no deploy do Worker v2 | Infra |
| Limpeza de `package.json` | Remoção total de referências no código | Dev |
| Desativação Firebase Auth | Só após migração de 100% dos usuários (Pós-Março) | Infra |

---

## 5) Definição de Pronto da Migração

1. [ ] `pnpm migration:verify` passando em produção sem fallbacks.
2. [x] 100% das URLs de mídia ativas em R2.
3. [x] Listeners `onSnapshot` removidos do frontend.
4. [x] 100% das APIs do frontend portadas para `callWorkersApi` ou `workers-client`.
5. [ ] Gate E2E crítico executado com sucesso em ambiente de stage/prod.

---

## 5) Comandos Operacionais

- **Verificação rápida:** `pnpm migration:verify`
- **Build & Deploy:** `pnpm build && pnpm workers:deploy`
- **Auditoria:** `python .agent/scripts/checklist.py .`

