# 01 — Escopo, Metodologia e Fontes

## Estado inicial da auditoria (Fase 0)

- **Data**: 2026-07-13T18:03-03:00
- **Branch**: `main`
- **Commit auditado**: `9b5c76f1069e5bc6bbab22397e69028d314cc3be`
- **Working tree** (preservado, não modificado pela auditoria):
  - `M src/components/evolution/v2-improved/NotionEvolutionPanel.tsx` (alteração do usuário em andamento)
  - `?? test-surgery.ts` (arquivo não rastreado do usuário)
- **Modo de operação**: estritamente somente leitura; única escrita permitida = `reconstruction-dossier/`.

## Ferramentas e acessos disponíveis nesta sessão

| Fonte | Ferramenta | Status |
|---|---|---|
| Repositório local | `rg`, `git`, leitura de arquivos | ✅ Disponível |
| Neon | MCP `Neon` (run_sql, describe, list) | ✅ Autenticado |
| Cloudflare | MCP plugin `cloudflare-api` / `cloudflare-builds` / `cloudflare-observability` + `wrangler` (leitura) | ✅ Autenticado (confirmado via /mcp) |
| Navegador | MCP `chrome-devtools` / `claude-in-chrome` | ✅ Disponível (login manual pelo usuário quando necessário) |
| MCP `rafalegollas` | toolbox agregador (paper-search, pubmed, arxiv, exa, cloudflare docs/execute, sequential-thinking) | ✅ Disponível — ver seção abaixo |
| Docs de bibliotecas | MCP `context7` / CLI `ctx7` | ✅ Disponível |
| Web search | MCP `exa`, `brave` | ✅ Disponível |
| GitHub | MCP `github` | ✅ Disponível |
| Hermes Agent | — | ❌ Não instalado/configurado nesta máquina (lacuna registrada; não instalado sem autorização) |

## MCP `rafalegollas` — inventário de capacidades

Servidor MCP agregador ("toolbox") registrado com esse nome. Ferramentas expostas (somente leitura utilizadas):
- Busca acadêmica: `pubmed_*`, `arxiv_*`, `google-scholar_*`, `adamamer20-paper-search-mcp-openai_*` (PubMed, arXiv, bioRxiv, medRxiv, CrossRef, Semantic Scholar, IACR)
- Cloudflare: `cloudflare_docs`, `cloudflare_search`, `cloudflare_execute`
- Web: `exa_web_search_exa`, `exa_web_fetch_exa`
- Meta: `get_toolbox_status`, `search_toolbox`, `execute`, `remove_server` (NÃO utilizado — mutação), `smithery-ai-server-sequential-thinking`
- Conclusão: é um hub de ferramentas de pesquisa/documentação, não uma fonte de dados do FisioFlow em si. Usado como fonte complementar de documentação.

## Metodologia

1. Fases 0–14 conforme especificação do dossiê; resultados gravados incrementalmente.
2. Paralelização por subagentes com arquivos de saída distintos; conclusões validadas pelo agente principal.
3. Toda afirmação relevante recebe evidência com ID (`SRC/DOC/TEST/RUN/API/DB/CF/EXT-###`) em `evidence/index.csv`.
4. Nenhuma inferência apresentada como fato; divergências registradas em `14-divergencias-legado-e-divida.md`.
5. Dados pessoais/clínicos e valores de secrets NUNCA copiados para o dossiê.

## Limitações registradas

- Hermes Agent indisponível.
- Inspeção runtime foi parcial e somente como `admin` em produção (`RUN-001..011`); papéis não-admin dependem de contas de teste e permanecem pendentes.
- Consultas Neon: somente `information_schema`/`pg_catalog` + agregações; transações read-only com rollback.
