# FisioFlow MCP Server — Design

**Data:** 2026-06-16
**Status:** Aprovado para planejamento
**Relacionado:** [[2026-06-15-evidence-gateway-pubmed-design]], plano antigravity Fase 3.1

## Objetivo
Expor capacidades do FisioFlow como um **MCP server remoto em Cloudflare Workers** para que
agentes de IA (Claude, Codex, etc.) consultem a plataforma com segurança. v1 com 4 tools que
reaproveitam a API Hono existente (`fisioflow-api`), preservando auth e RLS.

## Não-objetivos (YAGNI)
- OAuth provider completo (v1 usa Bearer JWT passthrough; OAuth = follow-on).
- Reacessar o banco direto (tools chamam a API HTTP existente — RLS/auth centralizados).
- Tools de escrita além de `schedule_session` (mantém superfície pequena).

## Estado atual
`apps/mcp-server/` existe como scaffold abandonado (só `node_modules`/`.wrangler`, **sem código,
não versionado**). Construção é net-new. `agents ^0.15.0` já está no monorepo.

## Arquitetura
- **Host:** Worker `fisioflow-mcp` usando Agents SDK `McpAgent` + `@modelcontextprotocol/sdk`
  `McpServer`. Endpoint `/sse` (e `/mcp`) montado via `McpAgent.serveSSE`/`serve`.
- **Auth (Bearer JWT passthrough):** o cliente MCP envia `Authorization: Bearer <Neon Auth JWT>`.
  O Worker extrai o token e o disponibiliza aos tools; cada tool o repassa à API Hono, que valida
  (JWKS) e aplica RLS por org. Sem token → tools retornam erro de não-autenticado.
- **Tools como cliente HTTP fino:** cada tool faz `fetch` a `${FISIOFLOW_API_URL}/api/...` com o
  Bearer token. Lógica de negócio/segurança permanece na API.

## Tools v1
| Tool | Endpoint da API | Args |
|---|---|---|
| `search_evidence` | `GET /api/evidence/search` | `q`, `limit?` |
| `search_exercises` | `GET /api/exercises?q=` | `q`, `limit?` |
| `get_patient_history` | `GET /api/patients/:id` + `GET /api/sessions?patientId=` | `patientId` |
| `schedule_session` | `POST /api/appointments` | `patientId`, `startsAt`, `durationMin?`, `notes?` |

## Estrutura de arquivos
```
apps/mcp-server/
  package.json            # @fisioflow/mcp-server, deps: agents, @modelcontextprotocol/sdk, zod
  wrangler.jsonc          # DO binding p/ McpAgent, nodejs_compat, var FISIOFLOW_API_URL
  tsconfig.json
  src/
    apiClient.ts          # fetchApi(apiUrl, token, path, init) — wrapper (pura, testável)
    tools/searchEvidence.ts
    tools/searchExercises.ts
    tools/getPatientHistory.ts
    tools/scheduleSession.ts
    server.ts             # class FisioFlowMCP extends McpAgent<Env> — registra os tools
    index.ts              # fetch handler: extrai Bearer, monta McpAgent.serveSSE/serve
  src/__tests__/*.test.ts # unit das tools (fetch mockado) + apiClient
```

## Erros / testes / segurança
- Tools puras (`apiUrl`, `token`, `args`) → unit-testáveis com `fetch` mockado; validam args via Zod.
- `fetchApi` trata !ok (propaga status/erro como conteúdo MCP), sem vazar segredos.
- Token nunca logado. CORS/origin não aplicável (MCP server-to-server).
- Deploy próprio (`wrangler deploy`); secret/var `FISIOFLOW_API_URL`.

## Critérios de sucesso
- `wrangler dev`/deploy sobe; cliente MCP lista os 4 tools.
- `search_evidence` retorna artigos reais (via API em prod) com token válido; erro claro sem token.
- Unit tests verdes para as 4 tools + apiClient; typecheck limpo.

## Follow-ons
OAuth provider; tools de exercise-import/curadoria; resources (`fisioflow://patients/{id}/history`);
registrar no `mcp.json`/`.mcp.json`; expor evidence summarize/save.
