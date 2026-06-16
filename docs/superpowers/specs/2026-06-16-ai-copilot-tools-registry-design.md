# AI Copilot — Tools Registry + /copilot/chat — Design

**Data:** 2026-06-16
**Status:** Aprovado para planejamento
**Relacionado:** [[2026-06-16-fisioflow-mcp-server-design]], plano antigravity Fase 1.2

## Objetivo
Um copiloto clínico com **function-calling**: registro central de tools (Zod) + endpoint
`POST /api/copilot/chat` que delega a um LLM (via AI Gateway) com as tools mapeadas, executa
as chamadas de ferramenta e responde em PT-BR, respeitando auth/RLS da organização.

## Não-objetivos (YAGNI)
- UI de chat (frontend) — fica para fatia seguinte.
- Tools de escrita além de `schedule_session`.
- Streaming SSE da resposta (v1 responde síncrono; streaming = follow-on).

## Arquitetura
- **Registry** `apps/api/src/agents/tools.ts`: `CopilotTool = { name, description, parameters: ZodObject, execute(ctx, args) }` onde `ctx = { env, user, token, baseUrl }`.
- **Orquestrador** `apps/api/src/lib/copilot/runCopilot.ts`: loop de tool-calling com `callModel`
  **injetado** (testável). Itera até `maxTurns` (ex.: 4): pede ao modelo; se houver `toolCalls`,
  valida args (Zod), executa, anexa resultados como mensagens `tool`, repete; senão retorna `answer`.
- **Adapter** `apps/api/src/lib/copilot/workersAiAdapter.ts`: mapeia `CopilotTool[]`→formato Workers
  AI `tools` (JSON schema via `zod-to-json-schema` ou conversão manual), chama
  `runAi(env, WORKERS_AI_MODELS.llama_3_3_70b, { messages, tools })`, parseia `tool_calls`.
- **Rota** `apps/api/src/routes/copilot.ts`: `POST /api/copilot/chat` (requireAuth + rateLimit) →
  monta `ctx` (org/usuário/token/baseUrl do request) → `runCopilot` → `{ answer, toolCalls }`.

## Tools v1
| Tool | Execução | Args |
|---|---|---|
| `search_evidence` | in-process: reusa `runSearch` de `routes/evidence.ts` | `q`, `limit?` |
| `search_exercises` | in-process: `getRawSql` SELECT em `exercises` (org-scoped, full-text) | `q`, `limit?` |
| `get_patient_history` | in-process: SELECT paciente + sessões (org-scoped) | `patientId` |
| `schedule_session` | **self-fetch** `POST {baseUrl}/api/appointments` com Bearer do usuário (reusa conflito/capacidade) | `patientId`, `date`, `startTime`, `durationMinutes?`, `notes?` |

## Segurança
- Toda execução respeita RLS pela org do usuário autenticado (reusa `getRawSql`/rotas).
- `schedule_session` (única escrita) passa pela validação real do endpoint (conflito/capacidade).
- IA sempre via **AI Gateway** (`runAi`). Saída PT-BR. `maxTurns` limita loops/custo.
- Sem `tool_calls` reconhecidos → retorna a resposta textual do modelo.

## Testes
- `runCopilot`: fake `callModel` (sequência: pede tool → depois responde) + fake tools → valida
  loop, execução, anexo de resultado, parada por `maxTurns`.
- Executores read: `getRawSql` mockado / `runSearch` mockado.
- Adapter: mapeamento Zod→tools JSON e parsing de `tool_calls` (resposta Workers AI mockada).

## Critérios de sucesso
- `POST /api/copilot/chat` com pergunta clínica retorna resposta PT-BR; quando pede evidência,
  o modelo chama `search_evidence` e a resposta cita resultados.
- Unit tests verdes; tsc + oxlint limpos.

## Follow-ons
UI de chat; streaming; tools de escrita (prescrição draft); memória de conversa; Llama Guard
na saída; expor as mesmas tools no MCP server (PR #137) reusando o registry.
