# Busca insensível a acentos e cedilhas — Design

**Data:** 2026-06-14
**Objetivo:** Toda pesquisa do FisioFlow deve funcionar com ou sem acentos/cedilhas, nos
dois sentidos. Ex.: `joao` encontra `João` e `João` encontra `joao`; `maca` encontra
`Maçã` e vice-versa.

## Contexto / estado atual

A infraestrutura já existe; está aplicada de forma inconsistente.

- **Banco (Neon Postgres 17):** extensão `unaccent` instalada em produção. Verificado que
  trata cedilha (`unaccent('maçã')` = `maca`) e funciona nos dois sentidos via
  `unaccent(col) ILIKE unaccent($pattern)`. `pg_trgm` também instalada (não usada aqui).
- **Backend:** helper `searchFilter(col, search)` e `unaccent(col)` já existem em
  `apps/api/src/lib/db-utils.ts`, mas **só `wiki.ts` os usa**. As demais rotas usam `ILIKE`
  puro, que é sensível a acento.
- **Frontend:** helpers já existem — `normalizeText` (`src/lib/utils/string.ts`) e
  `accentIncludes` / `normalizeForSearch` (`src/lib/utils/bilingualSearch.ts`) — mas muitos
  filtros client-side usam `.toLowerCase().includes()` cru.

Não há migrations nem mudanças de schema. É uma varredura de consistência.

## Abordagem

### Backend (SQL)

- **Rotas Drizzle** — trocar `ilike(col, \`%${q}%\`)`por`searchFilter(col, q)`:
  - `apps/api/src/routes/protocols.ts`
  - `apps/api/src/routes/templates.ts`
  - `apps/api/src/routes/sessions.ts` (templates de sessão)
  - `apps/api/src/routes/wiki.ts` (linhas 227/351 que ainda usam `ilike` puro)
  - `apps/api/src/services/ai/ResourceSearchService.ts`
- **Rotas com SQL cru** — trocar `col ILIKE $n` por `unaccent(col) ILIKE unaccent($n)`;
  o padrão `%…%` permanece no parâmetro:
  - `apps/api/src/routes/patients.ts`
  - `apps/api/src/routes/contacts.ts`
  - `apps/api/src/routes/doctors.ts`
  - `apps/api/src/routes/activityLab.ts`
  - `apps/api/src/routes/whatsapp-inbox.ts`
  - `apps/api/src/lib/whatsapp-conversations.ts`
  - `apps/api/src/routes/search.ts` (busca global)

Sem índices nesta etapa — todas as tabelas são pequenas (patients ~196, appointments ~637,
exercises ~248); seq scan é irrelevante. Se algum dia precisar, há `pg_trgm` para um índice
funcional `gin (unaccent(col) gin_trgm_ops)`. **YAGNI por enquanto.**

### Frontend (filtros client-side)

Padronizar em `accentIncludes(value, query)` de `src/lib/utils/bilingualSearch.ts`,
substituindo `.toLowerCase().includes()` **apenas em filtros de busca voltados ao usuário**:

- `src/components/ui/CommandPalette.tsx`
- `src/hooks/useScheduleOptimized.ts`
- `src/hooks/useSchedulePage.ts`
- `src/hooks/useFilteredAppointments.ts`
- `src/hooks/useMedicalAutocomplete.tsx`
- `src/hooks/useLeaderboard.ts`
- `src/hooks/performance/useOptimizedList.ts`

`.includes()` que **não** é busca (detecção de região em `ResourceSearchService`, etc.)
fica intocado.

## Componentes / interfaces

- `searchFilter(col, search)` — único ponto de busca acento-insensível no backend Drizzle.
- Padrão `unaccent(col) ILIKE unaccent($n)` — para rotas com SQL cru.
- `accentIncludes(value, query)` — único ponto no frontend.

Nenhuma abstração nova é criada; apenas uso consistente das existentes.

## Tratamento de erros

Sem novo caminho de erro. Strings vazias / `null` já são tratadas pelos helpers
(`accentIncludes` normaliza ambos os lados; `searchFilter` usa parâmetros). Colunas
nullable em SQL cru já vêm com `COALESCE(...)` onde necessário (ver `patients.ts`).

## Testes / verificação

1. **Spot-checks SQL contra produção** (read-only):
   - busca `conceicao` encontra `Conceição`; busca `maca` encontra `Maçã`; sentido inverso.
2. **Vitest frontend** — casos para `accentIncludes` cobrindo `joao↔João`, `maca↔maçã`,
   case-insensitive, query vazia.
3. **Smoke manual** — caixa de busca de pacientes e command palette global.

## Fora de escopo

- Migrations / índices.
- Mudança de collation do banco.
- Busca semântica/embeddings (já existe, não é afetada).
