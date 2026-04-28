# Implementation Plan: Agenda Semanal e Cards de Agendamento Soft

**Branch**: `agenda-weekly-layout` | **Date**: 2026-04-28 | **Spec**: `specs/agenda-weekly-layout/spec.md`

## Summary
Criar uma versão mais sofisticada da página de agenda com foco na visualização semanal. Reutilizar a engine do FullCalendar e ajustar o estilo dos eventos para um aspecto mais limpo, suave e clínico.

## Technical Context
- **Target**: `src/pages/Schedule.tsx`, `src/components/schedule/ScheduleCalendar.tsx`, `src/components/schedule/ScheduleEventContent.tsx`, `src/styles/schedule.css`
- **Libraries**: React, FullCalendar, Tailwind, date-fns
- **Data**: já disponível em `useSchedulePageData`
- **Design**: Soft cards, resumos semanais, view semanal padrão

## Implementation Outline

1. **Criar componente de resumo semanal**
   - `src/components/schedule/WeeklyScheduleSummary.tsx`
   - Expor métricas de `appointments`, `confirmados`, `pendentes` e `grupos`
   - Renderizar apenas quando `viewType === "week"`

2. **Aprimorar o componente de evento**
   - Atualizar `ScheduleEventContent.tsx` para bordas mais arredondadas, fundo translúcido e melhor hierarquia tipográfica
   - Manter suporte a `timeText`, `groupCount`, `isAllDay` e seleção

3. **Ajustar o layout da agenda semanal**
   - Injetar o resumo semanal acima do calendário
   - Garantir que o calendário use `week` por padrão via `parseScheduleViewParam`
   - Melhorar a aparência do wrapper e do cabeçalho de dia

4. **Atualizar estilos globais da agenda**
   - Adicionar regras CSS para `data-agenda-view="week"`
   - Tornar os cards de evento mais suaves e modernos
   - Melhorar contraste de cabeçalhos

5. **Testes**
   - Criar `src/components/schedule/__tests__/WeeklyScheduleSummary.test.tsx`
   - Verificar renderização de métricas e texto de período

## Validation
- Navegar para `/schedule` e confirmar que a exibição inicial abre em `week`.
- Verificar o novo painel de resumo semanal.
- Confirmar que eventos aparecem como cards suaves no calendário.
- Executar o teste unitário criado para o resumo semanal.
