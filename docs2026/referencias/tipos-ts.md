# Referência: TypeScript Types

## Tipos Principais

### User & Auth

```typescript
// types/user.ts
export type UserRole = 'admin' | 'physiotherapist' | 'intern' | 'patient' | 'partner';

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: UserRole;
  organization_id: string;
  created_at: string;
  updated_at: string;
}
```

### Patient

```typescript
// types/patient.ts
export interface Patient {
  id: string;
  organization_id: string;
  full_name: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  address?: Address;
  insurance_info?: InsuranceInfo;
  medical_history?: string;
  allergies?: string[];
  blood_type?: string;
  emergency_contact?: EmergencyContact;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Address {
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip_code?: string;
}

export interface InsuranceInfo {
  provider?: string;
  card_number?: string;
  expiration?: string;
}
```

### Appointment

```typescript
// types/appointment.ts
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
export type AppointmentType = 'initial' | 'follow_up' | 'evaluation' | 'therapy' | 'telemedicine';

export interface Appointment {
  id: string;
  organization_id: string;
  patient_id: string;
  therapist_id: string;
  room_id?: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  type: AppointmentType;
  notes?: string;
  created_at: string;
  updated_at: string;
}
```

### Evolution (SOAP)

```typescript
// types/evolution.ts
export type EvolutionStatus = 'draft' | 'final' | 'signed';

export interface Evolution {
  id: string;
  organization_id: string;
  patient_id: string;
  therapist_id: string;
  appointment_id?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  pain_level?: number;
  pain_location?: Record<string, number>;
  status: EvolutionStatus;
  signature_data?: any;
  signed_at?: string;
  created_at: string;
  updated_at: string;
}
```

### Exercise

```typescript
// types/exercise.ts
export interface Exercise {
  id: string;
  name: string;
  description?: string;
  category_id?: string;
  muscle_groups?: string[];
  equipment?: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  video_url?: string;
  thumbnail_url?: string;
  instructions?: string[];
  sets?: number;
  reps?: number;
  duration_seconds?: number;
  rest_seconds?: number;
  tags?: string[];
  created_at: string;
  updated_at: string;
}
```

### Evaluation Forms

```typescript
// types/clinical-forms.ts
export type ClinicalFieldType =
  | 'texto_curto'
  | 'texto_longo'
  | 'opcao_unica'
  | 'selecao'
  | 'lista'
  | 'escala'
  | 'data'
  | 'hora'
  | 'info'
  | 'numero';

export interface EvaluationForm {
  id: string;
  organization_id: string | null;
  created_by?: string | null;
  nome: string;
  descricao?: string | null;
  referencias?: string | null;
  tipo: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  fields?: EvaluationFormField[];
}

export interface EvaluationFormField {
  id: string;
  form_id: string;
  tipo_campo: ClinicalFieldType;
  label: string;
  placeholder?: string | null;
  opcoes?: string[] | null;
  ordem: number;
  obrigatorio: boolean;
  grupo?: string | null;
  descricao?: string | null;
  minimo?: number | null;
  maximo?: number | null;
  created_at?: string;
}
```

### Financial

```typescript
// types/financial.ts
export type TransactionType = 'income' | 'expense';
export type TransactionStatus = 'pending' | 'completed' | 'cancelled';

export interface FinancialTransaction {
  id: string;
  organization_id: string;
  type: TransactionType;
  amount: number;
  description: string;
  category?: string;
  status: TransactionStatus;
  appointment_id?: string;
  patient_id?: string;
  payment_method?: string;
  due_date?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}
```

### Notification

```typescript
// types/notification.ts
export type NotificationType =
  | 'appointment_reminder'
  | 'appointment_cancelled'
  | 'prescription_assigned'
  | 'payment_received'
  | 'system';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  read: boolean;
  created_at: string;
}
```

## Database Types (Supabase)

```typescript
// types/database.types.ts
// Gerado automaticamente via Supabase CLI
// supabase gen types typescript --local > src/types/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      patients: {
        Row: Patient;
        Insert: PatientInsert;
        Update: PatientUpdate;
      };
      appointments: {
        Row: Appointment;
        Insert: AppointmentInsert;
        Update: AppointmentUpdate;
      };
      // ... outras tabelas
    };
  };
}
```

## Veja Também

- [Validações](./validacoes.md) - Schemas Zod
- [Hooks Customizados](./hooks-customizados.md) - Hooks que usam esses tipos
