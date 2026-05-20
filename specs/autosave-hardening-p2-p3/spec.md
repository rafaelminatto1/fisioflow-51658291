# Feature Specification: Autosave Hardening P2 + P3

**Feature Branch**: `feat/autosave-hardening-p2-p3` (a criar)
**Created**: 2026-05-20
**Status**: Backlog — P1 entregue em `feat/s9-roadmap` commit `9a9d487ae` (mutation scope, beforeunload, offline detection).

## Contexto

O autosave da evolução do paciente (`PatientEvolution.tsx` + `useAutoSave.ts` + `useEvolutionDraft.ts` + `offlineSync`) já entrega o caminho feliz e o caso offline básico. Restam armadilhas conhecidas em redes ruins, multi-tab e refresh durante mutation in-flight. Este spec consolida os próximos passos pesquisados em 2026-05-20 (referências: pz.com.au race-condition guide, 7tech optimistic UI, preetsuthar.me offline patterns, TanStack v5 docs).

P1 já entregue (commit `9a9d487ae`):
- TanStack v5 `scope.id = autosave-evolution-<appointmentId>` serializa mutations da mesma evolução
- `beforeunload` guard quando há `isDirty || isSaving`
- `useAutoSave` distingue offline (`navigator.onLine === false || TypeError de fetch`) de erro real
- `isDirty`/`isSaving` expostos para consumo de UI
- Sync `usePatientEvolutionState` agora popula TODOS os campos V2 (`evolutionText`, `painLevel`, `unifiedItems`, `homeCareExercises`)
- Guard em `writeDraft` evita renders iniciais vazios sobrescreverem draft local

## User Scenarios

### US1 — Duplicação por retry da fila offline (P2, crítico)

**Persona**: Fisioterapeuta atendendo em local com 4G fraco.

**Why**: A fila offline (`offlineSync.ts` + IndexedDB `FisioFlowOffline.offline_actions`) replay POSTs quando rede volta. Se o 1º POST foi recebido mas o ACK perdeu, o retry cria um 2º registro. Hoje o servidor deduplica por `appointment_id + status=draft` (somente para drafts), mas qualquer outro caminho de mutation (atualizações pontuais, sign-off) pode duplicar.

**Acceptance**:
1. Cliente gera `Idempotency-Key: <uuid-v4>` por chamada de autosave (não por debounce — por tentativa)
2. Worker (`apps/api/src/routes/sessions.ts:155`) consulta KV `FISIOFLOW_CONFIG` antes de executar; se a key existe (TTL 60s), retorna resposta cacheada (mesma response, status 200)
3. Após executar, Worker grava `{ key, response, expiresAt }` no KV
4. Fila offline persiste `Idempotency-Key` junto com o payload para sobreviver a refresh
5. Métrica `idempotency_dedupe_hit` em Analytics Engine

### US2 — Conflito multi-tab / multi-dispositivo (P2, médio)

**Persona**: Fisio editando evolução no desktop enquanto o estagiário olha no celular.

**Why**: Se ambos editam, o último save sobrescreve silenciosamente (sem aviso) — quem perdeu a edição não fica sabendo.

**Acceptance**:
1. Schema `sessions` tem coluna `version INT NOT NULL DEFAULT 1` (já existe — `sessions.version`)
2. Cliente envia `version` atual no payload de autosave
3. Worker compara: se `payload.version !== row.version` → 409 + body `{ error: 'conflict', current: <row>, currentVersion: <v> }`
4. Cliente recebe 409 → mostra modal "Esta evolução foi editada em outro dispositivo. [Recarregar dados] [Manter minha versão]"
5. "Recarregar dados" → invalidate query + drop local edits; "Manter minha versão" → re-send com `version: current.version` (force overwrite)
6. Worker route já tem essa lógica parcial (linhas 204-228) — apenas plumbing client

### US3 — State unificado (P2, refactor)

**Persona**: Desenvolvedor mantendo o código.

**Why**: Hoje há `evolutionData` (canonical, formato server) e `evolutionV2Data` (UI, formato editor) sincronizados manualmente via `useEffect`. Já causou 2 bugs (commit `785ad16e0` e o atual `9a9d487ae`). Mantenibilidade longo prazo exige fonte única.

**Acceptance**:
1. Deletar `evolutionV2Data` useState e o sync effect manual em `usePatientEvolutionState.ts`
2. `NotionEvolutionPanel` recebe `evolutionData` canonical + um adaptador `useMemo` que deriva a shape V2 (read-only)
3. Mutations (typing no editor, clique em Nível X) chamam handlers que **escrevem direto no canonical** com `setEvolutionData`
4. Campos duplicados (`evolutionText` ≡ `observations`) reduzidos a UM campo `observacao` (canonical)
5. Testes E2E (Playwright): digitar → voltar → reabrir; multi-tab edit; offline edit + reconnect
6. **Critério de aceite**: zero regressões nos 5 use-cases que validamos hoje em produção

### US4 — Optimistic UI com React 19.2 (P3, polish)

**Persona**: Fisio digitando com latência percebida.

**Why**: Hoje o editor já é instantâneo (state local), mas feedback de "salvo" tem delay de 5s (debounce). `useOptimistic` permite mostrar "Salvando..." imediatamente e converger com server.

**Acceptance**:
1. `useOptimistic` wraps `evolutionData`
2. Indicador no header: "Salvando..." (otimista) → "Salvo HH:MM" (server confirmou) → "Falhou — tentar de novo" (erro)
3. Em failure, mantém o valor otimista visível (não yanka do usuário); oferece botão "Tentar de novo"
4. Padrão "optimistic UI without lying" (preetsuthar.me) — distingue `confirmed | pending | failed` no tipo

### US5 — Persistência de mutations in-flight (P3, edge)

**Persona**: Fisio fecha aba durante autosave por engano.

**Why**: PersistQueryClient só persiste mutations `paused`. Mutations `pending` morrem com o refresh — fisio precisa redigitar.

**Acceptance**:
1. Customizar `dehydrateMutation` para incluir `pending` quando `failureCount > 0` ou explicitamente marcadas
2. **Pré-requisito**: idempotency key (US1) — sem ela, retry de in-flight pode duplicar
3. Ao restaurar, `resumePausedMutations` re-fire com mesma idempotency key
4. Ref: [TanStack #6238](https://github.com/TanStack/query/issues/6238) — exige opt-in explícito porque é footgun

### Edge Cases

- **Refresh durante autosave + offline**: payload na fila + idempotency key sobrevive → reconecta → replay → server retorna response cacheada → sem duplicação ✅
- **3 abas abertas editando**: scope.id por evolução serializa POR ABA, mas não entre abas. Cross-tab race resolvida por version check (US2)
- **Token JWT expira durante autosave**: 401 → renova → re-fire mutation (TanStack `retry` opcional, ou interceptor no `workersClient`)
- **Server lento (>10s)**: AbortController após N segundos cancela e replay via fila offline (já existe parcialmente)

## Requirements

### Functional

- **FR-001**: `useAutoSave` gera `idempotencyKey: crypto.randomUUID()` por chamada e propaga até o body do POST
- **FR-002**: Worker `/api/sessions/autosave` consulta `FISIOFLOW_CONFIG.get(\`idem:${key}\`)` antes de processar; retorna cache se hit
- **FR-003**: Worker grava `FISIOFLOW_CONFIG.put(\`idem:${key}\`, JSON.stringify(response), { expirationTtl: 60 })` após sucesso
- **FR-004**: Cliente envia `version` (number) em todas as mutations; Worker retorna 409 se mismatch (lógica já existe — adicionar UX no client)
- **FR-005**: Modal de conflito (`<EvolutionConflictModal>`) abre no `useAutoSaveEvolution.onError` quando status===409
- **FR-006**: Refatorar `usePatientEvolutionState.ts` removendo `evolutionV2Data` useState; manter como `useMemo` derivado
- **FR-007**: `NotionEvolutionPanel` aceita `evolutionData` canonical + handlers tipados (`onObservationChange`, `onPainScaleChange`, etc.)
- **FR-008**: Renomear `evolutionText` consumidores para `observations`; remover campo duplicado do tipo `EvolutionV2Data`

### Non-Functional

- **NFR-001**: Idempotency dedupe latência < 50ms (KV read é ~10ms na borda)
- **NFR-002**: Métricas em Analytics Engine: `autosave_attempts`, `autosave_dedupe_hits`, `autosave_409_conflicts`, `autosave_rollbacks`, `autosave_offline_queue_size`
- **NFR-003**: Refactor US3 sem alterar contrato de API (server-side intacto)
- **NFR-004**: E2E Playwright cobre: happy path, multi-tab edit, offline replay, refresh mid-save

## Constitution Check

- **Stack canônica**: ✅ Neon + Cloudflare Workers + Hyperdrive; KV existente
- **Spec-driven**: este arquivo é o spec
- **RLS**: nenhuma mudança no modelo de dados além de eventual coluna `version` (já existe)
- **Sem glassmorphism**: aplica-se ao modal de conflito

## Roadmap de implementação

| Fase | Escopo | Esforço | Dependências |
|------|--------|---------|--------------|
| **P2.1** | US1 (idempotency) | ~3h | KV namespace já existe |
| **P2.2** | US2 (version 409 UX) | ~4h | US1 (idempotency evita re-fire duplicado no retry) |
| **P2.3** | US3 (state unificado) | ~6-8h + 2h re-teste | US1+US2 estáveis em produção |
| **P3.1** | US4 (useOptimistic) | ~3h | US3 |
| **P3.2** | US5 (persist in-flight) | ~2h | US1 (obrigatório) |

**Total P2+P3**: ~20h de engenharia + ~4h de QA.

## Referências de pesquisa (Exa, 2026-05-20)

- [React Query Autosave: Preventing Data Loss & Race Conditions](https://www.pz.com.au/insights/react-query-autosave-data-integrity) — Irina Kudryavtseva, padrão `useQueuedMutation`
- [Optimistic UI Without Lying — React 19 Blueprint](https://www.7tech.co.in/react-optimistic-ui-blueprint-conflict-safe-mutations/) — intent IDs + idempotency + version
- [Optimistic UI without the lies](https://preetsuthar.me/writing/optimistic-ui-without-the-lies) — tipo `confirmed | pending | failed`, double-click guard, conflict reconcile
- [Offline-First & PWA Techniques](https://www.ruixen.com/blog/offline-first-pwa-nextjs) — IndexedDB queues, background sync, conflict resolution
- [TanStack Query v5 — Mutation Scopes](https://tanstack.com/query/v5/docs/framework/react/guides/mutations#mutation-scopes) — primitiva nativa para serializar mutations
- [TanStack #6238 — Offline mode refresh doesn't continue in-flight](https://github.com/TanStack/query/issues/6238) — discussão sobre persistir mutations pending

## Notas

- Implementar P2.1 e P2.2 podem ser feitos no mesmo PR (idempotency facilita o retry seguro do conflict resolution).
- P2.3 é maior refactor — recomendado branch separado com toggle de feature flag (`VITE_EVOLUTION_UNIFIED_STATE`) para rollback rápido.
- Manter os dois P1 commits (`785ad16e0`, `9a9d487ae`) como baseline em main antes de iniciar P2.
