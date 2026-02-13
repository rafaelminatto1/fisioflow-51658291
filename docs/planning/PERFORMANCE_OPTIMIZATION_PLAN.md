# Plano de Otimização de Performance - FisioFlow

## Análise Inicial

### Páginas Identificadas para Otimização

1. **PatientEvolution.tsx** ✅ (JÁ OTIMIZADA)
   - Múltiplos hooks de dados sem cache otimizado
   - Carregamento de dados desnecessários
   - **Status**: Otimizado com useEvolutionDataOptimized

2. **PatientProfilePage.tsx** 🔄 (EM ANDAMENTO)
   - Múltiplas queries sem lazy loading
   - Componentes pesados carregados sincronamente
   - Sem suspense boundaries

3. **Schedule.tsx** 🔄 (PRIORIDADE ALTA)
   - Lista de agendamentos pode ser muito longa
   - Filtros complexos sem memoização
   - Necessita virtualização

4. **Exercises.tsx** 🔄 (PRIORIDADE MÉDIA)
   - Biblioteca de exercícios pode ser grande
   - Já tem alguma memoização, pode ser melhorado

5. **Financial.tsx** 🔄 (PRIORIDADE MÉDIA)
   - Cálculos de estatísticas sem cache
   - IA generation sem debouncing

## Estratégias de Otimização Implementadas

### 1. Cache Inteligente (React Query)
- `staleTime` e `gcTime` configurados por tipo de dado
- Query keys estruturadas para invalidação granular
- Prefetch em background para próxima aba

### 2. Lazy Loading Aprimorado
- Componentes pesados carregados sob demanda
- Suspense boundaries granulares
- Code splitting por rota

### 3. Memoização
- React.memo para componentes estáticos
- useMemo para valores computados
- useCallback para handlers de eventos

### 4. Virtualização
- Listas longas com react-window ou similar
- Paginação para histórico

## Próximos Passos

### Fase 1: PatientProfilePage
- [ ] Implementar lazy loading para componentes pesados
- [ ] Adicionar Suspense boundaries por aba
- [ ] Otimizar queries com cache configurado

### Fase 2: Schedule
- [ ] Implementar virtualização para lista de agendamentos
- [ ] Memoizar filtros e ordenação
- [ ] Adicionar prefetch para próximos dias

### Fase 3: Exercises
- [ ] Virtualizar lista de exercícios
- [ ] Lazy loading para categorias
- [ ] Cache de busca

### Fase 4: Financial
- [ ] Memoizar cálculos de estatísticas
- [ ] Debounce para IA generation
- [ ] Paginação para transações

## Métricas de Sucesso

- Tempo de Carregamento Inicial (FCP): < 1.5s
- Time to Interactive (TTI): < 3.5s
- Total Blocking Time (TBT): < 300ms
- Cumulative Layout Shift (CLS): < 0.1
- First Input Delay (FID): < 100ms

## Configurações de Cache

```typescript
// Dados críticos - mudam frequentemente
PATIENT: { staleTime: 5min, gcTime: 30min }
APPOINTMENT: { staleTime: 2min, gcTime: 10min }

// Dados de evolução
SOAP_RECORDS: { staleTime: 10min, gcTime: 20min }
DRAFTS: { staleTime: 1min, gcTime: 5min }

// Dados secundários - mudam pouco
GOALS: { staleTime: 10min, gcTime: 30min }
PATHOLOGIES: { staleTime: 20min, gcTime: 45min }

// Medições
MEASUREMENTS: { staleTime: 5min, gcTime: 15min }
REQUIRED_MEASUREMENTS: { staleTime: 30min, gcTime: 1h }

// Histórico
SURGERIES: { staleTime: 15min, gcTime: 30min }
MEDICAL_RETURNS: { staleTime: 10min, gcTime: 20min }
```

## Implementação

### Arquivos Criados

1. `src/hooks/evolution/useEvolutionDataOptimized.ts`
   - Hook principal com cache otimizado
   - Prefetch inteligente
   - Query keys factory

2. `src/hooks/evolution/index.ts`
   - Export centralizado dos hooks de evolução

3. `src/components/evolution/OptimizedEvolutionComponents.tsx`
   - Componentes memoizados
   - Loading skeletons otimizados
   - Section boundaries

4. `src/components/evolution/SuspenseConfig.tsx`
   - Suspense boundaries por tipo de dado
   - Fallbacks otimizados

### Próximos Arquivos a Criar

- `src/hooks/useScheduleOptimized.ts`
- `src/hooks/usePatientProfileOptimized.ts`
- `src/components/schedule/VirtualizedScheduleList.tsx`
- `src/components/patients/OptimizedPatientProfile.tsx`
