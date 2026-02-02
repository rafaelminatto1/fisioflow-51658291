# FisioFlow — Documentação Completa do Sistema

**Versão:** 1.0  
**Data:** Fevereiro 2026  
**Status:** Documento de referência consolidado

Este documento consolida: **fluxos e funcionalidades**, **requisitos funcionais** e **entidades/relacionamentos** do FisioFlow.

---

## Índice

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Fluxos Principais](#2-fluxos-principais)
3. [Funcionalidades por Módulo](#3-funcionalidades-por-módulo)
4. [Requisitos Funcionais](#4-requisitos-funcionais)
5. [Entidades e Relacionamentos](#5-entidades-e-relacionamentos)
6. [Rotas e Navegação](#6-rotas-e-navegação)
7. [Stack e Integrações](#7-stack-e-integrações)

---

## 1. Visão Geral do Sistema

### 1.1 O que é o FisioFlow

O **FisioFlow** é um sistema web de gestão para clínicas de fisioterapia no Brasil. Integra:

- **Gestão de pacientes** — cadastro, histórico, documentos, mapas de dor
- **Agenda inteligente** — calendário visual, conflitos, capacidade, drag-and-drop
- **Prontuário eletrônico (SOAP)** — evoluções estruturadas, assinaturas, auditoria
- **Biblioteca de exercícios** — prescrição, protocolos, acompanhamento
- **Fichas de avaliação** — templates validados, editor de formulários
- **Gestão financeira** — receitas, despesas, convênios, relatórios
- **Analytics e relatórios** — dashboards, ocupação, evolução, cohort
- **Admin e segurança** — usuários, convites, auditoria, organização

### 1.2 Arquitetura em alto nível

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend (React 18 + TypeScript + Vite)                         │
│  • React Router 6 • shadcn/ui • TanStack Query • Zustand         │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│  Backend (Firebase)                                              │
│  • Firestore • Auth • Realtime • Storage • Cloud Functions        │
└─────────────────────────────────────────────────────────────────┘
```

- **Autenticação:** Firebase Auth; controle de acesso por **RBAC** (roles) e regras de segurança no Firestore.
- **Dados:** Serviços (`appointmentService`, `patientService`, etc.) e hooks (`usePatients`, `useAppointments`, etc.) consomem Firebase (Firestore, Cloud Functions).
- **Estado:** TanStack Query (server state), Zustand (client state), Contexts (Auth, Realtime, Calendar, Soap).

---

## 2. Fluxos Principais

### 2.1 Fluxo de Autenticação

1. Usuário acessa `/auth` ou `/welcome`.
2. Informa **email** e **senha**.
3. Frontend chama Firebase Auth (`signInWithEmailAndPassword`).
4. Firebase Auth valida credenciais e retorna o usuário autenticado; token gerenciado pelo SDK.
5. `AuthContext` expõe `user` e `profile` (role, organization_id) a partir do Firestore ou claims.
6. Rotas protegidas (`ProtectedRoute`) verificam autenticação e, quando aplicável, **role** (admin, fisioterapeuta, recepcionista, estagiario, paciente, parceiro, pending).
7. Se role = `pending`, redirecionamento para `/pending-approval`.
8. Acesso aos dados: Firestore Security Rules e Cloud Functions garantem que cada usuário acesse apenas dados da sua organização e conforme o role.

### 2.2 Fluxo de Gestão de Pacientes

1. Acesso à lista: `/patients` (lista com busca/filtros).
2. **Criar:** formulário de cadastro (nome, CPF, contato, nascimento, gênero, endereço, convênio, histórico, alergias, contato de emergência, etc.); validação (ex.: CPF); insert em `patients`.
3. **Editar:** `/patients/:id` (perfil do paciente); alterações em `patients` e entidades relacionadas (documentos, objetivos, etc.).
4. **Desativar:** flag `is_active` ou equivalente; histórico preservado.
5. **Documentos:** upload para Storage; registro em tabela de documentos do paciente.
6. **Mapa de dor:** registro em `pain_maps` / `body_pain_maps` / `pain_map_points`; comparativo entre sessões na interface.
7. **LGPD:** controle de acesso via regras do Firestore e auditoria onde aplicável.

### 2.3 Fluxo de Agenda / Agendamento

1. **Página principal (agenda):** `/` ou `/schedule` → `Schedule` com visualizações dia/semana/mês.
2. **Carregar agendamentos:** `AppointmentService.fetchAppointments(organizationId)` (ou hook `useAppointments`); dados vêm da API (ex.: Firebase Functions `appointmentsApi.list`); validação com `VerifiedAppointmentSchema`.
3. **Criar agendamento:** formulário com paciente, data, hora, duração, tipo, profissional (therapist_id), sala; validação de conflitos (`checkAppointmentConflict`); cálculo de horário de fim; insert via API.
4. **Editar / Reagendar:** alteração de data/hora/duração; drag-and-drop na agenda (hook `useCalendarDrag`); validação de capacidade e conflitos (Schedule Settings, capacidade por slot).
5. **Cancelar:** status para cancelado; motivo opcional; atualização via API.
6. **Configurações da agenda:** `/schedule/settings` (ScheduleSettings) — horário de funcionamento, capacidade por slot, feriados, regras de cancelamento, etc. (hooks `useScheduleSettings`, `useScheduleCapacity`).
7. **Realtime:** `RealtimeContext` pode inscrever em mudanças de `appointments` para atualizar a agenda em tempo real.

### 2.4 Fluxo de Prontuário / Evolução SOAP

1. **Acesso:** a partir da agenda (abrir evolução do atendimento) ou do perfil do paciente; rotas como `/session-evolution/:appointmentId`, `/patient-evolution/:appointmentId`, `/patient-evolution-report/:patientId`.
2. **Criar/editar evolução:** formulário SOAP:
   - **S** (Subjetivo): queixa, história atual, sintomas.
   - **O** (Objetivo): exame físico (inspeção, palpação, testes, postura), sinais vitais, testes funcionais (ROM, força, etc.).
   - **A** (Avaliação): diagnóstico fisioterapêutico, prognóstico.
   - **P** (Plano): objetivos, condutas, exercícios domiciliares, frequência/duração.
3. **Mapa de dor:** componente PainMap; dados em `pain_maps` / `pain_map_points`; EVA (0–10).
4. **Anexos:** fotos, exames; upload para Storage; vínculo com sessão/evolução.
5. **Assinatura:** assinatura digital; campo `signed_at` / `signature_hash`; trilha de auditoria.
6. **Auto-save:** rascunho salvo periodicamente; status `draft` até finalizar.
7. **PDF:** geração de PDF da evolução (utilidade em `generateClinicalTestPdf` / `generateProtocolPdf` ou equivalente).
8. Dados de evolução ficam em tabelas como `sessions` (SOAP em JSONB), `evolutions` (quando existir), `session_attachments`, `test_results`, etc.

### 2.5 Fluxo de Exercícios e Protocolos

1. **Biblioteca:** `/exercises` — lista de exercícios (filtros por categoria, dificuldade, etc.); dados em `exercises`, `exercise_categories`.
2. **Prescrição:** seleção de exercícios para um paciente; séries, repetições, tempo, frequência; gravação em `prescriptions`, `prescription_items`.
3. **Protocolos:** `/protocols` — protocolos baseados em evidências; vinculados a exercícios; uso em prescrição e no prontuário.
4. **Acompanhamento:** logs de execução (`prescription_logs` ou equivalente); exibição no histórico do paciente / evolução.
5. **Integração SOAP:** plano (P) pode referenciar exercícios prescritos; vínculo entre sessão e prescrição quando houver.

### 2.6 Fluxo de Avaliações (Fichas)

1. **Templates:** `/cadastros/fichas-avaliacao` — templates de avaliação (esportiva, ortopédica, padrão); tabelas como `evaluation_forms`, `evaluation_form_fields`.
2. **Nova avaliação:** `/patients/:patientId/evaluations/new/:formId` — preenchimento da ficha pelo profissional; respostas em `evaluation_responses`.
3. **Editor de fichas:** `/cadastros/fichas-avaliacao/:id/campos` — definir campos (texto, número, escala, data, etc.) e seções.
4. **Import/export:** templates podem ser exportados/importados para uso em outra organização ou backup.

### 2.7 Fluxo Financeiro

1. **Dashboard:** `/financial` — visão de receitas, despesas, resumo.
2. **Contas:** `/financeiro/contas` — contas financeiras (banco, caixa).
3. **Fluxo de caixa:** `/financeiro/fluxo-caixa` — entradas/saídas por período.
4. **Transações:** lançamento de receitas e despesas; vínculo com convênio, forma de pagamento, paciente/atendimento quando aplicável.
5. **Recibos/relatórios:** emissão de recibos; relatórios por período, por profissional, etc. (conforme implementado em `financialService`, relatórios).

### 2.8 Fluxo de Relatórios e Analytics

1. **Dashboard geral:** `/dashboard` (Index) — KPIs (pacientes ativos, consultas do dia, receita do mês, ocupação).
2. **Relatórios:** `/reports` — lista de relatórios (attendance, performance da equipe, evolução, financeiro, aniversariantes, etc.).
3. **Páginas específicas:** `/relatorios/comparecimento`, `/relatorios/aniversariantes`, `/performance-equipe`, `/admin/analytics`, `/admin/cohorts`.
4. Dados agregados via Cloud Functions ou consultas ao Firestore (ex.: métricas de dashboard, relatório de comparecimento).

### 2.9 Fluxo Administrativo e Segurança

1. **Usuários:** `/admin/users` — CRUD de usuários, atribuição de role, convites.
2. **Convites:** `/admin/invitations` — envio e gestão de convites; usuário com role `pending` até aprovação.
3. **Auditoria:** `/admin/audit-logs` — consulta de logs de ações críticas (`audit_logs`).
4. **Segurança:** `/admin/security`, `/security-settings` — monitoramento e configurações de segurança.
5. **Organização:** `/admin/organization` — dados da organização (multi-tenant preparado).

---

## 3. Funcionalidades por Módulo

| Módulo | Descrição | Páginas principais | Status |
|--------|-----------|--------------------|--------|
| **Pacientes** | Cadastro, histórico, documentos, mapa de dor, LGPD | `/patients`, `/patients/:id` | Completo |
| **Agenda** | Calendário dia/semana/mês, conflitos, capacidade, DnD | `/`, `/schedule/settings` | Completo |
| **Prontuário SOAP** | Evolução SOAP, mapa de dor, anexos, assinatura, PDF | `/session-evolution/:id`, `/patient-evolution/:id` | Completo |
| **Exercícios** | Biblioteca, prescrição, protocolos | `/exercises`, `/protocols` | Completo |
| **Avaliações** | Fichas, templates, editor | `/cadastros/fichas-avaliacao`, `/patients/:id/evaluations/new` | Completo |
| **Financeiro** | Receitas, despesas, contas, fluxo de caixa | `/financial`, `/financeiro/contas`, `/financeiro/fluxo-caixa` | Básico/parcial |
| **Relatórios** | Dashboard, ocupação, evolução, equipe, cohort | `/reports`, `/dashboard`, `/admin/analytics` | Completo |
| **Configurações** | Agenda, calendário, serviços, feriados, templates | `/settings`, `/schedule/settings`, `/cadastros/*` | Completo |
| **Eventos** | Eventos, detalhes, analytics | `/eventos`, `/eventos/:id`, `/eventos/analytics` | Completo |
| **Admin** | Usuários, convites, auditoria, organização | `/admin/users`, `/admin/audit-logs`, `/admin/organization` | Completo |
| **Telemedicina** | Página e fluxo básico | `/telemedicine`, `/telemedicine-room/:roomId` | Parcial |
| **Gamificação** | Pontos, conquistas, metas, loja, leaderboard | `/gamification`, `/admin/gamification` | Parcial |
| **CRM** | Leads, campanhas | `/crm`, `/crm/leads` | Parcial |
| **Vouchers/Parceiros** | Parceiros, vouchers, lista de espera | `/partner`, `/vouchers`, `/waitlist` | Parcial |

---

## 4. Requisitos Funcionais

Resumo por área (detalhes no PRD — `prd.md`).

### 4.1 Pacientes

- Cadastro completo com validação (CPF, contato, etc.).
- Histórico médico, anamnese, patologias/CID.
- Upload de documentos e exames.
- Mapas de dor interativos e comparativo entre sessões.
- Controle de acesso e conformidade LGPD.
- Desativar paciente mantendo histórico.

### 4.2 Agenda

- Visualização dia/semana/mês.
- Criação e edição de agendamentos.
- Drag-and-drop para reagendamento.
- Validação de conflitos e capacidade por slot.
- Múltiplos profissionais e salas.
- Duração configurável (ex.: 30/60/90 min).
- Configuração de horário de funcionamento e capacidade (Schedule Settings).

### 4.3 Prontuário e Sessões Clínicas

- Evolução SOAP (Subjetivo, Objetivo, Avaliação, Plano).
- Mapa de dor interativo (SVG), escala EVA (0–10).
- Anexos (fotos, exames).
- Comparativo de evolução entre sessões.
- Auto-save e assinaturas digitais.
- Trilha de auditoria.
- Geração de PDF de evolução.

### 4.4 Exercícios e Protocolos

- Biblioteca de exercícios com filtros.
- Prescrição personalizada (séries, repetições, tempo).
- Protocolos baseados em evidências.
- Integração com prontuário/SOAP.
- Acompanhamento de progresso.
- Exportação/impressão (ex.: PDF).

### 4.5 Avaliações

- Templates de avaliação (esportiva, ortopédica, etc.).
- Editor visual de fichas personalizáveis.
- Import/export de templates.
- Vinculação ao paciente e à evolução.

### 4.6 Financeiro

- Controle de receitas e despesas.
- Gestão de convênios e contas financeiras.
- Fluxo de caixa.
- Emissão de recibos e relatórios.
- (Planejado: pacotes de sessões, débito automático, Stripe/PIX.)

### 4.7 Comunicação e Automação

- (Planejado: WhatsApp Business API — lembretes, confirmação, lista de espera.)
- (Planejado: Resend/SendGrid — e-mails transacionais.)
- Centro de comunicações no app.

### 4.8 Administração

- Gestão de usuários e perfis (roles).
- Convites e aprovação (pending).
- Auditoria de ações (audit logs).
- Monitoramento de segurança.
- Configurações da organização.

### 4.9 Perfis de Usuário (RBAC)

| Role | Descrição | Acesso típico |
|------|------------|----------------|
| **admin** | Dono/gestor da clínica | Sistema completo, usuários, relatórios, configurações |
| **fisioterapeuta** | Atendimento clínico | Pacientes, agenda, prontuário, exercícios, evoluções |
| **estagiario** | Supervisão | Visualização de pacientes e protocolos, ações limitadas |
| **recepcionista** | Recepção e agendamento | Agenda, cadastro de pacientes, confirmações |
| **paciente** | Usuário final | Próprios dados, exercícios prescritos, histórico |
| **parceiro** | Parceiros comerciais | Módulos específicos (ex.: vouchers) |
| **pending** | Aguardando aprovação | Acesso restrito até aprovação |

---

## 5. Entidades e Relacionamentos

### 5.1 Coleções e entidades principais (Firebase / Firestore)

- **Autenticação e organização:** usuários no Firebase Auth; coleções `profiles`, `organizations` no Firestore
- **Pacientes e clínica:** `patients`, `patient_contacts`, `patient_goals`, `patient_objectives`, `patient_packages`
- **Agenda:** `appointments`, `blocked_slots`, `rooms`, `agenda_rooms`, `agenda_slots`
- **Prontuário / clínico:** `sessions`, `session_attachments`, `session_templates`, `medical_records`, `evolutions`, `evolution_attachments`, `body_pain_maps`, `pain_maps`, `pain_map_points`
- **Objetivos e patologias:** `goals`, `pathologies`, `surgeries`, `treatment_goals`, `treatment_procedures`
- **Avaliações:** `evaluation_forms`, `evaluation_form_fields`, `evaluation_responses`, `evaluation_templates`
- **Exercícios:** `exercises`, `exercise_categories`, `prescriptions`, `prescription_items`, `prescription_logs`
- **Testes e conduta:** `assessment_test_configs`, `test_results`, `conduct_templates`
- **Financeiro:** `financial_transactions`, `financial_accounts`, `payment_methods`, `payments`, `invoices`
- **Sistema:** `notifications`, `audit_logs`, `analytics_events`, `message_templates`
- **Marketing/CRM:** `leads`, `landing_pages`, `marketing_campaigns`
- **Outros:** `waitlist`, `waiting_list`, `package_usage`, `session_packages`, `knowledge_documents`, `whatsapp_connections`, `whatsapp_messages`, `backups`

### 5.2 Relacionamentos Principais (resumo)

- **organizations** 1:N **profiles** (usuários da organização)
- **organizations** 1:N **patients** (pacientes da organização)
- **patients** 1:N **appointments** (agendamentos do paciente)
- **patients** 1:1 **medical_records** (prontuário médico)
- **medical_records** 1:N **pathologies**, **surgeries**, **goals**
- **patients** 1:N **sessions** (sessões/evoluções)
- **appointments** 1:1 ou 0:1 **sessions** (sessão vinculada ao agendamento)
- **sessions** 1:N **session_attachments**, **test_results**
- **patients** 1:N **prescriptions** (prescrições de exercícios)
- **prescriptions** N:N **exercises** via **prescription_items**
- **patients** 1:N **pain_maps** / **body_pain_maps**
- **profiles** (therapist) N:1 **appointments** (therapist_id)
- **appointments** N:1 **rooms** (room_id quando existir)
- **patients** 1:N **patient_packages** (pacotes de sessões)
- **evaluation_forms** 1:N **evaluation_form_fields**; **evaluation_responses** referenciam paciente e formulário

### 5.3 Diagrama ER (textual)

```
organizations
    ├── profiles (id, organization_id, role, ...)
    ├── patients (id, organization_id, ...)
    ├── appointments (organization_id, patient_id, therapist_id→profiles, room_id, ...)
    └── ...

patients
    ├── appointments (patient_id)
    ├── medical_records (patient_id) 1:1
    │       ├── pathologies (medical_record_id)
    │       ├── surgeries (medical_record_id)
    │       └── goals (medical_record_id)
    ├── sessions (patient_id)
    │       ├── session_attachments (session_id, patient_id)
    │       └── test_results (session_id, patient_id)
    ├── prescriptions (patient_id)
    │       └── prescription_items (exercise_id)
    ├── pain_maps / body_pain_maps (patient_id)
    ├── patient_packages (patient_id)
    └── patient_goals (patient_id)

appointments
    └── sessions (appointment_id, opcional)

exercises
    └── prescription_items (exercise_id)
```

### 5.4 Tipos TypeScript principais (espelho das entidades)

- **Paciente:** `Patient` (src/types/index.ts) — id, full_name, email, phone, cpf, birth_date, gender, address, insurance, medical_history, etc.
- **Agendamento:** `AppointmentBase`, `EnhancedAppointment`, `AppointmentFormData` (src/types/appointment.ts); `AppointmentUnified`, `AppointmentStatus`, `AppointmentType` (src/types/index.ts).
- **Sessão/Evolução:** `SessionEvolution`, `SOAPRecord` (src/types/index.ts); `SessionEvolution`, `TestResult`, `ConductTemplate` (src/types/evolution.ts).
- **Exercício:** `Exercise`, `ExercisePlan`, `ExercisePlanItem`, `Prescription` (src/types/index.ts).
- **Prontuário:** `MedicalRecord`, `MedicalAttachment`; objetivos e patologias em `evolution.ts` (`PatientGoal`, `Pathology`, `Surgery`).
- **Avaliação:** tipos em `assessment.ts`, `clinical-forms.ts` conforme uso no projeto.
- **Usuário:** `UserRole`, `UserProfile` (docs e contexts); role em `profiles`.

### 5.5 Referências entre documentos (Firestore)

No Firestore, os relacionamentos são feitos por IDs de documento (ex.: `patient_id` em `appointments` referencia o doc em `patients`). Exemplos:

- `appointments.patient_id` → documento em `patients`
- `appointments.therapist_id` → documento em `profiles`
- `sessions.patient_id` → `patients`
- `sessions.appointment_id` → `appointments`
- `sessions.therapist_id` → `profiles`
- `medical_records.patient_id` → `patients`
- subcoleções ou docs `goals`, `pathologies`, `surgeries` referenciam `medical_records`
- `patient_packages.patient_id` → `patients`
- `session_attachments` referenciam `sessions` e `patients`

Firestore Security Rules garantem que apenas dados da **organization_id** (e role) do usuário autenticado sejam acessíveis.

---

## 6. Rotas e Navegação

- **Públicas:** `/welcome`, `/auth`, `/auth/login`, `/pre-cadastro`, `/prescricoes/publica/:qrCode`, `/agendar/:slug`
- **Protegidas (qualquer usuário autenticado):** `/` (agenda), `/dashboard`, `/patients`, `/patients/:id`, `/exercises`, `/protocols`, `/financial`, `/reports`, `/settings`, `/profile`, `/session-evolution/:appointmentId`, `/patient-evolution/:appointmentId`, `/schedule/settings`, `/communications`, `/eventos`, `/gamification`, etc.
- **Protegidas por role (admin):** `/admin/users`, `/admin/audit-logs`, `/admin/invitations`, `/admin/security`, `/admin/organization`, `/admin/analytics`, `/admin/cohorts`, `/admin/goals`, `/pre-cadastro-admin`
- **Protegidas (admin ou fisioterapeuta):** `/admin/crud`, `/admin/gamification`, `/admin/goals/:id`
- **Pending:** `/pending-approval` (usuário com role `pending`)

Definição completa em `src/routes.tsx`; lazy loading por chunk nomeado para cada página.

---

## 7. Stack e Integrações

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 18, TypeScript, Vite |
| UI | shadcn/ui, Tailwind CSS, Radix UI |
| Estado/forms | TanStack Query, Zustand, React Hook Form, Zod |
| Roteamento | React Router 6 |
| Backend/DB | Firebase (Firestore, Auth, Realtime, Storage, Cloud Functions) |
| Autenticação | Firebase Auth, Firestore Security Rules |
| Deploy web | Firebase Hosting (100% Firebase + GCP) |
| Monitoramento | Cloud Monitoring, Sentry, Web Vitals |

Integrações em uso ou planejadas: Google Calendar, Resend, WhatsApp Business API, Stripe (vouchers/pagamentos), ViaCEP.

---

## Referências

- **PRD:** `prd.md`
- **README:** `README.md`
- **Plano de infraestrutura (Firebase + GCP):** `docs2026/PLANO_FIREBASE_GCP.md`
- **Arquitetura:** `docs2026/02-arquitetura.md`
- **Banco de dados:** `docs2026/05-banco-dados.md`
- **Autenticação:** `docs2026/06-autenticacao-seguranca.md`
- **Funcionalidades por área:** `docs2026/funcionalidades/*.md` (agenda, pacientes, prontuário, exercicios, avaliacoes, financeiro, relatorios, etc.)
- **Tipos:** `src/types/*.ts`
- **Rotas:** `src/routes.tsx`

---

*FisioFlow — Documentação consolidada do sistema. Fevereiro 2026.*
