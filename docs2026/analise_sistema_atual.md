# Análise do Sistema FisioFlow Atual

## Informações Gerais
- **URL Produção**: https://www.moocafisio.com.br/
- **Stack Tecnológico**: React 19.1.0 + TypeScript + Vite + Firebase
- **UI Framework**: shadcn/ui + Radix UI + Tailwind CSS
- **Gerenciador de Pacotes**: pnpm 9.15.0
- **Node Version**: 24.x

## Estrutura do Projeto

### Frontend
- **Framework**: React 19.1.0 com TypeScript
- **Build Tool**: Vite 5.4.19
- **Routing**: React Router DOM 6.30.1
- **State Management**: Zustand 4.5.5
- **Data Fetching**: TanStack Query 5.90.17
- **Forms**: React Hook Form 7.61.1 + Zod 3.25.76

### Backend/Database
- **Database**: Firestore (Firebase)
- **ORM**: Drizzle ORM 0.45.1
- **Auth**: Firebase Auth
- **Real-time**: Firestore listeners / Realtime
- **Storage**: Firebase Storage (+ Firestore/Pub/Sub para filas)

### Mobile (Preparado)
- **Framework**: Expo ~54.0.32
- **React Native**: 0.81.5
- **Navigation**: React Navigation 7.x
- **Styling**: NativeWind 4.2.1 (Tailwind para RN)
- **Capacitor**: @capacitor/core 8.0.1 (híbrido)

### Funcionalidades Especiais
- **IA/ML**: 
  - TensorFlow.js + MediaPipe para análise de movimento
  - OpenAI + Google Generative AI integrados
  - AI SDK (OpenAI/Google)
- **Automação**: Inngest 3.49.1 para background jobs
- **Análise de Imagens Médicas**: Cornerstone.js 4.15.5 (DICOM viewer)
- **PDF Generation**: jsPDF, React PDF Renderer
- **Monitoramento**: Sentry React 10.32.1
- **Analytics**: Firebase Analytics + Web Vitals

## Interface Atual (Observações da Tela de Agenda)

### Sidebar (Navegação Principal)
**NÚCLEO**
- Agenda ✓ (página atual)
- Dashboard
- Pacientes

**CLÍNICA**
- Prontuário
- Exercícios
- Protocolos

**GESTÃO**
- Comunicação
- Lista de Espera
- Tarefas

**MÓDULOS** (Expandíveis)
- Avaliações
- Cadastros
- CRM
- Operacionais
- Financeiro
- Relatórios
- Dashboard IA
- Administração
- Gamificação

**SISTEMA**
- Sair

### Página de Agenda (Visualização Atual)
- **Layout**: Calendário semanal (19-25 jan 2026)
- **Horários**: 07:00 - 20:00 (intervalos de 30 min)
- **Visualizações**: Dia / Semana / Mês
- **Funcionalidades**:
  - Botão "Novo Agendamento" (destaque azul)
  - Filtros
  - Configurações da Agenda
  - Modo de Seleção (atalho: A)
  - Navegação entre semanas/dias
  - Contador: "219 agendamentos"
  - Status lista de espera
  - Indicador de usuários online (1 online)
  - Busca rápida (⌘ K)

- **Design Visual**:
  - Slots de horário com botões "+" para adicionar agendamentos
  - Cards de agendamento com nome do paciente e horário
  - Cores diferenciadas para slots
  - Grid bem estruturado com linhas divisórias

### Observações de UX/UI
1. **Sidebar bem organizada** com hierarquia clara (Núcleo > Clínica > Gestão > Módulos)
2. **Agenda é a página principal** (primeira no menu, foco do sistema)
3. **Interface limpa e moderna** com uso de Radix UI + Tailwind
4. **Muitos módulos disponíveis** - sistema robusto e completo
5. **Preparado para mobile** com Expo e React Native já configurados
6. **Sistema profissional** com autenticação, perfis de usuário, notificações

## Dependências Relevantes para Mobile

### Já Instaladas
- `expo`: ~54.0.32
- `react-native`: 0.81.5
- `@react-navigation/native`: 7.1.28
- `@react-navigation/native-stack`: 7.10.1
- `@react-navigation/bottom-tabs`: 7.10.1
- `react-native-safe-area-context`: 5.6.2
- `react-native-screens`: ~4.16.0
- `react-native-gesture-handler`: ~2.28.0
- `expo-dev-client`: ~6.0.20
- `expo-splash-screen`: ~31.0.0
- `expo-status-bar`: ~3.0.0
- `nativewind`: 4.2.1

### Capacidades Mobile Preparadas
- Camera: `react-native-vision-camera` 4.7.3
- Biometria: `expo-local-authentication` ~17.0.0
- Haptics: `expo-haptics` ~15.0.0
- WebView: `react-native-webview` 13.15.0
- TensorFlow Lite: `react-native-fast-tflite` 2.0.0

## Scripts Expo Disponíveis
```json
"expo:start": "npx expo start",
"expo:android": "npx expo start --android",
"expo:ios": "npx expo start --ios",
"expo:web": "npx expo start --web",
"expo:build:dev": "eas build --profile development --platform ios",
"expo:build:preview": "eas build --profile preview --platform ios",
"expo:build:prod": "eas build --profile production --platform ios",
"expo:submit": "eas submit --platform ios"
```

## Infraestrutura Atual
- **Hosting**: Firebase Hosting
- **Database**: Firestore
- **Cloud Functions**: Firebase Functions
- **Cron Jobs**: Inngest para automações
- **Email**: SendGrid + Resend
- **Storage**: Firebase Storage

## Escala Atual
- **600 atendimentos/mês**
- **15 profissionais**
- **219 agendamentos** (visível na interface)

## Pontos Fortes Identificados
1. ✅ Stack moderna e escalável
2. ✅ Já possui estrutura Expo/React Native configurada
3. ✅ UI/UX profissional com shadcn/ui
4. ✅ Autenticação e segurança robustas (RLS)
5. ✅ Integração com IA (TensorFlow, OpenAI, Google AI)
6. ✅ Sistema de análise de movimento (MediaPipe)
7. ✅ Infraestrutura cloud preparada (100% Firebase + GCP)
8. ✅ Monitoramento e analytics configurados

## Áreas de Atenção
1. ⚠️ Muitos módulos - pode ser complexo para usuários iniciantes
2. ⚠️ Mobile ainda não está em produção (apenas preparado)
3. ⚠️ Necessita separação clara entre app paciente e profissional
4. ⚠️ React Native 0.81.5 está desatualizado (atual é 0.76.x)
5. ⚠️ Expo 54 é recente, mas precisa validar compatibilidade
