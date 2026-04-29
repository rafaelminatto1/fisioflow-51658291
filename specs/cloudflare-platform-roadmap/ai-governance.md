# AI Governance

**Created**: 2026-04-28  
**Scope**: Workers AI, AI Gateway, Vectorize, AI Search/AutoRAG experiments, and external model providers.

## Current Resources

| Resource | Environment | Notes |
|----------|-------------|-------|
| `FISIOFLOW_AI_GATEWAY_URL` | Production | Configured in Wrangler vars |
| `FISIOFLOW_AI_GATEWAY_URL` staging variant | Staging | Configured in Wrangler vars |
| `fisioflow-clinical` | Production Vectorize | 768 dimensions, cosine |
| `fisioflow-clinical-staging` | Staging Vectorize | Created 2026-04-28 |
| `ai-search-fisioflow-rag` | Account Vectorize/AI Search managed | 1024 dimensions; evaluate before production use |

## Required Controls

- Route AI calls through configured gateway/registry paths where provider supports it.
- Keep staging retrieval indexes separate from production.
- Apply per-org rate limits and daily caps for premium/realtime features.
- Record route, model/provider, status, latency, and cost proxy when available.
- Never log full prompts, full clinical notes, CPF/CNPJ, phone, email, or tokens.
- Use controlled fallbacks and user-safe error messages for provider failures.

## Evaluation Slices

| Slice | Dataset | Success Measure |
|-------|---------|-----------------|
| Exercise search | Curated exercises | Relevant result in top 5 |
| Protocol search | Clinical protocols | Correct protocol family in top 5 |
| Wiki search | Internal wiki pages | Source page appears in top 5 |
| SOAP assistance | Redacted clinical samples | No invented diagnosis; includes uncertainty |

## Rollout Gates

1. Staging index isolation verified.
2. Gateway metrics visible for representative requests.
3. Per-org usage/rate limits confirmed.
4. Redacted evaluation set passes minimum quality.
5. Production rollout has fallback behavior and monitoring.

