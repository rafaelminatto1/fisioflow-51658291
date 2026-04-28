# Tasks: Spec Kit Adoption for FisioFlow

**Input**: Design documents from `specs/spec-kit-adoption/`
**Prerequisites**: `constitution.md`, `specs/spec-kit-adoption/spec.md`, `specs/spec-kit-adoption/plan.md`

## Phase 1: Setup Spec Kit Adoption

- [x] T001 Add `constitution.md` to the repository root.
- [x] T002 Create `specs/spec-kit-adoption/spec.md` documenting the adoption scope.
- [x] T003 Create `specs/spec-kit-adoption/plan.md` com a abordagem técnica e integração com o monorepo.
- [x] T004 Create `specs/spec-kit-adoption/tasks.md` com tarefas acionáveis para usar o processo.
- [x] T005 Verificar a instalação de Spec Kit e de `/speckit.*` no repositório.

---

## Phase 2: Align with the Monorepo

- [x] T006 Confirmar que `specs/` pode ser usado para novos recursos sem impactar `apps/` e `packages/`.
- [x] T007 Documentar no `README.md` ou em `docs/guides/developer_guide.md` como iniciar uma feature com Spec Kit.
- [x] T008 Garantir que a equipe conhece os comandos de Spec Kit: `specify init --here`, `/speckit.constitution`, `/speckit.specify`, `/speckit.plan`, `/speckit.tasks`, `/speckit.analyze`, `/speckit.checklist`.

---

## Phase 3: First Use Case

- [ ] T009 Escolher o próximo recurso ou melhoria do produto.
- [ ] T010 Criar um novo diretório `specs/<feature-name>/` para esse recurso.
- [ ] T011 Gerar ou preencher `spec.md`, `plan.md` e `tasks.md` para esse recurso como padrão.
- [ ] T012 Revisar o primeiro uso com o time e ajustar o fluxo se necessário.

---

## Phase 4: Governance e Melhoria Contínua

- [ ] T013 Incluir no processo de revisão de PR uma verificação de que o novo recurso segue o padrão Spec Kit.
- [ ] T014 Adicionar um checklist opcional de qualidade para novas especificações e planos.
- [ ] T015 Atualizar `constitution.md` com lições aprendidas após a adoção inicial.
- [ ] T016 Estabelecer um pequeno guia de onboarding para novos colaboradores.

## Dependencies & Execution Order

- `T001–T005` podem ser feitos imediatamente para formalizar a adoção.
- `T006–T008` dependem do reconhecimento do fluxo pelo time.
- `T009–T012` dependem da seleção de uma feature real.
- `T013–T016` são atividades de refinamento após a primeira aplicação.
