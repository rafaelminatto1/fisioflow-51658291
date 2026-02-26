# Plano de Execucao com Firebase (Foco Free Tier)

Data: 24/02/2026
Objetivo: evoluir o FisioFlow para capacidades comparaveis a Notion/Evernote/Linear/Obsidian com custo minimo no inicio.

## Fontes oficiais de limite/custo
- Pricing plans: https://firebase.google.com/docs/projects/billing/firebase-pricing-plans
- Pricing geral: https://firebase.google.com/pricing
- Firestore quotas: https://firebase.google.com/docs/firestore/quotas
- Firestore billing: https://firebase.google.com/docs/firestore/pricing
- Auth limits: https://firebase.google.com/docs/auth/limits
- Hosting quotas: https://firebase.google.com/docs/hosting/usage-quotas-pricing

## Quotas que importam para o projeto (Spark)
- Firestore:
  - 1 GiB storage
  - 50k reads/dia
  - 20k writes/dia
  - 20k deletes/dia
  - 10 GiB outbound/mes
- Auth:
  - limites de email e criacao por IP (ex.: 100 contas/h por IP)
- Hosting:
  - limite de storage e transferencia por projeto (monitorar uso no console)

## Estrategia tecnica (free-first)

### Fase 1 - Padrao de conteudo e governanca (baixo risco, alto impacto)
- Criar catalogo de templates para wiki (feito nesta rodada).
- Padronizar tipos de pagina: PRD, protocolo clinico, ata, postmortem, resumo de evidencia.
- Criar convencao de metadata obrigatoria para busca e auditoria.

### Fase 2 - Busca e conhecimento sem estourar quota
- Indexacao incremental: so reprocessar documento alterado.
- Cache de busca e resultados de RAG para reduzir reads repetidas.
- Limitar consultas amplas e paginar por default.

### Fase 3 - Fluxo tipo Linear (execucao e triagem)
- Fila de triage (bugs, melhorias, solicitacoes).
- Estados padrao (Backlog, Triagem, Em execucao, Bloqueado, Concluido).
- Dependencias e ownership por item.

### Fase 4 - Fluxo tipo Evernote/Obsidian (captura + links)
- Captura de evidencia (pdf/img/url) com metadados.
- Backlinks entre artigos, protocolos e paginas wiki.
- Navegacao relacional (lista de referencias cruzadas).

## Regras de custo para manter Spark saudavel
- Preferir `get` por documento em vez de queries amplas.
- Evitar listeners permanentes em telas pouco usadas.
- Consolidar writes em batch quando possivel.
- Desnormalizar com criterio para reduzir joins client-side.
- Adotar cache local (IndexedDB) para leitura frequente.
- Usar Cloud Functions apenas para tarefas de valor alto (indexacao, automacao, validacoes criticas).

## Sinais de que precisa migrar para Blaze
- Firestore chegando continuamente perto de 50k reads/dia.
- Indexacao de conhecimento com fila acumulada frequente.
- Necessidade de features pagas (ex.: operacoes de backup gerenciado, cargas maiores de function, etc.).

## Acoes concretas ja implementadas nesta rodada
- Base de templates e instanciacao em:
  - `src/features/wiki/templates/templateCatalog.ts`
  - `src/features/wiki/templates/templateTransform.ts`
  - `src/features/wiki/templates/__tests__/templateTransform.test.ts`

## Proximos passos sugeridos (ordem)
1. Integrar o catalogo no fluxo de criacao de pagina wiki (UI de escolha de template).
2. Persistir “template_id” e metadados de instancia para auditoria.
3. Adicionar triage board simplificado para demandas internas.
4. Instrumentar dashboards de custo (reads/writes por funcionalidade).
