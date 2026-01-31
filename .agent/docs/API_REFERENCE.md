# FisioFlow - API Reference

> **Base URL**: `https://southamerica-east1-fisioflow-migration.cloudfunctions.net`
> **Versão**: 2.0.0
> **Autenticação**: Firebase Auth (JWT)

---

## Índice

1. [Autenticação](#autenticação)
2. [Pacientes](#pacientes)
3. [Agendamentos](#agendamentos)
4. [Exercícios](#exercícios)
5. [Avaliações](#avaliações)
6. [Financeiro](#financeiro)
7. [Prontuário](#prontuário)
8. [Upload](#upload)
9. [AI Functions](#ai-functions)
10. [Códigos de Erro](#códigos-de-erro)

---

## Autenticação

### Obtendo o Token

```typescript
import { getAuth, getIdToken } from 'firebase/auth';

const auth = getAuth();
const user = auth.currentUser;

if (user) {
  const token = await getIdToken(user);
  // Usar o token no header Authorization: Bearer <token>
}
```

### Chamando uma Função

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const listPatients = httpsCallable(functions, 'listPatients');

const result = await listPatients({
  status: 'ativo',
  limit: 50
});

console.log(result.data);
```

---

## Pacientes

### listPatients

Lista pacientes com filtros opcionais.

**Tipo**: `onCall`

**Parâmetros**:
```typescript
{
  status?: string;      // Filtra por status
  search?: string;      // Busca por nome, CPF ou email
  limit?: number;       // Máximo de resultados (default: 50)
  offset?: number;      // Paginação (default: 0)
}
```

**Resposta**:
```typescript
{
  data: Patient[];
  total: number;
  page: number;
  perPage: number;
}
```

**Exemplo**:
```typescript
const result = await httpsCallable(functions, 'listPatients')({
  search: 'joao',
  status: 'Em_tratamento',
  limit: 20
});
```

---

### createPatient

Cria um novo paciente.

**Tipo**: `onCall`

**Parâmetros**:
```typescript
{
  name: string;                          // Obrigatório
  phone?: string;
  cpf?: string;
  email?: string;
  birth_date?: string;                   // ISO date string
  gender?: string;
  address?: Record<string, any>;
  emergency_contact?: Record<string, any>;
  medical_history?: string;
  main_condition?: string;
  status?: string;                       // default: 'Inicial'
  incomplete_registration?: boolean;     // Para cadastro rápido
}
```

**Resposta**:
```typescript
{
  data: Patient;
}
```

---

### updatePatient

Atualiza um paciente existente.

**Tipo**: `onCall`

**Parâmetros**:
```typescript
{
  patientId: string;     // Obrigatório
  name?: string;
  cpf?: string;
  email?: string;
  phone?: string;
  birth_date?: string;
  gender?: string;
  medical_history?: string;
  main_condition?: string;
  status?: string;
  progress?: number;
}
```

**Resposta**:
```typescript
{
  data: Patient;
}
```

---

### getPatient

Busca um paciente por ID ou profileId.

**Tipo**: `onCall`

**Parâmetros**:
```typescript
{
  patientId?: string;    // Busca por ID
  profileId?: string;    // Busca por profile ID
}
```

**Resposta**:
```typescript
{
  data: Patient;
}
```

---

### deletePatient

Remove (soft delete) um paciente.

**Tipo**: `onCall`

**Parâmetros**:
```typescript
{
  patientId: string;
}
```

**Resposta**:
```typescript
{
  success: boolean;
}
```

---

### getPatientStats

Busca estatísticas de um paciente.

**Tipo**: `onCall`

**Parâmetros**:
```typescript
{
  patientId: string;
}
```

**Resposta**:
```typescript
{
  data: {
    appointments: {
      total: number;
      completed: number;
      scheduled: number;
      upcoming: number;
    };
    treatment_sessions: number;
    active_plans: number;
  };
}
```

---

## Agendamentos

### listAppointments

Lista agendamentos.

**Tipo**: `onCall`

**Parâmetros**:
```typescript
{
  startDate?: string;    // ISO date
  endDate?: string;      // ISO date
  status?: string;
  patientId?: string;
  limit?: number;
}
```

---

### createAppointment

Cria um novo agendamento.

**Tipo**: `onCall`

**Parâmetros**:
```typescript
{
  patientId: string;
  appointmentDate: string;    // YYYY-MM-DD
  appointmentTime: string;    // HH:MM
  duration?: number;          // minutos, default: 60
  type?: string;
  notes?: string;
}
```

---

### updateAppointment

Atualiza um agendamento.

**Tipo**: `onCall`

**Parâmetros**:
```typescript
{
  appointmentId: string;
  appointmentDate?: string;
  appointmentTime?: string;
  duration?: number;
  status?: string;
  notes?: string;
}
```

---

### cancelAppointment

Cancela um agendamento.

**Tipo**: `onCall`

**Parâmetros**:
```typescript
{
  appointmentId: string;
  reason?: string;
}
```

---

### checkTimeConflict

Verifica conflito de horário.

**Tipo**: `onCall`

**Parâmetros**:
```typescript
{
  appointmentDate: string;
  appointmentTime: string;
  duration: number;
  excludeAppointmentId?: string;
}
```

**Resposta**:
```typescript
{
  hasConflict: boolean;
  conflictingAppointments?: Appointment[];
}
```

---

## Exercícios

### listExercises

Lista exercícios da biblioteca.

**Tipo**: `onCall`

**Parâmetros**:
```typescript
{
  category?: string;
  difficulty?: string;
  tags?: string[];
  search?: string;
  limit?: number;
}
```

---

### getExercise

Busca um exercício por ID.

**Tipo**: `onCall`

**Parâmetros**:
```typescript
{
  exerciseId: string;
}
```

---

### searchSimilarExercises

Busca exercícios similares.

**Tipo**: `onCall`

**Parâmetros**:
```typescript
{
  exerciseId: string;
  limit?: number;
}
```

---

### createExercise

Cria um novo exercício.

**Tipo**: `onCall`

**Parâmetros**:
```typescript
{
  name: string;
  category: string;
  description?: string;
  tags?: string[];
  difficulty?: string;
  videoUrl?: string;
  instructions?: string[];
  precautions?: string[];
}
```

---

### getPrescribedExercises

Busca exercícios prescritos para um paciente.

**Tipo**: `onCall`

**Parâmetros**:
```typescript
{
  patientId: string;
  active?: boolean;
}
```

---

### logExercise

Registra execução de exercício pelo paciente.

**Tipo**: `onCall`

**Parâmetros**:
```typescript
{
  patientId: string;
  exerciseId: string;
  sets?: number;
  reps?: number;
  duration?: number;
  notes?: string;
  painLevel?: number;  // 0-10
}
```

---

### mergeExercises

Funde exercícios duplicados.

**Tipo**: `onCall`

**Parâmetros**:
```typescript
{
  sourceExerciseIds: string[];
  targetExerciseId: string;
}
```

---

## Avaliações

### listAssessments

Lista avaliações de um paciente.

**Tipo**: `onCall`

**Parâmetros**:
```typescript
{
  patientId: string;
  limit?: number;
}
```

---

### createAssessment

Cria uma nova avaliação.

**Tipo**: `onCall`

**Parâmetros**:
```typescript
{
  patientId: string;
  templateId: string;
  title: string;
  assessmentDate: string;
  responses: Array<{
    questionId: string;
    answer?: string | number | any;
  }>;
  conclusion?: string;
  recommendations?: string;
  nextAssessmentDate?: string;
}
```

---

### listAssessmentTemplates

Lista templates de avaliação.

**Tipo**: `onCall`

**Parâmetros**:
```typescript
{
  category?: string;
  isGlobal?: boolean;
}
```

---

## Financeiro

### listTransactions

Lista transações financeiras.

**Tipo**: `onCall`

**Parâmetros**:
```typescript
{
  tipo?: 'receita' | 'despesa';
  startDate?: string;
  endDate?: string;
  limit?: number;
}
```

**Resposta**:
```typescript
{
  data: Transaction[];
  total: number;
  summary: {
    receitas: number;
    despesas: number;
    saldo: number;
  };
}
```

---

### createTransaction

Cria uma transação.

**Tipo**: `onCall`

**Parâmetros**:
```typescript
{
  tipo: 'receita' | 'despesa';
  descricao?: string;
  valor: number;  // em centavos
  metadata?: Record<string, any>;
}
```

---

### getEventReport

Relatório de eventos financeiros.

**Tipo**: `onCall`

**Parâmetros**:
```typescript
{
  startDate: string;
  endDate: string;
  groupBy?: 'day' | 'week' | 'month';
}
```

---

### listPayments

Lista pagamentos.

**Tipo**: `onCall`

**Parâmetros**:
```typescript
{
  patientId?: string;
  status?: string;
  limit?: number;
}
```

---

### createPayment

Cria um pagamento.

**Tipo**: `onCall`

**Parâmetros**:
```typescript
{
  patientId: string;
  amountCents: number;
  method: string;
  appointmentId?: string;
  notes?: string;
}
```

---

## Prontuário

### getPatientRecords

Busca o prontuário completo do paciente.

**Tipo**: `onCall`

**Parâmetros**:
```typescript
{
  patientId: string;
  include?: ('evolutions' | 'assessments' | 'treatments')[];
}
```

---

### savePainRecord

Salva um registro de dor.

**Tipo**: `onCall`

**Parâmetros**:
```typescript
{
  patientId: string;
  painLevel: number;       // 0-10
  painType?: string;
  bodyPart: string;
  notes?: string;
}
```

---

### createTreatmentSession

Cria uma sessão de tratamento.

**Tipo**: `onCall`

**Parâmetros**:
```typescript
{
  patientId: string;
  appointmentId?: string;
  painLevelBefore?: number;
  painLevelAfter?: number;
  observations?: string;
  evolution?: string;
  nextSessionGoals?: string;
}
```

---

## Upload

### generateUploadToken

Gera um token para upload de arquivo.

**Tipo**: `onCall`

**Parâmetros**:
```typescript
{
  filename: string;
  contentType: string;
  path: string;  // ex: patients/{patientId}/documents
}
```

**Resposta**:
```typescript
{
  uploadUrl: string;
  token: string;
  storagePath: string;
}
```

---

### confirmUpload

Confirma o upload e move o arquivo para o local definitivo.

**Tipo**: `onCall`

**Parâmetros**:
```typescript
{
  token: string;
  storagePath: string;
}
```

---

### deleteStorageFile

Deleta um arquivo do storage.

**Tipo**: `onCall`

**Parâmetros**:
```typescript
{
  path: string;
}
```

---

## AI Functions

### aiExerciseSuggestion

Recomenda exercícios baseados no perfil do paciente.

**Tipo**: `onCall`

**Parâmetros**:
```typescript
{
  patientId: string;
  goals: string[];
  availableEquipment?: string[];
  treatmentPhase?: 'initial' | 'progressive' | 'advanced' | 'maintenance';
  painMap?: Record<string, number>;  // bodyPart -> intensity (0-10)
}
```

**Resposta**:
```typescript
{
  success: true;
  data: {
    exercises: Array<{
      exerciseId?: string;
      name: string;
      category?: string;
      difficulty?: string;
      rationale: string;
      targetArea: string;
      goalsAddressed: string[];
      sets?: number;
      reps?: number;
      duration?: number;
      frequency?: string;
      precautions?: string[];
      confidence: number;
    }>;
    programRationale: string;
    expectedOutcomes: string[];
    progressionCriteria: string[];
    redFlags?: string[];
    alternatives?: Array<{
      name: string;
      rationale: string;
    }>;
    estimatedDuration: number;
  };
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
}
```

**Rate Limits**:
- 20 requisições/hora
- 100 requisições/dia

---

### aiSoapGeneration

Gera uma nota SOAP.

**Tipo**: `onCall`

**Parâmetros**:
```typescript
{
  patientId: string;
  sessionData: {
    subjective?: string;
    objective?: string;
    assessment?: string;
  };
}
```

---

### aiClinicalAnalysis

Análise clínica do paciente.

**Tipo**: `onCall`

**Parâmetros**:
```typescript
{
  patientId: string;
  focusAreas?: string[];
}
```

---

## Perfil

### getProfile

Busca o profile do usuário autenticado.

**Tipo**: `onCall`

**Resposta**:
```typescript
{
  data: Profile;
}
```

---

### updateProfile

Atualiza o profile do usuário.

**Tipo**: `onCall`

**Parâmetros**:
```typescript
{
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  crefito?: string;
  specialties?: string[];
  bio?: string;
  preferences?: Record<string, any>;
}
```

---

## Códigos de Erro

| Código HTTP | Erro | Descrição |
|-------------|------|-----------|
| 400 | `invalid-argument` | Argumento inválido |
| 401 | `unauthenticated` | Não autenticado |
| 403 | `permission-denied` | Sem permissão |
| 404 | `not-found` | Recurso não encontrado |
| 409 | `already-exists` | Recurso já existe |
| 429 | `resource-exhausted` | Rate limit excedido |
| 500 | `internal` | Erro interno |

### Tratamento de Erros

```typescript
try {
  const result = await httpsCallable(functions, 'createPatient')(data);
} catch (error) {
  if (error.code === 'already-exists') {
    // Já existe um paciente com este CPF
  } else if (error.code === 'permission-denied') {
    // Usuário não tem permissão
  } else {
    // Outro erro
    console.error(error.message);
  }
}
```

---

**Documento atualizado**: Janeiro 2026
