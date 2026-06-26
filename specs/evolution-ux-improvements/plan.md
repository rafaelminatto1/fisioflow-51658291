# Implementation Plan: Evolution UX/UI Upgrade

**Branch**: `evolution-ux-improvements` | **Date**: 2026-06-25 | **Spec**: `specs/evolution-ux-improvements/spec.md`
**Input**: Feature specification from `specs/evolution-ux-improvements/spec.md`

## Summary

Melhorar a experiência do fisioterapeuta na página de evolução clínica através de: 1) layout responsivo adaptativo, 2) reorganização visual da coluna 3 para hierarquia clínica, 3) visualização aprimorada do EVA com indicadores contextuais, e 4) interatividade e acessibilidade aprimoradas.

## Technical Context

- **Target**: `src/components/evolution/v2-improved/EvolutionNoScrollPanel.tsx`
- **Language/Version**: TypeScript 5.x, React 19, Tailwind CSS v4
- **Data**: `useSoapRecords` já expõe histórico de sessões; `PainGauge` component exists
- **Dependencies**: `@hello-pangea/dnd`, `framer-motion`, componentes UI existentes
- **Testing**: Vitest para componentes, Playwright p/ fluxo de evolução

## Implementation Outline

### 1. Responsive Layout Refactor

- Substituir `lg:grid-cols` por `md:grid-cols-2 lg:grid-cols-3`
- Implementar lógica de reordenação condicional para tablets
- Adicionar transições suaves com `framer-motion`
- Garantir que cards de coluna 3 mantêm altura mínima crítica no desktop

### 2. ClinicalInsightCard Component

- Criar novo componente que agrupe Tendência + Comparativo
- Adicionar prop `priority` para controlar exibição
- Implementar mini-legendas contextuais

### 3. PainGauge V2 Enhancement

- Adicionar prop `arrivalMarker` para exibir marcador de chegada
- Implementar prop `deltaIndicator` com cores dinâmicas (verde/vermelho)
- Adicionar tooltips contextuais com valores exatos

### 4. Interactivity & Accessibility

- Implementar atalhos de teclado (Ctrl+S, Alt+O/C/D)
- Adicionar empty states contextualizados
- Implementar drag-and-drop direto no card de anexos

## Project Structure

```text
apps/web/src/components/evolution/v2-improved/
  EvolutionNoScrollPanel.tsx    # Componente principal (modificação)
  ClinicalInsightCard.tsx       # Novo componente
  PainGaugeEnhanced.tsx         # Versão aprimorada do PainGauge
  KeyboardShortcuts.tsx         # Novo componente para atalhos

specs/evolution-ux-improvements/
  spec.md                       # Esta especificação
  plan.md                       # Este plano
  tasks.md                      # Lista de tarefas
```

## Validation

- Testar layout em viewport: 390x844 (mobile), 1024x768 (tablet), 1440x900 (desktop)
- Verificar transições sem flicker ou layout shift
- Confirmar que informações críticas (EVA, tendência) são visíveis acima da dobra no mobile
- Executar testes de performance: LCP e FID devem permanecer dentro dos thresholds
