# FISIOFLOW - Prompts para Firebase Studio
## 100% Ecossistema Google - 1 App Flutter Único + Web

**Data:** 26 de Janeiro de 2026
**Escopo:** Web (computadores) + 1 App Flutter iOS (Paciente + Profissional)
**Meta:** 600 atendimentos/mês, 15 funcionários, 30 pacientes teste

---

## ÍNDICE

1. [Decisão Inicial Firebase Studio](#1-decisão-inicial-firebase-studio)
2. [Prompt Inicial - Setup do Projeto](#2-prompt-inicial---setup-do-projeto)
3. [Prompt Fase 1 - Agenda (PRIORIDADE MÁXIMA)](#3-prompt-fase-1---agenda-prioridade-máxima)
4. [Prompt Fase 2 - Pacientes + Evolução SOAP](#4-prompt-fase-2---pacientes--evolucao-soap)
5. [Prompt Fase 3 - Flutter App (1 App, 2 Roles)](#5-prompt-fase-3---flutter-app-1-app-2-roles)
6. [Prompt Fase 4 - Exercícios + Gamificação](#6-prompt-fase-4---exercicios--gamificacao)
7. [Prompt Fase 5 - WhatsApp + Financeiro](#7-prompt-fase-5---whatsapp--financeiro)
8. [Prompt Fase 6 - NeuroPose + Relatórios](#8-prompt-fase-6---neuropose--relatorios)

---

## 1. DECISÃO INICIAL FIREBASE STUDIO

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  FIREBASE STUDIO - TELA INICIAL                                              │
│                                                                             │
│  ESCOLHA: [ New Workspace ]  ✅                                              │
│                                                                             │
│  TECNOLOGIA: [ Next.js ]  ✅ (para Web + Backend API)                       │
│                                                                             │
│  DEPOIS: Criar projeto Flutter separado para Mobile                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. PROMPT INICIAL - SETUP DO PROJETO

Copie e cole este prompt no Firebase Studio AI:

```
═══════════════════════════════════════════════════════════════════════════════
FISIOFLOW - SISTEMA DE GESTÃO PARA FISIOTERAPIA
Prompt Inicial - Setup do Projeto 100% Google Cloud Platform
═══════════════════════════════════════════════════════════════════════════════

CONTEXTO DO PROJETO:
───────────────────────────────────────────────────────────────────────────────
Sou fisioterapeuta e estou criando um sistema completo para minha clínica de
fisioterapia.

MÉTRICAS ATUAIS:
• 600 atendimentos/mês
• 15 funcionários
• 30 pacientes ativos (fase teste)
• 4 pacientes por horário (capacidade padrão)

PRECISO CRIAR:
1. Web App (computadores) - Next.js + Firebase - Para profissionais (fisioterapeutas,
   administradores, recepcionistas)
2. 1 App Flutter iOS - Com role-based routing para:
   - Pacientes (acompanhar tratamento)
   - Profissionais (gestão em movimento)

ARQUITETURA GOOGLE:
• Autenticação: Firebase Auth (Email, Google, Apple)
• Banco de Dados: Firestore (principal)
• Storage: Firebase Storage (fotos, vídeos, documentos)
• Backend: Cloud Functions (2nd gen, Node.js 20)
• AI: Gemini API + Vertex AI
• Hosting: Firebase Hosting (Web)
• Notificações: Firebase Cloud Messaging
• Analytics: Firebase Analytics

ROLES DO SISTEMA:
• admin - Acesso total
• fisioterapeuta - Gestão de pacientes, evoluções, prescrições
• recepcionista - Agenda, cadastros
• estagiario - Visualização limitada
• educador_fisico - Exercícios e prescrições
• paciente - Acesso apenas aos próprios dados

REGRAS IMPORTANTES:
✅ AGENDA é PRIORIDADE MÁXIMA
✅ Cadastro expresso: Apenas NOME é obrigatório para pacientes
✅ Horário: 07:00-21:00 segunda a sexta, sábado 07:00-13:00
✅ Capacidade: 4 pacientes por horário (configurável)
✅ NUNCA usar SMS (apenas WhatsApp)
✅ NÃO querer telemedicina/teleconsulta
✅ Design moderno e atraente
✅ Performance: Carregamento < 3s

MODELO DE DADOS - FIRESTORE:
───────────────────────────────────────────────────────────────────────────────
Crie as seguintes coleções:

1. users
{
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'fisioterapeuta' | 'recepcionista' | 'estagiario' | 'educador_fisico' | 'paciente';
  organization_id: string;
  phone: string;
  avatar_url: string;
  mfa_enabled: boolean;
  created_at: timestamp;
  updated_at: timestamp;
}

2. patients
{
  id: string;
  organization_id: string;
  full_name: string; // OBRIGATÓRIO (único campo obrigatório)
  cpf: string;
  birth_date: date;
  phone: string;
  email: string;
  address: object;
  insurance: string;
  insurance_number: string;
  medical_notes: string;
  allergies: string[];
  medications: string[];
  is_complete: boolean; // Flag de cadastro completo
  created_at: timestamp;
  updated_at: timestamp;
}

3. appointments
{
  id: string;
  organization_id: string;
  patient_id: string;
  patient_name: string; // Para cadastro expresso
  professional_id: string;
  date: timestamp;
  duration: number; // minutos
  type: 'individual' | 'group';
  room: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  value: number;
  notes: string;
  created_at: timestamp;
  updated_at: timestamp;
}

4. evolutions (SOAP)
{
  id: string;
  organization_id: string;
  patient_id: string;
  professional_id: string;
  appointment_id: string;
  date: timestamp;
  soap: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
  exercises: string[];
  measurements: object;
  pain_map: object;
  signature_url: string;
  is_signed: boolean; // Após assinar, não pode mais alterar
  created_at: timestamp;
  updated_at: timestamp;
}

5. exercises
{
  id: string;
  organization_id: string;
  name: string;
  description: string;
  video_url: string;
  images: string[];
  muscle_group: string;
  objective: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  sets: number;
  reps: number;
  duration: number;
  contraindications: string[];
  created_at: timestamp;
  updated_at: timestamp;
}

6. exercise_prescriptions
{
  id: string;
  organization_id: string;
  patient_id: string;
  professional_id: string;
  exercises: array; // [{ exercise_id, sets, reps, duration }]
  start_date: date;
  end_date: date;
  frequency: string; // "3x por semana"
  notes: string;
  is_active: boolean;
  created_at: timestamp;
}

7. gamification
{
  id: string;
  organization_id: string;
  patient_id: string;
  points: number;
  level: number;
  streak: number;
  achievements: array;
  completed_exercises: array;
  attended_sessions: array;
  created_at: timestamp;
  updated_at: timestamp;
}

8. transactions
{
  id: string;
  organization_id: string;
  type: 'income' | 'expense';
  amount: number;
  date: timestamp;
  category: string;
  patient_id: string;
  professional_id: string;
  professional_commission: number;
  payment_method: string;
  status: 'pending' | 'paid' | 'cancelled';
  notes: string;
  created_at: timestamp;
  updated_at: timestamp;
}

9. clinic_settings
{
  id: string;
  organization_id: string;
  name: string;
  working_hours: {
    weekday: { start: '07:00', end: '21:00' };
    saturday: { start: '07:00', end: '13:00' };
    sunday: null;
  };
  max_patients_per_slot: number; // Padrão: 4
  rooms: array;
  whatsapp_config: object;
  colors: object;
  logo_url: string;
  created_at: timestamp;
  updated_at: timestamp;
}

FIRESTORE SECURITY RULES:
───────────────────────────────────────────────────────────────────────────────
Crie regras de segurança seguindo estes princípios:

1. Negar tudo por padrão (deny by default)
2. Pacientes só acessam próprios dados
3. Profissionais acessam dados da sua organização
4. Admin tem acesso total
5. Validação de organization_id em todas as operações

O QUE PRECISO QUE VOCÊ CRIE PRIMEIRO:
───────────────────────────────────────────────────────────────────────────────

Comece criando a estrutura base do projeto Next.js 15:

1. Estrutura de pastas:
   /app
     /(auth)/ - Login e recuperação de senha
     /(dashboard)/ - Área principal protegida
       /agenda - Página principal (PRIORIDADE MÁXIMA)
       /pacientes - Gestão de pacientes
       /evolutions - Evoluções SOAP
       /exercicios - Biblioteca de exercícios
       /financeiro - Gestão financeira
       /relatorios - Dashboards e analytics
       /configuracoes - Administração
     /api/v1 - Route Handlers para app Flutter
   /components
     /ui - shadcn/ui components
     /agenda - Componentes específicos da agenda
     /patients - Componentes de pacientes
     /soap - Componentes de evolução
   /lib
     /firebase - Firebase Admin SDK
     /firestore - Firestore helpers
     /auth - Authentication utilities
     /validators - Zod schemas
   /hooks - Custom React hooks
   /types - TypeScript types
   /actions - Server Actions

2. Configurações iniciais:
   - next.config.js
   - tailwind.config.ts
   - tsconfig.json (strict mode)
   - .env.local template

3. Firebase Admin SDK setup para:
   - Auth (verifyIdToken)
   - Firestore (Admin SDK)
   - Storage (Admin SDK)

4. Sidebar layout para navegação (todas as páginas)

Gere apenas a estrutura inicial. Eu validarei antes de continuarmos para as próximas fases.

═══════════════════════════════════════════════════════════════════════════════
```

---

## 3. PROMPT FASE 1 - AGENDA (PRIORIDADE MÁXIMA)

```
═══════════════════════════════════════════════════════════════════════════════
PROMPT FASE 1 - MÓDULO DE AGENDA (PRIORIDADE MÁXIMA)
═══════════════════════════════════════════════════════════════════════════════

Implemente o módulo de AGENDA, que é a funcionalidade mais importante do sistema:

REQUISITOS FUNCIONAIS:
───────────────────────────────────────────────────────────────────────────────

1. Grid de Horários:
   • Horário: 07:00 - 21:00 (segunda a sexta)
   • Horário: 07:00 - 13:00 (sábado)
   • Fechado: domingo
   • Visualização: Dia, Semana, Mês
   - Colunas: Horários (linhas) x Profissionais ou Salas (colunas)

2. Cadastro Expresso de Agendamento:
   • Campos obrigatórios: APENAS nome do paciente
   • Se paciente não existe, criar registro com is_complete: false
   • Avisar sobre cadastro incompleto

3. Tipos de Agendamento:
   • Individual (1 paciente)
   • Grupo (vários pacientes)

4. Status com Código de Cores:
   • pending (cinza) - Pendente de confirmação
   • confirmed (azul) - Confirmado
   • in_progress (amarelo) - Em andamento
   • completed (verde) - Realizado
   • cancelled (vermelho) - Cancelado
   • no_show (laranja) - Paciente faltou

5. Funcionalidades:
   ✅ Criar agendamento (duplo clique no slot vazio)
   ✅ Editar agendamento (duplo clique no existente)
   ✅ Drag and drop para remarcar
   ✅ Cancelar agendamento
   ✅ Filtro por profissional
   ✅ Filtro por sala/recurso
   ✅ Busca por nome do paciente
   ✅ Detecção de conflitos (não permitir mesmo profissional em 2 lugares)
   ✅ Respeitar limite máximo por horário (configurável, padrão: 4)

6. Atualização Automática de Status:
   • Se horário passou E status=pending → mudar para no_show
   • Registrar quando started_at e completed_at

7. Campos do Agendamento:
   • date (timestamp) - Data e hora
   • patient_id (string) - ID do paciente
   • patient_name (string) - Nome (para cadastro expresso)
   • professional_id (string) - ID do fisioterapeuta
   • duration (number) - Duração em minutos (padrão: 60)
   • type (string) - 'individual' | 'group'
   • room (string) - Sala/recurso
   • status (string) - 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
   • value (number) - Valor (se particular)
   • notes (string) - Observações

REGRAS DE NEGÓCIO:
───────────────────────────────────────────────────────────────────────────────

1. Cadastro Expresso:
   - Permitir criar agendamento com apenas o nome do paciente
   - Criar registro em patients com is_complete: false
   - Mostrar aviso visual quando paciente tem is_complete: false

2. Detecção de Conflitos:
   - Não permitir agendar mesmo profissional em horário conflitante
   - Não ultrapassar limite máximo de pacientes por horário
   - Mostrar aviso visual quando houver conflito

3. Drag and Drop:
   - Permitir arrastar agendamento para novo horário
   - Verificar conflitos antes de mover
   - Atualizar date automaticamente

4. Status Automático:
   - Agendamento em andamento: Quando profissional clicar "Iniciar"
   - Agendamento realizado: Quando profissional clicar "Finalizar"
   - No-show: Se horário passou e status ainda=pending (background job)

5. Notificações (preparar para Fase 5):
   - Campo para configurar lembrete WhatsApp 24h antes
   - Não implementar ainda, apenas preparar estrutura

COMPONENTES NECESSÁRIOS:
───────────────────────────────────────────────────────────────────────────────

1. AppointmentGrid (componente principal)
   - Recebe: date, professionalIds, roomIds
   - Exibe: Grid com horários e agendamentos
   - Eventos: onAppointmentClick, onSlotClick, onDrop

2. AppointmentCard (card do agendamento)
   - Recebe: appointment
   - Exibe: Nome do paciente, horário, profissional, sala
   - Estilo: Cor baseada no status

3. AppointmentModal (modal de criação/edição)
   - Formulário com campos do agendamento
   - Validação de conflitos
   - Botão Salvar/Cancelar

4. AppointmentFilters (filtros)
   - Filtro por profissional
   - Filtro por sala
   - Busca por nome
   - View toggle (dia/semana/mês)

5. QuickActions (ações rápidas)
   - Confirmar
   - Iniciar
   - Finalizar
   - Cancelar
   - Remarcar

IMPLEMENTAÇÃO:
───────────────────────────────────────────────────────────────────────────────

Crie os seguintes arquivos:

1. /app/(dashboard)/agenda/page.tsx
   - Página principal da agenda
   - Grid de horários
   - Filtros e busca

2. /components/appointment/appointment-grid.tsx
   - Componente do grid
   - Usar: @schedule-x/react ou criar custom grid

3. /components/appointment/appointment-card.tsx
   - Card do agendamento
   - Drag and drop

4. /components/appointment/appointment-modal.tsx
   - Modal de criação/edição
   - Formulário com validação

5. /lib/actions/appointments.ts
   - Server Actions para CRUD de agendamentos
   - createAppointment(data)
   - updateAppointment(id, data)
   - deleteAppointment(id)
   - getAppointments(filters)

6. /lib/validators/appointment.ts
   - Validações com Zod
   - Validação de conflitos

Gere o código completo da agenda.
═══════════════════════════════════════════════════════════════════════════════
```

---

## 4. PROMPT FASE 2 - PACIENTES + EVOLUÇÃO SOAP

```
═══════════════════════════════════════════════════════════════════════════════
PROMPT FASE 2 - PACIENTES + EVOLUÇÃO SOAP (PRIORIDADE ALTA)
═══════════════════════════════════════════════════════════════════════════════

Implemente o módulo de PACIENTES e EVOLUÇÃO SOAP:

PARTE 1 - PACIENTES
───────────────────────────────────────────────────────────────────────────────

1. Lista de Pacientes:
   • Busca por nome
   • Filtros: Status, Convênio, Profissional
   • Paginação
   • Ordenação: Nome, Data cadastro, Última sessão
   • Indicador visual de cadastro incompleto

2. Cadastro Expresso:
   • Campo obrigatório: APENAS nome completo
   • Formatação automática: "maria silva" → "Maria Silva"
   - Criar paciente com is_complete: false

3. Cadastro Completo:
   • Nome completo (obrigatório)
   • CPF (opcional)
   • Data de nascimento (opcional)
   • Sexo (opcional)
   • Telefone (opcional)
   • Email (opcional)
   • Endereço (opcional)
   • Convênio (opcional)
   • Número da carteirinha (opcional)
   • Observações médicas (opcional)
   - Alergias (opcional)
   - Medicamentos em uso (opcional)

4. Perfil do Paciente:
   • Informações pessoais
   • Histórico de atendimentos
   • Evoluções (SOAP)
   • Prescrições de exercícios
   • Documentos anexos
   - Mapa da dor histórico

PARTE 2 - EVOLUÇÃO SOAP (PRIORIDADE ALTA)
───────────────────────────────────────────────────────────────────────────────

1. Método SOAP:
   • S - Subjetivo: Queixas do paciente
   • O - Objetivo: Observações do fisioterapeuta
   • A - Avaliação: Avaliação clínica
   • P - Plano: Plano de tratamento

2. Funcionalidades:
   ✅ Registro SOAP por sessão
   ✅ Templates pré-definidos (por patologia)
   ✅ Registro rápido (não pode atrasar atendimentos)
   ✅ Anexo de fotos e vídeos (Firebase Storage)
   ✅ Mapa da dor interativo
   ✅ Testes clínicos (ADM, ROM, força)
   ✅ Medição de dor (EVA 0-10)
   ✅ Assinatura digital
   ✅ Exportação em PDF
   ✅ Após assinar: IMUTÁVEL (não pode mais alterar)

3. Mapa da Dor:
   • SVG do corpo humano (frente/verso)
   • Clique para adicionar ponto de dor
   - Escala EVA 0-10
   • Tamanho do ponto proporcional à intensidade
   • Cores: 0-3 verde, 4-6 amarelo, 7-10 vermelho
   • Comparativo com sessões anteriores

4. Campos da Evolução:
   • date (timestamp) - Data e hora da sessão
   • patient_id (string) - ID do paciente
   • professional_id (string) - ID do fisioterapeuta
   • appointment_id (string) - ID do agendamento
   • soap.subjective (string) - Queixas do paciente
   • soap.objective (string) - Observações
   • soap.assessment (string) - Avaliação clínica
   • soap.plan (string) - Plano de tratamento
   • measurements (object) - Medições
   • pain_map (object) - Mapa da dor
   • exercises (array) - Exercícios realizados
   • signature_url (string) - URL da assinatura digital
   • is_signed (boolean) - Se assinado, não pode alterar
   • created_at, updated_at

5. Templates de SOAP:
   • Criar templates pré-definidos
   • Por patologia: "Lombalgia", "Cervicalgia", "Ombro", etc.
   • Campos pré-preenchidos
   - Editáveis antes de salvar

COMPONENTES NECESSÁRIOS:
───────────────────────────────────────────────────────────────────────────────

1. PatientList (lista de pacientes)
   - Busca e filtros
   - Paginação
   - Indicador de cadastro incompleto

2. PatientForm (formulário de paciente)
   - Cadastro expresso (apenas nome)
   - Cadastro completo
   - Validação com Zod

3. PatientDetail (perfil do paciente)
   - Abas: Info, Histórico, Evoluções, Exercícios, Documentos
   - Timeline de atendimentos

4. SOAPForm (formulário de evolução)
   - Campos S, O, A, P
   - Mapa da dor interativo
   - Medições
   - Templates
   - Auto-save a cada 30s

5. PainMap (mapa da dor)
   - SVG corpo humano
   - Clique para adicionar ponto
   - Slider EVA 0-10

6. SignatureCanvas (assinatura digital)
   - Canvas para desenho
   - Salvar como URL (Firebase Storage)
   - Após assinar: is_signed = true

IMPLEMENTAÇÃO:
───────────────────────────────────────────────────────────────────────────────

Crie os seguintes arquivos:

1. /app/(dashboard)/patients/page.tsx
   - Lista de pacientes
   - Busca e filtros

2. /app/(dashboard)/patients/[id]/page.tsx
   - Perfil do paciente
   - Abas com informações

3. /app/(dashboard)/evolutions/new/page.tsx
   - Nova evolução SOAP

4. /components/patients/patient-list.tsx
   - Lista com busca e filtros

5. /components/patients/patient-form.tsx
   - Formulário de paciente

6. /components/soap/soap-form.tsx
   - Formulário SOAP

7. /components/soap/pain-map.tsx
   - Mapa da dor interativo

8. /components/soap/signature-canvas.tsx
   - Assinatura digital

9. /lib/actions/patients.ts
   - Server Actions CRUD pacientes

10. /lib/actions/evolutions.ts
    - Server Actions CRUD evoluções

11. /lib/validators/patient.ts
    - Validações Zod

12. /lib/validators/evolution.ts
    - Validações Zod

Gere o código completo.
═══════════════════════════════════════════════════════════════════════════════
```

---

## 5. PROMPT FASE 3 - FLUTTER APP (1 APP, 2 ROLES)

```
═══════════════════════════════════════════════════════════════════════════════
PROMPT FASE 3 - FLUTTER APP (1 APP, ROLE-BASED ROUTING)
═══════════════════════════════════════════════════════════════════════════════

Crie o App Flutter iOS para FisioFlow com 1 app único e role-based routing:

CONCEITO:
• 1 app Flutter instalado no iOS
• Login único para todos os usuários
• Após login, verificar role no token Firebase
• Redirecionar para interface específica:
  - role='paciente' → Tela de Paciente
  - role='fisioterapeuta'/'admin'/'recepcionista' → Tela de Profissional

ARQUITETURA:
───────────────────────────────────────────────────────────────────────────────

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
     table_calendar: ^3.0.0

3. Estrutura de pastas:
   /lib
     /core
       /theme (cores, tipografia compartilhada com web)
       /constants
       /utils
     /features
       /auth
         /data
         /providers
         /screens
       /patient
         /home - Dashboard paciente
         /exercises - Exercícios prescritos
         /progress - Progresso e gamificação
         /pain-checkin - Check-in de dor
       /professional
         /agenda - Agenda do profissional
         /patients - Lista de pacientes
         /soap - Evolução SOAP rápida
         /profile - Perfil do profissional
     /shared
       /widgets
       /services
       /models

4. Role-Based Routing:
   // lib/core/router/router.dart
   - Após login, buscar custom claims do token
   - Redirecionar baseado em role:
     * patient → /patient/home
     * fisioterapeuta, admin, recepcionista, estagiario → /professional/agenda
   - Guard routes para validar acesso

PARTE 1 - AUTENTICAÇÃO
───────────────────────────────────────────────────────────────────────────────

1. Tela de Login:
   • Email/senha
   • Google Sign-In
   • Apple Sign-In
   • "Esqueci minha senha"

2. Flow após login:
   • Buscar custom claims do Firebase Auth token
   • Redirecionar para interface correta
   - Se role não existir, mostrar erro

3. Permissões:
   • role='patient' → Apenas features de paciente
   • role='fisioterapeuta' → Features profissionais + CRUD pacientes
   • role='admin' → Tudo
   • role='recepcionista' → Agenda + cadastros
   • role='estagiario' → Visualização apenas

PARTE 2 - APP PACIENTE
───────────────────────────────────────────────────────────────────────────────

1. HomeScreen (Paciente):
   • Header: "Olá, [Nome]" + avatar
   • Card "Próxima Consulta":
     - Data, horário, profissional
     - Botão "Confirmar presença"
   • Card "Plano de Hoje":
     - Exercícios do dia
     - CTA "Começar exercícios"
   • Card "Check-in de Dor":
     - Slider EVA 0-10
     - Botão "Registrar"

2. ExercisesScreen:
   • Lista de exercícios prescritos
   - Vídeo demonstrativo (video_player)
   - Contador de séries/repetições
   - Timer de descanso
   - RPE pós-exercício (1-10)
   - Botão "Não consegui" + motivo

3. PainCheckinScreen:
   • Mapa de dor simplificado (2D)
   - Slider EVA 0-10
   - Comentário opcional
   - Salvar no Firestore

4. ProgressScreen:
   • Gráfico de adesão (últimos 30 dias)
   - Evolução da dor (line chart)
   • Histórico de sessões
   - Pontos ganhos
   - Conquistas desbloqueadas
   - Nível atual

PARTE 3 - APP PROFISSIONAL
───────────────────────────────────────────────────────────────────────────────

1. AgendaScreen (Profissional):
   • Timeline do dia
   • Lista de agendamentos
   • Status badges (confirmado, pending, etc)
   • Ações rápidas: Confirmar, Iniciar, Finalizar, Cancelar
   • Filtros: sala, status
   • Navegação para dia anterior/próximo

2. PatientsScreen:
   • Lista de pacientes (busca por nome)
   - Card com foto, nome, último atendimento
   - Tap para ver detalhes

3. PatientDetailScreen:
   • Header: foto, nome, status
   • Abas:
     - Visão Geral: Info básicas
     - Evoluções: Lista de SOAP
     - Exercícios: Prescrições ativas
     - Métricas: Gráfico de dor

4. QuickSOAPScreen:
   • Formulário SOAP simplificado
   - Mapa de dor touch
   - Dictation (speech-to-text)
   - Templates frequentes
   - Botão "Salvar e voltar"

IMPLEMENTAÇÃO:
───────────────────────────────────────────────────────────────────────────────

Gere o código completo:

1. /lib/main.dart - Entry point
2. /lib/core/router/router.dart - Role-based routing
3. /lib/core/firebase/firebase_service.dart - Firebase setup
4. /lib/features/auth/screens/login_screen.dart - Login
5. /lib/features/patient/home/screens/home_screen.dart - Home paciente
6. /lib/features/patient/exercises/screens/exercises_screen.dart
7. /lib/features/professional/agenda/screens/agenda_screen.dart
8. /lib/features/professional/patients/screens/patients_screen.dart

Use go_router para navegação e flutter_riverpod para state management.

═══════════════════════════════════════════════════════════════════════════════
```

---

## 6. PROMPT FASE 4 - EXERCÍCIOS + GAMIFICAÇÃO

```
═══════════════════════════════════════════════════════════════════════════════
PROMPT FASE 4 - EXERCÍCIOS + GAMIFICAÇÃO
═══════════════════════════════════════════════════════════════════════════════

Implemente o módulo de EXERCÍCIOS e GAMIFICAÇÃO:

PARTE 1 - EXERCÍCIOS (WEB + FLUTTER)
───────────────────────────────────────────────────────────────────────────────

1. Biblioteca de Exercícios:
   • Lista com busca e filtros
   • Filtros: Grupo muscular, Objetivo, Nível
   • Vídeo demonstrativo (obrigatório)
   - Imagens
   • Instruções detalhadas
   • Níveis: beginner, intermediate, advanced
   • Contraindicações

2. Prescrição de Exercícios:
   • Selecionar exercícios da biblioteca
   • Configurar: séries, reps, duração
   • Frequência: "3x por semana"
   • Data início e fim
   • Observações
   - Enviar para paciente via app

3. Visualização do Paciente (App Flutter):
   • Lista de exercícios prescritos
   • Vídeo em loop
   • Contador de séries/repetições
   - Marcar como concluído
   • Feedback sobre o exercício

PARTE 2 - GAMIFICAÇÃO (APP FLUTTER PACIENTE)
───────────────────────────────────────────────────────────────────────────────

1. Sistema de Pontos:
   • +10 pontos por exercício completado
   • +50 pontos por sessão realizada
   • +20 pontos por check-in de dor
   • +5 pontos por dia consecutivo (streak)

2. Conquistas (Achievements):
   • "Primeiro passo" - Completar 1 exercício
   • "Dedicado" - 7 dias consecutivos
   • "Maratonista" - 30 dias consecutivos
   • "Atleta" - Completar 100 exercícios
   • "Recuperado" - Completar plano de tratamento

3. Desafios (Quests):
   • Desafio semanal: "Complete 20 exercícios esta semana"
   • Desafio mensal: "Não perder nenhuma sessão"
   • Recompensas: Pontos extras, badges

4. Níveis de Progresso:
   • Nível 1: 0-100 pontos
   • Nível 2: 101-300 pontos
   • Nível 3: 301-600 pontos
   • ... (progressão exponencial)

5. Leaderboard (OPCIONAL):
   • Ranking semanal
   • Apenas primeiro nome + iniciais
   • Paciente pode desativar (privacidade)

CAMPOS DA GAMIFICAÇÃO:
───────────────────────────────────────────────────────────────────────────────

gamification collection:
{
  id: string;
  organization_id: string;
  patient_id: string;
  points: number;
  level: number;
  streak: number;
  last_active_date: date;
  achievements: array; // [{ id, name, unlocked_at }]
  completed_exercises: array; // [{ exercise_id, completed_at }]
  attended_sessions: array; // [{ session_id, attended_at }]
  created_at: timestamp;
  updated_at: timestamp;
}

achievement definitions:
{
  id: string;
  name: string;
  description: string;
  icon: string;
  points_required: number;
  badge_image: string;
}

IMPLEMENTAÇÃO:
───────────────────────────────────────────────────────────────────────────────

WEB (Next.js):
1. /app/(dashboard)/exercises/page.tsx
   - Biblioteca de exercícios

2. /app/(dashboard)/exercises/new/page.tsx
   - Criar novo exercício

3. /app/(dashboard)/exercises/[id]/page.tsx
   - Detalhes do exercício

4. /components/exercises/exercise-form.tsx
   - Formulário de exercício

5. /components/exercises/prescription-modal.tsx
   - Modal de prescrição

FLUTTER:
1. /lib/features/patient/exercises/screens/exercises_list_screen.dart
   - Lista de exercícios prescritos

2. /lib/features/patient/exercises/screens/exercise_detail_screen.dart
   - Detalhes + execução

3. /lib/features/patient/gamification/screens/achievements_screen.dart
   - Conquistas desbloqueadas

4. /lib/features/patient/gamification/screens/leaderboard_screen.dart
   - Ranking (opcional)

CLOUD FUNCTIONS:
1. /functions/src/gamification/onExerciseComplete.ts
   - Adicionar pontos ao completar exercício
   - Verificar conquistas desbloqueadas
   - Atualizar nível

Gere o código completo.
═══════════════════════════════════════════════════════════════════════════════
```

---

## 7. PROMPT FASE 5 - WHATSAPP + FINANCEIRO

```
═══════════════════════════════════════════════════════════════════════════════
PROMPT FASE 5 - WHATSAPP + FINANCEIRO
═══════════════════════════════════════════════════════════════════════════════

Implemente o módulo de WHATSAPP e FINANCEIRO:

PARTE 1 - WHATSAPP (Cloud API)
───────────────────────────────────────────────────────────────────────────────

REGRAS IMPORTANTES:
✅ Usar APENAS WhatsApp (NUNCA SMS)
✅ Opt-in do paciente para receber mensagens
✅ Templates pré-aprovados Meta

1. Lembretes Automáticos:
   • 24h antes da consulta
   • Template: "Olá {nome}, confirmando consulta dia {data} às {hora}?"
   - Botões: [Sim] [Não] [Reagendar]

2. Confirmação de Consulta:
   • Paciente responde "Sim"
   • Atualizar status para confirmed
   • Se "Não": oferecer reagendar

3. Lista de Espera:
   • Quando consulta cancelada
   • Oferecer vaga para próxima pessoa na lista
   • Timeout de 2h para resposta

4. Mensagens:
   - Lembrete de exercícios
   - Feedback de sessão
   - Promocional (se opt-in)

PARTE 2 - FINANCEIRO
───────────────────────────────────────────────────────────────────────────────

1. Contas a Receber:
   • Lista de valores a receber
   • Por paciente
   • Filtros: Status, Data, Profissional
   - Marcar como pago

2. Contas a Pagar:
   • Despesas operacionais
   • Salários, comissões
   - Filtros: Categoria, Data, Status

3. Fluxo de Caixa:
   • Dashboard com entradas/saídas
   • Saldo atual
   - Previsão mês

4. Comissões:
   • Calcula comissão do profissional
   • % do valor da consulta
   - Relatório de comissões

5. Relatórios Financeiros:
   • Faturamento mensal
   • Por profissional
   - Por convênio x particular
   - Exportar PDF/Excel

CAMPOS DAS TRANSAÇÕES:
───────────────────────────────────────────────────────────────────────────────

transactions collection:
{
  id: string;
  organization_id: string;
  type: 'income' | 'expense';
  amount: number;
  date: timestamp;
  category: string;
  patient_id: string; // se income
  professional_id: string; // se comissão
  professional_commission: number; // valor da comissão
  payment_method: string;
  status: 'pending' | 'paid' | 'cancelled';
  notes: string;
  created_at: timestamp;
  updated_at: timestamp;
}

IMPLEMENTAÇÃO:
───────────────────────────────────────────────────────────────────────────────

WEB:
1. /app/(dashboard)/whatsapp/page.tsx
   - Configurações WhatsApp
   - Templates
   - Logs de envio

2. /app/(dashboard)/financeiro/page.tsx
   - Dashboard financeiro

3. /app/(dashboard)/financeiro/contas-a-receber/page.tsx
   - Contas a receber

4. /app/(dashboard)/financeiro/contas-a-pagar/page.tsx
   - Contas a pagar

5. /app/(dashboard)/financeiro/relatorios/page.tsx
   - Relatórios financeiros

CLOUD FUNCTIONS:
1. /functions/src/whatsapp/sendReminder.ts
   - Cloud Scheduler: 24h antes da consulta
   - Enviar template WhatsApp

2. /functions/src/whatsapp/webhook.ts
   - Receber respostas do WhatsApp
   - Atualizar status

3. /functions/src/financeiro/calculateCommission.ts
   - Calcular comissão profissional

Gere o código completo.
═══════════════════════════════════════════════════════════════════════════════
```

---

## 8. PROMPT FASE 6 - NEUROPOSE + RELATÓRIOS

```
═══════════════════════════════════════════════════════════════════════════════
PROMPT FASE 6 - NEUROPOSE (ANÁLISE DE IMAGENS) + RELATÓRIOS
═══════════════════════════════════════════════════════════════════════════════

Implemente o módulo de NEUROPOSE e RELATÓRIOS:

PARTE 1 - NEUROPOSE (ANÁLISE DE IMAGENS COM IA)
───────────────────────────────────────────────────────────────────────────────

1. Upload de Fotos/Vídeos:
   • Paciente faz upload via app
   • Armazenar no Firebase Storage

2. Análise com IA (MediaPipe/TensorFlow):
   • Detecção de landmarks (pontos anatômicos)
   • Análise de postura
   - Comparação antes/depois
   • Relatórios automáticos

3. Visualização:
   • Overlay de landmarks na imagem
   • Linhas de referência
   • Medições automáticas
   - Comparação lado a lado

4. Exportação:
   • Vídeo comparativo
   - Relatório PDF
   - Imagens para redes sociais

REGRAS:
• Privacidade: Imagens armazenadas com segurança
• Consentimento: Paciente autoriza uso
• IA: MediaPipe Pose para detecção

PARTE 2 - RELATÓRIOS E ANALYTICS
───────────────────────────────────────────────────────────────────────────────

1. Dashboard Principal:
   • Métricas em tempo real
   - Atendimentos hoje/semana/mês
   - Faturamento do mês
   • Ocupação (%)
   • No-show rate
   • Pacientes ativos

2. Relatórios:
   • Atendimentos (por período, profissional)
   • Pacientes ativos/inativos
   • Faturamento (mensal, por convênio)
   • Ocupação de profissionais
   • Aniversariantes do mês
   - Performance da equipe

3. Analytics com IA (Gemini):
   • Insights automáticos
   • Previsão de demanda
   • Gaps de horários
   • Recomendações

4. Heatmap de Ocupação:
   • Visualização da semana
   • Horários mais ocupados
   - Horários vazios (oportunidade)

IMPLEMENTAÇÃO:
───────────────────────────────────────────────────────────────────────────────

WEB:
1. /app/(dashboard)/relatorios/page.tsx
   - Dashboard principal

2. /app/(dashboard)/relatorios/atendimentos/page.tsx
   - Relatório de atendimentos

3. /app/(dashboard)/relatorios/faturamento/page.tsx
   - Relatório financeiro

4. /app/(dashboard)/neuropose/upload/page.tsx
   - Upload de imagens

5. /app/(dashboard)/neuropose/analyze/page.tsx
   - Análise com IA

FLUTTER:
1. /lib/features/patient/neuropose/screens/upload_screen.dart
   - Upload de foto/vídeo

2. /lib/features/patient/neuropose/screens/result_screen.dart
   - Resultado da análise

CLOUD FUNCTIONS:
1. /functions/src/neuropose/analyzeImage.ts
   - Cloud Function para analisar imagem
   - Usar MediaPipe/TensorFlow

2. /functions/src/analytics/generateInsights.ts
   - Gemini API para insights

Gere o código completo.
═══════════════════════════════════════════════════════════════════════════════
```

---

## CHECKLIST FINAL

### Fase 0 - Setup
- [ ] Next.js 15 + TypeScript + Tailwind
- [ ] Firebase Hosting configurado
- [ ] Firebase Auth (Email, Google, Apple)
- [ ] Firestore criado
- [ ] Security Rules configuradas
- [ ] Sidebar layout

### Fase 1 - Agenda (PRIORIDADE MÁXIMA)
- [ ] Grid de horários 07:00-21:00
- [ ] Cadastro expresso (apenas nome)
- [ ] Drag and drop
- [ ] Detecção de conflitos
- [ ] Status com código de cores
- [ ] Filtros profissional/sala

### Fase 2 - Pacientes + SOAP
- [ ] Lista pacientes busca/filtros
- [ ] Cadastro expresso/completo
- [ ] Formulário SOAP
- [ ] Mapa da dor interativo
- [ ] Assinatura digital
- [ ] Templates SOAP

### Fase 3 - Flutter App
- [ ] Setup Flutter + Firebase
- [ ] Login Email/Google/Apple
- [ ] Role-based routing
- [ ] App Paciente (home, exercícios, progresso)
- [ ] App Profissional (agenda, pacientes, SOAP)

### Fase 4 - Exercícios + Gamificação
- [ ] Biblioteca exercícios
- [ ] Prescrição de exercícios
- [ ] Sistema de pontos
- [ ] Conquistas/Achievements
- [ ] Desafios/Quests
- [ ] Leaderboard opcional

### Fase 5 - WhatsApp + Financeiro
- [ ] WhatsApp Cloud API
- [ ] Lembretes automáticos
- [ ] Contas a receber/pagar
- [ ] Fluxo de caixa
- [ ] Comissões

### Fase 6 - NeuroPose + Relatórios
- [ ] Upload imagens
- [ ] Análise MediaPipe
- [ ] Dashboard relatórios
- [ ] Analytics Gemini
- [ ] Heatmap ocupação

---

## PRÓXIMOS PASSOS

1. Copie o **PROMPT INICIAL** (Seção 2)
2. Cole no Firebase Studio AI
3. Valide a estrutura gerada
4. Continue com **FASE 1 - AGENDA** (PRIORIDADE MÁXIMA)
5. Siga sequencialmente as fases

Boa sorte! 🚀
