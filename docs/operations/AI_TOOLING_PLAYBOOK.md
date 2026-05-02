# AI Tooling Playbook - FisioFlow

> Última revisão: 2026-05-02
> Objetivo: orientar o uso prático das skills instaladas e dos MCPs configurados no Gemini CLI para trabalho no FisioFlow.

---

## 1. O que está configurado

### Skills instaladas

- `cloudflare`
- `wrangler`
- `workers-best-practices`
- `durable-objects`
- `agents-sdk`
- `web-perf`
- `vercel-react-best-practices`
- `vercel-react-native-skills`
- `web-design-guidelines`

### MCPs configurados no Gemini CLI

- `cloudflare-api`
- `cloudflare-docs`
- `cloudflare-agents-docs`
- `cloudflare-bindings`
- `cloudflare-observability`
- `cloudflare-ai-gateway`
- `cloudflare-ai-search`
- `cloudflare-graphql`

---

## 2. Regra prática de uso

Use a ferramenta mais próxima do problema antes de inventar processo manual.

| Tarefa | Ferramenta principal | Complementos |
|---|---|---|
| Cloudflare Workers, R2, D1, Queues, Hyperdrive, Wrangler | `wrangler` + `cloudflare` | `workers-best-practices` |
| Agents, Durable Objects, workflows, MCP server interno | `agents-sdk` + `durable-objects` | `cloudflare-agents-docs` |
| Consultar docs Cloudflare atualizadas | `cloudflare-docs` | `cloudflare-api`, `cloudflare-bindings` |
| Observabilidade, queries, rotas lentas, eventos | `cloudflare-observability` | `cloudflare-graphql` |
| AI Gateway, roteamento e custo de chamadas | `cloudflare-ai-gateway` | `cloudflare-api` |
| RAG, AutoRAG, fontes e busca semântica | `cloudflare-ai-search` | `cloudflare-bindings` |
| Análise de performance web | `web-perf` | `vercel-react-best-practices` |
| Frontend React/Vite/Next | `vercel-react-best-practices` | `web-design-guidelines` |
| Mobile React Native / Expo | `vercel-react-native-skills` | `web-design-guidelines` |
| Ajustes de interface e UX de páginas novas | `web-design-guidelines` | `web-perf` |

---

## 3. Sequência recomendada por tipo de trabalho

### Backend e infra Cloudflare

1. Ler a skill relevante.
2. Consultar `cloudflare-docs` ou `cloudflare-agents-docs` para confirmar sintaxe atual.
3. Usar `wrangler` para validar config, deploy dry-run ou binding.
4. Aplicar o mínimo necessário no código.
5. Rodar `pnpm type-check` e, se tocar Workers, `pnpm --filter @fisioflow/api test`.

### Frontend web

1. Consultar `vercel-react-best-practices`.
2. Se houver risco de regressão visual ou de performance, consultar `web-perf`.
3. Implementar com foco em consistência com o design system local.
4. Validar com testes e, quando relevante, Playwright.

### Mobile

1. Consultar `vercel-react-native-skills`.
2. Evitar soluções que dependam de web-only APIs.
3. Validar navegação, estado offline e compatibilidade com a base existente.

### Observabilidade e AI

1. Usar os MCPs Cloudflare dedicados para inspecionar dados e docs.
2. Confirmar nome de dataset, endpoint ou binding antes de codificar.
3. Registrar mudanças em `docs/operations/OBSERVABILITY.md` ou documentos correlatos.

---

## 4. Comandos úteis

```bash
# Gemini CLI
gemini mcp list
gemini mcp enable cloudflare-observability
gemini mcp enable cloudflare-ai-gateway

# Cloudflare
wrangler whoami
wrangler deploy --dry-run
wrangler tail

# Projeto
pnpm type-check
pnpm test
pnpm --filter @fisioflow/api test
pnpm --filter fisioflow-web test:unit

# Predeploy
bash scripts/predeploy-check.sh
bash scripts/predeploy-check.sh --workers
bash scripts/predeploy-check.sh --all
```

---

## 5. Regras de segurança

- Não usar MCPs de escrita em produção sem necessidade clara.
- Não expor segredos, CPF, dados clínicos ou tokens em prompts, logs ou docs.
- Preferir leitura de documentação e inspeção antes de alterar config sensível.
- Em Cloudflare, validar primeiro a configuração local e o estado do binding antes do deploy.

---

## 6. Caminho recomendado para o FisioFlow

O conjunto atual de ferramentas faz sentido para quatro frentes:

1. **Cloudflare core** para Workers, deploy, bindings e observabilidade.
2. **Agents/DO** para automações duráveis, chat assíncrono e fluxos de IA com estado.
3. **Frontend UX/performance** para manter o app web rápido e previsível.
4. **Mobile React Native** para manter os apps móveis alinhados com o design e as APIs do projeto.

Esse playbook deve ser atualizado quando uma nova skill ou MCP passar a ser usada com frequência.
