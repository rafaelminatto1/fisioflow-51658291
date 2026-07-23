# Topologia de deploy aceita

**Decisão:** Cloudflare + Neon e plataforma modular híbrida, conforme ADR-0001/ADR-0002 aceitos em 2026-07-14.

## Ambientes

| Ambiente | Cloudflare | Neon | Dados |
|---|---|---|---|
| dev local | Miniflare/remote bindings seletivos | branch dev por pessoa/feature | sintéticos |
| preview | Worker por PR quando útil | branch efêmero | sintéticos |
| staging | conta/recursos estáveis e iguais ao desenho prod | branch/database staging | exclusivamente sintéticos |
| produção | recursos dedicados, proteção e alertas | branch production, PITR e backups | vazia/sintética até o gate; reais somente depois |

## Componentes

- `fisioflow-web`: Worker de Assets + shell web, separado da API e sem `DATABASE_URL`, Hyperdrive, R2 privado ou secret clínico.
- `fisioflow-api`: Worker Hono com o monólito modular transacional, auth, contratos e adapters; não serve o bundle web. Os módulos completos entram por ondas sem criar serviços vazios.
- `fisioflow-public-edge`: booking, formulários, sites publicados e storefront; criado com a primeira superfície pública e sem acesso direto a prontuário.
- `fisioflow-jobs-integrations`: consumer/dispatcher, webhooks e adapters externos quando a primeira Queue/outbox entrar. Não criar app vazio antes disso e nunca processar jobs com a credencial de request.
- `fisioflow-realtime`: Durable Objects para colaboração/presença quando a primeira capacidade realtime entrar; o estado transacional final continua canônico no Neon.
- `fisioflow-ai`: gateway, avaliações, copilotos e agentes com ferramentas estreitas; não recebe credencial irrestrita do banco.
- `fisioflow-telehealth`: ciclo de salas, tokens, consentimentos e gravações por adapter de provedor.
- Hyperdrive auth resolver, staff, patient e jobs possuem bindings e login roles distintas; migrator é usado apenas por CI controlado. O binding auth chama somente os resolvers estreitos e não executa casos clínicos.
- Queues por classe de prioridade/risco, não por feature arbitrária; toda fila tem DLQ.
- R2 buckets separados por ambiente; acesso público desabilitado por padrão.
- Workflows provisionados apenas junto ao consumidor e teste de smoke.

Os cinco deployables condicionais acima pertencem à arquitetura aprovada, mas só são criados quando sua primeira capacidade real entra. Antes disso, as fronteiras existem em documentos e contratos, não como serviços vazios. Uma extração exige fronteira de confiança/exposição pública, runtime, escala, isolamento de falha, RPO/RTO ou ownership que a justifique.

ERP, projetos, marketing/site builder, commerce/inventory, gamificação, telemedicina, colaboração, IA/agentes, biomecânica, wearables e Digital Twin permanecem no roadmap completo. Entitlement controla disponibilidade comercial; permissions/RLS continuam controlando cada acesso.

O ambiente novo não recebe conexão, binding, dump, snapshot, blob, credencial ou job de importação do legado. Dev, preview e staging usam factories/seeds identificáveis e exclusivamente sintéticos; produção nasce vazia.

## Roles Neon e contexto de conexão

- `app_owner` é `NOLOGIN` e possui os objetos; não aparece em connection string.
- capability roles `NOLOGIN` agrupam grants quando isso simplificar revisão.
- cada Hyperdrive autentica com uma login role real `NOBYPASSRLS` (`auth`, `staff`, `patient`, `jobs`) que recebe apenas a capability necessária.
- criação/rotação de login roles e passwords pertence ao bootstrap Neon/secret manager, não à migration comum da aplicação.
- a API abre transação, define contexto com `SET LOCAL`/`set_config(..., true)`, executa todas as queries na mesma conexão e encerra com commit/rollback.
- testes de staging reutilizam conexão após commit, rollback e exceção para provar ausência de contexto residual.

A escolha dos nomes exatos, herança versus `SET LOCAL ROLE` e capacidades de provisionamento do fornecedor permanece parte do DG-01/DG-02; a propriedade `NOBYPASSRLS`, a separação por uso e o teste como login role real não são opcionais.

## Pipeline

1. install imutável;
2. typecheck, lint, unit e contract tests;
3. migration lint + schema drift;
4. build reproduzível;
5. deploy preview/staging;
6. migrations expand-only autorizadas;
7. smoke, grants/RLS como login roles reais e integração;
8. canary/gradual deploy quando suportado;
9. monitorar e promover;
10. rollback de aplicação; banco segue estratégia expand/contract.

Rotas `/api/*` não são cacheadas pelo Worker web. Respostas autenticadas/PHI da API usam `private, no-store`; qualquer cache futuro exige allowlist de DTO público, threat model e teste de isolamento.

## Esteira de design conduzida por LLM

- LLM conduz arquitetura de informação, fluxos, sistema visual, protótipo, implementação e validação conforme `design/ai-design-workflow.md`.
- Stitch serve à exploração e Figma MCP oficial à fonte visual editável; nenhum deles é dependência de runtime ou recebe binding Cloudflare/Neon.
- Figma, Stitch, prompts, screenshots, fixtures, previews e regressão visual usam exclusivamente dados sintéticos, sem PII/PHI, secrets ou URLs assinadas.
- `packages/design-tokens` e o mapeamento Figma↔código são versionados; DevTools/Playwright validam comportamento, acessibilidade, responsividade e divergência visual.
- Ação de escrita em serviço externo exige projeto correto, escopo OAuth mínimo e autorização; ferramentas de design nunca conectam ao sistema legado ou à produção.

## iOS

- EAS profiles `development`, `preview`, `production` por app.
- TestFlight para validação interna/externa.
- GitHub Actions dispara e registra build; runner macOS somente para fallback/testes nativos necessários.
- Secrets de assinatura nunca entram no repositório.

## Backups e recuperação

- os registros atuais descartáveis não recebem dump, backup, exportação ou migração para o sistema novo;
- produção permanece vazia ou restrita a dados sintéticos até os controles abaixo passarem;
- PITR Neon com janela definida por RPO/RTO;
- export/backup off-site testado;
- versionamento/lifecycle no R2;
- restore drill trimestral no início e após mudança relevante, cobrindo Postgres, objetos R2 e audit trail;
- runbook inclui revogação de secrets, replay de DLQ, reconstrução de read models e verificação de hashes/autorização dos blobs restaurados.
