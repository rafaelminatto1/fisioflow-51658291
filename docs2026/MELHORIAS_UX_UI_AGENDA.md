# Melhorias UX/UI – Página Agenda

Documento gerado com base na leitura completa da página Agenda e nos recursos do `.agent/` (ux-guidelines, design-system, fluxos, frontend-specialist).

---

## 1. Visão geral da página hoje

- **Schedule.tsx**: container principal; header com título, navegação por data (setas + mês), botão Hoje, Cancelar todos, switcher Dia/Semana/Mês, modo seleção, filtros, configurações, CTA "Novo Agendamento"; barra de stats (total agendamentos, filtros ativos, selecionados); OfflineIndicator; banner Assistente Clinsight (IA); WaitlistHorizontal; CalendarView em Suspense; BulkActionsBar; modais (QuickEdit, AppointmentModal, WaitlistQuickAdd, KeyboardShortcuts, AlertDialog cancelar todos).
- **CalendarView**: Card com header de navegação (prev/next, Hoje, título da semana/dia/mês), switcher de vista, grid com DayView / WeekView / MonthView; RescheduleConfirmDialog; optimistic updates e drag state.
- **CalendarWeekView / CalendarDayView**: grade de horários, cards de agendamento (CalendarAppointmentCard), células de slot, indicador de hora atual.
- **Componentes auxiliares**: AdvancedFilters (Sheet com status/tipo/terapeuta), WaitlistHorizontal (scroll horizontal), BulkActionsBar (flutuante), KeyboardShortcuts (Dialog com atalhos).

---

## 2. Recomendações alinhadas ao .agent

### 2.1 Design system (healthcare/schedule)

O script `search.py ... --design-system -p "FisioFlow Agenda"` recomendou:

- **Cores**: Primary #0891B2, Secondary #22D3EE, CTA #059669, Background #ECFEFF, Text #164E63 (já aplicado em parte nos cards – manter consistência em toda a agenda).
- **Evitar**: cores neon, animações pesadas, gradientes roxo/rosa em elementos de IA.
- **Checklist**: contraste ≥ 4.5:1, focus visível, `prefers-reduced-motion`, alvos de toque adequados, responsivo 375/768/1024/1440.

**Ação**: Unificar a paleta da página (header, botões, banner IA, stats) com cyan/teal/emerald do healthcare em vez de blue genérico; reduzir gradientes chamativos no banner "Assistente Clinsight".

---

### 2.2 UX Guidelines (.agent/.shared/ui-ux-pro-max/data/ux-guidelines.csv)

| Guideline | Aplicação na Agenda |
|-----------|----------------------|
| **Navigation – Active State (3)** | Deixar explícito qual vista está ativa (Dia/Semana/Mês). Já existe `variant={viewType === 'x' ? 'white' : 'ghost'}`; garantir contraste e rótulo claro (ex.: "Semana" selecionado). |
| **Touch – Touch Target Size (22)** | Botões do header e do switcher: mínimo 44x44px em mobile. Verificar `h-8`, `h-9`, `w-9` e trocar para `min-h-[44px] min-w-[44px]` onde for ação primária em mobile. |
| **Touch – Touch Spacing (23)** | Espaço entre botões do header e do switcher ≥ 8px. Já existe `gap-2`/`gap-3`; em mobile checar se não ficam colados. |
| **Interaction – Focus States (28)** | Todos os botões e links com `focus-visible:ring-2`. Schedule e CalendarView já usam componentes Button; garantir que nenhum `outline-none` sem substituto. |
| **Interaction – Hover States (29)** | Botões e slots clicáveis com feedback (cursor, leve mudança de cor). Cards já têm hover; checar células de slot e botões do header. |
| **Accessibility – ARIA Labels (40)** | Botões só com ícone (setas, Config, Filtros, Seleção, etc.) devem ter `aria-label`. Verificar Schedule.tsx e CalendarView (navegação, switcher). |
| **Accessibility – Keyboard Navigation (41)** | Atalhos já existem (N, F, D/W/M, T, setas, /, Esc). Garantir que o foco não fique preso em modais e que a ordem de tab seja lógica. |
| **Feedback – Loading Indicators (78)** | Operações > 300ms com feedback. CalendarView já tem Suspense + LoadingSkeleton; refetch/offline e "Cancelar todos" devem mostrar loading (disable + texto "Cancelando…" já existe). |
| **Feedback – Empty States (79)** | Quando não houver agendamentos na semana/dia, mostrar mensagem e ação ("Nenhum agendamento nesta data" + "Novo agendamento"). Verificar CalendarEmptyState e uso em Day/Week/Month. |
| **Content – Truncation (84)** | Nomes longos nos cards com truncate/line-clamp e, se possível, tooltip ou expand no QuickView. Já existe line-clamp-2 no nome. |
| **Responsive – Readable Font Size (67)** | Texto importante ≥ 16px em mobile. Título "Agenda", contador de agendamentos e rótulos do switcher checar em viewport pequena. |
| **Animation – Reduced Motion (9)** | Respeitar `prefers-reduced-motion`. Reduzir ou desligar animações de entrada (animate-in, slide-in) nos modais e no BulkActionsBar quando o usuário preferir menos movimento. |
| **Layout – Content Jumping (19)** | Reservar altura mínima para a grade para evitar salto quando os dados carregam. Já existe `min-h-[600px]` no Schedule; manter e garantir skeleton na mesma área. |

---

### 2.3 Hierarquia e clareza (UI)

- **Título da página**: "Agenda" com subtítulo "Gerencie seus atendimentos" está bom; manter hierarquia (h1 + texto menor).
- **Navegação por data**: O bloco com setas + mês está claro; em mobile o mês pode quebrar em duas linhas – usar `text-center` e tamanho legível.
- **Botão "Cancelar todos"**: Ação destrutiva; manter outline vermelho e confirmação (AlertDialog). Garantir `aria-label` e que o diálogo tenha foco e descrição clara.
- **Switcher Dia/Semana/Mês**: Manter um único grupo visual (segmented control); garantir que o estado selecionado seja óbvio (cor + peso).
- **Barra de stats**: "X agendamentos", "X visíveis (filtros ativos)", "X selecionados" – útil; manter ícones e cores distintas (azul/âmbar/roxo) e contraste de texto.
- **Banner Assistente Clinsight**: Reduzir peso visual (menos gradiente, ou fundo sólido cyan-50) para não competir com o conteúdo principal; botão "Sugerir Otimização" pode ser secundário (outline) em vez de primário forte.
- **Lista de espera (WaitlistHorizontal)**: Posição acima da grade é boa; garantir que o collapse/expand tenha rótulo acessível e que os itens tenham área de toque suficiente.

---

### 2.4 Acessibilidade e teclado

- **Skip link**: Na página inteira, considerar "Pular para calendário" para usuários de teclado (guideline 45).
- **Modais**: Ao abrir AppointmentModal, QuickEdit ou KeyboardShortcuts, foco deve ir para o primeiro elemento focável e ficar preso até fechar (focus trap); ao fechar, devolver foco ao gatilho.
- **CalendarView**: A região do grid deve ter `role="tabpanel"` e `aria-label` com a vista atual (já existe); células de slot e cards devem ser focáveis por teclado quando fizer sentido (tab + Enter/Space).
- **BulkActionsBar**: Flutuante com "X selecionados" e ações; garantir ordem de tab e rótulos para "Confirmar" e "Excluir".

---

### 2.5 Performance e carregamento

- **Lazy do CalendarView**: Já existe; manter e garantir que o fallback (LoadingSkeleton) ocupe a mesma área da grade para evitar layout shift (guideline 19).
- **Lista de agendamentos**: Se a lista for muito grande, CalendarWeekView já usa virtualização em alguns fluxos; manter e evitar renderizar centenas de cards fora da viewport.
- **Refetch/offline**: OfflineIndicator já mostra estado; em refetch manual, mostrar estado de loading breve (ex.: spinner no botão ou mensagem "Atualizando…").

---

### 2.6 Fluxo e erros (.agent/fluxos/01-agendamentos.md)

- **Problemas conhecidos**: Modal com risco de loop de atualização (useEffect com dependências instáveis) e QuickView com possível duplo clique (asChild + onClick). Não repetir padrões que causem re-renders em cascata ou gestos duplos.
- **Confirmações**: Ações destrutivas (excluir, cancelar todos) sempre com diálogo de confirmação e botão de cancelar visível (guideline 35).
- **Feedback de erro**: Toast em falha de rede, conflito de horário ou falha ao salvar; mensagem próxima ao contexto (ex.: "Não foi possível reagendar" com motivo quando possível).

---

## 3. Priorização sugerida

### Alta prioridade (acessibilidade e uso diário)

1. **Touch targets**: Garantir 44x44px mínimo nos botões do header e do switcher em viewport pequena.
2. **ARIA em botões só-ícone**: Adicionar `aria-label` em todos os botões que têm apenas ícone (setas, Config, Filtros, Seleção, fechar).
3. **Estado vazio**: Exibir estado vazio claro na grade (mensagem + CTA "Novo agendamento") quando não houver agendamentos para a data/vista.
4. **Reduced motion**: Usar `@media (prefers-reduced-motion: reduce)` para desabilitar ou encurtar animações de modais e da barra de ações em massa.

### Média prioridade (consistência e clareza)

5. **Paleta healthcare**: Alinhar header, stats e banner à paleta cyan/teal/emerald (#0891B2, #059669, etc.) para consistência com os cards.
6. **Banner IA**: Reduzir destaque visual (fundo mais neutro ou outline no CTA) para não competir com a agenda.
7. **Foco em modais**: Garantir focus trap e devolução de foco ao fechar (AppointmentModal, QuickEdit, KeyboardShortcuts, AlertDialog).
8. **Skip link**: Incluir "Pular para o calendário" no topo da página.

### Baixa prioridade (refino)

9. **Tooltip em nomes longos**: No QuickView ou no card, mostrar nome completo em tooltip quando truncado.
10. **Atalho de teclado para modo seleção**: Documentar e, se possível, implementar atalho (ex.: "A") para ativar modo seleção, como indicado no title do botão.
11. **Deep linking**: Persistir vista e data na URL (query ou hash) para compartilhar e voltar ao mesmo estado (guideline 5).

---

## 4. Arquivos a tocar (resumo)

| Objetivo | Arquivo(s) |
|----------|------------|
| Touch targets + ARIA header | `src/pages/Schedule.tsx` |
| Paleta + banner IA | `src/pages/Schedule.tsx` |
| Estado vazio na grade | `src/components/schedule/CalendarEmptyState.tsx`, `CalendarView.tsx`, `CalendarDayView.tsx`, `CalendarWeekView.tsx`, `CalendarMonthView.tsx` |
| Reduced motion | `src/components/schedule/BulkActionsBar.tsx`, modais (Dialog/Sheet), possivelmente Tailwind config ou CSS global |
| Focus trap / foco em modais | `src/components/schedule/AppointmentQuickEditModal.tsx`, `AppointmentModalRefactored.tsx`, `KeyboardShortcuts.tsx`, componentes Dialog/AlertDialog |
| Skip link | `src/pages/Schedule.tsx` ou layout que envolve a página |
| Filtros e botões só-ícone | `src/components/schedule/AdvancedFilters.tsx`, `Schedule.tsx` |

---

## 5. Referências usadas

- `.agent/.shared/ui-ux-pro-max/data/ux-guidelines.csv` (99 itens)
- `.agent/.shared/ui-ux-pro-max/scripts/search.py` (design-system healthcare/schedule)
- `.agent/workflows/ui-ux-pro-max.md`
- `.agent/fluxos/01-agendamentos.md`
- `.agent/agents/frontend-specialist.md`

Este documento pode ser usado como backlog de melhorias e atualizado conforme as mudanças forem implementadas.
