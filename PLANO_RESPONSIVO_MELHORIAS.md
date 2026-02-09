# Plano de Melhorias Responsivas - FisioFlow

## Visão Geral
Este documento detalha o plano para implementar melhorias de layout responsivo em todas as páginas e componentes do FisioFlow, otimizados para iPad, notebooks e desktop.

## Status Atual
✅ **Concluído**: `PatientEvolution.tsx` - Layout responsivo com EvolutionResponsiveLayout
✅ **Concluído**: `DraggableGrid.tsx` - Breakpoints otimizados (xl: 1280px adicionado)
✅ **Concluído**: `EvolutionDraggableGrid.tsx` - Layouts específicos por breakpoint

## Arquitetura de Breakpoints (Padrão)

```typescript
const BREAKPOINTS = {
    xxs: 0,      // < 480px - 1 coluna (small phones)
    xs: 480,     // 480-600px - 2 colunas (large phones)
    sm: 600,     // 600-768px - 4 colunas (iPad Mini portrait)
    md: 768,     // 768-1024px - 6 colunas (iPad 10.5"/11" portrait)
    lg: 1024,    // 1024-1280px - 8 colunas (iPad Pro 12.9"/notebooks)
    xl: 1280,    // 1280px+ - 12 colunas (desktops)
} as const;
```

---

## FASE 1: Alta Prioridade (Impacto Imediato)

### 1.1. Dashboard Principal (`Index.tsx`)
**Arquivo**: [`src/pages/Index.tsx`](src/pages/Index.tsx)

**Problemas Atuais**:
- Grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` não otimizado para tablets
- Activity feed com posicionamento fixo que pode não funcionar bem em mobile
- Chips de filtro com overflow horizontal

**Melhorias Planejadas**:
- Adicionar breakpoint `sm:` para tablets pequenos (iPad Mini)
- Implementar layout de 2 colunas em tablets (iPad 10.5")
- Adicionar scroll horizontal estilizado para chips de filtro
- Responsivizar altura dos widgets baseado no viewport

```typescript
// ANTES
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

// DEPOIS
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
```

### 1.2. Novo Paciente (`NewPatientPage.tsx`)
**Arquivo**: [`src/pages/patients/NewPatientPage.tsx`](src/pages/patients/NewPatientPage.tsx)

**Problemas Atuais**:
- `max-w-5xl` fixo que pode ser estreito demais em tablets
- Tabs de navegação com `grid-cols-4` causando overflow em mobile
- Campos de formulário sem responsividade adequada

**Melhorias Planejadas**:
- Substituir `max-w-5xl` por `max-w-full px-4`
- Transformar tabs em dropdown/select em mobile ou scroll horizontal
- Implementar formulário em 1 coluna (mobile) → 2 colunas (tablet+)
- Aumentar espaçamento entre campos em mobile

### 1.3. Calendário Semanal (`CalendarWeekView.tsx`)
**Arquivo**: [`src/components/schedule/CalendarWeekView.tsx`](src/components/schedule/CalendarWeekView.tsx)

**Problemas Atuais**:
- `min-w-[600px]` fixo causando overflow horizontal
- Altura fixa dos time slots
- Sem suporte a touch para mobile

**Melhorias Planejadas**:
- Remover `min-w-[600px]` e usar layout responsivo
- Implementar scroll horizontal com snap para mobile
- Adicionar swipe gestures para navegação
- Otimizar densidade de time slots baseado na tela

### 1.4. Modal de Novo Exercício (`NewExerciseModal.tsx`)
**Arquivo**: [`src/components/modals/NewExerciseModal.tsx`](src/components/modals/NewExerciseModal.tsx)

**Problemas Atuais**:
- Modal com `max-w-2xl` fixo
- Grids `grid-cols-2` e `grid-cols-3` não adaptam bem
- Elementos de formulário muito próximos em mobile

**Melhorias Planejadas**:
- Modal responsivo: `max-w-[95vw] md:max-w-2xl`
- Grid adaptativo: 1 col (mobile) → 2 (tablet) → 3 (desktop)
- Aumentar padding em mobile
- Adicionar scroll interno quando necessário

---

## FASE 2: Média Prioridade

### 2.1. Relatórios (`Reports.tsx`)
**Arquivo**: [`src/pages/Reports.tsx`](src/pages/Reports.tsx)

**Problemas Atuais**:
- Cards de stats `grid-cols-2 lg:grid-cols-4`
- Tabs com scroll horizontal em mobile
- Tabela de relatórios sem responsividade

**Melhorias Planejadas**:
- Cards responsivos: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- Tabs verticais em mobile ou dropdown
- Tabela com colunas ocultáveis em mobile
- Gráficos responsivos com altura adaptativa

### 2.2. Relatório de Evolução (`PatientEvolutionReport.tsx`)
**Arquivo**: [`src/pages/PatientEvolutionReport.tsx`](src/pages/PatientEvolutionReport.tsx)

**Problemas Atuais**:
- Header não adaptativo
- Tabela de medições sem scroll adequado
- Grid não otimizado para tablets

**Melhorias Planejadas**:
- Header responsivo com flex-wrap
- Tabela com container scroll overflow
- Grid de métricas responsivo
- Gráficos com altura baseada em viewport

### 2.3. Dashboard Customizável (`CustomizableDashboard.tsx`)
**Arquivo**: [`src/components/dashboard/CustomizableDashboard.tsx`](src/components/dashboard/CustomizableDashboard.tsx)

**Problemas Atuais**:
- Widget grid sem otimização para tablets
- Dialog de customização com largura fixa

**Melhorias Planejadas**:
- Grid responsivo: 1→2→3→4 colunas
- Dialog responsivo
- Widgets redimensionáveis baseado no breakpoint

### 2.4. Componentes de Analytics
**Arquivos**:
- [`src/components/analytics/AppointmentAnalytics.tsx`](src/components/analytics/AppointmentAnalytics.tsx)
- Outros componentes de analytics

**Melhorias Planejadas**:
- Gráficos com altura responsiva (`h-[200px] sm:h-[300px] lg:h-[400px]`)
- Tooltip otimizado para touch
- Layout de cards adaptativo

---

## FASE 3: Baixa Prioridade

### 3.1. Página Admin (`Admin.tsx`)
**Arquivo**: [`src/pages/Admin.tsx`](src/pages/Admin.tsx)

### 3.2. Analytics Avançado (`AdvancedAnalytics.tsx`)
**Arquivo**: [`src/pages/AdvancedAnalytics.tsx`](src/pages/AdvancedAnalytics.tsx)

### 3.3. Exercícios (`Exercises.tsx`)
**Arquivo**: [`src/pages/Exercises.tsx`](src/pages/Exercises.tsx)

### 3.4. Financeiro (`Financial.tsx`)
**Arquivo**: [`src/pages/Financial.tsx`](src/pages/Financial.tsx)

### 3.5. Hub de Fisioterapia (`PhysiotherapyHub.tsx`)
**Arquivo**: [`src/pages/PhysiotherapyHub.tsx`](src/pages/PhysiotherapyHub.tsx)

---

## Componentes Reutilizáveis a Criar

### 1. `ResponsiveModal`
Modal com largura e altura adaptativas, scroll automático em mobile.

### 2. `ResponsiveTable`
Tabela que se transforma em cards em mobile, com colunas ocultáveis.

### 3. `ResponsiveChart`
Container para gráficos com altura responsiva e tooltip touch-friendly.

### 4. `ResponsiveForm`
Grid de formulário que adapta número de colunas: 1→2→3.

### 5. `ResponsiveTabs`
Tabs que se transformam em dropdown em mobile ou scroll horizontal.

---

## Padrões de Implementação

### Grid Responsivo Padrão
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
```

### Container Padrão
```tsx
<div className="w-full px-3 sm:px-4 lg:px-6 max-w-7xl mx-auto">
```

### Modal Responsivo Padrão
```tsx
<DialogContent className="max-w-[95vw] md:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-auto">
```

### Tabela Responsiva Padrão
```tsx
<div className="overflow-x-auto -mx-4 px-4">
  <table className="w-full min-w-[600px]">
```

---

## Ordem de Implementação

| Fase | Componente | Prioridade | Estimativa |
|-------|-----------|-----------|------------|
| 1.1 | Index.tsx (Dashboard) | Alta | 30min |
| 1.2 | NewPatientPage.tsx | Alta | 45min |
| 1.3 | CalendarWeekView.tsx | Alta | 60min |
| 1.4 | NewExerciseModal.tsx | Alta | 30min |
| 2.1 | Reports.tsx | Média | 45min |
| 2.2 | PatientEvolutionReport.tsx | Média | 45min |
| 2.3 | CustomizableDashboard.tsx | Média | 30min |
| 2.4 | Analytics components | Média | 60min |
| 3.1-3.5 | Demais páginas | Baixa | 120min |

**Total Estimado**: ~7-8 horas de desenvolvimento

---

## Validação

Para cada página/componente melhorado, executar:
```bash
pnpm exec playwright test e2e/responsive-layout-validation.spec.ts
```

E testes específicos quando disponíveis.
