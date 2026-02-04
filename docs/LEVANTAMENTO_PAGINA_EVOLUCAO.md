# Levantamento completo – Página Patient Evolution

Este documento registra o levantamento e as correções aplicadas para que a página de evolução do paciente não apresente erros.

## 1. Dependências diretas da página

### Arquivo principal
- **`src/pages/PatientEvolution.tsx`** – Página de evolução (wrapper com MainLayout, tabs, autosave, salvamento de sessão).

### Hooks
- **`src/hooks/useAppointmentData.ts`** – Dados do agendamento e do paciente (API HTTP + fallback via lista).
- **`src/hooks/usePatientEvolution.ts`** – Cirurgias, metas, patologias, medições (Firestore + `db`).
- **`src/hooks/useSoapRecords.ts`** – Registros SOAP e autosave (Firestore + `db`).
- **`src/hooks/useGamification.ts`** – Gamificação.
- **`src/hooks/useSessionExercises.ts`** – Exercícios da sessão.
- **`src/hooks/useAutoSave.ts`** – Autosave genérico (delay + onSave).
- **`src/hooks/useAppointmentActions.ts`** – Ações de agendamento (ex.: concluir).
- **`src/hooks/useTherapists.ts`** – Lista de terapeutas.

### Componentes de evolução (importados diretamente)
- EvolutionDebugInfo, MedicalReturnCard, SurgeriesCard, MeasurementForm, GoalsTracker, PathologyStatus, PainMapManager, MandatoryTestAlert, SessionExercisesPanel, EvolutionHeader, EvolutionHistoryTab, EvolutionDraggableGrid, FloatingActionBar, EvolutionKeyboardShortcuts, EvolutionAlerts, PatientEvolutionErrorBoundary, ApplyTemplateModal.

### Lazy
- TreatmentAssistant, WhatsAppIntegration, PatientGamification, MeasurementCharts.

### Firebase
- **`src/integrations/firebase/app.ts`** – `db`, `getFirebaseAuth`, collection, query, getDocs, addDoc, updateDoc, doc, limit.
- **`src/integrations/firebase/functions.ts`** – Chamadas HTTP (appointments, patients).

---

## 2. Correções já aplicadas (evitar erros)

### 2.1 Imports quebrados (linhas truncadas)
- **`src/lib/services/surgeryService.ts`** – Linha 2: `types/evolution';` → `import type { Surgery, SurgeryFormData } from '@/types/evolution';`
- **`src/lib/services/conductReplicationService.ts`** – Linha 2: `lution';` → `import type { ConductTemplate } from '@/types/evolution';`

### 2.2 Uso incorreto da API Firestore
- **`src/components/evolution/SessionEvolutionContainer.tsx`** – `docRef(collection(db, 'soap_records'))` → `doc(collection(db, 'soap_records'))` (Firestore modular usa `doc`, não `docRef`).

### 2.3 Falta de import de `db`
- **`src/hooks/useSoapRecords.ts`** – Uso de `db` em várias funções; adicionado `db` ao import de `@/integrations/firebase/app`.

### 2.4 CORS / falha de rede ao buscar paciente
- **`src/hooks/useAppointmentData.ts`** – Fallback: se `patientsApi.get(patientId)` falhar com erro de rede/CORS (TypeError / "Failed to fetch"), o paciente é buscado via `patientsApi.list({ limit: 2000 })` e localizado por `id`. Tipo `PatientDBStandard` garantido com `full_name` a partir de `name ?? full_name`.
- **Backend `functions/src/api/patients.ts`** – Em `getPatientHttp`: `setCorsHeaders(req, res)` no `catch` e antes da resposta 405, para que respostas de erro também tenham CORS.

### 2.5 Proteções na página
- **`src/pages/PatientEvolution.tsx`**
  - Retorno antecipado quando `!appointmentId`.
  - Loading quando `dataLoading`.
  - Erro quando `!appointment || !patient` (com mensagens para “Paciente não encontrado” e erros de permissão).
  - No callback de salvamento (autosave/sessão): `if (!patientId || !appointmentId) return` no onSave; `if (!patientId) return` antes de gravar sessão de tratamento; tipo explícito `existingSessionId: string | null`.
- **Import** – Remoção de espaço extra em `limit,  }` no import do firebase/app.

### 2.6 Ícone inexistente no lucide-react
- **`src/components/evolution/SurgeriesCard.tsx`** – `Scalpel` não existe em lucide-react; trocado para `Scissors`.

### 2.7 Instrumentação de debug removida
- **`src/hooks/useAppointmentData.ts`** – Removidos os `fetch` de log para o servidor de debug.
- **`src/integrations/firebase/functions.ts`** – Removidos os logs de debug em `callFunctionHttp`.

---

## 3. Arquivos que usam Firestore (`db`) na página de evolução

Todos importam `db` de `@/integrations/firebase/app`:

- `src/pages/PatientEvolution.tsx`
- `src/components/evolution/SessionEvolutionContainer.tsx`
- `src/components/evolution/EvolutionDraggableGrid.tsx`
- `src/components/evolution/MedicalReportSuggestions.tsx`
- `src/components/evolution/SaveMeasurementTemplateModal.tsx`
- `src/hooks/usePatientEvolution.ts`
- `src/hooks/useSoapRecords.ts`
- `src/lib/services/surgeryService.ts` (via SurgeryFormModal)
- `src/lib/services/conductReplicationService.ts` (via ConductReplication)

---

## 4. Fluxo de dados e pontos de falha mitigados

| Ponto | Mitigação |
|-------|-----------|
| `appointmentId` ausente na URL | Retorno antecipado com mensagem e botão “Voltar para Agenda”. |
| Agendamento não encontrado (API) | Estado de erro com mensagem e EvolutionDebugInfo. |
| Paciente não encontrado (getPatientHttp falha por CORS) | Fallback: buscar paciente na lista (listPatientsV2). |
| Paciente não está na lista | Mensagem “Paciente não encontrado” e instruções. |
| Autosave (SOAP) | useSoapRecords usa `db` importado; ensureProfile + Firestore com try/catch no mutation. |
| Salvamento de sessão (treatment_sessions) | Só roda com `patientId` e `user`; try/catch com toast em caso de erro. |
| Lazy components (TreatmentAssistant, etc.) | Carregamento assíncrono; erros de import quebrado foram corrigidos nos serviços. |

---

## 5. Checklist de manutenção

Ao alterar a página de evolução ou seus hooks/componentes/serviços:

1. **Imports** – Nenhuma linha solta (ex.: `types/evolution';`). Sempre import completo de tipos de `@/types/evolution` ou outros módulos.
2. **Firestore** – Usar `doc()` e `collection()` de `@/integrations/firebase/app`; nunca `docRef()` como função.
3. **`db`** – Qualquer uso de `collection(db, ...)` ou `doc(db, ...)` exige import de `db` de `@/integrations/firebase/app`.
4. **Salvamento** – Garantir `patientId` (e `appointmentId` quando aplicável) antes de escrever em Firestore.
5. **Erros de rede/CORS** – Manter fallback de paciente via lista em `useAppointmentData` enquanto getPatientHttp puder falhar por CORS.
6. **Ícones (lucide-react)** – Usar apenas ícones existentes no pacote (ex.: não existe `Scalpel`; usar `Scissors`).

---

## 6. Teste E2E do fluxo

- **Arquivo:** `e2e/patient-evolution-full-flow.spec.ts`
- **Cenário:** Login (testUsers.rafael) → Agenda → primeiro agendamento → "Iniciar atendimento" → preencher os 4 campos SOAP → Salvar. Verifica que não aparece toast de erro.
- **Executar:** `pnpm exec playwright test e2e/patient-evolution-full-flow.spec.ts --project=chromium` (app em 8084).
- **Navegador visível:** adicionar `--headed`.

---

*Última atualização: levantamento e correções aplicadas conforme descrito acima.*
