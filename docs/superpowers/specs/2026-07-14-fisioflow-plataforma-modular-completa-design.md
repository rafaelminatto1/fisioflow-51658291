# FisioFlow — Plataforma modular completa

**Data:** 2026-07-14  
**Status:** aprovado pelo proprietário  
**Tipo:** desenho de produto, arquitetura e programa de reconstrução greenfield

## Decisão

O FisioFlow será reconstruído como uma **plataforma modular completa**, com web desktop, app iPhone para profissionais e app iPhone para pacientes. Os módulos aprovados pertencem ao destino do produto e serão entregues por ondas; “completo” não significa lançar tudo simultaneamente.

A estratégia escolhida é uma **arquitetura modular híbrida**:

- monorepo e monólito modular para o núcleo transacional enquanto isso reduzir custo e risco;
- contratos, eventos, permissões e propriedade de dados explícitos entre domínios;
- deployables separados somente quando exposição pública, runtime, segurança, escala ou ciclo operacional justificarem;
- Cloudflare como plataforma de execução e Neon Postgres como fonte transacional principal;
- web como superfície administrativa completa;
- apps móveis focados nas jornadas e permissões de cada persona, sem reproduzir telas irrelevantes do backoffice.

## Escopo aprovado

### Plataforma e SaaS

- identidade de staff e pacientes, organizações, unidades, memberships, MFA, RBAC e RLS;
- administração da plataforma, onboarding, entitlements, billing SaaS e feature flags;
- white-label de marca, domínio, comunicações, documentos e sites;
- apps dedicados por marca somente como oferta enterprise posterior, devido ao custo operacional de múltiplos binários;
- auditoria, LGPD, consentimentos, retenção, exportação e exclusão governada.

### Clínica e continuidade do cuidado

- pacientes, cuidadores autorizados, prontuário, episódios, objetivos, planos, alta e abandono;
- agenda individual, recorrência, disponibilidade, salas, recursos, conflitos, check-in, no-show, booking público, waitlist individual e sincronização contínua do calendário do paciente;
- avaliações, exame físico, PROMs, testes, medidas, mapas de dor, evoluções, supervisão, assinatura, ditado e colaboração simultânea;
- documentos, mídia, relatórios, termos, assinatura e comunicação com encaminhadores;
- exercícios, protocolos, prescrições, HEP, adesão, progressão e feedback;
- telemedicina segura, biomecânica, pose detection, visão computacional, wearables, HealthKit e Digital Twin;
- Radar Clínico, Mapa de Resultados, coortes e benchmarks com governança estatística.

### Gestão empresarial completa

- ERP financeiro e gerencial: plano de contas, razão, contas a pagar e receber, caixa, conciliação, centros de custo, orçamento, DRE, compras, aprovações, comissões, pacotes, cobranças e relatórios;
- fiscal e NFS-e, construídos sobre o financeiro estabilizado e isolados por adaptadores de município/provedor;
- portfólio e projetos: projetos, tarefas, dependências, quadros, capacidade, apontamento de horas, aprovações, custos e integrações;
- CRM e marketing: contatos, leads, funil, scoring, segmentação, campanhas, automações, WhatsApp, e-mail, Instagram, webchat, conteúdo, SEO, landing pages e website builder;
- comércio: catálogo, variantes, preços, checkout, pedidos, pagamentos, cancelamentos e devoluções;
- inventário físico: depósitos, fornecedores, compras, lotes, validade, reservas e movimentações;
- gamificação: XP, níveis, missões, conquistas, streaks, moedas virtuais, loja, inventário virtual, recompensas e leaderboard;
- analytics e BI clínico, operacional, financeiro, comercial e de produto.

### Conhecimento e inteligência

- wiki e base de conhecimento com conteúdo original, de domínio público compatível ou devidamente licenciado;
- busca científica, RAG, copilotos e múltiplos agentes especializados;
- agentes limitados por ferramentas, escopo, orçamento, auditoria e aprovação humana;
- nenhuma IA diagnostica, assina evolução, altera conduta clínica ou executa ação financeira irreversível sem responsável humano.

## Exclusões definitivas

- grupos, turmas, aulas coletivas, matrículas, check-in coletivo e waitlist de turma;
- DICOM, PACS, Orthanc, worklists ou armazenamento de estudos DICOM;
- conteúdo copiado ou apenas parafraseado sem licença ou autorização;
- tabelas, APIs e fluxos duplicados do legado, mocks tratados como requisito, recursos órfãos e implementações inseguras.

Imagens comuns, vídeos, PDFs, laudos e anexos clínicos continuam incluídos. A exclusão de DICOM/PACS não remove o gerenciamento normal de documentos e mídia.

## Produtos e fronteiras

### Web desktop

É a superfície completa da plataforma: clínica, backoffice, ERP, projetos, CRM/marketing, site builder, comércio, inventário, gamificação, analytics, SaaS e configuração. Cada usuário vê apenas módulos e dados autorizados.

### App profissional para iPhone

Prioriza trabalho em movimento: agenda, paciente, prontuário, avaliação/evolução, ditado, mídia, HEP, telemedicina, tarefas, comunicação, aprovações e alertas. Capacidades administrativas podem ser acrescentadas quando houver uma jornada móvel real; o app não precisa espelhar toda a web.

### App paciente para iPhone

Prioriza autocuidado e relacionamento: agenda, aceite único para sincronizar próximos agendamentos com Google/Outlook/Apple, HEP, progresso, check-ins, telemedicina, mensagens, documentos, pagamentos, loja, recompensas, integrações de saúde e consentimentos. Nunca expõe backoffice ou dados de outros pacientes.

## Design e layout conduzidos por IA

A LLM conduzirá briefing, arquitetura de informação, fluxos, direção visual, design system, layouts, protótipos, implementação e validação. O proprietário não precisa desenhar ou operar as ferramentas manualmente.

A esteira aprovada usa:

- Google Stitch MCP para exploração rápida de conceitos e variações;
- Figma MCP remoto oficial como fonte de verdade editável, incluindo frames, componentes, variáveis, Auto Layout, protótipos e integração design↔código;
- skills `frontend-design`, React e React Native para implementação;
- DevTools/Playwright para responsividade, acessibilidade, comportamento e regressão visual;
- dados exclusivamente sintéticos em qualquer ferramenta externa.

O processo completo, os gates e a organização dos artefatos estão em `new-project-kickoff/design/ai-design-workflow.md`.

## Arquitetura alvo

Deployables iniciais recomendados:

- `web`: web desktop e assets estáticos, sem acesso direto ao banco;
- `api-platform`: API versionada e módulos transacionais;
- `public-edge`: booking, formulários, landing pages, sites publicados e storefront, sem acesso direto a prontuário;
- `jobs-integrations`: filas, webhooks, calendários externos, WhatsApp, e-mail, pagamentos, NFS-e e automações;
- `realtime`: colaboração, presença e coordenação stateful por Durable Objects, incluindo serialização de efeitos externos quando necessária;
- `ai`: gateway, copilotos e agentes com ferramentas limitadas;
- `telehealth`: ciclo de salas, tokens, consentimentos e gravações por adaptador;
- `professional-app` e `patient-app`: clientes iOS separados, compartilhando SDK, tipos e design tokens.

Primitivas:

- Workers e Static Assets para web, APIs e superfícies públicas;
- Neon Postgres como fonte transacional única inicial, com roles distintas, RLS `default deny` e branches isolados para desenvolvimento e preview;
- R2 privado para documentos, mídia e assets, com acesso temporário e versionamento quando aplicável;
- Queues para entrega assíncrona; Workflows para processos longos ou com espera; Durable Objects somente para coordenação stateful/realtime;
- transactional outbox antes da publicação de eventos;
- KV somente para configuração ou cache não clínico;
- contratos OpenAPI, SDK gerado e eventos versionados.

Referências atuais consultadas: [Cloudflare Workers](https://developers.cloudflare.com/workers/), [Cloudflare Workflows](https://developers.cloudflare.com/workflows/), [Cloudflare R2](https://developers.cloudflare.com/r2/) e [Neon branching](https://neon.com/docs/introduction/branching).

## Estratégia de dados greenfield

Os registros do sistema atual são dados de teste e **não serão migrados**:

- sem dump, backup, exportação, transformação, reconciliação, CDC, freeze ou cutover de dados legados;
- banco alvo novo e vazio;
- seeds, fixtures, exemplos e testes exclusivamente sintéticos;
- o legado permanece somente como evidência de comportamento, regras e riscos até a reconstrução dessas capacidades;
- nenhuma mídia, `.env`, secret, captura ou dado identificável é copiado para o repositório novo.

Antes do primeiro dado real, tornam-se obrigatórios PITR/backups, versionamento de objetos conforme classificação, teste de restauração, retenção e runbook de incidente. “Sem backup” vale apenas para o conteúdo atual descartável.

## Ondas do programa

### Onda 0 — Decisões e fundação

Charter, ICP/modelo inicial, arquitetura, identidade, tenancy, RBAC/RLS, LGPD, auditoria, OpenAPI/SDK, design system, CI/CD, observabilidade, arquivos, eventos, ambientes e dados sintéticos.

### Onda 1 — Núcleo clínico e três superfícies

Primeiro fluxo vertical: login → contexto autorizado → paciente → agendamento → atendimento/evolução → prescrição → visualização pelo paciente. Depois de identidade do paciente, agenda canônica, consentimento, outbox/Queue e RLS, a Onda 1 inclui o aceite e a sincronização dos próximos agendamentos do paciente com Google, Outlook ou Apple. Web primeiro; apps incorporam as APIs estabilizadas.

### Onda 2 — Comunicação, colaboração e conteúdo

CRM operacional, WhatsApp, colaboração realtime, documentos, telemedicina e base de conhecimento original/licenciada.

### Onda 3 — Gestão empresarial completa

ERP, projetos/time tracking, CRM e marketing completos, website builder, administração SaaS e white-label.

### Onda 4 — Comércio e engajamento

Catálogo, pedidos, pagamentos, inventário físico, gamificação, moedas, loja, inventário virtual e leaderboard.

### Onda 5 — Fiscal e ecossistema

NFS-e, integrações bancárias, pagamentos, redes sociais, calendários de staff, disponibilidade externa, CalDAV genérico, parceiros e conectores amplos. A sincronização específica do calendário do paciente já pertence à Onda 1.

### Onda 6 — Inteligência clínica avançada

Agentes, biomecânica, pose detection, wearables, modelos preditivos e Digital Twin. Recursos clínicos experimentais exigem validação, monitoramento e capacidade de desligamento.

## Dependências obrigatórias

- identidade, tenancy, permissões e auditoria precedem qualquer módulo;
- ERP estabilizado precede NFS-e e contabilidade automatizada;
- catálogo, pagamentos e livros financeiros precedem loja e moedas;
- CMS, domínios e branding precedem website builder e white-label;
- agenda, consentimento, mídia e prontuário precedem telemedicina;
- identidade do paciente, agenda canônica, consentimento específico, RLS e outbox precedem sincronização com calendário pessoal;
- APIs autorizadas, eventos, avaliações e aprovação humana precedem agentes;
- modelo temporal e consentimento precedem wearables;
- ontologia clínica, dados longitudinais confiáveis e validação precedem Digital Twin;
- biomecânica e pose detection não orientam conduta automaticamente antes de validação clínica.

## Gates transversais

Antes de dados reais e a cada novo domínio:

- testes Org A × Org B na API e com role Postgres `NOBYPASSRLS`;
- matriz de permissões e segregação de funções;
- classificação, finalidade, base legal, retenção e consentimento;
- nenhum dado sensível em push, URL pública, cache compartilhado, log ou analytics;
- auditoria de leitura/escrita, exportação, consentimento e ação de agente;
- idempotência, outbox, retries, DLQ e reconciliação para efeitos externos;
- acessibilidade, observabilidade, rollback e kill switch;
- PITR/restore testado antes do primeiro paciente real.

## Critério de sucesso desta decisão

A especificação é consistente quando:

1. nenhum módulo aprovado permanece em “não reconstruir” ou “parking lot sem roadmap”;
2. grupos/turmas e DICOM/PACS não recebem tabela, API, tela, backlog ou placeholder;
3. a estratégia de dados descreve início limpo, sem migração do conteúdo atual;
4. web completa e apps por persona aparecem de forma consistente;
5. todos os módulos têm dependências, onda e gates, sem antecipar microserviços;
6. o dossiê AS-IS permanece histórico e não é reescrito como se o legado já tivesse a arquitetura alvo.
7. a esteira de design permite à LLM criar, implementar e validar interfaces sem expor dados reais.
8. a sincronização do calendário do paciente está na Onda 1, enquanto integrações amplas de staff/ecossistema permanecem na Onda 5.

## Próximo passo após esta especificação

Revisar o kit `new-project-kickoff/`, fechar as decisões realmente bloqueantes e gerar um plano executável somente para a Onda 0 e o primeiro slice da Onda 1. O novo repositório e qualquer provisionamento externo exigem autorização separada.
