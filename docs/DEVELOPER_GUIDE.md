# FisioFlow - Developer Guide

Complete technical documentation for developers working on FisioFlow.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Project Structure](#project-structure)
3. [Architecture](#architecture)
4. [Development Workflow](#development-workflow)
5. [Testing](#testing)
6. [Deployment](#deployment)

---

## Getting Started

### Prerequisites

- **Node.js**: 24.x
- **pnpm**: >=9.0.0
- **Firebase CLI**: Latest
- **Google Cloud SDK**: Latest

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd fisioflow

# Install dependencies
pnpm install

# Setup environment
cp .env.example .env
# Edit .env with your values

# Initialize Firebase
firebase login
```

### Development Server

```bash
pnpm dev
```

The app will be available at `http://127.0.0.1:8080`

---

## Project Structure

```
fisioflow/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── mobile/          # Mobile-specific components
│   │   ├── onboarding/      # Onboarding flow
│   │   └── ui/              # shadcn/ui components
│   ├── contexts/            # React contexts (Auth, Realtime)
│   ├── hooks/               # Custom React hooks
│   ├── integrations/        # External service integrations
│   │   ├── firebase/        # Firebase integration
│   │   ├── supabase/        # Supabase integration
│   │   └── ably/            # Ably realtime
│   ├── lib/                 # Utility libraries
│   │   ├── accessibility/   # A11y utilities
│   │   ├── monitoring/      # Sentry & monitoring
│   │   ├── storage/         # Storage abstraction
│   │   └── validations/     # Zod schemas
│   ├── pages/               # Page components
│   ├── routes/              # Route definitions
│   └── tests/               # Test setup and utilities
├── functions/               # Firebase Cloud Functions
│   └── src/
│       ├── api/             # HTTP API endpoints
│       ├── ai/              # AI/ML features
│       ├── communications/  # Email, WhatsApp
│       ├── integrations/    # Calendar, Telemedicine
│       ├── lgpd/            # LGPD compliance
│       ├── medical/         # Medical records
│       └── stripe/          # Payment processing
├── dataconnect/             # Firebase Data Connect
│   └── connector/
│       └── postgresql/
│           └── schema/      # GraphQL schema files
├── e2e/                     # Playwright E2E tests
├── public/                  # Static assets
└── docs/                    # Documentation
```

---

## Architecture

### Frontend Stack

| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework |
| **TypeScript** | Type safety |
| **Vite** | Build tool |
| **React Router** | Navigation |
| **TanStack Query** | Data fetching |
| **Zustand** | State management |
| **Radix UI** | Component primitives |
| **Tailwind CSS** | Styling |
| **shadcn/ui** | Component library |

### Backend Stack

| Technology | Purpose |
|------------|---------|
| **Firebase** | Platform |
| **Cloud SQL** | PostgreSQL database |
| **Data Connect** | ORM & API |
| **Cloud Functions** | Serverless compute |
| **Cloud Storage** | File storage |
| **Authentication** | User auth |
| **Ably** | Realtime updates |

### Data Flow

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ├──────────────┐
       │              │
       ▼              ▼
┌──────────┐   ┌──────────┐
│ Firebase │   │ Ably     │
│  Auth    │   │ Realtime │
└─────┬────┘   └────┬─────┘
      │              │
      ▼              ▼
┌─────────────────────────┐
│   Firebase Data Connect │
│   (Cloud SQL PostgreSQL)│
└─────────────────────────┘
```

---

## Development Workflow

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: description"

# Push and create PR
git push origin feature/your-feature-name
```

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance

### Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: Run `pnpm lint` before committing
- **Prettier**: Auto-format on save

---

## Testing

### Unit Tests (Vitest)

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test --watch

# Coverage
pnpm test:coverage

# UI mode
pnpm test:ui
```

### E2E Tests (Playwright)

```bash
# Run all E2E tests
pnpm test:e2e

# UI mode
pnpm test:e2e:ui

# Specific file
pnpm test:e2e e2e/auth.spec.ts
```

### Test Coverage Goals

| Metric | Target |
|--------|--------|
| Statements | 60%+ |
| Branches | 55%+ |
| Functions | 60%+ |
| Lines | 60%+ |

---

## Deployment

### Build

```bash
# Production build
pnpm build

# Preview build
pnpm build:dev
```

### Deploy to Firebase

```bash
# Deploy all
firebase deploy

# Deploy specific targets
firebase deploy --only hosting,functions

# Deploy to specific project
firebase deploy -P production
```

### Environment Variables

Production environment variables are set in Firebase:

```bash
firebase functions:config:set \
  stripe.secret_key=sk_live_xxx \
  whatsapp.api_key=xxx \
  sendgrid.api_key=xxx
```

---

## Key Concepts

### Authentication

Firebase Authentication with custom tokens for database access:

```typescript
import { signIn } from '@/integrations/firebase/auth';

const { user, error } = await signIn(email, password);
```

### Database Queries

Using Firebase Data Connect (GraphQL):

```typescript
import { createPatient } from '@/integrations/firebase/dataconnect';

const { data } = await createPatient({
  name: 'John Doe',
  email: 'john@example.com',
});
```

### Realtime Updates

Using Ably channels:

```typescript
import { subscribeToAppointments } from '@/lib/realtime/ably-client';

const unsubscribe = subscribeToAppointments(orgId, (message) => {
  console.log('Appointment update:', message);
});
```

### File Upload

Using Firebase Storage:

```typescript
import { uploadFile } from '@/lib/storage/firebase-storage';

const url = await uploadFile('avatars', 'user123', file, {
  contentType: 'image/jpeg',
  public: true,
});
```

---

## Troubleshooting

### Common Issues

**Vite cache issues:**
```bash
pnpm clean:vite
pnpm dev
```

**Node modules issues:**
```bash
pnpm clean:all
```

**Firebase deployment issues:**
```bash
firebase logout
firebase login
```

### Getting Help

- Check [docs/](./) for detailed guides
- Review existing [e2e/tests/](../e2e/) for usage examples
- Open a GitHub issue for bugs

---

## License

Copyright © 2024 FisioFlow. All rights reserved.
