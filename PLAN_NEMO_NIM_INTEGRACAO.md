# Plano: Integração NVIDIA NIM/NeMo no FisioFlow

**Criado**: 2026-07-22
**Status**: Draft — para apreciação do usuário
**Stack alvo**: Cloudflare Workers (Hono) + Neon Postgres + OpenAI SDK (já usado em `providers/zai.ts`)

---

## 1. Estado Atual (diagnóstico)

### Arquitetura de IA existente
O FisioFlow já possui uma arquitetura de IA madura e multi-camada:

| Camada | Implementação | Arquivo | Status |
|--------|--------------|---------|--------|
| **Registry de modelos** | 12 modelos CF Workers AI | `apps/api/src/lib/workersAi.ts` | Ativo, versionado |
| **AI Router** | Fallback chain, budget check, LGPD sanitization, model policy | `apps/api/src/lib/ai/aiRouter.ts` + `callAI.ts` | Ativo (stubs em produção) |
| **Model Registry** | 11 modelos (Z.AI, Workers AI, OpenAI, Anthropic, Gemini, Ollama) com custos, capabilities, per-org config | `apps/api/src/lib/ai/modelRegistry.ts` | Ativo |
| **Providers** | `providers/zai.ts` (OpenAI SDK, gateway-routed), `runAi` (Workers AI binding), Gemini-v2, AI Gateway custom | `apps/api/src/lib/ai/providers/zai.ts`, `ai-native.ts`, `ai-gemini-v2.ts` | Ativo |
| **AI Gateway** | Cloudflare `fisioflow-gateway` — cache, rate limit, guardrails | dashboard + `aiGateway.ts` | Ativo |
| **Voz/ASR** | Whisper-turbo + Whisper legacy (Workers AI), Deepgram Nova-3 (spec), `SFSpeechRecognizer` iOS, `@cloudflare/voice` beta | `ai-native.ts:transcribeAudio`, `specs/ditado-evolucao` | Parcial (specs F1 pendente) |
| **Voz/TTS** | Deepgram Aura-2-es via Workers AI | `ai-native.ts:synthesizeSpeech` | Ativo, limitado (espanhol «similar» a PT-BR) |
| **RAG** | Vectorize `fisioflow-clinical`, AI Search `fisioflow-rag`, pgvector fallback, bge-m3 embeddings | `vectorizeService.ts`, `cloudflareAiSearch.ts` | Ativo e em produção |
| **LLM Guardrails** | `@cf/meta/llama-guard-3-8b` (labora genérico) | `ai-native.ts:moderateContent`, `patientAssistantGuardrails.ts` | Parcial |

### Gaps identificados
1. **ASR PT-BR de qualidade**: Whisper-turbo funciona mas não é topo-de-linha para PT-BR clínico. Deepgram Nova-3 especulado no `ditado-evolucao` spec, mas o gate F1 (validação WER ≤ 10%) nunca foi executado.
2. **TTS PT-BR de qualidade**: Aura-2-es é modelo em espanhol «similar» — sotaque e prosódia não-ideais para PT-BR nativo.
3. **Fallback diversificado**: Toda a stack LLM roda em 2 providers (Workers AI + Z.AI). Sem diversificação geográfica/infraestrutural além do perímetro Cloudflare.
4. **Modelos de reasoning clínico**: Llama-3.3-70b é o mais capaz no Workers AI; Nemotron-Ultra-253B disponível grátis no NIM seria upgrade significativo para raciocínio clínico complexo.
5. **Guardrails avançados**: NemoGuard (jailbreak-detect, topic-control, content-safety) disponíveis no NIM são especializados e superiores ao llama-guard-3-8b genérico.
6. **Zero referências a NVIDIA**: Nenhum modelo NVIDIA (Nemotron, Parakeet, Canary, Riva) está integrado ou especulado em `/specs/` ou em código.

---

## 2. NVIDIA NIM Free Tier — O que está disponível

**Endpoint**: `https://integrate.api.nvidia.com/v1` (OpenAI-compatible, `/v1` obrigatório)
**Auth**: Bearer `$NVIDIA_API_KEY` (gerado em build.nvidia.com, grátis via NVIDIA Developer Program — sem cartão)
**Limite**: ~40 RPM (model/traffic-dependent, não publicado oficialmente) — sua dashboard mostra o teto por modelo
**SDK**: OpenAI SDK 1.x (mesmo padrão já usado em `providers/zai.ts`)
**Custo**: $0 para prototipação/dev/test (não é credit-based, é rate-limit)

### Modelos relevantes para FisioFlow (free tier hosted)

| Categoria | Model ID NIM | Vantagem vs. atual | FisioFlow use case |
|-----------|-------------|-------------------|-------------------|
| **LLM reasoning** | `nvidia/llama-3.3-nemotron-super-49b-v1.5` | Nemotron-tuned, melhor em raciocínio que Llama-3.3-70b base | `clinical_reasoning`, `soap_evolution_generation`, `discharge_summary` |
| **LLM ultra** | `nvidia/llama-3.1-nemotron-ultra-253b-v1` | 253B params, qualidade próxima a GPT-4o garantida pela NVIDIA | `patient_longitudinal_summary`, `clinical_summary` (batch/async) |
| **LLM nano** | `nvidia/nvidia-nemotron-nano-9b-v2` | 9B otimizado, baixa latência | `grammar_correction`, `json_extraction`, `reengagement_message` |
| **Guardrails safety** | `nvidia/llama-3.1-nemotron-safety-guard-8b-v3` | Safety-tuned pela NVIDIA, superior ao llama-guard-3 | `patientAssistantGuardrails.ts` |
| **Guardrails jailbreak** | `nvidia/nemoguard-jailbreak-detect` | Detecção de jailbreak dedicada | Rota paciente (input não-confiável) |
| **Guardrails topic** | `nvidia/llama-3.1-nemoguard-8b-topic-control` | Mantém tópico clínico | Chat do paciente, evita off-topic |
| **PII extraction** | `nvidia/gliner-pii` | Extração de entidades PII contextual | `piiRedaction.ts` (LGPD) — complementa regex existente |
| **Translation** | `nvidia/riva-translate-4b-instruct-v1_1` | Riva translation, multi-idioma | Substituir `m2m100-1.2b` para qualidade superior |
| **LLM open-source** | `openai/gpt-oss-20b`, `openai/gpt-oss-120b` | Modelos open-source OpenAI no NIM | Diversificação, comparação de qualidade |
| **DeepSeek** | `deepseek-ai/deepseek-v4-pro` | 1M contexto, topo em benchmarks | Análise de prontuário longo |
| **GLM 5.2** | `z-ai/glm-5.2` | Disponível no NIM também | Comparação com `@cf/zai-org/glm-5.2` (mesmo perímetro) |

> ⚠️ **Nota importante**: ASR/TTS models (Parakeet, Canary, Riva ASR, Chatterbox TTS) são NeMo pretrained models disponíveis via NGC/HuggingFace para **self-hosted deployment** — **não** expostos como hosted endpoints no NIM catalog atual. Para ASR/TTS hosted, o caminho é: (a) Workers AI (atual), (b) Deepgram API direto (pago), ou (c) self-host NeMo em GPU própria.

---

## 3. Oportunidades de Integração (priorizadas)

### P1 — NIM LLM Provider (fallback/diversificação)
**Adicionar `nvidia` como provider em `callAI.ts` + `modelRegistry.ts`**

O `callAI.ts` já tem um `executeProviderOnce()` com switch case por provider. Acrescentar `case "nvidia"` é uma extensão natural — NIM é OpenAI-compatible, então reusa o mesmo padrão de `zai.ts`.

**Scope**:
- Novo arquivo `apps/api/src/lib/ai/providers/nvidia.ts` (clone de `zai.ts` com `baseURL = https://integrate.api.nvidia.com/v1`)
- Registrar 3-4 modelos NIM em `MODEL_DEFINITIONS` (modelRegistry.ts): Nemotron-Super-49B, Nemotron-Nano-9B, DeepSeek-V4-Pro, Nemotron-Ultra-253B
- Adicionar `"nvidia"` em `AIProvider` type
- Adicionar modelos NIM em `MODEL_REGISTRY` (modelPolicy.ts) como classe `medium`
- Adicionar NIM no fallback chain (`getFallbackChain`) para diversificar quando Workers AI/Z.AI falharem
- Secret `NVIDIA_API_KEY` em wrangler.toml

**Benefício**: Diversificação de providers (3 fontes independentes), acesso a modelos 253B que Workers AI não oferece, Nemotron-tuned para raciocínio.
**Risco**: 40 RPM limit — só serve como fallback ou para tasks de baixo volume (batch/async workflows). Não para chat real-time de alta concorrência.

### P2 — NemoGuard como guardrails avançados
**Substituir/complementar `@cf/meta/llama-guard-3-8b` por NemoGuard no fluxo do paciente**

O `patientAssistantGuardrails.ts` e a rota `/api/patient/assistant` já usam guardrails. NemoGuard oferece 3 modelos especializados (content-safety, jailbreak-detect, topic-control) que são superiores ao llama-guard genérico.

**Scope**:
- Nova função `nvidiaGuardrails()` em `providers/nvidia.ts` — chama NemoGuard com retry exponencial
- Pipeline em cascata: `topic-control` → `content-safety` → `jailbreak-detect` (3 chamadas, ~3 RPM de overhead por mensagem)
- Guardar no AI Gateway para cache de resultados repetidos
- Feature flag `NVIDIA_GUARDRAILS_ENABLED` para rollout gradual
- Integration com `AI_TASK_PRIVACY_LEVELS["patient_message"]`

**Benefício**: Guardrails mais robustos para input de paciente (superfície não-confiável), detecção de jailbreak dedicada.
**Risco**: 3x chamadas API por mensagem — com 40 RPM, suporta ~13 mensagens/min (suficiente para volume atual de app-paciente).

### P3 — GLiNER PII para LGPD redaction
**Complementar `piiRedaction.ts` com `nvidia/gliner-pii`**

O `piiRedaction.ts` atual usa regex/NER. GLiNER PII do NIM extrai entidades (nomes, CPF, endereços, datas) de forma contextual — superior a regex para PT-BR.

**Scope**:
- Nova função `nvidiaPIIExtract()` em `providers/nvidia.ts`
- Integrar em `sanitizeClinicalPrompt.ts` como camada adicional (regex → GLiNER → confirmação)
- Usar para `full_internal_only` tasks (clinical_reasoning que envia dados ao NIM para raciocínio)

**Benefício**: Redação LGPD mais precisa, menos falsos positivos que regex.
**Risco**: +1 chamada API por sanitized prompt (overhead de latência).

### P4 — ASR: NeMo Parakeet/Canary (self-hosted, futuro)
**Avaliar Parakeet-TDT-0.6B V2 como modelo self-hosted para ASR clínico PT-BR**

Parakeet é #1 no HuggingFace OpenASR Leaderboard. Não está no NIM hosted catalog — teria que ser self-hosted via NeMo container em GPU (DGX/cloud). **Isso não é free tier** — requer GPU infra.

**Scope** (planejamento, não execução imediata):
- Avaliar se o F1 gate (WER ≤ 10%) do `ditado-evolucao` spec falha com Whisper/Nova-3
- Se falhar, avaliar: (a) Deepgram Nova-3 via API direta (pago, ~$0.0043/min), (b) self-host Parakeet em GPU cloud
- NeMo container: `pip install nemo_toolkit['asr']` + download de `nvidia/parakeet-tdt-0.6b-v2-asr` do HuggingFace
- Deploy em Cloudflare Containers (GA 2026) ou GPU cloud spot

**Benefício**: ASR estado-da-arte, controlável, sem rate limit de 40 RPM.
**Risco**: Custo de GPU ($0.50-1.50/h spot), complexidade operacional, latência de startup de container.

### P5 — TTS: Chatterbox/Magpie (self-hosted, futuro)
**Avaliar Chatterbox Multilingual TTS como alternativa ao Aura-2-es**

Chatterbox TTS suporta 23 idiomas incluindo PT-BR nativo (vs. Aura-2-es que é espanhol «similar»). Também não está no NIM hosted — self-host only.

**Scope** (planejamento):
- Se TTS PT-BR for crítica (app paciente lendo exercícios), avaliar self-host Chatterbox
- Alternativa hosted: Riva TTS (precisa confirmar disponibilidade no NIM catalog)

### P6 — DeepSeek-V4-Pro para análise longitudinal
**Usar `deepseek-ai/deepseek-v4-pro` (1M contexto) no `patient-digital-twin` workflow**

O workflow `patient-digital-twin.ts` consolida histórico longitudinal do paciente. DeepSeek-V4-Pro com 1M contexto pode processar prontuário completo numa chamada.

**Scope**:
- Adicionar `deepseek-v4-pro` em MODEL_DEFINITIONS
- Usar no `patient-digital-twin.ts` para análise longitudinal batch (assíncrono, não-real-time)
- Rate limit OK pois é batch diário/semanal, não request-per-interaction

---

## 4. Arquitetura de Integração Proposta

```
┌──────────────────────────────────────────────────────────┐
│                   callAI() / callAITranscribe()           │
│  (apps/api/src/lib/ai/callAI.ts — entry point existente)  │
└────────────────────────┬─────────────────────────────────┘
                         │
                    fallback chain
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   Provider: Z.AI    Provider: NIM    Provider: Workers AI
   (zai.ts)       (nvidia.ts — NOVO)  (runAi binding)
   GLM-4.7-flash  Nemotron-Super-49B  Llama-3.3-70b
   GLM-5.1        Nemotron-Nano-9B    Llama-3.1-8b-fast
   GLM-5V         DeepSeek-V4-Pro     Llama-4-Scout
   GLM-ASR        NemoGuard (guardrails)
                        │
                        ▼
              NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"
              Auth: Bearer env.NVIDIA_API_KEY
              SDK: OpenAI SDK (já instalado)
              Limit: ~40 RPM (fallback only, não primário)
```

---

## 5. Matriz de Tasks e Dependencies

| Task | Descrição | Priority | Estimativa | Dependências |
|------|-----------|----------|-----------|-------------|
| T01 | Criar `providers/nvidia.ts` (clone de `zai.ts`, ajustar baseURL + API key) | P1 | 2h | None |
| T02 | Registrar 3 modelos NIM em `modelRegistry.ts` (Nemotron-Super-49B, Nano-9B, DeepSeek-V4-Pro) | P1 | 1h | T01 |
| T03 | Adicionar `case "nvidia"` em `executeProviderOnce()` (callAI.ts) | P1 | 30min | T01 |
| T04 | Adicionar NIM no `getFallbackChain()` (modelRegistry.ts) | P1 | 30min | T02 |
| T05 | Atualizar `modelPolicy.ts` (adicionar NIM models em `MODEL_REGISTRY` como `medium`/`cheap`) | P1 | 30min | T02 |
| T06 | Adicionar `NVIDIA_API_KEY` em `wrangler.toml` (env + secrets) | P1 | 15min | None |
| T07 | Testes: `ai-models.test.ts` regression (garantir que NIM não quebra policy enforcement) | P1 | 1h | T05 |
| T08 | NemoGuard em `patientAssistantGuardrails.ts` (cascade: topic → safety → jailbreak) | P2 | 4h | T01 |
| T09 | Feature flag `NVIDIA_GUARDRAILS_ENABLED` + rollout gradual | P2 | 1h | T08 |
| T10 | GLiNER PII em `sanitizeClinicalPrompt.ts` (camada adicional de redação) | P3 | 3h | T01 |
| T11 | DeepSeek-V4-Pro em `patient-digital-twin.ts` (batch longitudinal) | P6 | 2h | T02, T03 |
| T12 | Doc: Atualizar `CLAUDE.md` com NIM provider + modelo IDs | P1 | 30min | T01-T05 |
| T13 | Avaliar F1 accuracy gate com Whisper/Nova-3 antes de avançar Parakeet | P4 | 4h | External |
| T14 | PoC: NeMo Parakeet self-hosted em Cloudflare Containers (se F1 falhar) | P4 | 3 dias | T13, GPU infra |

---

## 6. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| 40 RPM rate limit em produção | API 429s | NIM só como fallback (não primário); Workers AI + Z.AI permanecem primários |
| Latência p75 aumentada (chamada externa vs. edge binding) | UX degradado | NIM para batch/async apenas (workflows); primário continua edge |
| BAA/DPA LGPD: dados clínicos saem perímetro Cloudflare | Compliance | `modelPolicy.ts` já tem `full_internal_only` level — NIM bloqueado para tasks com PHI; só conteúdo público (evidência, wiki, protocolos) |
| Modelo indisponível/renomeado no NIM | Runtime error | `getFallbackChain()` já encadeia; NIM é penúltimo resort |
| NVIDIA_API_KEY vazada | Security | `wrangler secret put`, nunca commitado; same pattern de `ZAI_API_KEY` |
| Dependência de 3rd party (NVIDIA indisponibilidade) | Provider down | NIM é último no fallback chain; Workers AI binding é #1 |

---

## 7. Pré-requisitos para Execução

1. **Confirmar NVIDIA_API_KEY**: gerar a key em build.nvidia.com (NVIDIA Developer Program — grátis, sem cartão)
2. **Confirmar modelo IDs atuais**: o catalog do NIM muda — validar slugs em build.nvidia.com antes de commitar
3. **Decidir on-prem vs hosted**: NIM hosted (free, 40 RPM) vs. self-host NeMo (GPU cost) — o plano foca em hosted por ser free tier
4. **Confirmar BAA scope**: verificar se NVIDIA tem BAA/DPA para PHI brasileiro (LGPD Art. 41) antes de enviar qualquer dado clínico. Se não, NIM fica restrito a conteúdo não-PHI (evidência, wiki, traduções)

---

## 8. O que NÃO está no escopo

- **NeMo Framework self-hosted**: NeMo como framework de treino/fine-tuning (NGC, Triton) é uma direção separada — requer GPU infra e decisão de build-vs-buy. O plano foca em NIM hosted free-tier.
- **Substituir Workers AI**: Workers AI permanece primário (edge, 10K neurons/day free, baixa latência). NIM é complementar/fallback.
- **ASR/TTS hosted via NIM**: Parakeet/Canary/Chatterbox não estão disponíveis como hosted endpoints no NIM catalog. Self-host é GPU-cost e fica como track separado (P4/P5 planejamento only).

---

## 9. Perguntas para decidir antes de executar

1. **`NVIDIA_API_KEY`**: você já tem gerada em build.nvidia.com? Ou quer o passo-a-passo?
2. **Prioridade de execução**: prefere começar por P1 (NIM LLM provider/fallback) mais estrutural, ou P2 (NemoGuard guardrails) com maior impacto direto em segurança do app paciente?
3. **DeepSeek-V4-Pro (P6)**: incluir no primeiro PR ou deixar para fase 2?
4. **Parakeet/Canary (ASR)**: avançar o PoC de self-host agora, ou esperar o F1 accuracy gate do `ditado-evolucao` spec primeiro?
5. **LGPD/BAA**: você já verificou se NVIDIA tem base legal para receber PHI? Se não, NIM ficar restrito a conteúdo não-PHI (wiki, evidência, traduções)?
