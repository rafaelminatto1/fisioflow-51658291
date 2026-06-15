# FisioFlow Evidence Gateway (PubMed / Evidência Científica) — Design

**Data:** 2026-06-15
**Autor:** Rafael Minatto (+ assistente)
**Status:** Aprovado para planejamento

## Problema / Objetivo

Integrar literatura científica (PubMed e fontes correlatas) ao FisioFlow para que
fisioterapeutas tenham **evidência clínica acionável** dentro do produto: buscar,
ranquear, resumir, citar e vincular artigos a exercícios, protocolos, wiki, pacientes
e avaliações. O acesso ao NCBI deve ser **centralizado no backend** (Cloudflare Workers
pago), nunca no frontend, respeitando rate limits e termos de uso do NCBI.

### Não-objetivos (YAGNI)
- Não construir um repositório completo de papers concorrente ao PubMed.
- Não expor conteúdo pago/licenciado a clientes/pacientes (Browser Rendering só uso pessoal).
- Não substituir a busca semântica clínica existente (`ai-clinical-search.ts`) — complementar.

## Contexto do repositório (existente, reaproveitar)
- Worker Hono em `apps/api/` (`compatibility_date = 2026-05-14`).
- Busca semântica já com **Workers AI + pgvector** (`apps/api/src/routes/ai-clinical-search.ts`).
- Knowledge base / wiki: `knowledge.ts`, `wiki.ts`; painel de evidência biomecânica.
- Bindings disponíveis: `HYPERDRIVE`, `MEDIA_BUCKET` (R2), `FISIOFLOW_CONFIG` (KV),
  `DB` + `EDGE_CACHE` (D1, com tabela `rate_limits`), `ANALYTICS` (Analytics Engine),
  AI Search, Workflows, AI Gateway, registry `apps/api/src/lib/workersAi.ts`.
- Próxima migração: **0115** (última = 0114). Sempre criar `.down.sql`.

## Arquitetura

Frontend → `/api/evidence/*` (Worker) → camada `lib/evidence/` → fontes externas.
O frontend **nunca** chama NCBI direto. O Worker centraliza chave, rate limit, cache,
resumo IA e persistência.

```
apps/api/src/
  routes/evidence.ts            # endpoints Hono, montado em /api/evidence
  lib/evidence/
    types.ts                    # EvidenceArticle canônico + DTOs Zod
    ncbiClient.ts               # E-utils (esearch/esummary/efetch/elink) + token-bucket 10 req/s
    sources/pubmed.ts           # adapter PubMed -> EvidenceArticle
    sources/europepmc.ts        # adapter Europe PMC (OA full-text)
    sources/openalex.ts         # (fase posterior) citações/descoberta
    cache.ts                    # KV query-cache + store Neon evidence_articles
    rank.ts                     # ranking por tipo de estudo, recência, match MeSH/PICO
    summarize.ts                # resumo PT-BR via AI Gateway (PICO/takeaways/nível)
    embed.ts                    # embeddings -> pgvector (dedup + RAG)
```

### Tipo canônico
`EvidenceArticle`: `pmid`, `doi`, `source` (`pubmed|europepmc|openalex`), `title`,
`abstract`, `authors[]`, `journal`, `pubDate`, `mesh[]`, `pmcId`, `oaStatus`,
`studyType`, `url`, `raw` (payload bruto).

## Fontes externas (camada de adapters)
- **PubMed E-utilities** — fonte clínica primária. `esearch` (busca + History WebEnv/query_key),
  `esummary` (metadados rápidos), `efetch` (abstract/MeSH XML), `elink` (relacionados).
  Params obrigatórios: `tool=fisioflow`, `email=<registrado>`, `api_key` (server-side).
- **Europe PMC** — full-text open-access e complemento de metadados.
- **OpenAlex / Semantic Scholar** — grafo de citações e descoberta ampla (fase posterior;
  PubMed continua fonte clínica primária).

## Endpoints (`/api/evidence`)
- `GET /search` — `q`, PICO (`p`,`i`,`c`,`o`), filtros (`from`,`to`,`type`,`sort`); ranqueado + cacheado.
- `GET /article/:pmid` — metadados completos (abstract, autores, MeSH, DOI, link PMC).
- `GET /article/:pmid/fulltext` — OA via Europe PMC/PMC; senão link + (flag admin) snapshot.
- `GET /related/:pmid` — relacionados via `elink`.
- `POST /summarize` — resumo IA (PICO, takeaways, nível de evidência) em PT-BR.
- `POST /save` — vincula artigo a `exercise|protocol|wiki|patient|assessment`.
- `GET /library` — evidência salva por organização.

Todos protegidos por `requireAuth` (JWT Neon Auth via JWKS).

## Modelo de dados (migração 0115 + `.down.sql`)
- **`evidence_articles`** (cache global compartilhado): `pmid PK`, `doi`, `source`,
  `title`, `abstract`, `authors jsonb`, `journal`, `pub_date`, `mesh jsonb`, `pmc_id`,
  `oa_status`, `study_type`, `raw jsonb`, `embedding vector`, `created_at`, `updated_at`.
- **`evidence_links`**: `id`, `org_id`, `article_pmid`, `target_type`
  (`exercise|protocol|wiki|patient|assessment`), `target_id`, `evidence_level`, `note`,
  `created_by`, `created_at`. **RLS** via `current_setting('app.org_id', true)`.
- **`evidence_searches`** (opcional, cache/audit): `query_hash`, `params jsonb`,
  `results jsonb`, `webenv`, `expires_at`.
- R2 `MEDIA_BUCKET`: PDFs/snapshots em `evidence/<pmid>.pdf` / `evidence/<pmid>.md`.

## Rate limiting / conformidade NCBI
- Chave **única server-side**; token-bucket global respeitando **10 req/s** (com key)
  usando D1 `EDGE_CACHE.rate_limits` (upsert atômico por janela) ou Durable Object.
- `tool` + `email` registrados em toda chamada.
- Backoff exponencial em HTTP 429; degradação graciosa quando uma fonte falha.

## IA
- Resumo/extração via **AI Gateway** (cache + observabilidade), modelos pelo registry
  `workersAi.ts` (sem hardcode de strings `@cf/...`). Saída em **PT-BR**.
- Embeddings via Workers AI → pgvector (dedup semântico + alimentar RAG existente).

## Full-text (robusto, em camadas)
1. **Tier 1** — abstract + metadados (sempre, via E-utils).
2. **Tier 2** — full-text open-access (Europe PMC / PMC) para todos os usuários.
3. **Tier 3** — **Browser Rendering** snapshot (markdown/PDF/screenshot — formatos novos
   do changelog 2026-06-11) usando acesso institucional, **somente atrás de flag
   admin/pessoal**, nunca exposto a paciente/cliente, e **logado** em Analytics Engine.

## Surfaces no produto (faseadas — todas aprovadas)
- **2a — Assistente de Evidência**: painel/tela com busca PICO, ranking, resumo, salvar (menor acoplamento).
- **2b — Aba Evidência em exercícios/protocolos**: auto-referências via `evidence_links`.
- **2c — Import p/ Wiki/Knowledge**: artigo → `knowledge_articles` + embeddings p/ RAG.
- **2d — Sugestões contextuais**: evidência sugerida no contexto de paciente/avaliação.

## MCP (fase 3)
- **Local — Codex**: adicionar `pubmed-search-mcp` ao `mcp.json` (formato Codex) com
  `NCBI_API_KEY` / `NCBI_EMAIL` via **variável de ambiente** (nunca hardcode da chave).
- **Local — Claude Code**: mesmo servidor configurado em `.mcp.json` na raiz do projeto
  (escopo de projeto, versionável sem segredos — usa `${NCBI_API_KEY}`/`${NCBI_EMAIL}`)
  e/ou via `claude mcp add pubmed-search ...` (escopo user em `~/.claude.json`).
  Segredos ficam em variáveis de ambiente do shell, fora do git.
- **Remoto (produto)**: expor o Evidence Gateway como **MCP server em Workers**
  (Agents SDK) com tools `search_evidence`, `get_article`, `summarize`, `save_to_wiki` —
  mesmo backend, com auth, usável por Claude/Codex. Estado final.

## Erros / testes / observabilidade
- Validação Zod em entrada/saída; stale-while-revalidate no cache.
- Backoff 429; partial-source failure → resultado parcial + flag.
- Testes Vitest: adapters (mock XML/JSON E-utils), ranking, cache, `/search` integração
  com `fetch` mockado. Config Vitest workers já existe.
- Logs estruturados em Analytics Engine (rota, fonte, latência, cache hit, orgId).

## Segurança (ação imediata)
- Segredos via `wrangler secret put`: `NCBI_API_KEY`, `NCBI_EMAIL`, (Browser Rendering creds).
- **Corrigir `mcp.json`**: senha Neon e Exa API key estão em texto puro → mover p/ env vars.
- **Rotacionar a chave PubMed** que foi exposta no chat.

## Fases de entrega
- **Fase 0** — Segurança: rotacionar key, env vars no mcp.json, secrets no Worker.
- **Fase 1** — Evidence Gateway: `lib/evidence/*` + `routes/evidence.ts` + migração 0115 + testes.
- **Fase 2** — Surfaces (2a → 2b → 2c → 2d).
- **Fase 3** — MCP local (Codex `mcp.json` + Claude Code `.mcp.json`) + MCP remoto em Workers.

## Critérios de sucesso
- Busca PubMed funcional via `/api/evidence/search` com cache e rate limit, retorno ranqueado < 2s (cache hit) / < 5s (miss).
- Vincular artigo a exercício/wiki/paciente e recuperar em `/library`.
- Resumo PT-BR com nível de evidência gerado via AI Gateway.
- Zero chamadas NCBI a partir do frontend; zero segredos em texto puro versionados.
