# Busca insensível a acentos/cedilhas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Toda pesquisa do FisioFlow funciona com ou sem acentos/cedilhas nos dois sentidos (`joao`↔`João`, `maca`↔`Maçã`).

**Architecture:** Reutilizar helpers já existentes. Backend Drizzle usa `searchFilter()` (`unaccent(col) ILIKE unaccent($pat)`); rotas com SQL cru recebem `unaccent(...)` inline. Frontend padroniza em `accentIncludes()`. Sem migrations, sem schema, sem índices.

**Tech Stack:** Cloudflare Workers (Hono) + Drizzle ORM + Neon Postgres 17 (extensão `unaccent` já instalada); React 19 + Vitest.

**Pré-condição verificada:** extensão `unaccent` instalada em produção; trata cedilha e funciona nos dois sentidos. `CommandPalette.tsx` já usa `normalizeText` (accent-strip) — não precisa de mudança.

---

### Task 1: Rotas Drizzle — trocar `ilike` por `searchFilter`

**Files:**
- Modify: `apps/api/src/routes/protocols.ts`
- Modify: `apps/api/src/routes/templates.ts`
- Modify: `apps/api/src/routes/sessions.ts`
- Modify: `apps/api/src/routes/wiki.ts`
- Modify: `apps/api/src/services/ai/ResourceSearchService.ts`

- [ ] **Step 1: `protocols.ts` — importar helper e trocar a busca**

Em `apps/api/src/routes/protocols.ts`, adicionar import logo após o import de drizzle-orm (linha ~11):

```typescript
import { searchFilter } from "../lib/db-utils";
```

Trocar (linha ~72):

```typescript
  if (q) conditions.push(ilike(exerciseProtocols.name, `%${q}%`));
```

por:

```typescript
  if (q) conditions.push(searchFilter(exerciseProtocols.name, q));
```

- [ ] **Step 2: `templates.ts` — importar helper e trocar as buscas**

Em `apps/api/src/routes/templates.ts`, adicionar após o import drizzle-orm (linha ~7):

```typescript
import { searchFilter } from "../lib/db-utils";
```

Trocar (linhas ~123-124):

```typescript
  if (q) conditions.push(ilike(exerciseTemplates.name, `%${q}%`));
  if (category) conditions.push(ilike(exerciseTemplates.category, `%${category}%`));
```

por:

```typescript
  if (q) conditions.push(searchFilter(exerciseTemplates.name, q));
  if (category) conditions.push(searchFilter(exerciseTemplates.category, category));
```

- [ ] **Step 3: `sessions.ts` — importar helper e trocar a busca**

Em `apps/api/src/routes/sessions.ts`, adicionar após o import drizzle-orm (linha ~6):

```typescript
import { searchFilter } from "../lib/db-utils";
```

Trocar (linhas ~702-705):

```typescript
    conditions.push(
      or(
        ilike(sessionTemplates.name, `%${search}%`),
        ilike(sessionTemplates.description, `%${search}%`),
      ),
    );
```

por:

```typescript
    conditions.push(
      or(
        searchFilter(sessionTemplates.name, search),
        searchFilter(sessionTemplates.description, search),
      ),
    );
```

- [ ] **Step 4: `wiki.ts` — trocar os dois `ilike` de título remanescentes**

`searchFilter` já está importado em `wiki.ts` (linha 14). Trocar as DUAS ocorrências (linhas ~227 e ~351):

```typescript
  if (q) conditions.push(ilike(wikiPages.title, `%${q}%`));
```

por:

```typescript
  if (q) conditions.push(searchFilter(wikiPages.title, q));
```

- [ ] **Step 5: `ResourceSearchService.ts` — importar helper e trocar buscas**

Em `apps/api/src/services/ai/ResourceSearchService.ts`, trocar o import da linha 1:

```typescript
import { or, ilike } from "drizzle-orm";
```

por:

```typescript
import { or } from "drizzle-orm";
import { searchFilter } from "../../lib/db-utils";
```

Trocar (linha ~104):

```typescript
                    .where(or(ilike(exercises.name, `%${query}%`), ilike(exercises.description, `%${query}%`)))
```

por:

```typescript
                    .where(or(searchFilter(exercises.name, query), searchFilter(exercises.description, query)))
```

Trocar (linha ~125):

```typescript
                    .where(or(ilike(clinicalTestTemplates.name, `%${query}%`), ilike(clinicalTestTemplates.targetJoint, `%${query}%`)))
```

por:

```typescript
                    .where(or(searchFilter(clinicalTestTemplates.name, query), searchFilter(clinicalTestTemplates.targetJoint, query)))
```

- [ ] **Step 6: Limpar imports `ilike` não usados**

Em cada arquivo da Task 1, se `ilike` não for mais usado em nenhum outro lugar do arquivo, removê-lo do import de `drizzle-orm`. Verificar com:

Run: `cd apps/api && grep -n "ilike" src/routes/protocols.ts src/routes/templates.ts src/routes/sessions.ts src/routes/wiki.ts src/services/ai/ResourceSearchService.ts`
Expected: nenhuma linha de uso (`ilike(...)`) restante; remover dos imports os que sobrarem só no import.

- [ ] **Step 7: Typecheck**

Run: `cd apps/api && pnpm exec tsc --noEmit`
Expected: PASS (0 erros).

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/routes/protocols.ts apps/api/src/routes/templates.ts apps/api/src/routes/sessions.ts apps/api/src/routes/wiki.ts apps/api/src/services/ai/ResourceSearchService.ts
git commit -m "feat(search): rotas Drizzle usam searchFilter (busca sem acento)"
```

---

### Task 2: Rotas com SQL cru — envolver colunas/params em `unaccent()`

**Files:**
- Modify: `apps/api/src/routes/patients.ts`
- Modify: `apps/api/src/routes/contacts.ts`
- Modify: `apps/api/src/routes/doctors.ts`
- Modify: `apps/api/src/routes/activityLab.ts`
- Modify: `apps/api/src/routes/whatsapp-inbox.ts`
- Modify: `apps/api/src/lib/whatsapp-conversations.ts`
- Modify: `apps/api/src/routes/search.ts`

**Padrão geral:** `col ILIKE $n` → `unaccent(col) ILIKE unaccent($n)`. O parâmetro `%…%` permanece inalterado. Não muda a numeração de parâmetros.

- [ ] **Step 1: `patients.ts` (linhas ~779-789)**

Trocar o bloco da condição de busca por (cada coluna envolvida em `unaccent(...)`, e o parâmetro também):

```typescript
        `(
					unaccent(directory."fullName") ILIKE unaccent($${paramIndex})
					OR unaccent(COALESCE(directory.nickname, '')) ILIKE unaccent($${paramIndex})
					OR unaccent(COALESCE(directory."socialName", '')) ILIKE unaccent($${paramIndex})
					OR unaccent(COALESCE(directory.email, '')) ILIKE unaccent($${paramIndex})
					OR unaccent(COALESCE(directory.cpf, '')) ILIKE unaccent($${paramIndex})
					OR unaccent(COALESCE(directory.phone, '')) ILIKE unaccent($${paramIndex})
					OR unaccent(COALESCE(directory."mainCondition", '')) ILIKE unaccent($${paramIndex})
					OR unaccent(ARRAY_TO_STRING(directory."pathologyNames", ', ')) ILIKE unaccent($${paramIndex})
					OR unaccent(COALESCE(directory.origin, '')) ILIKE unaccent($${paramIndex})
					OR unaccent(COALESCE(directory."partnerCompanyName", '')) ILIKE unaccent($${paramIndex})
					OR unaccent(COALESCE(directory."professionalName", '')) ILIKE unaccent($${paramIndex})
				)`,
```

- [ ] **Step 2: `contacts.ts` (linha ~52)**

Trocar:

```typescript
      `(nome ILIKE $${params.length} OR email ILIKE $${params.length} OR telefone ILIKE $${params.length})`,
```

por:

```typescript
      `(unaccent(nome) ILIKE unaccent($${params.length}) OR unaccent(email) ILIKE unaccent($${params.length}) OR unaccent(telefone) ILIKE unaccent($${params.length}))`,
```

- [ ] **Step 3: `doctors.ts` (linha ~22)**

Trocar:

```typescript
      where += ` AND (name ILIKE $${params.length} OR specialty ILIKE $${params.length} OR crm ILIKE $${params.length})`;
```

por:

```typescript
      where += ` AND (unaccent(name) ILIKE unaccent($${params.length}) OR unaccent(specialty) ILIKE unaccent($${params.length}) OR unaccent(crm) ILIKE unaccent($${params.length}))`;
```

- [ ] **Step 4: `activityLab.ts` (linha ~111)**

Trocar:

```typescript
    where += ` AND (p.full_name ILIKE $${params.length} OR p.cpf ILIKE $${params.length} OR p.email ILIKE $${params.length})`;
```

por:

```typescript
    where += ` AND (unaccent(p.full_name) ILIKE unaccent($${params.length}) OR unaccent(p.cpf) ILIKE unaccent($${params.length}) OR unaccent(p.email) ILIKE unaccent($${params.length}))`;
```

- [ ] **Step 5: `whatsapp-inbox.ts` (linhas ~1313-1317)**

Trocar:

```typescript
					wc.display_name ILIKE $2 OR
					wc.wa_id ILIKE $2 OR
					wc.username ILIKE $2 OR
					p.full_name ILIKE $2 OR
					p.phone ILIKE $2
```

por:

```typescript
					unaccent(wc.display_name) ILIKE unaccent($2) OR
					unaccent(wc.wa_id) ILIKE unaccent($2) OR
					unaccent(wc.username) ILIKE unaccent($2) OR
					unaccent(p.full_name) ILIKE unaccent($2) OR
					unaccent(p.phone) ILIKE unaccent($2)
```

- [ ] **Step 6: `whatsapp-conversations.ts` (linha ~707)**

Trocar:

```typescript
        `EXISTS (SELECT 1 FROM whatsapp_contacts wc WHERE wc.id = c.contact_id AND (wc.display_name ILIKE $${idx} OR wc.wa_id ILIKE $${idx} OR wc.username ILIKE $${idx}))`,
```

por:

```typescript
        `EXISTS (SELECT 1 FROM whatsapp_contacts wc WHERE wc.id = c.contact_id AND (unaccent(wc.display_name) ILIKE unaccent($${idx}) OR unaccent(wc.wa_id) ILIKE unaccent($${idx}) OR unaccent(wc.username) ILIKE unaccent($${idx})))`,
```

- [ ] **Step 7: `search.ts` (linhas ~118 e ~135)**

Trocar (exercises):

```typescript
           ${!isSemantic ? "AND (name ILIKE $2 OR description ILIKE $2)" : ""}
```

por:

```typescript
           ${!isSemantic ? "AND (unaccent(name) ILIKE unaccent($2) OR unaccent(description) ILIKE unaccent($2))" : ""}
```

Trocar (wiki):

```typescript
           ${!isSemantic ? "AND (title ILIKE $2 OR content ILIKE $2)" : ""}
```

por:

```typescript
           ${!isSemantic ? "AND (unaccent(title) ILIKE unaccent($2) OR unaccent(content) ILIKE unaccent($2))" : ""}
```

- [ ] **Step 8: Typecheck**

Run: `cd apps/api && pnpm exec tsc --noEmit`
Expected: PASS (0 erros).

- [ ] **Step 9: Spot-check SQL contra produção (read-only)**

Via Neon MCP (projectId `purple-union-72678311`), rodar uma query que prove o padrão (não depende de dados específicos):

```sql
SELECT
  (unaccent('Conceição') ILIKE unaccent('%conceicao%')) AS sem_para_com,
  (unaccent('conceicao') ILIKE unaccent('%Conceição%')) AS com_para_sem,
  (unaccent('Maçã') ILIKE unaccent('%maca%')) AS cedilha;
```
Expected: `sem_para_com=true, com_para_sem=true, cedilha=true`.

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/routes/patients.ts apps/api/src/routes/contacts.ts apps/api/src/routes/doctors.ts apps/api/src/routes/activityLab.ts apps/api/src/routes/whatsapp-inbox.ts apps/api/src/lib/whatsapp-conversations.ts apps/api/src/routes/search.ts
git commit -m "feat(search): SQL cru usa unaccent() (busca sem acento/cedilha)"
```

---

### Task 3: Filtros client-side — padronizar em `accentIncludes`

**Files:**
- Modify: `src/hooks/useScheduleOptimized.ts`
- Modify: `src/hooks/useSchedulePage.ts`
- Modify: `src/hooks/useFilteredAppointments.ts`
- Modify: `src/hooks/useMedicalAutocomplete.tsx`
- Modify: `src/hooks/useLeaderboard.ts`
- Modify: `src/hooks/performance/useOptimizedList.ts`
- Test: `src/hooks/__tests__/accentSearchFilters.test.ts` (Create)

Helper a usar (já existe): `import { accentIncludes } from "@/lib/utils/bilingualSearch";`

- [ ] **Step 1: Escrever o teste de regressão (falhando)**

Create `src/hooks/__tests__/accentSearchFilters.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { accentIncludes } from "@/lib/utils/bilingualSearch";

describe("accentIncludes — busca insensível a acento/cedilha", () => {
  it("encontra com query sem acento", () => {
    expect(accentIncludes("João", "joao")).toBe(true);
  });
  it("encontra com query acentuada sobre valor sem acento", () => {
    expect(accentIncludes("joao", "João")).toBe(true);
  });
  it("trata cedilha nos dois sentidos", () => {
    expect(accentIncludes("Maçã", "maca")).toBe(true);
    expect(accentIncludes("maca", "Maçã")).toBe(true);
  });
  it("é case-insensitive", () => {
    expect(accentIncludes("FISIOTERAPIA", "fisio")).toBe(true);
  });
  it("não casa quando não contém", () => {
    expect(accentIncludes("João", "pedro")).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar o teste para confirmar que passa (guard do helper)**

Run: `pnpm exec vitest run src/hooks/__tests__/accentSearchFilters.test.ts`
Expected: PASS (o helper já existe; este teste fixa o comportamento esperado antes de ligar os filtros nele).

- [ ] **Step 3: `useScheduleOptimized.ts` (linhas ~249-251)**

Adicionar import no topo (junto aos demais imports):

```typescript
import { accentIncludes } from "@/lib/utils/bilingualSearch";
```

Trocar:

```typescript
    if (filters?.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      appointments = appointments.filter(
        (a) =>
          a.patient_name?.toLowerCase().includes(query) || a.notes?.toLowerCase().includes(query),
      );
    }
```

por:

```typescript
    if (filters?.searchQuery) {
      const query = filters.searchQuery;
      appointments = appointments.filter(
        (a) =>
          accentIncludes(a.patient_name ?? "", query) || accentIncludes(a.notes ?? "", query),
      );
    }
```

- [ ] **Step 4: `useSchedulePage.ts` (linhas ~115-117)**

Adicionar import:

```typescript
import { accentIncludes } from "@/lib/utils/bilingualSearch";
```

Trocar:

```typescript
  if (filters.patient?.trim()) {
    const patientQuery = filters.patient.trim().toLowerCase();
    if (!appointment.patientName.toLowerCase().includes(patientQuery)) {
      return false;
    }
  }
```

por:

```typescript
  if (filters.patient?.trim()) {
    if (!accentIncludes(appointment.patientName ?? "", filters.patient.trim())) {
      return false;
    }
  }
```

- [ ] **Step 5: `useFilteredAppointments.ts` (linhas ~58-63)**

Adicionar import:

```typescript
import { accentIncludes } from "@/lib/utils/bilingualSearch";
```

Trocar:

```typescript
    if (filters.patientName && filters.patientName.trim().length > 0) {
      const searchTerm = filters.patientName.toLowerCase().trim();
      const patientName = (apt.patientName || "").toLowerCase();
      if (!patientName.includes(searchTerm)) {
        return false;
      }
    }
```

por:

```typescript
    if (filters.patientName && filters.patientName.trim().length > 0) {
      if (!accentIncludes(apt.patientName || "", filters.patientName.trim())) {
        return false;
      }
    }
```

- [ ] **Step 6: `useMedicalAutocomplete.tsx` (linhas ~241-246)**

Adicionar import:

```typescript
import { accentIncludes } from "@/lib/utils/bilingualSearch";
```

Trocar:

```typescript
    if (query) {
      const lowerQuery = query.toLowerCase();
      suggestions = suggestions.filter(
        (s) =>
          s.label.toLowerCase().includes(lowerQuery) || s.value.toLowerCase().includes(lowerQuery),
      );
    }
```

por:

```typescript
    if (query) {
      suggestions = suggestions.filter(
        (s) => accentIncludes(s.label, query) || accentIncludes(s.value, query),
      );
    }
```

- [ ] **Step 7: `useLeaderboard.ts` (linhas ~88-92)**

Adicionar import:

```typescript
import { accentIncludes } from "@/lib/utils/bilingualSearch";
```

Trocar:

```typescript
      if (filters.search.trim()) {
        const searchLower = filters.search.trim().toLowerCase();
        leaderboard = leaderboard.filter((entry) =>
          entry.patient_name.toLowerCase().includes(searchLower),
        );
      }
```

por:

```typescript
      if (filters.search.trim()) {
        leaderboard = leaderboard.filter((entry) =>
          accentIncludes(entry.patient_name, filters.search.trim()),
        );
      }
```

- [ ] **Step 8: `useOptimizedList.ts` (linhas ~67-76)**

Adicionar import:

```typescript
import { accentIncludes } from "@/lib/utils/bilingualSearch";
```

Trocar:

```typescript
      if (searchFields.length > 0) {
        return searchFields.some((field) => {
          const value = item[field];
          if (typeof value === "string") {
            return value.toLowerCase().includes(lowerSearch);
          }
          if (typeof value === "number") {
            return value.toString().includes(lowerSearch);
          }
          return false;
        });
      }
```

por:

```typescript
      if (searchFields.length > 0) {
        return searchFields.some((field) => {
          const value = item[field];
          if (typeof value === "string") {
            return accentIncludes(value, debouncedSearch);
          }
          if (typeof value === "number") {
            return value.toString().includes(lowerSearch);
          }
          return false;
        });
      }
```

Nota: também atualizar o "Fallback: search in all string values" logo abaixo (mesmo padrão) — trocar `value.toLowerCase().includes(lowerSearch)` por `accentIncludes(value, debouncedSearch)` no ramo de string. Manter `lowerSearch` para o ramo numérico.

- [ ] **Step 9: Typecheck do dashboard**

Run: `pnpm exec tsc --noEmit -p tsconfig.json`
Expected: PASS (0 erros).

- [ ] **Step 10: Rodar os testes do frontend afetados**

Run: `pnpm exec vitest run src/hooks/__tests__/accentSearchFilters.test.ts`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add src/hooks/useScheduleOptimized.ts src/hooks/useSchedulePage.ts src/hooks/useFilteredAppointments.ts src/hooks/useMedicalAutocomplete.tsx src/hooks/useLeaderboard.ts src/hooks/performance/useOptimizedList.ts src/hooks/__tests__/accentSearchFilters.test.ts
git commit -m "feat(search): filtros client-side usam accentIncludes (busca sem acento)"
```

---

### Task 4: Verificação final

- [ ] **Step 1: Build da API**

Run: `cd apps/api && pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 2: Rodar suíte de testes do frontend (sem regressões nos hooks tocados)**

Run: `pnpm exec vitest run src/hooks`
Expected: PASS (nenhuma regressão).

- [ ] **Step 3: Conferir que não sobrou `ILIKE`/`.toLowerCase().includes()` acento-sensível nos sites do escopo**

Run: `cd apps/api && grep -rn "ILIKE \$" src/routes src/lib src/services | grep -v unaccent`
Expected: vazio (todo ILIKE de busca agora passa por unaccent; ignore eventuais ILIKE de igualdade exata não-busca, se houver, documentando).

- [ ] **Step 4: Resumo final ao usuário** com a lista de arquivos alterados e os resultados dos spot-checks SQL.
```
