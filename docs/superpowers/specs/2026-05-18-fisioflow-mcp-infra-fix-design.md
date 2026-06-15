# Design Spec: FisioFlow Infrastructure Overhaul & Custom MCP Server

**Date:** 2026-05-18  
**Status:** Draft  
**Author:** Gemini CLI

---

## 1. Problem Statement

The FisioFlow project currently faces two primary infrastructure challenges:

1. **Cloudflare CLI Inconsistency:** Errors like `code: 10007` (Worker not found) occur during `wrangler tail` due to environment naming conflicts in the monorepo.
2. **Limited IA Context:** The Gemini CLI agent lacks direct, tool-based access to the production environment's logs and database, hindering autonomous debugging and clinical analysis.

## 2. Goals

- **Automate Authentication:** Use Cloudflare Zero Trust (`cloudflared`) to eliminate interactive login prompts.
- **Fix CLI Workflow:** Standardize Worker names and commands across production/staging.
- **Implement Custom MCP Server:** Build a "Super MCP" using Cloudflare Agents SDK to expose logs and clinical data to the agent.
- **Enhanced Observability:** Enable real-time log streaming and health checks through the agent.

## 3. Architecture

### 3.1 Components

- **Client:** Gemini CLI / Smithery.
- **Protocol:** Model Context Protocol (MCP) over SSE (Server-Sent Events).
- **Server:** New Cloudflare Worker in `apps/mcp-server`.
- **Backend:** Cloudflare API (Logs), Neon PostgreSQL (Clinical Data), D1 (Cache).

### 3.2 Monorepo Structure

```text
apps/
  api/          # Main production API
  mcp-server/   # NEW: Cloudflare Agents SDK based MCP server
  web/          # Frontend
scripts/
  cf-access.sh  # Zero Trust authentication wrapper
```

## 4. Implementation Details

### 4.1 Infrastructure Fixes

- **Wrangler Config:** Explicitly define `name` in `[env.production]` blocks to avoid automatic suffixing (`-production`).
- **Wrapper Script:** Create `scripts/cf-access.sh` to handle `cloudflared access` tokens and proxy commands to the correct worker.

### 4.2 FisioFlow MCP Server

The server will use the `@cloudflare/agents` SDK and expose the following tools:

| Tool Name       | Parameters     | Description                                                             |
| --------------- | -------------- | ----------------------------------------------------------------------- |
| `get_logs`      | `env`, `limit` | Streams or fetches recent logs from Cloudflare Workers Tail API.        |
| `query_db`      | `sql_query`    | Read-only access to Neon DB via Hyperdrive for clinical data retrieval. |
| `check_health`  | `service`      | Checks status of Workers, KV, D1, and R2 buckets.                       |
| `deploy_status` | `app`          | Returns the latest deployment hash and timestamp.                       |

### 4.3 Security

- **Authentication:** All requests to the MCP server must be protected by Cloudflare Access.
- **Permissions:** The `CLOUDFLARE_API_TOKEN` used by the MCP server will have scoped access to logs and analytics only.
- **Data Redaction:** PII (Patient Identifiable Information) must be masked in log tools.

## 5. Success Criteria

- [ ] `pnpm tail:prod` works without 10007 errors.
- [ ] Gemini CLI can successfully call `get_logs` through the MCP protocol.
- [ ] No interactive login is required after initial `cloudflared` setup.
- [ ] Database queries return results within < 500ms via Hyperdrive.

## 6. Milestones

1. **Phase 1:** Correct `wrangler.toml` and CLI scripts.
2. **Phase 2:** Scaffold `apps/mcp-server` with Agents SDK.
3. **Phase 3:** Deploy MCP server and configure Cloudflare Access.
4. **Phase 4:** Connect Gemini CLI to the new MCP endpoint.
