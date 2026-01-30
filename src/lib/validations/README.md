# Zod Validation Schemas

Runtime validation schemas using Zod for type-safe API responses and form validation.

## Overview

This module provides comprehensive Zod validation schemas for all major entities in the FisioFlow application. These schemas ensure runtime type safety and data integrity.

## Table of Contents

- [Installation](#installation)
- [Common Schemas](#common-schemas)
- [Domain Schemas](#domain-schemas)
- [Validation Utilities](#validation-utilities)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)

## Installation

Dependencies (already installed):
```bash
npm install zod
```

## Common Schemas

### `entityId`
Validates entity IDs (non-empty strings).

```typescript
import { commonSchemas } from '@/lib/validations';

commonSchemas.entityId.parse('user-123'); // OK
commonSchemas.entityId.parse(''); // Error: "String must contain at least 1 character(s)"
```

### `email`
Email validation with proper format.

```typescript
commonSchemas.email.parse('user@example.com'); // OK
commonSchemas.email.parse('invalid'); // Error: "Email inválido"
```

### `phone`
Brazilian phone number validation.

```typescript
commonSchemas.phone.parse('(11) 98765-4321'); // OK
commonSchemas.phone.parse('11987654321'); // OK
commonSchemas.phone.parse('123'); // Error: "Telefone inválido"
```

### `cpf`
Brazilian CPF validation.

```typescript
commonSchemas.cpf.parse('123.456.789-00'); // OK
```

### `isoDate`
ISO 8601 datetime string validation.

```typescript
commonSchemas.isoDate.parse('2025-01-29T10:00:00Z'); // OK
```

### `paginationParams`
Pagination parameters.

```typescript
commonSchemas.paginationParams.parse({
  page: 1,
  limit: 10,
}); // OK
```

## Domain Schemas

### Patient Schemas

#### `patientSchemas.base`
Complete patient data validation.

```typescript
import { patientSchemas } from '@/lib/validations';

const validPatient = {
  id: 'patient-123',
  name: 'João Silva',
  email: 'joao@example.com',
  phone: '(11) 98765-4321',
  birthDate: '1990-01-01T00:00:00Z',
  gender: 'masculino',
  mainCondition: 'Lombalgia',
  status: 'Em Tratamento',
  progress: 50,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

patientSchemas.base.parse(validPatient); // OK
```

#### `patientSchemas.listItem`
Simplified patient list item.

```typescript
const listItem = {
  id: 'patient-123',
  name: 'João Silva',
  phone: '(11) 98765-4321',
  mainCondition: 'Lombalgia',
  status: 'Em Tratamento',
  progress: 50,
};

patientSchemas.listItem.parse(listItem); // OK
```

#### `patientSchemas.formData`
Form data for create/update.

```typescript
const formData = {
  name: 'Maria Santos',
  email: 'maria@example.com',
  birthDate: '1995-05-15T00:00:00Z',
  gender: 'feminino',
  mainCondition: 'Cervicalgia',
};

patientSchemas.formData.parse(formData); // OK
```

### Appointment Schemas

#### `appointmentSchemas.status`
Appointment status validation.

```typescript
import { appointmentSchemas } from '@/lib/validations';

appointmentSchemas.status.parse('confirmado'); // OK
appointmentSchemas.status.parse('Cancelado'); // OK
appointmentSchemas.status.parse('invalid'); // Error
```

#### `appointmentSchemas.base`
Complete appointment data.

```typescript
const appointment = {
  id: 'apt-123',
  patientId: 'patient-123',
  patientName: 'João Silva',
  date: '2025-01-29',
  time: '10:00',
  duration: 60,
  type: 'Fisioterapia',
  status: 'confirmado',
};

appointmentSchemas.base.parse(appointment); // OK
```

#### `appointmentSchemas.recurringPattern`
Recurring appointment pattern.

```typescript
const pattern = {
  frequency: 'weekly',
  interval: 1,
  endDate: '2025-12-31T00:00:00Z',
};

appointmentSchemas.recurringPattern.parse(pattern); // OK
```

### Exercise Schemas

```typescript
import { exerciseSchemas } from '@/lib/validations';

// Base exercise
const exercise = {
  id: 'ex-1',
  name: 'Calf Stretch',
  category: 'stretching',
  difficulty: 'beginner',
  sets: 3,
  repetitions: 10,
};

exerciseSchemas.base.parse(exercise); // OK

// Exercise plan
const plan = {
  id: 'plan-1',
  name: 'Recovery Plan',
  description: 'Weekly exercise plan',
  patientId: 'patient-123',
  exercises: [
    { exerciseId: 'ex-1', sets: 3, reps: 10, restTime: 60 }
  ],
  status: 'Ativo',
  createdAt: '2025-01-29T10:00:00Z',
  updatedAt: '2025-01-29T10:00:00Z',
};

exerciseSchemas.plan.parse(plan); // OK
```

### User Schemas

```typescript
import { userSchemas } from '@/lib/validations';

// Role validation
userSchemas.role.parse('fisioterapeuta'); // OK
userSchemas.role.parse('invalid'); // Error

// Profile
const profile = {
  id: 'user-123',
  uid: 'uid-123',
  email: 'fisio@example.com',
  name: 'Dr. Silva',
  role: 'fisioterapeuta',
  organization_id: 'org-123',
};

userSchemas.profile.parse(profile); // OK
```

### SOAP Schemas

```typescript
import { soapSchemas } from '@/lib/validations';

const soapRecord = {
  id: 'soap-1',
  patientId: 'patient-123',
  sessionNumber: 1,
  subjective: 'Patient reports pain in lumbar region',
  objective: {
    inspection: 'Normal gait pattern',
    palpation: 'Tenderness in L4-L5 region',
  },
  assessment: 'Lumbar strain with muscle tension',
  plan: {
    shortTermGoals: ['Reduce pain to 3/10'],
    interventions: ['Manual therapy', 'Therapeutic exercises'],
    frequency: '2x/week',
  },
  createdBy: 'user-123',
  createdAt: '2025-01-29T10:00:00Z',
  updatedAt: '2025-01-29T10:00:00Z',
};

soapSchemas.base.parse(soapRecord); // OK
```

## Validation Utilities

### `validateOrNull`
Returns validated data or `null` on failure.

```typescript
import { validateOrNull, patientSchemas } from '@/lib/validation-utils';

const patient = validateOrNull(patientSchemas.base, rawData);
// patient: PatientBase | null

if (patient) {
  console.log(patient.name); // Type-safe access
}
```

### `validateOrDefault`
Returns validated data or default value on failure.

```typescript
import { validateOrDefault, patientSchemas } from '@/lib/validation-utils';

const patient = validateOrDefault(
  patientSchemas.base,
  rawData,
  { id: 'default', name: 'Default Patient' }
);
```

### `validateOrThrow`
Throws error if validation fails.

```typescript
import { validateOrThrow, patientSchemas } from '@/lib/validation-utils';

try {
  const patient = validateOrThrow(patientSchemas.base, rawData);
  console.log(patient.name);
} catch (error) {
  console.error('Validation failed:', error.message);
}
```

### `validateArray`
Filters invalid items from an array.

```typescript
import { validateArray, commonSchemas } from '@/lib/validation-utils';

const ids = ['valid-1', '', 'valid-2'];
const validIds = validateArray(commonSchemas.entityId, ids);
// Returns: ['valid-1', 'valid-2']
```

### `validateApiResponse`
Validates fetch response.

```typescript
import { validateApiResponse, patientSchemas } from '@/lib/validation-utils';

async function fetchPatient(id: string) {
  const response = await fetch(`/api/patients/${id}`);
  return validateApiResponse(patientSchemas.base, response);
}
```

### `matchesSchema`
Type guard for runtime checking.

```typescript
import { matchesSchema, patientSchemas } from '@/lib/validation-utils';

function processPatient(data: unknown) {
  if (matchesSchema(patientSchemas.base, data)) {
    // data is PatientBase here
    console.log(data.name); // Type-safe
  }
}
```

### `validateFormField`
Real-time form field validation.

```typescript
import { validateFormField, patientSchemas } from '@/lib/validation-utils';

const { valid, errors } = validateFormField(
  patientSchemas.formData,
  'email',
  'new-email@example.com',
  currentFormData
);

if (!valid) {
  showErrors(errors);
}
```

### `createValidator`
Creates reusable validator for a schema.

```typescript
import { createValidator, patientSchemas } from '@/lib/validation-utils';

const validatePatient = createValidator(patientSchemas.base, 'patient');

const patient1 = validatePatient.validateOrNull(data1);
const patient2 = validatePatient.validateOrDefault(data2, defaultPatient);
```

## Usage Examples

### Example 1: Validate API Response

```typescript
import { validateApiResponse, patientSchemas } from '@/lib/validation-utils';

async function getPatient(id: string): Promise<Patient> {
  const response = await fetch(`/api/patients/${id}`);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return validateApiResponse(patientSchemas.base, response);
}
```

### Example 2: Validate Form Input

```typescript
import { validateWithErrors, patientSchemas } from '@/lib/validation-utils';

function validatePatientForm(formData: unknown) {
  const { data, errors } = validateWithErrors(patientSchemas.formData, formData);

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, data };
}
```

### Example 3: Safe Parse with Logging

```typescript
import { validateOrNull, patientSchemas } from '@/lib/validation-utils';

const patient = validateOrNull(
  patientSchemas.base,
  apiResponseData,
  'patient from API'
);

if (!patient) {
  logger.warn('Failed to validate patient data', { data: apiResponseData });
}
```

### Example 4: Array Validation

```typescript
import { validateArray, exerciseSchemas } from '@/lib/validation-utils';

function processExercises(exercises: unknown[]) {
  return validateArray(exerciseSchemas.base, exercises);
  // Returns only valid exercises, filters out invalid ones
}
```

## Best Practices

### 1. Always Validate External Data
```typescript
// API responses
const data = validateApiResponse(schema, response);

// Form inputs
const value = validateOrNull(schema, inputValue);

// File uploads
const parsed = validateJson(schema, jsonString);
```

### 2. Use Specific Schemas
```typescript
// Good - Specific schema
const patient = validateOrNull(patientSchemas.base, data);

// Avoid - Generic validation
const data = validateOrNull(z.object({...}), data);
```

### 3. Handle Validation Errors Gracefully
```typescript
import { validateWithErrors } from '@/lib/validation-utils';

const { data, errors } = validateWithErrors(schema, rawData);

if (errors.length > 0) {
  logger.error('Validation failed', { errors });
  return null;
}

return data;
```

### 4. Create Reusable Validators
```typescript
import { createValidator } from '@/lib/validation-utils';

export const validatePatient = createValidator(
  patientSchemas.base,
  'patient'
);

// Use throughout the codebase
const patient = validatePatient.validateOrNull(data);
```

### 5. Type Inference
```typescript
import { validateOrNull } from '@/lib/validation-utils';
import { patientSchemas } from '@/lib/validations';

// Type is automatically inferred
const patient = validateOrNull(patientSchemas.base, data);
//    ^? PatientBase | null
```

## Error Messages

All schemas include Portuguese error messages for user-friendly feedback:

```typescript
commonSchemas.email.parse('invalid');
// Error: "Email inválido"

commonSchemas.phone.parse('123');
// Error: "Telefone inválido"

patientSchemas.formData.parse({ name: '' });
// Error: "Nome é obrigatório"
```

## Custom Validation

Creating custom schemas:

```typescript
import { z } from 'zod';

const customSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  age: z.number().min(0).max(120),
  email: commonSchemas.email,
});

// Use it
import { validateOrNull } from '@/lib/validation-utils';

const result = validateOrNull(customSchema, inputData);
```

## See Also

- [Type System Documentation](../../types/README.md)
- [Validation Utilities](./validation-utils.ts)
- [Zod Documentation](https://zod.dev/)
