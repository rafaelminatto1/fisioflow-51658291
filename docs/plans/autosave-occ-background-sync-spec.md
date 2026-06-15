# Especificação Técnica: Resiliência de Autosave (Fases 2 e 3)

## Introdução

Esta especificação detalha as fases 2 (Controle de Concorrência Otimista - OCC) e 3 (Background Sync com IndexedDB/Service Worker) do roadmap de evolução do Autosave.

## Fase 2: Controle de Concorrência Otimista (OCC)

### Objetivo

Prevenir a "Aba Zumbi", onde um `keepalive` ou autosave atrasado de uma sessão antiga sobrescreve os dados de uma sessão mais recente (ex: usuário edita no celular, depois a aba velha no PC é fechada e salva por cima).

### Design e Arquitetura

1.  **Backend (API & Database)**
    - **Modelo de Dados:** A tabela `soap_records` já deve possuir um campo `version` (integer, default 0).
    - **Endpoints:** O endpoint `POST /api/sessions/autosave` receberá o campo `version` no payload.
    - **Regra de Negócio (Transação):**
      - Ao receber o payload, consultar a `version` atual do registro no banco.
      - Se `payload.version < current.version`, lançar **HTTP 409 Conflict**.
      - Se válido, `UPDATE soap_records SET ..., version = version + 1 WHERE id = ? RETURNING version`.
      - Retornar a nova `version` no response.

2.  **Frontend (React Query & Estado)**
    - **Payload do Request:** `src/api/v2/clinical.ts` (método `autosave`) precisará ler a versão atual do registro (via query cache ou state). No refatoramento recente, o `useAutoSave` já tenta enviar a versão se existir.
    - **Tratamento do 409:** Em `src/pages/PatientEvolution.tsx`, o bloco `catch` do `mutateAsync` já captura o 409. O comportamento atual abre o modal. Precisamos garantir que, se o modal for aberto, o usuário entenda o porquê (Aba Zumbi).
    - **Silent Merge:** Se o frontend receber 409 e o usuário **não** estiver ativamente digitando (isDirty === false), o frontend pode opcionalmente aceitar a versão do servidor silenciosamente (ou exibir um toast "Atualizado por outro dispositivo").

### Passos de Implementação (OCC)

- [ ] Validar Drizzle Schema (`drizzle/schema.ts` ou equivalente) para a presença da coluna `version` em `soap_records`.
- [ ] Atualizar o worker handler (`apps/api/src/routes/clinical.ts` ou afins) para a validação OCC.
- [ ] Ajustar testes unitários/E2E para validar o cenário de conflito e incremento de versão.

---

## Fase 3: Sincronização em Background (Service Worker / IndexedDB)

### Objetivo

Garantir que um autosave não se perca se o usuário perder a conexão exata no momento de fechar a aba ou se o navegador interromper o `keepalive`.

### Design e Arquitetura

1.  **IndexedDB via `offlineSync.ts`**
    - O projeto já possui `src/services/offlineSync.ts` que gerencia filas (`ACTION_TYPES.CREATE_EVOLUTION`, `ACTION_TYPES.UPDATE_EVOLUTION`).
    - Precisamos registrar uma ação do tipo `ACTION_TYPES.AUTOSAVE_EVOLUTION`.
    - **Enfileiramento:** No `useAutoSave.ts`, dentro do `catch(error)`, se detectarmos falha real de rede (`isOffline`), ao invés de apenas engolir, chamamos `enqueueAction(ACTION_TYPES.AUTOSAVE_EVOLUTION, payload)`.

2.  **Service Worker (Background Sync API)**
    - Em `apps/web/src/service-worker.ts`, registrar a captura de eventos de `sync` (ex: `self.addEventListener('sync', ...)`).
    - Quando a tag de sync for disparada (pelo SO/Browser indicando volta da rede), o SW invoca o processamento da fila do IndexedDB.
    - **Fallback:** Como a Background Sync API não é suportada 100% no iOS/Safari, o `offlineSync.ts` no frontend (quando aberto) continuará consumindo a fila ao ligar a tela (evento `online`).

3.  **Tratamento de Idempotência e Ordem**
    - Fila de autosaves do mesmo registro deve ser "debounced" no IndexedDB (se já tem um update na fila, atualizar o payload na fila em vez de criar um novo item, economizando I/O).

### Passos de Implementação (Background Sync)

- [ ] Adicionar `ACTION_TYPES.AUTOSAVE_EVOLUTION` em `src/services/offlineSync.ts`.
- [ ] Modificar `useAutoSave.ts` para enfileirar em caso de falha de rede (`enqueueAction`).
- [ ] Ajustar o consumer da fila para processar o payload chamando a API original.
- [ ] Atualizar `service-worker.ts` para lidar com `sync` (usando workbox-background-sync ou implementação manual via idb).
