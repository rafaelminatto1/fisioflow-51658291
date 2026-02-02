# 02. Arquitetura Técnica

## 📐 Visão Geral da Arquitetura

O FisioFlow utiliza uma arquitetura **SPA (Single Page Application)** moderna, baseada em componentes, com backend fornecido pelo **Firebase**.

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTE (Browser)                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   React UI  │  │  State Mgmt  │  │   TanStack Query     │   │
│  │   (Pages)   │  │  (Zustand)   │  │   (Server State)     │   │
│  └─────────────┘  └──────────────┘  └──────────────────────┘   │
│           │                  │                    │              │
│           └──────────────────┴────────────────────┘              │
│                              │                                   │
│                    ┌─────────▼─────────┐                        │
│                    │  React Router v6  │                        │
│                    └─────────┬─────────┘                        │
└──────────────────────────────┼─────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Firebase SDK      │
                    │  (JS/TS Library)  │
                    └──────────┬──────────┘
                               │
┌──────────────────────────────┼─────────────────────────────────┐
│                      FIREBASE (Backend)                         │
├──────────────────────────────┼─────────────────────────────────┤
│  ┌─────────────┐  ┌─────────▼─────────┐  ┌─────────────────┐   │
│  │  Firestore │  │  Firebase Auth   │  │  Storage        │   │
│  │  Database  │  │  (Email/Google)   │  │  File Upload    │   │
│  └─────────────┘  └─────────┬─────────┘  └─────────────────┘   │
│           │                  │                    │              │
│           └──────────────────┴────────────────────┘              │
│                              │                                   │
│                    ┌─────────▼─────────┐                        │
│                    │  Cloud Functions   │                        │
│                    │  (Node.js)        │                        │
│                    └───────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │    External APIs    │
                    │  • OpenAI/Google AI │
                    │  • SendGrid/Resend  │
                    │  • Payment Gateways │
                    └─────────────────────┘
```

## 🏗️ Camadas da Arquitetura

### 1. Camada de Apresentação (UI Layer)

```typescript
// Estrutura de componentes
src/
├── components/
│   ├── ui/                    // Componentes base (shadcn/ui)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   └── ...
│   ├── evaluation/            // Componentes de domínio
│   │   ├── EvaluationFormBuilder.tsx
│   │   └── EvaluationTemplateSelector.tsx
│   └── layout/                // Layout components
│       ├── MainLayout.tsx
│       └── Sidebar.tsx
└── pages/                     // Páginas (rotas)
    ├── Patients.tsx
    ├── Schedule.tsx
    └── ...
```

**Padrões:**
- **Componentes Funcionais** com Hooks
- **Composition** sobre herança
- **Props** fortemente tipadas com TypeScript
- **Render Props** e **Custom Hooks** para lógica compartilhada

### 2. Camada de Estado (State Layer)

#### Client State (Zustand)
```typescript
// stores/useAppStore.ts
interface AppStore {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  setTheme: (theme: string) => void;
  toggleSidebar: () => void;
}
```

#### Server State (TanStack Query)
```typescript
// hooks/usePatients.ts
export function usePatients() {
  return useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, 'patients'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}
```

#### Form State (React Hook Form + Zod)
```typescript
// validations/patientSchema.ts
const patientSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  phone: z.string().regex(/^\d{10,11}$/),
});

// components/PatientForm.tsx
const methods = useForm({
  resolver: zodResolver(patientSchema),
});
```

### 3. Camada de Dados (Data Layer)

```typescript
// integrations/firebase/app.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const app = initializeApp({ ... });
export const db = getFirestore(app);
export const auth = getAuth(app);

// Serviços: patientsApi, appointmentsApi etc. usam
// getDocs, getDoc, addDoc, updateDoc, deleteDoc do Firestore
export const patientsApi = {
  getAll: () => getDocs(collection(db, 'patients')),
  getById: (id: string) => getDoc(doc(db, 'patients', id)),
  create: (data) => addDoc(collection(db, 'patients'), data),
  update: (id: string, data) => updateDoc(doc(db, 'patients', id), data),
  delete: (id: string) => deleteDoc(doc(db, 'patients', id)),
};
```

### 4. Camada de Serviços (Service Layer)

#### Cloud Functions (Firebase)
```typescript
// functions/src/index.ts
export const prescribeExercise = functions.https.onCall(async (data, context) => {
  const { patientId, exerciseIds } = data;
  const prescription = await generatePrescription(patientId, exerciseIds);
  return prescription;
});
```

## 🔐 Segurança e Autenticação

### Flow de Autenticação

```
┌─────────┐     Login      ┌─────────────┐     ┌──────────────┐
│ Cliente │────────────────▶│ Firebase    │─────▶│ Firestore    │
│         │◀────────────────│ Auth        │     │ (RLS Check)  │
└─────────┘    JWT + User   └─────────────┘     └──────────────┘
     │
     │ Armazena JWT
     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    localStorage (Browser)                        │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  {                                                     │    │
│  │    "access_token": "eyJhbGciOiJIUzI1...",            │    │
│  │    "refresh_token": "eyJhbGciOiJIUzI1...",           │    │
│  │    "user": { "id": "...", "email": "...", "role": "physiotherapist" }│
│  │  }                                                     │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Row Level Security (RLS)

```sql
-- Exemplo de RLS Policy
CREATE POLICY "users_can_view_own_patients"
ON patients
FOR SELECT
USING (
  organization_id = auth.jwt()->>'organization_id'
  OR auth.jwt()->>'role' = 'admin'
);

CREATE POLICY "therapists_can_update_patients"
ON patients
FOR UPDATE
USING (
  organization_id = auth.jwt()->>'organization_id'
)
WITH CHECK (
  organization_id = auth.jwt()->>'organization_id'
);
```

## 🔄 Real-time Subscriptions

```typescript
// hooks/useRealtimePatients.ts
export function useRealtimePatients() {
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'patients'),
      () => queryClient.invalidateQueries(['patients']),
      (err) => console.error(err)
    );

    return () => unsubscribe();
  }, []);
}
```

## 📦 Estrutura de Build

```javascript
// vite.config.ts
export default defineConfig({
  plugins: [react(), svgr()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'firebase': ['firebase/app', 'firebase/firestore', 'firebase/auth'],
          'ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', /* ... */],
          'charts': ['recharts'],
          'forms': ['react-hook-form', 'zod', '@hookform/resolvers'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    exclude: ['@cornerstonejs/core', '@mediapipe/pose'],
  },
});
```

## 🎨 Design System

### Hierarquia de Componentes

```
Base UI Components (shadcn/ui)
├── Primitive Components (Radix UI)
│   ├── Dialog
│   ├── Dropdown Menu
│   ├── Select
│   └── ...
└── Styled Components
    ├── Button (variants: default, destructive, outline, ghost)
    ├── Input
    ├── Card
    └── ...

Domain Components
├── PatientCard
├── AppointmentCalendar
├── ExerciseLibrary
└── ...

Page Components
├── PatientsPage
├── SchedulePage
└── ...
```

### Threading System

```typescript
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0d7ff2',  // Azul profissional
          50: '#e6f6ff',
          100: '#b3dcff',
          // ...
        },
        pain: {
          0: '#4ade80',   // Verde (sem dor)
          5: '#fbbf24',   // Amarelo (dor moderada)
          10: '#ef4444',  // Vermelho (dor intensa)
        },
      },
    },
  },
};
```

## 🚀 Performance e Otimizações

### Lazy Loading

```typescript
// App.tsx
const Patients = lazy(() => import('./pages/Patients'));
const Schedule = lazy(() => import('./pages/Schedule'));
const MedicalRecord = lazy(() => import('./pages/MedicalRecord'));

function App() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <Routes>
        <Route path="/patients" element={<Patients />} />
        <Route path="/schedule" element={<Schedule />} />
        {/* ... */}
      </Routes>
    </Suspense>
  );
}
```

### Cache Strategy

```typescript
// lib/queryClient.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,     // 5 minutos
      gcTime: 1000 * 60 * 60 * 24,  // 24 horas
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});

// Persistência com IndexedDB
const persistor = createSyncStoragePersister({
  storage: window.localStorage,
});
```

## 📊 Monitoring e Observabilidade

```typescript
// main.tsx
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay(),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
});

// Firebase Analytics (opcional)
// import { getAnalytics, logEvent } from 'firebase/analytics';
```

## 🧪 Testing Strategy

```
┌─────────────────────────────────────────────────────────┐
│                   Testing Pyramid                       │
├─────────────────────────────────────────────────────────┤
│                    ▲▲▲▲▲▲▲▲▲                           │
│                   ▲ E2E Tests ▲                        │
│                  ▲ Playwright  ▲                       │
│                 ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲                       │
│                ▲ Integration Tests ▲                   │
│               ▲     Vitest + RTL     ▲                 │
│              ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲                 │
│             ▲   Unit Tests   ▲                          │
│            ▲    Vitest      ▲                           │
│           ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲                           │
│          ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲                               │
│         ▲▲▲▲▲▲▲▲▲▲▲▲                                   │
└─────────────────────────────────────────────────────────┘
```

## 🔗 Recursos Relacionados

- [Estrutura do Projeto](./04-estrutura-projeto.md)
- [Banco de Dados](./05-banco-dados.md)
- [Autenticação e Segurança](./06-autenticacao-seguranca.md)
- [APIs e Integrações](./07-api-integracoes.md)
