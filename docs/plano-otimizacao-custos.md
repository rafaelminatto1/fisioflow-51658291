# Plano Completo de Otimização de Custos - FisioFlow
**Data:** 06/02/2026
**Objetivo:** Reduzir custos mensais de R$ 168 para ~R$ 90-110 (35-45% economia) sem perda de qualidade

---

## RESUMO EXECUTIVO

### Cenário Atual
- **Custo mensal:** ~R$ 168/mês
- **67 Cloud Functions** ativas
- **10 funcionários**, **10 pacientes**, **600 evoluções/mês**

### Oportunidade Identificada
- **~30 funções duplicadas** (Callable + HTTP para mesma funcionalidade)
- **67 serviços Cloud Run** (cada função = 1 serviço)
- **Cloud SQL + Firestore** (duplicidade de dados)
- **IA sem cache** (chamadas repetitivas)

### Economia Esperada: 35-45% (R$ 168 → R$ 90-110/mês)

---

## ANÁLISE DETALHADA

### 1. Problema: 67 Funções com Duplicatas

#### Funções Duplicadas Identificadas

| Domínio | Callable | HTTP | Status |
|---------|----------|------|--------|
| **Pacientes** | listPatients | listPatientsHttp (listPatientsV2) | ✅ Ativo |
| **Pacientes** | getPatientStats | getPatientStatsHttp (getPatientStatsV2) | ✅ Ativo |
| **Pacientes** | createPatient | createPatientHttp (createPatientV2) | ✅ Ativo |
| **Pacientes** | updatePatient | updatePatientHttp (updatePatientV2) | ✅ Ativo |
| **Pacientes** | deletePatient | deletePatientHttp (deletePatientV2) | ✅ Ativo |
| **Pacientes** | getPatient | getPatientHttp | ✅ Ativo |
| **Agendamentos** | createAppointment | createAppointmentHttp (createAppointmentV2) | ✅ Ativo |
| **Agendamentos** | updateAppointment | updateAppointmentHttp (updateAppointmentV2) | ✅ Ativo |
| **Agendamentos** | getAppointment | getAppointmentHttp (getAppointmentV2) | ✅ Ativo |
| **Agendamentos** | cancelAppointment | cancelAppointmentHttp (cancelAppointmentV2) | ✅ Ativo |
| **Agendamentos** | checkTimeConflict | checkTimeConflictHttp (checkTimeConflictV2) | ✅ Ativo |
| **Financeiro** | listTransactions | listTransactionsHttp (listTransactionsV2) | ✅ Ativo |
| **Financeiro** | createTransaction | createTransactionHttp (createTransactionV2) | ✅ Ativo |
| **Financeiro** | updateTransaction | updateTransactionHttp (updateTransactionV2) | ✅ Ativo |
| **Financeiro** | deleteTransaction | deleteTransactionHttp (deleteTransactionV2) | ✅ Ativo |
| **Financeiro** | findTransactionByAppointmentId | findTransactionByAppointmentIdHttp (findTransactionByAppointmentIdV2) | ✅ Ativo |
| **Financeiro** | getEventReport | getEventReportHttp (getEventReportV2) | ✅ Ativo |
| **RAG** | rebuildPatientRagIndex | rebuildPatientRagIndexHttp | ✅ Ativo |

**Total: 18 pares de funções duplicadas = 36 funções redundantes**

---

## PLANO DE OTIMIZAÇÃO

### FASE 1: Consolidação de Funções (Imediato)

#### Ação 1.1: Remover Funções Callable Duplicadas
**Impacto:** -30% custos Functions, -15 serviços Cloud Run

Remove as versões `callable` e mantém apenas as versões `HTTP` com CORS (já usado pelo frontend).

```typescript
// REMOVER estas funções de index.ts:
export const listPatients = onCall(...)
export const createPatient = onCall(...)
export const updatePatient = onCall(...)
export const deletePatient = onCall(...)
// ... (16 funções callable duplicadas)

// MANTER apenas as versões HTTP (já exportadas):
export { listPatientsHttp as listPatientsV2 }
export { getPatientHttp }
export { createPatientHttp as createPatientV2 }
// etc
```

**Economia:** ~R$ 25-35/mês

#### Ação 1.2: Consolidar Funções AI
**Impacto:** -40% custos AI, melhor performance

**11 funções AI separadas → 1 função unificada:**

```typescript
// ATUAL (11 funções):
aiClinicalAnalysis
aiExerciseSuggestion
aiSoapGeneration
aiMovementAnalysis
aiClinicalChat
aiExerciseRecommendationChat
aiSoapNoteChat
aiGetSuggestions
analyzeProgress
aiFastProcessing
getPatientAISummaryHttp
getClinicalInsightsHttp
scanMedicalReportHttp

// NOVO: 1 função unificada
export const aiService = onRequest(AI_FUNCTION, async (req, res) => {
  const { action, ...params } = req.body;

  switch(action) {
    case 'clinicalAnalysis': return aiHandlers.clinicalAnalysis(params);
    case 'soapGeneration': return aiHandlers.soapGeneration(params);
    case 'movementAnalysis': return aiHandlers.movementAnalysis(params);
    // ... etc
  }
});
```

**Economia:** ~R$ 15-20/mês

#### Ação 1.3: Limpar Funções Não Utilizadas
Remover blocos comentados e imports não utilizados:
- Funções de webhook (comentadas)
- Integrações Google (comentadas)
- Monitoramento desabilitado
- Arquivos legacy

**Economia:** ~R$ 5-10/mês (redução de manutenção + instâncias ociosas)

---

### FASE 2: Otimização de Infraestrutura (1-2 semanas)

#### Ação 2.1: Revisar Configurações Globais

```typescript
// ATUAL (muito conservador):
maxInstances: 1
cpu: 0.1
concurrency: 1

// OTIMIZADO (recomendado):
maxInstances: 3          // Permite escala moderada
cpu: 0.5                // Equilíbrio custo/performance
concurrency: 5           // Processa 5 reqs simultâneas por instância
```

**Economia:** Melhor performance sem aumento significativo de custo

#### Ação 2.2: Implementar Cache de IA

```typescript
// Cache Redis/Upstash para respostas de IA frequentes
const cacheKey = `ai:${action}:${patientId}:${hash(data)}`;

const cached = await cache.get(cacheKey);
if (cached) return cached;

const result = await vertexAI.predict(prompt);
await cache.set(cacheKey, result, { ttl: 3600 }); // 1 hora
```

**Economia:** 30-50% redução em chamadas de IA

#### Ação 2.3: Otimizar Cloud SQL

**Ativar:** `pg_stat_statements` para identificar queries lentas
**Criar índices** para colunas frequentemente usadas
**Usar connection pool** otimizado (já configurado)

```sql
-- Índices recomendados:
CREATE INDEX idx_patients_org_name ON patients(organization_id, name);
CREATE INDEX idx_appointments_date ON appointments(date, start_time);
CREATE INDEX idx_appointments_patient ON appointments(patient_id, date);
```

**Economia:** ~R$ 15-25/mês (redução CPU)

#### Ação 2.4: Compactar Storage

```bash
# Compactar logs antigos
gsutil -m -S 30d gs://fisioflow-migration.appspot.com/logs/**

# Remover arquivos duplicados
gsutil -m rsync -d gs://fisioflow-migration.appspot.com/duplicates/
```

**Economia:** ~R$ 5-10/mês

---

### FASE 3: Arquitetura Otimizada (2-4 semanas)

#### Ação 3.1: Consolidar Fonte de Dados

**ATUAL:** PostgreSQL + Firestore (duplicidade)
**NOVO:** PostgreSQL como única fonte de verdade

```typescript
// Migrar dados do Firestore para PostgreSQL
// Remover duplicidades, usar apenas PostgreSQL
```

**Benefícios:**
- Elimina custos de Firestore (~R$ 10-15/mês)
- Simplifica sincronização
- Queries mais rápidas

#### Ação 3.2: Implementar REST API Unificada

```typescript
// Em vez de 67 endpoints, criar ~15 rotas organizadas:

// /api/v1/pacientes/*
//   - GET    /api/v1/pacientes
//   - GET    /api/v1/pacientes/:id
//   - POST   /api/v1/pacientes
//   - PATCH /api/v1/pacientes/:id
//   - DELETE /api/v1/pacientes/:id
//   - POST   /api/v1/pacientes/:id/evolucoes

// /api/v1/agendamentos/*
// /api/v1/financeiro/*
// /api/v1/exercicios/*
// /api/v1/avaliacoes/*
// /api/v1/ai/* (unificado)
```

**Framework recomendado:** Express.js ou Fastify em Cloud Run

---

## ROADMAP DE IMPLEMENTAÇÃO

### Semana 1-2: Quick Wins (Sem risco)
- [ ] Remover 36 funções duplicadas
- [ ] Limpar funções comentadas do index.ts
- [ ] Ativar cache de queries (já implementado)
- [ ] Usar Gemini Flash para casos simples
- **Economia esperada:** R$ 168 → R$ 120-130

### Semana 3-4: Consolidação
- [ ] Consolidar funções AI em 1 serviço
- [ ] Criar índices SQL otimizados
- [ ] Implementar cache de IA
- [ ] Compactar Storage
- **Economia esperada:** R$ 120-130 → R$ 95-105

### Semana 5-8: Arquitetura
- [ ] Migrar dados para única fonte de verdade
- [ ] Criar REST API unificada
- [ ] Implementar rate limiting
- [ ] Testes de carga
- **Economia esperada:** R$ 95-105 → R$ 85-95

---

## ECONOMIA DETALHADA POR SERVIÇO

| Serviço | Atual | Após Fase 1 | Após Fase 2 | Após Fase 3 | Economia Total |
|---------|-------|--------------|--------------|--------------|--------------|
| **Functions** | R$ 13 | R$ 8 | R$ 8 | R$ 5 | **R$ 8 (38%)** |
| **Cloud SQL** | R$ 96 | R$ 96 | R$ 75 | R$ 70 | **R$ 70 (27%)** |
| **Vertex AI** | R$ 36 | R$ 36 | R$ 22 | R$ 18 | **R$ 18 (50%)** |
| **Firestore** | R$ 11 | R$ 11 | R$ 11 | R$ 0 | **R$ 0 (100%)** |
| **Storage** | R$ 16 | R$ 16 | R$ 12 | R$ 10 | **R$ 10 (38%)** |
| **Outros** | R$ 20 | R$ 10 | R$ 10 | R$ 10 | **R$ 10 (50%)** |
| **TOTAL** | **R$ 192** | **R$ 177** | **R$ 138** | **R$ 113** | **R$ 113 (41%)** |

*Valores aproximados baseados em R$ 168/mês atual + ajustes*

---

## MATRIZ DE RISCO x IMPACTO

| Ação | Risco | Impacto Economia | Complexidade | Prioridade |
|------|-------|------------------|-------------|------------|
| Remover duplicatas | Baixo | Alta (30%) | Baixa | **ALTA** |
| Cache IA | Baixo | Alta (40%) | Média | **ALTA** |
| Otimizar SQL | Médio | Média (20%) | Média | **MÉDIA** |
| Gemini Flash | Baixo | Alta (60%) | Baixa | **ALTA** |
| Unificar dados | Alto | Média (15%) | Alta | **BAIXA** |
| REST API | Alto | Baixa (10%) | Alta | **BAIXA** |

---

## PRÓXIMOS PASSOS

### Imediato (Hoje)
1. Backup completo do sistema
2. Remover funções duplicadas de index.ts
3. Ativar cache de queries

### Curto Prazo (Esta semana)
1. Implementar cache de IA
2. Criar índices SQL
3. Testar com usuário piloto

### Médio Prazo (Próximas 2-4 semanas)
1. Consolidar funções AI
2. Migrar para PostgreSQL único
3. Criar API unificada

---

## MÉTRICAS DE SUCESSO

| KPI | Atual | Meta | Data Alvo |
|-----|-------|------|-----------|
| Custo mensal | R$ 168 | R$ 115 | 30 dias |
| Nº funções | 67 | 25 | 30 dias |
| Tempo resposta p95 | <2s | <1s | 30 dias |
| Uso de IA (tokens) | 100% | 60% | 30 dias |
| Storage utilizado | 10 GB | 7 GB | 30 dias |

---

## EQUIPE NECESSÁRIO

- **Backend Developer** (20h/semana)
- **DevOps Engineer** (10h/semana)
- **Database Admin** (5h/semana)

**Total estimado:** 160 horas de trabalho (~4 semanas)

---

## CONCLUSÃO

Com **análises detalhadas dos agentes**, identifiquei que:

1. **67 funções** podem ser reduzidas para **~25-30 funções**
2. **18 pares de funções duplicadas** podem ser consolidados
3. **Cache de IA** pode reduzir custos em 40-50%
4. **Gemini Flash** é 90% mais barato para casos simples

**Economia total esperada: 35-45% (R$ 168 → R$ 90-110/mês)**

O plano está detalhado acima com fases, riscos e métricas de sucesso.
