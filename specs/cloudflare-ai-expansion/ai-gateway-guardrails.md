# AI Gateway — Guardrails + Cache (T033)

**Status**: pendente de acesso. Os tokens disponíveis no ambiente do agente (OAuth do wrangler e o token de deploy `CLOUDFLARE_API_TOKEN`) **não têm escopo de AI Gateway** — a API retorna `403 / code 10000`. Precisa ser feito no dashboard ou com um token que tenha `AI Gateway:Edit`.

Gateway: **`fisioflow-gateway`** · Account: `32156f9a72a32d1ece28ab74bcd398fb`

## Opção A — Dashboard

1. Dashboard → **AI** → **AI Gateway** → `fisioflow-gateway`.
2. Aba **Guardrails** → ativar:
   - **Prompts** (entrada) e **Responses** (saída): `Block`.
   - Categorias de hazard relevantes para saúde: manter as de conteúdo perigoso/autoagressão ligadas. (Guardrails usa Llama Guard via Workers AI — há custo de inferência por chamada.)
3. Aba **Settings**:
   - **Caching**: ativar, TTL sugerido **3600s** (FAQ do paciente repetida = resposta em cache, custo zero).
   - **Rate limiting**: ex. **30 req / 60s** por gateway (ajuste conforme o uso real do app do paciente).
   - **Logs**: manter ligado para auditoria.

> Se a aba **Guardrails** não aparecer no dashboard, use a opção B. Em 2026-06-13,
> a documentação pública ainda aponta para essa aba, mas o OpenAPI da Cloudflare
> também expõe `guardrails` diretamente no objeto do gateway.

## Opção B — API (cache + rate limiting + guardrails)

Crie um token com **Account › AI Gateway › Edit** e rode:

```bash
ACCT=32156f9a72a32d1ece28ab74bcd398fb
TOKEN=<token com AI Gateway:Edit>

curl -X PUT \
  "https://api.cloudflare.com/client/v4/accounts/$ACCT/ai-gateway/gateways/fisioflow-gateway" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cache_ttl": 3600,
    "cache_invalidate_on_update": true,
    "collect_logs": true,
    "rate_limiting_interval": 60,
    "rate_limiting_limit": 30,
    "rate_limiting_technique": "sliding",
    "guardrails": {
      "prompt": {
        "S1": "BLOCK",
        "S2": "BLOCK",
        "S3": "BLOCK",
        "S4": "BLOCK",
        "S5": "BLOCK",
        "S6": "BLOCK",
        "S7": "BLOCK",
        "S8": "BLOCK",
        "S9": "BLOCK",
        "S10": "BLOCK",
        "S11": "BLOCK",
        "S12": "BLOCK",
        "S13": "BLOCK",
        "P1": "BLOCK"
      },
      "response": {
        "S1": "BLOCK",
        "S2": "BLOCK",
        "S3": "BLOCK",
        "S4": "BLOCK",
        "S5": "BLOCK",
        "S6": "BLOCK",
        "S7": "BLOCK",
        "S8": "BLOCK",
        "S9": "BLOCK",
        "S10": "BLOCK",
        "S11": "BLOCK",
        "S12": "BLOCK",
        "S13": "BLOCK",
        "P1": "BLOCK"
      }
    }
  }'
```

Notas:

- O `PUT` exige os campos `rate_limiting_interval`, `rate_limiting_limit`,
  `collect_logs`, `cache_ttl` e `cache_invalidate_on_update`.
- O schema atual do OpenAPI aceita `guardrails.prompt` e
  `guardrails.response`, com categorias `S1` a `S13` e `P1`, cada uma como
  `BLOCK` ou `FLAG`.

## Como verificar depois

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$ACCT/ai-gateway/gateways/fisioflow-gateway" | jq '.result | {cache_ttl, rate_limiting_limit, guardrails}'
```

## Observação de arquitetura

As chamadas do assistente do paciente (`/api/patient/assistant`) e do RAG usam
o Workers AI binding diretamente em alguns pontos. Para que os **Guardrails do
Gateway** sejam aplicados, o tráfego de IA precisa passar pelo gateway
(`gateway: { id: "fisioflow-gateway" }` no `env.AI.run(...)`) ou pela REST API
atual da Cloudflare (`/ai/v1/...` com header `cf-aig-gateway-id:
fisioflow-gateway`). Caso contrário, o Gateway não intercepta.

## Defesa no app

Como a aba Guardrails pode não aparecer no dashboard e o token do ambiente não
tem `AI Gateway:Edit`, a rota `/api/patient/assistant` também tem um guardrail
determinístico local:

- bloqueia perguntas de autoagressão, sinais de urgência e pedidos de
  remédio/dose/diagnóstico antes de chamar o AI Search;
- bloqueia respostas geradas que pareçam prescrição medicamentosa, diagnóstico
  ou orientação para não procurar atendimento;
- registra `patient_assistant_guardrail` no Analytics Engine com o motivo, sem
  gravar o texto sensível completo.
