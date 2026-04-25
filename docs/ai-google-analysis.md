# Análise de Tecnologias Google para Aprimoramento do FisioFlow

## Contexto

Esta análise foi realizada a partir dos sites labs.google/experiments, ai.google e cloud.google.com, utilizando os MCPs exa_web_search, exa_web_fetch e context7 para buscar documentação atualizada.

O projeto **FisioFlow** já possui um ecossistema AI extremamente robusto:

- **Gemini 1.5/2.5** via REST API + Cloudflare AI Gateway
- **Workers AI** (Llama 3.3 70B, Whisper, BGE-M3 embeddings)
- **MediaPipe** + **TensorFlow.js** para pose detection/biomecânica
- **Cornerstone.js** para DICOM
- **20+ endpoints AI**, 6 agentes (SOAP Review, AI Tutor, Patient Simulator, etc.)
- **RAG com Vectorize**, transcrição de áudio, OCR de recibos, marketing AI

---

## Tecnologias Google Analisadas

### 1. Gemini Live API

- WebSocket bidirecional para conversas por voz em tempo real com Gemini
- 70 idiomas suportados, barge-in, transcrição automática
- **Custo:** ~$0.15-0.50 por avaliação de 30min / ~$1-2 por avaliação de 1 hora
- Documentação: https://ai.google.dev/gemini-api/docs/live

### 2. Gemini Thinking Mode

- Modelos Gemini 3 Flash/Pro com "thinking" interno
- Melhora significativamente raciocínio multi-step
- Níveis configuráveis: minimal, low, medium, high
- Documentação: https://ai.google.dev/gemini-api/docs/thinking

### 3. Gemini Structured Outputs

- Suporte a JSON Schema completo (Pydantic/Zod out-of-the-box)
- Property ordering garantido
- Suporta anyOf, $ref, minimum/maximum
- Documentação: https://ai.google.dev/gemini-api/docs/structured-output

### 4. MedGemma 1.5 4B (Google Healthcare AI)

- Modelo open-source otimizado para imagens médicas
- Suporte a radiografia, dermatologia, CT/MRI 3D
- Suporte longitudinal e FHIR
- **Disponível no Brasil!** ("GA in US, Brazil, and Singapore")
- Deploy: Vertex AI Model Garden ou HuggingFace Transformers

### 5. Long Context (1M+ tokens)

- Janela de contexto de 1 milhão+ tokens
- Context Caching: ~4x menos custoso para consultas repetidas
- Documentação: https://ai.google.dev/gemini-api/docs/long-context

### 6. Cloud Healthcare API + FHIR

- API gerenciada para dados FHIR R4, HL7v2, DICOM
- Healthcare NLP API com entity extraction (SNOMED CT, ICD-10)
- Documentação: https://cloud.google.com/healthcare

### 7. Gemini Nano / ML Kit GenAI

- IA 100% no dispositivo (on-device)
- APIs: summarization, proofreading, rewriting, image description, speech recognition
- Disponível em: Pixel 9+, Samsung S25+, OnePlus 13+, Motorola Razr 60 Ultra
- **Custo zero!** (processamento local)
- Documentação: https://developers.google.com/ml-kit/genai

### 8. MedASR

- Modelo de speech recognition especializado em terminologia médica
- Lançado junto com MedGemma 1.5
- Melhor reconhecimento de termos como "cifose", "lordose", "escápula", "manguito rotador"

---

## Resumo: O Que Pode Ser Implementado

| Prioridade | Feature                            | Esforço     | Impacto                     |
| ---------- | ---------------------------------- | ----------- | --------------------------- |
| **P0**     | Gemini Structured Outputs (Zod)    | 2-3 dias    | Eliminar parsing quebrado   |
| **P0**     | Gemini Thinking Mode               | 1 dia       | Raciocínio clínico profundo |
| **P1**     | Gemini Live API (voz)              | 1-2 semanas | Experiência premium         |
| **P1**     | Function Calling Composicional     | 1 semana    | Agentes autônomos           |
| **P1**     | Long Context + Caching             | 3-5 dias    | Patient 360°                |
| **P2**     | MedGemma para radiologia           | 2-3 semanas | Análise real de imagens     |
| **P2**     | Healthcare NLP (entity extraction) | 1-2 semanas | ICD-10/SNOMED automático    |
| **P2**     | MedASR para transcrição            | 1 semana    | Terminologia fisio precisa  |
| **P3**     | FHIR R4 export/import              | 2-4 semanas | Interoperabilidade          |
| **P3**     | Gemini Nano on-device              | 1-2 semanas | Funcionamento offline       |
| **P3**     | Vertex AI Search Healthcare        | 2-3 semanas | Busca inteligente           |

---

## Decisão do Usuário: Abordagem de Voz na Avaliação

Após análise de custos, o usuário decidiu por uma **abordagem híbrida com 3 camadas e fallback automático:**

### Abordagem Definida

```
┌─────────────────────────────────────────────┐
│            AVALIAÇÃO FISIOTERAPÊUTICA       │
├─────────────────────────────────────────────┤
│                                             │
│  Camada 1: On-device (ML Kit Speech)        │
│  ├── Custo: ZERO                           │
│  ├── Disponível: Android premium            │
│  └── Fallback → Camada 2                   │
│                                             │
│  Camada 2: Gravar + Workers AI Whisper      │
│  ├── Custo: ZERO (já incluso no plano CF)  │
│  ├── Disponível: qualquer dispositivo       │
│  └── Funciona offline-first                │
│                                             │
│  Camada 3: Gemini Live API (opt-in)       │
│  ├── Custo: ~R$1-2/avaliação (1hr)        │
│  ├── Toggle na UI: "Modo Premium IA"     │
│  └── Tempo real, preenchimento automático   │
│                                             │
│  Todas → Structured Output Zod → Formulário │
│  Todas → Thinking Mode → Análise clínica     │
└─────────────────────────────────────────────┘
```

**Pontos-chave:**

- **Fisioterapeuta escolhe** no momento da avaliação se quer o "Modo Premium IA" (Live API) ou gravação normal
- **90%+ das avaliações** usarão B+C (gratuito)
- O fisioterapeuta pode testar a opção A em algumas avaliações para decidir se o custo justifica o ganho
- O **Structured Output Zod** + **Thinking** são agnósticos à fonte de voz

---

## PLANO DE IMPLEMENTAÇÃO: Avaliação com IA por Voz + Gemini Upgrades

### FASE 1: Gemini Structured Outputs + Thinking Mode (2-3 dias)

#### 1.1 Upgrade do SDK `@google/generative-ai` -> `@google/genai`

**Arquivo:** `apps/api/src/lib/ai-gemini.ts`

O SDK atual (`@google/generative-ai` v0.24.1) faz REST manual. O novo `@google/genai` suporta:

- Structured Outputs nativo com Zod
- Thinking Config
- Streaming aprimorado

**Novo arquivo:** `apps/api/src/lib/ai-gemini-v2.ts`

```typescript
// Novo SDK com suporte a Structured Outputs + Thinking
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { z } from "zod";
```

**Funções novas:**

- `callGeminiStructured<T>(schema: ZodSchema, prompt, model, thinkingLevel)` -- retorna T tipado
- `callGeminiThinking(prompt, model, thinkingLevel)` -- retorna texto com raciocínio
- `streamGeminiChatStructured(messages, schema)` -- streaming com output estruturado

#### 1.2 Schemas Zod para as features existentes

**Arquivo novo:** `apps/api/src/schemas/ai-schemas.ts`

Schemas para substituir parsing manual:

- `SoapSchema` -- `{ subjective, objective, assessment, plan }`
- `ExerciseSuggestionSchema` -- `{ exercises: [{ name, rationale, targetArea, sets, reps }] }`
- `ReceiptOcrSchema` -- `{ valor, nome, cardLastDigits, isFirstPayment, pixKey, dataTransacao }`
- `AssessmentFormSchema` -- formulário completo de avaliação fisioterapêutica
- `TranscriptionToSoapSchema` -- saída do endpoint `/transcribe-session`
- `ClinicalReportSchema` -- saída do `/analysis`
- `ExecutiveSummarySchema` -- saída do `/executive-summary`

#### 1.3 Migração dos endpoints existentes (sem quebrar)

**Arquivo:** `apps/api/src/routes/ai.ts`

**Endpoints a migrar (substituir JSON.parse frágil por Structured Output):**

| Endpoint                           | Linha atual | Problema                                    | Solução                                          |
| ---------------------------------- | ----------- | ------------------------------------------- | ------------------------------------------------ |
| `/ai/transcribe-session`           | L400-428    | `JSON.parse(aiResponse.replace(/```json...` | Structured Output com `SoapSchema`               |
| `/ai/service` (exerciseSuggestion) | L165-179    | `JSON.parse(aiResponse.replace(/```json...` | Structured Output com `ExerciseSuggestionSchema` |
| `/ai/receipt-ocr`                  | L847-890    | Strip markdown + JSON.parse                 | Structured Output com `ReceiptOcrSchema`         |
| `/ai/service` (clinicalChat)       | L132-155    | Sem schema, texto livre                     | Thinking mode `low` para raciocínio básico       |

**Estratégia:** Criar versões `_v2` dos handlers que usam structured output, e rotear progressivamente. Não quebrar endpoints existentes.

#### 1.4 EvolutionSummarizer com Structured Output

**Arquivo:** `apps/api/src/services/ai/EvolutionSummarizer.ts`

Atualmente faz `rawResponse.match(/\{[\s\S]*\}/)` -- frágil. Migrar para:

- Workers AI com JSON mode garantido, OU
- Gemini Flash com Structured Output + `SoapSchema`

#### 1.5 Adicionar `@google/genai` ao package.json

```json
"@google/genai": "^1.0.0"
```

---

### FASE 2: Sistema de Gravação de Avaliação (B+C) (1-2 semanas)

#### 2.1 Novo Serviço: AssessmentRecordingService

**Arquivo novo:** `apps/api/src/services/ai/AssessmentRecordingService.ts`

```typescript
class AssessmentRecordingService {
  // Camada B: Gravar audio -> transcrever -> gerar avaliação
  async processRecording(audioBase64, mimeType, patientContext) {
    // 1. Transcrever com Deepgram Nova-3 (Workers AI, gratuito)
    // 2. Gerar avaliação estruturada com Gemini + Structured Output + Thinking
    // 3. Retornar AssessmentFormSchema preenchido
  }

  // Camada C: Texto on-device -> gerar avaliação (sem transcrição)
  async processTranscript(transcript, patientContext) {
    // 1. Receber texto já transcrito do device
    // 2. Gerar avaliação estruturada com Gemini + Structured Output + Thinking
    // 3. Retornar AssessmentFormSchema preenchido
  }
}
```

**Cadeia de transcrição (já existe, reusar):**

```
Deepgram Nova-3 (pt-BR, rápido, gratuito)
  -> fallback: Whisper Large V3 Turbo (Workers AI, gratuito)
    -> fallback: Gemini 1.5 Flash (pago, última opção)
```

#### 2.2 Schema Zod do Formulário de Avaliação

**Arquivo:** `apps/api/src/schemas/assessment-schema.ts`

Schema completo da avaliação fisioterapêutica com:

- Dados do paciente (nome, idade, profissão, história)
- Queixa principal e história da doença atual
- Antecedentes pessoais e familiares
- Avaliação postural (anterior, posterior, lateral)
- ADM (amplitude de movimento) por articulação
- Força muscular
- Testes especiais (Lasègue, McMurray, Lachman, etc.)
- Palpação
- Diagnóstico fisioterapêutico (CID/CIFF)
- Objetivos e plano terapêutico
- **AVALIAÇÃO:** diagnóstico diferencial, raciocínio clínico

#### 2.3 Novos Endpoints API

**Arquivo:** `apps/api/src/routes/ai.ts` (adicionar ao final)

```typescript
// Camada B: Gravar + transcrever + avaliar
app.post("/assessment/recording", ...)
// Body: { audioData: base64, mimeType, patientId, patientContext }
// Response: AssessmentFormSchema (JSON validado)

// Camada C: Texto transcrito -> avaliar
app.post("/assessment/transcript", ...)
// Body: { transcript, patientId, patientContext }
// Response: AssessmentFormSchema (JSON validado)

// Camada A: Gemini Live API (opt-in, premium)
app.post("/assessment/live-session", ...)
// Body: { patientId, patientContext, mode: "live" }
// Response: WebSocket upgrade ou session token
```

#### 2.4 Prompt Clínico para Avaliação

**Arquivo novo:** `apps/api/src/lib/ai/prompts/assessment-prompts.ts`

System prompt especializado:

- Persona: fisioterapeuta experiente redigindo avaliação
- Conhecimento: terminologia CIFF, testes especiais, escalas (EVA, PSFS, DASH, etc.)
- Thinking mode `high`: raciocinar sobre diagnóstico diferencial
- Output: Structured Output com `AssessmentFormSchema`
- Idioma: pt-BR

#### 2.5 Frontend: Componente de Gravação de Avaliação

**Arquivo novo:** `src/components/ai/AssessmentVoiceRecorder.tsx`

UI com:

- **Toggle de modo:** "Gravação" (B) / "On-device" (C) / "Premium IA" (A)
- Gravador de áudio com visualizador de waveform
- Indicador de status: gravando -> transcrevendo -> analisando -> preenchido
- Preview do formulário preenchido pelo AI
- Edição manual pós-preenchimento
- Botão "Salvar avaliação" que persiste no banco

**Fluxo UI:**

```
[Fisioterapeuta clica "Avaliação com IA"]
  -> Escolhe modo: Gratuito (B/C) ou Premium (A)
  -> [MODO gratuito] Grava áudio da avaliação (30-60 min)
  -> [MODO ON-DEVICE] Se disponível, speech-to-text nativo
  -> Ao finalizar, envia para API
  -> API transcreve (B) ou recebe texto (C)
  -> Gemini Thinking analisa + Structured Output preenche formulário
  -> Fisioterapeuta revisa formulário preenchido
  -> Salva
```

#### 2.6 Integração com Página de Avaliação Existente

O componente será integrado na página de nova avaliação do paciente, como um "assistente de preenchimento" -- não substitui o formulário manual, é uma opção adicional.

---

### FASE 3: Gemini Live API -- Modo Premium (opt-in) (1 semana)

#### 3.1 Durable Object para Sessão Live

**Arquivo novo:** `apps/api/src/durable-objects/AssessmentLiveSession.ts`

```typescript
// Durable Object para manter estado da sessão Live API
export class AssessmentLiveSession implements DurableObject {
  // WebSocket server -> cliente (fisioterapeuta)
  // WebSocket client -> Gemini Live API
  // Bidirecional: áudio do fisioterapeuta -> Gemini -> formulário preenchido em tempo real
}
```

**Por que Durable Object:**

- Mantém WebSocket aberto por 30-60 minutos (avaliação longa)
- Estado da sessão (transcrição parcial, campos preenchidos)
- Já tem a infraestrutura no wrangler.toml (`PATIENT_AGENT` DO)

#### 3.2 Rota WebSocket

**Arquivo:** `apps/api/src/routes/ai.ts`

```typescript
app.get("/assessment/live-ws", async (c) => {
  // Upgrade para WebSocket
  // Conecta ao Gemini Live API
  // Retorna ephemeral token para o cliente
});
```

#### 3.3 Toggle Premium na UI

No `AssessmentVoiceRecorder.tsx`:

- Badge "Premium IA" com indicador de custo estimado
- Confirmação: "Esta avaliação usará IA em tempo real. Custo estimado: ~R$1-2"
- Se o fisioterapeuta aceitar, abre WebSocket e começa sessão Live

#### 3.4 Custos e Controles

- **Rate limit premium:** máx 5 sessões Live/dia/organização (evitar abuso)
- **Duração máxima:** 90 minutos por sessão
- **Métricas:** log de custo por sessão no Axiom
- **Opt-in:** apenas se `GOOGLE_AI_PREMIUM_ENABLED` = true no env

#### 3.5 Variável de ambiente nova

**wrangler.toml + env.ts:**

```typescript
GOOGLE_AI_PREMIUM_ENABLED?: string; // "true" para habilitar Live API
```

---

## RESUMO DOS ARQUIVOS A CRIAR/MODIFICAR

| Ação          | Arquivo                                                  | Fase  |
| ------------- | -------------------------------------------------------- | ----- |
| **CRIAR**     | `apps/api/src/lib/ai-gemini-v2.ts`                       | F1    |
| **CRIAR**     | `apps/api/src/schemas/ai-schemas.ts`                     | F1    |
| **CRIAR**     | `apps/api/src/schemas/assessment-schema.ts`              | F2    |
| **CRIAR**     | `apps/api/src/services/ai/AssessmentRecordingService.ts` | F2    |
| **CRIAR**     | `apps/api/src/lib/ai/prompts/assessment-prompts.ts`      | F2    |
| **CRIAR**     | `src/components/ai/AssessmentVoiceRecorder.tsx`          | F2    |
| **CRIAR**     | `apps/api/src/durable-objects/AssessmentLiveSession.ts`  | F3    |
| **MODIFICAR** | `apps/api/src/routes/ai.ts`                              | F1-F3 |
| **MODIFICAR** | `apps/api/src/services/ai/EvolutionSummarizer.ts`        | F1    |
| **MODIFICAR** | `apps/api/src/types/env.ts`                              | F3    |
| **MODIFICAR** | `apps/api/wrangler.toml`                                 | F3    |
| **MODIFICAR** | `package.json` (adicionar `@google/genai`)               | F1    |

---

## ORDEM DE EXECUÇÃO RECOMENDADA

1. **F1.1** -- Instalar `@google/genai` + criar `ai-gemini-v2.ts`
2. **F1.2** -- Criar schemas Zod (`ai-schemas.ts`)
3. **F1.3** -- Migrar endpoint `/ai/transcribe-session` para Structured Output (maior ganho imediato)
4. **F1.4** -- Migrar `EvolutionSummarizer.ts`
5. **F1.5** -- Migrar `/ai/receipt-ocr`
6. **F2.1** -- Criar `assessment-schema.ts`
7. **F2.2** -- Criar `assessment-prompts.ts`
8. **F2.3** -- Criar `AssessmentRecordingService.ts`
9. **F2.4** -- Criar endpoints `/assessment/recording` e `/assessment/transcript`
10. **F2.5** -- Criar componente `AssessmentVoiceRecorder.tsx`
11. **F3** -- Gemini Live API (quando validarem que o custo vale a pena)

---

## Referências

- Gemini API: https://ai.google.dev/gemini-api/docs
- Gemini Live API: https://ai.google.dev/gemini-api/docs/live
- Gemini Thinking: https://ai.google.dev/gemini-api/docs/thinking
- Structured Outputs: https://ai.google.dev/gemini-api/docs/structured-output
- Long Context: https://ai.google.dev/gemini-api/docs/long-context
- Cloud Healthcare API: https://cloud.google.com/healthcare
- ML Kit GenAI APIs: https://developers.google.com/ml-kit/genai
- Google Cloud Healthcare: https://cloud.google.com/healthcare-api

---

_Documento gerado em: 18 de Abril de 2026_
_Projeto: FisioFlow - Sistema de Gestão de Fisioterapia_
