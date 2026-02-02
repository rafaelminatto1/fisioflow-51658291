# Auditoria: Migração CORS (callable → HTTP)

Este documento mapeia onde o CORS precisa ser resolvido no backend e frontend. O erro ocorre quando chamadas `callFunction` (httpsCallable) são feitas de `localhost:8083` ou domínios não cobertos pelo preflight do Firebase.

## Status atual

### ✅ Já migrados para HTTP (sem CORS)

| API | Função | Frontend usa | Backend |
|-----|--------|--------------|---------|
| Pacientes | list | `callFunctionHttp('listPatientsV2')` | listPatientsHttp |
| Pacientes | get | `callFunctionHttp('getPatientHttp')` | getPatientHttp |
| Pacientes | create | `callFunctionHttp('createPatientV2')` | createPatientHttp |
| Pacientes | getStats | `callFunctionHttp('getPatientStatsV2')` | getPatientStatsHttp |
| Agendamentos | list | `callFunctionHttpWithResponse('listAppointments')` | listAppointmentsHttp |
| Perfil | getCurrent | `callFunctionHttp('getProfile')` | getProfile (onRequest) |
| Perfil | update | `callFunctionHttp('updateProfile')` | updateProfile (onRequest) |

---

## ⚠️ Ainda callable (risco de CORS)

### Alta prioridade (fluxos principais da aplicação)

| API | Método | Função backend | Arquivo functions.ts |
|-----|--------|----------------|----------------------|
| **Pacientes** | update | updatePatient | L491-492 |
| **Pacientes** | delete | deletePatient | L497-498 |
| **Agendamentos** | get | getAppointment | L682-683 |
| **Agendamentos** | create | createAppointment | L688-689 |
| **Agendamentos** | update | updateAppointment | L694-695 |
| **Agendamentos** | cancel | cancelAppointment | L699-701 |
| **Agendamentos** | checkTimeConflict | checkTimeConflict | L706-707 |

### Média prioridade (telas secundárias)

| API | Método | Função backend | Arquivo functions.ts |
|-----|--------|----------------|----------------------|
| **Exercícios** | list | listExercises | L519-520 |
| **Exercícios** | get | getExercise | L525-526 |
| **Exercícios** | getCategories | getExerciseCategories | L531-532 |
| **Exercícios** | getPrescribedExercises | getPrescribedExercises | L537-538 |
| **Exercícios** | logExercise | logExercise | L543-544 |
| **Exercícios** | create | createExercise | L549-550 |
| **Exercícios** | update | updateExercise | L554-556 |
| **Exercícios** | delete | deleteExercise | L560-562 |
| **Exercícios** | merge | mergeExercises | L567-568 |
| **Financeiro** | list | listTransactions | (via callFunctionWithResponse) |
| **Financeiro** | create | createTransaction | L584-585 |
| **Financeiro** | update | updateTransaction | L590-591 |
| **Financeiro** | delete | deleteTransaction | L596-597 |
| **Financeiro** | findByAppointment | findTransactionByAppointmentId | L602-603 |
| **Financeiro** | getEventReport | getEventReport | L608-609 |
| **Clínica** | getPatientRecords | getPatientRecords | (via callFunctionWithResponse) |
| **Clínica** | createMedicalRecord | createMedicalRecord | L629-630 |
| **Clínica** | updateMedicalRecord | updateMedicalRecord | L635-636 |
| **Clínica** | deleteMedicalRecord | deleteMedicalRecord | L641-642 |
| **Clínica** | listTreatmentSessions | listTreatmentSessions | L647-648 |
| **Clínica** | createTreatmentSession | createTreatmentSession | L653-654 |
| **Clínica** | getPainRecords | getPainRecords | L659-660 |
| **Clínica** | savePainRecord | savePainRecord | L665-666 |

### Baixa prioridade (AI, admin, integrações)

- API de Avaliações (assessments)
- API de Pagamentos
- AI (clinical-chat, suggestions)
- Export/Import
- Integrações (calendar, telemedicine, whatsapp)
- LGPD (consent, export-data, delete-account)
- Stripe, Webhooks, etc.

---

## Padrão de migração

Para cada função com CORS:

1. **Backend** (`functions/src/api/<modulo>.ts`): criar `nomeHttp` com `onRequest({ cors: true }, ...)`
2. **Backend** (`functions/src/index.ts`): exportar `nomeV2 = apiModulo.nomeHttp`
3. **Frontend** (`src/integrations/firebase/functions.ts`): trocar `callFunction('nome', data)` por `callFunctionHttp('nomeV2', data)` com ajuste de response (ex: `res.data`)

### Exemplo (updatePatient)

```ts
// Backend: createPatientHttp já existe como referência
// Frontend:
update: async (patientId: string, updates: PatientApi.UpdateData): Promise<PatientApi.Patient> => {
  const res = await callFunctionHttp<{ patientId: string } & PatientApi.UpdateData, { data: PatientApi.Patient }>(
    'updatePatientV2',
    { patientId, ...updates }
  );
  return res.data;
},
```

---

## Resumo por prioridade

| Prioridade | Quantidade | Fluxos afetados |
|------------|------------|-----------------|
| Alta | 7 | Cadastro rápido, Agenda, Novo agendamento |
| Média | 23 | Pacientes (editar/excluir), Exercícios, Financeiro, Prontuários |
| Baixa | ~50+ | Módulos secundários |

**Recomendação:** Migrar primeiro as 7 funções de alta prioridade (pacientes update/delete + agendamentos get/create/update/cancel/checkTimeConflict).
