# FisioFlow - Planejamento Completo para Firebase Studio
## 100% Ecossistema Google - Do Zero

**Data:** Janeiro 2026
**Escopo:** Web + App iOS (1 app único com role-based routing)
**Meta:** 600 atendimentos/mês, 15 profissionais, 30 pacientes (testes)

---

## ÍNDICE

1. [Decisão Inicial: Firebase Studio](#1-decisão-inicial-firebase-studio)
2. [Arquitetura Google Recomendada](#2-arquitetura-google-recomendada)
3. [Roadmap Completo](#3-roadmap-completo)
4. [PROMPT INICIAL para Firebase Studio](#4-prompt-inicial-para-firebase-studio)
5. [Prompts por Fase](#5-prompts-por-fase)
6. [Checklist de Implementação](#6-checklist-de-implementação)
7. [Custos Estimados](#7-custos-estimados)
8. [Segurança e Compliance](#8-segurança-e-compliance)

---

## 1. DECISÃO INICIAL: FIREBASE STUDIO

### O que escolher na tela inicial do Firebase Console?

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  FIREBASE STUDIO - TELA INICIAL                                              │
│                                                                             │
│  ESCOLHA: [ New Workspace ]  ✅ RECOMENDADO                                 │
│                                                                             │
│  NÃO escolha:                                                               │
│  ❌ Import Repo (traz legacy code e debt técnico)                           │
│  ❌ Tecnologias legadas (Go, Java, .NET)                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tecnologia Firebase a escolher

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ESCOLHA INICIAL: [ Next.js ]  ✅ RECOMENDADO                              │
│                                                                             │
│  POR QUÊ NEXT.JS?                                                           │
│  ────────────────────────────────────────────────────────────────────────  │
│  • Google adotou Next.js como padrão "gold" para Firebase App Hosting       │
│  • Integração nativa com Genkit (framework de IA do Google)                 │
│  • Será seu "quartel general": Web Admin + API Backend                      │
│  • Server Components + Server Actions = performance máxima                  │
│  • App Router para SEO e rotas otimizadas                                   │
│                                                                             │
│  E OS APPS MOBILE?                                                          │
│  ────────────────────────────────────────────────────────────────────────  │
│  • Apps iOS (Paciente + Profissional) serão criados com Flutter            │
│  • Flutter é 100% Google e Firebase SDK é nativo                           │
│  • 1 código para iOS + Android                                             │
│  • Conectarão ao backend Next.js via API                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Projeto Atual vs Novo Projeto

| Aspecto | Projeto Atual | Novo Projeto Google |
|---------|---------------|-------------------|
| **Frontend Web** | React + Vite | Next.js 15 (App Router) |
| **Backend** | Supabase (PostgreSQL + Edge Functions) | Cloud Functions + Cloud Run |
| **Mobile** | React Native + Expo (planejado) | Flutter (Firebase SDK nativo) |
| **Auth** | Supabase Auth | Firebase Auth + Custom Claims |
| **Database** | Supabase PostgreSQL | Cloud SQL + Firestore (híbrido) |
| **Realtime** | Supabase Realtime | Cloud Firestore |
| **Storage** | Supabase Storage | Firebase Storage |
| **AI/ML** | - | Gemini API + Vertex AI + Genkit |

---

## 2. ARQUITETURA GOOGLE RECOMENDADA

### Stack 100% Google

| Camada | Tecnologia Google | Justificativa |
|--------|-------------------|---------------|
| **Frontend Web** | Next.js 15 + Firebase Hosting | Google "gold standard", SSR/SSG |
| **Mobile iOS/Android** | Flutter + Firebase SDK | 1 código, Firebase nativo |
| **Autenticação** | Firebase Auth | Multi-provider, Custom Claims, MFA |
| **Banco Transacional** | Cloud SQL (PostgreSQL) | JOINs, relatórios, compliance LGPD |
| **Banco Realtime** | Cloud Firestore | Offline, sync, listeners, feed |
| **Storage** | Firebase Storage | Vídeos, imagens, documentos |
| **Backend** | Cloud Functions (2nd gen) | Gatilhos, webhooks, AI orchestration |
| **AI/ML** | Gemini API + Vertex AI + Genkit | Sugestões clínicas, análise |
| **Notificações** | Firebase Cloud Messaging | Push para apps |
| **Analytics** | Firebase Analytics + GA4 | Funis, retenção |
| **Testes** | Firebase App Distribution | Beta iOS/Android |
| **Logs/Monitoramento** | Cloud Logging + Error Reporting + Performance | Debug, erros, traces |
| **CI/CD** | Cloud Build + Cloud Deploy | Deploy automático |

### Arquitetura Híbrida de Dados

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   FISIOFLOW - ARQUITETURA DE DADOS HÍBRIDA                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CLOUD SQL (PostgreSQL)            FIRESTORE (NoSQL)                        │
│  ─────────────────────            ─────────────────                         │
│  DADOS TRANSACIONAIS              DADOS REALTIME/UX                          │
│  • Pacientes (LGPD)               • Chat paciente-clínica                   │
│  • Agendamentos                   • Feed de atividades                      │
│  • Prontuários SOAP (assinados)   • Notificações in-app                     │
│  • Financeiro                     • Presença de usuário                     │
│  • Pacotes de sessões             • Check-ins diários                       │
│  • Pagamentos                     • Cópia leitura rápida (SOAP)              │
│  • Audit logs                     • Dispositivos para push                  │
│                                     • Status de sincronização               │
│                                                                              │
│  ACESSO: Somente via             ACESSO: Client direto + Security Rules    │
│  Cloud Functions (Admin SDK)      + Cloud Functions                         │
│                                                                              │
│  INTEGRIDADE: ACID                INTEGRIDADE: Eventual consistency         │
│  RELACIONAL: Sim                  RELACIONAL: Não                           │
│  OFFLINE: Não                     OFFLINE: Sim (cache local)                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Quando usar Cloud SQL vs Firestore

| **Use Cloud SQL quando...** | **Use Firestore quando...** |
|------------------------------|----------------------------|
| Precisa de JOINs complexos | Precisa de realtime/offline |
| Dados altamente relacionais | Feed de atividades |
| Relatórios financeiros | Chat/comentários |
| Integridade referencial forte | Presença de usuário |
| Exportações para CSV/PDF | Check-ins diários |
| Auditoria completa (LGPD) | Sincronização rápida |
| Dados sensíveis (prontuário) | Notificações in-app |
| Transações ACID | Cache de leitura rápida |
| **Prontuário SOAP assinado** | **Cópia "Leitura Rápida" do SOAP** |

> **REGRA DE OURO:** Se o dado precisa ser **assinado digitalmente** ou usado para **auditoria LGPD** → Cloud SQL.
> Se o dado precisa de **sincronização instantânea** ou **offline-first** → Firestore.

### Diagrama de Arquitetura Completo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FISIOFLOW - GCP STACK                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐            │
│  │  WEB ADMIN   │      │ IOS PACIENTE │      │ IOS PROFISSIONAL │         │
│  │   (Next.js)  │      │  (Flutter)   │      │   (Flutter)   │            │
│  │  App Router  │      │  1 App único │      │  com Roles    │            │
│  └──────┬───────┘      └──────┬───────┘      └──────┬───────┘            │
│         │                     │                      │                     │
│         │ Server Actions      │ Firebase SDK         │ Firebase SDK        │
│         │ Route Handlers      │                      │                     │
│         └─────────────────────┼──────────────────────┘                     │
│                               │                                            │
│                    ┌──────────▼──────────┐                                 │
│                    │  Firebase Auth      │                                 │
│                    │  (Email, Google,    │                                 │
│                    │   Apple, Phone, MFA)│                                 │
│                    │  Custom Claims RBAC │                                 │
│                    └──────────┬──────────┘                                 │
│                               │                                            │
│         ┌─────────────────────┼─────────────────────┐                     │
│         │                     │                     │                     │
│  ┌──────▼──────┐      ┌──────▼───────┐     ┌──────▼──────┐              │
│  │ Cloud SQL   │      │ Firestore    │     │   Firebase   │              │
│  │ (PostgreSQL)│      │ (Realtime)   │     │   Storage    │              │
│  │             │      │              │     │             │              │
│  │ • patients  │      │ • chat       │     │ • vídeos     │              │
│  │ • soap_notes│      │ • feed       │     │ • fotos      │              │
│  │ • billing   │      │ • check-ins  │     │ • docs       │              │
│  │ • audit_log │      │ • presence   │     │             │              │
│  └──────┬──────┘      └──────┬───────┘     └─────────────┘              │
│         │                     │                                           │
│         │ Admin SDK only       │ Security Rules + Admin SDK               │
│         │                     │                                           │
│         └─────────────────────┼─────────────────────┐                     │
│                               │                     │                     │
│                    ┌──────────▼──────────┐  ┌──────▼──────┐              │
│                    │  Cloud Functions    │  │ Gemini API  │              │
│                    │  (Node.js 2nd gen)  │  │ + Vertex AI │              │
│                    │                     │  │   + Genkit  │              │
│                    │ • CRUD patients     │  │             │              │
│                    │ • Agendamento       │  │ • IA clínic│              │
│                    │ • SOAP + signature  │  │ • exercise │              │
│                    │ • WhatsApp webhook  │  │   suggest  │              │
│                    │ • AI orchestration  │  │ • movement │              │
│                    │ • Batch jobs        │  │   analysis │              │
│                    └─────────────────────┘  └─────────────┘              │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │             Google Cloud Platform Services (shared)                  │ │
│  │  • Cloud Logging • Cloud Monitoring • Error Reporting               │ │
│  │  • Cloud Scheduler • Pub/Sub • Cloud Tasks                          │ │
│  │  • Firebase Analytics • Firebase App Distribution • FCM             │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. ROADMAP COMPLETO

### Visão Geral das Fases

| Fase | Duração | Objetivo | Entrega |
|------|---------|----------|---------|
| **0** | 1-2 sem | Fundação Google Cloud | Projeto configurado, auth, databases |
| **1** | 3-4 sem | Web Admin Core | Pacientes, agenda, SOAP assinado |
| **2** | 2-3 sem | API Mobile | Endpoints para apps Flutter |
| **3** | 4-5 sem | Flutter App (1 app, 2 roles) | App funcional paciente + profissional |
| **4** | 2-3 sem | Inteligência Artificial | Gemini integration, insights |
| **5** | 2-4 sem | Beta & Polish | Testes, ajustes, publicação |

### Roadmap Visual

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ROADMAP FISIOFLOW 2026                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SEMANA 1-2: 🔧 FASE 0 - FUNDAÇÃO GOOGLE CLOUD                              │
│  ├── Firebase Projects (dev/staging/prod)                                  │
│  ├── Monorepo Next.js (App Router)                                          │
│  ├── Firebase Auth + Custom Claims (RBAC)                                  │
│  ├── Cloud SQL Schema (PostgreSQL)                                          │
│  ├── Firestore Collections                                                  │
│  └── CI/CD (GitHub Actions)                                                 │
│                                                                              │
│  SEMANA 3-4: 👥 FASE 1 - WEB ADMIN - PACIENTES + AGENDA                     │
│  ├── CRUD Pacientes (CPF validation)                                        │
│  ├── Agenda com calendário visual                                          │
│  ├── Detecção de conflitos em tempo real                                    │
│  └── Reagendamento drag-and-drop                                            │
│                                                                              │
│  SEMANA 5-6: 📋 FASE 1 - WEB ADMIN - PRONTUÁRIO SOAP                        │
│  ├── Evolução estruturada (S.O.A.P.)                                        │
│  ├── Mapa de dor interativo (SVG)                                           │
│  ├── Assinatura digital (status 'signed')                                  │
│  ├── Imutabilidade após assinatura                                          │
│  └── Salvamento duplo: Cloud SQL + Firestore                                │
│                                                                              │
│  SEMANA 7-8: 💬 FASE 1 - WEB ADMIN - WHATSAPP + FINANCEIRO                   │
│  ├── WhatsApp Cloud API integration                                         │
│  ├── Lembretes automáticos 24h antes                                        │
│  ├── Confirmação por botões SIM/NÃO                                         │
│  ├── Lista de espera automática                                             │
│  └── Pacotes de sessões + validade                                          │
│                                                                              │
│  SEMANA 9-10: 🔌 FASE 2 - API MOBILE                                        │
│  ├── Route Handlers /app/api/v1/                                            │
│  ├── GET /api/v1/patient/home                                               │
│  ├── POST /api/v1/patient/checkin                                           │
│  ├── GET /api/v1/physio/agenda                                              │
│  └── Token validation (Firebase Auth)                                       │
│                                                                              │
│  SEMANA 11-15: 📱 FASE 3 - FLUTTER APP (1 APP, 2 ROLES)                      │
│  ├── Setup Flutter + Firebase SDK                                           │
│  ├── Auth multi-provider (Email, Google, Apple)                             │
│  ├── Role-based routing (patient vs professional)                           │
│  ├── Paciente: Plano do dia, exercícios, check-in de dor                   │
│  ├── Profissional: Agenda, paciente 360, SOAP rápido                        │
│  ├── Push notifications (FCM)                                               │
│  └── Offline persistence                                                     │
│                                                                              │
│  SEMANA 16-17: 🤖 FASE 4 - INTELIGÊNCIA ARTIFICIAL                          │
│  ├── Gemini API integration                                                 │
│  ├── Botão "Gerar Insights com IA" no SOAP                                  │
│  ├── Análise de evolução (últimas 3 sessões)                                │
│  ├── Sugestões de exercícios com Vertex AI                                  │
│  └── Genkit para workflows de IA                                            │
│                                                                              │
│  SEMANA 18-21: 🧪 FASE 5 - BETA & POLISH                                    │
│  ├── Firebase App Distribution (testers internos)                           │
│  ├── Beta com 30 pacientes                                                  │
│  ├── Coleta de feedback                                                     │
│  ├── Performance monitoring                                                 │
│  ├── Submissão App Store                                                    │
│  └── Deploy Web produção                                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Detalhamento das Fases

#### FASE 0 - Fundação (1-2 semanas)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SEMANA 1:                                                                  │
│  ├── Criar 3 Firebase Projects (fisioflow-dev/staging/prod)                │
│  ├── Setup Monorepo Next.js 15 (App Router)                                │
│  │   /app - App Router                                                      │
│  │   /components - Componentes React                                        │
│  │   /lib - Utilitários e Firebase                                         │
│  │   /hooks - Custom hooks                                                  │
│  │   /types - TypeScript definitions                                        │
│  │   /app/api/v1 - Route Handlers                                          │
│  │   └── /actions - Server Actions                                         │
│  ├── Configurar Firebase Hosting                                            │
│  └── Configurar Firebase Auth                                               │
│                                                                             │
│  SEMANA 2:                                                                  │
│  ├── Implementar Custom Claims (RBAC)                                       │
│  ├── Setup Cloud SQL (schema PostgreSQL)                                   │
│  │   - Migrations com Drizzle ORM                                          │
│  │   - Seed data inicial                                                   │
│  ├── Setup Firestore (collections e security rules)                        │
│  ├── Configurar Cloud Functions (2nd gen)                                  │
│  └── Configurar CI/CD (GitHub Actions)                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### FASE 1 - Web MVP (3-4 semanas)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SEMANA 3-4: PACIENTES + AGENDA                                             │
│  ├── CRUD Pacientes completo                                                │
│  │   - Validação CPF (algoritmo)                                           │
│  │   - Email único por organização                                         │
│  │   - Telefone formato BR                                                 │
│  │   - Busca por nome, CPF ou telefone                                     │
│  ├── Calendário visual (dia/semana/mês)                                    │
│  │   - React Big Calendar ou similar                                       │
│  ├── Detecção de conflitos em tempo real                                   │
│  └── Reagendamento drag-and-drop                                           │
│                                                                             │
│  SEMANA 5-6: SESSÕES CLÍNICAS (SOAP) + ASSINATURA DIGITAL                   │
│  ├── Evolução estruturada (S.O.A.P.)                                        │
│  ├── Mapa de dor interativo (SVG)                                           │
│  ├── Anexos e documentos (Firebase Storage)                                │
│  ├── Templates de avaliação                                                │
│  ├── ASSINATURA DIGITAL:                                                    │
│  │   - Status 'draft' → 'signed'                                           │
│  │   - Hash da assinatura digital                                          │
│  │   - Imutável após assinar (apenas retificação)                          │
│  │   - Salvar no Cloud SQL (oficial) + Firestore (leitura rápida)         │
│  └── Gerar PDF da evolução                                                  │
│                                                                             │
│  SEMANA 7-8: WHATSAPP + FINANCEIRO BÁSICO                                   │
│  ├── Integração WhatsApp Cloud API                                         │
│  ├── Lembretes automáticos (Cloud Scheduler)                                │
│  ├── Lista de espera automática                                             │
│  └── Pacotes de sessões + alertas de validade                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### FASE 2 - API Mobile (2-3 semanas)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SEMANA 9-10: ROUTE HANDLERS NEXT.JS                                        │
│  ├── Estrutura /app/api/v1/                                                 │
│  ├── Validação de token Firebase Auth                                       │
│  ├── Verificação de Custom Claims (role)                                    │
│  │                                                                          │
│  ENDPOINTS PACIENTE:                                                        │
│  ├── GET /api/v1/patient/home - Resumo do dia                               │
│  │   - Próximo agendamento                                                  │
│  │   - Exercícios prescritos do dia                                         │
│  ├── POST /api/v1/patient/checkin - Check-in de dor                         │
│  │   - Salva no Firestore (realtime)                                       │
│  │   - Salva no PostgreSQL (histórico)                                     │
│  └── GET /api/v1/patient/progress - Progresso e histórico                   │
│                                                                             │
│  ENDPOINTS PROFISSIONAL:                                                     │
│  ├── GET /api/v1/physio/agenda - Agenda do dia                             │
│  ├── GET /api/v1/physio/patients - Lista de pacientes                       │
│  ├── GET /api/v1/physio/patient/:id - Paciente 360                          │
│  └── POST /api/v1/physio/soap - Criar evolução SOAP                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### FASE 3 - Flutter App (4-5 semanas)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SEMANA 11-12: FUNDAÇÃO FLUTTER                                             │
│  ├── Setup projeto Flutter                                                  │
│  │   - flutter_riverpod (state management)                                  │
│  │   - go_router (navegação)                                                │
│  ├── Configurar Firebase SDK                                                │
│  │   - firebase_core, firebase_auth                                        │
│  │   - cloud_firestore, firebase_storage                                   │
│  │   - firebase_messaging                                                  │
│  ├── Implementar Auth                                                       │
│  │   - Email/Password, Google, Apple                                        │
│  │   - Role-based routing (role no token)                                  │
│  └── Design System compartilhado                                            │
│                                                                             │
│  SEMANA 13-14: FUNCIONALIDADES PACIENTE                                     │
│  ├── HomeScreen (Plano do Dia)                                              │
│  ├── ExerciseExecutionScreen (vídeos + contador)                           │
│  ├── Check-in de dor (EVA 0-10)                                             │
│  ├── Streak e gamificação                                                   │
│  └── ProgressScreen (gráficos)                                              │
│                                                                             │
│  SEMANA 15: FUNCIONALIDADES PROFISSIONAL                                    │
│  ├── AgendaScreen (timeline)                                                │
│  ├── PatientDetailScreen (Paciente 360)                                     │
│  ├── QuickSOAPScreen (formulário simplificado)                              │
│  └── PrescriptionScreen (exercícios)                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### FASE 4 - Inteligência Artificial (2-3 semanas)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SEMANA 16-17: GEMINI API + GENKIT                                          │
│  ├── Integração Vertex AI (Gemini 2.5 Flash)                               │
│  ├── Server Action analyzeEvolution                                         │
│  │   - Recebe últimas 3 evoluções + relato atual                           │
│  │   - Envia para Gemini com prompt clínico                                │
│  │   - Retorna insights e sugestões                                        │
│  ├── Botão "Gerar Insights com IA" no formulário SOAP                      │
│  ├── Exercise suggestions com IA                                            │
│  └── Genkit para workflows (opcional)                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### FASE 5 - Beta & Polish (2-4 semanas)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SEMANA 18-19: TESTES CONTROLADOS                                           │
│  ├── Firebase App Distribution                                              │
│  ├── Testers internos (funcionários)                                        │
│  ├── Beta com 30 pacientes                                                  │
│  ├── Coleta de feedback                                                     │
│  └── Ajustes finos                                                          │
│                                                                             │
│  SEMANA 20-21: PUBLICAÇÃO                                                   │
│  ├── Submissão App Store                                                    │
│  ├── Deploy Web produção (Firebase Hosting)                                │
│  ├── Configurar monitoramento                                               │
│  └── Documentação final                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
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
fisioterapia. Atualmente faço ~600 atendimentos/mês, tenho 15 funcionários,
e preciso de um sistema que escale.

PROJETO ATUAL (para migração de referência):
├── Frontend Web: React + Vite + TypeScript
├── Backend: Supabase (PostgreSQL + Auth + Real-time + Edge Functions)
├── Mobile: React Native + Expo (planejado)
└── Funcionalidades: Gestão pacientes, agendamentos, prontuários SOAP,
    biblioteca exercícios, gamification, integração WhatsApp

NOVO PROJETO - 100% GOOGLE:
├── 1 Web App Admin (Next.js 15 + Firebase)
├── 1 App Flutter iOS (com role-based routing para Paciente e Profissional)
├── Backend: Cloud Functions (2nd gen) + Cloud Run
├── Database Híbrido: Cloud SQL (PostgreSQL) + Firestore
├── AI: Gemini API + Vertex AI + Genkit
└── Hosting: Firebase Hosting + Cloud Run

ARQUITETURA GOOGLE QUE QUERO:
───────────────────────────────────────────────────────────────────────────────
• Autenticação: Firebase Auth (Email, Google, Apple, Phone, MFA para profissionais)
• Banco Transacional: Cloud SQL (PostgreSQL) - dados críticos, LGPD, auditoria
• Banco Realtime: Cloud Firestore - sincronização, offline, feed
• Storage: Firebase Storage - vídeos, imagens, documentos
• Backend: Cloud Functions (2nd gen, Node.js 20) + Genkit para IA
• AI: Gemini API + Vertex AI - insights clínicos, sugestões
• Hosting: Firebase Hosting (web) + Cloud Run (API)
• Notificações: Firebase Cloud Messaging
• Analytics: Firebase Analytics + GA4
• Testes: Firebase App Distribution
• Logs: Cloud Logging + Error Reporting + Performance Monitoring

REGRAS DE NEGÓCIO PRINCIPAIS:
───────────────────────────────────────────────────────────────────────────────

1. USUÁRIOS E PERMISSÕES (RBAC):
   • Custom Claims no token Firebase:
     {
       role: 'admin' | 'physio' | 'intern' | 'reception' | 'patient' | 'partner',
       tenantId: string, // UUID da organização
       permissions: string[]
     }
   • MFA obrigatório para admin e physio
   • Rate limiting em login attempts
   • Session timeout: 30min idle

2. PACIENTES:
   • Cadastro completo com validação de CPF (algoritmo)
   • Soft delete LGPD (deleted_at timestamp)
   • Dados sensíveis criptografados (CPF)
   • Emergência, convênio, histórico médico

3. AGENDAMENTO:
   • Tipos: consulta_inicial, fisioterapia, reavaliacao, retorno
   • Durações: 15, 30, 45, 60 minutos
   • Detecção de conflitos em tempo real
   • Lista de espera automática
   • Lembretes WhatsApp 24h antes

4. PRONTUÁRIO SOAP COM ASSINATURA DIGITAL:
   • Status: 'draft' → 'signed'
   • Após assinar: IMUTÁVEL (apenas retificação com nova versão)
   • Hash de assinatura digital no registro
   • Salvar em Cloud SQL (oficial) + Firestore (leitura rápida)
   • Auto-save a cada 30s (draft)

5. EXERCÍCIOS:
   • Biblioteca 500+ exercícios
   • Vídeos no Firebase Storage
   • Prescrição: séries, reps, tempo, carga
   • Sugestões com IA (Gemini)

6. FINANCEIRO:
   • Pacotes de sessões com validade
   • Débito automático
   • Alertas: vencendo, saldo baixo

7. WHATSAPP (Cloud API):
   • Templates aprovados Meta
   • Confirmação botões SIM/NÃO
   • Lista de espera automática

MODELO DE DADOS - CLOUD SQL (PostgreSQL):
───────────────────────────────────────────────────────────────────────────────
Execute:

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Organizations (Multi-tenant)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(20),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Users (Vínculo com Firebase Auth)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- = Firebase UID
    organization_id UUID REFERENCES organizations(id),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'physio', 'intern', 'reception', 'patient', 'partner')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    mfa_enabled BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Patients (LGPD compliant)
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    user_id UUID REFERENCES users(id), -- nullable se não tiver app
    full_name VARCHAR(255) NOT NULL,
    cpf_encrypted BYTEA, -- criptografado com pgcrypto
    email VARCHAR(255),
    phone VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(20),
    emergency_contact JSONB,
    insurance JSONB,
    medical_history JSONB,
    status VARCHAR(20) DEFAULT 'active',
    progress INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    deleted_at TIMESTAMP, -- Soft delete LGPD
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(organization_id, cpf_encrypted)
);

-- Appointments
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    patient_id UUID REFERENCES patients(id),
    professional_id UUID REFERENCES users(id),
    room_id VARCHAR(50),
    type VARCHAR(30) NOT NULL CHECK (type IN ('initial', 'physio', 'reevaluation', 'return')),
    duration INTEGER NOT NULL CHECK (duration IN (15, 30, 45, 60)),
    scheduled_at TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
    confirmation_status VARCHAR(20) DEFAULT 'pending',
    notes TEXT,
    cancelled_at TIMESTAMP,
    cancel_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- SOAP Notes (Prontuários com assinatura digital)
CREATE TABLE soap_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    patient_id UUID REFERENCES patients(id),
    professional_id UUID REFERENCES users(id),
    appointment_id UUID REFERENCES appointments(id),
    soap_date DATE NOT NULL,
    subjective TEXT,
    objective JSONB, -- exame físico estruturado
    assessment TEXT,
    plan TEXT,
    pain_map JSONB, -- pontos e intensidades
    pain_level INTEGER CHECK (pain_level BETWEEN 0 AND 10),
    attachments JSONB, -- URLs Firebase Storage
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'signed')),
    digital_signature TEXT, -- hash da assinatura
    signed_at TIMESTAMP,
    signed_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices importantes
CREATE INDEX idx_appointments_datetime ON appointments(scheduled_at);
CREATE INDEX idx_appointments_professional ON appointments(professional_id, scheduled_at);
CREATE INDEX idx_patients_org_status ON patients(organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_soap_patient_date ON soap_notes(patient_id, soap_date DESC);

MODELO DE DADOS - FIRESTORE (Realtime/UX):
───────────────────────────────────────────────────────────────────────────────
collections:
  organizations/{orgId}/
    settings - configurações em cache

  users/{userId}/
    presence - online/offline
    devices - array de tokens FCM

  patients/{patientId}/
    daily_checkins/ - check-ins de dor/RPE
    exercise_progress/ - progresso de exercícios
    notifications/ - notificações do app
    soap_summary/ - cópia leitura rápida do SOAP

  appointments/{appointmentId}/
    realtime_status - status para sincronização
    chat/ - chat paciente-clínica

  feed/{orgId}/
    events/ - feed de atividade da clínica

SEGURANÇA E AUTENTICAÇÃO:
───────────────────────────────────────────────────────────────────────────────

1. Firebase Auth Configuration:
   • Email/Password provider
   • Google OAuth provider
   • Apple OAuth provider
   • Phone authentication
   • MFA para admin e physio

2. Custom Claims (RBAC):
   Setar via Cloud Function (admin only):
   {
     role: 'admin' | 'physio' | 'intern' | 'reception' | 'patient',
     tenantId: string,
     permissions: string[]
   }

3. Firestore Security Rules (deny by default):
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {

       function isAuthenticated() {
         return request.auth != null;
       }

       function hasRole(role) {
         return isAuthenticated() && request.auth.token.role == role;
       }

       function isAdmin() {
         return hasRole('admin');
       }

       function isPhysio() {
         return hasRole('physio') || hasRole('admin');
       }

       function isSameTenant(tenantId) {
         return isAuthenticated() && request.auth.token.tenantId == tenantId;
       }

       // Pacientes só acessam próprios dados
       match /patients/{patientId} {
         allow read: if isAuthenticated() &&
           (resource.data.user_id == request.auth.uid || isPhysio());
         allow write: if isPhysio();
       }

       // Appointments
       match /appointments/{appointmentId} {
         allow read: if isAuthenticated() && isSameTenant(resource.data.tenantId);
         allow create: if isPhysio();
         allow update: if isPhysio();
         allow delete: if isAdmin();
       }

       // Negar tudo por padrão
       match /{document=**} {
         allow read, write: if false;
       }
     }
   }

4. Cloud SQL Access:
   • Nunca acesso direto do client
   • Sempre via Cloud Functions com Admin SDK
   • Connection pooling com Cloud SQL connector
   • IAM authorization

O QUE PRECISO QUE VOCÊ CRIE PRIMEIRO:
───────────────────────────────────────────────────────────────────────────────
Comece criando apenas a estrutura base do projeto Next.js 15:

1. Estrutura de pastas:
   /app
     /(dashboard)/ - rotas protegidas
     /(auth)/ - rotas de autenticação
     /api/v1 - Route Handlers
   /components
     /ui - shadcn/ui
     /forms - formulários reutilizáveis
   /lib
     /db
       postgres.ts - Cloud SQL connection (Drizzle ORM)
       firestore.ts - Firestore connection
     /auth
       firebase.ts - Firebase Admin SDK
       session.ts - Session management
     /validators - Zod schemas
   /hooks
   /types
   /actions - Server Actions

2. Arquivos de configuração:
   - next.config.js (com Firebase Hosting)
   - tailwind.config.ts
   - tsconfig.json (strict mode)
   - .env.local template

3. Firebase Admin SDK setup para:
   - Auth (verifyIdToken)
   - Firestore (admin SDK)
   - Cloud SQL connection

Gere apenas a estrutura inicial. Eu validarei antes de continuarmos.

═══════════════════════════════════════════════════════════════════════════════
```

---

## 5. PROMPTS POR FASE

### FASE 0 - Fundação

```
═══════════════════════════════════════════════════════════════════════════════
PROMPT FASE 0.1 - SETUP MONOREPO NEXT.JS 15
═══════════════════════════════════════════════════════════════════════════════

Crie a estrutura inicial do projeto Next.js 15 para FisioFlow:

1. Inicializar projeto:
   npx create-next-app@latest fisioflow --typescript --tailwind --app-router --eslint

2. Estrutura de pastas:
   fisioflow/
   ├── app/
   │   ├── (auth)/
   │   │   ├── login/page.tsx
   │   │   └── layout.tsx
   │   ├── (dashboard)/
   │   │   ├── patients/
   │   │   ├── appointments/
   │   │   └── layout.tsx
   │   ├── api/v1/
   │   │   ├── patients/
   │   │   ├── appointments/
   │   │   └── route.ts
   │   ├── layout.tsx
   │   └── page.tsx
   ├── components/
   │   ├── ui/ (shadcn/ui)
   │   └── forms/
   ├── lib/
   │   ├── db/
   │   │   ├── postgres.ts (Drizzle ORM)
   │   │   └── firestore.ts
   │   ├── auth/
   │   │   ├── firebase.ts
   │   │   └── claims.ts
   │   ├── validators/
   │   └── utils/
   ├── hooks/
   ├── types/
   └── actions/ (Server Actions)

3. Instalar dependências:
   npm install firebase-admin drizzle-orm @neondatabase/serverless zod
   npm install react-hook-form @hookform/resolvers date-fns
   npm install -D @types/node

4. Configurar shadcn/ui:
   npx shadcn@latest init
   npx shadcn@latest add button card input label select textarea

5. Environment variables (.env.local):
   FIREBASE_PROJECT_ID=
   FIREBASE_CLIENT_EMAIL=
   FIREBASE_PRIVATE_KEY=
   DATABASE_URL=
   NEXT_PUBLIC_FIREBASE_API_KEY=
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=

Gere o código completo da estrutura base.
═══════════════════════════════════════════════════════════════════════════════
```

```
═══════════════════════════════════════════════════════════════════════════════
PROMPT FASE 0.2 - FIREBASE AUTH + CUSTOM CLAIMS
═══════════════════════════════════════════════════════════════════════════════

Configure o Firebase Authentication com Custom Claims para RBAC:

1. Firebase Admin SDK setup:
   // lib/auth/firebase.ts
   - initialize app com service account
   - export auth, firestore, admin

2. Custom Claims structure:
   interface UserClaims {
     role: 'admin' | 'physio' | 'intern' | 'reception' | 'patient';
     tenantId: string;
     permissions: string[];
   }

3. Cloud Function para setar claims (admin only):
   // lib/auth/set-claims.ts
   - Verificar se solicitante é admin
   - Validar role válido
   - setCustomUserClaims(uid, claims)
   - Audit log em Cloud Logging

4. Server Action para setar claims:
   // actions/auth/set-user-role.ts
   'use server'
   - Verificar sessão do admin
   - Chamar set-claims function
   - Atualizar documento user no Firestore

5. Middleware para verificar claims:
   // middleware.ts
   - verifyIdToken do cookie
   - Extrair claims do token
   - Redirecionar baseado em role

6. Hook React useAuth:
   // hooks/useAuth.ts
   - Retorna user, role, tenantId, loading
   - Forçar refresh token quando mudar claims

Gere o código completo.
═══════════════════════════════════════════════════════════════════════════════
```

```
═══════════════════════════════════════════════════════════════════════════════
PROMPT FASE 0.3 - CLOUD SQL SCHEMA + DRIZZLE ORM
═══════════════════════════════════════════════════════════════════════════════

Crie o schema completo do Cloud SQL PostgreSQL com Drizzle ORM:

1. Drizzle schema:
   // lib/db/schema.ts
   - organizations
   - users
   - patients (com soft delete LGPD)
   - appointments
   - soap_notes (com status draft/signed)
   - exercise_library
   - exercise_prescriptions
   - patient_packages
   - payments
   - waiting_list

2. Campos especiais:
   - patients.cpf_encrypted (BYTEA) usando pgcrypto
   - soap_notes.digital_signature (TEXT hash)
   - soap_notes.status (draft/signed)
   - soap_notes.signed_at, signed_by

3. Índices otimizados:
   - appointments (scheduled_at, professional_id)
   - patients (organization_id, status) WHERE deleted_at IS NULL
   - soap_notes (patient_id, soap_date DESC)

4. Migrations:
   // drizzle/migrations/0001_initial.sql
   - Gerar SQL DDL completo
   - Extensões uuid-ossp e pgcrypto

5. Connection:
   // lib/db/postgres.ts
   - Drizzle ORM com Neon/Cloud SQL
   - Connection pooling
   - Retry logic

6. Seed data:
   // lib/db/seed.ts
   - Organização demo
   - User admin
   - 5 pacientes de exemplo

Gere o SQL DDL e código Drizzle ORM completo.
═══════════════════════════════════════════════════════════════════════════════
```

### FASE 1 - Web MVP

```
═══════════════════════════════════════════════════════════════════════════════
PROMPT FASE 1.1 - CRUD PACIENTES COM VALIDAÇÕES
═══════════════════════════════════════════════════════════════════════════════

Implemente o módulo de Gestão de Pacientes:

1. Server Actions (CRUD):
   // actions/patients/index.ts
   - getPatients(filters, pagination)
   - getPatientById(id)
   - createPatient(data)
   - updatePatient(id, data)
   - softDeletePatient(id)

2. Validações Zod:
   // lib/validators/patient.ts
   - CPF: algoritmo de validação
   - Email: unique por organização
   - Telefone: formato BR (XX) XXXXX-XXXX
   - Data nascimento: deve ser maior de idade

3. Criptografia CPF:
   // lib/utils/crypto.ts
   - encryptCPF(cpf plain) usando pgcrypto
   - decryptCPF(cpf encrypted)

4. Páginas Next.js:
   // app/(dashboard)/patients/page.tsx
   - Lista com busca e filtros
   - Paginação
   - Export CSV

   // app/(dashboard)/patients/new/page.tsx
   - Formulário criação
   - Multi-step se necessário

   // app/(dashboard)/patients/[id]/page.tsx
   - Detalhes do paciente
   - Abas: Info, Evoluções, Exercícios, Financeiro

5. Componentes shadcn/ui:
   - PatientCard
   - PatientForm (react-hook-form + zod)
   - PatientSearch
   - MedicalHistoryViewer

Gere o código completo.
═══════════════════════════════════════════════════════════════════════════════
```

```
═══════════════════════════════════════════════════════════════════════════════
PROMPT FASE 1.2 - AGENDA COM DETECÇÃO DE CONFLITOS
═══════════════════════════════════════════════════════════════════════════════

Implemente o módulo de Agendamento:

1. Server Actions:
   // actions/appointments/index.ts
   - getAppointments(dateRange, professionalId)
   - createAppointment(data) com validação de conflito
   - updateAppointment(id, data)
   - cancelAppointment(id, reason)
   - getAvailableSlots(date, professionalId)

2. Validação de conflitos:
   - Sobreposição de horários (considerando duração)
   - Profissional disponível
   - Sala disponível
   - Horário dentro do funcionamento (8h-18h, seg-sex)

3. Componente de Calendário:
   // components/calendar/appointment-calendar.tsx
   - DayView (timeline vertical)
   - WeekView (colunas por dia)
   - MonthView (grid)
   - AppointmentCard com drag-and-drop

4. Features:
   - Criar agendamento clicando no slot vazio
   - Reagendar arrastando para novo horário
   - Detecção visual de conflitos (sobreposição em vermelho)
   - Filtros por profissional/sala

5. Integração:
   - Cloud Function para sync Google Calendar
   - Cloud Scheduler para lembretes WhatsApp

Use: react-big-calendar ou @schedule-x/react

Gere o código completo.
═══════════════════════════════════════════════════════════════════════════════
```

```
═══════════════════════════════════════════════════════════════════════════════
PROMPT FASE 1.3 - PRONTUÁRIO SOAP COM ASSINATURA DIGITAL
═══════════════════════════════════════════════════════════════════════════════

Implemente o módulo de Sessões Clínicas com Assinatura Digital:

1. Server Actions:
   // actions/soap/index.ts
   - getSoapNotes(patientId)
   - createSoapNote(data) - cria como 'draft'
   - updateSoapNote(id, data) - só se status='draft'
   - signSoapNote(id) - muda status para 'signed', IMUTÁVEL
   - createSoapAmendment(originalId, data) - retificação

2. Regras de assinatura:
   - Status 'draft' → 'signed' ao assinar
   - Após 'signed': NÃO pode ser alterado
   - Retificação: criar novo registro amendment_of
   - digital_signature = hash SHA256 do conteúdo
   - signed_at, signed_by registrados

3. Salvamento duplo:
   - Cloud SQL: registro oficial (audit trail)
   - Firestore: cópia leitura rápida para app paciente

4. Mapa de Dor Interativo:
   // components/soap/pain-map.tsx
   - SVG corpo humano (frente/verso)
   - Clique para adicionar ponto de dor
   - Escala EVA 0-10 com cores
   - Tamanho do ponto proporcional à intensidade
   - Comparativo com evoluções anteriores

5. Formulário SOAP:
   - Subjetivo: textarea + templates
   - Objetivo: campos estruturados (ADM, ROM, força, etc)
   - Avaliação: textarea + diagnóstico CID
   - Plano: textarea + prescrição exercícios

6. Features:
   - Auto-save a cada 30s (rascunho)
   - Upload de anexos (Firebase Storage)
   - Gerar PDF da evolução
   - Histórico de versões

Gere o código completo.
═══════════════════════════════════════════════════════════════════════════════
```

```
═══════════════════════════════════════════════════════════════════════════════
PROMPT FASE 1.4 - WHATSAPP CLOUD API INTEGRATION
═══════════════════════════════════════════════════════════════════════════════

Implemente a integração com WhatsApp Business Cloud API:

1. Cloud Functions:
   // functions/src/whatsapp/index.ts
   - webhook - receber mensagens e callbacks
   - sendMessage - enviar mensagem template
   - scheduleReminder - agendado via Cloud Scheduler

2. Templates WhatsApp (aprovados Meta):
   - fisioflow_confirmação: "Olá {nome}, confirmando consulta dia {data} às {hora}?
     [Sim] [Não] [Reagendar]"
   - fisioflow_lembrete: "Lembrete: Sua consulta é amanhã às {hora}. Responda
     [Confirmar] ou [Cancelar]"
   - fisioflow_vaga: "Temos uma vaga para {data} às {hora}. Deseja agendar?
     [Sim] [Não]"

3. Fluxo de Confirmação:
   a) Cloud Scheduler dispara 24h antes
   b) Envia template com botões interativos
   c) Webhook processa resposta
   d) Atualiza appointment.confirmation_status
   e) Se cancelado, trigger waiting_list

4. Lista de Espera Automática:
   - Trigger: appointment.status = 'cancelled'
   - Query: waiting_list ORDER BY priority, created_at
   - Oferece vaga via WhatsApp
   - Timeout 2h para resposta
   - Se aceito, cria novo appointment

5. Componentes admin:
   // app/(dashboard)/whatsapp/page.tsx
   - Status dos envios
   - Template editor (configurar mensagens)
   - Logs de webhook
   - Settings (horários de envio)

Gere o código completo incluindo webhook handler.
═══════════════════════════════════════════════════════════════════════════════
```

### FASE 2 - API Mobile

```
═══════════════════════════════════════════════════════════════════════════════
PROMPT FASE 2.1 - ROUTE HANDLERS PARA APPS FLUTTER
═══════════════════════════════════════════════════════════════════════════════

Crie os endpoints da API mobile (Route Handlers Next.js):

1. Estrutura:
   /app/api/v1/
     ├── patients/
     │   ├── home/route.ts - GET resumo do dia
     │   ├── checkin/route.ts - POST check-in de dor
     │   ├── progress/route.ts - GET progresso
     │   └── [id]/route.ts - GET detalhes paciente
     ├── physio/
     │   ├── agenda/route.ts - GET agenda do dia
     │   ├── patients/route.ts - GET lista pacientes
     │   ├── soap/route.ts - POST criar evolução
     │   └── exercises/route.ts - GET biblioteca
     └── auth/
         └── verify/route.ts - POST validar token

2. Middleware de autenticação:
   // lib/auth/verify-token.ts
   - Extrair Bearer token do header
   - verifyIdToken com Firebase Admin
   - Extrair claims (role, tenantId)
   - Retornar userId e claims

3. Validação de role:
   - Rotas /patients/* exigem role='patient'
   - Rotas /physio/* exigem role='physio' ou 'admin'

4. Endpoint examples:

   GET /api/v1/patients/home
   ────────────────────────────────────
   Response:
   {
     "nextAppointment": { date, time, professional },
     "todayExercises": [{ id, name, sets, reps, videoUrl }],
     "progress": { streak, completedToday, weeklyGoal }
   }

   POST /api/v1/patients/checkin
   ────────────────────────────────────
   Body: { painLevel: 0-10, painMap: [...], notes: string }
   - Salva no Firestore (realtime)
   - Salva no PostgreSQL (histórico)

   GET /api/v1/physio/agenda?date=YYYY-MM-DD
   ────────────────────────────────────
   Response:
   {
     "appointments": [
       { id, time, patient, type, status }
     ]
   }

5. Error handling:
   - 401: Token inválido/expirado
   - 403: Role insuficiente
   - 404: Recurso não encontrado
   - 500: Erro interno

Gere o código completo dos endpoints.
═══════════════════════════════════════════════════════════════════════════════
```

### FASE 3 - Flutter App

```
═══════════════════════════════════════════════════════════════════════════════
PROMPT FASE 3.1 - FLUTTER APP FUNDAÇÃO (1 APP, 2 ROLES)
═══════════════════════════════════════════════════════════════════════════════

Crie o Flutter App para FisioFlow com role-based routing:

1. Setup projeto:
   flutter create fisioflow --org com.fisioflow
   cd fisioflow

2. Dependências (pubspec.yaml):
   dependencies:
     flutter_riverpod: ^2.4.9
     go_router: ^13.0.0
     firebase_core: ^3.0.0
     firebase_auth: ^5.0.0
     cloud_firestore: ^5.0.0
     firebase_storage: ^12.0.0
     firebase_messaging: ^15.0.0
     google_sign_in: ^6.2.1
     sign_in_with_apple: ^6.1.0
     cached_network_image: ^3.3.1
     video_player: ^2.8.2
     fl_chart: ^0.67.0

3. Estrutura de pastas:
   /lib
     /core
       /theme (cores, tipografia - compartilhado com web)
       /constants
       /utils
     /features
       /auth
         /data
         /providers
         /screens
       /patient
         /home
         /exercises
         /progress
       /professional
         /agenda
         /patients
         /soap
     /shared
       /widgets
       /services
       /models

4. Role-based routing:
   // lib/core/router/router.dart
   - Após login, verificar claims
   - Redirecionar para /patient ou /professional baseado em role
   - Guard routes para validar acesso

5. Auth screens:
   - SplashScreen (loading inicial)
   - LoginScreen (email, Google, Apple)
   - RoleDetectionScreen (redirecionamento)

6. Firebase integration:
   // lib/core/firebase/firebase_service.dart
   - initializeApp
   - auth state changes
   - token refresh listener
   - FCM token registration

Gere o código completo da estrutura base.
═══════════════════════════════════════════════════════════════════════════════
```

```
═══════════════════════════════════════════════════════════════════════════════
PROMPT FASE 3.2 - FUNCIONALIDADES PACIENTE
═══════════════════════════════════════════════════════════════════════════════

Implemente as telas do App Paciente:

1. HomeScreen:
   // lib/features/patient/home/screens/home_screen.dart
   - Header com saudação e foto
   - Card "Plano de Hoje" com CTA principal
   - Check-in rápido de dor (slider 0-10)
   - Card "Próxima Sessão"
   - Progresso semanal (circular progress)

2. ExerciseExecutionScreen:
   // lib/features/patient/exercises/screens/exercise_execution_screen.dart
   - Vídeo em loop (video_player)
   - Contador de séries/repetições
   - Timer de descanso
   - RPE pós-exercício (1-10)
   - Dor pós-exercício (0-10)
   - Botão "Não consegui" + motivo

3. CheckinDorScreen:
   - Mapa de dor simplificado (2D)
   - Slider EVA 0-10
   - Comentário opcional
   - Salvar no Firestore (daily_checkins)

4. ProgressScreen:
   - Gráfico de adesão (line_chart)
   - Evolução da dor
   - Histórico de sessões
   - PROMs scores

5. Push notifications:
   // lib/core/firebase/notification_service.dart
   - Lembrete plano do dia (8h)
   - Lembrete exercício pendente (19h)
   - Confirmação consulta (24h antes)

Gere o código completo com animações.
═══════════════════════════════════════════════════════════════════════════════
```

```
═══════════════════════════════════════════════════════════════════════════════
PROMPT FASE 3.3 - FUNCIONALIDADES PROFISSIONAL
═══════════════════════════════════════════════════════════════════════════════

Implemente as telas do App Profissional:

1. AgendaScreen:
   // lib/features/professional/agenda/screens/agenda_screen.dart
   - Timeline do dia
   - Filtros: sala, status
   - Status badges
   - Ações rápidas (confirmar, cancelar)
   - Alertas: dor alta, baixa adesão

2. PatientDetailScreen (Paciente 360):
   // lib/features/professional/patients/screens/patient_detail_screen.dart
   - Header: foto, nome, status, progresso
   - Tabs: Geral, Evoluções, Exercícios, Métricas
   - Timeline SOAP resumido
   - Gráfico de dor (line_chart)
   - Último check-in
   - Ações: Nova evolução, Prescrever

3. PatientSearchScreen:
   - Busca por nome/CPF
   - Filtros: status, patologia
   - Lista recente
   - Adicionar rápido

4. QuickSOAPScreen:
   - Formulário simplificado
   - Mapa de dor touch
   - Dictation (speech-to-text)
   - Templates frequentes
   - Salvar e voltar

5. PrescriptionScreen:
   - Biblioteca de exercícios
   - Arrastar para prescrever
   - Configurar sets/reps/carga
   - Preview para paciente

Gere o código completo.
═══════════════════════════════════════════════════════════════════════════════
```

### FASE 4 - Inteligência Artificial

```
═══════════════════════════════════════════════════════════════════════════════
PROMPT FASE 4.1 - GEMINI API - INSIGHTS CLÍNICOS
═══════════════════════════════════════════════════════════════════════════════

Implemente a integração com Gemini API para insights clínicos:

1. Vertex AI setup:
   // lib/ai/vertex.ts
   - Initialize Vertex AI client
   - Configurar Gemini 2.5 Flash (rápido, econômico)

2. Server Action:
   // actions/ai/analyze-evolution.ts
   'use server'

   Input:
   - patientId
   - lastEvolutionNotes (últimas 3 evoluções)
   - currentSubjective (relato atual)
   - patientContext (idade, patologia, objetivos)

   Processo:
   - Buscar últimas 3 evoluções do Cloud SQL
   - Montar prompt estruturado para Gemini
   - Chamar API com rate limiting (20/hora, 100/dia)
   - Parsear resposta

   Output:
   {
     "patterns": ["Melhora da mobilidade", "Dor diminuindo"],
     "concerns": ["Dor ainda alta ao fazer X"],
     "suggestions": ["Aumentar carga", "Adicionar exercício Y"],
     "prognosis": "Positivo, estimado 4 semanas"
   }

3. Botão no formulário SOAP:
   // components/soap/insights-button.tsx
   - "Gerar Insights com IA"
   - Loading state durante análise
   - Exibir insights em cards
   - Permite editar antes de salvar

4. Exercise suggestions:
   // actions/ai/suggest-exercises.ts
   - Input: condição, restrições, objetivos
   - Output: lista de exercícios recomendados
   - Com justificativa clínica

5. Rate limiting:
   - 20 requests/hora por profissional
   - 100 requests/dia por organização
   - Cache de respostas similares
   - Log de todos os requests

Gere o código completo com prompts Gemini.
═══════════════════════════════════════════════════════════════════════════════
```

### FASE 5 - Beta & Polish

```
═══════════════════════════════════════════════════════════════════════════════
PROMPT FASE 5.1 - FIREBASE APP DISTRIBUTION + CI/CD
═══════════════════════════════════════════════════════════════════════════════

Configure distribuição beta e CI/CD:

1. Firebase App Distribution:
   // ios/Runner/GoogleService-Info.plist
   - Configurar Firebase SDK iOS
   - Adicionar App Distribution SDK

2. Fastlane:
   // fastlane/Fastfile
   - lane beta - build e upload para App Distribution
   - lane release - build para App Store
   - match para certificados

3. GitHub Actions:
   // .github/workflows/ios-beta.yml
   - On push to main
   - Run tests
   - Build iOS
   - Upload to Firebase App Distribution
   - Notify testers

4. Grupos de Testers:
   - internal-team: 15 funcionários
   - beta-patients: 30 pacientes selecionados

5. Coleta de Feedback:
   - In-app feedback form
   - Screenshot anotado
   - Envio para Firebase Crashlytics

6. Performance Monitoring:
   - Firebase Performance SDK
   - Traces: tela home, execução exercício
   - Network traces: API calls

Gere o fastlane e GitHub Actions completo.
═══════════════════════════════════════════════════════════════════════════════
```

```
═══════════════════════════════════════════════════════════════════════════════
PROMPT FASE 5.2 - DEPLOY PRODUÇÃO + MONITORAMENTO
═══════════════════════════════════════════════════════════════════════════════

Configure deploy produção e monitoramento:

1. Firebase Hosting (Web):
   // firebase.json
   {
     "hosting": {
       "public": ".next",
       "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
       "rewrites": [{"source": "**", "destination": "/index.html"}],
       "headers": [
         {"key": "X-Frame-Options", "value": "DENY"},
         {"key": "X-Content-Type-Options", "value": "nosniff"},
         {"key": "Strict-Transport-Security", "value": "max-age=31536000"}
       ]
     },
     "functions": {
       "source": "functions",
       "runtime": "nodejs20"
     }
   }

2. GitHub Actions CI/CD:
   // .github/workflows/deploy-prod.yml
   - Test on PR
   - Deploy on merge to main
   - Deploy to Firebase Hosting
   - Run migrations

3. Cloud Monitoring:
   Alertas:
   - Error rate > 1%
   - Response time > 2s
   - Database query time > 100ms
   - Uptime < 99.9%

4. Cloud Logging:
   // lib/logging/logger.ts
   - Structured logging
   - Error reporting
   - Audit trail (LGPD)

5. Backup automatizado:
   - Cloud SQL: diário, 7 dias retenção
   - Firestore: export diário para Cloud Storage
   - Firebase Storage: versioning enabled

6. Dashboard:
   - Error Reporting
   - Performance Monitoring
   - Analytics
   - Custom metrics

Gere as configurações completas.
═══════════════════════════════════════════════════════════════════════════════
```

---

## 6. CHECKLIST DE IMPLEMENTAÇÃO

### Fase 0 - Fundação (1-2 semanas)
- [ ] Criar 3 Firebase Projects (dev/staging/prod)
- [ ] Setup Next.js 15 monorepo
- [ ] Configurar Firebase Hosting
- [ ] Implementar Firebase Auth + Custom Claims
- [ ] Setup Cloud SQL Schema (PostgreSQL + Drizzle)
- [ ] Setup Firestore Collections
- [ ] Cloud Functions estrutura base
- [ ] Firestore Security Rules (deny by default)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Environment variables configuradas

### Fase 1 - Web MVP (3-4 semanas)
- [ ] CRUD Pacientes completo
- [ ] Validação CPF (algoritmo)
- [ ] Criptografia CPF (pgcrypto)
- [ ] Agenda com calendário visual
- [ ] Detecção de conflitos em tempo real
- [ ] Reagendamento drag-and-drop
- [ ] Sessões SOAP estruturadas
- [ ] Mapa de dor interativo (SVG)
- [ ] **Assinatura digital de prontuários**
- [ ] **Imutabilidade após assinatura**
- [ ] **Salvamento duplo: Cloud SQL + Firestore**
- [ ] WhatsApp Cloud API integration
- [ ] Lembretes automáticos
- [ ] Lista de espera automática
- [ ] Pacotes de sessões + validade
- [ ] Dashboard básico

### Fase 2 - API Mobile (2-3 semanas)
- [ ] Route Handlers /app/api/v1/
- [ ] Validação de token Firebase Auth
- [ ] Verificação de Custom Claims (role)
- [ ] GET /api/v1/patient/home
- [ ] POST /api/v1/patient/checkin
- [ ] GET /api/v1/patient/progress
- [ ] GET /api/v1/physio/agenda
- [ ] GET /api/v1/physio/patients
- [ ] GET /api/v1/physio/patient/:id
- [ ] POST /api/v1/physio/soap
- [ ] Error handling padronizado

### Fase 3 - Flutter App (4-5 semanas)
- [ ] Setup Flutter + Firebase SDK
- [ ] Role-based routing (1 app, 2 roles)
- [ ] Auth multi-provider
- [ ] **Paciente:**
  - [ ] Plano do dia
  - [ ] Execução de exercícios (vídeo)
  - [ ] Check-in de dor (EVA)
  - [ ] Streak e gamificação
  - [ ] Progresso visual
- [ ] **Profissional:**
  - [ ] Agenda mobile
  - [ ] Paciente 360
  - [ ] Quick SOAP
  - [ ] Prescrição de exercícios
- [ ] Push notifications (FCM)
- [ ] Offline persistence

### Fase 4 - IA (2-3 semanas)
- [ ] Integração Vertex AI (Gemini)
- [ ] Server Action analyzeEvolution
- [ ] Botão "Gerar Insights com IA"
- [ ] Exercise suggestions com IA
- [ ] Genkit workflows (opcional)
- [ ] Rate limiting (20/hora, 100/dia)

### Fase 5 - Beta & Polish (2-4 semanas)
- [ ] Firebase App Distribution
- [ ] Testers internos (15 funcionários)
- [ ] Beta com 30 pacientes
- [ ] Coleta de feedback
- [ ] Performance monitoring
- [ ] Submissão App Store
- [ ] Deploy Web produção
- [ ] Documentação final

---

## 7. CUSTOS ESTIMADOS

### Escala Atual (600 atendimentos/mês)

| Serviço Google | Uso Estimado | Custo Mensal |
|----------------|--------------|--------------|
| Firebase Hosting | ~10GB transfer | ~$1 |
| Cloud Firestore | 50K reads, 20K writes/day | ~$15 |
| Cloud Functions | 100K invocações | ~$10 |
| Cloud SQL (db-f1-micro) | 1 vCPU, 0.6GB RAM | ~$35 |
| Firebase Storage | 20GB (vídeos, docs) | ~$3 |
| FCM | 5K mensagens | ~$0 (grátis) |
| Cloud Logging | 50GB logs | ~$5 |
| Vertex AI (Gemini) | 100 requests/dia | ~$5 |
| **TOTAL** | | **~$74/mês** |

### Escala Futura (5000 atendimentos/mês)

| Serviço Google | Upgrade | Custo Mensal |
|----------------|---------|--------------|
| Cloud SQL | db-n1-standard-1 | ~$120 |
| Firestore | Multi-region | ~$50 |
| Cloud Functions | Mais invocações | ~$30 |
| Storage | 100GB | ~$10 |
| Vertex AI | 500 requests/dia | ~$20 |
| **TOTAL** | | **~$250/mês** |

---

## 8. SEGURANÇA E COMPLIANCE

### LGPD Compliance

| Aspecto | Implementação |
|---------|---------------|
| **Criptografia** | CPF criptografado com pgcrypto |
| **Soft delete** | Campo deleted_at em pacientes |
| **Audit trail** | Cloud Logging para todas operações |
| **Consentimento** | Termos aceitos no registro |
| **Direito ao esquecimento** | Soft delete + anonimização após 5 anos |
| **Backup** | Diário, 7 dias retenção |

### Security Best Practices

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SECURITY CHECKLIST                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  AUTHENTICATION                                                             │
│  ├── Email/Password + MFA para profissionais                                │
│  ├── Google OAuth + Apple OAuth                                             │
│  ├── Phone Auth (SMS)                                                       │
│  ├── Custom Claims para RBAC                                                │
│  ├── Session timeout: 30min idle                                            │
│  └── Rate limiting: 5 tentativas/login                                      │
│                                                                              │
│  AUTHORIZATION                                                              │
│  ├── Firestore Security Rules (deny by default)                             │
│  ├── Cloud SQL: nunca acesso direto do client                               │
│  ├── Role-based access control                                              │
│  ├── Tenant isolation (multi-tenant)                                        │
│  └── API token validation em todas requests                                 │
│                                                                              │
│  DATA PROTECTION                                                            │
│  ├── Criptografia at rest (Cloud SQL, Storage)                              │
│  ├── Criptografia in transit (TLS 1.3)                                      │
│  ├── CPF criptografado (pgcrypto)                                           │
│  ├── PII no Firestore mínimo                                                │
│  └── Soft delete LGPD                                                       │
│                                                                              │
│  MONITORING                                                                 │
│  ├── Cloud Logging ( structured logs)                                       │
│  ├── Error Reporting (alerts em tempo real)                                 │
│  ├── Audit trail (todas operações sensíveis)                                │
│  └── Performance Monitoring                                                │
│                                                                              │
│  BACKUP & RECOVERY                                                          │
│  ├── Cloud SQL: backups diários, 7 dias retenção                            │
│  ├── Firestore: export diário para Cloud Storage                           │
│  ├── Storage: versioning enabled                                           │
│  └── Disaster recovery plan documentado                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Firestore Security Rules Completas

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helpers
    function isAuthenticated() {
      return request.auth != null;
    }

    function hasRole(role) {
      return isAuthenticated() &&
             request.auth.token.role == role;
    }

    function isAdmin() {
      return hasRole('admin');
    }

    function isPhysio() {
      return hasRole('physio') || isAdmin();
    }

    function isSameTenant(tenantId) {
      return isAuthenticated() &&
             request.auth.token.tenantId == tenantId;
    }

    function isOwner(userId) {
      return isAuthenticated() &&
             request.auth.uid == userId;
    }

    // Organizations
    match /organizations/{orgId} {
      allow read: if isSameTenant(orgId);
      allow write: if isAdmin();
    }

    // Patients
    match /patients/{patientId} {
      allow read: if isAuthenticated() &&
        (resource.data.user_id == request.auth.uid || isPhysio());
      allow create: if isPhysio();
      allow update: if isPhysio();
      allow delete: if isAdmin();

      // Subcollections
      match /daily_checkins/{checkinId} {
        allow read: if isPhysio() ||
          (isOwner(resource.data.userId));
        allow create: if isOwner(request.resource.data.userId);
      }

      match /soap_summary/{summaryId} {
        allow read: if isPhysio() ||
          (resource.data.patientId == request.auth.uid);
        allow write: if isPhysio();
      }
    }

    // Appointments
    match /appointments/{appointmentId} {
      allow read: if isAuthenticated() &&
        (resource.data.patientId == request.auth.uid ||
         resource.data.professionalId == request.auth.uid ||
         isPhysio());
      allow create: if isPhysio();
      allow update: if isPhysio();
      allow delete: if isAdmin();
    }

    // Users (presence, devices)
    match /users/{userId} {
      allow read: if isAuthenticated();
      match /presence/{presenceId} {
        allow read, write: if isOwner(userId);
      }
      match /devices/{deviceId} {
        allow read: if isOwner(userId);
        allow create: if isOwner(userId);
        allow update: if isOwner(userId);
        allow delete: if isOwner(userId) || isAdmin();
      }
    }

    // Feed (atividade da clínica)
    match /feed/{orgId}/events/{eventId} {
      allow read: if isSameTenant(orgId);
      allow write: if isPhysio();
    }

    // Deny everything else
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## RESUMO EXECUTIVO

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FISIOFLOW - STACK 100% GOOGLE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  FRONTEND                                                                     │
│  ├── Web Admin      → Next.js 15 + Firebase Hosting                         │
│  └── Mobile App     → Flutter (1 app, role-based routing)                    │
│                        ├─ Paciente: plano do dia, exercícios                 │
│                        └─ Profissional: agenda, SOAP, pacientes             │
│                                                                              │
│  BACKEND AS A SERVICE                                                          │
│  ├── Auth           → Firebase Auth (Email, Google, Apple, Phone, MFA)      │
│  ├── Database       → Cloud SQL (PostgreSQL) + Firestore                    │
│  ├── Storage        → Firebase Storage                                      │
│  ├── Functions      → Cloud Functions (2nd gen, Node.js 20)                 │
│  ├── Messaging      → Firebase Cloud Messaging                              │
│  └── Analytics      → Firebase Analytics + GA4                              │
│                                                                              │
│  GOOGLE CLOUD PLATFORM                                                        │
│  ├── AI/ML          → Gemini API + Vertex AI + Genkit                       │
│  ├── Infrastructure  → Cloud Run + Cloud SQL + Cloud Storage                │
│  ├── Observability  → Cloud Logging + Monitoring + Error Reporting          │
│  └── CI/CD          → Cloud Build + Cloud Deploy + GitHub Actions           │
│                                                                              │
│  DIFERENCIAIS                                                                │
│  ├── Assinatura digital de prontuários (imutável após assinar)               │
│  ├── Salvamento duplo: Cloud SQL (oficial) + Firestore (leitura rápida)     │
│  ├── 1 App Flutter com role-based routing (mais simples)                    │
│  ├── IA clínica com Gemini (insights de evolução)                           │
│  ├── WhatsApp Cloud API (confirmação botões SIM/NÃO)                        │
│  └── 100% ecossistema Google                                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## PRÓXIMOS PASSOS

1. **Abra o Firebase Studio** console.firebase.google.com
2. **Crie "New Workspace"**
3. **Escolha "Next.js"** como tecnologia inicial
4. **Copie o PROMPT INICIAL** da seção 4
5. **Cole no AI Assistant (Gemini)**
6. **Valide o código gerado**
7. **Continue com os prompts por fase** (Fase 0.1 → 0.2 → 0.3 → ...)

Boa sorte! 🚀
