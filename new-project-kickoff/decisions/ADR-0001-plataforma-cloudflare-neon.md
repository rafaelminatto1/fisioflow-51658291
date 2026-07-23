# ADR-0001 — Cloudflare + Neon como baseline

**Status:** Aceita  
**Data da proposta:** 2026-07-13  
**Aceita em:** 2026-07-14

## Contexto

O proprietário escolheu Cloudflare + Neon para a reconstrução. O legado demonstra familiaridade com Workers, Hyperdrive, Queues, Workflows, Durable Objects, R2 e Neon, mas acumulou recursos órfãos e uma conexão owner que invalida RLS. A arquitetura nova não reutiliza conexões, dados, buckets ou credenciais desse ambiente.

A reconstrução é greenfield e contempla, por ondas, núcleo clínico, ERP, projetos, marketing/site builder, commerce/inventory, gamificação, telemedicina, colaboração, IA/agentes, biomecânica, wearables e Digital Twin. O volume de capacidades exige primitivas especializadas sem espalhar dependências Cloudflare pelo domínio.

A UX/UI será conduzida por LLM, Stitch e Figma MCP oficial. Essas ferramentas pertencem à esteira de design, não ao runtime clínico, e recebem exclusivamente dados sintéticos.

## Decisão

- Web React/Vite servido por um **Cloudflare Worker + Static Assets dedicado** (`fisioflow-web`), sem binding de banco, R2 clínico ou segredo da API.
- API Hono executada em um **Worker separado** (`fisioflow-api`), inicialmente como monólito modular transacional, com deploy, bindings e blast radius independentes do frontend.
- Neon Postgres como sistema transacional de registro. Região, contas e RPO/RTO finais são fechados no DG-01 antes do provisionamento de produção.
- Hyperdrive/bindings separados para auth resolver, staff, paciente e jobs. Cada binding usa uma login role real `NOBYPASSRLS`, diferente da role dona do schema; auth possui somente `EXECUTE` nos resolvers estreitos.
- Roles donas e de capacidade são `NOLOGIN`; roles de login herdam somente capacidades explícitas. Criação, rotação e revogação dessas credenciais ficam fora das migrations comuns da aplicação.
- R2 privado para documentos e mídia; acesso somente depois de autorização e por URL temporária/chave opaca. Assets públicos publicados usam origem e política separadas.
- Queues para efeitos assíncronos idempotentes, com DLQ; o primeiro consumer cria `fisioflow-jobs-integrations`, com credential própria e nunca a credential de request.
- Workflows somente para processos longos, retomáveis e multi-etapa.
- Durable Objects somente para coordenação/realtime comprovada; prontuário, contabilidade, estoque e versões assinadas permanecem canônicos no Neon.
- D1/KV somente para estado edge não clínico quando houver necessidade explícita; não são fontes transacionais dos módulos.
- Respostas autenticadas/sensíveis da API não são armazenadas no edge por padrão (`Cache-Control: private, no-store`).
- `public-edge`, `jobs-integrations`, `realtime`, `ai` e `telehealth` são deployables condicionais definidos no ADR-0002; nenhuma pasta/infra vazia é criada antes da primeira capacidade real.
- O sistema novo não possui job, connection string, adapter ou binding para importar os registros atuais. Dev, preview e staging usam somente dados sintéticos.
- Antes do primeiro dado real, produção precisa de PITR/backup Neon, lifecycle/versionamento R2 e restore integrado testado.
- Stitch/Figma MCP e outras ferramentas da LLM nunca recebem PII/PHI, secrets, URLs assinadas ou acesso ao ambiente legado; escrita externa exige projeto e escopos autorizados.

## Consequências

- Distribuição global e baixa operação de servidores com uma stack conhecida.
- A separação web/API e os deployables condicionais reduzem exposição de segredos e alcance de falhas, ao custo de inventário explícito de bindings, filas, roles e deploys.
- O monólito modular preserva transações fortes; fronteiras públicas, realtime, IA, telemedicina e integrações podem evoluir em runtimes adequados.
- Exige disciplina com limites do runtime, topologia de roles, RLS, idempotência, consistência assíncrona, custos e observabilidade.
- Testes em staging são obrigatórios para bindings cuja emulação/remote dev não reproduza integralmente produção. Esses testes usam exclusivamente fixtures sintéticas.
- Código de domínio não depende diretamente de tipos Cloudflare; ports/adapters e test doubles mantêm contratos testáveis.
- Módulos completos entram por ondas e entitlements; a escolha de plataforma não autoriza criar todos de uma vez.

## Alternativas consideradas

- **Supabase:** reavaliar apenas se auth/RLS/storage integrados reduzirem risco de forma comprovada e a mudança for aprovada em novo ADR.
- **Fly.io/Render + Postgres gerenciado:** reavaliar se processos, sockets ou dependências essenciais forem incompatíveis com Workers e adapters não resolverem o requisito.
- **Storage S3 compatível externo:** permitido por novo ADR se requisitos de região, compliance, disponibilidade ou custo superarem R2.

Nenhuma alternativa está autorizada implicitamente; a baseline permanece Cloudflare + Neon até decisão substituta aceita.

## Reversibilidade

Contratos HTTP/OpenAPI, SQL Postgres padrão, filas e storage atrás de ports, objetos por chave estável e manifestos de infraestrutura reduzem custo de saída. Workers AI, Durable Objects e Workflows não entram no domínio puro. Tokens/designs exportáveis e componentes mapeados evitam tornar Figma/Stitch dependências de runtime.
