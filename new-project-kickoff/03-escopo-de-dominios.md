# 03 — Escopo de domínios

## Diretriz de portfólio

O FisioFlow será uma **plataforma modular completa**. “Completo” significa que cada domínio aprovado possui fluxo de ponta a ponta, permissões, regras, dados, integrações, relatórios e operação próprios; não significa colocar todos os módulos no primeiro release nem reproduzir cada detalhe em todos os aplicativos.

O web desktop é a superfície completa. Os apps iPhone profissional e paciente recebem recortes focados nas jornadas de cada persona. Todos os módulos entram por ondas e podem ser ativados por organização conforme entitlement, maturidade operacional e gates de segurança.

## Fundação transversal

| Domínio | Capacidades completas | Observação |
|---|---|---|
| Identidade | auth staff/paciente, MFA, recovery, sessões, dispositivos e revogação | emissor único; audiences e políticas distintas |
| Organizações | tenant, unidades, memberships, convites, aprovação, papéis e permissions | RLS real e deny by default |
| Administração SaaS | provisioning, catálogo de módulos, entitlement, billing, limites, uso e suporte | entra na onda SaaS, mas o isolamento nasce na fundação |
| White-label | marca, temas, domínio, e-mails, documentos, portal e estratégia de app | não implica um app separado por clínica sem decisão operacional |
| Auditoria e LGPD | acesso clínico, consentimento, retenção, legal hold, exportação e exclusão | requisito transversal e append-only onde aplicável |
| Plataforma | OpenAPI/SDK, idempotência, outbox, eventos, jobs, feature flags e observabilidade | contratos comuns, runtimes e grants separados |

## Cuidado clínico

| Domínio | Capacidades completas | Observação |
|---|---|---|
| Paciente e intake | cadastro, contatos, pré-cadastro, contexto clínico, vínculo de portal e cuidador | modelo canônico, sem duplicatas PT/EN |
| Episódio clínico | objetivo, plano, estado, equipe, alta e abandono | agregado longitudinal central |
| Agenda individual | disponibilidade, salas, recursos, recorrência, conflitos, feriados, status, check-in, no-show, booking, waitlist individual e sincronização do calendário do paciente | nenhuma entidade ou jornada coletiva; calendário pessoal é unidirecional e consentido |
| Avaliações e prontuário | história, cirurgias, patologias, exame físico, formulários, templates, mapas de dor e respostas | dados estruturados e texto possuem proveniência |
| Sessão e evolução | rascunho, autosave, versão, revisão, colaboração Yjs, ditado, finalização e assinatura | IA nunca assina; edição concorrente é auditada |
| Medidas e resultados | PROMs, testes, baseline, follow-up, metas, coortes e benchmarks | small-cell suppression e finalidade explícita |
| HEP e exercícios | biblioteca, mídia, protocolos, prescrição, execução, feedback, adesão e progressão | conteúdo original/licenciado e ciclo fechado |
| Documentos | termos, atestados, contratos, relatórios, anexos, assinatura e compartilhamento temporário | controle de versão, hash, retenção e acesso |
| Retorno médico | pedido, pendência, geração, revisão, envio e encerramento | consentimento e destinatário auditados |
| Radar Clínico | regras explicáveis, filas, responsável, ação, descarte e desfecho | não mistura severidade clínica com receita |
| Telemedicina | agendamento, sala privada, consentimento, sessão, registro e encerramento | provedor seguro; sem sala pública anônima |

## Gestão, operação e crescimento

| Domínio | Capacidades completas | Observação |
|---|---|---|
| ERP financeiro e fiscal | contas a pagar/receber, caixa, conciliação, centros de custo, DRE, pacotes, pagamentos, cobrança, comissões, recibos, vouchers, contratos e relatórios | segregação de funções e reconciliação |
| NFS-e e convênios | configuração fiscal, emissão, cancelamento, consulta, contingência, repasses e relatórios aplicáveis | usar provedor/adapters; obrigação regulatória validada por competência própria |
| Inventário físico e compras | fornecedores, produtos/insumos, pedidos, recebimento, lotes, validade, estoque mínimo, movimentos e inventário | separado do inventário virtual da gamificação |
| CRM omnichannel | WhatsApp, Instagram, webchat, e-mail, contatos, leads, funil, scoring, roteamento, SLA, templates e automações | consentimento e opt-out prevalecem |
| Marketing | segmentos, campanhas, recall, reativação, aniversário, indicação, NPS, calendário, conteúdo, publicação e analytics | geração assistida exige aprovação e marca governada |
| Website builder | páginas, landing pages, formulários, domínio, SEO técnico, publicação e métricas | dados de saúde não entram em analytics publicitário |
| Projetos | portfólios, projetos, boards, Kanban, colunas, dependências, subtarefas, recorrência, arquivos, comentários e automações | módulo genérico completo com permission própria |
| Time tracking | apontamentos, capacidade, aprovação, custo, relatório e vínculo com projetos | não confundir com tempo clínico do prontuário |
| Produtividade externa | integrações Jira, Asana e Monday | sync bidirecional idempotente e reconciliável |
| Eventos e parceiros | eventos, prestadores, parceiros, contratos, agenda e operação | fronteira própria, sem criar turmas clínicas |
| Analytics e BI | métricas clínicas, operacionais, financeiras, comerciais, projetos, estoque e uso SaaS | projeções reconstruíveis e acionáveis |

## Engajamento

| Domínio | Capacidades completas | Observação |
|---|---|---|
| Gamificação | XP, níveis, quests, achievements, desafios, streaks, moedas e regras de progressão | configurável por organização e sem induzir conduta inadequada |
| Loja e recompensas | catálogo, preços, resgates, expiração, antifraude e auditoria | benefício econômico real exige análise jurídica/fiscal própria |
| Inventário virtual | itens adquiridos, consumíveis, histórico e validade | não compartilha tabelas com estoque físico |
| Leaderboard | rankings individuais e segmentações permitidas | nunca cria grupos/turmas ou expõe dado clínico |
| NPS e indicações | pesquisas, triggers, satisfação, códigos, conversão e recompensas | consentimento e prevenção de abuso |

## Inteligência e capacidades clínicas avançadas

| Domínio | Capacidades completas | Observação |
|---|---|---|
| IA assistiva | ditado, resumo, classificação, busca, sugestão e rascunhos | revisão humana e diff para conteúdo clínico |
| Base de conhecimento | wiki, artigos, versões, fontes, citações, curadoria, busca semântica e RAG | somente material original ou licenciado |
| Agentes | agentes especializados para clínica, agenda, CRM, marketing, ERP, projetos, suporte e analytics | escopo, orçamento, aprovação, auditoria e rollback por ferramenta |
| Biomecânica | captura, protocolo, calibração, análise, comparação, anotação, laudo e armazenamento de mídia comum | não inclui DICOM/PACS |
| Pose e visão computacional | detecção, feedback, qualidade, fallback e revisão | consentimento para vídeo e protocolo de erro |
| Wearables | HealthKit, Google Fit, Strava, Oura, Garmin, OAuth, ingestão e normalização | finalidade clínica e qualidade do sinal explícitas |
| Digital Twin e ML | snapshots autorizados, features, modelos, risco, simulação, explicabilidade e drift | suporte à decisão; nunca diagnóstico ou conduta autônoma |
| Evidence Gateway | PubMed, Europe PMC, OpenAlex e outras fontes aprovadas | evidência citada, datada e contextualizada |

## Produtos e fronteiras de superfície

### Web desktop — plataforma completa

O web oferece todos os módulos contratados e autorizados: clínica, ERP, estoque, projetos, marketing, website builder, CRM, analytics, SaaS/white-label, colaboração e administração das capacidades avançadas.

### App iPhone profissional — trabalho do dia

- agenda, contexto pré-sessão, evolução, avaliações e medidas;
- ditado, fotos, HEP, Radar, retorno médico e documentos necessários em campo;
- tarefas, comunicação e apontamentos de tempo relevantes ao profissional;
- telemedicina, biomecânica, pose e wearables quando o dispositivo for parte da jornada;
- offline seletivo, sem configuração completa de ERP, marketing, SaaS ou website no celular.

### App iPhone paciente — plano e relacionamento

- plano do dia, HEP, progresso, medidas permitidas e próximo atendimento;
- sincronização consentida dos próximos agendamentos com Google, Outlook ou Calendário Apple/iCloud;
- check-in, solicitações, chat/telemedicina com SLA e orientação de urgência;
- documentos, pagamentos, recibos e preferências;
- wearables, gamificação, loja, moedas, inventário virtual e leaderboard quando ativados;
- modo cuidador com relação, escopo, validade, revogação e consentimento.

## Canonicalizar sem reduzir o escopo

Completo não significa duplicado. A reconstrução deve manter:

- uma autenticação e um bootstrap de contexto;
- um vocabulário e um schema canônicos por capacidade;
- um trilho financeiro, um CRM, um motor de tarefas e um inventário de cada tipo;
- uma base de conhecimento com proveniência;
- um catálogo de agentes, modelos e políticas;
- um pipeline iOS canônico;
- contratos públicos entre módulos, sem acesso transversal a tabelas internas.

Trilhos PT/EN, versões concorrentes de WhatsApp, endpoints órfãos, cron jobs mortos, mocks, POCs e falhas do legado não são “módulos completos” e não devem ser reproduzidos.

## Capacidades com gate obrigatório

As capacidades abaixo pertencem ao roadmap oficial, mas só podem ser ativadas após seu gate:

- biomecânica, pose detection e visão computacional: precisão, protocolo, consentimento e revisão clínica;
- Digital Twin e risco preditivo: dataset governado, validação, explicabilidade, viés e drift;
- wearables: finalidade, qualidade do sinal, revogação e retenção;
- telemedicina: adequação clínica, sala privada, consentimento, prontuário e suporte;
- NFS-e e obrigações fiscais: provedor, contingência, reconciliação e competência regulatória;
- colaboração simultânea: conflito, versionamento, ownership e custo operacional;
- marketing/publicação: consentimento, aprovação, marca e opt-out;
- gamificação econômica: antifraude, segurança clínica e análise jurídica/fiscal;
- agentes: permissões por ferramenta, limites, aprovação, auditoria e reversibilidade;
- benchmark entre clínicas: volume mínimo, finalidade e proteção contra reidentificação;
- white-label: suporte, atualização, domínio, isolamento e estratégia de distribuição móvel.

Gate não significa “sem roadmap”: significa que o épico existe, mas a ativação depende de evidência e controles proporcionais ao risco.

## Exclusões definitivas

- grupos, turmas, aulas coletivas, matrículas, presença coletiva e waitlist de turma;
- DICOM, PACS, Orthanc, worklist e armazenamento/transmissão de estudos DICOM;
- conteúdo copiado ou apenas parafraseado da E-Fisio, concorrentes ou bibliotecas sem licença;
- duplicidades, órfãos, mocks, POCs inseguras e credenciais/implementações do legado.

As duas primeiras são exclusões de produto. As duas últimas são guardrails de propriedade intelectual e qualidade, não retirada de capacidade: a plataforma mantém base de conhecimento original/licenciada, mídia clínica comum, documentos e exames em formatos usuais.

## Dados legados

Os dados atuais foram declarados fictícios e descartáveis. Não haverá migração, backfill, reconciliação histórica, operação paralela ou backup do banco legado para a reconstrução. O modelo novo nasce de migrations versionadas e seeds sintéticos.

Quando o sistema novo começar a receber dados reais, passam a valer backup, PITR, retenção, auditoria, legal hold e restore drills proporcionais ao tipo de dado.
