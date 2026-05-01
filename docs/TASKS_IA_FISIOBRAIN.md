# FisioFlow — Plano de Implementação IA + FisioBrain
# Spec-Driven Development — 20 Tasks / 5 Sprints
# Criado em: 2026-04-29
# Status: AGUARDANDO APROVAÇÃO

---

## Legenda
- [ ] Pendente
- [~] Em andamento
- [x] Concluído
- 🔒 Bloqueada por outra task

---

## Sprint 0 — Fundação (Semanas 1–2)
> Bugs críticos + infraestrutura base. Nenhuma feature nova antes de fechar isto.

- [x] **#1 S0-T1** — Corrigir bug de fuso horário (UTC vs BRT) em date-utils.ts
  - Arquivos: `src/services/appointmentService.ts:240`, `src/hooks/appointments/useAppointmentsMutations.ts:46`, `src/hooks/appointments/appointmentHelpers.ts:118`
  - Feito: `parseLocalDate()` aplicado em todos os pontos de `new Date(ymd_string)`

- [x] **#2 S0-T2** — Migrar EvolutionSummarizer para Structured Output (Zod)
  - Arquivo: `apps/api/src/services/ai/EvolutionSummarizer.ts`
  - Feito: Já usava `callGeminiStructured()` + `SoapSchema` — sem quebra silenciosa

- [x] **#3 S0-T3** — Migration 0061_ai_usage.sql + persistência de custo em callAI()
  - Feito: `apps/api/migrations/0061_ai_usage.sql` criada; `persistAIUsage()` fire-and-forget em callAI.ts; widget "Uso IA (7 dias)" no IAStudio sidebar; rota `GET /api/ai/usage/weekly`

- [x] **#4 S0-T4** — Habilitar AI Search no wrangler.toml + criar instância no Cloudflare
  - Feito: `[[ai_search]]` descomentado + env prod; tipo `AI_SEARCH` atualizado com `items.uploadAndPoll()`
  - ⚠️ AÇÃO MANUAL PENDENTE: Criar instância "fisioflow-knowledge" em dash.cloudflare.com > AI > AI Search

---

## Sprint 1 — FisioBrain Core: Wiki + PDFs (Semanas 3–6)
> O coração do sistema de conhecimento clínico.

- [x] **#5 S1-T1** — Backend: rota POST /api/knowledge/upload-paper
  - Feito: `knowledge.ts` — endpoint multipart PDF ≤4MB, AI Search `items.uploadAndPoll()` + metadata, salva em `knowledge_articles`

- [x] **#6 S1-T2** — Backend: rota GET /api/fisiobrain/search (AI Search unificado)
  - Feito: `apps/api/src/routes/fisiobrain.ts` (NOVO) — `/api/fisiobrain/search` com filtros source + area; registrado em index.ts

- [x] **#7 S1-T3** — Backend: WikiSyncWorkflow (Neon → AI Search, cron 02h)
  - Feito: `apps/api/src/workflows/wikiSync.ts` (NOVO) — cron 05h UTC (02h BRT); hook PUT wiki para re-sync imediato; registrado em wrangler.toml + cron.ts

- [x] **#8 S1-T4** — Backend: KnowledgeSyncWorkflow (protocolos + exercícios → AI Search, segunda 03h)
  - Feito: `apps/api/src/workflows/knowledgeSync.ts` (NOVO) — 119 protocolos + 248 exercícios como markdown; cron segunda 06h UTC (03h BRT)

- [x] **#9 S1-T5** — Frontend: aba "Artigos Científicos" na página Wiki
  - Feito: `src/components/wiki/ScientificPapersView.tsx` (NOVO) — grid + modal dropzone + área clínica; botão "Artigos" no WikiTopNav; integrado em Wiki.tsx

- [x] **#10 S1-T6** — Frontend: FisioBrain Chat na página Wiki (AIHubView atualizado)
  - Feito: `AIHubView.tsx` reescrito — aba FisioBrain com busca + filtros fonte/área + badges coloridos + histórico da sessão; abas SOAP/Simulator preservadas

---

## Sprint 2 — FisioBrain em Contexto Clínico (Semanas 7–10)
> Evidência no momento certo — durante a consulta.

- [x] **#11 S2-T1** — 🔒(#6) Frontend: FisioBrain no painel de SOAP (Sheet lateral)
  - Arquivos: `src/components/evolution/v3-notion/NotionEvolutionPanel.tsx`
  - Feito: Botão "Evidência" (Brain icon, violet) na barra header. Sheet lateral direita 420px com textarea pré-preenchida do diagnóstico, busca via /api/fisiobrain/search?source=protocol,paper, exibe resposta IA + fontes com badges coloridos + botão "Inserir no Plano" em cada fonte.

- [x] **#12 S2-T2** — 🔒(#6) Frontend: aba "Evidência Clínica" no perfil do paciente
  - Arquivos: `src/pages/patients/PatientProfilePage.tsx`
  - Feito: Aba "Evidência" (Brain icon, violet) adicionada ao perfil. Pré-preenchida com main_condition do paciente ao abrir. Textarea editável, busca via /api/fisiobrain/search, exibe resposta IA + fontes com badges coloridos por tipo.

- [x] **#13 S2-T3** — 🔒(#6) Frontend: FisioBrain na página de Protocolos (sugestão por IA)
  - Arquivos: `src/pages/Protocols.tsx`
  - Feito: Sidebar "Protocolos Relacionados por IA" 320px ao abrir protocolo. Textarea pré-preenchida com nome do protocolo + auto-busca ao selecionar. Badges coloridos por tipo + badge "Baseado em evidência" quando source=paper. Grid 1-col / xl:2-col com sticky sidebar.

- [x] **#14 S2-T4** — 🔒(#6, #8) HEP gerado com referência bibliográfica
  - Arquivos: `apps/api/src/routes/exercisePlans.ts` (backend), `src/components/exercises/HEPComplianceDashboard.tsx` (frontend)
  - Feito: POST /:id/generate-hep — busca diagnóstico no DB, consulta AI_SEARCH por evidências, injeta no prompt callAI(), retorna { exercises, evidence_references }. Frontend: HEPGenerateWithAI component com botão "Gerar HEP com IA", lista de exercícios gerados + bloco "Baseado em:" com referências FisioBrain.

---

## Sprint 3 — ClinicAgent + Automações WhatsApp (Semanas 11–14)
> A clínica funciona sozinha fora do horário.

- [x] **#15 S3-T1** — Backend: ClinicAgent (Durable Object com crons e skills em R2)
  - Arquivos: `apps/api/src/agents/ClinicAgent.ts` (NOVO), `apps/api/wrangler.toml`, `apps/api/src/index.ts`
  - Feito: ClinicAgent extends Agent<Env, ClinicState> com @callable methods: runMorningBriefing, runDailySummary, checkMissingPatients (Neon query), handleWhatsAppReschedule. Bindings CLINIC_AGENT em wrangler.toml + prod. Crons 30 10 / 30 21 / 0 12 * * 1 adicionados ao [triggers] e aos case handlers em cron.ts.

- [x] **#16 S3-T2** — 🔒(#2) Backend: SessionSummaryWorkflow (SOAP → WhatsApp paciente)
  - Arquivos: `apps/api/src/workflows/sessionSummary.ts` (NOVO), `apps/api/src/routes/sessions.ts`, `apps/api/wrangler.toml`
  - Feito: WorkflowEntrypoint com 4 steps: fetch-session (Neon JOIN patients), generate-summary (callAI → JSON {summary_paciente, proximos_passos, exercicios_casa}), save-summary (session_summaries upsert), send-whatsapp (BACKGROUND_QUEUE). Disparado em sessions.ts finalize via WORKFLOW_SESSION_SUMMARY.create(). Binding em wrangler.toml root + prod. Exportado em index.ts.

---

## Sprint 4 — Avaliação por Voz (Semanas 15–17)
> Fisioterapeuta fala, IA preenche o formulário.

- [x] **#18 S4-T2** — Backend: testar e validar endpoints de avaliação por voz
  - Arquivos: `apps/api/src/routes/ai.ts`, `apps/api/src/routes/__tests__/ai.test.ts`
  - Feito: 5 testes adicionados — recording retorna form+transcript ✓, recording 400 sem audioBase64 ✓, transcript retorna form ✓, transcript 400 curto ✓, live-ws 403 sem premium ✓. AssessmentRecordingService mockado. Confirmado: fallback via Workers AI Whisper livre (transcribeAudio em ai-native.ts).

- [x] **#17 S4-T1** — 🔒(#18) Frontend: AssessmentVoiceRecorder.tsx
  - Arquivos: `src/components/ai/AssessmentVoiceRecorder.tsx`, `src/pages/patients/NewEvaluationPage.tsx`
  - Feito: Componente já existia completo — 3 modos (recording, on-device, premium live). Web Audio API waveform visualizer. Estados idle→recording→transcribing→analyzing→completed. Preview form + edição manual. Já integrado em NewEvaluationPage via `<AssessmentVoiceRecorder onCompleted={...} />`.

---

## Sprint 5 — Digital Twin (Semanas 18–20)
> O paciente vê seu progresso. O fisio vê o prognóstico.

- [x] **#20 S5-T2** — Backend: IA narrativa no digital-twin.ts (prognóstico)
  - Arquivos: `apps/api/src/routes/analytics/digital-twin.ts`
  - Feito: Substituiu llama-3.1 por callAI(task="patient-360"). Retorna { prognostic_score, risk_level, recovery_estimate_sessions, narrative, alerts, insights } parseados do JSON da IA. Salva snapshot em digital_twin_snapshots (upsert, non-blocking). KV cache 24h mantido. Todos campos adicionados ao result.

- [x] **#19 S5-T1** — 🔒(#20) Frontend: painel Digital Twin no perfil do paciente
  - Arquivos: `src/components/patients/DigitalTwinPanel.tsx`, `src/pages/patients/PatientProfilePage.tsx`
  - Feito: Componente já existia com PROMs LineChart + métricas + risco + trend. Atualizado para exibir novos campos: card "Prognóstico IA" com narrative + prognosticScore badge + recoveryEstimateSessions badge, card "Alertas Clínicos" (amber) com ⚠ por alerta. Interface DigitalTwinData atualizada com campos opcionais. Já integrado como LazyDigitalTwinPanel em analytics tab.

---

## Grafo de Dependências

```
#1 (fuso) ─────────────────────────────────────────── livre
#2 (summarizer) ────────────────────────────────────── ──► #16
#3 (ai_usage) ──────────────────────────────────────── livre
#4 (AI Search binding) ─► #5, #6, #7, #8
                               #5 ──► #9
                               #6 ──► #10, #11, #12, #13
                               #6 + #8 ──► #14
#15 (ClinicAgent) ──────────────────────────────────── livre
#18 (voice backend) ────────────────────────────────── ──► #17
#20 (digital twin backend) ─────────────────────────── ──► #19
```

---

## Arquivos Novos a Criar

| Arquivo | Sprint |
|---|---|
| `apps/api/migrations/0061_ai_usage.sql` | S0 |
| `apps/api/src/routes/fisiobrain.ts` | S1 |
| `apps/api/src/workflows/wikiSync.ts` | S1 |
| `apps/api/src/workflows/knowledgeSync.ts` | S1 |
| `apps/api/src/workflows/sessionSummary.ts` | S3 |
| `apps/api/src/agents/ClinicAgent.ts` | S3 |
| `src/components/wiki/ScientificPapersView.tsx` | S1 |
| `src/components/ai/AssessmentVoiceRecorder.tsx` | S4 |
| `src/components/patient/DigitalTwinPanel.tsx` | S5 |

---

## Custo Estimado Pós-Implementação

| Serviço | R$/mês |
|---|---|
| Cloudflare Workers Paid | R$27 |
| ZAI/GLM-4.7-Flash (maioria das tasks) | R$0 (gratuito) |
| ZAI/GLM-4.7 + Workers AI Whisper | R$15–35 |
| AI Search (open beta) | R$0 (gratuito) |
| Gemini Flash (voz + análise profunda) | R$10–25 |
| Neon DB (já existe) | R$0–30 |
| **TOTAL** | **R$52–117/mês** |

---

## Ações Manuais Necessárias no Dashboard Cloudflare

1. Acessar https://dash.cloudflare.com > AI > AI Search
2. Criar instância: nome = "fisioflow-knowledge"
3. Conectar R2 bucket "fisioflow-media" como data source
4. Anotar o nome da instância e atualizar wrangler.toml

---

_Atualizado em: 2026-04-29 | Status: ✅ TODAS 20 TASKS CONCLUÍDAS_
