# FisioFlow - System Architecture

Comprehensive architecture documentation for the FisioFlow physical therapy management platform.

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Data Flow](#data-flow)
- [Security Model](#security-model)
- [Deployment Architecture](#deployment-architecture)
- [Component Architecture](#component-architecture)
- [State Management](#state-management)
- [API Layer](#api-layer)
- [Testing Strategy](#testing-strategy)

## Overview

FisioFlow is a comprehensive physical therapy management platform designed for Brazilian clinics. The system provides:

- **Patient Management**: Complete patient records, history, and tracking
- **Appointment Scheduling**: Calendar-based scheduling with real-time updates
- **Clinical Documentation**: SOAP notes, evolution tracking, assessments
- **Exercise Prescriptions**: Exercise plans with video demonstrations
- **Financial Management**: Billing, payments, and financial reports
- **Analytics & Reporting**: Patient progress, clinic performance metrics
- **Communication**: WhatsApp integration for patient engagement
- **AI-Powered Features**: Clinical insights, exercise suggestions, SOAP generation

## Technology Stack

### Frontend

| Technology | Purpose | Version |
|-------------|---------|---------|
| **React** | UI Framework | 18.x |
| **TypeScript** | Type Safety | 5.x |
| **Vite** | Build Tool | Latest |
| **React Router** | Routing | v6.x |
| **TanStack Query** | Server State | v5.x |
| **Zod** | Runtime Validation | Latest |
| **React Hook Form** | Form Management | Latest |
| **Framer Motion** | Animations | Latest |
| **Radix UI** | Component Library | Latest |
| **TailwindCSS** | Styling | Latest |
| **Lucide React** | Icons | Latest |

### Backend

| Technology | Purpose | Version |
|-------------|---------|---------|
| **Firebase** | BaaS Platform | Latest |
| **Cloud Functions** | Serverless Compute | Node 18+ |
| **Firestore** | NoSQL Database | Native Mode |
| **Cloud Storage** | File Storage | - |
| **Cloud Storage for Firebase** | File Upload | - |
| **Google Secret Manager** | Secrets | - |

### Additional Services

| Service | Purpose |
|---------|---------|
| **Supabase** | Realtime database (legacy) |
| **Inngest** | Workflow automation |
| **Resend** | Email service |
| **Ably** | Real-time notifications |
| **Sentry** | Error tracking |
| **Vercel** | Hosting & deployment |

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (React Web App)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                      │
│  │ Routes       │  │ Components   │  │ Pages        │                      │
│  │ (Router v6)   │  │ (shadcn/ui)   │  │ (lazy load)   │                      │
│  └──────────────┘  └──────────────┘  └──────────────┘                      │
│         │                     │                    │                         │
│  ┌────▼─────────────────────▼──────────────┐                    │
│  │       State Management                                │                    │
│  │  ┌────────────────────────────────────────┐               │                    │
│  │  │ TanStack Query (Server State)      │               │                    │
│  │  │ React Context (Auth, Theme, etc.)    │               │                    │
│  │  └────────────────────────────────────────┘               │                    │
│  └───────────────────────────────────────────────────────────┘                    │
│                           │                                          │
│  ┌──────────────────────▼──────────────────────────────────────┐    │
│  │                   API Layer                                  │    │
│  │  ┌──────────────────────────────────────────────────┐    │    │
│  │  │ Firebase SDK (Firestore, Auth, Storage)            │    │    │
│  │  │ Cloud Functions (onCall)                        │    │    │
│  │  │ Integration Layer (Supabase, Inngest, etc.)       │    │    │
│  │  └──────────────────────────────────────────────────┘    │    │
│  └───────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌───────────────────────────────────────────────────────────────────┐
│                      BACKEND SERVICES                           │
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                   │
│  │ Firestore   │  │ Cloud       │  │ Cloud       │                   │
│  │ (NoSQL DB)  │  │ Functions   │  │ Storage     │                   │
│  │             │  │ (Node.js)   │  │ (Files)     │                   │
│  └─────────────┘  └─────────────┘  └─────────────┘                   │
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                   │
│  │ Supabase    │  │ Inngest     │  │ Ably         │                   │
│  │ (Realtime)  │  │ (Workflows)  │  │ (Push)       │                   │
│  └─────────────┘  └─────────────┘  └─────────────┘                   │
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐                                        │
│  │ Resend      │  │ Sentry      │                                        │
│  │ (Email)     │  │ (Errors)    │                                        │
│  └─────────────�  └─────────────┘                                        │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Patient Creation Flow

```
User Action
    │
    ▼
┌─────────────┐
│ NewPatient  │
│  Component  │
└─────┬───────┘
      │
      ▼
┌──────────────────────┐
│ usePatients Hook     │
│ (useQuery)           │
└─────┬────────────────┘
      │
      ▼
┌──────────────────────┐
│ Cloud Function       │
│ - Validate with Zod │
│ - Save to Firestore │
│ - Send notification│
└─────┬────────────────┘
      │
      ▼
┌──────────────────────┐
│ Realtime Update      │
│ (Ably)               │
└─────┬────────────────┘
      │
      ▼
┌──────────────────────┐
│ UI Updates           │
│ - Invalidate query  │
│ - Show notification│
└─────────────────────┘
```

### Appointment Scheduling Flow

```
User Drag & Drop
    │
    ▼
┌─────────────┐
│ CalendarView │
│  Component  │
└─────┬───────┘
      │
      ▼
┌──────────────────────┐
│ onDragEnd            │
│ - Optimistic update  │
│ - Call Cloud Function│
└─────┬────────────────┘
      │
      ▼
┌──────────────────────┐
│ Cloud Function       │
│ - Check availability│
│ - Save appointment │
│ - Update schedule  │
└─────┬────────────────┘
      │
      ▼
┌──────────────────────┐
│ Realtime Sync        │
│ (Supabase/Ably)     │
└─────┬────────────────┘
      │
      ▼
┌──────────────────────┐
│ Schedule Updated     │
│ - Reflect in UI       │
└─────────────────────┘
```

## Security Model

### Authentication & Authorization

```
┌──────────────┐
│ Firebase Auth  │
│ (JWT Tokens)  │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ Auth Context        │
│ - User profile     │
│ - Organization ID  │
│ - Role             │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Middleware          │
│ - Auth validation │
│ - Role check       │
│ - Org isolation   │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Firestore Rules     │
│ - Access control   │
│ - Data validation │
└─────────────────────┘
```

### Security Layers

1. **Client-Side**
   - Firebase Authentication with JWT tokens
   - React Query caching with invalidation
   - Input validation with Zod

2. **API Layer**
   - Auth middleware in Cloud Functions
   - Role-based access control (RBAC)
   - Organization isolation

3. **Database**
   - Firestore Security Rules
   - Field-level encryption
   - Index-based queries

4. **Infrastructure**
   - Google Secret Manager for secrets
   - App Check for request verification
   - Rate limiting per user
   - Audit logging

### Firestore Security Rules

Key rules implemented:

```javascript
// Organizations - Admin/Professional only
match /organizations/{orgId} {
  allow read: if isAdmin() || isProfessional();
  allow write: if isAdmin() || isProfessional();
}

// Patients - Limited read access
match /patients {
  allow list: if isAdmin() || isProfessional();
  allow get: if isAdmin() || isProfessional() || isPatient();
}

// Appointments - Role-based access
match /appointments {
  allow list: if isAdmin() || isProfessional();
  allow get: if isAdmin() || isProfessional() || isPatient();
}
```

## Deployment Architecture

### Frontend Deployment

```
┌────────────────────────────────────────────────────────┐
│                    Vercel Edge Network              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │ Static   │  │ Serverless │  │ Edge      │               │
│  │ Assets  │  │ Functions │  │ Functions│               │
│  └──────────┘  └───────────┘  └──────────┘               │
└────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────┐
│                  Firebase Hosting                     │
│  - SPA hosting                                        │
│  - Redirects configured                              │
│  - Headers for CORS                                   │
└────────────────────────────────────────────────────────┘
```

### Backend Deployment

```
┌────────────────────────────────────────────────────────┐
│              Google Cloud Platform                   │
│                                                       │
│  ┌─────────────┐  ┌─────────────┐                     │
│  │ Cloud       │  │ Cloud       │                     │
│  │ Functions   │  │ Firestore   │                     │
│  │ (Node 18)  │  │ (Native)    │                     │
│  └─────────────┘  └─────────────┘                     │
│                                                       │
│  ┌─────────────┐  ┌─────────────┐                     │
│  │ Cloud       │  │ Cloud       │                     │
│  │ Storage     │  │ Secret      │                     │
│  └─────────────�  │ Manager    │                     │
│                     └─────────────┘                     │
└────────────────────────────────────────────────────────┘
```

### CI/CD Pipeline

```
Git Push
    │
    ▼
┌──────────────┐
│ GitHub Actions│
│ (CI/CD)      │
└──────┬───────┘
       │
       ├─────────────┬──────────────┬─────────────┐
       ▼             ▼              ▼             ▼
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│ Lint    │  │ Type    │  │ Unit    │  │ Build   │
│ Checks │  │ Checks │  │ Tests   │  │ Bundle  │
└────┬───┘  └─────────┘  └─────────┘  └────┬─────┘
       │                                         │
       ▼                                         ▼
┌──────────────────────────────────────────────────┐
│              Deploy to Vercel                     │
│  - Preview URL                                 │
│  - Production deployment                         │
└──────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│              Firebase Deploy                     │
│  - Cloud Functions                             │
│  - Firestore Rules                             │
└──────────────────────────────────────────────────┘
```

## Component Architecture

### Component Hierarchy

```
App
├── ErrorBoundary (root error boundary)
│   └── AuthProvider
│       └── QueryClientProvider (TanStack Query)
│           └── Router (React Router v6)
│               └── RouteErrorBoundary
│                   ├── ProtectedRoute (auth check)
│                   │   ├── Routes (lazy loaded)
│                   │   │   ├── Dashboard
│                   │   │   ├── Patients
│                   │   │   ├── Schedule
│                   │   │   ├── Evolution
│                   │   │   └── ...
│                   │
│                   │   └── Layout
│                   │       ├── Sidebar
│                   │       ├── Header
│                   │       ├── Main Content
│                   │       └── Footer
│                   │
│                   └── ErrorBoundary (route-specific)
├── Toast Provider (notifications)
└── Dialog Provider (modals)
```

### Component Patterns

#### 1. Container/Presentational Pattern

```typescript
// Container component - Logic
export function PatientList() {
  const { data, loading, error } = usePatients();

  if (loading) return <PatientListSkeleton />;
  if (error) return <ErrorState error={error} />;

  return <PatientListContent patients={data} />;
}

// Presentational component - UI only
export function PatientListContent({ patients }: { patients: Patient[] }) {
  return (
    <div>
      {patients.map(patient => (
        <PatientCard key={patient.id} patient={patient} />
      ))}
    </div>
  );
}
```

#### 2. Compound Component Pattern

```typescript
// Card component with multiple sub-components
export function AppointmentCard({ appointment, variant }: Props) {
  return (
    <Card>
      <AppointmentHeader appointment={appointment} />
      <AppointmentBody appointment={appointment} />
      <AppointmentActions appointment={appointment} />
    </Card>
);
}
```

#### 3. Render Prop Pattern

```typescript
// Flexible rendering via props
export function DataDisplay<T>({ data, renderItem }: DataDisplayProps<T>) {
  return (
    <div>
      {data.map((item, index) => renderItem(item, index))}
    </div>
  );
}
```

#### 4. Higher-Order Component Pattern

```typescript
// withErrorBoundary HOC
export function withErrorBoundary<P>(
  Component: ComponentType<P>,
  options?: WithErrorBoundaryOptions
): ComponentType<P> {
  return (props) => (
    <ErrorBoundary {...options}>
      <Component {...props} />
    </ErrorBoundary>
  );
}
```

## State Management

### Server State (TanStack Query)

```typescript
// Queries
const { data: patient } = useQuery({
  queryKey: ['patient', id],
  queryFn: () => getPatient(id),
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// Mutations
const createPatient = useMutation({
  mutationFn: (data: PatientFormData) => createPatient(data),
  onSuccess: () => {
    queryClient.invalidateQueries(['patients']);
  },
});
```

### Client State (React Context)

```typescript
// Auth Context
interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  organizationId: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);
```

### Local State (useState)

```typescript
// Component-level state
const [isOpen, setIsOpen] = useState(false);
const [selectedItem, setSelectedItem] = useState<Item | null>(null);
```

### Form State (React Hook Form + Zod)

```typescript
const form = useForm<LoginFormData>({
  resolver: zodResolver(loginSchema),
  defaultValues: { email: '', password: '' },
});

const onSubmit = (data: LoginFormData) => {
  signIn(data.email, data.password);
};
```

## API Layer

### Cloud Functions Structure

```
functions/
├── src/
│   ├── api/                    # HTTP endpoints (onRequest)
│   │   ├── appointments.ts
│   │   ├── patients.ts
│   │   ├── financial.ts
│   │   ├── medical-records.ts
│   │   ├── profile.ts
│   │   └── ...
│   │
│   ├── middleware/             # Reusable middleware
│   │   ├── auth.ts
│   │   ├── app-check.ts
│   │   ├── rate-limit.ts
│   │   └── error-handler.ts
│   │
│   ├── lib/                    # Shared libraries
│   │   ├── database/           # Database operations
│   │   ├── ai/                 # AI/ML functions
│   │   ├── communications/     # External integrations
│   │   └── migrations/         # Database migrations
│   │
│   └── index.ts                # Entry point
│
├── .env.yaml                  # Environment variables
└── package.json              # Dependencies
```

### API Endpoint Pattern

```typescript
// Callable function (client-side)
export const someFunction = onCall(
  { secrets: ['API_KEY'], vpcConnector: 'cloudsql-connector' },
  async (request) => {
    // 1. Validate request with Zod
    const validationResult = schema.safeParse(request.data);
    if (!validationResult.success) {
      throw new HttpsError('invalid-argument', validationResult.error);
    }

    // 2. Check authorization
    const authContext = getAuthContext(request);
    if (!canAccess(authContext, request.data)) {
      throw new HttpsError('permission-denied');
    }

    // 3. Execute business logic
    const result = await executeOperation(request.data);

    // 4. Return response
    return { success: true, data: result };
  }
);
```

## Testing Strategy

### Unit Tests (Vitest)

**Target:** 70% coverage threshold

```
src/
├── components/
│   ├── __tests__/
│   │   ├── AppointmentCard.test.tsx
│   │   ├── LoginForm.test.tsx
│   │   └── ...
│   ├── ui/__tests__/
│   │   ├── button.test.tsx
│   │   ├── input.test.tsx
│   │   └── ...
│   └── ...
├── hooks/__tests__/
│   ├── useAuth.test.tsx
│   ├── usePatients.test.tsx
│   └── ...
└── lib/__tests__/
    ├── validations/
    │   ├── api.test.ts
    │   └── ...
    └── ...
```

### E2E Tests (Playwright)

**Critical Flows:**

1. **Authentication Flow**
   - Login
   - Logout
   - Token refresh

2. **Patient Management**
   - Create patient
   - Update patient
   - Search patients

3. **Appointment Scheduling**
   - Create appointment
   - Drag to reschedule
   - Cancel appointment

4. **Clinical Documentation**
   - Create SOAP note
   - Add measurements
   - Track evolution

5. **Accessibility**
   - Keyboard navigation
   - Screen reader support
   - Focus management

```
e2e/
├── auth.spec.ts
├── patients.spec.ts
├── appointment-creation-flow.spec.ts
└── ...
```

### Integration Tests

```
src/test/integration/
├── workflow.test.ts
└── ...
```

## Performance Optimization

### Code Splitting

```typescript
// Lazy load routes
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Patients = lazy(() => import('./pages/Patients'));

// Prefetch critical routes
const Schedule = lazy(() => import(
  /* webpackChunkName: "schedule" */
  /* webpackPrefetch: true */
  './pages/Schedule'
));
```

### Virtual Scrolling

```typescript
import { VirtualList } from '@/components/performance/VirtualList';

<VirtualList
  items={patients}
  itemHeight={80}
  height={600}
  renderItem={(patient) => <PatientCard patient={patient} />}
/>
```

### Memoization

```typescript
export const AppointmentCard = memo(
  ({ appointment, onClick }: Props) => {
    // Component implementation
  },
  arePropsEqual
);
```

## Monitoring & Observability

### Error Tracking (Sentry)

```typescript
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  beforeSend(event, hint) {
    // Filter sensitive data
    if (event.request?.headers) {
      delete event.request.headers['cookie'];
    }
  },
});
```

### Logging

```typescript
import { logger } from '@/lib/errors/logger';

logger.info('User action', { action: 'login', userId }, 'AuthContext');
logger.warn('Validation failed', { errors }, 'Validation');
logger.error('API error', error, 'APIClient');
```

### Performance Monitoring

```typescript
import { useRenderPerf } from '@/components/performance/utils';

function MyComponent() {
  const perf = useRenderPerf('MyComponent');

  perf.start();
  // Component renders
  perf.end(); // Logs render time in dev
}
```

## Development Workflow

### Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm run test

# Run E2E tests
npm run test:e2e
```

### Code Quality

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Format check
npm run format:check

# Fix all issues
npm run lint:fix && npm run format:write
```

### Pre-commit Hooks

```bash
# Run on commit
- ESLint
- TypeScript check
- Type checking
- Unit tests (affected files)
```

## Scaling Considerations

### Database

- **Firestore**: Scales to 1 document/second write
- **Cloud SQL**: Used for complex queries, scales with instance size

### Functions

- **Cloud Functions**: Scales automatically with load
- **Concurrent instances**: Up to 1000 by default
- **Memory**: Up to 2GB per instance
- **Timeout**: Up to 9 minutes (configurable)

### Storage

- **Cloud Storage**: Scales to petabyte-level
- **CDN**: Firebase CDN for global distribution

## Future Architecture Considerations

### Potential Improvements

1. **Microservices**: Split into separate services for different domains
2. **Event Sourcing**: Implement event sourcing for audit trail
3. **CQRS**: Separate read/write models for complex queries
4. **GraphQL**: Consider GraphQL for flexible API queries
5. **Event-Driven**: Enhanced pub/sub with Ably

### Scalability Plan

1. **Database**:
   - Implement data archival for old records
   - Use composite indexes for complex queries
   - Consider sharding for very large datasets

2. **API**:
   - Implement API Gateway for routing
   - Add caching layer (Redis)
   - Implement rate limiting per organization

3. **Frontend**:
   - Implement service worker caching
   - Add offline mode support
   - Implement lazy loading for heavy components

---

## Document Index

- [Type System Documentation](./src/types/README.md)
- [Validation Schemas Guide](./src/lib/validators/README.md)
- [Accessibility Utilities](./src/lib/a11y/README.md)

---

**Last Updated:** 2025-01-29
**Version:** 2.0.0
