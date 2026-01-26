# FisioFlow - Planejamento Completo para Firebase Studio
## 100% Ecossistema Google - Do Zero

**Data:** Janeiro 2026
**Escopo:** Web + App iOS Paciente + App iOS Profissional
**Meta:** 600 atendimentos/mês, 15 profissionais, 30 pacientes (testes)

---

## ÍNDICE

1. [Decisão Inicial: Firebase Studio](#1-decisão-inicial-firebase-studio)
2. [Arquitetura Google Recomendada](#2-arquitetura-google-recomendada)
3. [Roadmap Completo](#3-roadmap-completo)
4. [PROMPT INICIAL para Firebase Studio](#4-prompt-inicial-para-firebase-studio)
5. [Prompts por Fase](#5-prompts-por-fase)
6. [Checklist de Implementação](#6-checklist-de-implementação)

---

## 1. DECISÃO INICIAL: FIREBASE STUDIO

### O que escolher na tela inicial do Firebase Console?

```
ESCOLHA: ────────────────┐
│                         │
│  [ New Workspace ]     │  ✅ RECOMENDADO
│                         │
└─────────────────────────┘
```

**Por que New Workspace?**
- Projeto do ZERO, sem migrations complexas
- Pode configurar stack Google 100% integrado
- Evita conflitos com Supabase/Vercel anteriores

**NÃO escolha:**
- ❌ Import Repo (traz legacy code e debt técnico)
- ❌ Tecnologias antigas (Go, Java, .NET) - não se aplica ao seu caso

### Tecnologia Firebase a escolher

```
ESCOLHA INICIAL: ──────────────────┐
│                                   │
│  [ Flutter ]  ou  [ NextJS ]     │  ✅ RECOMENDADO
│                                   │
└───────────────────────────────────┘
```

**Recomendação para seu caso:**
- **Web Admin:** NextJS (já domina, ótimo para dashboards)
- **Apps iOS:** Flutter (UM código para iOS + Android, Firebase nativo)

---

## 2. ARQUITETURA GOOGLE RECOMENDADA

### Stack 100% Google

| Camada | Tecnologia Google | Justificativa |
|--------|-------------------|---------------|
| **Frontend Web** | Next.js + Firebase Hosting | Hosting global, Edge Network |
| **Mobile iOS/Android** | Flutter + Firebase SDK | Código compartilhado, Firebase nativo |
| **Autenticação** | Firebase Auth | Multi-provider, custom claims |
| **Banco Transacional** | Cloud SQL (PostgreSQL) | JOINs complexos, relatórios |
| **Banco Realtime** | Cloud Firestore | Offline, sync, listeners |
| **Storage** | Firebase Storage | Vídeos, imagens, documentos |
| **Backend** | Cloud Functions (2nd gen) | Gatilhos, webhooks, AI |
| **AI/ML** | Gemini API + Vertex AI | Sugestões clínicas, análise |
| **Notificações** | Firebase Cloud Messaging | Push para apps |
| **Analytics** | Firebase Analytics | Funis, retenção |
| **Testes** | Firebase App Distribution | Beta iOS/Android |
| **Logs/Monitoramento** | Cloud Logging + Error Reporting | Debug, erros em produção |

### Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FISIOFLOW - GCP STACK                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐            │
│  │  WEB ADMIN   │      │ IOS PACIENTE │      │ IOS PROFISSIONAL │         │
│  │   (NextJS)   │      │  (Flutter)   │      │   (Flutter)   │            │
│  └──────┬───────┘      └──────┬───────┘      └──────┬───────┘            │
│         │                     │                      │                     │
│         └─────────────────────┼──────────────────────┘                     │
│                               │                                            │
│                    ┌──────────▼──────────┐                                 │
│                    │  Firebase Auth      │                                 │
│                    │  (Email, Apple,     │                                 │
│                    │   Google, Phone)    │                                 │
│                    └──────────┬──────────┘                                 │
│                               │                                            │
│         ┌─────────────────────┼─────────────────────┐                     │
│         │                     │                     │                     │
│  ┌──────▼──────┐      ┌──────▼───────┐     ┌──────▼──────┐              │
│  │ Cloud SQL   │      │ Firestore    │     │   Firebase   │              │
│  │ (PostgreSQL)│      │ (Realtime)   │     │   Storage    │              │
│  │             │      │              │     │             │              │
│  │ • patients  │      │ • chat       │     │ • vídeos     │              │
│  │ • sessions  │      │ • check-ins  │     │ • fotos      │              │
│  │ • billing   │      │ • presence   │     │ • docs       │              │
│  │ • schedule  │      │ • feed       │     │             │              │
│  └──────┬──────┘      └──────┬───────┘     └─────────────┘              │
│         │                     │                                           │
│         └─────────────────────┼─────────────────────┐                     │
│                               │                     │                     │
│                    ┌──────────▼──────────┐  ┌──────▼──────┐              │
│                    │  Cloud Functions    │  │ Gemini API  │              │
│                    │  (Node.js 2nd gen)  │  │             │              │
│                    │                     │  │ • IA clínic│              │
│                    │ • webhooks          │  │ • exercise │              │
│                    │ • cron jobs         │  │   suggest  │              │
│                    │ • business logic    │  │ • movement │              │
│                    │ • AI orchestration  │  │   analysis │              │
│                    └─────────────────────┘  └─────────────┘              │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │             Google Cloud Platform Services (shared)                  │ │
│  │  • Cloud Logging • Cloud Monitoring • Error Reporting               │ │
│  │  • Firebase Analytics • Firebase App Distribution • FCM             │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Quando usar Cloud SQL vs Firestore

| Use Cloud SQL quando... | Use Firestore quando... |
|------------------------|-------------------------|
| Precisa de JOINs complexos | Precisa de realtime/offline |
| Dados altamente relacionais | Feed de atividades |
| Relatórios financeiros | Chat/comentários |
| Integridade referencial forte | Presença de usuário |
| Exportações para CSV/PDF | Check-ins diários |
| Auditoria completa | Sincronização rápida |

---

## 3. ROADMAP COMPLETO

### Visão Geral das Fases

| Fase | Duração | Objetivo | Entrega |
|------|---------|----------|---------|
| **0** | 1-2 sem | Fundação | Projeto configurado, design system |
| **1** | 3-4 sem | Web MVP | Gestão de pacientes, agenda, SOAP |
| **2** | 4-6 sem | iOS Paciente | App funcional para testes |
| **3** | 4-6 sem | iOS Profissional | App completo para fisios |
| **4** | 2-4 sem | Beta & Polish | Testes, ajustes, publicação |

### Detalhamento das Fases

#### FASE 0 - Fundação (1-2 semanas)

```
Semana 1:
├── Configurar Firebase Projects (dev/staging/prod)
├── Setup Monorepo (Nx ou Turborepo)
├── Configurar Design System
└── Definir modelos de dados

Semana 2:
├── Implementar Firebase Auth + Custom Claims
├── Setup Cloud SQL (schema inicial)
├── Setup Firestore (collections iniciais)
└── Configurar CI/CD
```

#### FASE 1 - Web MVP (3-4 semanas)

```
Semana 3-4: Pacientes + Agenda
├── CRUD Pacientes completo
├── Calendário visual (dia/semana/mês)
├── Detecção de conflitos
└── Reagendamento drag-and-drop

Semana 5-6: Sessões Clínicas (SOAP)
├── Evolução estruturada
├── Mapa de dor interativo
├── Anexos e documentos
└── Templates de avaliação

Semana 7-8: WhatsApp + Financeiro Básico
├── Integração WhatsApp Cloud API
├── Lembretes automáticos
├── Lista de espera
└── Pacotes de sessões
```

#### FASE 2 - iOS Paciente (4-6 semanas)

```
Semana 9-10: Fundação + Auth
├── Setup Flutter + Firebase
├── Login/Registro
├── Navegação
└── Design System compartilhado

Semana 11-13: Funcionalidades Core
├── Plano do dia
├── Execução de exercícios
├── Check-in de dor
└── Streak/metas

Semana 14-15: Engajamento
├── Push notifications
├── Lembretes
├── Progresso visual
└── Comunicação com clínica
```

#### FASE 3 - iOS Profissional (4-6 semanas)

```
Semana 16-17: Fundação + Agenda
├── Setup Flutter (app separado)
├── Agenda mobile
├── Filtros e busca
└── Offline mode

Semana 18-20: Clínico
├── Paciente 360
├── Evolução rápida
├── Prescrição de planos
└── Alertas e aderência

Semana 21-22: Analytics
├── Dashboard de métricas
├── Relatórios de adesão
├── Comparativos
└── Exportações
```

#### FASE 4 - Beta & Polish (2-4 semanas)

```
Semana 23-24: Testes Controlados
├── App Distribution (testers internos)
├── Beta com 30 pacientes
├── Coleta de feedback
└── Ajustes finos

Semana 25-26: Publicação
├── Submissão App Store
├── Deploy Web produção
├── Monitoramento
└── Documentação
```

---

## 4. PROMPT INICIAL PARA FIREBASE STUDIO

### Copie e cole este prompt no Firebase Studio AI:

```
═══════════════════════════════════════════════════════════════════════════════
FISIOFLOW - SISTEMA DE GESTÃO PARA FISIOTERAPIA
Prompt Inicial para Criação do Projeto 100% Google Cloud Platform
═══════════════════════════════════════════════════════════════════════════════

CONTEXTO DO PROJETO:
───────────────────────────────────────────────────────────────────────────────
Sou fisioterapeuta e estou criando um sistema completo para minha clínica de
fisioterapia esportiva. Atualmente faço ~600 atendimentos/mês, tenho 15
funcionários, e preciso de um sistema que escale para 100+ clínicas.

PRECISO CRIAR 3 PRODUTOS:
1. Web App (Admin/Operacional) - Next.js + Firebase
2. iOS App Paciente - Flutter + Firebase
3. iOS App Profissional - Flutter + Firebase

ARQUITETURA GOOGLE QUE QUERO:
───────────────────────────────────────────────────────────────────────────────
• Autenticação: Firebase Auth (Email, Google, Apple, Phone)
• Banco Transacional: Cloud SQL (PostgreSQL)
• Banco Realtime: Cloud Firestore
• Storage: Firebase Storage (vídeos, imagens, documentos)
• Backend: Cloud Functions (2nd gen, Node.js)
• AI: Gemini API + Vertex AI
• Hosting: Firebase Hosting + Cloud Run
• Notificações: Firebase Cloud Messaging
• Analytics: Firebase Analytics
• Testes: Firebase App Distribution

REGRAS DE NEGÓCIO PRINCIPAIS:
───────────────────────────────────────────────────────────────────────────────

1. USUÁRIOS E PERMISSÕES (RBAC):
   • admin - Acesso total, gestão de equipe, configurações
   • fisioterapeuta - Gestão de pacientes, evoluções, prescrições
   • estagiario - Acesso leitura, evoluções limitadas
   • recepcionista - Agenda, cadastros, pagamento
   • paciente - Acesso apenas aos próprios dados
   • parceiro - Acesso limitado por clínica

2. PACIENTES:
   • Cadastro completo: nome, CPF, email, telefone, data nascimento
   • Histórico médico: patologias (CID), cirurgias, alergias, medicamentos
   • Contatos: emergência, responsável, convênio
   • Status: Em Tratamento, Recuperação, Inicial, Concluído
   • Documentos: RG, CPF, exames, fotos

3. AGENDAMENTO:
   • Tipos: Consulta Inicial, Fisioterapia, Reavaliação, Retorno
   • Durações: 15, 30, 45, 60 minutos
   • Status: Confirmado, Pendente, Reagendado, Cancelado, Realizado
   • Regras: Sem conflitos, lista de espera automática, lembretes 24h
   • Múltiplos profissionais e salas

4. SESSÕES CLÍNICAS (SOAP):
   • Subjetivo: Queixa principal, histórico, sintomas
   • Objetivo: Exame físico, medidas, testes
   • Avaliação: Diagnóstico, prognóstico
   • Plano: Tratamento, exercícios, orientações
   • Mapa de dor interativo (corpo humano SVG)
   • Escala EVA 0-10 com cores

5. EXERCÍCIOS:
   • Biblioteca com 500+ exercícios
   • Categorias: fortalecimento, alongamento, mobilidade, cardio, equilíbrio
   • Níveis: iniciante, intermediário, avançado
   • Prescrição: séries, repetições, tempo, carga
   • Vídeos demonstrativos

6. FINANCEIRO:
   • Pacotes de sessões com validade
   • Débito automático por atendimento
   • Pagamentos: PIX, cartão, dinheiro
   • Alertas: pacote expirando, saldo baixo
   • Relatórios: faturamento, inadimplência

7. WHATSAPP (Cloud API):
   • Lembretes 24h antes da consulta
   • Confirmação por botões interativos (SIM/NÃO)
   • Lista de espera automática
   • Templates aprovados Meta

MODELO DE DADOS - CLOUD SQL (PostgreSQL):
───────────────────────────────────────────────────────────────────────────────

Tabela: organizations
  • id (UUID, PK)
  • name (varchar)
  • cnpj (varchar)
  • settings (jsonb)
  • created_at, updated_at

Tabela: users (Firebase Auth + perfil)
  • id (UUID, PK) = Firebase UID
  • organization_id (UUID, FK)
  • name (varchar)
  • email (varchar, unique)
  • phone (varchar)
  • role (enum: admin, physio, intern, reception, patient, partner)
  • status (enum: active, inactive)
  • created_at, updated_at

Tabela: patients
  • id (UUID, PK)
  • organization_id (UUID, FK)
  • user_id (UUID, FK, nullable) - se tiver app
  • full_name (varchar)
  • cpf (varchar, unique)
  • email (varchar)
  • phone (varchar)
  • date_of_birth (date)
  • emergency_contact (jsonb)
  • insurance (jsonb)
  • medical_history (jsonb)
  • status (enum: active, treatment, recovery, initial, completed)
  • progress (integer 0-100)
  • created_at, updated_at

Tabela: appointments
  • id (UUID, PK)
  • organization_id (UUID, FK)
  • patient_id (UUID, FK)
  • professional_id (UUID, FK)
  • room_id (UUID, FK)
  • type (enum: initial, physio, reevaluation, return)
  • duration (integer) - minutos
  • scheduled_at (timestamp)
  • status (enum: confirmed, pending, rescheduled, cancelled, completed)
  • confirmation_status (enum: confirmed, cancelled, no_show, pending)
  • notes (text)
  • created_at, updated_at

Tabela: treatment_sessions (SOAP)
  • id (UUID, PK)
  • organization_id (UUID, FK)
  • patient_id (UUID, FK)
  • professional_id (UUID, FK)
  • appointment_id (UUID, FK, nullable)
  • subjective (text)
  • objective (jsonb) - exame físico estruturado
  • assessment (text)
  • plan (text)
  • pain_map (jsonb) - pontos e intensidades
  • pain_level (integer 0-10)
  • attachments (jsonb) - URLs Storage
  • created_at, updated_at

Tabela: exercise_library
  • id (UUID, PK)
  • name (varchar)
  • category (enum: strength, stretch, mobility, cardio, balance, respiratory)
  • level (enum: beginner, intermediate, advanced)
  • muscle_groups (jsonb)
  • equipment (jsonb)
  • contraindications (jsonb)
  • video_url (varchar) - Firebase Storage
  • thumbnail_url (varchar)
  • instructions (text)
  • created_at, updated_at

Tabela: exercise_prescriptions
  • id (UUID, PK)
  • organization_id (UUID, FK)
  • patient_id (UUID, FK)
  • professional_id (UUID, FK)
  • exercises (jsonb) - [{exercise_id, sets, reps, duration, load}]
  • start_date (date)
  • end_date (date)
  • frequency (integer) - vezes por semana
  • notes (text)
  • created_at, updated_at

Tabela: patient_packages
  • id (UUID, PK)
  • organization_id (UUID, FK)
  • patient_id (UUID, FK)
  • total_sessions (integer)
  • used_sessions (integer)
  • unit_price (decimal)
  • total_price (decimal)
  • expires_at (date)
  • status (enum: active, completed, expired)
  • created_at, updated_at

Tabela: payments
  • id (UUID, PK)
  • organization_id (UUID, FK)
  • patient_id (UUID, FK)
  • package_id (UUID, FK)
  • amount (decimal)
  • method (enum: pix, credit_card, debit_card, cash, transfer)
  • status (enum: pending, completed, failed, refunded)
  • paid_at (timestamp)
  • created_at, updated_at

Tabela: waiting_list
  • id (UUID, PK)
  • organization_id (UUID, FK)
  • patient_id (UUID, FK)
  • preferred_days (jsonb)
  • preferred_times (jsonb)
  • preferred_professional_id (UUID, FK, nullable)
  • priority (enum: normal, high, urgent)
  • status (enum: active, offered, declined, fulfilled)
  • created_at, updated_at

MODELO DE DADOS - CLOUD FIRESTORE (Realtime/UX):
───────────────────────────────────────────────────────────────────────────────

Collection: organizations/{orgId}/
  • settings (document) - configurações em cache

Collection: patients/{patientId}/
  • daily_checkins (collection) - check-ins de dor/RPE
  • exercise_progress (collection) - progresso de exercícios
  • notifications (collection) - notificações do app

Collection: appointments/{appointmentId}/
  • realtime_status (document) - status para sincronização
  • chat (collection) - chat paciente-clínica

Collection: users/{userId}/
  • presence (document) - online/offline
  • devices (collection) - dispositivos para push

Collection: feed/{orgId}/
  • events (collection) - feed de atividade da clínica

SEGURANÇA E AUTENTICAÇÃO:
───────────────────────────────────────────────────────────────────────────────

1. Firebase Auth Configuration:
   • Email/Password provider
   • Google OAuth provider
   • Apple OAuth provider
   • Phone authentication

2. Custom Claims (RBAC):
   • role: "admin" | "physio" | "intern" | "reception" | "patient" | "partner"
   • tenantId: UUID da organização
   • permissions: array de permissões específicas

3. Firestore Security Rules (deny by default):
   • Todas as collections começam com deny
   • Regras específicas por role
   • Validação de tenantId
   • Acesso apenas aos próprios dados para pacientes

4. Cloud SQL Access:
   • Nunca acesso direto do client
   • Sempre via Cloud Functions com Admin SDK
   • Connection pooling autorizado via IAM

O QUE PRECISO QUE VOCÊ CRIE PRIMEIRO:
───────────────────────────────────────────────────────────────────────────────

FASE 0 - Setup Inicial:

1. Estrutura do Monorepo (Nx ou Turborepo):
   /apps
     /web (Next.js 15 + TypeScript)
     /patient-app (Flutter)
     /professional-app (Flutter)
   /services
     /api (Cloud Functions Node.js)
   /packages
     /ui (Design System compartilhado)
     /types (TypeScript types compartilhados)
     /domain (Regras de negócio)
     /firebase-clients (Firebase SDKs)

2. Design System (shadcn/ui para Web, Flutter Material para Mobile):
   - Cores: primary blue #0d7ff2, pain scale (green→yellow→red)
   - Tipografia: Inter
   - Componentes base: Button, Card, Input, Select, Modal, Toast
   - Estados: loading, empty, error, success

3. Firebase Projects Structure:
   - fisioflow-dev (desenvolvimento)
   - fisioflow-staging (homologação)
   - fisioflow-prod (produção)

4. Cloud SQL Schema:
   - Criar todas as tabelas listadas acima
   - Migrations com Drizzle ORM
   - Seed data inicial

5. Cloud Functions Structure:
   - /api/patients - CRUD pacientes
   - /api/appointments - Gestão de agenda
   - /api/sessions - Sessões SOAP
   - /api/exercises - Biblioteca de exercícios
   - /api/payments - Pagamentos
   - /api/whatsapp - Webhook WhatsApp
   - /triggers - Gatilhos database/ Firestore

COMECE CRIANDO:
───────────────────────────────────────────────────────────────────────────────

1. A estrutura do monorepo
2. O schema do Cloud SQL (SQL DDL)
3. As Firebase Functions básicas (auth, patients)
4. O design system base

Depois me mostre o código e eu valido antes de continuarmos para as próximas fases.

═══════════════════════════════════════════════════════════════════════════════
```

---

## 5. PROMPTS POR FASE

### FASE 0 - Fundação

```
Prompt Fase 0.1 - Setup Monorepo:
───────────────────────────────────────────────────────────────────────────────
Crie a estrutura do monorepo para FisioFlow usando Nx:

1. Workspace com:
   - app:web (Next.js 15, TypeScript, Tailwind, shadcn/ui)
   - app:patient-ios (Flutter)
   - app:professional-ios (Flutter)
   - api (Cloud Functions Node.js 2nd gen)

2. Packages compartilhados:
   - @fisioflow/ui (Design System)
   - @fisioflow/types (Zod schemas, TypeScript types)
   - @fisioflow/domain (Business logic)
   - @fisioflow/firebase (Firebase clients)

3. Configurações:
   - TypeScript strict mode
   - ESLint + Prettier
   - Husky pre-commit hooks
   - CI/CD com GitHub Actions

4. Design System @fisioflow/ui:
   - Tokens: cores (primary #0d7ff2, pain 0-10 scale), tipografia, spacing
   - Componentes: Button, Card, Input, Select, Modal, Toast, Skeleton
   - Temas: light/dark

Gere o código completo.
───────────────────────────────────────────────────────────────────────────────
```

```
Prompt Fase 0.2 - Firebase Auth + Custom Claims:
───────────────────────────────────────────────────────────────────────────────
Configure o Firebase Authentication com Custom Claims para RBAC:

1. Providers habilitados:
   - Email/Password
   - Google OAuth
   - Apple OAuth
   - Phone Auth

2. Custom Claims structure:
   {
     role: 'admin' | 'physio' | 'intern' | 'reception' | 'patient' | 'partner',
     tenantId: string, // UUID da organização
     permissions: string[]
   }

3. Cloud Function para setar claims (admin only):
   - callable: setCustomClaims
   - validação: apenas admin pode setar claims
   - audit log em Cloud Logging

4. Middleware de verificação de claims:
   - para Next.js (middleware.ts)
   - para Cloud Functions
   - para Flutter apps

5. Types TypeScript compartilhados:
   interface UserClaims {
     role: UserRole;
     tenantId: string;
     permissions: Permission[];
   }

Gere o código completo.
───────────────────────────────────────────────────────────────────────────────
```

```
Prompt Fase 0.3 - Cloud SQL Schema:
───────────────────────────────────────────────────────────────────────────────
Crie o schema completo do Cloud SQL PostgreSQL com Drizzle ORM:

1. Tabelas (conforme modelo de dados):
   - organizations
   - users
   - patients
   - appointments
   - treatment_sessions
   - exercise_library
   - exercise_prescriptions
   - patient_packages
   - payments
   - waiting_list

2. Configurações Drizzle:
   - Migrations folder
   - Seed script com dados de teste
   - Indexes otimizados
   - Foreign keys com CASCADE

3. Connection pooling:
   - Cloud SQL connector
   - Knex.js pool config
   - retry logic

4. Repositórios base:
   - BaseRepository<T>
   - CRUD operations genéricas
   - Transaction support

Gere o SQL DDL e o código Drizzle ORM.
───────────────────────────────────────────────────────────────────────────────
```

### FASE 1 - Web MVP

```
Prompt Fase 1.1 - CRUD Pacientes:
───────────────────────────────────────────────────────────────────────────────
Implemente o módulo de Gestão de Pacientes para o Web App:

1. Tabelas do Cloud Functions (API):
   - GET /api/patients - Listar com filtros e paginação
   - GET /api/patients/:id - Buscar por ID
   - POST /api/patients - Criar novo
   - PUT /api/patients/:id - Atualizar
   - DELETE /api/patients/:id - Soft delete

2. Validações (Zod):
   - CPF válido (algoritmo)
   - Email único por organização
   - Telefone formato BR
   - Data de nascimento válida

3. Páginas Next.js:
   - /patients - Lista com busca e filtros
   - /patients/new - Formulário criação
   - /patients/:id - Detalhes do paciente
   - /patients/:id/edit - Edição

4. Componentes shadcn/ui:
   - PatientCard
   - PatientForm
   - PatientSearch
   - MedicalHistoryViewer

5. Features:
   - Busca por nome, CPF ou telefone
   - Filtro por status
   - Ordenação por diversos campos
   - Export CSV

Gere o código completo.
───────────────────────────────────────────────────────────────────────────────
```

```
Prompt Fase 1.2 - Agenda Inteligente:
───────────────────────────────────────────────────────────────────────────────
Implemente o módulo de Agendamento com Calendário Visual:

1. Cloud Functions API:
   - GET /api/appointments - Listar com filtros de data/profissional
   - POST /api/appointments - Criar (com validação de conflito)
   - PUT /api/appointments/:id - Atualizar/Reagendar
   - DELETE /api/appointments/:id - Cancelar
   - GET /api/appointments/availability - Slots disponíveis

2. Validações:
   - Sem sobreposição de horários (considerando duração)
   - Profissional disponível
   - Sala disponível
   - Horário dentro do funcionamento da clínica

3. Componentes de Calendário:
   - DayView (visão diária com timeline)
   - WeekView (visão semanal)
   - MonthView (visão mensal)
   - AppointmentCard (drag and drop)

4. Features:
   - Criar agendamento clicando no slot
   - Reagendar arrastando
   - Detecção visual de conflitos
   - Filtros por profissional/sala

5. Integração:
   - Google Calendar sync (Cloud Function)
   - WhatsApp reminder (Cloud Function agendada)

Use React Big Calendar ou biblioteca similar.
Gere o código completo.
───────────────────────────────────────────────────────────────────────────────
```

```
Prompt Fase 1.3 - SOAP + Mapa de Dor:
───────────────────────────────────────────────────────────────────────────────
Implemente o módulo de Sessões Clínicas (SOAP) com Mapa de Dor Interativo:

1. Cloud Functions API:
   - GET /api/sessions - Listar sessões do paciente
   - GET /api/sessions/:id - Buscar sessão
   - POST /api/sessions - Criar nova evolução
   - PUT /api/sessions/:id - Atualizar

2. Mapa de Dor Interativo:
   - SVG do corpo humano (frente/verso)
   - Clique para adicionar ponto de dor
   - Escala EVA 0-10 com cores:
     • 0-3: verde (#4ade80)
     • 4-6: amarelo (#fbbf24)
     • 7-10: vermelho (#ef4444)
   - Tamanho do ponto proporcional à intensidade
   - Comparativo evolução (sessões anteriores)

3. Formulário SOAP estruturado:
   - Subjetivo: textarea + templates
   - Objetivo: campos estruturados (ADM, ROM, força, etc)
   - Avaliação: textarea + diagnóstico CID
   - Plano: textarea + prescrição de exercícios

4. Features:
   - Auto-save (salvar rascunho a cada 30s)
   - Upload de anexos (Firebase Storage)
   - Gerar PDF da evolução
   - Templates por patologia

5. Componentes:
   - SOAPForm
   - PainMap (SVG interativo)
   - SessionHistory (timeline)
   - AttachmentUploader

Gere o código completo.
───────────────────────────────────────────────────────────────────────────────
```

```
Prompt Fase 1.4 - WhatsApp Cloud API Integration:
───────────────────────────────────────────────────────────────────────────────
Implemente a integração com WhatsApp Business Cloud API:

1. Cloud Functions:
   - /api/whatsapp/webhook - Receber webhooks
   - /api/whatsapp/send - Enviar mensagem
   - /functions/scheduleReminders - Cloud Scheduler

2. Templates WhatsApp (aprovados Meta):
   - agendamento_confirmacao - Com botões SIM/NÃO
   - agendamento_lembrete - 24h antes
   - lista_espera_vaga - Oferta de horário
   - pacote_expirando - Alerta de validade

3. Fluxo de Confirmação:
   a) Cloud Scheduler dispara 24h antes
   b) Envia template com botões
   c) Webhook processa resposta
   d) Atualiza status no Cloud SQL
   e) Se cancelado, oferece lista de espera

4. Lista de Espera Automática:
   - Trigger: cancelamento recebido
   - Busca pacientes na waiting_list
   - Oferece vaga por ordem de prioridade
   - Timeout de 2h para resposta
   - Se aceito, cria agendamento

5. Componentes admin:
   - WhatsAppStatusPage (ver status dos envios)
   - TemplateEditor (editar mensagens)
   - SettingsPage (configurar horários)

Gere o código completo incluindo o webhook handler.
───────────────────────────────────────────────────────────────────────────────
```

### FASE 2 - iOS Paciente

```
Prompt Fase 2.1 - Flutter App Paciente - Fundação:
───────────────────────────────────────────────────────────────────────────────
Crie o Flutter App Paciente com Firebase:

1. Setup Flutter:
   - flutter_riverpod (state management)
   - go_router (navegação)
   - firebase_core, firebase_auth
   - cloud_firestore, firebase_storage
   - firebase_messaging

2. Estrutura de pastas:
   /lib
     /core
       /theme (tema compartilhado web)
       /constants
       /utils
     /features
       /auth
       /home
       /exercises
       /profile
     /shared
       /widgets
       /services

3. Auth Flow:
   - SplashScreen
   - LoginScreen (email, Google, Apple)
   - RegisterScreen
   - ForgotPasswordScreen

4. Design System Flutter:
   - Cores do @fisioflow/ui
   - Tipografia Inter
   - Componentes customizados (Buttons, Cards, Inputs)
   - Responsivo para iPhone SE até iPhone 15 Pro Max

5. Integração Firebase Auth:
   - Email/Password
   - Google SignIn
   - Apple SignIn
   - Phone Auth (SMS)
   - Persistência de sessão

6. Perfil do Paciente:
   - Buscar dados do Cloud SQL via API
   - Cache local (Hive/SharedPreferences)
   - Sincronização em background

Gere o código completo.
───────────────────────────────────────────────────────────────────────────────
```

```
Prompt Fase 2.2 - Plano do Dia + Execução de Exercícios:
───────────────────────────────────────────────────────────────────────────────
Implemente as telas principais do App Paciente:

1. HomeScreen (Plano do Dia):
   - Header com saudação e streak
   - Card "Plano de Hoje" com CTA principal
   - Check-in rápido de dor (EVA 0-10)
   - Card "Próxima Sessão" (data, horário, profissional)
   - Progresso semanal (gráfico circular)

2. ExerciseExecutionScreen:
   - Vídeo do exercício (player em loop)
   - Contador de séries/repetições
   - Timer para descanso
   - RPE pós-exercício (1-10)
   - Dor pós-exercício (0-10)
   - Botão "Não consegui" com motivo

3. Check-in Dor:
   - Mapa de dor simplificado (2D)
   - Escala EVA com slider
   - Commentário opcional
   - Salvar no Firestore (daily_checkins)

4. StreakGamification:
   - Contador de dias consecutivos
   - Metas semanais
   - Conquistas desbloqueadas
   - Confetes ao completar meta

5. Notificações Push (FCM):
   - Lembrete plano do dia (8h)
   - Lembrese exercício pendente (19h)
   - Confirmação consulta (24h antes)

Gere o código completo com animações.
───────────────────────────────────────────────────────────────────────────────
```

```
Prompt Fase 2.3 - Progresso e Comunicação:
───────────────────────────────────────────────────────────────────────────────
Implemente as telas de Progresso e Comunicação do App Paciente:

1. ProgressScreen:
   - Gráfico de adesão (últimos 30 dias)
   - Evolução da dor (line chart)
   - Histórico de sessões
   - Comparativo antes/depois (fotos)
   - PROMs scores (DASH, LEFS, etc)

2. UpcomingSessionScreen:
   - Detalhes da próxima consulta
   - Botão "Confirmar presença"
   - Checklist antes da sessão
   - Questões para levar ao fisio

3. ChatScreen (com clínica):
   - Chat simples com Firebase Firestore
   - Mensagens texto + áudio
   - Respostas rápidas (templates)
   - Notificação de nova mensagem

4. ProfileScreen:
   - Dados cadastrais
   - Configurações de notificação
   - Termos de consentimento
   - Sair (logout)

5. Offline Support:
   - Cache de exercícios (vídeos)
   - Sincronização quando online
   - Fila de operações pendentes

Gere o código completo.
───────────────────────────────────────────────────────────────────────────────
```

### FASE 3 - iOS Profissional

```
Prompt Fase 3.1 - Flutter App Profissional - Fundação:
───────────────────────────────────────────────────────────────────────────────
Crie o Flutter App Profissional (separado do Paciente):

1. Setup Flutter (structure igual paciente-app):
   - Mesmas packages compartilhadas
   - Design system consistente

2. Auth Flow Profissional:
   - Login (email, Google, Apple)
   - Validação de custom claims (role != 'patient')
   - Bloqueio se não for profissional

3. Tab Navigation:
   - Agenda (hoje)
   - Pacientes
   - Prescrições
   - Perfil

4. Layout Mobile-First para iPad:
   - Split view no iPad
   - Colaboração em tempo real
   - Multi-tasking

Gere o código completo.
───────────────────────────────────────────────────────────────────────────────
```

```
Prompt Fase 3.2 - Agenda + Paciente 360:
───────────────────────────────────────────────────────────────────────────────
Implemente as telas principais do App Profissional:

1. AgendaScreen (Mobile):
   - Lista de hoje (timeline)
   - Filtros: profissional, sala, status
   - Status badges (confirmado, pendente, etc)
   - Ações rápidas: confirmar, cancelar, reagendar
   - Alertas: paciente com dor alta, baixa adesão

2. PatientDetailScreen (Paciente 360):
   - Header: foto, nome, status, progresso
   - Tabs: Visão Geral, Evoluções, Exercícios, Métricas
   - Timeline de sessões (SOAP resumido)
   - Gráfico de dor ao longo do tempo
   - Último check-in do app
   - Ações: Nova evolução, Prescrever exercícios

3. PatientSearchScreen:
   - Busca por nome ou CPF
   - Filtros: status, patologia
   - Lista recente
   - Adicionar paciente rápido

4. QuickSOAPScreen:
   - Formulário SOAP simplificado
   - Mapa de dor touch
   - Dictation (speech-to-text)
   - Templates frequentes
   - Salvar e voltar para agenda

Gere o código completo.
───────────────────────────────────────────────────────────────────────────────
```

```
Prompt Fase 3.3 - Prescrição de Exercícios:
───────────────────────────────────────────────────────────────────────────────
Implemente o módulo de Prescrição de Exercícios:

1. ExerciseLibraryScreen:
   - Busca por nome, categoria, músculo
   - Filtros: nível, equipamento
   - Preview do vídeo
   - Favoritos

2. ExerciseBuilderScreen (drag and drop):
   - Lista de exercícios à esquerda
   - Área de prescrição à direita
   - Arrastar para adicionar
   - Configurar: séries, reps, tempo, carga
   - Preview para o paciente

3. PrescriptionTemplates:
   - Salvar como template
   - Templates por patologia
   - Clonar prescrição

4. AI Suggestions (Gemini):
   - "Sugerir exercícios para [condição]"
   - Baseado em restrições do paciente
   - Explicação clínica

5. PrescriptionPreview:
   - Como o paciente vê
   - Compartilhar link/WhatsApp
   - Gerar PDF

Gere o código completo.
───────────────────────────────────────────────────────────────────────────────
```

### FASE 4 - Beta & Polish

```
Prompt Fase 4.1 - Firebase App Distribution:
───────────────────────────────────────────────────────────────────────────────
Configure o Firebase App Distribution para testes beta:

1. Setup iOS:
   - Firebase SDK no projeto
   - Configuração Build Settings
   - Script de upload automatizado

2. Grupos de Testers:
   - internal-team (funcionários)
   - beta-patients (30 pacientes selecionados)

3. CI/CD Pipeline:
   - Fastlane match para certificados
   - Build automático via GitHub Actions
   - Upload para App Distribution
   - Notificação por email/slack

4. Coleta de Feedback:
   - In-app feedback form
   - Screenshot anotado
   - Envio direto para Firebase Crashlytics

5. Performance Monitoring:
   - Firebase Performance
   - Traces de telas críticas
   - Network traces

Gere o fastlane/Fastfile e configurações.
───────────────────────────────────────────────────────────────────────────────
```

```
Prompt Fase 4.2 - Analytics e Dashboards:
───────────────────────────────────────────────────────────────────────────────
Implemente dashboards de analytics com Firebase Analytics:

1. Web Admin Dashboard:
   - KPIs: atendimentos dia/mês, no-show rate, faturamento
   - Ocupação (gráfico de agenda)
   - Pacientes ativos vs inativos
   - Adesão aos exercícios
   - NPS (Net Promoter Score)

2. Eventos Firebase Analytics:
   - login, logout
   - appointment_created, appointment_cancelled
   - session_completed
   - exercise_completed
   - check_in_submitted
   - prescription_created

3. Funis:
   - Onboarding paciente
   - Adesão exercícios
   - Confirmação consultas

4. BigQuery Export:
   - Export eventos brutos
   - Queries customizadas
   - Data Studio (Looker) dashboards

5. Alertas:
   - No-show acima de 20%
   - Adesão abaixo de 50%
   - Paciente sem check-in há 7 dias

Gere o código completo com Recharts/Chart.js.
───────────────────────────────────────────────────────────────────────────────
```

---

## 6. CHECKLIST DE IMPLEMENTAÇÃO

### Fase 0 - Fundação
- [ ] Criar 3 Firebase Projects (dev/staging/prod)
- [ ] Setup Monorepo (Nx/Turborepo)
- [ ] Design System compartilhado
- [ ] Firebase Auth + Custom Claims
- [ ] Cloud SQL Schema + Drizzle
- [ ] Cloud Functions estrutura base
- [ ] Firestore Security Rules
- [ ] CI/CD pipeline

### Fase 1 - Web MVP
- [ ] CRUD Pacientes completo
- [ ] Agenda com calendário visual
- [ ] Sessões SOAP com mapa de dor
- [ ] WhatsApp Cloud API integration
- [ ] Lista de espera automática
- [ ] Pacotes de sessões
- [ ] Dashboard básico

### Fase 2 - iOS Paciente
- [ ] Setup Flutter + Firebase
- [ ] Auth multi-provider
- [ ] Plano do dia
- [ ] Execução de exercícios
- [ ] Check-in de dor
- [ ] Streak e gamificação
- [ ] Push notifications
- [ ] Progresso e histórico

### Fase 3 - iOS Profissional
- [ ] Setup Flutter (app separado)
- [ ] Auth com validação de role
- [ ] Agenda mobile
- [ ] Paciente 360
- [ ] Quick SOAP
- [ ] Prescrição de exercícios
- [ ] Templates e IA suggestions

### Fase 4 - Beta & Polish
- [ ] Firebase App Distribution
- [ ] Testes internos
- [ ] Beta com 30 pacientes
- [ ] Analytics dashboards
- [ ] Performance optimization
- [ ] Submissão App Store
- [ ] Deploy Web produção
- [ ] Documentação

---

## RESUMO DA ARQUITETURA FINAL

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FISIOFLOW - STACK 100% GOOGLE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  FRONTEND                                                                     │
│  ├── Web Admin      → Next.js 15 + Firebase Hosting                         │
│  ├── iOS Paciente   → Flutter + Firebase SDK                               │
│  └── iOS Profissional → Flutter + Firebase SDK                             │
│                                                                              │
│  BACKEND AS A SERVICE                                                          │
│  ├── Auth           → Firebase Auth (Email, Google, Apple, Phone)          │
│  ├── Database       → Cloud SQL (PostgreSQL) + Firestore                   │
│  ├── Storage        → Firebase Storage                                     │
│  ├── Functions      → Cloud Functions (2nd gen, Node.js)                   │
│  ├── Messaging      → Firebase Cloud Messaging                             │
│  └── Analytics      → Firebase Analytics                                   │
│                                                                              │
│  GOOGLE CLOUD PLATFORM                                                        │
│  ├── AI/ML          → Gemini API + Vertex AI                               │
│  ├── Infrastructure  → Cloud Run + Cloud SQL + Cloud Storage               │
│  ├── Observability  → Cloud Logging + Cloud Monitoring                     │
│  └── CI/CD          → Cloud Build + Cloud Deploy                           │
│                                                                              │
│  INTEGRAÇÕES                                                                  │
│  ├── WhatsApp       → Meta Cloud API                                        │
│  ├── Payments       → Stripe (via Cloud Functions)                         │
│  └── Email          → Firebase Extensions (SendGrid/Mailgun)               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## PRÓXIMOS PASSOS

1. **Copie o PROMPT INICIAL** acima
2. **Abra o Firebase Studio** (console.firebase.google.com)
3. **Crie um New Workspace**
4. **Cole o prompt no AI Assistant**
5. **Valide o código gerado**
6. **Continue com os prompts por fase**

Boa sorte! 🚀
