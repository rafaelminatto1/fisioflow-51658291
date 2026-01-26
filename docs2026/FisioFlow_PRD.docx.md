

# **FisioFlow v3.0**

Sistema de Gestão para Clínicas de Fisioterapia Esportiva

**Product Requirements Document (PRD)**

*Documento de Requisitos do Produto*

| Campo | Valor |
| ----- | ----- |
| Versão do Documento | 1.0 |
| Data | Dezembro 2025 |
| Autor | Activity Fisioterapia |
| Status | Em Desenvolvimento |
| Stakeholders | Rafael (Owner), Equipe Técnica |

**Activity Fisioterapia**  
São Paulo, Brasil

# **Sumário**

1\. Visão Geral do Produto  
2\. Problema e Oportunidade  
3\. Objetivos e Métricas de Sucesso  
4\. Personas e Usuários  
5\. Escopo do Produto  
6\. User Stories  
7\. Requisitos Funcionais  
8\. Requisitos Não-Funcionais  
9\. Arquitetura e Stack Técnica  
10\. Integrações  
11\. Roadmap e Fases  
12\. Riscos e Mitigações  
13\. Critérios de Aceitação  
14\. Apêndices

# **1\. Visão Geral do Produto**

## **1.1 Declaração de Visão**

*O FisioFlow v3.0 será o sistema de gestão mais completo e intuitivo para clínicas de fisioterapia esportiva no Brasil, reduzindo no-shows em 30%, aumentando a receita em 15-20% e proporcionando uma experiência excepcional para pacientes e profissionais através de automação inteligente e comunicação integrada via WhatsApp.*

## **1.2 Resumo Executivo**

O FisioFlow v3.0 é um sistema web completo de gestão para clínicas de fisioterapia esportiva, desenvolvido especificamente para a Activity Fisioterapia. O sistema integra agendamento inteligente, prontuário eletrônico com mapa de dor interativo, comunicação automatizada via WhatsApp Business API oficial, gestão financeira com pacotes de sessões, e prescrição de exercícios com acompanhamento.

## **1.3 Contexto de Negócio**

| Métrica | Valor Atual | Meta com FisioFlow |
| ----- | ----- | ----- |
| Atendimentos/mês | 600 | 700+ (16% ↑) |
| Taxa de no-show | \~25-30% | \<15% (50% ↓) |
| Tempo agendamento | 5-10 min | \<2 min |
| Confirmação manual | 100% | \<20% |
| Recuperação cancelamentos | \~10% | \>60% |
| Tempo evolução SOAP | 15-20 min | \<10 min |

# **2\. Problema e Oportunidade**

## **2.1 Problemas Identificados**

### **Problema 1: Alta Taxa de No-Show**

* Pacientes esquecem consultas agendadas  
* Confirmação manual consome tempo da recepção  
* Horários vagos não são preenchidos  
* Perda estimada: R$ 9.000-13.500/mês (60-90 no-shows × R$ 150\)

### **Problema 2: Gestão Ineficiente de Agenda**

* Agendamento manual propenso a erros  
* Conflitos de horário  
* Dificuldade de reagendamento  
* Lista de espera informal (papel/WhatsApp pessoal)

### **Problema 3: Prontuário Fragmentado**

* Informações em múltiplos locais (papel, planilha, sistema legado)  
* Dificuldade de visualizar evolução do paciente  
* Sem padronização (SOAP)  
* Mapa de dor feito em papel, difícil de comparar

### **Problema 4: Controle Financeiro Manual**

* Pacotes controlados em planilha  
* Sessões não debitadas automaticamente  
* Dificuldade em saber saldo de sessões  
* Pacotes expiram sem aviso

## **2.2 Oportunidade de Mercado**

O mercado de fisioterapia esportiva no Brasil está em crescimento, com aumento da conscientização sobre prevenção de lesões e reabilitação. Clínicas que adotam tecnologia para gestão têm vantagem competitiva significativa.

| Oportunidade | Impacto Potencial |
| ----- | ----- |
| Redução de no-show de 30% para 15% | R$ 4.500-6.750/mês recuperados |
| Lista de espera automatizada | R$ 4.500/mês em slots recuperados |
| Pacotes com débito automático | Redução de inadimplência em 50% |
| Fidelização via app de exercícios | Aumento de 20% em renovações |

# **3\. Objetivos e Métricas de Sucesso**

## **3.1 Objetivos Primários (OKRs)**

**Objetivo 1: Reduzir perdas por no-show**

| Key Result | Baseline | Meta | Prazo |
| ----- | ----- | ----- | ----- |
| Taxa de no-show | 25-30% | \<15% | 3 meses pós-launch |
| Taxa de confirmação | \~40% | \>85% | 1 mês pós-launch |
| Slots recuperados (lista espera) | \~5/mês | \>30/mês | 3 meses pós-launch |

**Objetivo 2: Aumentar eficiência operacional**

| Key Result | Baseline | Meta | Prazo |
| ----- | ----- | ----- | ----- |
| Tempo médio agendamento | 5-10 min | \<2 min | Launch |
| Tempo evolução SOAP | 15-20 min | \<10 min | 1 mês pós-launch |
| % confirmações automáticas | 0% | \>80% | 1 mês pós-launch |

**Objetivo 3: Melhorar gestão financeira**

| Key Result | Baseline | Meta | Prazo |
| ----- | ----- | ----- | ----- |
| Inadimplência | \~8% | \<3% | 3 meses pós-launch |
| Pacotes expirados sem uso | \~15% | \<5% | 3 meses pós-launch |
| Receita mensal | R$ 90k | R$ 105k (+15%) | 6 meses pós-launch |

## **3.2 Métricas de Produto**

| Métrica | Tipo | Meta |
| ----- | ----- | ----- |
| NPS (Net Promoter Score) | Satisfação | \>50 |
| DAU/MAU (usuários ativos) | Engajamento | \>60% |
| Tempo de carregamento | Performance | \<2s |
| Uptime | Disponibilidade | \>99.5% |
| Tickets de suporte/mês | Usabilidade | \<10 |

# **4\. Personas e Usuários**

## **4.1 Persona Principal: Rafael (Administrador/Owner)**

| Atributo | Descrição |
| ----- | ----- |
| Papel | Dono da clínica, fisioterapeuta, gestor |
| Idade | 30-45 anos |
| Objetivos | Maximizar ocupação, reduzir custos operacionais, crescer o negócio |
| Frustrações | Perda de receita com no-shows, falta de visão consolidada do negócio |
| Necessidades | Dashboard com KPIs, relatórios financeiros, controle total |
| Frequência de uso | Diária (múltiplas vezes) |

## **4.2 Persona: Fisioterapeuta**

| Atributo | Descrição |
| ----- | ----- |
| Papel | Atendimento clínico, evolução, prescrição |
| Idade | 25-40 anos |
| Objetivos | Atender bem, registrar evolução rápido, acompanhar progresso |
| Frustrações | Prontuário demorado, informações fragmentadas |
| Necessidades | Tela de atendimento rápida, mapa de dor visual, templates |
| Frequência de uso | Diária (durante atendimentos) |

## **4.3 Persona: Recepcionista**

| Atributo | Descrição |
| ----- | ----- |
| Papel | Agendamento, cadastro, atendimento telefônico, cobrança |
| Idade | 20-35 anos |
| Objetivos | Agendar rápido, evitar conflitos, manter agenda organizada |
| Frustrações | Reagendamentos, confirmações manuais, lista de espera confusa |
| Necessidades | Calendário visual, drag-and-drop, WhatsApp integrado |
| Frequência de uso | Contínua (o dia todo) |

## **4.4 Persona: Paciente**

| Atributo | Descrição |
| ----- | ----- |
| Papel | Usuário do app mobile (futuro), receptor de mensagens |
| Idade | 18-60 anos |
| Objetivos | Lembrar consultas, confirmar fácil, fazer exercícios em casa |
| Frustrações | Esquecer consultas, não saber horário, perder prescrição |
| Necessidades | Lembretes WhatsApp, confirmação com 1 clique, vídeos de exercícios |
| Frequência de uso | Semanal (confirmações, exercícios) |

# **5\. Escopo do Produto**

## **5.1 In Scope (Incluído)**

**Módulo 1: Gestão de Pacientes**

* Cadastro completo com validação de CPF  
* Prontuário eletrônico (anamnese, histórico, patologias)  
* Foto do paciente  
* Contato de emergência  
* Convênio/plano de saúde

**Módulo 2: Agendamento**

* Calendário visual (dia/semana/mês)  
* Drag-and-drop para reagendamento  
* Validação de conflitos  
* Múltiplos profissionais/salas  
* Duração configurável (30/60/90 min)

**Módulo 3: Sessões Clínicas (SOAP)**

* Evolução estruturada: Subjetivo, Objetivo, Avaliação, Plano  
* Mapa de dor interativo (SVG corpo humano)  
* Escala EVA 0-10 com cores  
* Anexos (fotos, exames)  
* Comparativo de evolução

**Módulo 4: WhatsApp Business (API Oficial)**

* Lembretes automáticos (24h antes)  
* Confirmação via botões interativos  
* Processamento de respostas (SIM/NÃO)  
* Notificações de lista de espera  
* Templates aprovados pela Meta

**Módulo 5: Lista de Espera**

* Cadastro com preferências (dias, horários, profissional)  
* Priorização (Normal/Alta/Urgente)  
* Oferta automática em cancelamentos  
* Timeout de 2h para resposta  
* Histórico de recusas

**Módulo 6: Financeiro**

* Pacotes de sessões com validade  
* Débito automático por atendimento  
* Pagamentos via Stripe (PIX, cartão, boleto)  
* Alertas de pacote expirando  
* Relatórios financeiros

**Módulo 7: Exercícios**

* Biblioteca de exercícios com vídeos  
* Prescrição personalizada  
* Séries, repetições, tempo  
* Envio para paciente (link/PDF)

**Módulo 8: Dashboard e Relatórios**

* KPIs em tempo real  
* Taxa de ocupação, no-show, faturamento  
* Gráficos de evolução  
* Exportação Excel/PDF

## **5.2 Out of Scope (Não Incluído nesta versão)**

| Item | Motivo | Versão Futura |
| ----- | ----- | ----- |
| App mobile nativo (iOS/Android) | Complexidade, prazo | v4.0 |
| Multi-clínica (multi-tenant) | Não necessário agora | v4.0 |
| Integração com convênios | Complexidade regulatória | v4.0 |
| Teleconsulta/videochamada | Escopo diferente | v4.0 |
| Prontuário com assinatura digital ICP-Brasil | Custo certificado | v4.0 |
| IA para sugestões clínicas | Fase de pesquisa | v5.0 |

# **6\. User Stories**

## **6.1 Épico: Gestão de Pacientes**

| ID | User Story | Prioridade | Pontos |
| ----- | ----- | ----- | ----- |
| US-001 | Como recepcionista, quero cadastrar um novo paciente com CPF, telefone e email para que ele possa ser agendado | Must | 5 |
| US-002 | Como recepcionista, quero buscar paciente por nome, CPF ou telefone para encontrá-lo rapidamente | Must | 3 |
| US-003 | Como fisioterapeuta, quero visualizar o prontuário completo do paciente antes do atendimento | Must | 5 |
| US-004 | Como fisioterapeuta, quero adicionar patologias com código CID ao prontuário | Should | 3 |
| US-005 | Como admin, quero desativar um paciente sem perder seu histórico | Should | 2 |

## **6.2 Épico: Agendamento**

| ID | User Story | Prioridade | Pontos |
| ----- | ----- | ----- | ----- |
| US-010 | Como recepcionista, quero ver a agenda do dia/semana em formato visual para identificar horários livres | Must | 8 |
| US-011 | Como recepcionista, quero criar um agendamento clicando no horário desejado | Must | 5 |
| US-012 | Como recepcionista, quero arrastar um agendamento para reagendá-lo | Must | 5 |
| US-013 | Como sistema, devo impedir agendamentos em horários já ocupados além da capacidade | Must | 3 |
| US-014 | Como recepcionista, quero cancelar um agendamento registrando o motivo | Must | 3 |
| US-015 | Como admin, quero configurar horário de funcionamento e capacidade por slot | Should | 5 |

## **6.3 Épico: Sessões Clínicas**

| ID | User Story | Prioridade | Pontos |
| ----- | ----- | ----- | ----- |
| US-020 | Como fisioterapeuta, quero registrar evolução SOAP de forma estruturada | Must | 8 |
| US-021 | Como fisioterapeuta, quero marcar pontos de dor em um mapa corporal interativo | Must | 13 |
| US-022 | Como fisioterapeuta, quero ver a evolução do mapa de dor comparando sessões | Must | 8 |
| US-023 | Como fisioterapeuta, quero anexar fotos e documentos à sessão | Should | 5 |
| US-024 | Como fisioterapeuta, quero que a evolução seja salva automaticamente (auto-save) | Should | 5 |
| US-025 | Como fisioterapeuta, quero gerar PDF da evolução para o paciente | Could | 5 |

## **6.4 Épico: WhatsApp**

| ID | User Story | Prioridade | Pontos |
| ----- | ----- | ----- | ----- |
| US-030 | Como sistema, quero enviar lembrete automático 24h antes da consulta | Must | 8 |
| US-031 | Como paciente, quero confirmar minha consulta respondendo SIM no WhatsApp | Must | 5 |
| US-032 | Como paciente, quero cancelar minha consulta respondendo NÃO no WhatsApp | Must | 5 |
| US-033 | Como sistema, quero atualizar o status do agendamento baseado na resposta | Must | 5 |
| US-034 | Como recepcionista, quero ver o status de entrega das mensagens | Should | 3 |
| US-035 | Como admin, quero configurar os horários de envio dos lembretes | Should | 3 |

## **6.5 Épico: Lista de Espera**

| ID | User Story | Prioridade | Pontos |
| ----- | ----- | ----- | ----- |
| US-040 | Como recepcionista, quero adicionar paciente à lista de espera com preferências | Must | 5 |
| US-041 | Como sistema, quero oferecer vaga automaticamente quando houver cancelamento | Must | 8 |
| US-042 | Como sistema, quero dar timeout de 2h para resposta da oferta | Must | 3 |
| US-043 | Como recepcionista, quero ver a lista de espera ordenada por prioridade | Must | 3 |
| US-044 | Como sistema, quero registrar recusas para não ofertar repetidamente | Should | 3 |

## **6.6 Épico: Financeiro**

| ID | User Story | Prioridade | Pontos |
| ----- | ----- | ----- | ----- |
| US-050 | Como recepcionista, quero vender um pacote de sessões para o paciente | Must | 5 |
| US-051 | Como sistema, quero debitar uma sessão do pacote ao completar atendimento | Must | 5 |
| US-052 | Como sistema, quero alertar quando pacote estiver com poucas sessões | Must | 3 |
| US-053 | Como sistema, quero alertar quando pacote estiver próximo de expirar | Must | 3 |
| US-054 | Como recepcionista, quero registrar pagamento via PIX/cartão/dinheiro | Must | 5 |
| US-055 | Como admin, quero ver relatório de faturamento por período | Should | 5 |

# **7\. Requisitos Funcionais (Resumo)**

Os requisitos funcionais completos estão detalhados no documento 'FisioFlow\_Requisitos\_Funcionais.docx'. Abaixo está um resumo por módulo:

| Módulo | Qtd. Requisitos | Críticos | Altos | Médios |
| ----- | ----- | ----- | ----- | ----- |
| Pacientes | 18 | 8 | 6 | 4 |
| Agendamento | 16 | 10 | 4 | 2 |
| Sessões Clínicas | 14 | 8 | 4 | 2 |
| Mapa de Dor | 12 | 6 | 4 | 2 |
| WhatsApp | 14 | 10 | 3 | 1 |
| Lista de Espera | 10 | 6 | 3 | 1 |
| Financeiro | 16 | 8 | 5 | 3 |
| Exercícios | 14 | 4 | 6 | 4 |
| **TOTAL** | **114** | **60** | **35** | **19** |

# **8\. Requisitos Não-Funcionais (Resumo)**

Os requisitos não-funcionais completos estão detalhados no documento 'FisioFlow\_Requisitos\_Nao\_Funcionais.docx'. Principais:

| Categoria | Requisito | Meta |
| ----- | ----- | ----- |
| Performance | Tempo de carregamento inicial | \< 2 segundos |
| Performance | Tempo de resposta API | \< 500ms (P95) |
| Performance | Lighthouse Score | ≥ 90 |
| Disponibilidade | Uptime | \> 99.5% |
| Disponibilidade | RPO (Recovery Point Objective) | \< 1 hora |
| Segurança | Autenticação | JWT \+ MFA disponível |
| Segurança | Dados sensíveis | Criptografia AES-256 |
| Segurança | LGPD | 100% conformidade |
| Escalabilidade | Usuários simultâneos | 50+ |
| Escalabilidade | Registros de pacientes | 10.000+ |
| Usabilidade | Mobile-first | 100% responsivo |
| Usabilidade | Acessibilidade | WCAG 2.1 AA |

# **9\. Arquitetura e Stack Técnica**

## **9.1 Stack Tecnológica**

| Camada | Tecnologia | Versão | Justificativa |
| ----- | ----- | ----- | ----- |
| Framework | Next.js | 16 | App Router, RSC, Edge Runtime |
| Linguagem | TypeScript | 5.x | Type safety, DX |
| Estilização | TailwindCSS \+ shadcn/ui | 4.x | Produtividade, consistência |
| Database | Neon PostgreSQL | 16 | Serverless, branching |
| ORM | Drizzle | 0.35+ | Type-safe, migrations |
| API | tRPC | 11 | End-to-end type safety |
| Auth | Clerk | 5.x | UI pronta, RBAC |
| Cache | Upstash Redis | Serverless | Rate limiting, sessions |
| Storage | Vercel Blob | Serverless | S3-compatible |
| Hosting | Vercel Pro | Edge | Global CDN, cron jobs |

## **9.2 Integrações Externas**

| Serviço | Função | Tipo |
| ----- | ----- | ----- |
| WhatsApp Business Cloud API | Mensagens, confirmações | API Oficial Meta |
| Stripe | Pagamentos (PIX, cartão, boleto) | API \+ Webhooks |
| Resend | Emails transacionais | API |
| Sentry | Monitoramento de erros | SDK |
| ViaCEP | Consulta de CEP | API gratuita |

## **9.3 Custos de Infraestrutura**

| Serviço | Plano | Custo Mensal |
| ----- | ----- | ----- |
| Vercel | Pro | R$ 100 |
| Neon | Launch | R$ 95 |
| Clerk | Free (até 10k MAU) | R$ 0 |
| Upstash | Pay-as-you-go | R$ 15 |
| Vercel Blob | Incluído \+ uso | R$ 10 |
| WhatsApp API | \~1.200 msgs | R$ 8\* |
| Sentry | Free | R$ 0 |
| Resend | Free (3k emails) | R$ 0 |
| **TOTAL** |  | **\~R$ 228/mês** |

*\*Primeiras 1.000 conversas/mês são grátis*

# **10\. Integrações**

## **10.1 WhatsApp Business Cloud API**

| Aspecto | Detalhe |
| ----- | ----- |
| Provedor | Meta (API Oficial) |
| Tipo de Integração | Webhook \+ REST API |
| Templates Necessários | agendamento\_confirmacao, agendamento\_lembrete, lista\_espera\_vaga, pacote\_expirando |
| Eventos Recebidos | messages, message\_status |
| Fluxo | Cron 9h/17h → Envio template → Webhook resposta → Atualiza DB |

## **10.2 Stripe**

| Aspecto | Detalhe |
| ----- | ----- |
| Métodos de Pagamento | PIX, Cartão de Crédito, Cartão de Débito, Boleto |
| Tipo de Integração | Checkout Sessions \+ Webhooks |
| Eventos Monitorados | checkout.session.completed, payment\_intent.succeeded, payment\_intent.payment\_failed |
| Fluxo | Criar checkout → Redirect → Webhook confirma → Cria pacote |

## **10.3 Clerk**

| Aspecto | Detalhe |
| ----- | ----- |
| Métodos de Login | Email/Senha, Google OAuth |
| RBAC | Roles: admin, physio, reception |
| Webhooks | user.created, user.updated, organizationMembership.created |
| UI Components | SignIn, SignUp, UserButton |

# **11\. Roadmap e Fases**

## **11.1 Visão Geral das Fases**

| Fase | Escopo | Duração | Entrega |
| ----- | ----- | ----- | ----- |
| MVP (Fase 1\) | Pacientes, Agenda, SOAP básico, WhatsApp | 8-10 semanas | Sistema funcional core |
| Automação (Fase 2\) | Lista espera, Mapa de dor completo, Comparativos | 4-6 semanas | Diferencial competitivo |
| Financeiro (Fase 3\) | Pacotes, Stripe, Relatórios | 3-4 semanas | Monetização completa |
| Exercícios (Fase 4\) | Biblioteca, Prescrição, Vídeos | 4-6 semanas | Fidelização paciente |

## **11.2 Fase 1: MVP (8-10 semanas)**

**Objetivo: Sistema utilizável para operação diária**

| Sprint | Entregas | Semanas |
| ----- | ----- | ----- |
| Sprint 1-2 | Setup projeto, DB schema, Auth Clerk, Layout base | 1-2 |
| Sprint 3-4 | CRUD Pacientes, Prontuário, Busca | 3-4 |
| Sprint 5-6 | Calendário, Agendamentos, Drag-and-drop | 5-6 |
| Sprint 7-8 | WhatsApp integração, Lembretes, Confirmação | 7-8 |
| Sprint 9-10 | Sessões SOAP básico, Deploy produção, Testes | 9-10 |

## **11.3 Fase 2: Automação (4-6 semanas)**

**Objetivo: Diferencial competitivo com mapa de dor e lista de espera**

| Sprint | Entregas | Semanas |
| ----- | ----- | ----- |
| Sprint 11-12 | Mapa de dor interativo SVG, Pontos, Intensidade | 11-12 |
| Sprint 13-14 | Comparativo evolução, Gráficos, PDF | 13-14 |
| Sprint 15-16 | Lista de espera, Oferta automática, Timeout | 15-16 |

## **11.4 Fase 3: Financeiro (3-4 semanas)**

**Objetivo: Gestão financeira completa**

| Sprint | Entregas | Semanas |
| ----- | ----- | ----- |
| Sprint 17-18 | Pacotes, Débito automático, Alertas | 17-18 |
| Sprint 19-20 | Stripe checkout, Webhooks, Relatórios | 19-20 |

## **11.5 Fase 4: Exercícios (4-6 semanas)**

**Objetivo: Fidelização e engajamento do paciente**

| Sprint | Entregas | Semanas |
| ----- | ----- | ----- |
| Sprint 21-22 | Biblioteca de exercícios, Upload vídeos | 21-22 |
| Sprint 23-24 | Prescrição, Séries/reps, Envio paciente | 23-24 |
| Sprint 25-26 | Dashboard KPIs, Relatórios avançados, Polish | 25-26 |

# **12\. Riscos e Mitigações**

| ID | Risco | Probabilidade | Impacto | Mitigação |
| ----- | ----- | ----- | ----- | ----- |
| R01 | WhatsApp bloquear número por spam | Baixa | Alto | Usar API oficial, respeitar limites, templates aprovados |
| R02 | Stripe indisponível | Baixa | Médio | Fallback para registro manual, retry automático |
| R03 | Neon database down | Baixa | Alto | Backups PITR, região redundante, alertas |
| R04 | Adoção lenta pelos usuários | Média | Médio | Treinamento, UI intuitiva, migração gradual |
| R05 | Escopo creep | Alta | Médio | PRD rígido, sprints definidas, MVP first |
| R06 | Performance degradada | Média | Médio | Lighthouse CI, cache Redis, otimização queries |
| R07 | Vazamento de dados (LGPD) | Baixa | Alto | Criptografia, audit logs, acesso mínimo |
| R08 | Custo acima do esperado | Média | Baixo | Free tiers, monitoramento mensal, alertas billing |

# **13\. Critérios de Aceitação**

## **13.1 Critérios de Aceitação do MVP**

| \# | Critério | Verificação |
| ----- | ----- | ----- |
| 1 | Cadastrar paciente com CPF, telefone, email | Teste manual \+ automatizado |
| 2 | Buscar paciente por nome ou CPF em \< 2s | Teste de performance |
| 3 | Criar agendamento sem conflitos | Teste automatizado |
| 4 | Visualizar agenda da semana | Teste manual |
| 5 | Reagendar com drag-and-drop | Teste manual |
| 6 | Enviar lembrete WhatsApp 24h antes | Teste em staging |
| 7 | Processar confirmação SIM/NÃO | Teste com webhook mock |
| 8 | Registrar evolução SOAP | Teste manual |
| 9 | Login com Clerk funcionando | Teste E2E |
| 10 | Deploy em produção estável | Smoke tests |

## **13.2 Definition of Done (DoD)**

* Código revisado (code review aprovado)  
* Testes unitários passando (cobertura ≥ 80%)  
* Testes E2E dos fluxos críticos passando  
* Sem erros no console do browser  
* Lighthouse score ≥ 90  
* Documentação atualizada  
* Deploy em preview sem erros  
* Aprovação do PO (Rafael)

## **13.3 Definition of Ready (DoR)**

* User story escrita com critérios de aceitação  
* Design/mockup aprovado (se aplicável)  
* Dependências identificadas  
* Story estimada pelo time  
* Sem bloqueios conhecidos

# **14\. Apêndices**

## **14.1 Documentos Relacionados**

| Documento | Descrição | Arquivo |
| ----- | ----- | ----- |
| Documentação Técnica | Arquitetura, deploy, configurações | FisioFlow\_v3\_Documentacao\_Tecnica.docx |
| Requisitos Funcionais | 114 requisitos detalhados | FisioFlow\_Requisitos\_Funcionais.docx |
| Requisitos Não-Funcionais | 53 requisitos de qualidade | FisioFlow\_Requisitos\_Nao\_Funcionais.docx |
| Casos de Uso | 12 casos de uso detalhados | FisioFlow\_Casos\_de\_Uso.docx |
| Diagrama de Classes | 20+ entidades do banco | FisioFlow\_Diagrama\_Classes.docx |
| Plano de Testes | 30+ casos de teste | FisioFlow\_Plano\_Testes.docx |
| Guia de Implantação | Passo a passo deploy | FisioFlow\_Guia\_Implantacao.docx |
| Especificação API | OpenAPI 3.1 | FisioFlow\_OpenAPI.yaml |
| Análise de Custos | Custos e alternativas | FisioFlow\_Analise\_Custos\_Integracoes.docx |

## **14.2 Glossário**

| Termo | Definição |
| ----- | ----- |
| SOAP | Método de documentação clínica: Subjetivo, Objetivo, Avaliação, Plano |
| EVA | Escala Visual Analógica de dor (0-10) |
| No-show | Paciente que não comparece à consulta agendada |
| MAU | Monthly Active Users (usuários ativos mensais) |
| LGPD | Lei Geral de Proteção de Dados |
| RSC | React Server Components |
| tRPC | TypeScript Remote Procedure Call |
| ORM | Object-Relational Mapping |
| Webhook | Callback HTTP para notificações em tempo real |
| Cron Job | Tarefa agendada executada automaticamente |

## **14.3 Histórico de Revisões**

| Versão | Data | Autor | Alterações |
| ----- | ----- | ----- | ----- |
| 1.0 | Dezembro 2025 | Rafael / Claude | Versão inicial do PRD |

*— Fim do Documento —*