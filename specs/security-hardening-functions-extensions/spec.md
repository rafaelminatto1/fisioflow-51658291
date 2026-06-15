# Feature Specification: Security Hardening — Functions & Extensions

**Feature Branch**: `feat/security-hardening-functions-extensions`
**Created**: 2026-05-18
**Status**: 🟢 **TODO futuro** — gerada como follow-up dos Data API Advisors findings após `0091_rls_remaining_tables.sql` (PR #84)
**Predecessor**: [`specs/platform-modernization-may-2026/`](../platform-modernization-may-2026/)

## Contexto

Após RLS aplicada em 267/267 tabelas (PR #84), Neon Data API Advisors flagga **125 Security findings remanescentes** — nenhum é exposição direta de PHI, mas são hardening recomendado:

- **116 findings**: `Function Search Path Mutable` (393 stored functions sem `SET search_path = ''`)
- **9 findings**: `Extension in Public` (`vector`, `pgcrypto`, `pg_trgm`, `btree_gist`, `pg_stat_statements`, `unaccent`, `online_advisor`, `pg_prewarm`, `pg_session_jwt`)

## User Scenarios

### US1 — Eliminar search_path hijack em stored functions (P2)

**Threat model**: usuário com privilégio para criar function em qualquer schema visível poderia criar `public.now()` que sequestre chamadas. Improvável em prod (apenas `neondb_owner`), mas recomendação Postgres oficial.

**Acceptance**:

- 0 findings de `Function Search Path Mutable` no Advisors
- Todas as 393 funções têm `ALTER FUNCTION ... SET search_path = pg_catalog, public` (ou `= ''` quando seguro)
- Testes Vitest do Worker passam sem mudança

### US2 — Mover extensions para schema dedicado (P3, possivelmente skip)

**Threat model**: extension em `public` significa que objetos da extension (operators, types) estão no search_path padrão. Recomendação Neon, **mas risco alto de aplicar** porque índices em produção dependem dos operators das extensions:

- `vector` → todos os índices `ivfflat`/`hnsw` precisam ser recriados
- `pg_trgm` → índices GIN com `gin_trgm_ops`
- `btree_gist` → índices GIST compostos

**Acceptance**: Avaliar custo/benefício antes de implementar. Pode ser deixado como `wontfix` documentado.

## Requirements

- **FR-001**: Migration `0092_function_search_path.sql` que faz `ALTER FUNCTION` em todas as 393 functions em `public.*`
- **FR-002**: Migration deve ser idempotente (re-aplicável sem erro)
- **FR-003**: Funções com lógica que dependa de schema implícito (ex: chamar `now()` sem qualificar) devem ser auditadas antes
- **FR-004 [P3]**: Avaliação documentada sobre mover extensions (provavelmente `wontfix`)

## Success Criteria

- **SC-001**: Advisors Security findings ≤ 9 (apenas extensions, se US2 não for executada)
- **SC-002**: 0 regressão em testes ou queries de produção
- **SC-003**: Custo de implementação documentado (estimar tempo para US2 antes de decidir)

## Out of Scope

- Performance findings (1177) — outro spec
- Moving extensions to dedicated schema (US2) — só se análise custo/benefício validar

## Estimated effort

- US1: ~30min (migration auto-gerada via query SQL → ALTER FUNCTION em massa)
- US2: ~4h + alto risco de regressão (não recomendado sem janela de manutenção)

## Generator script (rascunho)

```sql
-- Gerar ALTER FUNCTION statements automaticamente
SELECT 'ALTER FUNCTION public.' || p.proname || '(' ||
       pg_get_function_identity_arguments(p.oid) ||
       ') SET search_path = pg_catalog, public;'
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND (p.proconfig IS NULL OR NOT (p.proconfig::text ~ 'search_path'));
```
