# FisioFlow Type System

Comprehensive type definitions for type safety across the FisioFlow application.

## Overview

This module provides centralized type definitions that replace `any` types with proper TypeScript types, improving type safety and developer experience.

## Table of Contents

- [Common Types](#common-types)
- [API Types](#api-types)
- [Component Types](#component-types)
- [Evolution Types](#evolution-types)
- [Usage Examples](#usage-examples)

## Common Types

### Location
```
src/types/common.ts
```

### Key Types

#### `Dictionary<T>`
A type-safe replacement for `Record<string, any>`.

```typescript
import type { Dictionary } from '@/types';

// Before
const data: Record<string, any> = {};

// After
const data: Dictionary = {};
```

#### `IconComponent`
Type for Lucide React icon components.

```typescript
import type { IconComponent } from '@/types';

interface ButtonProps {
  icon: IconComponent; // Instead of: icon: any
}
```

#### `UnknownError` & Error Handling
Type-safe error handling utilities.

```typescript
import { getErrorMessage, asError, type UnknownError } from '@/types';

try {
  // Some operation
} catch (error: UnknownError) {
  const message = getErrorMessage(error); // Safely extract message
  const errorObj = asError(error); // Convert to Error if possible
}
```

#### Entity ID Types
Type-safe IDs for different entities.

```typescript
import type { UserId, PatientId, AppointmentId } from '@/types';

const userId: UserId = 'user-123';
const patientId: PatientId = 'patient-456';
```

#### Status Types
Enumerated types for various statuses.

```typescript
import type { AppointmentStatus, PaymentStatus, UserRole } from '@/types';

const status: AppointmentStatus = 'confirmado';
const role: UserRole = 'fisioterapeuta';
```

## API Types

### Location
```
src/types/api.ts
```

### Key Types

#### `ApiResponse<T>`
Standard API response wrapper.

```typescript
import type { ApiResponse } from '@/types';

interface UserResponse extends ApiResponse<User> {
  data: User;
  success: boolean;
  message?: string;
}
```

#### `ApiError`
Standardized API error type.

```typescript
import type { ApiError, ApiErrorCode } from '@/types';

const error: ApiError = {
  code: 'VALIDATION_ERROR',
  message: 'Invalid input',
  timestamp: new Date().toISOString(),
};
```

#### `PaginatedApiResponse<T>`
Paginated list response.

```typescript
import type { PaginatedApiResponse } from '@/types';

interface PatientsResponse extends PaginatedApiResponse<Patient> {
  data: Patient[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

## Component Types

### Location
```
src/types/components.ts
```

### Key Types

#### `BaseComponentProps`
Base props for all components.

```typescript
import type { BaseComponentProps } from '@/types';

interface MyComponentProps extends BaseComponentProps {
  // Your custom props
}
```

#### `IconProps`
Icon component with type-safe icon prop.

```typescript
import type { IconProps } from '@/types';
import { ChevronDown } from 'lucide-react';

interface DropdownProps {
  icon?: IconProps['icon']; // Already typed as IconComponent
}
```

#### `FormFieldProps<T>`
Generic form field props.

```typescript
import type { FormFieldProps } from '@/types';

interface EmailInputProps extends FormFieldProps<string> {
  name: 'email';
  label: 'Email';
  placeholder: 'user@example.com';
  required: true;
}
```

## Evolution Types

### Location
```
src/types/evolution.ts
```

### Key Types

#### `TimelineEvent`
Timeline event with typed data.

```typescript
import type { TimelineEvent, TimelineEventType } from '@/types';

const event: TimelineEvent = {
  id: 'evt-1',
  type: 'session' as TimelineEventType,
  date: new Date(),
  title: 'Sessão de Avaliação',
  data: {
    sessionId: 'session-1',
    soap: { subjective: '...' },
    exercises: [],
  },
};
```

#### `SessionEventData`
Typed session data (replaces `any[]`).

```typescript
import type { SessionEventData } from '@/types';

const sessionData: SessionEventData = {
  sessionId: 'session-1',
  soap: {
    subjective: 'Patient reports pain',
    objective: { inspection: 'Normal' },
  },
  exercises: [
    {
      exerciseId: 'ex-1',
      exerciseName: 'Calf Stretch',
      setsCompleted: 3,
      repsCompleted: 10,
    },
  ],
};
```

## Usage Examples

### Example 1: Type-Safe API Response

```typescript
import { patientSchemas, validateApiResponse } from '@/lib/validations';
import type { ApiResponse } from '@/types';

async function fetchPatient(id: string): Promise<Patient> {
  const response = await fetch(`/api/patients/${id}`);
  return validateApiResponse(patientSchemas.base, response);
}
```

### Example 2: Type-Safe Component Props

```typescript
import type { IconProps, ClickableProps } from '@/types';

interface ActionButtonProps extends ClickableProps {
  icon: IconProps['icon'];
  label: string;
  variant: 'primary' | 'secondary';
}

export function ActionButton({ icon: Icon, label, ...props }: ActionButtonProps) {
  return (
    <button {...props}>
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );
}
```

### Example 3: Type-Safe Evolution Data

```typescript
import type { TimelineEvent, SessionEventData, MeasurementData } from '@/types';

function renderTimelineEvent(event: TimelineEvent) {
  if (event.type === 'session') {
    const data = event.data as SessionEventData;
    return (
      <div>
        <h3>{event.title}</h3>
        <p>Paciente: {data.subjective}</p>
        {data.measurements?.map((m: MeasurementData) => (
          <div key={m.id}>{m.location}: {m.value}</div>
        ))}
      </div>
    );
  }
}
```

### Example 4: Error Handling with UnknownError

```typescript
import { getErrorMessage, type UnknownError } from '@/types';

try {
  await riskyOperation();
} catch (error) {
  console.log(getErrorMessage(error)); // Type-safe error message
}
```

## Type Safety Improvements

### Replacing `any` with Proper Types

| Pattern | Before | After |
|---------|--------|-------|
| Error catch | `catch (e: any)` | `catch (e: UnknownError)` |
| Dynamic object | `Record<string, any>` | `Dictionary` |
| Icon prop | `icon: any` | `icon: IconComponent` |
| Array items | `any[]` | `SpecificType[]` |
| API response | `any` | `ApiResponse<T>` |

## Converting Legacy Code

### Step 1: Identify `any` Usage
```bash
grep -rn ": any" src/ --include="*.ts" --include="*.tsx"
```

### Step 2: Find or Create Type
```typescript
// Check if type exists in src/types/
// Import it
import type { MyType } from '@/types';
```

### Step 3: Replace `any`
```typescript
// Before
function process(data: any) { ... }

// After
function process(data: MyType) { ... }
```

## Best Practices

### 1. Use Specific Types Over Generic
```typescript
// Good
interface PatientData {
  id: string;
  name: string;
}

// Avoid
type GenericData = Record<string, unknown>;
```

### 2. Leverage Zod for Runtime Validation
```typescript
import { patientSchemas, validateOrNull } from '@/lib/validations';

const patient = validateOrNull(patientSchemas.base, rawData);
// patient: PatientBase | null (type-safe)
```

### 3. Create Shared Types for Common Patterns
```typescript
// src/types/common.ts already provides many useful types
// Import and use them instead of creating duplicates

import type {
  Dictionary,
  IconComponent,
  ErrorHandler,
  AsyncErrorHandler,
  ClassName,
} from '@/types';
```

## Type Exports

All types are exported from `src/types/index.ts`:

```typescript
// Import all types
import * from '@/types';

// Import specific categories
import type {
  // Common
  Dictionary,
  IconComponent,

  // API
  ApiResponse,
  ApiError,

  // Components
  BaseComponentProps,
  IconProps,

  // Evolution
  TimelineEvent,
  SessionEventData,
} from '@/types';
```

## Type Guards

```typescript
import { matchesSchema } from '@/lib/validation-utils';
import { patientSchemas } from '@/lib/validations';

// Type guard for runtime type checking
if (matchesSchema(patientSchemas.base, data)) {
  // data is typed as PatientBase here
  console.log(data.name); // Type-safe access
}
```

## See Also

- [Zod Validation Guide](../lib/validations/README.md)
- [Accessibility Utilities](../lib/a11y/README.md)
- [Architecture Documentation](../../../ARCHITECTURE.md)
