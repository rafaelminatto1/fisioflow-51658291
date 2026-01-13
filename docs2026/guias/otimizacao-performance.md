# Otimização de Performance

## Métricas Alvo

```
Lighthouse Score: >90
First Contentful Paint: <1.5s
Largest Contentful Paint: <2.5s
Time to Interactive: <3.5s
Cumulative Layout Shift: <0.1
First Input Delay: <100ms
```

## Otimizações Implementadas

### 1. Code Splitting

```typescript
// Lazy loading de rotas
const Patients = lazy(() => import('./pages/Patients'));
const Schedule = lazy(() => import('./pages/Schedule'));

// Suspense com fallback
<Suspense fallback={<LoadingSkeleton />}>
  <Patients />
</Suspense>
```

### 2. Vendor Chunks

```typescript
// vite.config.ts
manualChunks: {
  'react-vendor': ['react', 'react-dom', 'react-router-dom'],
  'supabase': ['@supabase/supabase-js'],
  'ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
}
```

### 3. TanStack Query Caching

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,     // 5 minutos
      gcTime: 1000 * 60 * 60 * 24,  // 24 horas
    },
  },
});
```

### 4. Image Optimization

```tsx
// Usar Next.js Image ou lazy loading
<img
  src={patient.avatar}
  loading="lazy"
  decoding="async"
  alt={patient.name}
/>
```

## Otimizações Recomendadas

### 1. Skeleton Screens

Adicionar em todas as listas:

```tsx
function PatientList() {
  const { data, isLoading } = usePatients();

  if (isLoading) return <LoadingSkeleton type="list" rows={10} />;
  return <div>{/* ... */}</div>;
}
```

### 2. Virtualização

Para listas longas:

```bash
pnpm add @tanstack/react-virtual
```

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

function PatientList({ patients }) {
  const parentRef = useRef();

  const virtualizer = useVirtualizer({
    count: patients.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      {virtualizer.getVirtualItems().map((virtualItem) => (
        <PatientCard key={virtualItem.key} patient={patients[virtualItem.index]} />
      ))}
    </div>
  );
}
```

### 3. Memoização

```tsx
import { memo } from 'react';

export const PatientCard = memo(({ patient }) => {
  // Só re-render se patient mudar
});

// Para valores computados
const sortedPatients = useMemo(
  () => patients.sort((a, b) => a.name.localeCompare(b.name)),
  [patients]
);

// Para callbacks
const handleClick = useCallback(
  (id) => () => onPatientClick(id),
  [onPatientClick]
);
```

### 4. Service Worker (PWA)

```typescript
// sw.ts
const CACHE_NAME = 'fisioflow-v1';
const ASSETS = ['/', '/manifest.json', /* ... */];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});
```

### 5. Compression

```typescript
// vite.config.ts
import viteCompression from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
    }),
  ],
});
```

## Monitoring

### Vercel Speed Insights

```tsx
import { SpeedInsights } from '@vercel/speed-insights/react';

<SpeedInsights />
```

### Web Vitals

```typescript
// lib/web-vitals.ts
import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals';

export function reportWebVitals() {
  onCLS(console.log);
  onFID(console.log);
  onFCP(console.log);
  onLCP(console.log);
  onTTFB(console.log);
}
```

## Performance Budget

```
HTML:        <10 KB
CSS:         <50 KB
JS:          <200 KB (gzipped)
Images:      <500 KB (total)
Total:       <1 MB (initial)
```

## Ferramentas

```bash
# Lighthouse CI
npx lighthouse http://localhost:8080

# Bundle analyzer
pnpm build:analyze

# Chrome DevTools Performance
# F12 → Performance → Record
```

## Recursos

- [Web Vitals](https://web.dev/vitals/)
- [Vite Performance](https://vitejs.dev/guide/performance.html)
- [React Optimization](https://react.dev/learn/render-and-commit)
