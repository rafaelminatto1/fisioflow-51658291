# Quick Wins - Otimização Imediata de Custos
**Ações de baixo risco que podem ser implementadas hoje**

**STATUS:** Fase 1 Implementada (06/02/2026)

---

## ✅ AÇÃO 1: Remover Funções Duplicadas (CONCLUÍDO)

### Status: **IMPLEMENTADO**
- **Data:** 06/02/2026
- **Commit:** c095cfb0
- **Funções removidas:** 18 funções callable duplicadas

### Arquivo: functions/src/index.ts

Remover estas linhas (funções callable duplicadas):

```typescript
// LINHAS 74-97 - Remover versões Callable de Pacientes
export const listPatients = onCall(async (request) => { /*...*/ });
export const createPatient = onCall(async (request) => { /*...*/ });
export const updatePatient = onCall(async (request) => { /*...*/ });
export const getPatient = onCall(async (request) => { /*...*/ });
export const deletePatient = onCall(async (request) => { /*...*/ });
export const getPatientStats = onCall(async (request) => { /*...*/ });

// LINHAS 111-130 - Remover versões Callable de Agendamentos
export const createAppointment = onCall(async (request) => { /*...*/ });
export const updateAppointment = onCall(async (request) => { /*...*/ });
export const getAppointment = onCall(async (request) => { /*...*/ });
export const cancelAppointment = onCall(async (request) => => { /*...*/ });
export const checkTimeConflict = onCall(async (request) => { /*...*/ });

// LINHAS 234-258 - Remover versões Callable de Financeiro
export const listTransactions = onCall(async (request) => { /*...*/ });
export const createTransaction = onCall(async (request) => { /*...*/ });
export const updateTransaction = onCall(async (request) => { /*...*/ });
export const deleteTransaction = onCall(async (request) => { /*...*/ });
export const findTransactionByAppointmentId = onCall(async (request) => { /*...*/ });
export const getEventReport = onCall(async (request) => { /*...*/ });
```

**Comando para execução:**
```bash
# Backup primeiro
cp functions/src/index.ts functions/src/index.ts.backup

# Remover linhas 74-97, 111-130, 234-258 (manualmente ou via script)
```

---

## ⚠️ AÇÃO 2: Usar Gemini Flash (NÃO APLICÁVEL)

**Status:** MANTIDO GEMINI PRO (por solicitação do usuário)

### Arquivo: functions/src/lib/integrations/google/ai.ts

### Arquivo: functions/src/lib/integrations/google/ai.ts

Alterar modelo padrão de Pro para Flash:

```typescript
// ATUAL:
const DEFAULT_MODEL = 'gemini-2.5-pro';

// NOVO:
const DEFAULT_MODEL = 'gemini-2.5-flash';
```

**Economia:** 75% nos custos de IA (R$ 36 → R$ 9/mês)

---

## AÇÃO 3: Limpar Storage (5 min)

```bash
# Limpar logs antigos (mais de 30 dias)
gsutil -m -S 30d gs://fisioflow-migration.appspot.com/logs/**

# Limpar arquivos temporários
gsutil -m gs://fisioflow-migration.appspot.com/temp/**
```

---

## AÇÃO 4: Ativar Cache de Queries (já implementado!)

### Arquivo: functions/src/api/patients.ts

O cache JÁ está implementado em `cache-helpers.ts`, só precisa ser usado:

```typescript
// Trocar:
const organizationId = await getOrganizationId(uid);

// Por:
const organizationId = await getOrganizationIdCached(uid);
```

Fazer o mesmo em:
- `functions/src/api/appointments.ts`
- `functions/src/api/financial.ts`

---

## AÇÃO 5: Criar Índices SQL (2 min)

```sql
-- Conectar no Cloud SQL e executar:
CREATE INDEX IF NOT EXISTS idx_patients_org_name
ON patients(organization_id, name);

CREATE INDEX IF NOT EXISTS idx_appointments_date
ON appointments(date, start_time)
WHERE status != 'cancelado';

CREATE INDEX IF NOT EXISTS idx_appointments_patient
ON appointments(patient_id, date);
```

---

## RESUMO DAS AÇÕES IMEDIATAS - STATUS ATUAL

| Ação | Status | Economia Estimada |
|------|--------|-------------------|
| ✅ Remover 18 funções duplicadas | **CONCLUÍDO** | R$ 25-35/mês |
| ⚠️ Usar Gemini Flash | **NÃO** (mantido Pro) | R$ 0/mês |
| ✅ Limpar Storage | **CONCLUÍDO** (já otimizado) | R$ 0/mês |
| ✅ Ativar cache | **CONCLUÍDO** | R$ 10-15/mês |
| ✅ Criar índices SQL | **CONCLUÍDO** | R$ 10-15/mês |
| ✅ AI Service Unificado | **CRIADO** | R$ 15-20/mês (futuro) |

**Economia Total Fase 1+2:** ~R$ 45-65/mês
**Gemini Pro mantido** conforme solicitação do usuário

---

## FASE 1: IMPLEMENTADO ✅

### O que foi feito:
1. **18 funções callable duplicadas removidas:**
   - Pacientes: listPatients, createPatient, updatePatient, getPatient, deletePatient, getPatientStats
   - Agendamentos: createAppointment, updateAppointment, getAppointment, cancelAppointment, checkTimeConflict
   - Financeiro: listTransactions, createTransaction, updateTransaction, deleteTransaction, findTransactionByAppointmentId, getEventReport
   - RAG: rebuildPatientRagIndex

2. **Código comentado limpo:**
   - Webhooks (desabilitados)
   - Integrações Google Calendar (desabilitadas)
   - Monitoring (desabilitado)
   - Export/Import (desabilitado)

3. **Cache ativado:**
   - getOrganizationId agora usa getOrganizationIdCached
   - Redução de queries repetidas ao PostgreSQL

### Funções após otimização:
- **Antes:** 67 funções callable + ~40 background/triggers
- **Depois:** ~54 funções callable + ~40 background/triggers
- **Removidas:** 18 funções duplicadas callable

---

## FASE 2: IMPLEMENTADO ✅

### O que foi feito:
1. **Índices SQL criados:**
   - 9 índices otimizados criados via createOptimizedIndexes
   - Pacientes: idx_patients_org_active, idx_patients_org_name, idx_patients_cpf
   - Agendamentos: idx_appointments_org_date, idx_appointments_patient_date, idx_appointments_org_status, idx_appointments_therapist_date
   - Perfis: idx_profiles_user_id, idx_profiles_org
   - Tabelas analisadas para query planner

2. **AI Service Unificado criado:**
   - Nova função aiService (callable) e aiServiceHttp
   - Consolida 11 handlers AI em um único serviço
   - Roteamento por ação: generateExercisePlan, clinicalAnalysis, exerciseSuggestion, etc.
   - Funções individuais mantidas para compatibilidade

3. **Storage verificado:**
   - Uso atual: 122MB (já otimizado)
   - 423 objetos no bucket principal

4. **Bug fixes:**
   - Corrigido notificationData no workflows/notifications.ts
   - Corrigidos imports em communications

### Funções após Fase 2:
- **Fase 1:** 67 → 54 funções callable
- **Fase 2:** Adicionadas aiService, aiServiceHttp, createOptimizedIndexes
- **Total:** ~57 funções callable ativas

---

## PRÓXIMOS PASSOS (Migração Gradual)

### Passo 1: Migrar frontend para AI Service Unificado

Substituir chamadas individuais:
```typescript
// ATUAL:
await callFunction('aiClinicalAnalysis', { data });

// NOVO:
await callFunction('aiService', { action: 'clinicalAnalysis', data });
```

### Passo 2: Remover funções AI individuais

Após migração completa do frontend, remover:
- aiClinicalAnalysis
- aiExerciseSuggestion
- aiSoapGeneration
- aiMovementAnalysis
- aiClinicalChat
- aiExerciseRecommendationChat
- aiSoapNoteChat
- aiGetSuggestions
- analyzeProgress
- aiFastProcessing
- generateExercisePlan

### Passo 3: Consolidação final

- Migrar para única fonte de dados (PostgreSQL)
- Implementar REST API unificada
- Consolidar funções de exercícios e avaliações

---

## MONITORAMENTO PÓS-IMPLEMENTAÇÃO

Após aplicar as mudanças, monitorar por 1 semana:

```bash
# Ver custos em tempo real
gcloud billing budgets list --billing-account=012726-42CA36-FA7B7A

# Ver uso de funções
gcloud functions list --regions=southamerica-east1
```
