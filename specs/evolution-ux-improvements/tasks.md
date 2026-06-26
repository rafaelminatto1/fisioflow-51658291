# Tasks: Evolution UX/UI Upgrade

**Input**: Design documents from `specs/evolution-ux-improvements/`
**Prerequisites**: `specs/evolution-ux-improvements/spec.md`, `specs/evolution-ux-improvements/plan.md`

## Phase 1: Responsive Layout (P1) ✅

- [x] T001 Refatorar `EvolutionNoScrollPanel` para suportar `md:grid-cols-2`
- [x] T002 Implementar lógica de reordenação de colunas para tablets
- [x] T003 Adicionar animações de transição suaves via `framer-motion`
- [ ] T004 Validar layout em breakpoints: 390px, 768px, 1024px, 1440px

---

## Phase 2: Clinical Hierarchy & Column 3 (P1)

- [x] T005 Criar `EvolutionInsightCard` agrupando Tendência e Comparativo
- [x] T006 Implementar nova hierarquia visual na coluna 3 (EVA -> Insight -> Medições -> Administrativo)
- [x] T007 Ajustar espaçamentos e contrastes dos cards para maior legibilidade
- [ ] T008 Validar visualmente a densidade de informações na coluna 3

---

## Phase 3: EVA Enhancement (P2) ✅

- [x] T009 Adicionar arco de conexão Chegada -> Saída no `PainGauge`
- [x] T010 Implementar feedback visual de cor dinâmico no arco de conexão
- [x] T011 Adicionar tooltips com valores exatos nos marcadores do Gauge
- [x] T012 Atualizar Sparkline com linhas de referência (Leve, Moderada, Intensa)

---

## Phase 4: Accessibility & Interactivity (P3) ✅

- [x] T013 Implementar atalhos de teclado para navegação rápida
- [x] T014 Adicionar empty states informativos nos cards vazios
- [x] T015 Implementar drag-and-drop direto no `AttachmentsBlock`
- [x] T016 Implementar feedback visual de "Sessão salva"

---

## Phase 5: Regression and QA

- [ ] T017 Validar que a funcionalidade de "Foco" continua funcionando corretamente
- [ ] T018 Verificar performance de renderização em dispositivos low-end
- [ ] T019 Testar fluxo completo de evolução em mobile e desktop
- [ ] T020 Atualizar documentação de UI/UX no guia do desenvolvedor
