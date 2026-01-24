# FisioFlow - API Reference

Complete API documentation for FisioFlow backend services.

## Table of Contents

1. [Authentication](#authentication)
2. [Patients API](#patients-api)
3. [Appointments API](#appointments-api)
4. [Medical Records API](#medical-records-api)
5. [Exercises API](#exercises-api)
6. [Payments API](#payments-api)
7. [Webhooks](#webhooks)

---

## Authentication

### Sign In

**Endpoint:** `call:signIn`

**Parameters:**
```typescript
{
  email: string;
  password: string;
}
```

**Response:**
```typescript
{
  success: true;
  user: {
    uid: string;
    email: string;
    displayName?: string;
  };
  token: string;
}
```

### Sign Up

**Endpoint:** `call:signUp`

**Parameters:**
```typescript
{
  email: string;
  password: string;
  displayName: string;
  organizationName?: string;
}
```

**Response:**
```typescript
{
  success: true;
  user: {
    uid: string;
    email: string;
  };
}
```

### Reset Password

**Endpoint:** `call:resetPassword`

**Parameters:**
```typescript
{
  email: string;
}
```

**Response:**
```typescript
{
  success: true;
}
```

---

## Patients API

### List Patients

**Endpoint:** `call:listPatients`

**Parameters:**
```typescript
{
  filters?: {
    status?: 'active' | 'inactive';
    search?: string;
  };
  pagination?: {
    page: number;
    limit: number;
  };
}
```

**Response:**
```typescript
{
  success: true;
  data: Patient[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}
```

### Create Patient

**Endpoint:** `call:createPatient`

**Parameters:**
```typescript
{
  fullName: string;
  email?: string;
  phone?: string;
  cpf?: string;
  birthDate?: string;
  gender?: 'male' | 'female' | 'other';
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
}
```

**Response:**
```typescript
{
  success: true;
  data: Patient;
}
```

### Update Patient

**Endpoint:** `call:updatePatient`

**Parameters:**
```typescript
{
  patientId: string;
  updates: Partial<Patient>;
}
```

**Response:**
```typescript
{
  success: true;
  data: Patient;
}
```

### Delete Patient

**Endpoint:** `call:deletePatient`

**Parameters:**
```typescript
{
  patientId: string;
  softDelete?: boolean; // Default: true
}
```

**Response:**
```typescript
{
  success: true;
}
```

---

## Appointments API

### List Appointments

**Endpoint:** `call:listAppointments`

**Parameters:**
```typescript
{
  startDate: string; // ISO date
  endDate: string;   // ISO date
  therapistId?: string;
  status?: ('agendado' | 'confirmado' | 'concluido' | 'cancelado')[];
}
```

**Response:**
```typescript
{
  success: true;
  data: Appointment[];
}
```

### Create Appointment

**Endpoint:** `call:createAppointment`

**Parameters:**
```typescript
{
  patientId: string;
  date: string;        // ISO date
  startTime: string;   // HH:mm
  endTime?: string;    // HH:mm
  type?: 'avaliacao' | 'seguida' | 'retorno';
  status?: 'agendado' | 'confirmado';
  notes?: string;
  room?: string;
}
```

**Response:**
```typescript
{
  success: true;
  data: Appointment;
}
```

### Update Appointment

**Endpoint:** `call:updateAppointment`

**Parameters:**
```typescript
{
  appointmentId: string;
  updates: Partial<Appointment>;
}
```

**Response:**
```typescript
{
  success: true;
  data: Appointment;
}
```

### Cancel Appointment

**Endpoint:** `call:cancelAppointment`

**Parameters:**
```typescript
{
  appointmentId: string;
  reason?: string;
  notifyPatient?: boolean; // Default: true
}
```

**Response:**
```typescript
{
  success: true;
}
```

---

## Medical Records API

### Create Evolution

**Endpoint:** `call:createEvolution`

**Parameters:**
```typescript
{
  patientId: string;
  appointmentId?: string;
  soap: {
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
  };
  painLevel?: number; // 0-10
  evolution?: string;
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
  }>;
}
```

**Response:**
```typescript
{
  success: true;
  data: MedicalEvolution;
}
```

### Update Evolution

**Endpoint:** `call:updateEvolution`

**Parameters:**
```typescript
{
  evolutionId: string;
  updates: Partial<MedicalEvolution>;
}
```

**Response:**
```typescript
{
  success: true;
  data: MedicalEvolution;
  version: number;
}
```

### Get Evolution History

**Endpoint:** `call:getEvolutionHistory`

**Parameters:**
```typescript
{
  patientId: string;
  limit?: number;
  offset?: number;
}
```

**Response:**
```typescript
{
  success: true;
  data: MedicalEvolution[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}
```

### Compare Evolutions

**Endpoint:** `call:compareEvolutions`

**Parameters:**
```typescript
{
  patientId: string;
  evolutionId1: string;
  evolutionId2: string;
}
```

**Response:**
```typescript
{
  success: true;
  comparison: {
    painLevelChange: number;
    progressSummary: string;
    differences: Record<string, { before: any; after: any }>;
  };
}
```

---

## Exercises API

### List Exercises

**Endpoint:** `call:listExercises`

**Parameters:**
```typescript
{
  filters?: {
    category?: string;
    difficulty?: 'facil' | 'medio' | 'dificil';
    bodyPart?: string;
    equipment?: string;
  };
  search?: string;
}
```

**Response:**
```typescript
{
  success: true;
  data: Exercise[];
}
```

### Create Exercise Plan

**Endpoint:** `call:createExercisePlan`

**Parameters:**
```typescript
{
  patientId: string;
  name: string;
  description?: string;
  exercises: Array<{
    exerciseId: string;
    sets?: number;
    reps?: string;
    duration?: number;
    restTime?: number;
    notes?: string;
  }>;
  validFrom?: string;
  validUntil?: string;
}
```

**Response:**
```typescript
{
  success: true;
  data: ExercisePlan;
}
```

### Update Exercise Progress

**Endpoint:** `call:updateExerciseProgress`

**Parameters:**
```typescript
{
  patientPlanId: string;
  exerciseId: string;
  status: 'pending' | 'in_progress' | 'completed';
  notes?: string;
}
```

**Response:**
```typescript
{
  success: true;
  data: PatientExercise;
}
```

---

## Payments API

### Create Checkout Session

**Endpoint:** `call:createVoucherCheckout`

**Parameters:**
```typescript
{
  voucherType: 'single_session' | 'sessions_5' | 'sessions_10' | 'monthly_unlimited';
  successUrl: string;
  cancelUrl: string;
}
```

**Response:**
```typescript
{
  success: true;
  checkoutUrl: string;
}
```

### Get Active Vouchers

**Endpoint:** `call:getActiveVouchers`

**Parameters:**
```typescript
{
  patientId?: string; // If empty, returns current user's vouchers
}
```

**Response:**
```typescript
{
  success: true;
  data: Voucher[];
}
```

### Use Voucher Session

**Endpoint:** `call:useVoucherSession`

**Parameters:**
```typescript
{
  voucherId: string;
  appointmentId: string;
}
```

**Response:**
```typescript
{
  success: true;
  remainingSessions: number;
}
```

---

## Webhooks

### Stripe Webhook

**Endpoint:** `https://your-project.web.app/api/webhooks/stripe`

**Events Handled:**
- `checkout.session.completed`
- `payment_intent.succeeded`
- `invoice.paid`
- `customer.subscription.deleted`

### WhatsApp Webhook

**Endpoint:** `https://your-project.web.app/api/webhooks/whatsapp`

**Events Handled:**
- Message received
- Message status update

### Google Calendar Webhook

**Endpoint:** `https://your-project.web.app/api/webhooks/calendar`

**Events Handled:**
- Event created
- Event updated
- Event deleted

---

## Error Handling

All API calls follow this error response format:

```typescript
{
  success: false;
  error: {
    code: string;        // e.g., 'INVALID_ARGUMENT', 'NOT_FOUND'
    message: string;     // Human-readable message
    details?: any;       // Additional error details
  };
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHENTICATED` | User not logged in |
| `PERMISSION_DENIED` | User lacks permission |
| `NOT_FOUND` | Resource not found |
| `INVALID_ARGUMENT` | Invalid input |
| `ALREADY_EXISTS` | Resource already exists |
| `FAILED_PRECONDITION` | Request cannot be executed |
| `INTERNAL` | Internal server error |

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| All APIs | 100 requests | 1 minute |
| Create operations | 20 requests | 1 minute |
| List operations | 50 requests | 1 minute |

---

## Pagination

List endpoints support cursor-based pagination:

```typescript
{
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
    nextCursor?: string;
  };
}
```

---

## SDK Usage

### TypeScript/JavaScript

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const createPatient = httpsCallable(functions, 'createPatient');

const result = await createPatient({
  fullName: 'John Doe',
  email: 'john@example.com',
});

console.log(result.data);
```

### React Hook

```typescript
import { useCallable } from '@/hooks/useCallable';

function CreatePatientForm() {
  const { call, loading, error } = useCallable('createPatient');

  const handleSubmit = async (data) => {
    const result = await call(data);
    console.log(result);
  };

  // ...
}
```

---

## Versioning

API version: `v1`

Current version is stable and backward-compatible within the major version.
