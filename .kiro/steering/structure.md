# FisioFlow Project Structure

## Repository Layout

```
fisioflow-51658291/
├── .agent/                    # AI agent configuration & documentation
│   ├── agents/               # Specialist agent definitions
│   ├── skills/               # Domain-specific knowledge modules
│   ├── docs/                 # Backend architecture docs
│   ├── fluxos/               # Workflow documentation
│   └── scripts/              # Automation scripts
├── .kiro/                     # Kiro IDE configuration
│   ├── settings/             # IDE settings (mcp.json)
│   ├── specs/                # Feature specifications
│   └── steering/             # Project steering rules (this file)
├── apps/                      # Monorepo applications
│   └── professional-ios/     # Professional mobile app (React Native + Expo)
├── docs2026/                  # 2026 documentation
├── e2e/                       # End-to-end tests (Playwright)
├── functions/                 # Firebase Cloud Functions
│   └── src/
│       ├── api/              # Callable functions (patients, appointments, etc.)
│       ├── ai/               # AI/ML functions (Gemini)
│       ├── crons/            # Scheduled jobs
│       ├── workflows/        # Background workflows
│       ├── communications/   # WhatsApp, email
│       ├── middleware/       # Auth, rate-limit, audit
│       └── lib/              # Shared utilities
├── packages/                  # Shared packages (if exists)
│   ├── shared-types/         # TypeScript types
│   ├── shared-api/           # API client
│   ├── shared-constants/     # Constants
│   └── shared-utils/         # Utilities
├── scripts/                   # Build & deployment scripts
├── src/                       # Main web application source
│   ├── components/           # React components (organized by feature)
│   ├── pages/                # Route pages
│   ├── hooks/                # Custom React hooks
│   ├── contexts/             # React contexts
│   ├── lib/                  # Libraries & utilities
│   ├── services/             # API services
│   ├── stores/               # Zustand stores
│   ├── types/                # TypeScript types
│   ├── utils/                # Utility functions
│   ├── integrations/         # External integrations (Firebase)
│   └── tests/                # Test utilities
├── supabase/migrations/       # SQL migrations (legacy)
├── firebase.json              # Firebase configuration
├── firestore.rules            # Firestore security rules
├── firestore.indexes.json     # Firestore indexes
├── storage.rules              # Storage security rules
├── vite.config.ts             # Vite build configuration
├── tailwind.config.ts         # Tailwind CSS configuration
├── tsconfig.json              # TypeScript configuration
└── package.json               # Root package.json
```

## Source Directory Organization

### Components (`src/components/`)

Components are organized by feature domain, not by type:

```
src/components/
├── accessibility/         # Accessibility features
├── admin/                # Admin-specific components
├── ai/                   # AI assistant components
├── appointments/         # Appointment scheduling
├── auth/                 # Authentication UI
├── dashboard/            # Dashboard widgets
├── error-boundaries/     # Error handling
├── evaluation/           # Clinical evaluations
├── evolution/            # Patient evolution (SOAP)
├── exercises/            # Exercise library
├── financial/            # Financial management
├── layout/               # Layout components (header, sidebar)
├── modals/               # Modal dialogs
├── notifications/        # Notification system
├── pain-map/             # Pain mapping tool
├── patient/              # Patient-specific components
├── patients/             # Patient management
├── reports/              # Report generation
├── schedule/             # Calendar/schedule
├── settings/             # Settings UI
├── ui/                   # Base UI components (shadcn/ui)
└── whatsapp/             # WhatsApp integration UI
```

### Pages (`src/pages/`)

Route-level components:

```
src/pages/
├── admin/                # Admin pages
├── analytics/            # Analytics dashboards
├── cadastros/            # Registration pages
├── configuracoes/        # Configuration pages
├── dashboard/            # Dashboard pages
├── financeiro/           # Financial pages
├── patients/             # Patient pages
├── public/               # Public pages (no auth)
├── relatorios/           # Report pages
├── settings/             # Settings pages
├── Auth.tsx              # Login/signup
├── Schedule.tsx          # Main schedule page
├── Patients.tsx          # Patient list
└── Index.tsx             # Landing page
```

### Hooks (`src/hooks/`)

Custom React hooks organized by domain:

```
src/hooks/
├── accessibility/        # Accessibility hooks
├── ai/                   # AI-related hooks
├── calendar/             # Calendar hooks
├── database/             # Database hooks
├── error/                # Error handling hooks
├── mobile/               # Mobile-specific hooks
├── performance/          # Performance monitoring
├── ui/                   # UI utility hooks
├── useAuth.ts            # Authentication
├── usePatients.ts        # Patient data
├── useAppointments.tsx   # Appointments
├── useExercises.ts       # Exercise library
└── use-toast.ts          # Toast notifications
```

### Services (`src/services/`)

API service layer:

```
src/services/
├── ai/                   # AI service clients
├── appointmentService.ts # Appointment CRUD
├── patientService.ts     # Patient CRUD
├── exercises.ts          # Exercise management
├── financialService.ts   # Financial operations
└── offlineSync.ts        # Offline synchronization
```

### Library (`src/lib/`)

Shared utilities and configurations:

```
src/lib/
├── firebase/             # Firebase initialization & config
├── api/                  # API client utilities
├── auth/                 # Auth utilities
├── utils/                # General utilities
├── validation/           # Validation schemas
├── monitoring/           # Monitoring & logging
├── performance/          # Performance utilities
├── offline/              # Offline support
├── skills/               # AI skills (if applicable)
└── utils.ts              # Common utilities (cn, formatters)
```

### Types (`src/types/`)

TypeScript type definitions:

```
src/types/
├── analysis/             # Analysis types
├── appointment.ts        # Appointment types
├── auth.ts               # Auth types
├── patient.ts            # Patient types (if not in shared)
├── evolution.ts          # Evolution/SOAP types
├── gamification.ts       # Gamification types
├── common.ts             # Common types
└── index.ts              # Type exports
```

## Key Architectural Patterns

### Component Organization
- **Feature-based**: Components grouped by domain (appointments, patients, etc.)
- **Atomic Design**: UI components in `src/components/ui/` follow atomic principles
- **Colocation**: Tests, styles, and related files near components

### Data Flow
- **Server State**: TanStack Query for API data (hooks in `src/hooks/`)
- **Client State**: Zustand stores in `src/stores/`
- **Context**: React Context for cross-cutting concerns (auth, theme)

### API Layer
- **Services**: Service layer in `src/services/` wraps Firebase callable functions
- **Hooks**: Custom hooks consume services and provide React integration
- **Types**: Shared types ensure type safety across layers

### Routing
- **React Router**: Defined in `src/routes.tsx`
- **Protected Routes**: `ProtectedRoute` component wraps authenticated routes
- **Lazy Loading**: Route-based code splitting for performance

### Testing
- **Unit Tests**: Colocated with source files (`*.test.ts`, `*.test.tsx`)
- **E2E Tests**: In `e2e/` directory (Playwright)
- **Test Utils**: Shared utilities in `src/tests/` and `src/test/`

## Mobile App Structure (`apps/professional-ios/`)

```
apps/professional-ios/
├── app/                   # Expo Router pages
│   ├── (legal)/          # Legal screens (onboarding, terms)
│   ├── (tabs)/           # Tab navigation screens
│   └── _layout.tsx       # Root layout
├── lib/                   # Shared libraries
│   ├── services/         # Service layer
│   └── utils/            # Utilities
├── components/            # React Native components
├── __tests__/            # Tests
│   ├── properties/       # Property-based tests
│   └── services/         # Service tests
├── app.json              # Expo configuration
└── package.json          # Mobile app dependencies
```

## Configuration Files

### Root Level
- `package.json`: Dependencies, scripts, pnpm workspace config
- `vite.config.ts`: Build configuration, plugins, aliases
- `tsconfig.json`: TypeScript compiler options
- `tailwind.config.ts`: Tailwind CSS theme and plugins
- `vitest.config.ts`: Test configuration
- `firebase.json`: Firebase project configuration
- `firestore.rules`: Firestore security rules
- `storage.rules`: Storage security rules

### Environment
- `.env`: Local environment variables (gitignored)
- `.env.example`: Template for required variables

## Import Conventions

### Path Aliases
```typescript
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { PatientService } from '@/services/patientService'
import type { Patient } from '@fisioflow/shared-types'
```

### Barrel Exports
- Avoid deep imports where barrel exports exist
- Use index files for cleaner imports
- Example: `@/hooks` exports common hooks

## File Naming Conventions

### Components
- **PascalCase**: `PatientCard.tsx`, `AppointmentList.tsx`
- **Tests**: `PatientCard.test.tsx`
- **Styles**: Inline with Tailwind (no separate CSS files)

### Hooks
- **camelCase with 'use' prefix**: `usePatients.ts`, `useAuth.ts`
- **Tests**: `usePatients.test.ts`

### Services
- **camelCase**: `patientService.ts`, `appointmentService.ts`
- **Tests**: `patientService.test.ts`

### Types
- **camelCase**: `patient.ts`, `appointment.ts`
- **Interfaces/Types**: PascalCase within files

### Utilities
- **camelCase**: `dateUtils.ts`, `formatters.ts`

## Special Directories

### `.agent/`
Contains AI agent configuration, skills, and documentation. Not part of the runtime application.

### `.kiro/`
Kiro IDE configuration including specs, steering rules, and settings.

### `docs2026/`
Project documentation for 2026 roadmap and features.

### `functions/`
Firebase Cloud Functions (separate Node.js project with own package.json).

### `e2e/`
End-to-end tests using Playwright.

## Multi-tenant Architecture

### Organization Isolation
- **Database**: Row Level Security (RLS) enforces organization_id filtering
- **Firestore**: Security rules check organization membership
- **Storage**: Bucket paths include organization_id
- **Functions**: Middleware sets organization context from auth token

### User Context
Every authenticated request includes:
- `userId`: Firebase Auth UID
- `organizationId`: User's organization
- `role`: User's role (admin, fisioterapeuta, etc.)
- `profileId`: Profile ID in Cloud SQL

## Code Organization Best Practices

1. **Feature Folders**: Group related components, hooks, and services
2. **Shared Code**: Extract to `src/lib/` or shared packages
3. **Type Safety**: Use TypeScript strictly, avoid `any`
4. **Barrel Exports**: Use index files for cleaner imports
5. **Colocation**: Keep tests and related files near source
6. **Lazy Loading**: Use React.lazy() for route-level code splitting
7. **Naming**: Be descriptive and consistent with conventions
