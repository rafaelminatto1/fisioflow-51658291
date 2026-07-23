# Dossiê de Reconstrução — FisioFlow

Auditoria **somente leitura** do FisioFlow para permitir reconstrução do zero em novo repositório, sem depender de conhecimento tácito do código atual. Estado **AS-IS** (o que existe hoje) separado rigorosamente do **TO-BE** (recomendações).

- **Commit auditado**: `9b5c76f1069e5bc6bbab22397e69028d314cc3be` (branch `main`)
- **Data**: 2026-07-13
- **Ambientes consultados**: repositório local, Neon produção (`purple-union-72678311`), conta Cloudflare (`32156f9a…`), CLIs `wrangler`/`neonctl`, MCPs Neon/Cloudflare.
- **Runtime**: validação parcial em produção como `admin` (login, agenda, pacientes, financeiro e prontuário do próprio usuário; `RUN-001..011`). Papéis não-admin e cobertura sistemática permanecem pendentes. Hermes indisponível.

## Índice

### Documentos (AS-IS)
| # | Documento | Conteúdo |
|---|---|---|
| 00 | [Resumo executivo](00-resumo-executivo.md) | Visão geral, números, riscos, recomendação |
| 01 | [Escopo, metodologia e fontes](01-escopo-metodologia-e-fontes.md) | Estado inicial, ferramentas, MCP rafalegollas |
| 02 | [Inventário do sistema](02-inventario-do-sistema.md) | Workspaces, entry points, deps, migrations |
| 03 | [Personas, RBAC e multi-tenancy](03-personas-rbac-e-multitenancy.md) | 9 papéis, matriz, isolamento |
| 04 | [Domínios e capacidades](04-dominios-e-capacidades.md) | Mapa de domínios + status |
| 05 | [Jornadas, telas e estados](05-jornadas-telas-e-estados.md) | 14 módulos, jornadas, validações |
| 06 | [Regras de negócio](06-regras-de-negocio.md) | 108 regras por domínio |
| 07 | [APIs, eventos e integrações](07-apis-eventos-e-integracoes.md) | Arquitetura API, jobs, 34 integrações |
| 08 | [Modelo e dicionário de dados](08-modelo-e-dicionario-de-dados.md) | 303 tabelas, enums, RLS, divergências |
| 09 | [Infraestrutura e operações](09-infraestrutura-e-operacoes.md) | Cloudflare + Neon consolidado |
| 10 | [Segurança e LGPD](10-seguranca-e-lgpd.md) | Auth, RLS, riscos, retenção |
| 11 | [Requisitos não-funcionais](11-requisitos-nao-funcionais.md) | Perf, escala, observabilidade |
| 12 | [Web e apps iOS](12-web-e-apps-ios.md) | Matriz web × pro × paciente, pipeline iOS |
| 13 | [Testes e paridade](13-testes-e-paridade.md) | 442 testes + estratégia de paridade |
| 14 | [Divergências, legado e dívida](14-divergencias-legado-e-divida.md) | Contradições, órfãos, buracos de auth |

### Documentos (TO-BE — recomendações)
| # | Documento | Conteúdo |
|---|---|---|
| 15 | [Opções de arquitetura futura](15-opcoes-de-arquitetura-futura.md) | CF+Neon × Supabase × clássico |
| 16 | [Plano de reconstrução](16-plano-de-reconstrucao.md) | Fases 0–5 (não executar sem autorização) |
| 17 | [Estratégia de migração de dados](17-estrategia-de-migracao-de-dados.md) | Ordem, de-para PT/EN, validação |
| 18 | [E-Fisio (fase futura)](18-e-fisio-fase-futura.md) | Enquadramento, fluxo de conteúdo |
| 19 | [Perguntas em aberto](19-perguntas-em-aberto.md) | 22 decisões para o time (grupos/turmas já resolvidos) |
| 20 | [Cobertura final](20-cobertura-final.md) | Métricas + 2ª revisão de lacunas |

### Inventários (`inventories/`)
`system-manifest.json` · `feature-status.csv` · `ui-routes.csv` (224) · `screens.csv` (111) · `roles-permissions.csv` · `business-rules.json` (108) · `api-endpoints.csv` (1.191) · `events-and-jobs.csv` (57) · `database-objects.csv` (5.838) · `integrations.csv` (34) · `cloudflare-resources.csv` · `neon-resources.csv` · `env-and-bindings.csv` · `tests.csv` (442) · `traceability.csv`

### Diagramas (`diagrams/`, Mermaid)
`system-context.md` · `containers.md` · `deployment.md` · `data-model.md` · `authentication.md` · `scheduling-lifecycle.md` · `clinical-lifecycle.md` · `financial-lifecycle.md` · `messaging-lifecycle.md` · `exercise-prescription.md` · `mobile-offline-sync.md`

### Evidências
`evidence/index.csv` — IDs SRC/DOC/TEST/RUN/API/DB/CF/EXT com origem, ambiente, ferramenta, status e confiança.

## Aviso

Este dossiê **não autoriza** iniciar a implementação do sistema novo nem criar o novo repositório. Isso exige autorização posterior e explícita. Nenhum dado pessoal, clínico ou secret foi copiado para o dossiê.
