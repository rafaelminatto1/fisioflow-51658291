# Fronteiras dos módulos

## Estratégia arquitetural aceita

O destino é uma **plataforma modular híbrida**:

- um monólito modular transacional concentra as capacidades que precisam de consistência forte e evolução coordenada;
- deployables especializados só são criados quando exposição pública, runtime, segurança, escala, disponibilidade ou ciclo de release justificarem a separação;
- os módulos são completos no roadmap, mas entram em incrementos independentes e ativáveis por entitlement/feature flag;
- o web desktop é a superfície administrativa completa; os apps iOS expõem somente capacidades adequadas à persona e ao contexto móvel.

## Módulos de domínio

| Módulo | Possui | Publica/expõe | Não possui |
|---|---|---|---|
| Identity | identities, sessões externas, recovery e primeiro passo do bootstrap | subject externo validado/identity interna | membership ou papel da organização |
| Organizations | organizations, memberships, permissions, configuração tenant-owned, branding e segundo passo do bootstrap | contexto autorizado e catálogo de capabilities versionado | prontuário, subscription ou cobrança SaaS |
| SaaS Control Plane | catálogo de módulos/planos, provisioning, subscription, entitlement grants, metering, cobrança SaaS, suporte, SLO e incidentes de plataforma | comandos de provisioning, snapshot de entitlements, eventos de subscription/usage/support e status público | PHI/PII tenant-owned, prontuário ou papel dentro da clínica |
| Patients | cadastro, contatos, patient-subject link e delegação de cuidador | paciente e dados cadastrais autorizados | sessão/evolução |
| Episodes | plano, objetivos, estado, equipe e alta/abandono | episódio ativo/encerrado | agenda e cobrança |
| Scheduling | disponibilidade, appointment individual, recursos, recorrência, booking e waitlist individual | appointment events | nota clínica ou turma |
| Clinical | sessão, evolução, versões, avaliações e medidas | eventos de revisão/finalização | pagamento ou decisão autônoma por IA |
| Outcomes | PROMs, testes, metas e interpretações autorizadas | outcome recorded e projeções longitudinais | diagnóstico automático |
| Exercises | biblioteca, protocolo, HEP, execução e feedback | adherence/feedback events | economia de pontos ou estoque comercial |
| Documents | arquivo, termo, assinatura, relatório, share link e metadados do blob | document events e acesso temporário | blob sem proveniência/retenção |
| Telehealth | sessão remota, participante, sala/token, consentimento e ciclo de gravação | telehealth lifecycle events | prontuário, agenda ou provedor de mídia acoplado ao domínio |
| Messaging | conversa, template, preferência, entrega, opt-in/out e SLA | delivery/opt-out events | regra clínica ou segmentação de marketing |
| CRM & Marketing | leads, pipeline, segmentos, campanhas, automações, conteúdo, social e atribuição | lead/campaign events | prontuário ou consentimento clínico implícito |
| Site Builder | site, página, bloco, tema, domínio, formulário, publicação, rollback e propostas de layout/design por LLM | manifestos imutáveis para o `public-edge` e drafts revisáveis | consulta direta ao banco clínico ou publicação automática por IA |
| Finance & ERP | plano de contas, lançamento de dupla entrada, contas a pagar/receber, caixa, banco, conciliação, centro de custo, contratos, fiscal, NFS-e, comissão e folha quando aprovada | eventos contábeis/fiscais e relatórios autorizados | alteração de lançamento contabilizado sem estorno |
| Projects | portfólio, projeto, quadro, tarefa, dependência, recurso, aprovação e time tracking | project/task/time events | prontuário embutido na tarefa |
| Commerce | catálogo, preço, promoção, carrinho, pedido, pagamento, assinatura, devolução e fulfillment | order/payment lifecycle | estoque como saldo mutável sem ledger |
| Inventory | item, local, lote/validade, movimento, reserva, inventário, compra e fornecedor | stock/reservation events | inventário virtual da gamificação |
| Gamification | regras, pontos, níveis, conquistas, desafios, ranking, moeda, loja e inventário virtual | engagement/reward events | interpretação clínica ou exposição pública por padrão |
| Collaboration | presença, cursores, operações realtime, snapshots e conflitos | estado colaborativo e versão consolidada | versão clínica assinada como fonte primária |
| Knowledge & Evidence | espaços, taxonomia, artigos, revisões, fontes, licenças, citações, workflow editorial, consultas/resultados de evidência e índices derivados | conteúdo publicado versionado, citation bundles e respostas de evidência com proveniência | conteúdo copiado/sem licença, prontuário ou recomendação clínica autônoma |
| AI & Agents | prompts versionados, execuções, ferramentas permitidas, avaliações, aprovações e custos | rascunhos, sugestões e ações propostas | credencial irrestrita, assinatura clínica ou ação externa irreversível sem gate |
| Wearables & Biomechanics | consentimentos, dispositivos/fontes, observações, séries, pose/medidas derivadas, qualidade e proveniência | observações validadas e sinais experimentais | DICOM/PACS ou conduta automática |
| Digital Twin | modelo/versionamento, parâmetros, simulação, evidência e validade | cenários identificados como experimentais | representação factual ou prescrição autônoma |
| Care Radar | projeções reconstruíveis, regras/sinais explicáveis e estado de tratamento do sinal | tarefas, alertas e read model acionável | fonte primária dos dados ou diagnóstico autônomo |
| Analytics | definições de métrica, projeções e relatórios operacionais, clínicos e gerenciais | datasets/read models autorizados | escrita nas fontes transacionais |
| Audit & Privacy | acessos, ações, consentimentos, retenção, legal hold, exportação e anonimização | evidência auditável e solicitações LGPD | logs operacionais genéricos como substituto da auditoria |

## Deployables e primitivas

| Deployable | Responsabilidade | Criação |
|---|---|---|
| `web` | Worker + Static Assets do desktop; consome API e nunca recebe binding do banco/R2 clínico | fundação |
| `api-platform` | Hono Worker com o monólito modular transacional e contratos `/api/v1` | fundação |
| `saas-control` | APIs administrativas globais de provisioning, subscription, metering, suporte e SLO; identidade/capabilities separadas das memberships de clínica | junto da primeira operação multi-cliente |
| `public-edge` | sites, formulários, booking, intake e storefront públicos; Turnstile/rate limits e nenhuma leitura clínica direta | junto da primeira superfície pública |
| `jobs-integrations` | outbox, Queues/Workflows, webhooks, WhatsApp, pagamentos, NFS-e, e-mail, imports/exports e DLQs | junto do primeiro efeito assíncrono |
| `realtime` | Durable Objects para presença/colaboração e persistência controlada de snapshots | junto da colaboração simultânea |
| `ai` | gateway/orquestração de IA e agentes, ferramentas estreitas, avaliação e aprovação humana | junto da primeira capacidade de IA |
| `knowledge-jobs` | ingestão permitida, normalização, citation lookup, indexação e atualização de fontes; somente artefatos com licença/proveniência | junto da base de conhecimento/Evidence Gateway |
| `telehealth` | adapters de mídia, sala/token e eventos de sessão remota | junto da telemedicina |

Neon é a fonte transacional. O banco começa unificado, com schemas/exports/roles por módulo, RLS `default deny` e outbox na mesma transação da mudança de domínio. R2 guarda blobs privados e assets publicados; Queues/Workflows transportam efeitos assíncronos; Durable Objects coordenam estado realtime, mas não substituem a fonte canônica clínica/financeira. KV, se usado, guarda somente configuração/cache sem PII/PHI.

## Dependências permitidas

- Application services chamam interfaces públicas de outro módulo.
- Read models cruzados são explícitos, somente leitura e cobertos por contrato.
- Operações que precisam atomicidade compartilham transação via orchestrator; efeitos posteriores usam outbox.
- Um módulo nunca escreve tabela interna de outro; integração ocorre por comando, evento ou read model autorizado.
- O Radar, Analytics e agentes consomem eventos/read models e nunca alteram diretamente as fontes.
- O SaaS Control Plane pode provisionar tenant e emitir entitlement, mas não lê tabelas clínicas; suporte recebe telemetria sanitizada e acesso excepcional somente por grant com ticket, finalidade e TTL.
- Marketing e comunicação assistencial mantêm finalidade, consentimento e opt-out independentes.
- Site publicado referencia IDs públicos opacos; formulário público vira comando validado, nunca query arbitrária.
- Layout, texto ou design proposto por LLM permanece draft versionado, com modelo/prompt, diff e aprovação; publicação continua sendo comando humano autorizado.
- Knowledge & Evidence valida licença, proveniência e revisão antes da publicação; embeddings/chunks são projeções reconstruíveis, não fonte editorial.
- AI & Agents consulta Knowledge & Evidence por contrato e sempre devolve citações/limitações quando a resposta depender de evidência.
- Colaboração pode produzir rascunho, mas finalização/assinatura passa pelo Clinical.
- Telehealth referencia appointment/episode por contrato e não possui esses agregados.

## Critérios de extração

Um módulo só vira deployable ou banco separado quando pelo menos um gate forte estiver documentado: fronteira de confiança/exposição pública, runtime incompatível, escala muito diferente, RPO/RTO/retenção próprios, isolamento de falha necessário ou owner/ciclo de release independente. Preferência tecnológica e tamanho do menu não bastam.

## Fronteiras no pacote de banco

- `packages/db` expõe entradas por módulo (`db/identity`, `db/organizations`, `db/saas`, `db/patients`, `db/knowledge` etc.) e um agregador exclusivo de migrations.
- Tabela, query e repository interno não são exportados pelo barrel raiz.
- `exports` do package e lint de fronteira impedem importar persistência interna de outro módulo.
- Queries de projeção cruzada vivem em namespace explícito `read-models`, são somente leitura e possuem owner/contrato/testes.
- API, jobs e deployables especializados usam contratos comuns, mas adapters de conexão e grants distintos.

## Exclusões definitivas

- grupos/turmas, incluindo entidades, rotas, flags e placeholders;
- DICOM/PACS, incluindo ingestão, visualizador, worklist e integração hospitalar correspondente.

Fotos, vídeos e documentos clínicos privados continuam no módulo Documents e não constituem DICOM/PACS.

## Anti-padrões proibidos

- importar query SQL interna de outro módulo;
- usar o barrel raiz de `packages/db` para contornar exports por módulo;
- tabela genérica `settings` para toda regra sem schema/version;
- evento contendo prontuário completo;
- role codificada apenas em componentes de UI;
- módulo `utils` como depósito de regra de negócio;
- criar microserviço para cada menu;
- permitir acesso direto de web/app/public-edge ao banco;
- tratar `platform_admin` como superusuário de tenant ou compartilhar conexão owner entre `saas-control` e API clínica;
- armazenar assinatura/billing SaaS no mesmo ledger do ERP da clínica;
- publicar conteúdo, site ou design produzido por LLM sem revisão e trilha de aprovação;
- indexar ou parafrasear conteúdo externo sem licença/proveniência;
- usar DO, KV ou R2 como fonte transacional de prontuário, estoque ou contabilidade.
