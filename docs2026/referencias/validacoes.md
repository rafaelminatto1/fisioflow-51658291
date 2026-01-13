# Referência: Schemas de Validação (Zod)

## Validação de Paciente

```typescript
// lib/validations/patient.ts
import { z } from 'zod';

export const patientSchema = z.object({
  full_name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos'),
  date_of_birth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  address: z.object({
    street: z.string().optional(),
    number: z.string().optional(),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    state: z.string().length(2).optional(),
    zip_code: z.string().regex(/^\d{5}-?\d{3}$/).optional(),
  }).optional(),
  insurance_info: z.object({
    provider: z.string().optional(),
    card_number: z.string().optional(),
    expiration: z.string().optional(),
  }).optional(),
});

export type PatientFormValues = z.infer<typeof patientSchema>;
```

## Validação de Agendamento

```typescript
// lib/validations/appointment.ts
export const appointmentSchema = z.object({
  patient_id: z.string().uuid('ID de paciente inválido'),
  therapist_id: z.string().uuid('ID de terapeuta inválido'),
  room_id: z.string().uuid().optional(),
  title: z.string().min(3, 'Título deve ter no mínimo 3 caracteres'),
  description: z.string().optional(),
  start_time: z.string().refine((date) => !isNaN(Date.parse(date)), 'Data inválida'),
  end_time: z.string().refine((date) => !isNaN(Date.parse(date)), 'Data inválida'),
  type: z.enum(['initial', 'follow_up', 'evaluation', 'therapy', 'telemedicine']),
  notes: z.string().optional(),
}).refine(
  (data) => new Date(data.end_time) > new Date(data.start_time),
  'Horário final deve ser maior que inicial'
);

export type AppointmentFormValues = z.infer<typeof appointmentSchema>;
```

## Validação de Prontuário (SOAP)

```typescript
// lib/validations/evolution.ts
export const evolutionSchema = z.object({
  patient_id: z.string().uuid(),
  appointment_id: z.string().uuid().optional(),
  subjective: z.string().optional(),
  objective: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  pain_level: z.number().min(0).max(10).optional(),
  pain_location: z.record(z.number()).optional(),
});

export type EvolutionFormValues = z.infer<typeof evolutionSchema>;
```

## Validação de Exercício

```typescript
// lib/validations/exercise.ts
export const exerciseSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  description: z.string().optional(),
  category_id: z.string().uuid().optional(),
  muscle_groups: z.array(z.string()).optional(),
  equipment: z.array(z.string()).optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  video_url: z.string().url('URL inválida').optional().or(z.literal('')),
  instructions: z.array(z.string()).optional(),
  sets: z.number().int().positive().optional(),
  reps: z.number().int().positive().optional(),
  duration_seconds: z.number().int().positive().optional(),
  rest_seconds: z.number().int().min(0).optional(),
});

export type ExerciseFormValues = z.infer<typeof exerciseSchema>;
```

## Validação de Ficha de Avaliação

```typescript
// lib/validations/evaluation-form.ts
export const evaluationFormSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  descricao: z.string().optional(),
  tipo: z.string().min(1, 'Tipo é obrigatório'),
  referencias: z.string().optional(),
  ativo: z.boolean().default(true),
});

export const evaluationFormFieldSchema = z.object({
  tipo_campo: z.enum([
    'texto_curto',
    'texto_longo',
    'opcao_unica',
    'selecao',
    'lista',
    'escala',
    'data',
    'hora',
    'info',
    'numero',
  ]),
  label: z.string().min(1, 'Label é obrigatório'),
  placeholder: z.string().optional(),
  opcoes: z.array(z.string()).optional(),
  ordem: z.number().int().positive(),
  obrigatorio: z.boolean().default(false),
  grupo: z.string().optional(),
  descricao: z.string().optional(),
  minimo: z.number().optional(),
  maximo: z.number().optional(),
});

export type EvaluationFormValues = z.infer<typeof evaluationFormSchema>;
export type EvaluationFormFieldValues = z.infer<typeof evaluationFormFieldSchema>;
```

## Validação de Transação Financeira

```typescript
// lib/validations/financial.ts
export const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive('Valor deve ser positivo'),
  description: z.string().min(3, 'Descrição deve ter no mínimo 3 caracteres'),
  category: z.string().optional(),
  status: z.enum(['pending', 'completed', 'cancelled']).default('pending'),
  appointment_id: z.string().uuid().optional(),
  patient_id: z.string().uuid().optional(),
  payment_method: z.string().optional(),
  due_date: z.string().optional(),
});

export type TransactionFormValues = z.infer<typeof transactionSchema>;
```

## Validação de Login

```typescript
// lib/validations/auth.ts
export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

export const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
```

## Uso com React Hook Form

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { patientSchema, type PatientFormValues } from '@/lib/validations/patient';

function PatientForm() {
  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
    },
  });

  const onSubmit = (data: PatientFormValues) => {
    console.log(data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* ... */}
    </form>
  );
}
```

## Veja Também

- [Tipos TypeScript](./tipos-ts.md) - Tipos correspondentes
- [Estado e Forms](../09-estado-forms.md) - Gerenciamento de forms
