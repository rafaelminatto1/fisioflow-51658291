---
inclusion: always
---

# FisioFlow - Project Structure & Architecture

## Directory Structure

```
src/
├── components/          # React components organized by feature
│   ├── ui/             # shadcn/ui base components (Button, Input, etc.)
│   ├── auth/           # Authentication components
│   ├── dashboard/      # Dashboard-specific components
│   ├── patient/        # Patient management components
│   ├── schedule/       # Appointment scheduling components
│   ├── exercises/      # Exercise library components
│   ├── analytics/      # Analytics and reporting components
│   ├── financial/      # Financial management components
│   ├── layout/         # Layout components (Sidebar, Header, etc.)
│   └── modals/         # Modal dialogs
├── pages/              # Route components (one per page)
├── hooks/              # Custom React hooks
├── contexts/           # React Context providers
├── types/              # TypeScript type definitions
├── lib/                # Utility libraries and configurations
├── utils/              # Helper functions
├── integrations/       # External service integrations (Supabase)
└── assets/             # Static assets (images, icons)
```

## Naming Conventions

- **Files**: PascalCase for components (`PatientCard.tsx`), camelCase for utilities (`dateUtils.ts`)
- **Components**: PascalCase (`PatientManagement`, `ExerciseLibrary`)
- **Hooks**: camelCase starting with `use` (`usePatients`, `useAuth`)
- **Types**: PascalCase with descriptive names (`Patient`, `Appointment`, `ExerciseProtocol`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`, `DEFAULT_PAGINATION`)

## Component Organization

### Feature-Based Structure
Components are organized by domain/feature rather than by type:
- `components/patient/` - All patient-related components
- `components/schedule/` - All scheduling-related components
- `components/exercises/` - All exercise-related components

### Component Patterns
- **Page Components**: Located in `pages/`, handle routing and high-level state
- **Feature Components**: Located in `components/{feature}/`, handle specific functionality
- **UI Components**: Located in `components/ui/`, reusable shadcn/ui components
- **Layout Components**: Located in `components/layout/`, handle app structure

## Import Conventions

Use path aliases defined in `tsconfig.json`:
```typescript
import { Button } from "@/components/ui/button"
import { usePatients } from "@/hooks/usePatients"
import { Patient } from "@/types"
import { cn } from "@/lib/utils"
```

## State Management Patterns

- **Server State**: Use TanStack Query (`@tanstack/react-query`) for API data
- **Client State**: Use React Context for global app state
- **Form State**: Use React Hook Form with Zod validation
- **Component State**: Use useState/useReducer for local component state

## File Naming Rules

- **Components**: `ComponentName.tsx`
- **Hooks**: `useHookName.ts`
- **Types**: `featureName.ts` (e.g., `patient.ts`, `appointment.ts`)
- **Utils**: `descriptiveName.ts` (e.g., `dateUtils.ts`, `validation.ts`)
- **Pages**: `PageName.tsx` (matches route name)

## Code Organization Principles

1. **Single Responsibility**: Each component/hook should have one clear purpose
2. **Feature Cohesion**: Related functionality should be grouped together
3. **Dependency Direction**: Components should depend on abstractions (hooks/contexts)
4. **Separation of Concerns**: UI, business logic, and data fetching should be separate

## TypeScript Guidelines

- Use strict TypeScript configuration
- Define interfaces for all data structures
- Use union types for status/state enums
- Prefer `interface` over `type` for object shapes
- Use generic types for reusable components

## Component Structure Template

```typescript
// Imports (external libraries first, then internal)
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { usePatients } from "@/hooks/usePatients"
import { Patient } from "@/types"

// Types/Interfaces
interface ComponentProps {
  // Props definition
}

// Component
export function ComponentName({ prop }: ComponentProps) {
  // Hooks
  // State
  // Effects
  // Handlers
  // Render
}
```

## Testing Structure

- **Unit Tests**: `*.test.tsx` alongside component files
- **Integration Tests**: `__tests__/` directory in feature folders
- **Test Utilities**: `src/test/` for shared test helpers
- Use Testing Library for component testing
- Use Vitest as test runner

## Performance Guidelines

- Use lazy loading for route components
- Implement proper memoization with `useMemo`/`useCallback`
- Use React.memo for expensive components
- Optimize bundle size with proper code splitting
- Use TanStack Query for efficient data caching