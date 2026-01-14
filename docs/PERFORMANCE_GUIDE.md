# 🚀 Guia de Otimização de Performance - FisioFlow

Este guia contém as melhores práticas e padrões para manter a performance do sistema FisioFlow em alto nível.

## 📊 Índice

1. [Componentes React](#componentes-react)
2. [Data Fetching](#data-fetching)
3. [Listas e Virtualização](#listas-e-virtualização)
4. [Imagens e Assets](#imagens-e-assets)
5. [Code Splitting](#code-splitting)
6. [Monitoramento](#monitoramento)

---

## 🎨 Componentes React

### React.memo para Componentes Puros

```typescript
// ❌ Ruim - Re-renderiza em qualquer atualização do pai
const PatientCard = ({ patient, onClick }) => {
  return <Card onClick={onClick}>{patient.name}</Card>;
};

// ✅ Bom - Só re-renderiza se props mudarem
const PatientCard = React.memo(({ patient, onClick }) => {
  return <Card onClick={onClick}>{patient.name}</Card>;
});
```

### useMemo para Cálculos Caros

```typescript
// ❌ Ruim - Recalcula a cada render
const sortedPatients = patients.sort((a, b) => a.name.localeCompare(b.name));

// ✅ Bom - Só recalcula se patients mudar
const sortedPatients = useMemo(() =>
  patients.sort((a, b) => a.name.localeCompare(b.name)),
  [patients]
);
```

### useCallback para Funções

```typescript
// ❌ Ruim - Nova função a cada render
const handleClick = () => navigate(`/patients/${id}`);

// ✅ Bom - Mesma função entre renders
const handleClick = useCallback(() =>
  navigate(`/patients/${id}`),
  [navigate, id]
);
```

---

## 📡 Data Fetching

### Configuração Otimizada do React Query

```typescript
useQuery({
  queryKey: ['patients', organizationId],
  queryFn: fetchPatients,
  staleTime: 1000 * 60 * 5,     // 5 min - dados considerados frescos
  gcTime: 1000 * 60 * 10,        // 10 min - tempo no cache
  refetchOnWindowFocus: false,    // Evita refetch desnecessário
  refetchOnReconnect: true,       // Refetch ao reconectar
});
```

### Query Batching

```typescript
// ❌ Ruim - Queries sequenciais (waterfall)
const patients = await useQuery({ queryKey: ['patients'], queryFn: fetchPatients });
const appointments = await useQuery({ queryKey: ['appointments'], queryFn: fetchAppointments });

// ✅ Bom - Queries em paralelo
const [patients, appointments] = await Promise.all([
  fetchPatients(),
  fetchAppointments()
]);
```

### Select com Campos Específicos

```typescript
// ❌ Ruim - Busca todos os campos
supabase.from('patients').select('*');

// ✅ Bom - Busca apenas campos necessários
supabase.from('patients').select('id, name, email, phone');
```

---

## 📋 Listas e Virtualização

### Listas Pequenas (< 50 itens)

```typescript
// Renderização simples é suficiente
{patients.map(patient => (
  <PatientCard key={patient.id} patient={patient} />
))}
```

### Listas Médias (50-200 itens)

```typescript
// Use LazyComponent para lazy loading
{patients.map(patient => (
  <LazyComponent
    key={patient.id}
    placeholder={<Skeleton />}
    rootMargin="300px"
  >
    <PatientCard patient={patient} />
  </LazyComponent>
))}
```

### Listas Grandes (> 200 itens)

```typescript
// Use VirtualList para renderizar apenas visíveis
import { VirtualList } from '@/components/ui/virtual-list';

<VirtualList
  items={patients}
  itemHeight={80}
  height={600}
  keyExtractor={(item) => item.id}
  renderItem={(patient) => <PatientCard patient={patient} />}
/>
```

---

## 🖼️ Imagens e Assets

### Lazy Loading de Imagens

```typescript
import { LazyImage } from '@/components/ui/virtual-list';

// Lazy loading com placeholder blur
<LazyImage
  src={patient.photo_url}
  alt={patient.name}
  width={100}
  height={100}
  placeholder="/placeholder-avatar.png"
/>
```

### Imagens Responsivas com Supabase

```typescript
// Gerar URLs otimizadas
const getOptimizedImageUrl = (path: string, width: number) => {
  const { data } = supabase.storage
    .from('photos')
    .getPublicUrl(path, {
      transform: {
        width,
        quality: 80,
        resize: 'cover'
      }
    });
  return data.publicUrl;
};
```

---

## ✂️ Code Splitting

### Lazy Loading de Rotas

```typescript
// Já implementado em src/routes.tsx
const Patients = lazy(() => import('./pages/Patients'));
const Schedule = lazy(() => import('./pages/Schedule'));
```

### Lazy Loading de Componentes Pesados

```typescript
// Componentes de análise dinâmica
const DynamicComparisonPage = lazy(() =>
  import('./components/analysis/dynamic/DynamicComparisonPage')
);

// Componentes de visão computacional
const ComputerVisionExercise = lazy(() =>
  import('./components/computer-vision/ComputerVisionExercise')
);
```

### Suspense Boundaries

```typescript
import { LoadingBoundary } from '@/components/common/LoadingBoundary';

<LoadingBoundary type="list" rows={10}>
  <ExpensiveComponent />
</LoadingBoundary>
```

---

## 📈 Monitoramento

### Em Desenvolvimento

O monitor de performance está disponível no console:

```javascript
// Marcar início/fim de operações
window.__perfMonitor.markStart('operacao');
// ... operação ...
window.__perfMonitor.markEnd('operacao');

// Ver estatísticas
window.__perfMonitor.getStats('operacao');

// Relatório geral
window.__perfMonitor.reportSummary();
```

### Hooks de Monitoramento

```typescript
import { useComponentPerformance } from '@/lib/monitoring/PerformanceMonitor';

function MyComponent() {
  useComponentPerformance('MyComponent');

  // ... resto do componente
}
```

### Métricas Importantes

| Métrica | Alvo | Aceitável |
|---------|------|-----------|
| First Contentful Paint | < 1.5s | < 2.5s |
| Time to Interactive | < 3s | < 5s |
| Largest Contentful Paint | < 2.5s | < 4s |
| Cumulative Layout Shift | < 0.1 | < 0.25 |
| First Input Delay | < 100ms | < 300ms |

---

## 🎯 Checklist de Otimização

### Antes de Commitar

- [ ] Componentes que recebem funções como props usam `useCallback`
- [ ] Componentes com cálculos complexos usam `useMemo`
- [ ] Componentes puros usam `React.memo`
- [ ] Queries têm `staleTime` e `gcTime` apropriados
- [ ] Listas grandes usam virtualização ou lazy loading
- [ ] Imagens usam lazy loading
- [ ] Código splitting para componentes pesados

### Revisão de Performance

- [ ] Verificar re-renders desnecessários com React DevTools
- [ ] Medir tempo de renderização de componentes críticos
- [ ] Verificar tamanho do bundle com `pnpm build:analyze`
- [ ] Testar em dispositivos móveis
- [ ] Verificar Network Tab para requests desnecessários

---

## 🛠️ Ferramentas

### Análise de Bundle

```bash
# Analisar tamanho do bundle
pnpm build:analyze
```

### React DevTools

- Profiler: Medir tempo de renderização
- Components: Ver re-renders e props

### Lighthouse

```bash
# Auditoria de performance
npx lighthouse https://your-app.com --view
```

---

## 📚 Recursos Adicionais

- [React Performance](https://react.dev/learn/render-and-commit)
- [React Query Performance](https://tanstack.com/query/latest/docs/react/reference/QueryClient)
- [Web Vitals](https://web.dev/vitals/)
- [Supabase Storage](https://supabase.com/docs/guides/storage)

---

**Última atualização:** Janeiro 2026
**Versão:** 1.0
