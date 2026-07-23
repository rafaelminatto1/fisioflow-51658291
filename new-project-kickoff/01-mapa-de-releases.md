# 01 — Mapa de releases

O mapa entrega uma **plataforma modular completa por ondas**. Todos os módulos descritos abaixo pertencem ao roadmap oficial; a ordem evita que amplitude de portfólio vire um único lançamento impossível de validar, operar ou proteger.

Cada onda exige owner, métricas, permissões, modelo de dados, integrações, observabilidade, suporte e critérios de interrupção. Um módulo pode permanecer desativado por organização até cumprir seu gate, mas não volta a ser “parking lot”.

## D0 — Descoberta e alvo do produto

**Resultado:** problema, usuário, modelo interno/SaaS e contexto de substituição validados antes de código amplo.

- decidir sequência entre uso interno e comercialização SaaS, além do ICP;
- observar atendimento e operação de recepção, clínica, financeiro, marketing e gestão;
- entrevistar admin, líder clínico, fisios, estagiários, pacientes e responsáveis pelos módulos administrativos;
- medir baseline disponível sem tratar os dados fictícios atuais como fonte de migração;
- testar protótipos de evolução rápida, “Seu plano de hoje”, Mapa de Resultados e torre de controle web;
- usar a esteira LLM + Stitch/Figma para gerar alternativas, consolidar o design system e validar fluxos sem dados reais;
- definir catálogo de módulos, dependências, onboarding, suporte e tempo até primeiro valor;
- registrar quais capacidades entram em cada superfície e quais permanecem exclusivas do web.

**Gate:** hipótese escolhida, owner, métrica, risco e critério de interrupção para a primeira onda.

## I0 — Fundação segura e greenfield

**Resultado:** ambiente reproduzível, identidade única, isolamento comprovado e base extensível para os módulos.

- monorepo, CI, observabilidade e ambientes;
- Workers separados para web/Assets, API e jobs + Neon como baseline a confirmar;
- logins separados para migrator de schema, auth resolver, staff, paciente e jobs, herdando capabilities `NOLOGIN` sem `BYPASSRLS`;
- auth staff/paciente, membership, estado `pending`, MFA efetivo e auditoria;
- schema/migration ledger único, catálogo de módulos e feature entitlements;
- OpenAPI, SDK, Problem Details, idempotência, outbox e eventos;
- R2 privado, retenção, consentimento e trilha de auditoria;
- fixtures e seeds integralmente sintéticos;
- nenhum dump, snapshot ou importação dos dados atuais do legado.

**Gate:** token sem membership não recebe organização default; leitura cross-org falha no banco e na API; restore de dados sintéticos funciona; nenhum dado real ou secret entra no repositório.

## I1 — Primeiro slice somente leitura

**Resultado:** login → listar/selecionar membership própria → clínica → lista paginada de pacientes → detalhe resumido.

- web desktop navegável;
- permissions clinic admin/clinical lead/recepção/profissional;
- busca, filtro e cursor;
- auditoria de acesso;
- fixtures sintéticas que cobrem papéis e tenants;
- contratos prontos para consumo pelos dois apps futuros.

**Gate:** contrato e SDK usados pelo web; accessibility, observabilidade e testes Org A × Org B passam.

## I2A — Jornada clínica mínima no web

**Resultado:** atendimento individual pode ser agendado, realizado e finalizado.

- agenda individual, disponibilidade, sala/recurso, feriado, bloqueio e conflito;
- status e recorrência canônicos;
- episódio mínimo com objetivo principal;
- sessão/evolução com rascunho, autosave, versão e finalização;
- uma medida validada por jornada;
- política de revisão do estagiário;
- testes de paridade comportamental com cenários sintéticos.

**Gate:** recepção agenda; fisio atende/finaliza; estagiário segue política; nenhuma atualização concorrente é perdida.

## I2B — Operação brasileira mínima

**Resultado:** o núcleo pode operar diariamente sem planilha paralela para o essencial.

- saldo e consumo atômico de pacote, pagamento simples e recibo;
- confirmação/lembrete WhatsApp, opt-out e kill switch;
- pré-cadastro/intake seguro;
- booking público sem fallback permissivo;
- check-in individual e no-show;
- waitlist de vaga individual + oferta após cancelamento;
- fila operacional separada do risco clínico.

Os módulos completos de ERP, CRM, marketing e automação entram em ondas posteriores sobre estes contratos.

## I2C — Resultados e documentos mínimos

**Resultado:** progresso e comunicação clínica são verificáveis.

- Mapa individual com uma medida/PROM e meta;
- avaliações e templates versionados;
- documentos e mídia privada com hash/retenção;
- termo/consentimento e política de liberação ao paciente;
- assinatura e link temporário quando necessário;
- retorno médico: pedido → pendente → relatório revisado/enviado → encerrado.

## I3A — HEP online em ciclo simples

**Resultado:** profissional prescreve e paciente consulta/executa sem app nativo obrigatório.

- biblioteca original/licenciada;
- protocolo e prescrição versionados;
- “Seu plano de hoje” responsivo;
- conclusão simples e check-in adaptativo;
- pedido estruturado “dúvida”/“informar piora” com SLA;
- Mapa individual incorpora adesão sem gerar diagnóstico.

## I3B — App paciente v1

**Resultado:** plano de hoje, HEP, próximo atendimento e check-in no iPhone.

- auth patient + self-RLS;
- plano de hoje, HEP, próximo atendimento, check-in e solicitações estruturadas;
- aceite único e sincronização contínua dos próximos agendamentos com Google, Outlook ou Apple, conforme a especificação dedicada;
- push neutro e deep links;
- logout, revogação e cache wipe;
- TestFlight, crash reporting e acessibilidade.

Financeiro, documentos, chat, telemedicina, wearables e gamificação entram no app em ondas próprias, quando os respectivos módulos estiverem prontos no backend. Calendários de staff, disponibilidade externa e CalDAV genérico permanecem na onda de ecossistema; este incremento cobre somente o calendário do paciente.

## I3C — Offline e progressão seletivos

**Resultado:** somente capacidades que precisam do contexto móvel funcionam offline.

- download controlado de HEP/mídia;
- execução enfileirada com idempotência;
- conflito, retry, TTL e revogação;
- progresso e marcos pessoais;
- medir fadiga de check-in e carga do profissional.

## I4 — Radar Clínico e Mapa de Resultados

**Resultado:** sinais explicáveis ajudam a equipe a agir e resultados longitudinais apoiam decisões.

- começar com três sinais de dados confiáveis;
- fila clínica com owner, severidade e justificativa;
- fila operacional/financeira independente;
- coortes e benchmarks somente com volume, finalidade e proteção contra reidentificação;
- medir falso positivo, ação e desfecho;
- kill switch e revisão periódica.

## I5 — App profissional v1

**Resultado:** agenda do dia, resumo e evolução segura no iPhone.

- agenda do dia;
- resumo pré-sessão mínimo;
- rascunho protegido, ditado, revisão e finalização online;
- TestFlight, observabilidade e permissions;
- medidas, fotos, HEP, Radar e offline em incrementos próprios.

## O6 — ERP, fiscal, estoque e operação completos

**Resultado:** a clínica administra integralmente sua operação financeira e física no web.

- contas a pagar/receber, caixa, conciliação, categorias e centros de custo;
- pacotes, pagamentos, cobranças, comissões, recibos, vouchers, contratos e DRE;
- convênios, repasses e relatórios aplicáveis ao ICP;
- NFS-e com provedor, reconciliação, contingência e trilha fiscal;
- fornecedores, compras, pedidos, estoque físico, lotes, validade, movimentações e inventário;
- eventos, parceiros, prestadores e recursos físicos;
- dashboards financeiros e operacionais acionáveis;
- exportação e integração contábil quando for mais seguro que reproduzir obrigação regulatória internamente.

**Gate:** reconciliação financeira, segregação de funções, competência fiscal, idempotência de cobrança e acurácia de estoque passam com cenários sintéticos antes de dados reais.

## O7 — Projetos, produtividade e colaboração completos

**Resultado:** equipes administram trabalho complexo dentro da plataforma ou por integrações bidirecionais.

- projetos, boards, Kanban, colunas, dependências e recorrência;
- subtarefas, responsáveis, prioridades, comentários, arquivos e automações;
- time tracking, capacidade, apontamentos e relatórios;
- integrações Jira, Asana e Monday com mapeamento, idempotência e reconciliação;
- colaboração simultânea Yjs onde edição concorrente trouxer valor;
- notificações e trilha de auditoria por ação.

**Gate:** conflitos, permissões, ownership, sincronização e custos de colaboração estão observáveis e testados.

## O8 — CRM, marketing e aquisição completos

**Resultado:** aquisição, relacionamento e retenção funcionam de ponta a ponta.

- CRM omnichannel com WhatsApp, Instagram, webchat, e-mail, contatos, leads, funil, scoring, roteamento e SLA;
- templates, campanhas, segmentos, jornadas, recall, reativação, aniversário, indicação, NPS e automações;
- calendário editorial, aprovação, geração assistida de conteúdo e publicação em canais autorizados;
- website builder, landing pages, formulários, domínio e analytics de aquisição;
- consentimento, opt-out, frequency caps, atribuição e governança de marca;
- nenhum conteúdo clínico ou promocional é copiado sem licença.

**Gate:** consentimento e revogação prevalecem sobre automações; publicação exige aprovação adequada; campanhas têm owner, custo e critério de interrupção.

## O9 — SaaS e white-label

**Resultado:** outras clínicas podem contratar, configurar e operar módulos com isolamento e identidade visual próprios.

- onboarding e provisionamento de organizações;
- catálogo, entitlement e billing de assinatura por módulo;
- administração multi-cliente, suporte, limites, uso e custo por tenant;
- marca, temas, e-mails, documentos, domínio e portal white-label;
- estratégia explícita para app compartilhado com branding dinâmico ou app separado por clínica;
- importadores opcionais como produto de onboarding, sem depender dos dados atuais descartáveis.

**Gate:** ICP, preço, suporte, SLO, incidentes, isolamento e operação na App Store estão definidos antes da comercialização.

## O10 — Engajamento e gamificação completos

**Resultado:** pacientes e equipes usam mecânicas de engajamento transparentes, configuráveis e seguras.

- XP, conquistas, quests, desafios, streaks e níveis;
- moedas, loja, catálogo de recompensas, inventário virtual e resgates;
- leaderboard individual, por período ou comunidade permitida, sem criar funcionalidade de turma;
- regras antifraude, moderação, expiração e auditoria econômica;
- metas clínicas não podem ser distorcidas por recompensa ou comparação inadequada.

**Gate:** consentimento, segurança para populações vulneráveis, efeito sobre adesão e possibilidade de desativação por organização estão validados.

## O11 — Telemedicina, comunicação e apps expandidos

**Resultado:** cuidado remoto e experiências móveis complementam o atendimento presencial com segurança.

- telemedicina autenticada, consentimento, sala privada, prontuário e encerramento;
- chat e solicitações com triagem, SLA, owner e orientação de urgência;
- modo cuidador com delegação, validade e revogação;
- documentos, pagamentos, Mapa de Resultados e gamificação no app paciente;
- HEP, medidas, fotos, Radar, tarefas e colaboração adequada no app profissional;
- offline somente para jornadas selecionadas, nunca para decisão irreversível sem reconciliação.

**Gate:** adequação clínica, privacidade, capacidade de resposta, fallback e suporte móvel estão comprovados.

## O12 — IA, conhecimento e agentes governados

**Resultado:** inteligência reduz trabalho e melhora acesso à evidência sem retirar responsabilidade humana.

- ditado, resumo, classificação, busca semântica e geração de rascunhos;
- Evidence Gateway com fontes científicas, citações, versão e data;
- wiki/base de conhecimento original ou licenciada, com curadoria e revisão;
- agentes especializados para clínica, agenda, relacionamento, financeiro, marketing, projetos, suporte e analytics;
- autonomia operacional somente por política explícita, escopo mínimo, orçamento, aprovação quando necessária, auditoria e rollback;
- avaliação de qualidade, custo, latência, alucinação e impacto por agente.

**Gate:** nenhuma ação clínica é assinada por IA; ações financeiras, publicações e mudanças irreversíveis exigem níveis de aprovação definidos.

## O13 — Biomecânica, visão, wearables e Digital Twin

**Resultado:** recursos clínicos avançados entram como produtos validados, não como demonstrações tecnológicas.

- captura biomecânica, protocolos, calibração, análise, comparação, anotação e laudo;
- pose detection e visão computacional no app profissional e em exercícios selecionados do paciente;
- HealthKit, Google Fit, Strava, Oura, Garmin e outras fontes aprovadas;
- consentimento granular, finalidade, qualidade do sinal, revogação e retenção;
- Digital Twin, risco preditivo e simulações com dataset governado, validação externa, explicabilidade e monitoramento de drift;
- todo resultado é suporte à decisão, nunca diagnóstico ou conduta autônoma.

**Gate:** precisão, utilidade clínica, vieses, população elegível, dispositivo suportado e protocolo de falha são aprovados pelo responsável clínico.

## Inicialização e entrada em produção

Não existe migração de dados nem cutover do banco atual. Os dados legados foram declarados fictícios e descartáveis.

1. reconstruir regras úteis a partir do dossiê e do código, sem copiar dívida;
2. criar schema novo apenas por migrations versionadas;
3. popular desenvolvimento, demonstração e testes com seeds sintéticos;
4. validar jornadas, permissões, segurança e integrações por onda;
5. iniciar a produção nova vazia ou com cadastros criados conscientemente no próprio produto;
6. habilitar backup, PITR, retenção e restore drills antes do primeiro dado real;
7. desligar o legado após a referência funcional deixar de ser necessária, sem transportar seus dados.

## Exclusões definitivas

- grupos, turmas, aulas coletivas, matrículas, check-in coletivo e waitlist de turma;
- DICOM, PACS, Orthanc, worklist e armazenamento de estudos DICOM.

Waitlist de vaga individual, documentos, fotos, vídeos, exames em formatos comuns e telemedicina continuam no escopo.
