# Tasks: Agenda Patient Quick Search + Therapist Filter

**Input**: Design documents from `specs/agenda-patient-search/`
**Prerequisites**: `specs/agenda-patient-search/spec.md`, `specs/agenda-patient-search/plan.md`

## Phase 1: State and Routing

- [x] T001 Verificar e ajustar `Schedule.tsx` para que `patient` e `therapists` sejam mantidos em `searchParams`.
- [x] T002 Garantir que `handlePatientFilterChange` limpa corretamente o parâmetro `patient` quando a busca fica vazia.
- [x] T003 Expor `patientFilter` e `onPatientFilterChange` ao componente `ScheduleCalendar`.

---

## Phase 2: Toolbar Search UI

- [x] T004 Adicionar input de pesquisa por paciente no `ScheduleToolbar`.
- [x] T005 Implementar botão de limpar pesquisa dentro do campo.
- [ ] T006 Tornar o campo responsivo para mobile (input direto ou botão de pesquisa adaptado).

---

## Phase 3: Therapist Filter

- [x] T007 Atualizar `AdvancedFilters.tsx` para aceitar e renderizar a lista `therapists`.
- [x] T008 Permitir seleção múltipla de terapeutas e persistir em `searchParams`.
- [x] T009 Ajustar o estado de filtros ativos para incluir terapeutas no contador e no botão.

---

## Phase 4: Regression and QA

- [ ] T010 Escrever testes de unidade para `ScheduleToolbar` e `AdvancedFilters`.
- [ ] T011 Adicionar teste de integração para restaurar a agenda a partir da URL com `patient` e `therapists`.
- [ ] T012 Revisar a experiência de fluxo de agenda no desktop e mobile.
- [ ] T013 Atualizar `docs/guides/developer_guide.md` ou `README.md` se houver mudanças importantes na navegação da agenda.
- [ ] T014 Confirmar o comando de teste correto para o app `web` usando `apps/web/vitest.config.ts` ou `pnpm --filter fisioflow-web vitest run ...`.
