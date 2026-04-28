# Plano de Implementação: agenda-settings-ux-redesign

## Visão Geral

Implementação incremental em 7 etapas: schema de banco (✅ concluído) → API Workers (Hono + Neon) → hook de persistência → UI da aba Aparência → consolidação de abas → sincronização de URL → testes de propriedade.

**Stack**: Cloudflare Workers + Hono (`apps/api/`) | Neon PostgreSQL via Hyperdrive | Drizzle ORM (`packages/db/`) | React 19 + React Router v7 (`src/`) | Vitest + fast-check

**Página alvo**: `src/pages/ScheduleSettings.tsx` (já existe com 6 abas, URL sync, Sheet mobile)

**Aba alvo**: `ScheduleVisualTab` em `src/components/schedule/settings/tabs/ScheduleVisualTab.tsx`

## Tarefas

- [x] 1. Schema de banco e migração Drizzle ORM
  - ✅ `packages/db/src/schema/userAgendaAppearance.ts` criado com tabela `user_agenda_appearance`
  - ✅ Exportado em `packages/db/src/schema/index.ts`
  - Migration SQL a ser gerada manualmente com `npx drizzle-kit generate` (requer `DATABASE_URL`)
  - _Requirements: 3.1, 3.8_

- [x] 2. Endpoints Cloudflare Workers — GET e PUT `/api/v1/user/agenda-appearance`
  - [x] 2.1 Implementar handler `GET /api/v1/user/agenda-appearance`
    - Criar `apps/api/src/routes/agendaAppearance.ts` com rota Hono
    - Usar `requireAuth` middleware (já existe em `apps/api/src/lib/auth.ts`) para extrair `profileId` e `organizationId` do JWT Neon Auth
    - Consultar `user_agenda_appearance` via Drizzle + Hyperdrive; retornar `{ data: null }` com status 200 quando não encontrado
    - Retornar `{ data: appearanceData }` com status 200 quando encontrado
    - Registrar a rota em `apps/api/src/index.ts`
    - _Requirements: 3.2_

  - [x] 2.2 Implementar handler `PUT /api/v1/user/agenda-appearance`
    - Usar `requireAuth` + `zValidator("json", AgendaAppearanceStateSchema)` do `@hono/zod-validator`
    - Clampar valores fora do range (heightScale 0–10, fontScale 0–10, opacity 0–100) antes de persistir
    - Fazer upsert via Drizzle: `INSERT ... ON CONFLICT (profile_id, organization_id) DO UPDATE SET appearance_data = ?, updated_at = NOW()`
    - Retornar `{ data: { updatedAt } }` com status 200
    - _Requirements: 3.1, 3.8_

  - [x] 2.3 Escrever testes de integração para os endpoints
    - Localização: `apps/api/src/__tests__/agendaAppearance.test.ts`
    - Testar GET com perfil existente, GET com perfil inexistente (→ data null), PUT com body válido, PUT com valores fora do range (clamping)
    - _Requirements: 3.1, 3.2_

- [x] 3. Hook `useAgendaAppearancePersistence`
  - [x] 3.1 Criar `src/hooks/useAgendaAppearancePersistence.ts`
    - Envolver `useAgendaAppearance` e adicionar `useQuery` (TanStack Query 5) para `GET /api/v1/user/agenda-appearance` no mount
    - Implementar lógica de merge: server wins — ao receber dados do Neon, mesclar com estado local priorizando o servidor
    - Após primeiro sync bem-sucedido, remover chaves legadas do localStorage (`agenda_appearance_v2`, `agenda_card_size`, `agenda_card_height_multiplier`, `agenda_card_font_scale`, `agenda_card_opacity`)
    - Expor `isSyncing`, `isOffline`, `lastSyncedAt`, `syncError` conforme interface do design
    - _Requirements: 3.2, 3.3, 3.7, 3.9_

  - [x] 3.2 Adicionar `useMutation` com debounce 800ms e optimistic update
    - Disparar `PUT /api/v1/user/agenda-appearance` com debounce de 800ms após qualquer mudança de aparência
    - Implementar optimistic update: atualizar estado local antes da resposta do Worker
    - Em caso de falha: reverter estado para `S_prev` e exibir toast de erro via `sonner` ("Não foi possível salvar as configurações. Tente novamente.")
    - _Requirements: 3.4, 3.5, 3.6_

  - [x] 3.3 Escrever property test — Property 7: Merge prioriza servidor
    - `// Feature: agenda-settings-ux-redesign, Property 7: Merge prioriza servidor`
    - Para qualquer `serverProfile` e `localState`, o resultado do merge deve ter todos os campos de `serverProfile` com os valores do servidor
    - **Validates: Requirements 3.3**

  - [x] 3.4 Escrever property test — Property 8: Rollback em falha de salvamento
    - `// Feature: agenda-settings-ux-redesign, Property 8: Rollback em falha de salvamento`
    - Para qualquer `S_prev` e mudança aplicada resultando em `S_next`, se PUT falhar, o estado deve reverter para `S_prev`
    - **Validates: Requirements 3.5**

  - [x] 3.5 Escrever property test — Property 9: Debounce agrupa escritas
    - `// Feature: agenda-settings-ux-redesign, Property 9: Debounce agrupa escritas`
    - Para N mudanças dentro de 800ms, deve haver exatamente 1 chamada PUT
    - **Validates: Requirements 3.6**

  - [x] 3.6 Escrever property test — Property 6: Serialização round-trip
    - `// Feature: agenda-settings-ux-redesign, Property 6: Serialização round-trip do Appearance_Profile`
    - Para qualquer `AgendaAppearanceState` válido, `JSON.parse(JSON.stringify(state))` deve ser profundamente igual ao original
    - **Validates: Requirements 3.10**

- [x] 4. Checkpoint — Persistência
  - Garantir que todos os testes do hook passam e que GET/PUT funcionam corretamente com mocks. Perguntar ao usuário se há dúvidas antes de avançar para a UI.

- [x] 5. UI da aba Aparência — três painéis independentes por view
  - [x] 5.1 Criar componente `ViewAppearancePanel`
    - Criar `src/components/schedule/settings/ViewAppearancePanel.tsx`
    - Props: `view: AgendaView`, `label: string`, `icon: LucideIcon`
    - Usar `useAgendaAppearancePersistence(view)` internamente
    - Renderizar sliders (shadcn/ui `Slider`) para heightScale (0–10), fontScale (0–10), opacity (0–100) e selector de cardSize (extra_small | small | medium | large)
    - Exibir indicador visual de override ativo (`hasOverrideForView`) — badge ou dot colorido
    - Botão "Aplicar a todas as views" → `applyToAllViews`; botão "Restaurar padrão" → `resetView`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.7, 1.8, 1.9_

  - [x] 5.2 Criar componente `LiveViewPreview`
    - Criar `src/components/schedule/settings/LiveViewPreview.tsx`
    - Props: `appearance: AgendaViewAppearance`, `view: AgendaView`
    - Renderizar cards de exemplo com layout FullCalendar-like aplicando as CSS vars (`--agenda-card-font-scale`, `--agenda-slot-height`, `--agenda-card-opacity`)
    - Atualizar em tempo real sem debounce visual
    - Embutir dentro de `ViewAppearancePanel`
    - _Requirements: 1.6, 4.8_

  - [x] 5.3 Criar componente `GlobalPresetsPanel`
    - Criar `src/components/schedule/settings/GlobalPresetsPanel.tsx`
    - Reutilizar os 4 presets já definidos em `ScheduleVisualTab.tsx` (Alta Produtividade, Equilíbrio, Confortável, Camadas)
    - Ao selecionar preset, chamar `applyToAllViews(preset.config)` e exibir confirmação visual por 2 segundos (ícone `CheckCircle2` já usado no código existente)
    - _Requirements: 1.10_

  - [x] 5.4 Escrever property test — Property 1: Isolamento de override por view
    - `// Feature: agenda-settings-ux-redesign, Property 1: Isolamento de override por view`
    - Para qualquer view V e valores de aparência, atualizar V não deve afetar os overrides das outras duas views
    - **Validates: Requirements 1.2, 1.3, 1.4, 1.5**

  - [x] 5.5 Escrever property test — Property 2: Propagação de applyToAllViews
    - `// Feature: agenda-settings-ux-redesign, Property 2: Propagação de applyToAllViews`
    - Para qualquer `patch`, `applyToAllViews(patch)` deve resultar em day, week e month com aqueles valores
    - **Validates: Requirements 1.7, 1.10**

  - [x] 5.6 Escrever property test — Property 3: Reset de view reverte para defaults
    - `// Feature: agenda-settings-ux-redesign, Property 3: Reset de view reverte para defaults`
    - Para qualquer view V com overrides, `resetView()` deve fazer `effectiveForView(state, V)` equivaler a `{ ...DEFAULT_GLOBAL, ...VIEW_DEFAULT_OVERRIDES[V] }`
    - **Validates: Requirements 1.8**

  - [x] 5.7 Escrever property test — Property 4: hasOverrideForView reflete estado real
    - `// Feature: agenda-settings-ux-redesign, Property 4: hasOverrideForView reflete estado real`
    - `hasOverrideForView` deve ser `true` se e somente se `state[view]` existe e tem pelo menos uma chave
    - **Validates: Requirements 1.9**

  - [x] 5.8 Escrever property test — Property 5: Pré-visualização reflete configuração
    - `// Feature: agenda-settings-ux-redesign, Property 5: Pré-visualização reflete configuração`
    - Para qualquer `AgendaViewAppearance`, as CSS vars geradas devem satisfazer: `--agenda-card-font-scale` = `80 + (fontScale/10)*70`%, `--agenda-slot-height` = `round(24 * (0.5 + (heightScale/10)*1.5))`px, `--agenda-card-opacity` = `opacity/100`
    - **Validates: Requirements 1.6, 4.8**

- [x] 6. Consolidação de abas — `AgendaHorariosTab`
  - [x] 6.1 Criar componente `AgendaHorariosTab`
    - Criar `src/components/schedule/settings/tabs/AgendaHorariosTab.tsx`
    - Compor as sub-seções internas usando `SettingsSectionCard` (já existe em `settings/shared/`):
      - Horários de Funcionamento (`BusinessHoursManager`)
      - Capacidade (`CapacityHeroCard` + `CapacityRulesList`)
      - Janela de Agendamento (`BookingWindowSettings`)
      - Alinhamento de Slots (`SlotAlignmentSettings`)
    - _Requirements: 2.1, 2.3_

  - [x] 6.2 Escrever property test — Property 10: Validação de horário de funcionamento
    - `// Feature: agenda-settings-ux-redesign, Property 10: Validação de horário de funcionamento`
    - Para qualquer par (open_time, close_time), a validação deve aceitar se e somente se `close_time > open_time` (comparação lexicográfica HH:MM)
    - **Validates: Requirements 5.3**

  - [x] 6.3 Escrever property test — Property 11: Validação de BlockedTime
    - `// Feature: agenda-settings-ux-redesign, Property 11: Validação de BlockedTime`
    - Para qualquer BlockedTime não-dia-inteiro, rejeitar se `end_time <= start_time` ou se título ou data de início estiverem ausentes
    - **Validates: Requirements 6.2, 6.3**

  - [x] 6.4 Escrever property test — Property 12: Ordenação de BlockedTimes
    - `// Feature: agenda-settings-ux-redesign, Property 12: Ordenação de BlockedTimes`
    - Para qualquer lista de BlockedTimes, a lista renderizada deve estar ordenada por `start_date` decrescente
    - **Validates: Requirements 6.5**

  - [x] 6.5 Escrever property test — Property 13: Validação de duração de AppointmentType
    - `// Feature: agenda-settings-ux-redesign, Property 13: Validação de duração de AppointmentType`
    - Para qualquer duração em minutos, aceitar se e somente se `15 <= duration <= 480`
    - **Validates: Requirements 7.2**

  - [x] 6.6 Escrever property test — Property 14: Validação de antecedência de cancelamento
    - `// Feature: agenda-settings-ux-redesign, Property 14: Validação de antecedência de cancelamento`
    - Para qualquer valor de antecedência mínima, aceitar se e somente se é inteiro no intervalo `[0, 72]`
    - **Validates: Requirements 8.5**

- [x] 7. Refatoração de `ScheduleSettings.tsx` — nova estrutura de abas
  - [x] 7.1 Refatorar `src/pages/ScheduleSettings.tsx` para 5 abas
    - Substituir as abas `capacity` e `hours` pela nova aba `agenda-horarios` com `AgendaHorariosTab`
    - Substituir o conteúdo da aba `visual` com `GlobalPresetsPanel` + três instâncias de `ViewAppearancePanel` (day/week/month) + `StatusColorManager` + seção de acessibilidade (já existe em `ScheduleVisualTab`)
    - Redirecionar valores legados `capacity` e `hours` para `agenda-horarios` no `handleTabChange`
    - Manter `ScheduleAppointmentTypesTab`, `SchedulePoliciesTab` e `ScheduleBlockedTab` sem alteração
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 7.2 Adicionar badges de contagem nas abas Bloqueios e Tipos de Atendimento
    - Exibir badge com contagem de itens cadastrados nas abas "Bloqueios" e "Tipos de Atendimento"
    - _Requirements: 2.8_

  - [x] 7.3 Adicionar indicador de carregamento e banner de modo offline
    - Exibir skeleton/spinner enquanto dados do Neon são carregados (TanStack Query `isLoading`)
    - Exibir banner amarelo discreto na aba Aparência quando `isOffline === true`
    - _Requirements: 3.9, 4.4_

  - [x] 7.4 Escrever property test — Property 15: Badge de contagem reflete tamanho da lista
    - `// Feature: agenda-settings-ux-redesign, Property 15: Badge de contagem reflete tamanho da lista`
    - Para qualquer lista de BlockedTimes ou AppointmentTypes de tamanho N, o badge deve mostrar exatamente N
    - **Validates: Requirements 2.8**

  - [x] 7.5 Escrever property test — Property 16: URL sync é bidirecional
    - `// Feature: agenda-settings-ux-redesign, Property 16: URL sync é bidirecional`
    - Para qualquer `SettingsTabId` válido, navegar para `?tab=X` deve ativar a aba X, e ativar a aba X programaticamente deve atualizar a URL para `?tab=X`
    - **Validates: Requirements 2.6**

- [x] 8. Checkpoint final — Garantir que todos os testes passam
  - Rodar `pnpm --filter fisioflow-web test:unit` e `pnpm --filter @fisioflow/api test`
  - Verificar type-check: `pnpm --filter fisioflow-web type-check` e `pnpm --filter @fisioflow/api type-check`
  - Fazer build: `pnpm --filter fisioflow-web build`
  - Deploy: `pnpm --filter @fisioflow/api deploy`

## Notas

- Tarefas marcadas com `*` são opcionais (property tests) — podem ser puladas para um MVP mais rápido
- **Nunca usar Firebase** — auth é Neon Auth (JWT/JWKS), banco é Neon PostgreSQL, API é Hono no Cloudflare Workers
- **Linter**: `oxlint` (não ESLint); **formatter**: `oxfmt` (não Prettier)
- Property tests usam fast-check 4.5.3 com Vitest 4.x; mínimo de 100 iterações por propriedade
- Tag obrigatória em cada property test: `// Feature: agenda-settings-ux-redesign, Property N: <texto>`
- Localização dos testes: `src/hooks/__tests__/` para hooks, `src/components/schedule/settings/__tests__/` para componentes
- O hook `useAgendaAppearance` já existe e **não deve ser modificado** — apenas envolvido por `useAgendaAppearancePersistence`
- Os componentes `BusinessHoursManager`, `BlockedTimesManager`, `CapacityHeroCard`, `CapacityRulesList`, `StatusColorManager` já existem em `src/components/schedule/settings/` e devem ser reutilizados sem alteração
- O schema Drizzle `userAgendaAppearance` já existe em `packages/db/src/schema/` (Task 1 concluída)
