# FisioFlow - Architecture Documentation

Detailed system architecture for FisioFlow.

## Table of Contents

1. [System Overview](#system-overview)
2. [Frontend Architecture](#frontend-architecture)
3. [Backend Architecture](#backend-architecture)
4. [Database Design](#database-design)
5. [Security](#security)
6. [Realtime Architecture](#realtime-architecture)
7. [Scalability](#scalability)

---

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │   Web    │  │  iOS App │  │Android App│  │  PWA     │  │
│  │(React)   │  │(Capacitor)│  │(Capacitor)│  │(Vite)    │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
└───────┼────────────┼────────────┼────────────┼────────────┘
        │            │            │            │
        └────────────┴────────────┴────────────┘
                             │
        ┌────────────────────┴────────────────────┐
        │              Firebase Hosting            │
        └────────────────────┬────────────────────┘
                             │
        ┌────────────────────┴────────────────────┐
        │           Firebase CDN / Edge            │
        └────────────────────┬────────────────────┘
                             │
        ┌────────────────────┴────────────────────┐
        │                  API Layer               │
        │  ┌──────────────────────────────────┐   │
        │  │     Firebase Data Connect        │   │
        │  │     (GraphQL + gRPC)             │   │
        │  └──────────┬───────────────────────┘   │
        │             │                            │
        │  ┌──────────▼───────────────────────┐   │
        │  │      Cloud Functions (v2)        │   │
        │  │   - API endpoints                │   │
        │  │   - Webhooks                     │   │
        │  │   - Scheduled jobs               │   │
        │  └──────────┬───────────────────────┘   │
        └─────────────┼────────────────────────────┘
                      │
        ┌─────────────┴─────────────────────┐
        │            Service Layer           │
        │  ┌──────────┐  ┌──────────┐       │
        │  │Firebase  │  │  Ably    │  Stripe│
        │  │Services  │  │Realtime │  │ API  │
        │  └──────────┘  └──────────┘       │
        └──────────────┬─────────────────────┘
                       │
        ┌──────────────┴─────────────────────┐
        │           Data Layer               │
        │  ┌──────────────────────────────┐ │
        │  │   Cloud SQL (PostgreSQL)     │ │
        │  │   - Primary database          │ │
        │  │   - Full-text search          │ │
        │  │   - Vector search (pgvector)  │ │
        │  └──────────────────────────────┘ │
        │  ┌──────────────────────────────┐ │
        │  │   Cloud Storage              │ │
        │  │   - Videos                   │ │
        │  │   - Images                   │ │
        │  │   - Documents                │ │
        │  └──────────────────────────────┘ │
        └────────────────────────────────────┘
```

---

## Frontend Architecture

### Component Structure

```
src/
├── components/
│   ├── ui/                    # shadcn/ui base components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   └── ...
│   ├── mobile/                # Mobile-specific
│   │   ├── BottomNav.tsx
│   │   ├── MobileHeader.tsx
│   │   └── TouchButton.tsx
│   ├── onboarding/            # User onboarding
│   │   └── OnboardingFlow.tsx
│   └── [feature]/             # Feature components
│       ├── patients/
│       ├── appointments/
│       └── exercises/
├── contexts/                  # React contexts
│   ├── AuthContext.tsx
│   ├── RealtimeContext.tsx
│   └── ...
├── hooks/                     # Custom hooks
│   ├── useAuth.ts
│   ├── usePatients.ts
│   ├── useRealtime.ts
│   └── ...
├── lib/                       # Utilities
│   ├── api/
│   ├── integrations/
│   ├── monitoring/
│   └── ...
└── pages/                     # Route pages
```

### State Management Strategy

| Type | Solution | Example |
|------|----------|---------|
| **Server State** | TanStack Query | `usePatients()`, `useAppointments()` |
| **Global State** | Zustand | `useUIStore()`, `useFilterStore()` |
| **Form State** | React Hook Form | Patient forms, filters |
| **URL State** | React Router | Search params, navigation |
| **Local State** | useState/useReducer | UI toggles, modals |

### Data Flow Pattern

```
┌─────────────┐
│   Component │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ Custom Hook     │
│ (usePatients)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ TanStack Query  │
│ (useQuery)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ API Client      │
│ (Firebase DC)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Cloud SQL       │
└─────────────────┘
```

---

## Backend Architecture

### Cloud Functions Structure

```
functions/src/
├── api/                       # HTTP API endpoints
│   ├── patients.ts
│   ├── appointments.ts
│   └── payments.ts
├── ai/                        # AI/ML features
│   ├── suggestions.ts
│   ├── chat.ts
│   └── transcribe.ts
├── communications/            # Messaging
│   ├── email.ts
│   └── whatsapp.ts
├── integrations/              # External services
│   ├── calendar.ts           # Google Calendar
│   ├── telemedicine.ts       # Video consultations
│   └── stripe.ts
├── lgpd/                      # LGPD compliance
│   ├── consent.ts
│   ├── export-data.ts
│   └── delete-account.ts
├── medical/                   # Medical records
│   ├── records.ts
│   └── reports.ts
├── middleware/                # Shared middleware
│   ├── auth.ts
│   └── errorHandler.ts
└── crons/                     # Scheduled jobs
    ├── daily-reports.ts
    └── cleanup.ts
```

### Function Deployment Strategy

| Type | Trigger | Region | Memory | Timeout |
|------|---------|--------|--------|---------|
| **API** | HTTP | southamerica-east1 | 256MiB | 60s |
| **AI** | HTTP | southamerica-east1 | 512MiB | 120s |
| **Webhooks** | HTTP | southamerica-east1 | 256MiB | 60s |
| **Crons** | Schedule | southamerica-east1 | 256MiB | 540s |
| **Triggers** | Event | southamerica-east1 | 256MiB | 60s |

---

## Database Design

### Schema Overview

```sql
-- Core entities
profiles (users)
organizations
patients
appointments
medical_evolutions
exercise_plans
patient_exercises

-- Exercises library
exercises
exercise_categories
exercise_tags

-- Payments
vouchers
payments
invoices

-- Communications
notifications
email_logs
whatsapp_messages

-- AI features
ai_conversations
ai_insights
```

### Key Relationships

```
organizations (1) ──────< (N) profiles
profiles (1) ──────< (N) patients
patients (1) ──────< (N) appointments
patients (1) ──────< (N) medical_evolutions
patients (1) ──────< (N) exercise_plans
exercise_plans (1) ──────< (N) patient_exercises
exercises (1) ──────< (N) patient_exercises

patients (1) ──────< (N) vouchers
vouchers (1) ──────< (N) payments
```

### Indexing Strategy

| Table | Indexes | Purpose |
|-------|---------|---------|
| `patients` | `organization_id`, `name (trgm)` | Search, filtering |
| `appointments` | `(therapist_id, date)`, `status` | Calendar queries |
| `medical_evolutions` | `patient_id, created_at DESC` | History retrieval |
| `exercises` | `category`, `(name) trgm` | Library search |
| `vouchers` | `patient_id, active, expiry` | Active voucher lookup |

---

## Security

### Authentication Flow

```
┌─────────┐
│  User   │
└────┬────┘
     │
     ▼
┌─────────────────┐
│ Firebase Auth   │
│ (Email/Password)│
└────┬────────────┘
     │
     ▼ token
┌─────────────────┐
│ Client Storage  │
│ (localStorage)  │
└────┬────────────┘
     │
     ▼ Authorization header
┌─────────────────┐
│ Cloud Function  │
│ (verify token)  │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│ Database Access │
│ (RLS policies)  │
└─────────────────┘
```

### Authorization Model

**Roles:**
- `admin` - Full access
- `fisioterapeuta` - Clinical access
- `estagiario` - Limited clinical access
- `paciente` - Personal data only
- `recepcao` - Scheduling only

**RBAC Implementation:**

```typescript
// Firestore Security Rules
allow read: if isOwner() || hasRole(['fisioterapeuta', 'admin']);
allow write: if hasRole(['fisioterapeuta', 'admin']);

// Database (RLS)
CREATE POLICY patient_access ON patients
  FOR ALL
  USING (
    organization_id = current_setting('app.organization_id')::uuid
    AND has_role(current_user_id, '{fisioterapeuta,admin}')
  );
```

### Data Protection

| Measure | Implementation |
|---------|----------------|
| **Encryption at rest** | Cloud SQL default |
| **Encryption in transit** | TLS 1.3 |
| **PII masking** | Partial display in logs |
| **Audit logging** | All data access |
| **Retention policies** | LGPD compliant |

---

## Realtime Architecture

### Ably Integration

```
┌─────────────────────────────────────────┐
│           Client (Browser)              │
│  ┌───────────────────────────────────┐ │
│  │  Ably JavaScript Client           │ │
│  │  - Auto reconnect                 │ │
│  │  - Connection state monitoring    │ │
│  └──────────┬────────────────────────┘ │
└─────────────┼───────────────────────────┘
              │
              ▼ WebSocket
┌─────────────────────────────────────────┐
│           Ably Cloud                   │
│  ┌───────────────────────────────────┐ │
│  │  Channels                         │ │
│  │  - appointments:{orgId}           │ │
│  │  - patient:{patientId}            │ │
│  │  - organization:{orgId}           │ │
│  └──────────┬────────────────────────┘ │
└─────────────┼───────────────────────────┘
              │
              ▼ REST API
┌─────────────────────────────────────────┐
│      Cloud Function (Publisher)         │
│  - Called on database mutations         │
│  - Publishes to Ably channel            │
└─────────────────────────────────────────┘
```

### Channel Naming Convention

| Pattern | Purpose | Example |
|---------|---------|---------|
| `appointments:{orgId}` | Organization-wide appointments | `appointments:org-123` |
| `patient:{patientId}` | Patient-specific updates | `patient:pt-456` |
| `organization:{orgId}` | Organization updates | `organization:org-123` |
| `user:{userId}` | User notifications | `user:user-789` |

### Message Format

```typescript
interface RealtimeMessage<T> {
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  data: T;
  old?: T; // For UPDATE/DELETE
  timestamp: string;
  version: number;
}
```

---

## Scalability

### Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Time to Interactive** | < 3s | Lighthouse |
| **First Contentful Paint** | < 1.5s | Lighthouse |
| **API Response (p95)** | < 500ms | Cloud Monitoring |
| **Database Query (p95)** | < 200ms | Query Insights |
| **Uptime** | 99.9% | Uptime monitoring |

### Scaling Strategy

**Horizontal Scaling:**
- Cloud Functions: Auto-scaling (0-N instances)
- Cloud SQL: Read replicas for read-heavy workloads
- Cloud Storage: Infinite scale

**Vertical Scaling:**
- Cloud SQL: Machine size upgrade
- Cloud Functions: Memory allocation (256MiB - 8GiB)

**Caching Strategy:**
- Static assets: CDN (Firebase Hosting)
- API responses: TanStack Query cache
- Database: Connection pooling

### Cost Optimization

| Service | Optimization |
|---------|--------------|
| **Cloud Functions** | Minimize cold starts, bundle size |
| **Cloud SQL** | Connection pooling, query optimization |
| **Storage** | Lifecycle policies, compression |
| **Ably** | Channel multiplexing |

---

## Monitoring & Observability

### Metrics Collected

| Category | Metrics |
|----------|---------|
| **Performance** | LCP, FID, CLS, API latency |
| **Business** | Appointments created, Patients active |
| **Errors** | Error rate, Error type distribution |
| **Usage** | DAU/MAU, Feature usage |

### Tools Used

- **Sentry**: Error tracking, performance monitoring
- **Firebase Crashlytics**: Mobile crash reporting
- **Firebase Analytics**: User analytics
- **Cloud Monitoring**: Infrastructure metrics
- **Cloud Logging**: Centralized logging

---

## Disaster Recovery

### Backup Strategy

| Data Type | Backup Frequency | Retention |
|-----------|------------------|-----------|
| **Database** | Daily (automated) | 30 days |
| **Storage** | Continuous (multi-region) | Forever |
| **Configuration** | Per deployment | 90 days |

### Recovery Objectives

| Metric | Target |
|--------|--------|
| **RPO** (Recovery Point) | 1 hour |
| **RTO** (Recovery Time) | 4 hours |

---

## Technology Decisions

### Why Firebase?

| Factor | Decision |
|--------|----------|
| **Authentication** | Built-in, scalable |
| **Realtime** | Removed (using Ably) |
| **Hosting** | Global CDN, free tier |
| **Functions** | Serverless, auto-scaling |
| **Database** | Changed to Cloud SQL (PostgreSQL) |

### Why Cloud SQL over Firestore?

| Requirement | Cloud SQL | Firestore |
|-------------|-----------|-----------|
| **Complex queries** | ✅ SQL | ❌ No joins |
| **ACID transactions** | ✅ Full | ⚠️ Limited |
| **Full-text search** | ✅ pg_trgm | ❌ Need Algolia |
| **Vector search** | ✅ pgvector | ❌ Need separate |
| **Maturity** | ✅ PostgreSQL | ⚠️ NoSQL |
| **Cost at scale** | ✅ Predictable | ❌ Expensive |

---

## Future Considerations

### Planned Enhancements

1. **GraphQL Federation** - Microservices architecture
2. **Event Sourcing** - Audit trail improvements
3. **CQRS** - Read/write separation
4. **Multi-region** - Global compliance
5. **Edge Functions** - Regional processing

### Deprecation Risks

| Technology | Risk Level | Mitigation |
|------------|------------|------------|
| **Supabase** | High | Migration to Firebase |
| **Ably** | Medium | Self-hosted alternative |
| **Capacitor** | Low | Native migration path |

---

Last updated: January 2026
