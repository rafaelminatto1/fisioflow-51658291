# Backlog por resultado

Este backlog registra o **programa completo**, não um único release. Cada épico precisa de spec, owner, dependências, permission/data classification, aceite e gate de ativação próprios. A ordem detalhada é decidida depois da fundação; manter um módulo no roadmap não autoriza implementá-lo parcialmente no núcleo de outro.

## D0 — Descoberta, ICP e programa

- `D0-01` decidir uso interno × SaaS e perfil da clínica/cliente inicial;
- `D0-02` observar fluxos reais de recepção, atendimento e gestão;
- `D0-03` entrevistar personas e medir baseline operacional/clínico;
- `D0-04` testar protótipos de evolução, plano do dia e resultado individual;
- `D0-05` executar demos/trials de alternativas e registrar gaps reais;
- `D0-06` definir onboarding, treinamento e tempo até primeiro valor;
- `D0-07` ordenar os módulos completos por valor, dependência, risco e capacidade;
- `D0-08` definir catálogo de módulos/entitlements sem misturá-lo com permissions.
- `D0-09` produzir com LLM o inventário de telas, arquitetura de informação, fluxos e briefing visual dos três produtos.

## K0 — Decisões, privacidade e segurança

- `K0-01` resolver DG-00..DG-07 e atualizar os ADRs da plataforma modular híbrida;
- `K0-02` fechar papéis/permissions, supervisão e segregação de funções;
- `K0-03` classificar dados, finalidade, base legal, retenção e consentimentos por módulo;
- `K0-04` criar threat model do primeiro slice e modelo de ameaças incremental;
- `K0-05` registrar grupos/turmas e DICOM/PACS como exclusões arquiteturais testáveis;
- `K0-06` confirmar formalmente que os registros atuais são sintéticos/descartáveis;
- `K0-07` definir gates humanos para IA, contabilidade, fiscal, pagamentos e comunicação externa;
- `K0-08` definir programa de conteúdo original/licenciado e proveniência.
- `K0-09` aprovar MCPs oficiais de design, escopos OAuth e proibição testável de PII/PHI nos artefatos.

## F0 — Fundação greenfield

- `F0-01` monorepo, CI e lint de boundaries;
- `F0-02` Workers/Static Assets/ambientes e inventário de bindings;
- `F0-03` Neon novo, roles, schemas por módulo, migrations e drift;
- `F0-04` auth/membership sem fallback;
- `F0-05` RLS e testes Org A × Org B/patient self-access;
- `F0-06` OpenAPI/codegen/Problem Details;
- `F0-07` logs, tracing, SLO e runbooks sem PII/PHI;
- `F0-08` idempotência, outbox, receipts e primeiro consumer somente quando houver efeito;
- `F0-09` extrair do legado somente regras, contratos, jornadas e evidências de paridade;
- `F0-10` criar seeds/fixtures estritamente sintéticos, reproduzíveis e removíveis;
- `F0-11` provisionar R2 privado por ambiente e política de chave opaca;
- `F0-12` preparar PITR/backup/restore para ativar antes do primeiro dado real.
- `F0-13` criar tokens semânticos, biblioteca Figma e pacotes `design-tokens`/UI com rastreabilidade design↔código.

## F1 — Primeiro slice

- `F1-01` listar/selecionar contexto próprio, `/me` e shell autenticado;
- `F1-02` lista paginada/busca de pacientes;
- `F1-03` detalhe somente leitura e auditoria de acesso;
- `F1-04` permissions por persona;
- `F1-05` fixtures sintéticas e e2e;
- `F1-06` accessibility/performance desktop;
- `F1-07` testes de paridade das regras selecionadas, sem importar registros atuais.
- `F1-08` gerar, comparar e consolidar layouts do slice via Stitch/Figma; implementar e validar round-trip visual, estados e acessibilidade.

## F2 — Núcleo clínico web

- `F2-01` patient/episode e estados de alta/abandono;
- `F2-02` disponibilidade, sala/recurso, feriado e bloqueio;
- `F2-03` appointment individual, recorrência, conflito, booking, check-in, no-show e waitlist;
- `F2-04` avaliações, medidas, PROMs, metas e Mapa de Resultados;
- `F2-05` sessão/evolução draft/version/review/finalize/sign;
- `F2-06` supervisão/review de estagiário;
- `F2-07` ditado consentido e rascunho revisável;
- `F2-08` documentos/mídia privados, hash, retenção, assinatura e share link;
- `F2-09` retorno/encaminhamento e liberação controlada ao paciente;
- `F2-10` contrato de sincronização do calendário do paciente, consentimento, outbox/Queue, coordinator por vínculo e adapters Google/Outlook/Apple.

## F3 — Operação e relacionamento essenciais

- `F3-01` pacote/saldo/consumo atômico;
- `F3-02` cobrança, pagamento simples e recibo;
- `F3-03` WhatsApp confirmação/lembrete/opt-out/kill switch;
- `F3-04` pré-cadastro/intake e superfícies públicas no `public-edge`;
- `F3-05` fila operacional separada do Radar clínico;
- `F3-06` recall, reativação, indicação e NPS;
- `F3-07` tarefas operacionais e clínicas com referência opaca;
- `F3-08` Care Radar explicável, owner, kill switch e medição de falso positivo.

## F4 — HEP e continuidade

- `F4-01` biblioteca original/licenciada, proveniência e mídia;
- `F4-02` protocolo/plano/prescrição versionados;
- `F4-03` “Seu plano de hoje” responsivo;
- `F4-04` execução idempotente, check-in adaptativo e solicitações com SLA;
- `F4-05` adesão/progresso no episódio e sinais para o Radar;
- `F4-06` base de conhecimento com conteúdo próprio/licenciado e revisão editorial.

## M1 — App paciente por persona

- `M1-01` auth patient + self-RLS;
- `M1-02` plano hoje, HEP, atendimento, check-in e solicitações tipadas;
- `M1-03` push/deep links/logout wipe e analytics sem PHI;
- `M1-04` TestFlight, crash reporting e acessibilidade;
- `M1-05` offline seletivo com TTL, idempotência, conflitos e revogação;
- `M1-06` documentos, teleconsulta, pagamentos, pedidos e assinaturas próprios;
- `M1-07` HealthKit/wearables com permissão e proveniência;
- `M1-08` gamificação, loja/inventário virtual e modo cuidador com privacidade;
- `M1-09` descoberta contextual, escolha do provedor, conexão, privacidade, status, reconexão e desconexão do calendário do paciente.

## M2 — App profissional por persona

- `M2-01` agenda do dia e resumo pré-sessão;
- `M2-02` rascunho protegido, ditado, revisão e finalização online;
- `M2-03` permissions, auditoria, TestFlight e observabilidade;
- `M2-04` HEP, medidas, fotos, resultados e Radar atribuído;
- `M2-05` teleconsulta e colaboração/revisão;
- `M2-06` tarefas, projetos/timesheet, estoque e CRM atribuídos;
- `M2-07` captura biomecânica/pose e dispositivos com consentimento;
- `M2-08` offline profissional somente após threat model e evidência.

## B1 — ERP e fiscal completos

- `B1-01` plano de contas, períodos, centros de custo e ledger de dupla entrada;
- `B1-02` contas a pagar/receber, caixa, bancos e conciliação;
- `B1-03` contratos, assinaturas, faturamento, cobrança, repasses e comissões;
- `B1-04` compras, fornecedores, despesas, ativos e aprovações;
- `B1-05` folha/competências necessárias após regra contábil validada;
- `B1-06` fiscal/NFS-e por adapter de provedor, idempotência e reconciliação;
- `B1-07` fechamento, estorno imutável, relatórios, auditoria e segregação de funções.

## B2 — Projetos completos

- `B2-01` portfólio, projeto, milestone, board e templates;
- `B2-02` tarefas, subtarefas, dependências, recorrência e automações;
- `B2-03` recursos, capacidade, time tracking/timer e timesheets;
- `B2-04` aprovações, custos/orçamentos, arquivos, comentários e relatórios;
- `B2-05` integrações e vínculos seguros com CRM/ERP sem copiar PHI.

## B3 — CRM, marketing e site builder completos

- `B3-01` leads/contatos, pipeline, oportunidades, origem e atribuição;
- `B3-02` segmentos, campanhas, templates, automações e calendário de conteúdo;
- `B3-03` e-mail/WhatsApp/social/webchat por adapters, consentimento e opt-out separados do cuidado;
- `B3-04` lead scoring e analytics de campanha explicáveis;
- `B3-05` builder de páginas/blocos/tema/domínio/formulário com preview;
- `B3-06` publicação imutável no `public-edge`, CDN, versionamento e rollback;
- `B3-07` branding/white-label web, SEO, acessibilidade e segurança das superfícies públicas.

## B4 — Commerce e inventário completos

- `B4-01` catálogo, variantes, preços, promoções e impostos;
- `B4-02` carrinho, checkout, pedido, pagamento, assinatura, devolução e fulfillment;
- `B4-03` storefront no `public-edge` e histórico próprio no app paciente;
- `B4-04` item/local/lote/validade e ledger de movimentos;
- `B4-05` reserva, transferência, contagem, ajuste, compra e fornecedor;
- `B4-06` custo, margem, previsão de reposição e reconciliação ERP.

## B5 — SaaS e white-label completos

- `B5-01` onboarding assistido/self-service, convite, provisioning, ativação, suspensão e encerramento de organização;
- `B5-02` catálogo de planos/módulos, entitlements versionados e rollout, sempre separados de permissions;
- `B5-03` assinatura SaaS, ciclo de cobrança, pagamento, inadimplência, upgrade/downgrade, cancelamento, crédito e faturamento;
- `B5-04` metering, quotas, limites, overage, custo por tenant e degradação segura;
- `B5-05` console administrativo multi-tenant, busca restrita, suporte, sessão assistida/break-glass e auditoria reforçada;
- `B5-06` SLO por plano/jornada, status de serviço, incidentes, comunicação, runbooks e operação de suporte;
- `B5-07` temas, domínios, e-mails, documentos, portais, assets e configurações white-label isolados por tenant;
- `B5-08` estratégia de app compartilhado com branding dinâmico versus apps por marca, incluindo bundle IDs, contas Apple, builds, revisão, atualização, suporte e custo operacional;
- `B5-09` onboarding/importadores para futuros clientes como produto separado, sem acesso ou dependência dos dados atuais descartáveis.

## E1 — Gamificação completa

- `E1-01` rulesets/versionamento, pontos, níveis, conquistas e desafios;
- `E1-02` ranking com opt-in, pseudônimo, elegibilidade e controles de privacidade;
- `E1-03` moeda, wallet, loja, resgate e inventário virtual;
- `E1-04` antifraude, reversão, moderação e auditoria;
- `E1-05` experimentos de adesão sem penalizar cuidado, outcome ou acesso.

## A1 — Telemedicina e colaboração

- `A1-01` telehealth session, provedor adapter, sala/token e identidade dos participantes;
- `A1-02` consentimento, sala de espera, falha/fallback e documentação;
- `A1-03` gravação opcional, acesso, retenção e exclusão;
- `A1-04` Durable Objects para presença/colaboração e snapshots;
- `A1-05` conflitos, finalize/sign, auditoria e testes multiusuário.

## A2 — IA e agentes

- `A2-01` provider/model gateway, prompts versionados, custos e avaliações;
- `A2-02` ditado, resumo, busca com fonte e rascunhos revisáveis;
- `A2-03` ferramentas estreitas com capability, tenant scope, idempotência e audit trail;
- `A2-04` agentes para tarefas clínicas, administrativas, ERP, projetos e marketing com approval gates;
- `A2-05` prompt-injection/redaction tests, kill switch e observação de qualidade;
- `A2-06` proibir assinatura clínica ou ação irreversível autônoma.

## A3 — Wearables, biomecânica e Digital Twin

- `A3-01` consentimento, fonte/dispositivo, ingestão, unidade, qualidade e proveniência;
- `A3-02` HealthKit e fontes suportadas via app paciente;
- `A3-03` captura de pose/biomecânica, versão de algoritmo e validação;
- `A3-04` visualização de bruto × derivado × interpretação;
- `A3-05` modelo/versionamento, simulação, incerteza e evidência do Digital Twin;
- `A3-06` estudos piloto, revisão clínica, human approval e kill switch.

## P — Plataforma e extrações condicionais

- `P-01` criar `public-edge` junto da primeira publicação/formulário/checkout;
- `P-02` criar `jobs-integrations` junto do primeiro efeito assíncrono;
- `P-03` criar `realtime`, `ai` e `telehealth` somente com suas primeiras capacidades;
- `P-04` manter ports/adapters para Cloudflare/Neon e contratos de serviço;
- `P-05` separar deployable/banco somente após gate de segurança, runtime, escala, RPO/RTO, falha ou ownership;
- `P-06` canary/rollback, DLQ/replay, quotas, custos e observabilidade por deployable.

## G — Go-live greenfield e recuperação

- `G-01` criar produção Neon/R2 vazia, sem dump ou importação dos registros atuais;
- `G-02` executar journeys e permissions com personas e dados sintéticos;
- `G-03` remover/identificar seeds e impedir fixture em produção real;
- `G-04` ativar PITR/backup Neon e lifecycle/versionamento R2;
- `G-05` realizar restore drill integrado de Postgres, objetos e auditoria;
- `G-06` liberar cadastro de dados reais somente após gate Go/No-Go;
- `G-07` manter rollback de aplicação e estratégia expand/contract para o sistema novo.

## Fora do backlog

- grupos/turmas: nenhuma entidade, rota, feature flag ou placeholder;
- DICOM/PACS: nenhuma ingestão, worklist, viewer, study/series/instance ou integração correspondente.
