# Planejamento Completo de Implementação iOS - FisioFlow
## Apps: Paciente + Profissional com Firebase + Expo EAS Build

**Data**: 24 de Janeiro de 2026
**Status**: 🚀 EM ANDAMENTO
**Versão**: 1.0

---

## 📊 ANÁLISE DO ESTADO ATUAL

### ✅ JÁ IMPLEMENTADO

#### Web Application (Principal)
- React 18.3.1 + TypeScript + Vite
- Firebase Authentication (email/senha, Google OAuth)
- Supabase PostgreSQL com 50+ tabelas
- TanStack Query para data fetching
- shadcn/ui components
- 40+ Cloud Functions Firebase

#### Mobile Apps (Estrutura Básica)
- **App Paciente** (`apps/patient-ios/`)
  - Expo SDK 51 (atualizar para 54)
  - Expo Router (tabs navigation)
  - Estrutura de autenticação básica
  - Firebase configurado

- **App Profissional** (`apps/professional-ios/`)
  - Expo SDK 51 (atualizar para 54)
  - Expo Router (drawer navigation)
  - Estrutura básica de telas
  - Firebase configurado

#### Firebase Backend
- **Projeto**: `fisioflow-migration`
- **Services**:
  - Firebase Hosting configurado
  - Firestore com security rules
  - Cloud Functions (40+ endpoints)
  - Firebase Storage com signed URLs
  - Firebase Authentication

---

## 🎯 OBJETIVOS

### Objetivo Principal
Implementar **2 apps iOS nativos** completos usando **React Native + Expo**, com build via **EAS Build** (sem Mac), conectados ao **Firebase**.

### Apps a Implementar
1. **FisioFlow Pacientes** - App focado em execução de exercícios e aderência
2. **FisioFlow Profissionais** - App focado em produtividade e gestão clínica

---

## 📱 ESCOPO DO PROJETO

### App Paciente - MVP

#### Telas Principais
1. **Autenticação**
   - Login (Email/Senha, Google, Apple)
   - Registro
   - Recuperação de senha

2. **Home (Hoje)**
   - Plano de exercícios do dia
   - Check-in de dor (EVA)
   - Próxima sessão agendada
   - Streak de dias consecutivos

3. **Exercícios**
   - Lista de exercícios prescritos
   - Modo de execução (vídeo + contador)
   - Registro de RPE/dor pós-exercício
   - Feedback rápido

4. **Progresso**
   - Gráficos de evolução
   - Histórico de sessões
   - Estatísticas de aderência

5. **Perfil**
   - Dados pessoais
   - Configurações
   - Notificações

#### Funcionalidades Chave
- ✅ Push notifications (lembretes de exercícios)
- ✅ Sincronização offline
- ✅ Vídeos de exercícios
- ✅ Feedback visual (streak, conquistas)

---

### App Profissional - MVP

#### Telas Principais
1. **Autenticação**
   - Login (Email/Senha, Google)
   - Role-based access control

2. **Dashboard**
   - Agenda do dia
   - Pacientes do dia
   - Alertas (baixa aderência, dor elevada)
   - Métricas rápidas

3. **Agenda**
   - Visualização diária/semanal
   - Detalhes do atendimento
   - Quick actions (iniciar, prontuário)

4. **Pacientes**
   - Lista de pacientes
   - Busca e filtros
   - Perfil do paciente 360°

5. **Paciente 360**
   - Timeline (sessões, notas, evoluções)
   - Plano atual
   - Aderência e alertas
   - Prontuário rápido (SOAP)

6. **Exercícios**
   - Biblioteca de exercícios
   - Prescrição rápida
   - Templates

7. **Financeiro** (básico)
   - Resumo do mês
   - Pagamentos pendentes

#### Funcionalidades Chave
- ✅ Agenda em tempo real
- ✅ Notificações de emergência
- ✅ Sincronização offline
- ✅ Modo rápido de atendimento

---

## 🛠️ STACK TECNOLÓGICA

### Mobile
- **Framework**: React Native 0.76.x
- **Tooling**: Expo SDK 54
- **Linguagem**: TypeScript 5.3+
- **Navegação**: Expo Router v3 (File-based routing)

### Bibliotecas Principais
```json
{
  "expo": "~54.0.0",
  "expo-router": "~3.5.0",
  "expo-notifications": "~0.28.0",
  "expo-haptics": "~13.0.0",
  "firebase": "^11.0.0",
  "@tanstack/react-query": "^5.0.0",
  "zustand": "^4.4.0",
  "date-fns": "^3.0.0",
  "@phosphor-icons/react": "^2.0.0"
}
```

### Backend
- **Autenticação**: Firebase Auth
- **Database**: Firestore (real-time) + Cloud SQL (relacional)
- **Storage**: Firebase Storage
- **Functions**: Firebase Cloud Functions
- **Push**: Firebase Cloud Messaging

### Build & Deploy
- **Build iOS**: Expo EAS Build
- **Deploy**: Expo EAS Submit
- **CI/CD**: GitHub Actions

---

## 📋 ROADMAP DETALHADO

### FASE 1: Fundação e Setup (Semana 1-2)

#### 1.1 Atualização do Expo SDK
- [ ] Atualizar apps para Expo SDK 54
- [ ] Atualizar React Native para 0.76.x
- [ ] Atualizar dependências compatíveis
- [ ] Testar builds locais

#### 1.2 Configuração Firebase
- [ ] Criar Firebase App IDs para iOS
  - `com.fisioflow.patients`
  - `com.fisioflow.professionals`
- [ ] Baixar `GoogleService-Info.plist` para cada app
- [ ] Configurar Firebase Authentication providers
- [ ] Configurar Firestore security rules
- [ ] Configurar FCM para push notifications

#### 1.3 Estrutura de Monorepo
- [ ] Criar/organizar packages compartilhados:
  - `@fisioflow/shared-types` - TypeScript types
  - `@fisioflow/shared-api` - Firebase client
  - `@fisioflow/shared-utils` - Utilitários
  - `@fisioflow/shared-ui` - Componentes UI compartilhados
  - `@fisioflow/shared-constants` - Constantes

#### 1.4 Configuração EAS Build
- [ ] Configurar `eas.json` para ambos os apps
- [ ] Configurar build profiles (development, preview, production)
- [ ] Setup credenciais Apple Developer
- [ ] Configurar app.json com bundles IDs corretos
- [ ] Testar primeiro build

---

### FASE 2: App Paciente - MVP (Semana 3-5)

#### 2.1 Autenticação
- [ ] Tela de login
- [ ] Tela de registro
- [ ] Recuperação de senha
- [ ] Integração Firebase Auth
- [ ] Persistência de sessão

#### 2.2 Tela Home (Hoje)
- [ ] Header com saudação e streak
- [ ] Card de plano do dia
- [ ] Check-in de dor (EVA visual)
- [ ] Card de próxima sessão
- [ ] Lista de exercícios do dia

#### 2.3 Execução de Exercícios
- [ ] Tela de detalhes do exercício
- [ ] Player de vídeo
- [ ] Contador de repetições/séries
- [ ] Input de RPE e dor pós
- [ ] Botão "não consegui" com motivo

#### 2.4 Progresso
- [ ] Gráficos de aderência
- [ ] Timeline de evolução
- [ ] Estatísticas (streak, total sessões)

#### 2.5 Push Notifications
- [ ] Setup FCM
- [ ] Permissões de notificação
- [ ] Notificação de exercício do dia
- [ ] Lembretes de sessões

---

### FASE 3: App Profissional - MVP (Semana 6-9)

#### 3.1 Autenticação
- [ ] Tela de login com role validation
- [ ] Custom claims para RBAC
- [ ] Proteção de rotas por role

#### 3.2 Dashboard
- [ ] Agenda do dia (cards)
- [ ] Pacientes do dia
- [ ] Alertas e notificações
- [ ] Quick stats

#### 3.3 Agenda
- [ ] Visualização diária/semanal
- [ ] Lista de atendimentos
- [ ] Detalhes do atendimento
- [ ] Quick actions
- [ ] Real-time updates (Firestore listeners)

#### 3.4 Pacientes
- [ ] Lista com busca e filtros
- [ ] Card do paciente (resumo)
- [ ] Navegação para detalhes

#### 3.5 Paciente 360°
- [ ] Header com info básica
- [ ] Timeline de eventos
- [ ] Plano atual
- [ ] Métricas de aderência
- [ ] Alertas clínicos
- [ ] Prontuário rápido (SOAP)

#### 3.6 Prescrição
- [ ] Biblioteca de exercícios
- [ ] Builder de plano
- [ ] Templates
- [ ] Preview do plano

---

### FASE 4: Integração e Polimento (Semana 10-11)

#### 4.1 Sincronização Offline
- [ ] Implementar cache local
- [ ] Sync strategy
- [ ] Conflict resolution
- [ ] Indicadores de sync

#### 4.2 Performance
- [ ] Otimizar renders
- [ ] Lazy loading
- [ ] Memoization
- [ ] Bundle size optimization

#### 4.3 Testes
- [ ] Testes unitários (críticos)
- [ ] Testes E2E (fluxos principais)
- [ ] Testes de performance
- [ ] Testes de offline

#### 4.4 Analytics e Monitoramento
- [ ] Firebase Analytics
- [ ] Crash reporting (Sentry)
- [ ] Performance monitoring

---

### FASE 5: Build e Deploy (Semana 12)

#### 5.1 Preparação EAS Build
- [ ] Configurar assets (icon, splash)
- [ ] Configurar permissões iOS
- [ ] Revisar app.json
- [ ] Testar build development

#### 5.2 Build Production
- [ ] Gerar builds production
- [ ] Testar IPA em TestFlight
- [ ] Corrigir issues

#### 5.3 App Store Connect
- [ ] Criar apps no App Store Connect
- [ ] Configurar metadados
- [ ] Screenshots
- [ ] Descrição e keywords

#### 5.4 Submissão
- [ ] Submit via EAS
- [ ] Aguardar revisão Apple

---

## 🔐 SEGURANÇA

### Firebase Security Rules
```javascript
// Firestore Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Funções helper
    function isAuthenticated() {
      return request.auth != null;
    }

    function hasRole(role) {
      return isAuthenticated() &&
        request.auth.token.role == role;
    }

    function isOwner(userId) {
      return isAuthenticated() &&
        request.auth.uid == userId;
    }

    // Pacientes só acessam seus dados
    match /patients/{patientId} {
      allow read: if isOwner(patientId) || hasRole('physio');
      allow write: if hasRole('physio');
    }

    // Exercícios: público leitura, profissional escrita
    match /exercises/{exerciseId} {
      allow read: if isAuthenticated();
      allow write: if hasRole('physio') || hasRole('admin');
    }
  }
}
```

### Custom Claims (RBAC)
```javascript
// Roles
const ROLES = {
  PATIENT: 'patient',
  PHYSIO: 'physio',
  INTERN: 'intern',
  ADMIN: 'admin',
  TRAINER: 'trainer'
};

// Set custom claim via Admin SDK
await admin.auth().setCustomUserClaims(uid, {
  role: ROLES.PHYSIO,
  tenantId: 'clinic-123'
});
```

---

## 📊 ESTRUTURA DE DADOS FIRESTORE

### Collections Principais

```
/patients/{patientId}
  - id: string
  - userId: string (Firebase Auth UID)
  - name: string
  - email: string
  - phone: string?
  - dateOfBirth: timestamp
  - createdAt: timestamp
  - updatedAt: timestamp

/treatmentPlans/{planId}
  - patientId: string
  - physioId: string
  - startDate: timestamp
  - endDate: timestamp?
  - status: 'active' | 'completed' | 'paused'
  - exercises: array

/exercises/{exerciseId}
  - name: string
  - description: string
  - videoUrl: string
  - category: string
  - difficulty: 'easy' | 'medium' | 'hard'
  - createdAt: timestamp

/appointments/{appointmentId}
  - patientId: string
  - physioId: string
  - startTime: timestamp
  - endTime: timestamp
  - status: 'scheduled' | 'completed' | 'cancelled'
  - notes: string?

/progressRecords/{recordId}
  - patientId: string
  - exerciseId: string
  - date: timestamp
  - reps: number
  - rpe: number
  - pain: number
  - completed: boolean
```

---

## 🎨 DESIGN SYSTEM

### Tokens de Design

#### Cores
```typescript
// App Paciente
const patientColors = {
  primary: '#3B82F6',     // Blue 500
  secondary: '#10B981',   // Emerald 500
  accent: '#F59E0B',      // Amber 500
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  background: '#F9FAFB',
  surface: '#FFFFFF'
};

// App Profissional
const professionalColors = {
  primary: '#1E293B',     // Slate 800
  secondary: '#3B82F6',   // Blue 500
  accent: '#8B5CF6',      // Violet 500
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  background: '#F1F5F9',
  surface: '#FFFFFF'
};
```

#### Tipografia
```typescript
const typography = {
  fontFamily: 'Inter',
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30
  },
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700'
  }
};
```

#### Spacing
```typescript
const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48
};
```

---

## 🚀 IMPLEMENTAÇÃO

### Estrutura de Arquivos (App Paciente)

```
apps/patient-ios/
├── app/
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── forgot-password.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx           # Home/Hoje
│   │   ├── exercises.tsx       # Lista de exercícios
│   │   ├── progress.tsx        # Progresso
│   │   └── profile.tsx         # Perfil
│   ├── exercise/
│   │   └── [id].tsx            # Detalhes do exercício
│   ├── _layout.tsx
│   └── index.tsx
├── components/
│   ├── ui/                     # Componentes reutilizáveis
│   ├── exercise-card.tsx
│   ├── streak-badge.tsx
│   └── pain-slider.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useExercises.ts
│   └── useProgress.ts
├── lib/
│   ├── firebase.ts
│   └── types.ts
└── assets/
```

### Estrutura de Arquivos (App Profissional)

```
apps/professional-ios/
├── app/
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   └── login.tsx
│   ├── (drawer)/
│   │   ├── _layout.tsx
│   │   ├── dashboard.tsx
│   │   ├── calendar.tsx
│   │   ├── patients.tsx
│   │   ├── exercises.tsx
│   │   ├── financial.tsx
│   │   └── settings.tsx
│   ├── patient/
│   │   └── [id]/
│   │       └── index.tsx       # Paciente 360
│   ├── _layout.tsx
│   └── index.tsx
├── components/
│   ├── ui/
│   ├── patient-card.tsx
│   ├── appointment-card.tsx
│   └── stats-card.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── usePatients.ts
│   └── useAppointments.ts
├── lib/
│   ├── firebase.ts
│   └── types.ts
└── assets/
```

---

## 📦 PACOTES COMPARTILHADOS

### @fisioflow/shared-types
```typescript
// Tipos compartilhados entre web e mobile
export interface Patient {
  id: string;
  userId: string;
  name: string;
  email: string;
  // ...
}

export interface Exercise {
  id: string;
  name: string;
  videoUrl: string;
  // ...
}

export interface TreatmentPlan {
  id: string;
  patientId: string;
  exercises: PlanExercise[];
  // ...
}
```

### @fisioflow/shared-api
```typescript
// Cliente Firebase configurado
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  // Configuração compartilhada
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Hooks reutilizáveis
export function usePatientData(patientId: string) {
  // ...
}
```

### @fisioflow/shared-ui
```typescript
// Componentes UI compartilhados
export { Button } from './Button';
export { Card } from './Card';
export { Input } from './Input';
// ...
```

---

## 📝 MÉTRICAS DE SUCESSO

### App Paciente
- **Instalação**: 60% dos pacientes em 6 meses
- **Aderência**: >70% dos exercícios concluídos
- **Engajamento**: >40% DAU (Daily Active Users)
- **Retenção**: >60% após 30 dias

### App Profissional
- **Adoção**: 100% dos profissionais em 3 meses
- **Uso de agenda**: 80% dos agendamentos via app
- **Eficiência**: Tempo de prontuário < 2 minutos
- **Satisfação**: >4.5/5

---

## 💰 CUSTOS ESTIMADOS

### Infraestrutura Mensal
| Serviço | Custo |
|---------|-------|
| Firebase (Blaze) | $0-50/mês |
| Expo EAS Production | $29/mês |
| Apple Developer | $99/ano (~$8/mês) |
| **TOTAL** | **~$37-87/mês** |

### Desenvolvimento
| Fase | Duração | Custo |
|------|---------|-------|
| Fundação | 2 semanas | $3,000-5,000 |
| App Paciente MVP | 3 semanas | $8,000-12,000 |
| App Profissional MVP | 4 semanas | $10,000-15,000 |
| Integração | 2 semanas | $4,000-6,000 |
| Deploy | 1 semana | $2,000-3,000 |
| **TOTAL** | **12 semanas** | **$27,000-41,000** |

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### Setup Inicial
- [ ] Atualizar Expo SDK para 54
- [ ] Configurar Firebase Console
- [ ] Obter GoogleService-Info.plist
- [ ] Configurar EAS Build
- [ ] Setup credenciais Apple Developer

### App Paciente
- [ ] Autenticação completa
- [ ] Tela Home com plano do dia
- [ ] Execução de exercícios
- [ ] Tela de progresso
- [ ] Push notifications
- [ ] Offline sync

### App Profissional
- [ ] Autenticação com RBAC
- [ ] Dashboard
- [ ] Agenda completa
- [ ] Lista de pacientes
- [ ] Paciente 360°
- [ ] Prescrição de exercícios
- [ ] Real-time updates

### Deploy
- [ ] Build production EAS
- [ ] TestFlight testing
- [ ] App Store Connect setup
- [ ] Submit para revisão
- [ ] Lançamento

---

## 📚 REFERÊNCIAS

### Documentação Oficial
- [Expo SDK 54](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [Firebase iOS](https://firebase.google.com/docs/ios/setup)
- [Firestore](https://firebase.google.com/docs/firestore)
- [FCM](https://firebase.google.com/docs/cloud-messaging)

### Recursos Úteis
- [React Native 2026 Best Practices](https://www.jetlearn.com/blog/mobile-app-development-with-react-native-2026-expert-guide)
- [Expo Performance](https://expo.dev/blog/best-practices-for-reducing-lag-in-expo-apps)

---

**Status do Projeto**: 🚀 PRONTO PARA IMPLEMENTAÇÃO
**Próxima Ação**: Começar FASE 1 - Atualização do Expo SDK e configuração Firebase

---

**Documento criado por**: Claude AI
**Data de criação**: 24 de Janeiro de 2026
**Última atualização**: 24 de Janeiro de 2026
