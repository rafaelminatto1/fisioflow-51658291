# Otimizações de Performance - Página de Evolução

## Resumo das Melhorias Implementadas

### 1. Cache e StaleTime Otimizados

**Arquivo:** `src/hooks/usePatientEvolution.ts`

- **usePatientSurgeries**: `staleTime` aumentado de 10min para 15min + `gcTime` de 30min
- **usePatientGoals**: `staleTime` mantido em 10min + `gcTime` de 30min
- **usePatientPathologies**: `staleTime` aumentado de 10min para 20min + `gcTime` de 45min
- **useEvolutionMeasurements**: `staleTime` reduzido para 5min + `gcTime` de 15min (podem ser adicionadas durante a sessão)
- **useRequiredMeasurements**: `staleTime` aumentado para 30min + `gcTime` de 1 hora

**Arquivo:** `src/hooks/useSoapRecords.ts`

- **useSoapRecords**: `staleTime` aumentado de 5min para 10min + `gcTime` de 20min

### 2. Carregamento Diferido de Dados

**Arquivo:** `src/pages/PatientEvolution.tsx`

- Redução do limite de medições na carga inicial: de 120 para 50
- Medições obrigatórias (`useRequiredMeasurements`) agora só carregam quando:
  - A aba "avaliação" está ativa, OU
  - A aba "evolução" está ativa

```typescript
const shouldLoadRequiredMeasurements = activeTab === 'avaliacao' || activeTab === 'evolucao';
const { data: requiredMeasurements = [] } = useRequiredMeasurements(
  shouldLoadRequiredMeasurements ? activePathologies.map(p => p.pathology_name) : []
);
```

### 3. Prefetch em Background

**Arquivo:** `src/pages/PatientEvolution.tsx`

Adicionado `prefetch` de dados em background usando `startTransition`:

```typescript
useEffect(() => {
  if (patientId) {
    startTransition(() => {
      queryClient.prefetchQuery({
        queryKey: ['patient-surgeries', patientId],
        staleTime: 1000 * 60 * 15,
      });
      queryClient.prefetchQuery({
        queryKey: ['patient-goals', patientId],
        staleTime: 1000 * 60 * 15,
      });
    });
  }
}, [patientId, queryClient]);
```

### 4. Memoização Otimizada

**Arquivo:** `src/components/evolution/EvolutionHeader.tsx`

Adicionada comparação personalizada no `memo` do `EvolutionHeader`:

```typescript
memo(Component, (prevProps, nextProps) => {
  // Retorna true se props relevantes não mudaram
  return (
    prevProps.patient === nextProps.patient &&
    prevProps.isSaving === nextProps.isSaving &&
    // ... outras comparações
  );
});
```

### 5. Novo Hook para Carregamento Diferido

**Arquivo:** `src/hooks/evolution/useEvolutionDeferredData.ts`

Novo hook que carrega dados secundários de forma inteligente baseado na aba ativa:

- **evolucao**: carrega dados mínimos (pathologies, goals)
- **avaliacao**: carrega medições e medições obrigatórias
- **tratamento**: carrega dados de tratamento
- **historico**: carrega todos os dados históricos
- **assistente**: mínimo de dados

## Impacto Esperado

1. **Tempo de Carregamento Inicial Reduzido**: ~30-40% mais rápido
   - Menos dados carregados imediatamente
   - Queries secundárias carregadas sob demanda

2. **Menor Uso de Rede**: ~20-30% menos dados transferidos
   - Cache mais longo evita requisições repetidas
   - Dados históricos carregados apenas quando necessário

3. **UI Mais Responsiva**: Menor blocking da thread principal
   - `startTransition` para prefetch não bloqueia interações
   - Lazy loading de componentes pesados já existente

4. **Menor Pressão no Firestore**: Menos leituras simultâneas
   - Queries carregadas progressivamente
   - Cache mais eficiente no cliente

## Próximas Otimizações Sugeridas

1. **Virtualização de Listas**: Implementar `react-window` para listas longas de evoluções anteriores
2. **Suspense Boundaries**: Adicionar mais boundaries granulares para melhor perceived performance
3. **Service Worker Cache**: Implementar cache offline para dados frequentemente acessados
4. **Aggressive Prefetch**: Prefetch dados do próximo paciente provável baseado na agenda
