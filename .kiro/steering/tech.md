# FisioFlow Tech Stack

## Build System & Package Manager

- **Package Manager**: pnpm 9.15.0+ (required)
- **Node.js**: 18.0.0+ (required)
- **Build Tool**: Vite 5.4.19
- **TypeScript**: 5.8.3 with strict mode enabled

## Frontend Stack

### Core Framework
- **React**: 19.1.0
- **React DOM**: 19.1.0
- **React Router**: 6.30.1 for routing
- **Vite**: Fast build tool with SWC for React

### UI & Styling
- **UI Library**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS 3.4.17
- **Icons**: Lucide React 0.462.0
- **Animations**: Framer Motion 12.24.10
- **Typography**: @tailwindcss/typography

### State Management
- **Server State**: TanStack Query 5.90.17 (React Query)
- **Client State**: Zustand 4.5.5
- **Forms**: React Hook Form 7.61.1 + Zod 3.25.76 validation

### Mobile
- **Framework**: React Native 0.76.9 + Expo 54.0.32
- **Native Bridge**: Capacitor 8.0.0 (iOS/Android)
- **Storage**: AsyncStorage 2.2.0

## Backend Stack

### Firebase Services
- **Auth**: Firebase Auth with MFA (TOTP)
- **Functions**: Cloud Functions Gen 2 (Node.js 20, TypeScript 5.7.2)
- **Database**: Cloud SQL (PostgreSQL) + Firestore
- **Storage**: Firebase Storage
- **Hosting**: Firebase Hosting

### Database
- **Primary**: Cloud SQL PostgreSQL (southamerica-east1)
- **Real-time**: Firestore (cache + real-time sync)
- **ORM**: Drizzle ORM 0.45.1
- **Migrations**: Drizzle Kit 0.18.1

### External Integrations
- **Real-time**: Ably 2.17.0
- **AI/ML**: Google Vertex AI (Gemini 2.5 Flash-Lite)
- **Payments**: Stripe 20.3.0
- **WhatsApp**: Meta Business API
- **SMS**: Twilio 5.3.5
- **Error Tracking**: Sentry 10.32.1

## Testing

### Test Frameworks
- **Unit/Integration**: Vitest 3.2.4
- **E2E**: Playwright 1.58.1
- **Property-Based**: fast-check 4.5.3
- **Testing Library**: @testing-library/react 16.3.1

### Test Commands
```bash
# Unit tests
pnpm test                    # Run in watch mode
pnpm test:unit              # Run once
pnpm test:coverage          # With coverage report

# E2E tests
pnpm test:e2e               # All E2E tests
pnpm test:e2e:headed        # With browser UI
pnpm test:e2e:debug         # Debug mode
pnpm test:e2e:ui            # Playwright UI mode

# Specific test suites
pnpm test:components        # Component tests only
pnpm test:hooks             # Hook tests only

# Pre-deployment checks
pnpm test:pre-deploy        # All critical tests
pnpm test:race 100          # Race condition detection
pnpm test:db-constraints    # Database constraint analysis
```

## Development Commands

### Local Development
```bash
# Install dependencies
pnpm install

# Start dev server (web)
pnpm dev                    # Main web app (port 5173)
pnpm dev:web               # Explicit web dev
pnpm dev:patient           # Patient iOS app
pnpm dev:professional      # Professional iOS app

# Clean cache and restart
pnpm dev:clean             # Clean Vite cache
pnpm dev:force             # Force rebuild
pnpm clean:all             # Full clean + reinstall

# Background jobs (Inngest)
pnpm inngest:dev           # Start Inngest dev server
```

### Build & Preview
```bash
# Production build
pnpm build                 # Standard build
pnpm build:prod            # Production optimized
pnpm build:analyze         # With bundle analysis

# Preview build
pnpm preview               # Preview production build (port 4173)

# Mobile builds
pnpm patient:build:prod    # Patient app production
pnpm professional:build:prod # Professional app production
```

### Database
```bash
# Drizzle ORM
pnpm db:push               # Push schema changes
pnpm db:generate           # Generate migrations
pnpm db:seed:e2e           # Seed E2E test data

# Cloud SQL proxy
pnpm db:proxy              # Start Cloud SQL proxy
```

### Deployment
```bash
# Firebase deployment
pnpm deploy:web            # Deploy hosting only
pnpm deploy:functions      # Deploy functions only
pnpm deploy:all            # Full deployment (build + deploy)

# Failed functions retry
pnpm deploy:failed-functions
```

### Code Quality
```bash
# Linting
pnpm lint                  # Check for issues
pnpm lint:fix              # Auto-fix issues

# Git hooks
pnpm hooks:install         # Install pre-commit hooks
pnpm hooks:uninstall       # Remove hooks

# Health check
pnpm verify                # System health check
```

### Capacitor (Mobile)
```bash
# iOS setup
pnpm cap:ios               # Add iOS platform
pnpm cap:sync              # Sync web assets to native
pnpm cap:run:ios           # Run on iOS device/simulator
pnpm cap:open:ios          # Open in Xcode
```

### Utilities
```bash
# Type generation
pnpm gen:types             # Generate TypeScript types from JSON schema
pnpm gen:zod               # Generate Zod schemas
pnpm gen:all               # Generate all

# Changelog
pnpm changelog             # Generate full changelog
pnpm changelog:week        # Last 7 days
pnpm changelog:since       # Since specific date

# Performance
pnpm analyze               # Bundle size analysis
pnpm lighthouse            # Lighthouse audit
```

## Project Structure Conventions

### Path Aliases
```typescript
@/*                        // src/*
@fisioflow/shared-types    // packages/shared-types/src
@fisioflow/shared-api      // packages/shared-api/src
@fisioflow/shared-constants // packages/shared-constants/src
@fisioflow/shared-utils    // packages/shared-utils/src
@fisioflow/skills          // src/lib/skills
```

### Import Preferences
- Use `lodash-es` instead of `lodash` (tree-shakeable)
- Prefer named imports over default imports
- Use path aliases (@/) for internal imports

## Environment Variables

### Required for Development
```bash
# Firebase
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID

# Optional integrations
VITE_GOOGLE_CLIENT_ID      # Google Calendar
VITE_GOOGLE_API_KEY        # Google APIs
RESEND_API_KEY             # Email notifications
WHATSAPP_ACCESS_TOKEN      # WhatsApp Business
```

## Performance Optimizations

### Build Configuration
- **Code Splitting**: Manual chunks for vendor libraries (react-core, firebase-vendor, ui-radix, charts, etc.)
- **Compression**: Brotli compression enabled
- **Source Maps**: Enabled for production debugging
- **Tree Shaking**: Optimized with lodash-es and proper imports

### Runtime Optimizations
- **Lazy Loading**: Route-based code splitting
- **Image Optimization**: Responsive images with lazy loading
- **Query Caching**: TanStack Query with persistence
- **Service Worker**: PWA with workbox for offline support

## Security

### Headers (Firebase Hosting)
- Strict-Transport-Security (HSTS)
- X-Content-Type-Options: nosniff
- X-Frame-Options: SAMEORIGIN
- X-XSS-Protection
- Referrer-Policy: strict-origin-when-cross-origin

### Authentication
- Firebase Auth with JWT tokens
- MFA support (TOTP)
- Row Level Security (RLS) on Cloud SQL
- App Check for API protection

## Monorepo Structure

This is a pnpm workspace with multiple apps:
- Root: Main web application
- `apps/professional-ios`: Professional mobile app
- `apps/patient-ios`: Patient mobile app (if exists)
- `packages/*`: Shared packages

Use workspace commands:
```bash
pnpm --filter @fisioflow/professional-ios <command>
```
