# ANALISE COMPLETA DO SISTEMA FISIOFLOW + ROADMAP

**Data:** 2026-02-02
**Objetivo:** Documento de referencia para continuar o desenvolvimento no Claude Code localmente

---

## 1. VISAO GERAL DO PROJETO

### 1.1 O que e o FisioFlow

Sistema de gestao completo para clinicas de fisioterapia, incluindo:
- Gestao de pacientes e prontuarios SOAP
- Agendamento inteligente de consultas
- Biblioteca de exercicios com videos e protocolos
- Gestao financeira
- Telemedicina
- Gamificacao para engajamento de pacientes
- CRM e marketing
- App mobile para pacientes

### 1.2 Stack Tecnologico

```
FRONTEND (Web):
  - React 19.1.0 + TypeScript 5.8.3
  - Vite 5.4.19 (build tool)
  - TailwindCSS 3.4.17 + shadcn/ui
  - TanStack Query 5.90.17 (server state)
  - Zustand 4.5.5 (client state)
  - React Hook Form 7.61.1 + Zod 3.25.76

BACKEND:
  - Firebase (Firestore, Auth, Storage, Functions)
  - Cloud Functions (Node.js/TypeScript)
  - Inngest (background jobs/workflows)

MOBILE:
  - React Native 0.76.9 + Expo 52
  - Capacitor 8.0.0 (iOS/Android)

IA/ML:
  - MediaPipe (pose estimation)
  - OpenAI/Google AI (clinical analysis)
  - Cornerstone.js (DICOM viewer)

DEPLOY:
  - Firebase Hosting
  - Google Cloud Platform
  - Sentry (error tracking)
```

---

## 2. ESTRUTURA DO PROJETO

```
fisioflow-51658291/
|-- src/                          # Codigo-fonte web
|   |-- components/               # ~200+ componentes React
|   |   |-- admin/                # Painel admin e gamificacao
|   |   |-- ai/                   # Componentes de IA
|   |   |-- analysis/             # Analise postural, DICOM
|   |   |-- analytics/            # Dashboards e metricas
|   |   |-- appointments/         # Agendamentos
|   |   |-- auth/                 # Login, registro, MFA
|   |   |-- clinical/             # Testes clinicos, SOAP
|   |   |-- crm/                  # CRM e marketing
|   |   |-- exercises/            # Biblioteca de exercicios
|   |   |-- evolution/            # Evolucoes clinicas
|   |   |-- financial/            # Financeiro
|   |   |-- gamification/         # Sistema de pontos
|   |   |-- patients/             # Gestao de pacientes
|   |   |-- schedule/             # Calendario/agenda
|   |   |-- telemedicine/         # Teleconsulta
|   |   `-- ui/                   # Componentes base (shadcn)
|   |-- hooks/                    # ~100+ hooks customizados
|   |-- pages/                    # ~90+ paginas/rotas
|   |-- services/                 # Servicos de API
|   |-- lib/                      # Utilitarios e configs
|   |-- types/                    # Tipos TypeScript
|   `-- test/                     # Testes unitarios
|
|-- functions/                    # Firebase Cloud Functions
|   |-- src/
|   |   |-- api/                  # Endpoints REST
|   |   |-- ai/                   # Funcoes de IA
|   |   |-- auth/                 # Triggers de auth
|   |   |-- communications/       # Email/WhatsApp
|   |   |-- crons/                # Jobs agendados
|   |   |-- integrations/         # Google Calendar, etc.
|   |   |-- lgpd/                 # Compliance LGPD
|   |   |-- stripe/               # Pagamentos
|   |   `-- workflows/            # Inngest workflows
|
|-- patient-app/                  # App React Native (pacientes)
|   |-- app/                      # Expo Router pages
|   |-- components/               # UI components
|   |-- hooks/                    # Hooks customizados
|   `-- services/                 # Servicos
|
|-- apps/professional-ios/        # App profissional (Expo)
|
|-- docs2026/                     # Documentacao tecnica
|
`-- .agent/                       # Configs e docs de agentes AI
```

---

## 3. STATUS ATUAL POR MODULO

### 3.1 MODULOS COMPLETOS (90-100%)

| Modulo | Status | Cobertura | Notas |
|--------|--------|-----------|-------|
| Autenticacao | ✅ Completo | 100% | Firebase Auth, MFA, OAuth |
| Gestao de Pacientes | ✅ Completo | 95% | LGPD, uploads, historico |
| Agenda/Agendamentos | ✅ Completo | 95% | Recorrencia, conflitos |
| Prontuario SOAP | ✅ Completo | 90% | Assinaturas, templates |
| Biblioteca Exercicios | ✅ Completo | 90% | 500+ exercicios, videos |
| Fichas Avaliacao | ✅ Completo | 95% | 21+ templates validados |
| Gestao Financeira | ✅ Completo | 80% | Recibos, demonstrativos |
| Relatorios/Analytics | ✅ Completo | 85% | Dashboards, exportacao |

### 3.2 MODULOS PARCIAIS (40-60%)

| Modulo | Status | Cobertura | O que falta |
|--------|--------|-----------|-------------|
| Notificacoes Push | Parcial | 60% | UI preferencias, analytics |
| Gamificacao | Parcial | 50% | Dashboard paciente, leaderboards |
| CRM | Parcial | 40% | Automacao, WhatsApp Business |
| Telemedicina | Parcial | 40% | WebRTC, gravacao, chat |

### 3.3 MODULOS NAO INICIADOS

| Modulo | Status | Prioridade |
|--------|--------|------------|
| App Mobile Pacientes | Estrutura criada | Alta |
| App Mobile Profissional | Estrutura criada | Alta |
| Marketplace Exercicios | Nao iniciado | Baixa |
| Integracao HIS/FHIR | Nao iniciado | Baixa |

---

## 4. BUGS E PROBLEMAS CONHECIDOS

### 4.1 CRITICOS (Corrigir Imediatamente)

#### #001 - React Error #185 em Agendamentos
```
Arquivo: src/components/schedule/AppointmentModalRefactored.tsx:225-236
Problema: useEffect com dependencia instavel (checkPatientHasPreviousSessions)
Impacto: Loop infinito ao criar agendamento

CORRECAO:
const checkPatientHasPreviousSessionsRef = useRef(checkPatientHasPreviousSessions);
checkPatientHasPreviousSessionsRef.current = checkPatientHasPreviousSessions;

useEffect(() => {
  if (!appointment && isOpen && watchedPatientId && currentMode === 'create') {
    const hasPreviousSessions = checkPatientHasPreviousSessionsRef.current(watchedPatientId);
    // ...
  }
}, [watchedPatientId, isOpen, appointment, currentMode, setValue]);
```

#### #002 - Dupla chamada em AppointmentQuickView
```
Arquivo: src/components/schedule/AppointmentQuickView.tsx:307-324
Problema: onClick dentro do DrawerTrigger asChild duplica chamada

CORRECAO: Remover onClick do span dentro do DrawerTrigger
```

#### #005 - Migracao Incompleta Supabase -> Firebase
```
Arquivo: src/components/modals/NewPatientModal.tsx:192-196
Problema: Ainda usa Supabase para criar pacientes
CORRECAO: Migrar para Firebase conforme padrao do sistema
```

### 4.2 MEDIOS (Esta Semana)

| ID | Arquivo | Linha | Problema |
|----|---------|-------|----------|
| #003 | CalendarAppointmentCard.tsx | 415-427 | Dupla chamada onOpenPopover |
| #004 | ProtocolCardEnhanced.tsx | 92, 159 | asChild + onClick incorreto |
| #008 | SOAPFormPanel.tsx | 112-117 | Debounce + useEffect loop |

### 4.3 BAIXOS (Otimizacao)

- Invalidation excessiva de queries
- gcTime muito longo em useExerciseProtocols (24h -> 5-30min)
- Testes ainda usando mocks de Supabase

---

## 5. METRICAS DE QUALIDADE ATUAIS

| Metrica | Valor Atual | Meta | Status |
|---------|-------------|------|--------|
| Cobertura de Testes | ~45-55% | >70% | ⚠️ |
| TypeScript Strict | ✅ On | ✅ On | ✅ |
| Lighthouse Performance | ~88-92 | >90 | ✅ |
| Build Size | ~11.7MB | <12MB | ✅ |
| Acessibilidade WCAG | ~92% | 100% | ✅ |
| E2E Tests | 12 specs | 15+ | ⚠️ |

---

## 6. ROADMAP DETALHADO

### FASE 1: ESTABILIZACAO (Semanas 1-2)
**Prioridade: CRITICA**

```
[ ] Corrigir React Error #185 em agendamentos
[ ] Corrigir dupla chamada em AppointmentQuickView
[ ] Migrar NewPatientModal para Firebase
[ ] Corrigir CalendarAppointmentCard onClick
[ ] Corrigir ProtocolCardEnhanced asChild
[ ] Corrigir SOAPFormPanel debounce
[ ] Atualizar testes para Firebase (remover Supabase mocks)
[ ] Validar todos os fluxos CRUD:
    [ ] Criar paciente
    [ ] Editar paciente
    [ ] Criar agendamento
    [ ] Editar agendamento
    [ ] Criar evolucao/SOAP
    [ ] Editar evolucao/SOAP
    [ ] Prescrever exercicios
```

### FASE 2: COBERTURA DE TESTES (Semanas 3-4)
**Prioridade: ALTA**

```
[ ] Adicionar testes E2E para fluxos criticos:
    [ ] Login/logout
    [ ] Cadastro de paciente completo
    [ ] Agendamento completo
    [ ] Prescricao de exercicios
    [ ] Evolucao SOAP
    [ ] Fluxo financeiro basico
[ ] Aumentar cobertura de testes unitarios para >60%
[ ] Adicionar testes de acessibilidade (axe-core)
[ ] Configurar CI/CD com testes automatizados
```

### FASE 3: NOTIFICACOES COMPLETAS (Semanas 5-6)
**Prioridade: ALTA**

```
[ ] UI de gerenciamento de preferencias
[ ] Centro de notificacoes no app
[ ] Template engine para notificacoes customizadas
[ ] Testes de entrega em producao
[ ] Analytics de taxa de abertura
[ ] Notificacoes por canal:
    [ ] Email (Resend)
    [ ] Push (Firebase Cloud Messaging)
    [ ] WhatsApp (Cloud API)
```

### FASE 4: APP MOBILE PACIENTES (Semanas 7-10)
**Prioridade: ALTA**

```
[ ] Finalizar setup Expo com EAS
[ ] Implementar autenticacao nativa
[ ] Telas principais:
    [ ] Login/Register
    [ ] Dashboard (home)
    [ ] Lista de exercicios prescritos
    [ ] Detalhes do exercicio + video
    [ ] Progresso/estatisticas
    [ ] Agendamentos
    [ ] Perfil
[ ] Integrar push notifications nativas
[ ] Offline sync (AsyncStorage + React Query)
[ ] Build iOS e Android
[ ] Publicar nas lojas (TestFlight/Play Console)
```

### FASE 5: GAMIFICACAO COMPLETA (Semanas 11-12)
**Prioridade: MEDIA**

```
[ ] Dashboard gamificacao para pacientes
[ ] Sistema de conquistas visuais
[ ] Leaderboards (semanal/mensal)
[ ] Desafios customizaveis pelo fisio
[ ] Integracao com execucao de exercicios
[ ] Notificacoes de conquistas
[ ] Loja de recompensas
```

### FASE 6: CRM E MARKETING (Semanas 13-15)
**Prioridade: MEDIA**

```
[ ] Automacao de marketing (email sequences)
[ ] Integracao WhatsApp Business API completa
[ ] Funil de vendas visual
[ ] Campanhas de email (templates)
[ ] Landing pages para captacao
[ ] Integracao com Google Ads
[ ] Analytics de conversao
```

### FASE 7: TELEMEDICINA AVANCADA (Semanas 16-18)
**Prioridade: MEDIA**

```
[ ] Integracao WebRTC completa
[ ] Gravacao de sessoes
[ ] Chat durante consulta
[ ] Compartilhamento de tela
[ ] Anotacoes sincronizadas
[ ] Fila de espera virtual
[ ] Integracao com prontuario (SOAP automatico)
```

### FASE 8: IA AVANCADA (Semanas 19-24)
**Prioridade: BAIXA**

```
[ ] Analise de movimento com MediaPipe
[ ] Comparacao com "golden standard"
[ ] Feedback visual em tempo real
[ ] Relatorios de progresso automaticos
[ ] Sugestao inteligente de exercicios
[ ] Predicao de adesao do paciente
[ ] Chat clinico com IA
```

---

## 7. TODO LIST PARA DESENVOLVIMENTO LOCAL

### SETUP INICIAL

```bash
# 1. Clonar/acessar repositorio
cd /home/user/fisioflow-51658291

# 2. Instalar dependencias
pnpm install

# 3. Configurar variaveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais Firebase

# 4. Iniciar desenvolvimento
pnpm dev                    # Frontend web
pnpm dev:patient            # App paciente (se necessario)
pnpm dev:professional       # App profissional (se necessario)

# 5. Iniciar Firebase Emulators (opcional, para dev local)
firebase emulators:start --only auth,firestore,storage

# 6. Rodar testes
pnpm test                   # Testes unitarios
pnpm test:e2e               # Testes E2E (Playwright)
pnpm lint                   # Linting
```

### COMANDOS UTEIS

```bash
# Build
pnpm build                  # Build producao
pnpm build:analyze          # Analise de bundle

# Deploy
pnpm deploy:web             # Deploy hosting
pnpm deploy:functions       # Deploy functions
pnpm deploy:all             # Deploy completo

# Database
pnpm db:push                # Push schema Drizzle
pnpm db:generate            # Gerar migrations

# Migracao
pnpm migrate:exercises-protocols  # Migrar exercicios
```

### FLUXO DE TRABALHO RECOMENDADO

```
1. ANTES DE COMECAR:
   - Ler este documento
   - Verificar bugs criticos pendentes
   - Rodar `pnpm test` para garantir estado estavel

2. DURANTE DESENVOLVIMENTO:
   - Usar branch feature/[nome-feature]
   - Commits frequentes com mensagens claras
   - Rodar `pnpm lint` antes de commits
   - Testar manualmente os fluxos afetados

3. ANTES DE MERGE/DEPLOY:
   - Rodar `pnpm test:pre-deploy`
   - Verificar console do navegador
   - Testar em mobile (responsive)
   - Verificar acessibilidade (Tab navigation)
```

---

## 8. ARQUIVOS IMPORTANTES

### Configuracao
- `package.json` - Dependencias e scripts
- `vite.config.ts` - Configuracao Vite
- `tsconfig.app.json` - Configuracao TypeScript
- `tailwind.config.ts` - Configuracao Tailwind
- `firebase.json` - Configuracao Firebase
- `firestore.rules` - Regras de seguranca Firestore
- `storage.rules` - Regras de seguranca Storage

### Documentacao
- `docs2026/` - Documentacao tecnica completa
- `.agent/fluxos/` - Mapeamento de fluxos CRUD
- `.agent/relatorios/consolidado.md` - Bugs conhecidos
- `.agent/planning/` - Planejamentos de features

### Pontos de Entrada
- `src/App.tsx` - App principal
- `src/main.tsx` - Bootstrap React
- `functions/src/index.ts` - Entrada Cloud Functions

---

## 9. CONTATOS E RECURSOS

### Documentacao Tecnica
- `/docs2026/` - Documentacao completa do projeto
- `/docs2026/13-roadmap.md` - Roadmap oficial
- `/docs2026/01-visao-geral.md` - Visao geral

### Firebase Console
- Project: `fisioflow-migration`
- Region: `southamerica-east1`

### Integracoes Configuradas
- Firebase Auth (email, Google, OAuth)
- Firebase Firestore (banco de dados)
- Firebase Storage (arquivos)
- Firebase Cloud Functions
- Google Calendar Sync
- Resend (email)
- WhatsApp Cloud API
- Stripe (pagamentos)
- Sentry (error tracking)
- Inngest (background jobs)

---

## 10. CHECKLIST DIARIO DE DESENVOLVIMENTO

```
[ ] Verificar se ha bugs criticos novos
[ ] Pull das ultimas alteracoes
[ ] Rodar testes basicos
[ ] Focar em uma tarefa do roadmap
[ ] Testar alteracoes manualmente
[ ] Commit com mensagem descritiva
[ ] Push para branch de feature
[ ] Atualizar este documento se necessario
```

---

**Ultima atualizacao:** 2026-02-02
**Proxima revisao:** Apos conclusao da Fase 1
