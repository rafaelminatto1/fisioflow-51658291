# Referência: Constantes Globais

## Constantes de UI

```typescript
// lib/constants.ts

// Paginação
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const;

// Tamanhos de arquivo
export const FILE_SIZE = {
  MAX_UPLOAD_MB: 50,
  MAX_UPLOAD_BYTES: 50 * 1024 * 1024,
  MAX_IMAGE_MB: 5,
  MAX_IMAGE_BYTES: 5 * 1024 * 1024,
} as const;

// Formatos aceitos
export const FILE_FORMATS = {
  IMAGES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  DOCUMENTS: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  VIDEOS: ['video/mp4', 'video/webm', 'video/quicktime'],
} as const;

// Cores de dor (escala 0-10)
export const PAIN_COLORS = {
  0: '#4ade80',  // Verde
  1: '#a3e635',
  2: '#bef264',
  3: '#facc15',  // Amarelo
  4: '#fbbf24',
  5: '#fb923c',
  6: '#f87171',
  7: '#ef4444',
  8: '#dc2626',
  9: '#b91c1c',
  10: '#ef4444', // Vermelho
} as const;
```

## Constantes de Agendamento

```typescript
// lib/constants/appointments.ts

export const APPOINTMENT_TYPES = {
  INITIAL: 'initial',
  FOLLOW_UP: 'follow_up',
  EVALUATION: 'evaluation',
  THERAPY: 'therapy',
  TELEMEDICINE: 'telemedicine',
} as const;

export const APPOINTMENT_STATUS = {
  SCHEDULED: 'scheduled',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
} as const;

export const APPOINTMENT_DURATION = {
  INITIAL: 60,      // minutos
  FOLLOW_UP: 30,
  EVALUATION: 60,
  THERAPY: 45,
  TELEMEDICINE: 30,
} as const;
```

## Constantes de Exercícios

```typescript
// lib/constants/exercises.ts

export const EXERCISE_CATEGORIES = {
  STRENGTH: 'strength',
  FLEXIBILITY: 'flexibility',
  BALANCE: 'balance',
  CARDIO: 'cardio',
  MOBILITY: 'mobility',
  POSTURE: 'posture',
} as const;

export const EXERCISE_DIFFICULTY = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
} as const;

export const MUSCLE_GROUPS = [
  'quadriceps',
  'hamstrings',
  'gluteus',
  'calves',
  'abdominals',
  'lower_back',
  'upper_back',
  'chest',
  'shoulders',
  'arms',
  'neck',
] as const;
```

## Constantes Clínicas

```typescript
// lib/constants/clinical.ts

export const SOAP_CATEGORIES = {
  SUBJECTIVE: 'subjective',
  OBJECTIVE: 'objective',
  ASSESSMENT: 'assessment',
  PLAN: 'plan',
} as const;

export const PAIN_SCALE = {
  NONE: 0,
  MILD: 3,
  MODERATE: 5,
  SEVERE: 7,
  EXTREME: 10,
} as const;

export const GENDER = {
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other',
} as const;
```

## Constantes de Usuário

```typescript
// lib/constants/user.ts

export const USER_ROLES = {
  ADMIN: 'admin',
  PHYSIOTHERAPIST: 'physiotherapist',
  INTERN: 'intern',
  PATIENT: 'patient',
  PARTNER: 'partner',
} as const;

export const ROLE_PERMISSIONS = {
  admin: {
    everything: true,
  },
  physiotherapist: {
    patients: ['read', 'create', 'update', 'delete'],
    appointments: ['read', 'create', 'update', 'delete'],
    evolutions: ['read', 'create', 'update', 'sign'],
    exercises: ['read', 'create', 'update', 'delete'],
    financial: ['read', 'create'],
  },
  intern: {
    patients: ['read'],
    appointments: ['read'],
    evolutions: ['read', 'create'],
    exercises: ['read'],
  },
  patient: {
    self: ['read'],
    exercises: ['read'],
  },
} as const;
```

## Constantes Financeiras

```typescript
// lib/constants/financial.ts

export const TRANSACTION_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense',
} as const;

export const TRANSACTION_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const PAYMENT_METHODS = {
  CASH: 'cash',
  CREDIT_CARD: 'credit_card',
  DEBIT_CARD: 'debit_card',
  PIX: 'pix',
  BANK_TRANSFER: 'bank_transfer',
} as const;

export const INVOICE_CATEGORIES = {
  CONSULTATION: 'consulta',
  ASSESSMENT: 'avaliacao',
  THERAPY: 'terapia',
  PACKAGE: 'pacote',
  PRODUCT: 'produto',
} as const;
```

## Constantes de Notificação

```typescript
// lib/constants/notification.ts

export const NOTIFICATION_TYPES = {
  APPOINTMENT_REMINDER: 'appointment_reminder',
  APPOINTMENT_CANCELLED: 'appointment_cancelled',
  PRESCRIPTION_ASSIGNED: 'prescription_assigned',
  PAYMENT_RECEIVED: 'payment_received',
  SYSTEM: 'system',
} as const;

export const NOTIFICATION_PREFERENCES = {
  EMAIL: 'email',
  PUSH: 'push',
  SMS: 'sms',
  WHATSAPP: 'whatsapp',
} as const;
```

## URLs e Endpoints

```typescript
// lib/constants/api.ts

export const API_ENDPOINTS = {
  PATIENTS: '/patients',
  APPOINTMENTS: '/appointments',
  EVOLUTIONS: '/evolutions',
  EXERCISES: '/exercises',
  PRESCRIPTIONS: '/prescriptions',
  TRANSACTIONS: '/transactions',
} as const;

export const EXTERNAL_URLS = {
  WHATSAPP: 'https://wa.me/',
  GITHUB: 'https://github.com/fisioflow/fisioflow',
  DOCS: 'https://docs.fisioflow.com',
} as const;
```

## Expressões Regulares

```typescript
// lib/constants/regex.ts

export const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  CPF: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
  CNPJ: /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/,
  PHONE: /^\(\d{2}\)\s\d{4,5}-\d{4}$/,
  CEP: /^\d{5}-\d{3}$/,
  DATE: /^\d{4}-\d{2}-\d{2}$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
} as const;
```

## Veja Também

- [Tipos TypeScript](./tipos-ts.md) - Enums e tipos
- [Validações](./validacoes.md) - Schemas Zod
