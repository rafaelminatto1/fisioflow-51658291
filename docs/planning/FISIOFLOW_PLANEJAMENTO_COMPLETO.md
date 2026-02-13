# 📱 FisioFlow - Planejamento Completo para Aplicativos iOS

## 📊 Relatório Executivo

**Data:** 22 de Janeiro de 2026
**Projeto:** FisioFlow - Plataforma de Fisioterapia Digital
**Responsável:** Rafael Minatto
**Versão:** 1.0

---

## 🎯 Sumário Executivo

Este documento apresenta uma análise minuciosa e planejamento estratégico para transformar o sistema web FisioFlow em aplicativos nativos iOS, focando em duas frentes: **app para pacientes** e **app para profissionais de saúde**.

### Contexto Atual
- **Volume de atendimentos:** ~600/mês
- **Profissionais ativos:** 15
- **Plataforma atual:** Web (Vite + React), **em migração de Supabase/Vercel para Google Cloud/Firebase.**
- **Stack tecnológico:** Moderno e escalável

### Objetivos Principais
1. Criar aplicativos nativos iOS para melhor experiência mobile
2. Separar experiência entre pacientes e profissionais
3. Aumentar engajamento e retenção de usuários
4. Escalar o negócio com qualidade premium

---

## 🏗️ ANÁLISE DA ESTRUTURA ATUAL

### Stack Tecnológico Identificado

#### Frontend
- **Framework:** React 18.3.1
- **Build Tool:** Vite 6.0.11
- **Routing:** React Router DOM v7
- **UI Library:** Radix UI (shadcn/ui)
- **Styling:** Tailwind CSS 4.x
- **State Management:** React Context + Hooks
- **Forms:** React Hook Form + Zod validation
- **Language:** TypeScript

#### Backend/Infraestrutura Google Cloud ⭐
- **BaaS:** Firebase (Auth, Storage, Functions, Analytics)
- **Hosting:** Firebase Hosting (CDN global + Edge caching)
- **Database:** Cloud SQL for PostgreSQL com Firebase Data Connect
- **Auth:** Firebase Authentication (Email, Google, Apple, Phone)
- **Email:** Firebase Email Sender (Cloud Functions)
- **Push Notifications:** Firebase Cloud Messaging (FCM)
- **Realtime:** Firebase Realtime Database / Firestore

#### Integrações Existentes
- Google OAuth
- Sistema de reservas
- Gestão de profissionais
- Gestão de pacientes
- Planos de tratamento

### Pontos Fortes Atuais
✅ Arquitetura moderna e escalável
✅ Separação clara de responsabilidades
✅ Componentização bem estruturada
✅ Integração com Firebase (excelente para mobile iOS/Android)
✅ TypeScript para type safety
✅ Firebase Data Connect + Cloud SQL (PostgreSQL completo)
✅ Hosting com CDN global do Firebase

### Pontos de Melhoria Identificados
⚠️ Falta de componentes mobile-optimized
⚠️ Ausência de skeleton loaders
⚠️ Sistema de notificações push não implementado (FCM disponível)
⚠️ Falta de integração com Apple HealthKit
⚠️ Ausência de dark mode system
⚠️ Limitada experiência offline-first
⚠️ Cloud Functions não otimizadas para edge

---

## 🔥 ARQUITETURA GOOGLE CLOUD + FIREBASE

### Por que Firebase + Google Cloud? ⭐

#### Vantagens do Ecossistema Firebase
✅ **Suporte nativo iOS/Android** - SDKs otimizados para mobile
✅ **Firebase Cloud Messaging (FCM)** - Melhor sistema de push notifications
✅ **Firebase Auth** - Autenticação com providers nativos (Google, Apple)
✅ **Firebase Analytics** - Analytics gratuito e ilimitado
✅ **Firebase Storage** - CDN automático para mídia
✅ **Cloud Functions** - Backend serverless escalável
✅ **Firebase Data Connect + Cloud SQL** - PostgreSQL completo com ORM
✅ **Firebase Hosting** - CDN global com edge caching
✅ **Crashlytics** - Crash reporting automático
✅ **Performance Monitoring** - Monitoramento de performance em tempo real
✅ **Remote Config** - Configurações remotas sem atualizar app
✅ **A/B Testing** - Testes A/B integrados

#### Firebase Data Connect + Cloud SQL (ESCOLHIDO ✅)

Esta é a grande inovação do Firebase para 2025:

```typescript
// Firebase Data Connect - TypeScript-first ORM
// Gera SDKs tipados automaticamente

// Exemplo de query
const getPatientPlans = await DataConnect.query(`
  query GetPatientPlans($patientId: UUID!) {
    plans(where: { patient_id: { eq: $patientId } }) {
      id
      name
      exercises {
        id
        name
        video_url
      }
    }
  }
`, { patientId: 'xxx' });
```

**Benefícios:**
- ✅ **Economia de R$ 150-250/mês** comparado com Supabase Pro
- ✅ **PostgreSQL completo** - não perde recursos
- ✅ **Ecossistema Google completo** - integrado com GCP
- ✅ **Escalabilidade garantida** - auto-scaling automático
- ✅ **SDK tipado gerado automaticamente** - TypeScript end-to-end
- ✅ **Data Connect ORM** - queries type-safe
- ✅ **Integração nativa com Firebase Auth**
- ✅ **Firebase Console unificado** - tudo em um lugar

#### Firebase Hosting vs Vercel

| Feature | Firebase Hosting | Vercel |
|---------|------------------|---------|
| **Custo** | Free tier generoso | US$ 20/mês (Pro) |
| **CDN** | Cloud CDN (200+ locations) | Edge Network (100+ locations) |
| **Preview Deployments** | Sim | ✅ Sim |
| **Edge Functions** | Cloud Functions (2nd gen) | ✅ Edge Runtime |
| **Analytics** | Integrado | Precisa integrar |
| **Integração Mobile** | Nativa | Não otimizado |
| **CI/CD** | Firebase CLI | GitHub integration |
| **Custom Domains** | Grátis e ilimitado | Limitado no free |

**Vencedor:** Firebase Hosting (melhor integração mobile, mais barato)

---

## 📱 ARQUITETURA RECOMENDADA: Apps Separados

### ✅ RECOMENDAÇÃO: DOIS APPS SEPARADOS

Após análise detalhada, **recomendo fortemente** criar dois aplicativos separados:

### App FisioFlow Paciente
- **Foco:** Simplicidade, engajamento, adesão ao tratamento
- **Público:** Pacientes em tratamento fisioterapêutico
- **Tom:** Amigável, motivador, acessível

### App FisioFlow Pro
- **Foco:** Produtividade, gestão, eficiência clínica
- **Público:** Fisioterapeutas, estagiários, educadores físicos, admin
- **Tom:** Profissional, eficiente, data-driven

### Justificativa para Apps Separados

#### 1. **Experiência de Usuário Otimizada**
- Cada app tem UX/UI específica para seu público
- Interfaces simplificadas para pacientes
- Ferramentas avançadas para profissionais
- Redução de cognitive load

#### 2. **Segurança e Compliance**
- Separação clara de dados sensíveis
- Role-based access control por app
- Compliance mais fácil com LGPD
- Auditoria simplificada

#### 3. **Manutenção e Evolução**
- Releases independentes
- Features específicas por público
- Testes mais focados
- Roadmap separado

#### 4. **Monetização**
- Modelos de pricing diferentes
- App profissional: B2B (assinatura por profissional)
- App paciente: B2C (gratuito com clinica ou Freemium)

#### 5. **App Store Optimization**
- Palavras-chave específicas
- Screenshots direcionadas
- Reviews segmentadas
- Rankings em categorias diferentes

---

## 🛠️ TECNOLOGIA DEFINIDA

### React Native + Expo (ESCOLHIDO ✅)

### Por que React Native + Expo?

#### Vantagens
✅ **Código compartilhado** com web (~70-80%)
✅ **Desenvolvimento rápido** - hot reload, tooling excelente
✅ **Sem necessidade de Mac** - EAS Build compila na nuvem
✅ **Base de talentos** - React developers adaptam facilmente
✅ **Ecosistema maduro** - bibliotecas para tudo
✅ **Firebase SDK nativo** - integração perfeita com iOS/Android
✅ **Updates over-the-air** - EAS Update para correções rápidas
✅ **Cost-effective** - menor custo de desenvolvimento
✅ **Expo + Firebase = Perfeição** - suporte oficial otimizado

#### Integração Firebase + React Native

```typescript
// Integração nativa e simplificada
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, getToken } from 'firebase/messaging';
import { getStorage } from 'firebase/storage';
import { getPerformance } from 'firebase/performance';
import { getAnalytics } from 'firebase/analytics';

// Configuração única para web, iOS e Android
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const messaging = getMessaging(app);
const storage = getStorage(app);
const performance = getPerformance(app);
const analytics = getAnalytics(app);
```

#### Motivos da Decisão
- A equipe já possui expertise em React/JavaScript
- Possibilidade de lançar o MVP rapidamente
- Facilidade de expansão para Android no futuro
- Otimização de custos de desenvolvimento e manutenção
- **Firebase tem suporte oficial React Native** - SDKs otimizados
- **Expo tem plugins Firebase** - config automática
- **Mesmo código backend para web, iOS e Android**

#### Desvantagens Mitigadas
⚠️ Performance ligeiramente inferior a nativo: Imperceptível para o caso de uso do FisioFlow (gestão e mídia).
⚠️ Dependência de terceiros: O ecossistema Expo + Firebase é robusto e mantido ativamente por Google.

---

## 💰 ANÁLISE DE CUSTOS

### Custos de Desenvolvimento (Estimativas 2025)

#### React Native + Expo
- **App Paciente (MVP):** R$ 40.000 - R$ 80.000
- **App Profissional (MVP):** R$ 60.000 - R$ 120.000
- **Total (Ambos):** R$ 100.000 - R$ 200.000
- **Timeline:** 3-6 meses cada app

### Custos Recorrentes Mensais

#### Apple Developer Program
- **Conta Apple Developer:** US$ 99/ano (~R$ 500/ano)

#### Firebase (Google Cloud)
- **Firebase Blaze Plan (Pay-as-you-go):**
  - **Auth:** 10.000 verificações/mês grátis
  - **Cloud Firestore:** 50K reads, 20K writes/day grátis
  - **Storage:** 5GB grátis
  - **Hosting:** 10GB/month grátis
  - **Cloud Functions:** 2M invocações/mês grátis
  - **FCM (Push Notifications):** Ilimitado e grátis
  - **Analytics:** Ilimitado e grátis
  - **Crashlytics:** Ilimitado e grátis
  - **Performance Monitoring:** Ilimitado e grátis
  - **Remote Config:** Ilimitado e grátis

- **Cloud SQL for PostgreSQL:**
  - **db-f1-micro (1 vCPU, 614MB RAM):** ~US$ 15/mês (~R$ 75/mês)
  - **Armazenamento:** US$ 0.10/GB/mês
  - **Backup automático:** US$ 0.08/GB/mês

#### Outros Serviços
- **EAS Build (Free tier):** 15 builds/mês (suficiente para começar)
- **EAS Build (Paid):** US$ 99/mês se precisar mais builds
- **RevenueCat (Free tier):** até R$ 50k/mês em receita

#### Estimativa Total Mensal
- **Fase inicial (Firebase free):** ~R$ 50/mês
- **Fase crescimento (Cloud SQL + extras):** ~R$ 200-300/mês
- **Escala completa:** ~R$ 500-800/mês

**Economia vs Supabase Pro:** R$ 150-250/mês

---

## 🎯 ROADMAP DE DESENVOLVIMENTO

### FASE 1: Preparação (Mês 1)

#### Semana 1-2: Setup e Planejamento
- [ ] Criar conta Apple Developer
- [ ] Configurar App Store Connect
- [ ] Definir feature set final
- [ ] Criar design system completo
- [ ] Setup projeto React Native (Expo)
- [ ] Configurar EAS Build

#### Semana 3-4: Arquitetura e Integrações
- [ ] Implementar navegação (React Navigation)
- [ ] Integrar Firebase no mobile (Auth, Firestore, FCM)
- [ ] Setup autenticação com Firebase Auth
- [ ] Configurar Firebase Cloud Messaging
- [ ] Configurar theme system (dark mode)
- [ ] Implementar state management global (Zustand ou Context)
- [ ] Setup Firebase Data Connect
- [ ] Configurar Firebase Analytics

### FASE 2: App Paciente - MVP (Meses 2-4)

#### Módulo de Autenticação
- [ ] Login com email/senha
- [ ] Login social (Google, Apple)
- [ ] Recuperação de senha
- [ ] Biometric authentication (Face ID)
- [ ] Onboarding otimizado

#### Módulo de Planos de Exercícios
- [ ] Listagem de planos ativos
- [ ] Visualização de exercícios
- [ ] Vídeos demonstrativos
- [ ] Contador de séries/reps
- [ ] Timer de descanso
- [ ] Marcar exercício como concluído

#### Módulo de Progresso
- [ ] Dashboard simplificado
- [ ] Gráficos de evolução
- [ ] Histórico de sessões
- [ ] Comparativo antes/depois
- [ ] Conquistas e badges

#### Módulo de Engajamento
- [ ] Sistema de notificações push
- [ ] Lembretes de exercícios
- [ ] Gamificação básica
- [ ] Streaks (dias consecutivos)
- [ ] Pontos e níveis

#### Módulo de Comunicação
- [ ] Chat com profissional
- [ ] Envio de fotos/vídeos
- [ ] Feedback sobre exercícios
- [ ] Agendamento de sessões

### FASE 3: App Profissional - MVP (Meses 5-7)

#### Módulo de Gestão de Pacientes
- [ ] Lista de pacientes
- [ ] Filtros e busca avançada
- [ ] Perfil completo do paciente
- [ ] Histórico de tratamentos
- [ ] Anotações clínicas

#### Módulo de Criação de Planos
- [ ] Biblioteca de exercícios
- [ ] Editor de planos drag-and-drop
- [ ] Upload de vídeos/fotos
- [ ] Personalização de séries/reps
- [ ] Templates de planos
- [ ] Compartilhamento de planos

#### Módulo de Acompanhamento
- [ ] Dashboard de pacientes
- [ ] Progresso individual
- [ ] Alertas de não-adesão
- [ ] Estatísticas de engajamento
- [ ] Reports exportáveis

#### Módulo de Comunicação
- [ ] Chat com pacientes
- [ ] Broadcast messages
- [ ] Feedback visual/audio
- [ ] Teleconsulta (futuro)

#### Módulo Administrativo
- [ ] Gestão da agenda
- [ ] Controle de pagamentos
- [ ] Relatórios financeiros
- [ ] Configurações da clínica

### FASE 4: Integrações Avançadas (Meses 8-10)

#### Apple HealthKit
- [ ] Sincronização de atividades
- [ ] Leitura de passos, distância
- [ ] Escrita de dados no Health
- [ ] Workouts customizados

#### Apple Watch (Opcional)
- [ ] App companion para Watch
- [ ] Notificações no pulso
- [ ] Métricas em tempo real
- [ ] Quick actions

#### Computer Vision AI
- [ ] Detecção de postura em tempo real
- [ ] Contagem automática de repetições
- [ ] Correção de forma via câmera
- [ ] Feedback visual

### FASE 5: Polimento e Lançamento (Meses 11-12)

#### Testes e QA
- [ ] Testes unitários
- [ ] Testes E2E
- [ ] Testes com usuários reais
- [ ] Beta testing (TestFlight)
- [ ] Bug fixes

#### App Store
- [ ] Assets e screenshots
- [ ] Descrição e keywords
- [ ] Política de privacidade
- [ ] Submissão e aprovação

#### Marketing
- [ ] Landing page específica
- [ ] Tutorial em vídeo
- [ ] Email marketing
- [ ] Materiais para clínicas parceiras

---

## 🔥 FIREBASE DATA CONNECT: O FUTURO DO BACKEND

### O que é Firebase Data Connect?

Firebase Data Connect é a nova solução da Google (lançada em 2024/2025) que combina:
- ✅ **PostgreSQL completo** via Cloud SQL
- ✅ **ORM type-safe** gerado automaticamente
- ✅ **GraphQL como linguagem de query**
- ✅ **Integração nativa com Firebase Auth**
- ✅ **SDKs gerados automaticamente** (TypeScript, Go, etc.)
- ✅ **Streaming e subscriptions** em tempo real

### Exemplo de Uso

#### Schema (GraphQL)
```graphql
# dataconnect/schema/patients.graphql

type Patient @table {
  id: UUID! @default(uuid_generate_v4())
  email: String! @unique
  name: String!
  phone: String?
  birth_date: Date
  created_at: Timestamp! @default(now())
  updated_at: Timestamp! @default(now())

  # Relations
  plans: [Plan!]! @relation(key: "patient_id")
  appointments: [Appointment!]! @relation(key: "patient_id")
}

type Plan @table {
  id: UUID! @default(uuid_generate_v4())
  patient_id: UUID!
  professional_id: UUID!
  name: String!
  description: String?
  start_date: Date!
  end_date: Date?
  status: PlanStatus! @default(ACTIVE)
  created_at: Timestamp! @default(now())

  # Relations
  patient: Patient! @relation(key: "patient_id")
  professional: Professional! @relation(key: "professional_id")
  exercises: [PlanExercise!]! @relation(key: "plan_id")
}

enum PlanStatus {
  ACTIVE
  COMPLETED
  CANCELLED
  PAUSED
}
```

#### Query (TypeScript gerado automaticamente)
```typescript
// queries/getPatientPlans.ts
import { DataConnect } from '@firebase/data-connect';

const dataConnect = new DataConnect({
  projectId: 'fisioflow-prod',
  location: 'us-east4',
  serviceId: 'fisioflow-backend',
});

export const getPatientPlans = async (patientId: string) => {
  const result = await dataConnect.query(`
    query GetPatientPlans($patientId: UUID!) {
      patient(where: { id: { eq: $patientId } }) {
        id
        name
        email
        plans(where: { status: { eq: ACTIVE } }) {
          id
          name
          description
          startDate
          endDate
          professional {
            id
            name
            email
            avatarUrl
          }
          exercises {
            id
            name
            sets
            reps
            duration
            exercise {
              id
              name
              videoUrl
              thumbnailUrl
              instructions
            }
          }
        }
      }
    }
  `, { patientId });

  return result.patient;
};

// TypeScript autocompleta tudo! 🎉
const plans = await getPatientPlans('patient-id');
plans[0].professional.name; // ✅ Type-safe!
plans[0].exercises[0].sets; // ✅ Type-safe!
```

#### Mutation
```typescript
// mutations/createPlan.ts
export const createPlan = async (input: {
  patientId: string;
  professionalId: string;
  name: string;
  exerciseIds: string[];
}) => {
  const result = await dataConnect.mutation(`
    mutation CreatePlan($input: CreatePlanInput!) {
      createPlan(input: $input) {
        id
        name
        status
        createdAt
      }
    }
  `, { input });

  return result.createPlan;
};
```

### Vantagens vs Firestore vs Supabase

| Feature | Firebase Data Connect | Firestore | Supabase |
|---------|----------------------|-----------|----------|
| **Database** | PostgreSQL (Cloud SQL) | NoSQL (Firebase) | PostgreSQL |
| **Type Safety** | ✅ Total (gerado) | ⚠️ Manual | ⚠️ Manual |
| **ORM** | ✅ Integrado | ❌ Não tem | ✅ Prisma |
| **Relations** | ✅ Nativo | ⚠️ Manual | ✅ Nativo |
| **Migrations** | ✅ CLI | ❌ Não tem | ✅ CLI |
| **Queries** | ✅ GraphQL | ✅ SDK | ⚠️ Builder |
| **Streaming** | ✅ Nativo | ✅ Nativo | ✅ Nativo |
| **Custo** | 💰💰 | 💰💰💰 | 💰💰💰 |
| **Scalability** | ✅ Auto | ✅ Auto | ✅ Auto |

### Configuração Firebase Data Connect

#### 1. Instalar CLI
```bash
npm install -g firebase-tools
firebase login
```

#### 2. Inicializar Data Connect
```bash
firebase init dataconnect
```

#### 3. Estrutura de diretórios
```
dataconnect/
├── connector/
│   ├── connector.yaml      # Config do serviço
│   └── schemas/            # Schemas GraphQL
├── tests/                  # Testes
└── generated/              # SDKs gerados (não commitar)
```

#### 4. connector.yaml
```yaml
connector:
  source: "./connector"
  location: us-east4
  schemaSerialization: defer
  generate:
    javascript:
      package: "@fisioflow/dataconnect"
      outDir: "./generated/javascript"
```

#### 5. Deploy
```bash
# Deploy schema
firebase deploy --only dataconnect:schema

# Deploy service
firebase deploy --only dataconnect:connector

# Deploy tudo
firebase deploy
```

### Integração com Cloud Functions

```typescript
// functions/src/triggers/onPlanCreated.ts
import * as functions from "firebase-functions/v1";
import { DataConnect } from '@firebase/data-connect';

export const onPlanCreated = functions.firestore
  .document('plans/{planId}')
  .onCreate(async (snap, context) => {
    const plan = snap.data();

    // Enviar notificação para paciente
    await admin.messaging().send({
      token: plan.patient.fcmToken,
      notification: {
        title: 'Novo plano disponível!',
        body: `Seu profissional ${plan.professional.name} criou um novo plano para você.`,
      },
      data: {
        planId: plan.id,
        type: 'NEW_PLAN',
      },
    });

    // Log no BigQuery para analytics
    await bigquery
      .dataset('fisioflow')
      .table('plan_events')
      .insert({
        event: 'plan_created',
        planId: plan.id,
        professionalId: plan.professionalId,
        patientId: plan.patientId,
        timestamp: new Date(),
      });
  });
```

### Custos Cloud SQL

| Tamanho | vCPU | RAM | Custo Mensal |
|---------|------|-----|-------------|
| db-f1-micro | 1 | 0.6 GB | ~US$ 15 (R$ 75) |
| db-g1-small | 1 | 1.7 GB | ~US$ 35 (R$ 175) |
| db-g1-medium | 2 | 3.75 GB | ~US$ 70 (R$ 350) |
| db-g1-large | 4 | 7.5 GB | ~US$ 140 (R$ 700) |

**Recomendação inicial:** db-f1-micro ou db-g1-small

---

## 🎨 DESIGN SYSTEM E UX/UI

### Princípios de Design

#### Para App Paciente
- **Simplicidade:** Mínimo de toques para completar ações
- **Motivação:** Feedback positivo constante
- **Clareza:** Tipografia grande e legível
- **Cores:** Tons quentes e energizantes (verde, azul)
- **Animações:** Suaves e celebratórias

#### Para App Profissional
- **Eficiência:** Informação densa mas organizada
- **Precisão:** Data visualization clara
- **Profissionalismo:** Tons sóbrios (azul marinho, cinza)
- **Velocidade:** Actions rápidas e acessíveis

### Componentes UI Essenciais

#### 1. Skeleton Loaders
```typescript
// Implementação recomendada: react-native-skeleton-loading
import Skeleton from 'react-native-skeleton-loading';

<Skeleton
  isLoading={true}
  layout={[
    { key: 'header', width: '80%', height: 40, marginBottom: 10 },
    { key: 'text', width: '100%', height: 20 },
  ]}
/>
```

#### 2. Bottom Sheets
```typescript
// Para ações contextuais e formulários
import { BottomSheetModal } from '@gorhom/bottom-sheet';
```

#### 3. Toast Notifications
```typescript
// Feedback de ações
import Toast from 'react-native-toast-message';
```

#### 4. Pull to Refresh
```typescript
// Para atualização de conteúdo
import { RefreshControl } from 'react-native';
```

### Dark Mode System

```typescript
// Implementação recomendada
import { useColorScheme } from 'react-native';

const themes = {
  light: {
    primary: '#10B981',
    background: '#FFFFFF',
    text: '#1F2937',
  },
  dark: {
    primary: '#34D399',
    background: '#111827',
    text: '#F9FAFB',
  },
};
```

---

## 📱 FIREBASE CLOUD MESSAGING (PUSH NOTIFICATIONS)

### Por que FCM?

Firebase Cloud Messaging (FCM) é o melhor sistema de push notifications para mobile:

✅ **Gratuito e ilimitado** - sem custos por mensagem
✅ **Suporte nativo iOS** - APNs integration automática
✅ **Routing inteligente** - delivery garantido
✅ **Analytics integrado** - métricas de open rate
✅ **Segmentação avançada** - topics e conditional sends
✅ **Messaging console** - GUI para enviar notificações
✅ **Local notifications** - suporte a notificações locais
✅ **Rich notifications** - imagens, actions, custom sounds

### Implementação FCM no React Native

#### 1. Configurar projeto Firebase
```bash
# No Firebase Console:
# 1. Project Settings > Cloud Messaging
# 2. Configurar APNs (iOS) - precisa de certificado Apple
# 3. Copiar Server Key e Sender ID
```

#### 2. Setup no app
```typescript
// firebase/messaging.ts
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { messaging } from './firebase';
import { Platform } from 'react-native';
import { requestPermission } from './permissions';

export const setupFCM = async () => {
  // Request permission (iOS)
  if (Platform.OS === 'ios') {
    await requestPermission();
  }

  // Get FCM token
  const token = await getToken(messaging, {
    vapidKey: process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY,
  });

  console.log('FCM Token:', token);

  // Save token to Firestore/Database
  await saveFCMToken(token);

  return token;
};

// Listen to messages in foreground
export const onForegroundMessage = () => {
  onMessage(messaging, (payload) => {
    console.log('Message received:', payload);

    // Show in-app notification
    showLocalNotification({
      title: payload.notification?.title,
      body: payload.notification?.body,
      data: payload.data,
    });
  });
};

// Save token to user document
const saveFCMToken = async (token: string) => {
  const { uid } = await getCurrentUser();

  await updateDoc(doc(db, 'users', uid), {
    fcmTokens: arrayUnion(token),
    lastLoginAt: new Date(),
  });
};
```

#### 3. Notificações locais (Expo)
```typescript
// notifications.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const showLocalNotification = async ({
  title,
  body,
  data,
}: {
  title: string;
  body: string;
  data?: any;
}) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: null, // Show immediately
  });
};

// Request permissions (iOS)
export const requestPermission = async () => {
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    throw new Error('Permission not granted');
  }
};
```

### Tipos de Notificações FisioFlow

#### 1. Lembretes de Exercícios
```typescript
// Cloud Functions para agendar lembretes
export const scheduleExerciseReminder = functions.firestore
  .document('plans/{planId}')
  .onCreate(async (snap, context) => {
    const plan = snap.data();
    const patient = await getPatient(plan.patientId);

    // Enviar notificação em horário personalizado
    await admin.messaging().schedule({
      token: patient.fcmToken,
      notification: {
        title: 'Hora do exercício! 💪',
        body: 'Você tem exercícios pendentes no seu plano de hoje.',
      },
      data: {
        type: 'EXERCISE_REMINDER',
        planId: plan.id,
      },
      // Schedule no horário de preferência do paciente
      scheduleTime: getNextScheduledTime(patient.preferredTime),
    });
  });
```

#### 2. Notificações de Progresso
```typescript
// Trigger quando paciente completa exercício
export const onExerciseCompleted = functions.firestore
  .document('patient_exercises/{exerciseId}')
  .onUpdate(async (change, context) => {
    const after = change.after.data();

    if (after.status === 'COMPLETED') {
      // Calcular streak
      const streak = await calculateStreak(after.patientId);

      if (streak % 7 === 0) {
        // Enviar notificação de conquista
        await admin.messaging().send({
          token: after.fcmToken,
          notification: {
            title: '🔥 7 dias seguidos!',
            body: 'Parabéns! Você manteve uma sequência de 7 dias. Continue assim!',
          },
          data: {
            type: 'STREAK_MILESTONE',
            days: streak,
          },
        });
      }
    }
  });
```

#### 3. Reengajamento
```typescript
// Cloud Function agendada para rodar diariamente
export const dailyEngagementCheck = functions.pubsub
  .schedule('0 9 * * *') // 9h da manhã todos os dias
  .timeZone('America/Sao_Paulo')
  .onRun(async (context) => {
    const inactivePatients = await getInactivePatients(3); // 3 dias sem atividade

    const messages = inactivePatients.map((patient) => ({
      token: patient.fcmToken,
      notification: {
        title: 'Estamos sentindo sua falta... 🏃',
        body: 'Já faz 3 dias que você não faz seus exercícios. Volte agora!',
      },
      data: {
        type: 'RE_ENGAGEMENT',
        deepLink: 'fisioflow://plans',
      },
    }));

    // Batch send
    await admin.messaging().sendAll(messages);
  });
```

### Firebase Console: No-Code Notifications

Você também pode enviar notificações direto do console sem código:

1. **Acesse** Firebase Console > Cloud Messaging
2. **Criar nova campanha**
3. **Segmentar audiência** por:
   - App (Paciente ou Profissional)
   - Language (pt-BR)
   - User Properties (plano ativo, inativo X dias)
   - Topics (ex: `exercise_reminders`)
4. **Personalizar mensagem** com emojis e deep links
5. **Agendar ou enviar imediatamente**

### Analytics de Notificações

```typescript
// Acompanhar performance das notificações
import { getAnalytics, logEvent } from 'firebase/analytics';

export const trackNotificationOpened = async (notification) => {
  const analytics = getAnalytics();

  logEvent(analytics, 'notification_opened', {
    notification_type: notification.data.type,
    notification_id: notification.notificationId,
    user_id: notification.data.userId,
    timestamp: new Date().toISOString(),
  });
};

// Ver métricas no Firebase Console > Analytics > Events
```

---

## 💡 FUNCIONALIDADES PARA ENGAJAMENTO

### Gamificação

#### 1. Sistema de Pontos e Níveis
- Pontos por exercício completado
- Níveis de progressão (Iniciante → Intermediário → Avançado)
- Badges por conquistas específicas
- Leaderboard opcional (por clínica)

#### 2. Streaks
- Contador de dias consecutivos
- Bônus por manter streaks
- Recuperação de streak (1 vez por mês)
- Notificações para manter streak

#### 3. Desafios
- Desafios semanais
- Desafios mensais
- Desafios personalizados pelo profissional
- Recompensas por completar desafios

#### 4. Progresso Visual
- Gráficos de evolução
- Antes/Depois (com permissão)
- Comparativos saudáveis
- Celebrações de marcos

### Notificações Inteligentes

#### Tipos de Notificações
1. **Lembretes de exercícios**
   - Horário personalizado
   - Baseado em histórico de adesão
   - Rescheduling automático

2. **Motivacionais**
   - Mensagens aleatórias
   - Personalizadas por perfil
   - Em momentos estratégicos

3. **Progresso**
   - Atualizações de conquistas
   - Novos níveis alcançados
   - Marcos importantes

4. **Reengajamento**
   - Para usuários inativos
   - Ofertas especiais
   - Lembretes de metas

### Personalização

#### Perfil Detalhado
- Foto de perfil
- Metas pessoais
- Limitações físicas
- Preferências de exercícios
- Histórico médico (resumido)

#### Planos Personalizados
- Adaptados ao condicionamento
- Consideram limitações
- Evolução gradual
- Feedback contínuo

### Social Features (Opcional)

#### App Paciente
- Compartilhar progresso (opcional)
- Grupos de suporte
- Desafios entre pacientes
- Comunidade moderationada

---

## 🔐 SEGURANÇA E COMPLIANCE

### LGPD Compliance

#### Princípios Fundamentais
1. **Minimização de dados:** Coletar apenas o necessário
2. **Consentimento explícito:** Opt-in claro para tudo
3. **Direito ao esquecimento:** Delete account completo
4. **Portabilidade:** Exportar dados do usuário
5. **Transparência:** Política de privacidade clara

#### Implementação Técnica com Firebase
- **Criptografia em repouso:** Firebase criptografa automaticamente (AES-256)
- **Criptografia em trânsito:** TLS 1.3 obrigatório em todas as conexões
- **Autenticação com 2FA:** Firebase Auth suporta 2FA nativo
- **Sessions com expiração:** Firebase Auth tokens com expiração configurável
- **Audit logs:** Cloud Logging para operações críticas
- **Anonymous analytics:** Firebase Analytics com privacy by default
- **Security Rules:** Firestore Security Rules para granularidade
- **App Check:** Proteção contra abuso de APIs

### HIPAA Compliance (Futuro - Internacional)

Se expandir para EUA:
- Business Associate Agreement com provedores
- Criptografia stronger
- Access controls mais rígidos
- Audit logs detalhados
- Training para time

---

## 📊 ESTRUTURA DE REPOSITÓRIOS

### Recomendação: Monorepo com Turborepo

```
fisioflow/
├── apps/
│   ├── web/                      # App web atual (Vite + React)
│   ├── patient-ios/              # App paciente iOS (Expo + React Native)
│   ├── patient-android/          # App paciente Android (futuro)
│   └── pro-ios/                  # App profissional iOS
├── packages/
│   ├── ui/                       # Componentes compartilhados
│   ├── config/                   # Configurações compartilhadas
│   ├── types/                    # Tipos TypeScript compartilhados
│   ├── utils/                    # Utilitários compartilhados
│   └── firebase/                 # Cliente Firebase compartilhado
│       ├── auth.ts              # Firebase Auth wrapper
│       ├── firestore.ts         # Firestore queries
│       ├── storage.ts           # Firebase Storage
│       ├── messaging.ts         # FCM (push notifications)
│       └── analytics.ts         # Firebase Analytics
├── functions/                    # Firebase Cloud Functions
│   ├── src/
│   │   ├── triggers/            # Firestore triggers
│   │   ├── api/                 # HTTP functions
│   │   └── scheduled/           # Scheduled tasks
│   └── package.json
├── dataconnect/                  # Firebase Data Connect schemas
│   ├── schema/
│   │   ├── patients.gql         # Patient schema
│   │   ├── professionals.gql    # Professional schema
│   │   ├── plans.gql            # Plan schema
│   │   └── exercises.gql        # Exercise schema
│   └── queries/
│       ├── patient/             # Patient queries
│       └── professional/        # Professional queries
├── firebase.json                 # Firebase config
├── firestore.rules               # Firestore security rules
├── storage.rules                 # Storage security rules
├── package.json
├── turbo.json
└── README.md
```

### Vantagens do Monorepo
✅ Código compartilhado real
✅ Mudanças atomicas across apps
✅ CI/CD unificado
✅ Gerenciamento simplificado

### Alternativa: Repos Separados
```
fisioflow-web/
fisioflow-patient-ios/
fisioflow-pro-ios/
```

#### Vantagens
✅ Independência total
✅ Deploy separados
✅ Permissões granulares

#### Desvantagens
⚠️ Duplicação de código
⚠️ Divergência de versões
⚠️ Mais complexo para sincronizar

---

## 🚀 XCODE VS EAS BUILD

### EAS Build (RECOMENDADO)

#### Vantagens
✅ **Não precisa de Mac** - compila na nuvem
✅ **Automatizado** - CI/CD integrado
✅ **Paralelo** - múltiplos builds simultâneos
✅ **Consistente** - ambiente limpo sempre
✅ **Rápido** - cache inteligente

#### Como Funciona
```bash
# Instalar CLI
npm install -g eas-cli

# Login
eas login

# Configurar projeto
eas build:configure

# Build para iOS
eas build --platform ios

# Submit para App Store
eas submit --platform ios
```

#### Custos
- **Free:** 15 builds/mês
- **Paid:** US$ 99/mês (ilimitado)

### Xcode Local

#### Quando Usar
- Precisa testar builds locais
- Quer debugar código nativo
- Tem Mac disponível
- Desenvolvimento de módulos nativos

#### Vantagens
✅ Build local mais rápido
✅ Debugging nativo
✅ Simulator completo
✅ Sem limites de builds

#### Desvantagens
⚠️ **Requer Mac** - obrigatório
⚠️ Setup complexo
⚠️ Maintenance da máquina

### Recomendação Final
**Use EAS Build** para CI/CD e produção
**Use Mac VM** apenas se precisar debugar código nativo

---

## 🤖 VIABILIDADE DE DESENVOLVIMENTO COM LLMs

### Avaliação das Ferramentas Disponíveis

#### Claude (Anthropic)
✅ **Melhor para:** Análise de código, debugging, arquitetura
✅ **Contexto:** 200K tokens (muito código)
✅ **Velocidade:** Rápido
✅ **Custo:** US$ 3/million input tokens

#### GPT-4 / GPT-5 (OpenAI)
✅ **Melhor para:** Geração de código boilerplate
✅ **Contexto:** 128K tokens
✅ **Velocidade:** Variável
✅ **Custo:** Similar ao Claude

#### Gemini (Google)
✅ **Melhor para:** Análise de grandes codebases
✅ **Contexto:** 1M tokens (maior)
✅ **Velocidade:** Rápido
✅ **Custo:** Mais barato

#### Abacus AI
✅ **Melhor para:** Automação completa de tasks
✅ **Agentes:** Múltiplos agentes especializados
✅ **Workflow:** Mais automatizado

### Estratégia Recomendada: Híbrida

#### O que LLMs fazem BEM
✅ Gerar código boilerplate
✅ Debugging e fix de bugs
✅ Explicar código complexo
✅ Sugerir arquiteturas
✅ Escrever testes
✅ Documentação
✅ Code review

#### O que LLMs NÃO fazem Bem
❌ Design visual refinado
❌ UX/UI thinking
❌ Decisões de produto
❌ Testes manuais em dispositivos
❌ Submissão para App Store
❌ Negociação com terceiros
❌ Estratégia de negócios

### Plano de Ação com LLMs

#### Fase 1: Setup (30% com LLM)
- [ ] Setup inicial do projeto
- [ ] Configuração de ferramentas
- [ ] Boilerplate code

#### Fase 2: Desenvolvimento Core (60% com LLM)
- [ ] Implementação de features
- [ ] Integração com APIs
- [ ] Lógica de negócio
- [ ] Testes automatizados

#### Fase 3: UI/UX (30% com LLM)
- [ ] Componentes base
- [ ] Telas simples
- [ ] Design system básico
- [ ] Revisões visuais

#### Fase 4: Polimento (20% com LLM)
- [ ] Bug fixes
- [ ] Otimizações
- [ ] Refatoração
- [ ] Documentação

#### Fase 5: Lançamento (10% com LLM)
- [ ] Preparação para App Store
- [ ] Screenshots e assets
- [ ] Testing final

### Estimativa de Economia
- **Desenvolvimento tradicional:** 100% do custo
- **Com LLMs:** 40-60% do custo
- **Tempo:** 30-50% mais rápido

### Recomendação Final
**SIM, é possível desenvolver com LLMs**, mas com ressalvas:

1. **Você precisará de:** Conhecimento técnico para validar
2. **Você FARÁ:** Testes manuais, decisões de produto, UI/UX
3. **LLM FARÁ:** Código, debugging, testes automatizados, docs

### Combinação de Ferramentas
- **Claude:** Para desenvolvimento principal (melhor reasoning)
- **GPT-5:** Para geração de código boilerplate
- **Gemini:** Para análise de grandes codebases
- **Abacus AI:** Para automação de tasks repetitivas

---

## 📱 FUNCIONALIDADES ESPECÍFICAS POR APP

### App FisioFlow Paciente

#### Core Features (MVP)
1. **Autenticação Simplificada**
   - Email/senha
   - Biometria (Face ID)
   - Magic link (enviado por email)

2. **Meus Planos**
   - Lista de planos ativos
   - Progresso visual
   - Próximo exercício
   - Histórico

3. **Executar Exercício**
   - Instruções visuais
   - Vídeo demonstrativo
   - Timer/counter
   - Conclusão com celebração

4. **Progresso**
   - Gráficos simples
   - Marcos alcançados
   - Streaks
   - Badges

5. **Comunicação**
   - Chat com profissional
   - Enviar dúvidas
   - Feedback visual

#### Features Premium (V2)
1. **AI Coach**
   - Computer vision para correção
   - Contagem automática de reps
   - Feedback em tempo real

2. **Integração Apple Health**
   - Sincronização de atividades
   - Leitura de métricas
   - Escrita de workouts

3. **Social**
   - Desafios com amigos
   - Leaderboards
   - Compartilhamento

4. **Conteúdo Educativo**
   - Blog sobre fisioterapia
   - Dicas de saúde
   - Exercícios preventivos

### App FisioFlow Pro

#### Core Features (MVP)
1. **Gestão de Pacientes**
   - Lista completa
   - Filtros avançados
   - Busca inteligente
   - Status de tratamento

2. **Planos de Tratamento**
   - Biblioteca de exercícios
   - Editor visual
   - Templates
   - Duplicação de planos

3. **Acompanhamento**
   - Dashboard por paciente
   - Progresso detalhado
   - Alertas de não-adesão
   - Estatísticas

4. **Comunicação**
   - Chat com pacientes
   - Broadcast messages
   - Feedback audio/video
   - Agendamento

5. **Administrativo**
   - Gestão de agenda
   - Financeiro básico
   - Relatórios
   - Configurações

#### Features Premium (V2)
1. **Teleconsulta**
   - Videochamada integrada
   - Whiteboard
   - Compartilhamento de tela

2. **AI Assistant**
   - Sugestão de exercícios
   - Análise de progresso
   - Alertas inteligentes

3. **Colaboração**
   - Multi-profissional
   - Compartilhamento de casos
   - Second opinion

4. **Analytics Avançado**
   - Relatórios customizados
   - Exportação em PDF
   - Integração com prontuário

---

## 🎨 INSPIRAÇÕES DE UI/UX

### Apps Referência

#### Para Engajamento
1. **MyFitnessPal**
   - Progresso visual claro
   - Simples de usar
   - Gamificação sutil

2. **Headspace**
   - Design amigável
   - Animações suaves
   - Onboarding excelente

3. **Duolingo**
   - Gamificação impecável
   - Streaks visíveis
   - Notificações perfeitas

#### Para Profissionais
1. **Stronglifts**
   - Interface limpa
   - Logging rápido
   - Progresso claro

2. **Notion**
   - Flexibilidade
   - Templates
   - Colaboração

3. **Apple Health**
   - Visualização de dados
   - Gráficos claros
   - Simples de navegar

### Padrões de UI Implementar

#### 1. Cards Elevados
```typescript
// Cards com sombra suave e bordas arredondadas
<View style={styles.card}>
  {/* Content */}
</View>

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
});
```

#### 2. Micro-interações
- Haptic feedback em ações importantes
- Animações de confete em conquistas
- Lottie animations para loading
- Transições suaves entre telas

#### 3. Empty States
```typescript
// Mensagens amigáveis quando não há dados
<EmptyState
  icon="🏋️"
  title="Nenhum plano ainda"
  message="Seu profissional irá criar um plano para você em breve"
  actionText="Entrar em contato"
  onAction={() => {/* ... */}
/>
```

#### 4. Swipe Actions
```typescript
// Gestos para ações rápidas
import { Swipeable } from 'react-native-gesture-handler';

// Swipe left para deletar, right para editar
```

---

## 📈 MÉTRICAS DE SUCESSO

### App Paciente

#### Engajamento
- **DAU/MAU:** Target 30%+ (daily active / monthly active)
- **Session duration:** 5-10 min por sessão
- **Retention:**
  - Dia 1: 40%+
  - Dia 7: 25%+
  - Dia 30: 15%+

#### Adesão ao Tratamento
- **Exercícios completados:** 70%+ dos prescritos
- **Streak médio:** 5+ dias
- **Push notification CTR:** 8%+

#### Satisfação
- **App Store rating:** 4.5+ estrelas
- **NPS:** 50+

### App Profissional

#### Adoção
- **Profissionais ativos:** 80%+ dos cadastrados
- **Planos criados:** 10+ por mês por profissional
- **Uso diário:** 60%+ DAU/MAU

#### Eficiência
- **Tempo para criar plano:** < 5 min
- **Tempo para acompanhar:** < 2 min por paciente
- **Satisfação:** 4.3+ estrelas

---

## 💵 MODELO DE MONETIZAÇÃO

### App Paciente

#### Modelo Freemium
- **Grátis:**
  - Acesso a planos da clínica
  - Exercícios básicos
  - Acompanhamento limitado
  - Notificações

- **Premium (R$ 29,90/mês ou R$ 249,90/ano):**
  - Planos ilimitados
  - AI Coach
  - Integração Apple Health
  - Conteúdo educativo exclusivo
  - Suporte prioritário

### App Profissional

#### Por Profissional (B2B)
- **Starter (R$ 99/mês):**
  - Até 20 pacientes
  - Planos básicos
  - Suporte por email

- **Pro (R$ 199/mês):**
  - Até 100 pacientes
  - Planos avançados
  - Analytics
  - Suporte prioritário

- **Clínica (R$ 499/mês):**
  - Pacientes ilimitados
  - Múltiplos profissionais
  - White-label
  - API access
  - Suporte dedicado

### Projeção de Receita

#### Conservador (Ano 1)
- App Profissional: 15 profissionais × R$ 199/mês = R$ 2.985/mês
- App Paciente Premium: 50 pacientes × R$ 29,90/mês = R$ 1.495/mês
- **Total:** ~R$ 4.480/mês (~R$ 54K/ano)

#### Moderado (Ano 2)
- App Profissional: 50 profissionais × R$ 199/mês = R$ 9.950/mês
- App Paciente Premium: 200 pacientes × R$ 29,90/mês = R$ 5.980/mês
- **Total:** ~R$ 15.930/mês (~R$ 191K/ano)

#### Otimista (Ano 3)
- App Profissional: 150 profissionais × R$ 199/mês = R$ 29.850/mês
- App Paciente Premium: 1000 pacientes × R$ 29,90/mês = R$ 29.900/mês
- **Total:** ~R$ 59.750/mês (~R$ 717K/ano)

---

## 🔍 PONTOS DE MELHORIA IDENTIFICADOS

### No Sistema Atual

#### 1. Experiência Mobile
**Problema:** Interface web não otimizada para mobile
**Solução:** App nativo com UX mobile-first

#### 2. Notificações
**Problema:** Não há sistema de notificações push
**Solução:** Implementar Supabase Push + OneSignal

#### 3. Offline Mode
**Problema:** App não funciona sem internet
**Solução:** Implementar offline-first com SQLite local

#### 4. Dark Mode
**Problema:** Não há suporte a dark mode
**Solução:** Theme system com Appearance API

#### 5. Performance
**Problema:** Load times podem ser lentos
**Solução:** Skeleton loaders + cache inteligente

### Novas Funcionalidades Recomendadas

#### Para Pacientes
1. **Diário de Dor/Progresso**
   - Escala de dor diária
   - Fotos de evolução
   - Anotações pessoais

2. **Lembretes Inteligentes**
   - Baseados em padrões de uso
   - Horários otimizados
   - Personalizáveis

3. **Programa de Recompensas**
   - Pontos por adesão
   - Descontos na clínica
   - Parcerias com marcas

4. **Comunidade**
   - Fórum moderationado
   - Suporte entre pares
   - Grupos por condição

#### Para Profissionais
1. **Template Library**
   - Planos pré-definidos
   - Por condição/lesão
   - Compartilhável

2. **AI Insights**
   - Padrões de recuperação
   - Alertas de risco
   - Sugestões de tratamento

3. **Integração Prontuário**
   - Exportação PDF
   - Compartilhamento seguro
   - Assinatura digital

4. **Multi-clínica**
   - Profissionais em múltiplas clínicas
   - Perfiles separados
   - Report consolidado

---

## 🚀 PLANO DE AÇÃO IMEDIATO

### Próximos 30 Dias

#### Semana 1: Decisões e Setup
- [x] Decidir tecnologia final (React Native)
- [ ] Criar conta Apple Developer ($99/ano)
- [ ] Definir feature set MVP
- [ ] Budget approval

#### Semana 2: Design e Prototipagem
- [ ] Criar design system completo
- [ ] Prototipar telas principais
- [ ] Definir navegação
- [ ] Testar com alguns usuários

#### Semana 3: Setup Técnico
- [ ] Criar projeto Firebase no console
- [ ] Criar repositório
- [ ] Setup Expo + EAS
- [ ] Configurar Firebase no mobile
- [ ] Configurar Firebase Data Connect
- [ ] Setup Cloud SQL (PostgreSQL)
- [ ] Setup CI/CD com Firebase

#### Semana 4: Primeiro Sprint
- [ ] Implementar Firebase Auth (email + Google)
- [ ] Criar navegação base
- [ ] Implementar theme system
- [ ] Configurar FCM (push notifications)
- [ ] Primeira tela funcional
- [ ] Setup Firebase Analytics

### Investimento Inicial Necessário
- **Apple Developer:** $99 (anual)
- **Design assets:** R$ 2.000 - R$ 5.000
- **Setup técnico:** incluído no desenvolvimento
- **Total upfront:** ~R$ 3.000 - R$ 6.000

---

## 📚 RECURSOS RECOMENDADOS

### Documentação Oficial

#### Firebase
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase for React Native](https://firebase.google.com/docs/react-native/setup)
- [Firebase Data Connect](https://firebase.google.com/docs/data-connect)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Firebase Authentication](https://firebase.google.com/docs/auth)

#### React Native & Expo
- [Expo Documentation](https://docs.expo.dev)
- [React Native](https://reactnative.dev)
- [Expo + Firebase Guide](https://docs.expo.dev/guides/using-firebase/)

#### Outros
- [RevenueCat](https://www.revenuecat.com)
- [React Native HealthKit](https://github.com/agencyenterprise/react-native-health)

### Cursos e Tutoriais

#### Firebase
- [Firebase for React Native - YouTube](https://www.youtube.com/watch?v= environment)
- [Firebase Data Connect Tutorial](https://firebase.google.com/docs/data-connect/quickstart)
- [Firebase Cloud Messaging Guide](https://firebase.google.com/docs/cloud-messaging/js/client)

#### React Native
- [Expo + React Native - freeCodeCamp](https://www.youtube.com/watch?v=6qtorrentMk8)
- [React Native Course - React Native Training](https://reactnativetraining.com)
- [React Native + Firebase Integration](https://www.youtube.com/watch?v=W9qIsWJ9P-k)

### Bibliotecas Recomendadas

#### Firebase
```bash
# Firebase core
npm install firebase

# Expo plugin para Firebase (config automática)
npx expo install @expo/firebase-app-check @expo/firebase-core

# Firebase Cloud Messaging
npx expo install expo-notifications

# Firebase Analytics
npx expo install expo-firebase-analytics
```

#### Navegação
```bash
npm install @react-navigation/native @react-navigation/stack
npx expo install react-native-screens react-native-safe-area-context
```

#### UI Components
```bash
npm install react-native-reanimated
npm install @gorhom/bottom-sheet
npm install react-native-toast-message
```

#### Funcionalidades
```bash
# HealthKit
npm install react-native-health

# In-app purchases
npm install react-native-purchases

# Biometria
npx expo install expo-local-authentication

# Camera
npx expo install expo-camera expo-media-library

# Storage (Firebase já inclui)
# Mas se precisar de storage local:
npx expo-install expo-file-system expo-secure-store
```

#### Animations
```bash
npm install lottie-react-native
npm install react-native-svg
```

### Configuração Firebase para React Native

#### 1. Criar projeto Firebase
```bash
# Via Firebase Console
# 1. Acesse https://console.firebase.google.com
# 2. Criar novo projeto
# 3. Adicionar apps iOS e Android
# 4. Baixar GoogleService-Info.plist (iOS) e google-services.json (Android)
```

#### 2. Configurar no Expo
```javascript
// app.json ou app.config.js
{
  "expo": {
    "name": "FisioFlow",
    "plugins": [
      [
        "@expo/firebase-app-check",
        {
          "android": {
            "provider": "playIntegrity"
          },
          "apple": {
            "provider": "appAttestWithDeviceCheckFallback"
          }
        }
      ]
    ],
    "ios": {
      "bundleIdentifier": "com.fisioflow.patient",
      "googleServicesFile": "./GoogleService-Info.plist"
    },
    "android": {
      "package": "com.fisioflow.patient",
      "googleServicesFile": "./google-services.json"
    }
  }
}
```

#### 3. Setup no código
```typescript
// firebase.ts
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';
import { getStorage } from 'firebase/storage';
import { getPerformance } from 'firebase/performance';
import { getAnalytics } from 'firebase/analytics';
import Constants from 'expo-constants';

const firebaseConfig = {
  apiKey: Constants.expoConfig.extra?.firebaseApiKey,
  authDomain: Constants.expoConfig.extra?.firebaseAuthDomain,
  projectId: Constants.expoConfig.extra?.firebaseProjectId,
  storageBucket: Constants.expoConfig.extra?.firebaseStorageBucket,
  messagingSenderId: Constants.expoConfig.extra?.firebaseMessagingSenderId,
  appId: Constants.expoConfig.extra?.firebaseAppId,
  measurementId: Constants.expoConfig.extra?.firebaseMeasurementId,
};

// Initialize app
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const messaging = getMessaging(app);
export const storage = getStorage(app);
export const perf = getPerformance(app);
export const analytics = getAnalytics(app);
```

### Comandos Úteis

#### Firebase CLI
```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Inicializar projeto
firebase init

# Deploy para Firebase Hosting
firebase deploy

# Deploy Cloud Functions
firebase deploy --only functions

# Deploy Firestore rules
firebase deploy --only firestore:rules
```

#### Expo + Firebase
```bash
# Configurar projeto
npx expo prebuild --clean

# Build local
npx expo run:ios
npx expo run:android

# EAS Build
eas build --platform ios
eas build --platform android
```

---

## 🎯 CONCLUSÕES E RECOMENDAÇÕES FINAIS

### Resumo Executivo

#### Tecnologia Definida
**React Native + Expo** foi a escolha definitiva porque:
1. Aproveita código existente (70-80%)
2. Desenvolvimento mais rápido
3. Não requer Mac obrigatoriamente
4. Custo significativamente menor
5. Time de React pode desenvolver

#### Arquitetura de Apps
**Dois apps separados** porque:
1. UX otimizada para cada público
2. Segurança e compliance facilitados
3. Monetização flexível
4. Manutenção independente
5. ASO mais efetivo

#### Viabilidade com LLMs
**Sim, é viável** mas:
1. Você precisará supervisionar
2. Testes manuais são obrigatórios
3. Decisões de produto com você
4. Economia de 40-60% no desenvolvimento
5. Tempo 30-50% menor

### Próximos Passos Imediatos

1. ✅ Aprovar orçamento de R$ 100-200K
2. ✅ Criar projeto Firebase no console
3. ✅ Criar conta Apple Developer
4. ✅ Definir feature set MVP
5. ✅ Começar com app paciente
6. ✅ Iniciar desenvolvimento com React Native + Expo + Firebase

### Timeline Realista
- **MVP App Paciente:** 3-4 meses
- **MVP App Profissional:** 4-5 meses
- **Integrações avançadas:** +2-3 meses
- **Total para lançamento:** ~1 ano

### ROI Esperado
- **Investimento:** R$ 100-200K
- **Break-even:** 12-18 meses
- **Receita Ano 2:** R$ 150-250K
- **Receita Ano 3:** R$ 500-800K

### Fatores de Sucesso Críticos
1. **UX excepcional** - simples e motivador
2. **Onboarding perfeito** - primeiro uso encanta
3. **Notificações inteligentes** - no momento certo
4. **Gamificação bem feita** - não forçada
5. **Performance impecável** - rápido e fluido
6. **Suporte ágil** - responder feedback rápido

---

## 📞 CONTATO E PRÓXIMOS PASSOS

### Para Iniciar o Projeto

1. **Reunião de Kickoff:** Alinhar visão final
2. **Workshop de Design:** Definir look & feel
3. **Sprint Planning:** Planejar primeiras 2 semanas
4. **Setup Técnico:** Configurar ambiente
5. **First Commit:** Começar código!

### Dúvidas Frequentes

**Q: Preciso de Mac?**
A: Não necessariamente. EAS Build compila na nuvem. Mac só para debugar código nativo.

**Q: Quanto tempo vai levar?**
A: MVP do app paciente em 3-4 meses, app profissional em 4-5 meses.

**Q: Posso fazer só com LLMs?**
A: Sim, mas você precisará validar código, testar e tomar decisões de produto.

**Q: Vale a pena dois apps?**
A: Sim. UX melhor, segurança maior, monetização flexível, manutenção mais fácil.

**Q: Por que React Native e não Swift?**
A: Compartilha código com web (70-80%), menor custo e desenvolvimento mais rápido.

**Q: Por que Firebase ao invés de Supabase?**
A: Firebase tem melhor integração mobile (iOS/Android), push notifications grátis e ilimitados (FCM), analytics ilimitado, economia de R$ 150-250/mês, e Firebase Data Connect com ORM type-safe gerado automaticamente.

---

**Documento Versão 2.0 - Firebase Edition**
**Data:** 22 de Janeiro de 2026
**Autor:** Análise Técnica Completa
**Status:** Pronto para Implementação

🔥 Powered by Firebase + Google Cloud + React Native + Expo

---

## 🔖 ANEXOS

### A. Checklist de Pré-Lançamento

#### Técnico
- [ ] Crash-free rate > 99%
- [ ] Load time < 3s
- [ ] Testado em múltiplos devices
- [ ] Testado em múltiplas versões iOS
- [ ] Memory leaks resolvidos
- [ ] Battery usage otimizado
- [ ] Offline mode funcional
- [ ] Push notifications testadas

#### Legal
- [ ] Política de privacidade
- [ ] Termos de uso
- [ ] Compliance LGPD
- [ ] Licenças de bibliotecas
- [ ] Direitos autorais

#### App Store
- [ ] Screenshots (todos tamanhos)
- [ ] Descrição otimizada
- [ ] Keywords definidas
- [ ] App icon (todos tamanhos)
- [ ] Launch screen
- [ ] Ratings & reviews strategy
- [ ] Category selection correta

### B. Métricas de Referência (Benchmarks)

#### Healthcare Apps
- **Median DAU/MAU:** 25%
- **Median Retention D30:** 12%
- **Median Rating:** 4.3
- **Median Session:** 4 min

#### Fitness Apps
- **Median DAU/MAU:** 35%
- **Median Retention D30:** 18%
- **Median Rating:** 4.5
- **Median Session:** 8 min

**Target FisioFlow:** Superar medianas em 20-30%

---

*Fim do Relatório Completo*
