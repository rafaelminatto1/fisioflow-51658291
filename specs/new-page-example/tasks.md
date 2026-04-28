# Tasks: Patient Follow-Up Dashboard Page

**Input**: Design documents from `specs/new-page-example/`
**Prerequisites**: `specs/new-page-example/spec.md`, `specs/new-page-example/plan.md`

## Phase 1: Page Foundation

- [ ] T001 Criar a nova rota de página `apps/web/src/pages/follow-up.tsx`.
- [ ] T002 Adicionar navegação no menu principal do dashboard para a página de acompanhamento.
- [ ] T003 Criar componentes de layout principais em `apps/web/src/components/follow-up/`.
- [ ] T004 Criar hook `apps/web/src/hooks/useFollowUpData.ts` para consulta de dados.

---

## Phase 2: Backend Data Integration

- [ ] T005 Validar se os dados de próximo compromisso e exercícios já existem na API atual.
- [ ] T006 Criar ou estender endpoint em `apps/api` para fornecer dados de acompanhamento, se necessário.
- [ ] T007 Garantir que todo acesso respeita o tenant isolation do usuário.

---

## Phase 3: Actions and Filters

- [ ] T008 Implementar botão de lembrete com estado habilitado/desabilitado.
- [ ] T009 Adicionar filtros por consulta próxima e status de plano.
- [ ] T010 Lidar com estados vazios e erros na interface.

---

## Phase 4: QA e Documentação

- [ ] T011 Escrever testes de componente para `FollowUpPage`.
- [ ] T012 Executar teste de fluxo de navegação e filtragem.
- [ ] T013 Atualizar `docs/guides/developer_guide.md` com o novo caso de uso de Spec Kit, se necessário.
- [ ] T014 Reunir revisão de PR e confirmar que a feature segue o padrão Spec Kit.
