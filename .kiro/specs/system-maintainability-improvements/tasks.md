# Implementation Plan: System Maintainability Improvements

## Overview

Incremental refactoring of the FisioFlow codebase to establish consistent architectural patterns across the service layer, type system, query key registry, error handling, API validation, hooks, domain validation, constants, testing, and observability. Each task builds on the previous and ends with all pieces wired together.

## Tasks

- [x] 1. Extend `ServiceResult<T>` and `AppError` foundations
  - Add `ServiceResult<T>` interface to `src/types/common.ts` if not already present: `{ data: T | null; error: Error | null }`
  - Add `ValidationResult` interface to `src/types/common.ts`: `{ valid: boolean; errors: string[] }`
  - Extend `src/lib/errors/AppError.ts` with `isOperational: boolean` field, `context?: Record<string, unknown>` field, and static `AppError.from(err, context)` factory method
  - Ensure `AppError.badRequest(message)` static method exists
  - Export new types from `src/types/index.ts`
  - _Requirements: 1.2, 1.4, 4.1, 4.5_

  - [x] 1.1 Write unit tests for `AppError.from` and `AppError.badRequest`
    - Verify `isOperational` is set correctly for each factory
    - Verify `context` is preserved in the error
    - _Requirements: 4.1, 4.5_

- [x] 2. Centralize constants registry
  - Create `src/lib/constants/appointments.ts` with `APPOINTMENT_STATUSES`, `AppointmentStatus` type, and `APPOINTMENT_STATUS_LABELS` display map using `as const`
  - Create `src/lib/constants/users.ts` with user roles constants and derived types
  - Create `src/lib/constants/financial.ts` with payment type constants and display labels
  - Create `src/lib/constants/index.ts` barrel export
  - Replace inline string literals for statuses/roles/payment types in services and components with imports from the constants registry
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 2.1 Write unit tests for constants registry
    - Verify TypeScript infers literal types correctly (no widening to `string`)
    - Verify all status values have a corresponding display label
    - _Requirements: 8.2, 8.4_

- [x] 3. Consolidate type system and eliminate duplicates
  - Audit `src/types/index.ts`, `src/types/appointment.ts`, `src/types/agenda.ts`, and other type files for duplicate entity definitions
  - Define one canonical camelCase type per domain entity (`Patient`, `Appointment`, `Exercise`, etc.) in the appropriate `src/types/` file
  - Move all snake_case DB row types (`PatientRow`, `AppointmentRow`, etc.) to `src/types/workers.ts`
  - Remove duplicate fields (`name`/`full_name`, `birthDate`/`birth_date`, `createdAt`/`created_at`) from `Patient` and other entities, keeping only camelCase
  - Ensure all domain types are exported exclusively through `src/types/index.ts`
  - Fix any TypeScript errors caused by the consolidation
  - _Requirements: 3.1, 3.2, 3.4, 3.5_

- [x] 4. Create query key registry
  - Create `src/hooks/queryKeys.ts` with a `QueryKeys` object containing factory functions for all domains: `patients`, `appointments`, `financial`, `exercises`, and any other domains with existing hooks
  - Each domain must have: `all()`, `lists()`, and `detail(id)` keys as `readonly` arrays
  - Ensure `lists()` keys are strict prefixes of `detail(id)` keys (cascade invalidation)
  - Add domain-specific keys where needed (e.g., `appointments.byDate(date)`)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 4.1 Write property test for query key prefix invariant
    - **Property 2: Query key prefix invariant** — for any domain, `detail(id).slice(0, lists().length)` deep-equals `lists()`
    - **Validates: Requirements 2.4, 2.5**

- [x] 5. Extract mapper functions and standardize service layer
  - Create `src/services/mappers/` directory
  - Create `src/services/mappers/patient.mapper.ts` with a pure `mapPatientRow(row: PatientRow): Patient` function
  - Create `src/services/mappers/appointment.mapper.ts` with a pure `mapAppointmentRow(row: AppointmentRow): Appointment` function
  - Create `src/services/mappers/financial.mapper.ts` for financial entities
  - Create `src/services/mappers/index.ts` barrel export
  - Refactor `AppointmentService` from a static class to an object literal following the pattern in `PatientService`
  - Update all services to return `ServiceResult<T>` from every public method
  - Add `AppError.badRequest()` validation at the start of each service method for invalid params
  - Add JSDoc (`@param`, `@returns`, `@throws`) to all public service methods
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 5.1 Write unit tests for mapper functions
    - Test `mapPatientRow` transforms every field correctly (snake_case → camelCase)
    - Test `mapAppointmentRow` transforms every field correctly
    - Test that null/undefined fields return correct default values without throwing
    - _Requirements: 9.1, 9.3_

  - [x] 5.2 Write property test for mapper determinism
    - **Property 6: Mapper determinism** — for any `PatientRow` input, `mapPatientRow` always returns the same output
    - **Validates: Requirements 9.1**

- [x] 6. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement domain validation functions
  - Create `src/lib/validation/appointment.validation.ts` with `validateAppointment(input)` returning `ValidationResult`
    - Validate: date not in the past (new appointments), duration 15–480 minutes, time within configured business hours
  - Create `src/lib/validation/pain.validation.ts` with `validatePainLevel(level)` returning `ValidationResult`
    - Validate: integer between 0 and 10 inclusive
  - Create `src/lib/validation/index.ts` barrel export
  - Integrate validators into the corresponding service methods (call before API)
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 7.1 Write property tests for domain validators
    - **Property 3: Validation determinism** — same input always produces same `ValidationResult`
    - **Property 4: Validation totality** — arbitrary inputs (null, undefined, extreme numbers) never throw
    - **Validates: Requirements 7.4, 7.5**

  - [x] 7.2 Write unit tests for domain validators
    - Test valid appointment inputs pass
    - Test past dates, out-of-range durations, and invalid times fail with descriptive errors
    - Test pain level 0 and 10 pass; -1 and 11 fail; non-integers fail
    - _Requirements: 7.2, 7.3_

- [x] 8. Create Zod schemas for API validation
  - Create `src/schemas/patient.schema.ts` with `PatientCreateSchema`, `PatientUpdateSchema`, `PatientResponseSchema`
  - Create `src/schemas/appointment.schema.ts` with `AppointmentCreateSchema`, `AppointmentUpdateSchema`, `AppointmentResponseSchema`
  - Add business invariant validations to schemas: pain level 0–10, ISO 8601 dates, valid UUIDs for IDs
  - Use `.passthrough()` or `.strip()` explicitly and with a comment where extra fields may appear
  - Create `src/schemas/index.ts` barrel export
  - Integrate schema validation at the API client boundary in `src/api/v2/` — validate response data before passing to services
  - Log validation failures with item ID and invalid fields; exclude invalid items from lists (do not throw)
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 8.1 Write round-trip property tests for Zod schemas
    - **Property 5: Zod schema round-trip consistency** — `schema.parse(schema.parse(entity))` equals `schema.parse(entity)`
    - **Validates: Requirements 9.5**

  - [x] 8.2 Write unit tests for schema validation
    - Test that `PatientResponseSchema` rejects missing `id`
    - Test that `AppointmentCreateSchema` rejects past dates and invalid durations
    - Test that extra fields are handled as documented (stripped or passed through)
    - _Requirements: 5.3, 5.4, 5.5_

- [x] 9. Standardize error handling across services and hooks
  - Replace all bare `catch` blocks in `src/services/` with `AppError.from(err, context)` wrapping
  - Replace all silent fail patterns (`catch { /* silent fail */ }`) with `fisioLogger.warn` calls including operation context
  - Ensure audit operation failures log as warning without blocking the main flow
  - Update hook mutation `onError` callbacks to display user-friendly toasts: different messages for network errors (`isOperational: false`) versus validation errors (`isOperational: true`)
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6_

- [x] 10. Update hooks to use query key registry and enforce separation of concerns
  - Replace all inline string literal query keys in `src/hooks/` with calls to `QueryKeys` registry
  - Audit hooks for mixed data/UI responsibilities; extract UI state (selection, filters, modal open/close) into separate hooks
  - Ensure data hooks (`usePatients`, `useAppointments`, etc.) do not import React UI components or UI-only hooks
  - Ensure data hooks delegate business logic to the corresponding service
  - Add JSDoc to each hook: purpose, parameters, return value, usage example
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 11. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Standardize logging across services and hooks
  - Replace all `console.log`, `console.error`, and `console.warn` calls in `src/services/` and `src/hooks/` with `fisioLogger` equivalents
  - Add `fisioLogger.debug` at the start of each service operation (operation name + non-sensitive params)
  - Add `fisioLogger.error` in all error paths (operation name, entity ID, error message)
  - Implement CPF and other sensitive field masking utility in `src/lib/monitoring/` and apply it before any logging
  - Add `correlationId` support to `fisioLogger` so all logs within a single request share the same ID
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 12.1 Write unit tests for sensitive data masking
    - Verify CPF masking shows only first 3 characters
    - Verify masking does not throw on null/undefined input
    - _Requirements: 10.5_

- [x] 13. Write integration tests for critical services
  - Create `src/tests/services/patientService.test.ts` — mock API layer, test CRUD operations return correct `ServiceResult<T>` shape
  - Create `src/tests/services/appointmentService.test.ts` — mock API layer, test CRUD and validation paths
  - Create `src/tests/services/financialService.test.ts` — mock API layer, test financial operations
  - _Requirements: 9.4_

  - [x] 13.1 Write property test for `ServiceResult` completeness
    - **Property 1: ServiceResult completeness** — result always has exactly one of `data` or `error` non-null, never both or neither
    - **Validates: Requirements 1.2**

- [x] 14. Final checkpoint — Ensure all tests pass
  - Run `pnpm test:unit` and verify all tests pass
  - Fix any TypeScript errors with `pnpm lint`
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation throughout the refactor
- Property tests use fast-check 4 and validate universal correctness properties
- Unit tests validate specific examples and edge cases
- All code uses TypeScript strict mode; avoid `any`
