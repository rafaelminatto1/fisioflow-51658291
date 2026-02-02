# FisioFlow — Product Requirements Document (PRD)

**Documento de Requisitos do Produto**

| Campo | Valor |
|-------|--------|
| Produto | FisioFlow |
| Versão do documento | 2.0 |
| Data | Fevereiro 2026 |
| Status | Em produção / evolução contínua |
| Stakeholders | Gestão, equipe técnica, clínicas parceiras |

---

## 1. Visão e contexto

### 1.1 Declaração de visão

O **FisioFlow** é o sistema de gestão completo e intuitivo para clínicas de fisioterapia no Brasil, com foco em reduzir no-shows, aumentar eficiência operacional e melhorar a experiência de pacientes e profissionais por meio de automação, prontuário estruturado e comunicação integrada.

### 1.2 Missão

Modernizar a fisioterapia brasileira através da tecnologia, oferecendo ferramentas que aumentam a eficiência das clínicas, a experiência dos pacientes e os resultados clínicos.

### 1.3 Resumo executivo

O FisioFlow é um sistema web (e futuramente mobile) de gestão para clínicas de fisioterapia, desenvolvido para o mercado brasileiro. Integra:

- **Gestão de pacientes** — cadastro, histórico, documentos, mapas de dor
- **Agenda inteligente** — calendário visual, conflitos, capacidade, drag-and-drop
- **Prontuário eletrônico (SOAP)** — evoluções estruturadas, assinaturas, auditoria
- **Biblioteca de exercícios** — prescrição, protocolos, acompanhamento
- **Fichas de avaliação** — templates validados, editor de formulários
- **Gestão financeira** — receitas, despesas, convênios, relatórios
- **Analytics e relatórios** — dashboards, ocupação, evolução, cohort
- **Funcionalidades avançadas** — telemedicina, gamificação, CRM, eventos

### 1.4 Contexto de negócio (metas)

| Métrica | Valor atual / baseline | Meta |
|--------|------------------------|------|
| Atendimentos/mês | ~600 | 700+ |
| Taxa de no-show | ~25–30% | <15% |
| Tempo de agendamento | 5–10 min | <2 min |
| Confirmação manual | 100% | <20% |
| Tempo evolução SOAP | 15–20 min | <10 min |

---

## 2. Problema e oportunidade

### 2.1 Problemas abordados

- **No-show e confirmação manual** — perda de receita e tempo da recepção
- **Agenda fragmentada** — conflitos, reagendamento difícil, lista de espera informal
- **Prontuário disperso** — papel, planilhas, falta de padronização (SOAP) e mapa de dor comparável
- **Controle financeiro manual** — pacotes em planilha, sessões não debitadas, expiração sem aviso
- **Comunicação não integrada** — lembretes e confirmações manuais (telefone/WhatsApp pessoal)

### 2.2 Oportunidade

Clínicas que adotam sistema integrado (agenda + prontuário + comunicação + financeiro) ganham em ocupação, redução de no-show, fidelização e conformidade (LGPD, auditoria).

---

## 3. Objetivos e métricas de sucesso

### 3.1 Objetivos primários

1. **Reduzir perdas por no-show** — taxa de no-show <15%, confirmação >85%
2. **Aumentar eficiência operacional** — agendamento <2 min, evolução SOAP <10 min
3. **Melhorar gestão financeira** — inadimplência <3%, visibilidade de pacotes e expiração

### 3.2 Métricas de produto

| Métrica | Tipo | Meta |
|---------|------|------|
| NPS | Satisfação | >50 |
| DAU/MAU | Engajamento | >60% |
| Tempo de carregamento | Performance | <2 s |
| Uptime | Disponibilidade | >99,5% |
| Lighthouse Performance | Performance | ≥90 |
| Acessibilidade (WCAG) | Usabilidade | 2.1 AA |

---

## 4. Usuários e personas

### 4.1 Perfis de usuário (roles)

| Role | Descrição | Acesso típico |
|------|------------|----------------|
| **admin** | Dono/gestor da clínica | Sistema completo, usuários, relatórios, configurações |
| **fisioterapeuta** | Atendimento clínico | Pacientes, agenda, prontuário, exercícios, evoluções |
| **estagiario** | Acompanhamento supervisionado | Visualização de pacientes e protocolos, ações limitadas |
| **recepcionista** | Recepção e agendamento | Agenda, cadastro de pacientes, confirmações |
| **paciente** | Usuário final | Próprios dados, exercícios prescritos, histórico de consultas |
| **parceiro** | Parceiros comerciais | Módulos específicos (ex.: vouchers) |
| **pending** | Aguardando aprovação | Acesso restrito até aprovação |

### 4.2 Personas resumidas

- **Rafael (Admin/Owner)** — maximizar ocupação, reduzir custos, visão consolidada (KPIs, financeiro)
- **Fisioterapeuta** — registrar evolução rápido, mapa de dor, templates, prescrição de exercícios
- **Recepcionista** — agendar e reagendar rápido, calendário visual, menos confirmação manual
- **Paciente** — lembretes, confirmação fácil, acesso a exercícios e evolução

---

## 5. Escopo do produto

### 5.1 Módulos no escopo (in scope)

| Módulo | Descrição | Status atual |
|--------|-----------|--------------|
| **Gestão de pacientes** | Cadastro, histórico, documentos, mapas de dor, LGPD | ✅ Completo |
| **Agenda / Agendamento** | Calendário (dia/semana/mês), conflitos, capacidade, drag-and-drop, múltiplos profissionais | ✅ Completo |
| **Prontuário eletrônico (SOAP)** | Evolução SOAP, mapa de dor, EVA, anexos, comparativo, assinaturas, auditoria | ✅ Completo |
| **Biblioteca de exercícios** | Catálogo, prescrição, protocolos, vídeos, integração com SOAP | ✅ Completo |
| **Fichas de avaliação** | Templates validados, editor de formulários, import/export | ✅ Completo |
| **Gestão financeira** | Receitas, despesas, convênios, contas, fluxo de caixa, relatórios | ✅ Básico/parcial |
| **Relatórios e analytics** | Dashboard, ocupação, evolução, desempenho da equipe, aniversariantes | ✅ Completo |
| **Configurações** | Agenda (horários, capacidade), calendário, serviços, feriados, templates | ✅ Completo |
| **Cadastros** | Serviços, fornecedores, feriados, atestados, contratos, objetivos, formulários de avaliação | ✅ Completo |
| **Telemedicina** | Página e fluxo básico | ⚠️ Parcial |
| **Gamificação** | Pontos, conquistas, metas, loja, leaderboard | ⚠️ Parcial |
| **CRM / Comunicação** | Leads, campanhas, WhatsApp (planejado) | ⚠️ Parcial |
| **Eventos** | Eventos, detalhes, analytics | ✅ Completo |
| **Vouchers / Parceiros** | Parceiros, vouchers, lista de espera | ⚠️ Parcial |
| **Admin e segurança** | Usuários, convites, auditoria, monitoramento, organização | ✅ Completo |
| **IA e recursos avançados** | Smart AI, chatbot, computer vision (exercícios), analytics avançados | ⚠️ Parcial |

### 5.2 Fora do escopo (out of scope) ou versões futuras

| Item | Observação |
|------|------------|
| App mobile nativo (iOS/Android) | Roadmap; React Native/Expo planejado |
| Multi-clínica (multi-tenant) | Versão futura |
| Integração com convênios (faturamento) | Complexidade regulatória |
| Assinatura digital ICP-Brasil | Custo e escopo específico |
| IA para sugestões clínicas automatizadas | Fase de pesquisa |

---

## 6. Requisitos funcionais (resumo por área)

### 6.1 Pacientes

- Cadastro completo com validação (CPF, contato, etc.)
- Histórico médico, anamnese, patologias/CID
- Upload de documentos e exames
- Mapas de dor interativos e comparativo entre sessões
- Controle de acesso e conformidade LGPD
- Desativar paciente mantendo histórico

### 6.2 Agenda

- Visualização dia/semana/mês
- Criação e edição de agendamentos
- Drag-and-drop para reagendamento
- Validação de conflitos e capacidade por slot
- Múltiplos profissionais e salas
- Duração configurável (ex.: 30/60/90 min)
- Configuração de horário de funcionamento e capacidade (Schedule Settings)

### 6.3 Prontuário e sessões clínicas

- Evolução SOAP (Subjetivo, Objetivo, Avaliação, Plano)
- Mapa de dor interativo (SVG), escala EVA (0–10)
- Anexos (fotos, exames)
- Comparativo de evolução entre sessões
- Auto-save e assinaturas digitais
- Trilha de auditoria
- Geração de PDF de evolução

### 6.4 Exercícios e protocolos

- Biblioteca de exercícios com filtros
- Prescrição personalizada (séries, repetições, tempo)
- Protocolos baseados em evidências
- Integração com prontuário/SOAP
- Acompanhamento de progresso
- Exportação/impressão (ex.: PDF)

### 6.5 Avaliações

- Templates de avaliação (esportiva, ortopédica, etc.)
- Editor visual de fichas personalizáveis
- Import/export de templates
- Vinculação ao paciente e à evolução

### 6.6 Financeiro

- Controle de receitas e despesas
- Gestão de convênios e contas financeiras
- Fluxo de caixa
- Emissão de recibos e relatórios
- (Planejado: pacotes de sessões, débito automático, Stripe/PIX)

### 6.7 Comunicação e automação

- (Planejado: WhatsApp Business API — lembretes, confirmação, lista de espera)
- (Planejado: Resend/SendGrid — e-mails transacionais)
- Centro de comunicações no app

### 6.8 Administração

- Gestão de usuários e perfis (roles)
- Convites e aprovação (pending)
- Auditoria de ações (audit logs)
- Monitoramento de segurança
- Configurações da organização

---

## 7. Requisitos não funcionais

| Categoria | Requisito | Meta |
|-----------|-----------|------|
| Performance | Carregamento inicial | <2 s |
| Performance | Resposta de API (P95) | <500 ms |
| Performance | Lighthouse | ≥90 |
| Disponibilidade | Uptime | >99,5% |
| Segurança | Autenticação | Firebase Auth, Firestore Security Rules |
| Segurança | Dados sensíveis | Criptografia, LGPD |
| Segurança | Auditoria | Logs de ações críticas |
| Escalabilidade | Usuários simultâneos | 50+ |
| Usabilidade | Responsividade | Mobile-first |
| Usabilidade | Acessibilidade | WCAG 2.1 AA |
| Manutenção | TypeScript | Strict mode |
| Qualidade | Testes | E2E, unitários; meta >70% cobertura |

---

## 8. Stack técnica (atual)

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 18, TypeScript, Vite |
| UI | shadcn/ui, Tailwind CSS, Radix UI |
| Estado/forms | TanStack Query, Zustand, React Hook Form, Zod |
| Roteamento | React Router 6 |
| Backend / DB | Firebase (Firestore, Auth, Realtime, Storage, Cloud Functions) |
| Autenticação | Firebase Auth, Firestore Security Rules |
| Deploy web | Firebase Hosting (100% Firebase + GCP) |
| Mobile | React Native + Expo (planejado); Capacitor para PWA |
| Monitoramento | Sentry, Web Vitals, analytics |

Integrações planejadas ou em uso: Google Calendar, Resend, WhatsApp Business API, Stripe (vouchers/pagamentos), ViaCEP.

---

## 9. Roadmap e fases (visão atual)

### 9.1 Status por módulo (resumo)

- **Completos:** Autenticação, Pacientes, Agenda, Prontuário SOAP, Exercícios, Fichas de Avaliação, Relatórios, Configurações, Cadastros, Eventos, Admin e segurança.
- **Parciais:** Financeiro avançado, Telemedicina, Gamificação, CRM, Notificações push, Vouchers, IA.
- **Planejados:** App mobile nativo, WhatsApp oficial, Stripe (pacotes/pagamentos), lista de espera automatizada.

### 9.2 Próximas prioridades (exemplos)

- Notificações push e preferências do usuário
- App mobile (Expo/React Native)
- Telemedicina (WebRTC, gravação, fila)
- Gamificação (dashboard paciente, conquistas, leaderboards)
- WhatsApp Business API (lembretes, confirmação)
- Sistema de vouchers e integração com agendamento
- Cobertura de testes >70%

---

## 10. Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| No-show continua alto | Automação de lembretes e confirmação (WhatsApp/email) |
| Adoção baixa pelos profissionais | Onboarding, UX focada em fluxos rápidos (agenda, SOAP) |
| Dados sensíveis (LGPD) | RLS, criptografia, auditoria, políticas claras |
| Performance com muitos dados | Índices, paginação, lazy loading, cache (TanStack Query) |
| Dependência de terceiros (Firebase, etc.) | Contratos SLA, backups, documentação de contingência |

---

## 11. Critérios de aceitação gerais

- Usuários conseguem se autenticar e acessar apenas o que seu role permite (RBAC).
- Pacientes podem ser cadastrados, editados e desativados sem perda de histórico.
- Agenda permite criar, editar, reagendar e cancelar consultas respeitando capacidade e conflitos.
- Evolução SOAP e mapa de dor podem ser registrados e comparados entre sessões.
- Exercícios podem ser prescritos e vinculados ao paciente/prontuário.
- Relatórios e dashboards refletem dados reais (ocupação, evolução, financeiro conforme implementado).
- Sistema responsivo e utilizável em desktop e mobile.
- Conformidade com LGPD e boas práticas de segurança (RLS, sem expor dados sensíveis indevidamente).

---

## 12. Referências e documentação

- **README.md** — visão geral, setup, comandos
- **docs2026/** — documentação técnica (visão, arquitetura, ambiente, BD, auth, API, componentes, testes, deploy, roadmap)
- **docs2026/funcionalidades/** — detalhamento por área (agenda, avaliações, CRM, exercícios, financeiro, gamificação, pacientes, prontuário, relatórios, telemedicina)
- **docs2026/FisioFlow_PRD.docx.md** — PRD v3.0 (requisitos detalhados e user stories)
- **ARQUITETURA_TECNICA_DETALHADA.md** — arquitetura e monorepo
- **BACKLOG_PRIORIZADO.md** — backlog e priorização de tarefas

---

*FisioFlow — Transformando o cuidado em saúde através da tecnologia.*
