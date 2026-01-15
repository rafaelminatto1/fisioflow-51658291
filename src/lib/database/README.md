# Database Module

This module provides type-safe constants, validation, and documentation for the database schema.

## Overview

The database uses **mixed languages** (Portuguese and English) for status values across different tables. This is a legacy design decision that should be standardized in the future. This module helps prevent errors by providing:

1. **Type-safe constants** for all valid status values
2. **Runtime validation** to catch invalid values before they reach the database
3. **Schema documentation** to understand the database structure
4. **Utility functions** for formatting and displaying status values

## Installation

```bash
# This module is part of the fisioflow project
# No additional installation required
```

## Usage

### Importing

```typescript
// Import everything
import * from '@/lib/database';

// Or import specific items
import {
  PATIENT_STATUS,
  APPOINTMENT_STATUS,
  validateAppointmentStatus,
  formatStatusForDisplay,
} from '@/lib/database';
```

### Using Constants

```typescript
import { APPOINTMENT_STATUS } from '@/lib/database';

// Use constants instead of magic strings
const { data } = await supabase
  .from('appointments')
  .select('*')
  .in('status', [
    APPOINTMENT_STATUS.AGENDADO,
    APPOINTMENT_STATUS.CONFIRMADO,
  ]);
```

### Validating Status Values

```typescript
import { validateAppointmentStatus } from '@/lib/database';

try {
  // Validate before updating
  validateAppointmentStatus(newStatus);

  await supabase
    .from('appointments')
    .update({ status: newStatus })
    .eq('id', appointmentId);
} catch (error) {
  if (error instanceof DatabaseValidationError) {
    toast.error(error.message);
  }
}
```

### Formatting for Display

```typescript
import { formatStatusForDisplay, getStatusBadgeClass } from '@/lib/database';

// Get user-friendly label
const label = formatStatusForDisplay('agendado', 'appointments');
// Returns: 'Agendado'

// Get CSS classes for badge
const className = getStatusBadgeClass('agendado', 'appointments');
// Returns: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'

// Usage in component
<Badge className={className}>{label}</Badge>
```

## Database Schema

### Patients Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `full_name` | TEXT | Patient's full name |
| `status` | TEXT | **active**, **inactive**, **archived** (English) |

### Appointments Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `patient_id` | UUID | Foreign key to patients |
| `date` | DATE | Appointment date |
| `start_time` | TIME | Appointment start time |
| `status` | TEXT | **agendado**, **confirmado**, **em_andamento**, **atendido**, **cancelado**, **falta** (Portuguese) |

### Sessions Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `patient_id` | UUID | Foreign key to patients |
| `status` | TEXT | **draft**, **completed** (English) |

### Patient Pathologies Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `patient_id` | UUID | Foreign key to patients |
| `status` | TEXT | **em_tratamento**, **tratada**, **cronica** (Portuguese) |

### Payments Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `patient_id` | UUID | Foreign key to patients |
| `status` | TEXT | **pending**, **paid**, **cancelled**, **refunded** (English) |

## Common Query Patterns

```typescript
import { QueryPatterns } from '@/lib/database';

// Get active patients
const patients = await supabase
  .from('patients')
  .select('*')
  .eq('organization_id', orgId)
  .eq('status', PATIENT_STATUS.ACTIVE);

// Get upcoming appointments
const appointments = await supabase
  .from('appointments')
  .select('*')
  .gte('date', new Date().toISOString())
  .in('status', [
    APPOINTMENT_STATUS.AGENDADO,
    APPOINTMENT_STATUS.CONFIRMADO,
  ]);

// Get completed sessions
const sessions = await supabase
  .from('sessions')
  .select('*')
  .eq('patient_id', patientId)
  .eq('status', SESSION_STATUS.COMPLETED);

// Get paid payments
const payments = await supabase
  .from('payments')
  .select('*')
  .eq('status', PAYMENT_STATUS.PAID)
  .gte('paid_at', startDate);
```

## Migration Guide

If you're updating code that uses hardcoded status strings:

### Before

```typescript
// ❌ Hardcoded strings - error-prone
const { data } = await supabase
  .from('appointments')
  .select('*')
  .in('status', ['agendado', 'confirmado']); // Easy to typo
```

### After

```typescript
// ✅ Using constants - type-safe
import { APPOINTMENT_STATUS } from '@/lib/database';

const { data } = await supabase
  .from('appointments')
  .select('*')
  .in('status', [
    APPOINTMENT_STATUS.AGENDADO,
    APPOINTMENT_STATUS.CONFIRMADO,
  ]); // Auto-completion, type-safe
```

## Best Practices

1. **Always use constants** instead of hardcoded strings
2. **Validate user input** before sending to the database
3. **Use utility functions** for formatting status values
4. **Check TypeScript types** - invalid values will show errors
5. **Keep documentation in sync** with migrations

## Future Improvements

- [ ] Standardize all status values to a single language
- [ ] Add Zod schemas for runtime validation
- [ ] Generate TypeScript types from Supabase
- [ ] Add more query patterns and examples

## Related Files

- `supabase/migrations/` - Database migration files
- `src/integrations/supabase/` - Supabase client configuration
- `src/lib/schemas/` - Zod validation schemas

## Support

For issues or questions about the database schema:
1. Check the migration files in `supabase/migrations/`
2. Review this module's documentation
3. Consult the Supabase dashboard for the current schema
