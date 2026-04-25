# FisioFlow Tech Evolution 2026 — Plano de Implementação

> **Data:** Abril 2026
> **Status:** Em implementação (Sprint 1)

---

## 1. Visão Geral

Evolução tecnológica do FisioFlow com foco em:

- **Modelo de IA configurável** com GLM-4.7-Flash (grátis) como padrão
- **Evolução clínica por voz** (GLM-ASR + LLM)
- **Visão multimodal** (GLM-5V-Turbo para fotos de postura, exames)
- **toMarkdown** para documentos clínicos (RAG)
- **NFSe São Paulo** via webservice SOAP direto da prefeitura
- **Quick Actions PDF** (Browser Run sem Puppeteer)

---

## 2. Arquitetura: Model Registry + AI Gateway

```
┌─────────────────────────────────────────────────┐
│                 FRONTEND                         │
│  [Model Selector] → GLM-4.7-Flash (Grátis) ▼   │
│  Stored in: ai_config table (per organization)   │
└──────────────────────┬──────────────────────────┘
                       │ X-Model: glm-4.7-flash
                       ▼
┌─────────────────────────────────────────────────┐
│              API WORKER                          │
│                                                  │
│  ┌─────────────────────────────────┐            │
│  │  ModelRegistry (central)        │            │
│  │  - Lista modelos disponíveis    │            │
│  │  - Valida capabilities          │            │
│  │  - Retorna provider + config    │            │
│  └────────────┬────────────────────┘            │
│               ▼                                  │
│  ┌─────────────────────────────────┐            │
│  │  callAI({ task, model, input }) │            │
│  │  → AI Gateway (cache + fallback)│            │
│  │  → Provider: Z.AI / Workers AI  │            │
│  └─────────────────────────────────┘            │
└─────────────────────────────────────────────────┘
```

### Fluxo AI Gateway

```
callAI({ model: 'glm-4.7-flash', task: 'soap' })
  → AI Gateway (cache + rate limit + analytics)
    → Z.AI API (GLM-4.7-Flash, GRÁTIS)
    → Fallback 1: Workers AI (Llama 3.3 70B, GRÁTIS)
    → Fallback 2: Workers AI (GLM-4.7-Flash edge, GRÁTIS)
```

---

## 3. Modelos Disponíveis

| Modelo          | Provider   | Input/1M | Output/1M | Capabilities                     | Default |
| --------------- | ---------- | -------- | --------- | -------------------------------- | ------- |
| GLM-4.7-Flash   | Z.AI       | **$0**   | **$0**    | chat, thinking                   | **SIM** |
| GLM-5.1         | Z.AI       | $1.40    | $4.40     | chat, thinking, function-calling | Não     |
| GLM-5V-Turbo    | Z.AI       | $1.20    | $4.00     | chat, vision, thinking           | Não     |
| GLM-ASR-2512    | Z.AI       | $0.03    | —         | audio, transcription             | Não     |
| Llama 3.3 70B   | Workers AI | $0       | $0        | chat                             | Não     |
| Whisper         | Workers AI | $0       | $0        | audio                            | Não     |
| BGE Embeddings  | Workers AI | $0       | $0        | embeddings                       | Não     |
| GPT-4o          | OpenAI     | $2.50    | $10.00    | chat, vision                     | Não     |
| GPT-4o Mini     | OpenAI     | $0.15    | $0.60     | chat                             | Não     |
| Claude Sonnet 4 | Anthropic  | $3.00    | $15.00    | chat, thinking                   | Não     |

### Z.AI API Details

- **Base URL:** `https://api.z.ai/api/paas/v4/`
- **Compatível com:** OpenAI SDK (drop-in replacement)
- **Cached input:** GLM-5.1 = $0.26/1M (81% desconto)
- **GLM-4.7-Flash:** 100% grátis, 200K contexto, thinking mode

---

## 4. AI Gateway — Por que usar?

O AI Gateway é **GRÁTIS** (incluído no Workers Paid) e fica entre o Worker e o provedor de IA:

| Recurso              | Direto      | Via AI Gateway             |
| -------------------- | ----------- | -------------------------- |
| Custo gateway        | $0          | $0 (grátis)                |
| Custo modelos        | Preço cheio | Mesmo preço                |
| Cache                | Não         | **Sim** (economiza 30-50%) |
| Fallback             | Manual      | **Automático**             |
| Rate limiting        | Manual      | **Nativo**                 |
| Analytics            | Nenhum      | **Dashboard completo**     |
| Logs                 | Nenhum      | **10M logs/gateway**       |
| DLP (mascarar dados) | Não         | **Nativo**                 |

### Economia com Cache

- Templates SOAP repetidos → cache hit instantâneo ($0)
- Perguntas frequentes do chat → cache hit ($0)
- Relatórios padrão → cache hit ($0)
- **Economia estimada: 30-50% do custo mensal de IA**

---

## 5. Schema do Banco

### Tabela: ai_config

```sql
CREATE TABLE ai_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  default_chat_model TEXT DEFAULT 'glm-4.7-flash',
  default_analysis_model TEXT DEFAULT 'glm-4.7-flash',
  default_vision_model TEXT DEFAULT 'glm-5v-turbo',
  default_transcription_model TEXT DEFAULT 'glm-asr-2512',
  default_embedding_model TEXT DEFAULT '@cf/baai/bge-base-en-v1.5',
  thinking_enabled BOOLEAN DEFAULT false,
  thinking_budget TEXT DEFAULT 'MEDIUM',
  monthly_budget_usd DECIMAL DEFAULT 50.00,
  current_spend_usd DECIMAL DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id)
);
```

### Tabela: ai_models

```sql
CREATE TABLE ai_models (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  capabilities TEXT[] DEFAULT '{}',
  input_cost_per_1m DECIMAL,
  output_cost_per_1m DECIMAL,
  context_length INT,
  is_free BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0
);
```

### Seed de Modelos

```sql
INSERT INTO ai_models VALUES
('glm-4.7-flash', 'zai', 'GLM-4.7 Flash', 'Rápido e gratuito. Ideal para uso diário.', '{chat,thinking}', 0, 0, 200000, true, true, 1),
('glm-5.1', 'zai', 'GLM-5.1', 'Flagship. 200K contexto, thinking avançado.', '{chat,thinking,function-calling}', 1.40, 4.40, 200000, false, false, 2),
('glm-5v-turbo', 'zai', 'GLM-5V Turbo', 'Multimodal com visão.', '{chat,vision,thinking}', 1.20, 4.00, 200000, false, false, 10),
('glm-asr-2512', 'zai', 'GLM-ASR', 'Transcrição de áudio. PT-BR nativo.', '{audio}', 0.03, 0, NULL, false, false, 20),
('workers-llama-3.3', 'workers-ai', 'Llama 3.3 70B (Edge)', 'Edge inference grátis.', '{chat}', 0, 0, NULL, true, false, 5),
('workers-whisper', 'workers-ai', 'Whisper (Edge)', 'Transcrição na edge.', '{audio}', 0, 0, NULL, true, false, 21),
('workers-embeddings', 'workers-ai', 'BGE Embeddings (Edge)', 'Embeddings para RAG.', '{embeddings}', 0, 0, NULL, true, false, 30),
('gpt-4o', 'openai', 'GPT-4o', 'OpenAI flagship.', '{chat,vision}', 2.50, 10.00, 128000, false, false, 3),
('gpt-4o-mini', 'openai', 'GPT-4o Mini', 'Rápido e barato.', '{chat}', 0.15, 0.60, 128000, false, false, 4),
('claude-sonnet-4', 'anthropic', 'Claude Sonnet 4', 'Excelente em análise clínica.', '{chat,thinking}', 3.00, 15.00, 200000, false, false, 6);
```

---

## 6. Sprints de Implementação

### Sprint 1 — Fundação (Semana 1-2)

| #   | Tarefa                              | Arquivos                               | Esforço |
| --- | ----------------------------------- | -------------------------------------- | ------- |
| 1.1 | Migration `ai_config` + `ai_models` | `migrations/0052_ai_config.sql`        | 2h      |
| 1.2 | Seed modelos                        | migration                              | 1h      |
| 1.3 | ModelRegistry central               | `apps/api/src/lib/ai/modelRegistry.ts` | 4h      |
| 1.4 | Provider Z.AI                       | `apps/api/src/lib/ai/providers/zai.ts` | 4h      |
| 1.5 | callAI() unificado                  | `apps/api/src/lib/ai/callAI.ts`        | 1 dia   |
| 1.6 | Rotas CRUD /api/ai/config           | `apps/api/src/routes/ai-config.ts`     | 4h      |
| 1.7 | Middleware aiModel                  | `apps/api/src/middleware/aiModel.ts`   | 2h      |
| 1.8 | Frontend: Model selector            | Componente React                       | 1 dia   |
| 1.9 | Secret ZAI_API_KEY                  | `wrangler secret put`                  | 5min    |

### Sprint 2 — Migrar Chamadas Existentes (Semana 2-3)

| #   | Tarefa                             | Esforço          |
| --- | ---------------------------------- | ---------------- |
| 2.1 | Migrar `ai.ts` → callAI()          | 1 dia            |
| 2.2 | Migrar `ai-gemini-v2.ts`           | 4h               |
| 2.3 | Migrar `ai-native.ts` via registry | 4h               |
| 2.4 | Migrar `ai-studio.ts`              | 4h               |
| 2.5 | Migrar agents (PatientAgent, etc.) | 4h               |
| 2.6 | Gemini como provider legacy        | 0h (já funciona) |

### Sprint 3 — Quick Actions PDF (Semana 3)

| #   | Tarefa                          | Esforço |
| --- | ------------------------------- | ------- |
| 3.1 | Instalar `cloudflare` SDK       | 30min   |
| 3.2 | Reescrever `pdf.ts`             | 4h      |
| 3.3 | Atualizar `reportsPdf.ts`       | 4h      |
| 3.4 | Headers/footers nativos         | 2h      |
| 3.5 | Remover `@cloudflare/puppeteer` | 30min   |

### Sprint 4 — Evolução por Voz (Semana 4-5)

| #   | Tarefa                            | Esforço |
| --- | --------------------------------- | ------- |
| 4.1 | POST /api/ai/transcribe (GLM-ASR) | 4h      |
| 4.2 | POST /api/ai/evolution/voice      | 1 dia   |
| 4.3 | Pipeline: áudio → texto → SOAP    | 4h      |
| 4.4 | Frontend: botão gravar            | 1 dia   |
| 4.5 | Mobile (Expo)                     | 1 dia   |
| 4.6 | Fallback chain voz                | 4h      |

### Sprint 5 — Visão + toMarkdown (Semana 5-6)

| #   | Tarefa                      | Esforço |
| --- | --------------------------- | ------- |
| 5.1 | POST /api/ai/vision/analyze | 1 dia   |
| 5.2 | Análise de postura          | 1 dia   |
| 5.3 | OCR documentos              | 4h      |
| 5.4 | env.AI.toMarkdown()         | 4h      |
| 5.5 | Frontend: upload + análise  | 1 dia   |
| 5.6 | RAG documentos              | 1 dia   |

### Sprint 6 — NFSe São Paulo (Semana 6-7)

| #   | Tarefa                         | Esforço |
| --- | ------------------------------ | ------- |
| 6.1 | Instalar `fast-xml-parser`     | 30min   |
| 6.2 | rpsBuilder.ts (XML ABRASF v2)  | 1 dia   |
| 6.3 | nfseSPClient.ts (SOAP)         | 1 dia   |
| 6.4 | Reescrever nfseWorkflow.ts     | 4h      |
| 6.5 | Unificar schema → nfse_records | 4h      |
| 6.6 | DANFSe via Quick Actions       | 4h      |
| 6.7 | Secrets NFSe                   | 30min   |

### Sprint 7 — Dashboard + Custos (Semana 7-8)

| #   | Tarefa                | Esforço |
| --- | --------------------- | ------- |
| 7.1 | Dashboard custos IA   | 1 dia   |
| 7.2 | Rate limiting por org | 2h      |
| 7.3 | Budget alerts         | 4h      |
| 7.4 | Avaliar Agents SDK    | 2 dias  |

---

## 7. Custo Mensal Estimado

### Cenário Conservador (GLM-4.7-Flash padrão + AI Gateway cache)

| Item                                | Volume/mês        | Custo          |
| ----------------------------------- | ----------------- | -------------- |
| GLM-4.7-Flash (chat, SOAP, análise) | ~50K requests     | **$0**         |
| Workers AI (Whisper, embeddings)    | incluído          | **$0**         |
| GLM-ASR (voz)                       | ~200 transcrições | **~$0.50**     |
| GLM-5V-Turbo (visão)                | ~100 análises     | **~$3**        |
| Quick Actions PDF                   | ~3.000            | **$0**         |
| AI Gateway                          | —                 | **$0**         |
| **Total IA**                        |                   | **~$3.50/mês** |

### Cenário com GLM-5.1 padrão

| Item           | Custo           |
| -------------- | --------------- |
| GLM-5.1 (tudo) | ~$30-50/mês     |
| GLM-ASR        | ~$1/mês         |
| GLM-5V-Turbo   | ~$6/mês         |
| **Total IA**   | **~$37-57/mês** |

### Custo Infraestrutura Cloudflare

| Item                            | Custo          |
| ------------------------------- | -------------- |
| Workers Paid                    | $5/mês         |
| R2 Storage                      | ~$0.20/mês     |
| Workers AI (grátis até limites) | $0             |
| AI Gateway                      | $0             |
| Browser Run Quick Actions       | $0             |
| **Total Infra**                 | **~$5.20/mês** |

### TOTAL MENSAL (cenário conservador): ~$8.70/mês

---

## 8. Análise: Workers Paid é necessário?

### O que o FisioFlow usa que PRECISA do Workers Paid ($5/mês):

| Recurso             | Free Plan  | Paid Plan   | Impacto se downgradar                             |
| ------------------- | ---------- | ----------- | ------------------------------------------------- |
| **CPU time**        | 10ms       | 5 min       | **APP QUEBRA** — queries SQL, IA, PDF geram >10ms |
| **Requests**        | 100K/dia   | 10M/mês     | Arriscado com crescimento                         |
| **Worker size**     | 3MB        | 10MB        | Fisioflow tem 85+ rotas, pode exceder 3MB         |
| **Browser Run**     | 10 min/dia | Ilimitado   | PDF gerados parariam após 10 min                  |
| **Quick Actions**   | 1 req/10s  | 10 req/s    | Muito lento para produção                         |
| **Workflows**       | 10ms CPU   | 5 min CPU   | 6 workflows ficariam inúteis                      |
| **Subrequests**     | 50/req     | 10K/req     | IA + DB + R2 em 1 request = >50                   |
| **AI Gateway logs** | 100K total | 10M/gateway | Sem observabilidade                               |

### Veredito: **SIM, Workers Paid é indispensável**

Os $5/mês do Workers Paid são o gasto mais eficiente possível:

- Sem ele, o app **literalmente não funciona** (10ms CPU)
- Inclui AI Gateway grátis ($0)
- Inclui Workers AI grátis ($0)
- Inclui Browser Run com limites razoáveis
- Inclui 6 Workflows, Durable Objects, Queues, Vectorize, Hyperdrive

**Não há como realocar esses $5/mês para nada mais valioso.** É a fundação de toda a infraestrutura.

### Comparação: $5/mês Cloudflare vs alternativas

| Provedor                      | Equivalente             | Custo/mês  |
| ----------------------------- | ----------------------- | ---------- |
| AWS Lambda + API Gateway + S3 | Similar ao Workers + R2 | ~$20-50    |
| Vercel Pro                    | Serverless functions    | $20/mês    |
| Railway                       | Container hosting       | $5-20/mês  |
| Render                        | Web service             | $7+/mês    |
| **Cloudflare Workers Paid**   | **Tudo incluso**        | **$5/mês** |

O Cloudflare Workers Paid é **10x mais barato** que qualquer alternativa equivalente.

---

## 9. Funcionalidades por Modelo

| Funcionalidade      | Modelo Padrão           | Quando Trocar                   |
| ------------------- | ----------------------- | ------------------------------- |
| Chat IA geral       | GLM-4.7-Flash (grátis)  | GLM-5.1 para análises complexas |
| Evolução SOAP       | GLM-4.7-Flash (grátis)  | GLM-5.1 para thinking mode      |
| Transcrição voz     | GLM-ASR-2512            | Whisper (fallback edge)         |
| Análise visual      | GLM-5V-Turbo            | —                               |
| Relatórios premium  | GLM-4.7-Flash (grátis)  | GLM-5.1 para mais profundidade  |
| Busca semântica/RAG | BGE Embeddings (grátis) | —                               |
| toMarkdown          | Workers AI (grátis)     | —                               |
| PDF                 | Quick Actions (grátis)  | —                               |
| NFSe XML            | Sem IA                  | —                               |

---

## 10. Frontend: Configurações de IA

```
┌─────────────────────────────────────┐
│ ⚙️ Configurações de IA              │
│                                      │
│ Modelo padrão para conversas:        │
│ ┌─────────────────────────────┐     │
│ │ GLM-4.7 Flash (Grátis)   ▼ │     │
│ └─────────────────────────────┘     │
│                                      │
│ Outras opções:                       │
│ ○ GLM-5.1 ($1.40/M tokens)         │
│ ○ GPT-4o ($2.50/M tokens)          │
│ ○ Claude Sonnet 4 ($3.00/M tokens)  │
│ ○ Llama 3.3 70B Edge (Grátis)      │
│                                      │
│ ☑ Ativar thinking mode              │
│                                      │
│ Orçamento mensal: $50.00             │
│ Gasto este mês: $3.42                │
└─────────────────────────────────────┘
```
