# ADR-0002 — Plataforma modular híbrida

**Status:** Aceita  
**Aceita em:** 2026-07-14  
**Substitui:** proposta anterior de um único monólito modular como topologia final

## Contexto

O legado cresceu por duplicação, acoplamento e fragmentação, não por necessidade comprovada de um microsserviço por menu. A reconstrução, porém, agora contempla módulos completos de cuidado, ERP, projetos, marketing/site builder, commerce/inventory, gamificação, telemedicina, colaboração, IA/agentes, biomecânica, wearables e Digital Twin.

Um único deployable permanente aumentaria o blast radius das superfícies públicas, realtime, mídia, IA e integrações. Microsserviços por domínio desde o scaffold criariam transações distribuídas, serviços vazios e custo operacional antes de existir carga ou equipe que os justificasse.

O sistema nasce greenfield, sem migração dos registros atuais. Isso permite definir fronteiras canônicas desde a primeira migration e validá-las somente com dados sintéticos.

## Decisão

Adotar uma **plataforma modular híbrida**:

1. `fisioflow-api` começa como monólito modular transacional no Cloudflare Workers.
2. Cada domínio possui modelo, casos de uso, persistence exports, permissions, contratos, eventos e testes próprios.
3. O Neon começa como fonte transacional unificada, com schemas/roles/fronteiras por módulo e um ledger agregado de migrations.
4. Efeitos posteriores à transação usam outbox; consumers são idempotentes e registram receipts.
5. Deployables especializados nascem somente com a primeira capacidade real e um gate técnico documentado.
6. Ser um módulo completo no roadmap não significa entrar no scaffold nem existir em todas as superfícies; web é completo e apps são orientados por persona.

## Deployables condicionais

| Deployable | Responsabilidade | Gate de criação |
|---|---|---|
| `fisioflow-public-edge` | sites publicados, formulários, booking, intake e storefront públicos | primeira superfície pública; nenhuma leitura direta de prontuário |
| `fisioflow-jobs-integrations` | outbox/Queues/Workflows, webhooks, WhatsApp, pagamentos, NFS-e, e-mail, imports/exports internos do sistema novo e DLQs | primeiro efeito assíncrono; credential própria |
| `fisioflow-realtime` | Durable Objects para presença, colaboração e snapshots controlados | primeira jornada simultânea aprovada |
| `fisioflow-ai` | gateway, prompts, avaliações, copilotos e agentes com ferramentas estreitas | primeira capacidade de IA com human approval e kill switch |
| `fisioflow-telehealth` | sala/token, adapter de mídia, consentimento e ciclo de gravação | primeira jornada remota aprovada e provider spike concluído |

Esses nomes representam fronteiras aceitas, não autorização para criar pastas, Workers, bancos, filas ou secrets antecipadamente.

## Módulos do monólito transacional

O catálogo oficial vive em `architecture/module-boundaries.md` e inclui:

- identity, organizations/entitlements, patients, episodes, scheduling, clinical, outcomes, exercises/HEP, documents, messaging, audit/privacy e Care Radar;
- Finance & ERP, Projects, CRM & Marketing, Site Builder, Commerce, Inventory e Gamification;
- contratos/fontes canônicas de Telehealth, Collaboration, AI & Agents, Wearables & Biomechanics, Digital Twin e Analytics.

O módulo continua dono de sua fonte transacional mesmo quando compute/coordenação roda em deployable especializado. Durable Objects não possuem nota assinada; `fisioflow-ai` não possui prontuário; `public-edge` não possui lead/paciente; adapters de NFS-e não possuem ledger contábil.

## Regras de fronteira

- Módulo não consulta nem altera tabela interna de outro; usa interface/caso de uso, comando ou read model declarado.
- `packages/db` expõe schema/queries por subpath de módulo; não existe barrel raiz que exponha persistência interna. Package exports e lint tornam a fronteira verificável.
- Read models têm owner, contrato, authorization, freshness e procedimento de reconstrução explícitos.
- Operações que exigem atomicidade permanecem na mesma transação/orchestrator; efeitos assíncronos usam transactional outbox.
- Analytics, Radar, IA e agentes consomem contratos/read models e não escrevem diretamente nas fontes.
- Um deployable interno recebe apenas bindings, secrets e grants necessários à sua finalidade.
- Contratos entre deployables são versionados, autenticados, idempotentes e testados; evento não carrega prontuário completo.
- Entitlement ativa módulo, mas authorization continua sendo avaliada por sujeito, membership, relação, finalidade e recurso.
- Não criar camadas, packages ou serviços vazios por cerimônia.

## Gates de extração

Um módulo ou capacidade só deixa o processo principal quando houver pelo menos um motivo forte registrado e testável:

- fronteira de confiança ou exposição pública;
- runtime incompatível ou coordenação stateful/realtime;
- escala/custo muito diferente;
- isolamento de falha ou SLO próprio;
- RPO/RTO, retenção ou política de dados distinta;
- owner e ciclo de release independentes.

Tamanho do menu, preferência tecnológica ou antecipação de crescimento não bastam. Separar banco requer ADR adicional e plano de consistência/recuperação.

## Design e implementação conduzidos por LLM

- Cada feature começa por contrato de experiência, persona, permission, estados, risco e superfícies.
- Stitch explora alternativas; Figma MCP oficial mantém a fonte visual editável; tokens/Code Connect ou mapa equivalente ligam design e código.
- Módulos pequenos, contratos explícitos, manifests e testes locais limitam o contexto necessário para humanos e agentes de código.
- A LLM não inventa dependência cross-domain, permission, regra clínica, contábil ou fiscal para completar uma tela.
- Figma, Stitch, prompts, screenshots e fixtures usam somente dados sintéticos; nenhuma ferramenta de design conecta ao legado ou à produção.
- DevTools/Playwright validam comportamento, responsividade, acessibilidade e regressão antes do aceite.

## Primeiro slice

Identity + Organizations + Patients, da autenticação ao detalhe somente leitura, com banco novo, API, SDK, web e testes Org A × Org B exercitados de ponta a ponta. Nenhum deployable condicional ou módulo futuro recebe scaffold nessa etapa.

## Consequências

- Transações centrais e desenvolvimento inicial permanecem simples.
- Superfícies de maior risco/runtime podem ser isoladas sem adotar microsserviços por menu.
- O monorepo e o banco unificado exigem enforcement automático de boundaries, grants e ownership.
- Eventos, retries, DLQs e consistência eventual entram somente onde a separação existir.
- A topologia pode crescer com os módulos completos, mas cada extração aumenta custo de deploy, observação e incident response.

## Exclusões

Grupos/turmas e DICOM/PACS não são módulos, deployables, adapters, flags ou placeholders. Documentos, fotos e vídeos clínicos comuns continuam sob Documents.
