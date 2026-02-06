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
| ❌ Limpar Storage | Pendente | R$ 5-10/mês |
| ✅ Ativar cache | **CONCLUÍDO** | R$ 10-15/mês |
| ❌ Criar índices SQL | Pendente | R$ 10-15/mês |

**Economia Fase 1:** ~R$ 35-50/mês (funções removidas + cache ativado)
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

## PRÓXIMAS AÇÕES (PENDENTE)

### Ação 3: Limpar Storage (5 min)

```bash
# Limpar logs antigos (mais de 30 dias)
gsutil -m -S 30d gs://fisioflow-migration.appspot.com/logs/**

# Limpar arquivos temporários
gsutil -m gs://fisioflow-migration.appspot.com/temp/**
```

### Ação 4: Criar Índices SQL (2 min)

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

## MONITORAMENTO PÓS-IMPLEMENTAÇÃO

Após aplicar as mudanças, monitorar por 1 semana:

```bash
# Ver custos em tempo real
gcloud billing budgets list --billing-account=012726-42CA36-FA7B7A

# Ver uso de funções
gcloud functions list --regions=southamerica-east1
```
