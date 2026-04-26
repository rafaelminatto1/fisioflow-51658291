# Design Document: System Maintainability Improvements

## Overview

This document describes the technical design for a set of architectural improvements to the FisioFlow codebase. The goal is to reduce error probability, improve maintainability, and establish consistent patterns across the service layer, type system, query key registry, error handling, API validation, hooks, domain validation, constants, testing, and observability.

The implementation targets the main web application (`src/`) and uses the existing tech stack: TypeScript 5.8.3, React 19, TanStack Query 5, Zod 3, Vitest 3, and fast-check 4.

---

## Architecture

### High-Level Structure

The improvements are organized into 10 independent but complementary areas. Each area targets a specific layer of the application:

```
src/
├── types/
│   ├── index.ts              ← canonical barrel export (Req 3)
│   ├── common.ts             ← ServiceResult<T>, shared types (Req 1)
│   └── workers.ts            ← DB row types (snake_case) (Req 3)
├── hooks/
│   └── queryKeys.ts          ← centralized query key registry (Req 2)
├── services/
│   ├── patientService.ts     ← refactored to object literal (Req 1)
│   ├── appointmentService.ts ← refactored to object literal (Req 1)
│   └── financialService.ts   ← refactored to object literal (Req 1)
├── schemas/
│   ├── patient.schema.ts     ← Zod schemas for Patient (Req 5)
│   ├── appointment.schema.ts ← Zod schemas for Appointment (Req 5)
│   └── index.ts              ← barrel export
├── lib/
│   ├── constants/
│   │   ├── appointments.ts   ← appointment statuses, types (Req 8)
│   │   ├── users.ts          ← roles (Req 8)
│   │   ├── financial.ts      ← payment types (Req 8)
│   │   └── index.ts          ← barrel export
│   ├── validation/
│   │   ├── appointment.validation.ts  ← domain invariants (Req 7)
│   │   ├── pain.validation.ts         ← pain level invariants (Req 7)
│   │   └── index.ts
│   ├── errors/
│   │   └── AppError.ts       ← existing, extended (Req 4)
│   └── monitoring/
│       └── fisioLogger.ts    ← existing, standardized usage (Req 10)
└── tests/
    ├── services/             ← service integration tests (Req 9)
    ├── schemas/              ← Zod round-trip tests (Req 9)
    └── validation/           ← property-based tests (Req 9)
```

---

## Component Design

### 1. Service Layer Standardization (Req 1)

All services are refactored to use the object literal pattern with a shared `ServiceResult<T>` return type.

**`ServiceResult<T>` interface** (in `src/types/common.ts`):
```typescript
export interface ServiceResult<T> {
  data: T | null;
  error: Error | null;
}
```

**Service object pattern**:
```typescript
export const PatientService = {
  async getById(id: string): Promise<ServiceResult<Patient>> {
    // validate params → call API → map result → return ServiceResult
  }
};
```

**Mapping functions** are extracted as pure functions:
```typescript
// src/services/mappers/patient.mapper.ts
export function mapPatientRow(row: PatientRow): Patient { ... }
```

### 2. Query Key Registry (Req 2)

Centralized in `src/hooks/queryKeys.ts` using factory functions returning `readonly` arrays:

```typescript
export const QueryKeys = {
  patients: {
    all: () => ['patients'] as const,
    lists: () => ['patients', 'list'] as const,
    detail: (id: string) => ['patients', 'detail', id] as const,
  },
  appointments: {
    all: () => ['appointments'] as const,
    lists: () => ['appointments', 'list'] as const,
    byDate: (date: string) => ['appointments', 'list', date] as const,
    detail: (id: string) => ['appointments', 'detail', id] as const,
  },
  // ... financial, exercises, etc.
};
```

List keys are prefixes of detail keys, enabling cascade invalidation.

### 3. Type System Consolidation (Req 3)

- One canonical type per domain entity in `src/types/` (camelCase fields)
- DB row types (`PatientRow`, `AppointmentRow`) in `src/types/workers.ts` (snake_case)
- All exports go through `src/types/index.ts`
- Duplicate fields (`name`/`full_name`, `birthDate`/`birth_date`) removed

### 4. Error Handling Standardization (Req 4)

All `catch` blocks use `AppError.from(error, context)`. Silent fails are replaced with `fisioLogger.warn`. Errors are classified as operational (`isOperational: true`) or programming errors.

```typescript
try {
  // ...
} catch (err) {
  const appError = AppError.from(err, { operation: 'PatientService.getById', id });
  fisioLogger.error(appError.message, appError.context);
  return { data: null, error: appError };
}
```

### 5. API Validation with Zod (Req 5)

Schemas in `src/schemas/` with three variants per entity:
- `PatientCreateSchema` — no `id`, `created_at`
- `PatientUpdateSchema` — all fields optional
- `PatientResponseSchema` — `id` required

Invalid items are logged and excluded from lists (not thrown).

### 6. Hook Architecture (Req 6)

Hooks separated into:
- **Data hooks** (`usePatients`, `useAppointments`): fetching, mutations, cache — use `QueryKeys` registry
- **UI hooks** (`usePatientSelection`, `useAppointmentFilters`): selection, filters, modal state

Data hooks delegate business logic to services; they are thin React integration layers.

### 7. Domain Validation (Req 7)

Pure functions in `src/lib/validation/` returning `{ valid: boolean; errors: string[] }`:

```typescript
export function validateAppointment(input: AppointmentInput): ValidationResult {
  const errors: string[] = [];
  if (isPast(input.date)) errors.push('Date cannot be in the past');
  if (input.duration < 15 || input.duration > 480) errors.push('Duration must be 15–480 min');
  return { valid: errors.length === 0, errors };
}
```

### 8. Constants Registry (Req 8)

```typescript
// src/lib/constants/appointments.ts
export const APPOINTMENT_STATUSES = ['scheduled', 'confirmed', 'cancelled', 'completed'] as const;
export type AppointmentStatus = typeof APPOINTMENT_STATUSES[number];
export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: 'Agendado',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  completed: 'Concluído',
};
```

### 9. Test Coverage (Req 9)

- Unit tests for all mapper functions
- Property-based tests (fast-check) for all domain validators
- Integration tests for PatientService, AppointmentService, FinancialService (mocked API)
- Round-trip tests for all Zod schemas

### 10. Logging Standardization (Req 10)

All `console.log/error/warn` replaced with `fisioLogger`. Structured logs include `correlationId`. Sensitive fields (CPF, etc.) are masked before logging.

---

## Data Models

### ServiceResult

```typescript
interface ServiceResult<T> {
  data: T | null;
  error: Error | null;
}
```

### ValidationResult

```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
}
```

### AppError (extended)

```typescript
class AppError extends Error {
  isOperational: boolean;
  context?: Record<string, unknown>;
  static from(err: unknown, context?: Record<string, unknown>): AppError;
  static badRequest(message: string): AppError;
}
```

---

## Correctness Properties

### Property 1: ServiceResult completeness
For any service method call, the result must satisfy exactly one of: `data !== null && error === null` OR `data === null && error !== null`. Never both null or both non-null.

### Property 2: Query key prefix invariant
For any domain namespace, `keys.lists()` must be a prefix of `keys.detail(id)`. That is, `detail(id).slice(0, lists().length)` deep-equals `lists()`.

### Property 3: Domain validation determinism
For any input value, calling a domain validator multiple times with the same input always returns the same `{ valid, errors }` result (pure function, no side effects).

### Property 4: Domain validation totality
For any arbitrarily generated input (including null, undefined, extreme numbers, empty strings), domain validator functions must never throw — they must always return a `ValidationResult`.

### Property 5: Zod schema round-trip consistency
For any valid entity object, `schema.parse(schema.parse(entity))` equals `schema.parse(entity)` — parsing is idempotent.

### Property 6: Mapper determinism
For any `PatientRow` or `AppointmentRow` input, the mapper function always returns the same `Patient`/`Appointment` output (pure, no side effects).

---

## Error Handling Strategy

- All errors wrapped in `AppError` before propagation
- Operational errors (`isOperational: true`): validation failures, not-found, bad request
- Programming errors (`isOperational: false`): unexpected nulls, type mismatches
- Audit failures: logged as warning, never block main flow
- Hook mutations: display user-friendly toast (network error vs. validation error)

---

## Testing Strategy

- **Unit tests**: mapper functions, constants, query key factories
- **Property-based tests** (fast-check): domain validators (Properties 3, 4), ServiceResult shape (Property 1), query key prefix invariant (Property 2)
- **Integration tests**: services with mocked API layer
- **Round-trip tests**: Zod schemas (Property 5)
- Test files colocated with source (`*.test.ts`)
