# FisioFlow - Planejamento Completo 2026
## Apps iOS (Pacientes + Profissionais) + Web (Profissionais)

---

## 1. Visão Geral do Projeto

### 1.1 Objetivo
Desenvolver um ecossistema completo de aplicativos para o FisioFlow, composto por:

| Aplicativo | Plataforma | Público-Alvo | Prioridade |
|------------|------------|--------------|------------|
| **FisioFlow Pacientes** | iOS | Pacientes que realizam exercícios em casa | **MVP - Alta** |
| **FisioFlow Profissionais** | iOS | Fisioterapeutas que usam iPad/iPhone em consulta | **MVP - Alta** |
| **FisioFlow Web** | Web (PWA) | Profissionais para gestão completa (desktop) | **MVP - Alta** |

### 1.2 Arquitetura Proposta

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FISIOFLOW ECOSYSTEM                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │   iOS App        │  │   iOS App        │  │   Web App        │ │
│  │   PACIENTES      │  │   PROFISSIONAIS  │  │   PROFISSIONAIS  │ │
│  │                  │  │                  │  │                  │ │
│  │  - Exercícios    │  │  - Avaliações    │  │  - Dashboard     │ │
│  │  - Vídeos        │  │  - Evolução      │  │  - Financeiro    │ │
│  │  - Feedback      │  │  - Agenda        │  │  - Relatórios    │ │
│  │  - Progresso     │  │  - Prescrição    │  │  - Configurações │ │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘ │
│           │                     │                     │            │
│           └─────────────────────┼─────────────────────┘            │
│                                 │                                  │
├─────────────────────────────────┼──────────────────────────────────┤
│                                 ▼                                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   FIREBASE BACKEND                           │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  Firestore       │  Auth          │  Storage      │  FCM   │   │
│  │  (Database)      │  (Login)       │  (Files)      │  (Push) │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Estratégia de Desenvolvimento iOS

### 2.1 Tecnologias Escolhidas

#### React Native com Expo (vs Capacitor Nativo)

**Decisão: MIGRAR PARA EXPO + EAS BUILD**

**Racional:**
- Capacitor atual já configurado no projeto, mas...
- Expo EAS Build permite compilar iOS **sem ter um Mac**
- 30 builds/mês gratuitos (suficiente para MVP)
- $29/mês para builds ilimitados (muito mais barato que comprar Mac)
- Workflow profissional e automatizado
- Maior comunidade e suporte

| Critério | Capacitor + Xcode | Expo + EAS Build |
|----------|-------------------|------------------|
| **Custo inicial** | $1000-3000 (Mac) | $0 |
| **Custo mensal** | $0 | $0-29 |
| **Necessidade Mac** | Obrigatório | Não |
| **Build time** | 5-10 min | 15-20 min |
| **CI/CD** | Complexo | Nativo |
| **OTA Updates** | Não | Sim |
| **Comunidade** | Menor | Maior |

### 2.2 Configuração Expo EAS Build

#### Estrutura de Projetos

```
fisioflow-ecosystem/
├── packages/
│   ├── shared/                 # Código compartilhado
│   │   ├── ui/                 # Componentes UI compartilhados
│   │   ├── api/                # Clientes API
│   │   ├── types/              # Tipos TypeScript
│   │   ├── utils/              # Utilitários
│   │   └── constants/          # Constantes
│   │
│   ├── mobile-patient/         # App iOS Pacientes (Expo)
│   │   ├── app.json            # Config Expo
│   │   ├── eas.json            # Config EAS Build
│   │   ├── app/                # Código React Native
│   │   └── assets/             # Imagens, fontes
│   │
│   ├── mobile-professional/    # App iOS Profissionais (Expo)
│   │   ├── app.json
│   │   ├── eas.json
│   │   ├── app/
│   │   └── assets/
│   │
│   └── web-professional/       # App Web Profissionais (Atual)
│       ├── src/
│       ├── public/
│       └── package.json
│
├── package.json                # Monorepo root
├── pnpm-workspace.yaml
└── turbo.json                  # Turborepo (opcional)
```

#### app.json - App Pacientes

```json
{
  "expo": {
    "name": "FisioFlow Pacientes",
    "slug": "fisioflow-pacientes",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "fisioflowpatient",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.fisioflow.patients",
      "buildNumber": "1",
      "infoPlist": {
        "NSCameraUsageDescription": "Necessário para registrar seus exercícios",
        "NSPhotoLibraryUsageDescription": "Necessário para salvar progresso em fotos",
        "NSMicrophoneUsageDescription": "Necessário para gravar feedback de áudio"
      },
      "config": {
        "googleSignIn": {
          "reservedClientId": "CLIENT_ID_REVERSO"
        }
      },
      "googleServicesFile": "./GoogleService-Info.plist"
    },
    "android": {
      "package": "com.fisioflow.patients",
      "googleServicesFile": "./google-services.json"
    },
    "plugins": [
      "@expo/config-plugins",
      [
        "@expo-google-fonts/inter",
        {
          "fonts": ["inter_400", "inter_500", "inter_600", "inter_700"]
        }
      ]
    ],
    "extra": {
      "eas": {
        "projectId": "SEU_PROJECT_ID_EXPO"
      }
    }
  }
}
```

#### eas.json - Build Configuration

```json
{
  "cli": {
    "version": ">= 5.2.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "resourceClass": "m-medium"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "resourceClass": "m-medium"
      }
    },
    "production": {
      "autoIncrement": "buildNumber",
      "ios": {
        "resourceClass": "m-medium"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "activityfisioterapiamooca@gmail.com",
        "ascAppId": "APP_STORE_CONNECT_APP_ID",
        "appleTeamId": "APPLE_TEAM_ID"
      }
    }
  }
}
```

### 2.3 Comandos de Build

```bash
# Desenvolvimento
eas build --profile development --platform ios --local

# Preview/TestFlight
eas build --profile preview --platform ios

# Produção (App Store)
eas build --profile production --platform ios

# Produção com auto-submit
eas build --profile production --platform ios --auto-submit

# Update OTA (sem passar pela App Store)
eas update --branch production --message "Fix bug login"
```

---

## 3. Estrutura de Banco de Dados (Firebase)

### 3.1 Firestore Collections

#### Collections Principais

```typescript
// Collection: users
interface User {
  id: string;                    // UID do Firebase Auth
  email: string;
  name: string;
  role: 'patient' | 'professional' | 'admin';
  professionalId?: string;       // Para pacientes: ID do profissional responsável
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isActive: boolean;
  photoURL?: string;
  phone?: string;
}

// Collection: patients
interface Patient {
  id: string;
  userId: string;                // FK -> users.id
  professionalId: string;        // FK -> users.id (role = 'professional')
  name: string;
  birthDate: string;
  cpf?: string;
  phone?: string;
  email?: string;
  address?: Address;
  emergencyContact?: EmergencyContact;
  medicalHistory?: MedicalHistory[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Collection: evaluations
interface Evaluation {
  id: string;
  patientId: string;             // FK -> patients.id
  professionalId: string;        // FK -> users.id
  templateId?: string;           // FK -> evaluation_templates.id
  date: Timestamp;
  type: 'initial' | 'followup' | 'discharge';
  data: {
    // Dados dinâmicos baseados no template
    [key: string]: any;
  };
  notes?: string;
  attachments?: string[];        // Storage references
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Collection: treatment_plans
interface TreatmentPlan {
  id: string;
  patientId: string;             // FK -> patients.id
  professionalId: string;        // FK -> users.id
  name: string;
  description?: string;
  startDate: Timestamp;
  endDate?: Timestamp;
  status: 'active' | 'completed' | 'cancelled';
  goals: string[];
  exercises: TreatmentExercise[];
  frequency: number;             // sessões por semana
  totalSessions?: number;
  completedSessions: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Collection: exercise_prescriptions
interface ExercisePrescription {
  id: string;
  treatmentPlanId: string;       // FK -> treatment_plans.id
  patientId: string;             // FK -> patients.id
  exerciseId: string;            // FK -> exercises.id
  name: string;
  description?: string;
  sets: number;
  reps: number;
  duration?: number;             // segundos ou minutos
  restTime: number;              // segundos
  frequency: string;             // "3x por semana"
  videoUrl?: string;             // Storage reference
  imageUrl?: string;             // Storage reference
  instructions?: string;
  order: number;
  isActive: boolean;
}

// Collection: exercise_sessions
interface ExerciseSession {
  id: string;
  patientId: string;             // FK -> patients.id
  prescriptionId: string;        // FK -> exercise_prescriptions.id
  scheduledDate: Timestamp;
  completedDate?: Timestamp;
  status: 'scheduled' | 'completed' | 'skipped' | 'cancelled';
  feedback?: {
    pain: number;                // 0-10
    difficulty: number;          // 1-5
    notes?: string;
  };
  videoUrl?: string;             // paciente gravou execução
  duration?: number;             // tempo real gasto
  createdAt: Timestamp;
}

// Collection: appointments
interface Appointment {
  id: string;
  patientId: string;             // FK -> patients.id
  professionalId: string;        // FK -> users.id
  startTime: Timestamp;
  endTime: Timestamp;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'noshow';
  type: 'evaluation' | 'followup' | 'discharge';
  notes?: string;
  price?: number;
  paymentStatus?: 'pending' | 'paid' | 'cancelled';
  reminderSent: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Collection: payments
interface Payment {
  id: string;
  patientId: string;             // FK -> patients.id
  professionalId: string;        // FK -> users.id
  appointmentId?: string;        // FK -> appointments.id
  amount: number;
  date: Timestamp;
  method: 'cash' | 'card' | 'pix' | 'transfer';
  status: 'pending' | 'completed' | 'refunded';
  description?: string;
  voucherId?: string;
  createdAt: Timestamp;
}

// Collection: exercises (biblioteca de exercícios)
interface Exercise {
  id: string;
  professionalId: string;        // criador do exercício
  name: string;
  description: string;
  category: string;              // 'lower_body', 'upper_body', 'core', etc
  bodyParts: string[];           // ['knee', 'hip']
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  equipment?: string[];
  videoUrl?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  isPublic: boolean;             // se pode ser usado por outros profissionais
  tags: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### Índices Necessários

```javascript
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "appointments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "professionalId", "order": "ASCENDING" },
        { "fieldPath": "startTime", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "appointments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "patientId", "order": "ASCENDING" },
        { "fieldPath": "startTime", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "exercise_sessions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "patientId", "order": "ASCENDING" },
        { "fieldPath": "scheduledDate", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "treatment_plans",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "patientId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

### 3.2 Regras de Segurança

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    function isProfessional() {
      return isAuthenticated() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'professional';
    }

    function isPatient() {
      return isAuthenticated() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'patient';
    }

    function patientBelongsToProfessional(patientId) {
      return isProfessional() &&
        get(/databases/$(database)/documents/patients/$(patientId)).data.professionalId == request.auth.uid;
    }

    // Users: proprietário pode ler/editar
    match /users/{userId} {
      allow read: if isOwner(userId) || isProfessional();
      allow write: if isOwner(userId);
    }

    // Patients: profissional pode criar/ler/editar seus pacientes
    match /patients/{patientId} {
      allow read: if isProfessional() && resource.data.professionalId == request.auth.uid;
      allow create: if isProfessional();
      allow update: if isProfessional() && resource.data.professionalId == request.auth.uid;
      allow delete: if isProfessional() && resource.data.professionalId == request.auth.uid;
    }

    // Evaluations: profissional acessa suas avaliações
    match /evaluations/{evaluationId} {
      allow read: if isProfessional() && resource.data.professionalId == request.auth.uid;
      allow create: if isProfessional();
      allow update, delete: if isProfessional() && resource.data.professionalId == request.auth.uid;
    }

    // Treatment Plans
    match /treatment_plans/{planId} {
      allow read: if isProfessional() && resource.data.professionalId == request.auth.uid;
      allow create: if isProfessional();
      allow update, delete: if isProfessional() && resource.data.professionalId == request.auth.uid;
    }

    // Exercise Sessions: paciente pode ler suas sessões
    match /exercise_sessions/{sessionId} {
      allow read: if isProfessional() && resource.data.professionalId == request.auth.uid
                  || isPatient() && resource.data.patientId == request.auth.uid;
      allow create: if isProfessional() || isPatient();
      allow update: if isProfessional() && resource.data.professionalId == request.auth.uid
                   || isPatient() && resource.data.patientId == request.auth.uid;
    }

    // Appointments
    match /appointments/{appointmentId} {
      allow read: if isProfessional() && resource.data.professionalId == request.auth.uid
                  || isPatient() && resource.data.patientId == request.auth.uid;
      allow create: if isProfessional();
      allow update: if isProfessional() && resource.data.professionalId == request.auth.uid;
    }

    // Payments
    match /payments/{paymentId} {
      allow read, write: if isProfessional() && resource.data.professionalId == request.auth.uid;
    }

    // Exercises: biblioteca compartilhada
    match /exercises/{exerciseId} {
      allow read: if isProfessional();
      allow create: if isProfessional();
      allow update, delete: if isProfessional() && resource.data.professionalId == request.auth.uid;
    }
  }
}
```

### 3.3 Storage

```javascript
// storage.rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    function isAuthenticated() {
      return request.auth != null;
    }

    function isProfessional() {
      return isAuthenticated();
    }

    // Patient photos
    match /patients/{patientId}/photos/{filename} {
      allow read: if isAuthenticated();
      allow write: if isProfessional();
    }

    // Exercise videos (created by patients)
    match /sessions/{sessionId}/videos/{filename} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }

    // Exercise library videos (created by professionals)
    match /exercises/{exerciseId}/{filename} {
      allow read: if isAuthenticated();
      allow write: if isProfessional();
    }

    // Evaluation attachments
    match /evaluations/{evaluationId}/{filename} {
      allow read: if isAuthenticated();
      allow write: if isProfessional();
    }

    // Profile photos
    match /users/{userId}/profile/{filename} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }
  }
}
```

---

## 4. Autenticação e Roles

### 4.1 Firebase Auth Configuration

```typescript
// src/lib/firebase/auth.ts
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  User,
  UserCredential
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export interface UserRole {
  type: 'patient' | 'professional' | 'admin';
  permissions: string[];
}

export async function loginUser(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const userDoc = await getDoc(doc(db, 'users', credential.user.uid));

  if (!userDoc.exists()) {
    throw new Error('Usuário não encontrado');
  }

  const userData = userDoc.data();
  return { user: credential.user, role: userData.role, ...userData };
}

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);

  // Check if user exists
  const userDoc = await getDoc(doc(db, 'users', credential.user.uid));

  if (!userDoc.exists()) {
    // Create new user document
    await setDoc(doc(db, 'users', credential.user.uid), {
      id: credential.user.uid,
      email: credential.user.email,
      name: credential.user.displayName,
      photoURL: credential.user.photoURL,
      role: 'patient', // default
      createdAt: new Date(),
      isActive: true
    });
  }

  return credential.user;
}

export async function createProfessionalUser(data: {
  email: string;
  password: string;
  name: string;
  phone?: string;
}) {
  const credential = await createUserWithEmailAndPassword(
    auth,
    data.email,
    data.password
  );

  await setDoc(doc(db, 'users', credential.user.uid), {
    id: credential.user.uid,
    email: data.email,
    name: data.name,
    phone: data.phone,
    role: 'professional',
    isActive: true,
    createdAt: new Date()
  });

  return credential;
}

export async function createPatientUser(data: {
  email: string;
  password: string;
  name: string;
  professionalId: string;
  phone?: string;
}) {
  const credential = await createUserWithEmailAndPassword(
    auth,
    data.email,
    data.password
  );

  // Create user document
  await setDoc(doc(db, 'users', credential.user.uid), {
    id: credential.user.uid,
    email: data.email,
    name: data.name,
    phone: data.phone,
    role: 'patient',
    professionalId: data.professionalId,
    isActive: true,
    createdAt: new Date()
  });

  // Create patient document
  const patientRef = doc(collection(db, 'patients'));
  await setDoc(patientRef, {
    id: patientRef.id,
    userId: credential.user.uid,
    professionalId: data.professionalId,
    name: data.name,
    createdAt: new Date()
  });

  return credential;
}
```

### 4.2 Contexto de Autenticação React

```typescript
// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface AuthUser extends User {
  role: 'patient' | 'professional' | 'admin';
  professionalId?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isProfessional: boolean;
  isPatient: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isProfessional: false,
  isPatient: false
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUser({
            ...firebaseUser,
            ...userDoc.data()
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isProfessional: user?.role === 'professional',
        isPatient: user?.role === 'patient'
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

---

## 5. Roadmap de Implementação

### 5.1 Fase 0: Fundação (Semanas 1-2)

**Objetivo:** Configurar infraestrutura base

| Tarefa | Descrição | Responsável |
|--------|-----------|-------------|
| Criar projeto Expo | Configurar Expo para pacientes e profissionais | Dev |
| Configurar EAS Build | Setup eas.json, credenciais Apple | Dev |
| Configurar Firebase Cloud Functions | API endpoints para operações críticas | Dev |
| Setup monorepo | Configurar workspace compartilhado | Dev |
| CI/CD Pipeline | GitHub Actions para builds automáticos | Dev |

**Entregáveis:**
- Projetos Expo configurados (patients + professionals)
- EAS Build funcionando
- Primeiro build de teste
- Pipeline de CI/CD configurado

### 5.2 Fase 1: MVP - App Profissionais (Semanas 3-8)

**Objetivo:** Funcionalidades essenciais para fisioterapeutas

#### Sprint 1-2: Autenticação e Pacientes

```typescript
// Funcionalidades:
- Login/Registro (Email + Google)
- Onboarding profissional
- CRUD Pacientes
- Lista de pacientes com busca
- Perfil do paciente
```

#### Sprint 3-4: Avaliações

```typescript
// Funcionalidades:
- Criar template de avaliação
- Realizar avaliação inicial
- Anexar fotos/vídeos
- Salvar dados do paciente
- Histórico de avaliações
```

#### Sprint 5-6: Planos de Tratamento

```typescript
// Funcionalidades:
- Criar plano de tratamento
- Adicionar exercícios
- Biblioteca de exercícios
- Prescrever exercícios (sets, reps, descanso)
- Instruções visuais (vídeo/foto)
```

#### Sprint 7-8: Agenda e Financeiro

```typescript
// Funcionalidades:
- Visualizar agenda (dia/semana/mês)
- Criar compromissos
- Status dos compromissos
- Controle de pagamentos
- Relatórios básicos
```

**Entregáveis Fase 1:**
- App iOS Profissionais funcional
- App Web Profissionais com mesmas funcionalidades
- Primeira versão TestFlight

### 5.3 Fase 2: MVP - App Pacientes (Semanas 9-14)

#### Sprint 9-10: Onboarding e Dashboard

```typescript
// Funcionalidades:
- Registro com código do profissional
- Onboarding interativo
- Dashboard personalizado
- Próximos exercícios
- Progresso visual
```

#### Sprint 11-12: Execução de Exercícios

```typescript
// Funcionalidades:
- Ver lista de exercícios do dia
- Assistir vídeo demonstrativo
- Marcar exercício como completo
- Feedback de dificuldade/dor
- Cronômetro integrado
- Gravar execução (opcional)
```

#### Sprint 13-14: Progresso e Engajamento

```typescript
// Funcionalidades:
- Gráficos de progresso
- Histórico de sessões
- Conquistas/badges
- Lembretes de exercícios
- Notificações push
- Chat com profissional
```

**Entregáveis Fase 2:**
- App iOS Pacientes funcional
- Integração completa com app profissional
- TestFlight versão pacientes

### 5.4 Fase 3: Refinamento e Teste (Semanas 15-18)

#### Sprint 15-16: Testes com Usuários

| Atividade | Descrição |
|-----------|-----------|
| Beta Test | 10 profissionais reais + 50 pacientes |
| Feedback Loop | Coletar feedback e priorizar ajustes |
| Bug Fixes | Corrigir problemas críticos |
| Performance | Otimizar tempo de carregamento |

#### Sprint 17-18: Preparação Launch

| Atividade | Descrição |
|-----------|-----------|
| App Store Assets | Screenshots, descrições, preview video |
| Política de Privacidade | Documento legal |
| Termos de Uso | Documento legal |
| App Store Review | Submissão para aprovação |
| Marketing Material | Landing page, social media |

### 5.5 Fase 4: Lançamento (Semana 19+)

| Milestone | Descrição |
|-----------|-----------|
| Soft Launch | Disponível na App Store Brasil |
| Monitoramento | Analytics, crashes, feedback |
| Iteração Rápida | Correções e melhorias |
| Marketing | Divulgação para fisioterapeutas |

---

## 6. Especificação Técnica Detalhada

### 6.1 App Pacientes - Telas Principais

```typescript
// Estrutura de navegação
type PatientStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Onboarding: undefined;
  Main: undefined;
  Dashboard: undefined;
  Exercises: undefined;
  ExerciseDetail: { exerciseId: string };
  ExerciseSession: { sessionId: string };
  Progress: undefined;
  Profile: undefined;
  Notifications: undefined;
  Chat: undefined;
};

// Telas principais:

// 1. Dashboard
interface DashboardData {
  todayExercises: ExerciseSession[];
  weeklyProgress: {
    completed: number;
    scheduled: number;
    percentage: number;
  };
  nextAppointment?: Appointment;
  streak: number; // dias consecutivos
  achievements: Achievement[];
}

// 2. Lista de Exercícios
interface ExerciseListData {
  date: Date;
  sessions: ExerciseSession[];
  totalDuration: number;
  status: 'pending' | 'in_progress' | 'completed';
}

// 3. Detalhe do Exercício
interface ExerciseDetailData {
  exercise: ExercisePrescription;
  videoUrl?: string;
  instructions: string[];
  tips: string[];
  previousResults?: ExerciseSession[];
}

// 4. Sessão de Exercício (execução)
interface ExerciseSessionData {
  prescription: ExercisePrescription;
  currentSet: number;
  totalSets: number;
  timer: number;
  isResting: boolean;
  canRecordVideo: boolean;
}

// 5. Progresso
interface ProgressData {
  weeklyChart: ChartDataPoint[];
  monthlyChart: ChartDataPoint[];
  painHistory: PainLevel[];
  improvementAreas: string[];
  achievements: Achievement[];
}

// 6. Perfil
interface ProfileData {
  user: User;
  patient: Patient;
  professional?: User;
  statistics: {
    totalSessions: number;
    completionRate: number;
    averagePainReduction: number;
    streak: number;
  };
}
```

### 6.2 App Profissionais - Telas Principais

```typescript
// Estrutura de navegação
type ProfessionalStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Main: undefined;
  Dashboard: undefined;
  Patients: undefined;
  PatientDetail: { patientId: string };
  NewPatient: undefined;
  Evaluation: { patientId: string; templateId?: string };
  TreatmentPlan: { patientId: string; planId?: string };
  ExerciseLibrary: undefined;
  ExerciseEditor: { exerciseId?: string };
  Agenda: undefined;
  AppointmentDetail: { appointmentId: string };
  NewAppointment: { patientId?: string };
  Financial: undefined;
  PaymentDetail: { paymentId: string };
  Reports: undefined;
  Settings: undefined;
};

// Telas principais:

// 1. Dashboard Profissional
interface ProfessionalDashboardData {
  todayAppointments: Appointment[];
  todayStats: {
    completed: number;
    scheduled: number;
    revenue: number;
  };
  weeklyStats: {
    totalPatients: number;
    newPatients: number;
    totalSessions: number;
    totalRevenue: number;
  };
  activePatients: Patient[];
  pendingPayments: Payment[];
  upcomingBirthdays: Patient[];
}

// 2. Lista de Pacientes
interface PatientListData {
  patients: Patient[];
  filters: {
    search: string;
    activeOnly: boolean;
    sortBy: 'name' | 'lastSession' | 'nextAppointment';
  };
}

// 3. Detalhe do Paciente
interface PatientDetailData {
  patient: Patient;
  evaluations: Evaluation[];
  activeTreatmentPlan?: TreatmentPlan;
  upcomingAppointments: Appointment[];
  recentSessions: ExerciseSession[];
  progress: {
    painEvolution: ChartDataPoint[];
    adherence: number;
  };
}

// 4. Nova Avaliação
interface EvaluationData {
  template: EvaluationTemplate;
  fields: EvaluationField[];
  data: Record<string, any>;
  attachments: string[];
}

// 5. Biblioteca de Exercícios
interface ExerciseLibraryData {
  exercises: Exercise[];
  categories: string[];
  filters: {
    category?: string;
    bodyPart?: string;
    difficulty?: string;
    search: string;
  };
  canEdit: boolean; // se é criador do exercício
}

// 6. Agenda
interface AgendaData {
  view: 'day' | 'week' | 'month';
  appointments: Appointment[];
  selectedDate: Date;
  workingHours: WorkingHours;
  blockedTimes: BlockedTime[];
}

// 7. Financeiro
interface FinancialData {
  period: 'month' | 'year' | 'custom';
  summary: {
    totalRevenue: number;
    paidAmount: number;
    pendingAmount: number;
    averageTicket: number;
  };
  payments: Payment[];
  chart: ChartDataPoint[];
}
```

### 6.3 Componentes UI Compartilhados

```typescript
// packages/shared/ui/components/

// Button
export interface ButtonProps {
  variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  onPress: () => void;
  children: React.ReactNode;
}

// Card
export interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  elevation?: number;
  padding?: number;
}

// Input
export interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  keyboardType?: 'default' | 'email' | 'numeric' | 'phone-pad';
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words';
  icon?: React.ReactNode;
}

// DatePicker
export interface DatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  mode?: 'date' | 'time' | 'datetime';
}

// VideoPlayer
export interface VideoPlayerProps {
  source: string;
  poster?: string;
  autoplay?: boolean;
  controls?: boolean;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
}

// Chart
export interface ChartProps {
  type: 'line' | 'bar' | 'pie';
  data: ChartDataPoint[];
  colors?: string[];
  showGrid?: boolean;
  showLabels?: boolean;
}

// Skeleton
export interface SkeletonProps {
  width?: number | string;
  height?: number;
  variant?: 'rect' | 'circle' | 'text';
}
```

---

## 7. Integrações e Serviços

### 7.1 Firebase Cloud Functions

```javascript
// functions/api/patients.js
exports.getPatient = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated');

  const { patientId } = data;
  const patient = await admin.firestore().collection('patients').doc(patientId).get();

  if (!patient.exists()) {
    throw new functions.https.HttpsError('not-found', 'Paciente não encontrado');
  }

  // Verify professional has access
  if (patient.data().professionalId !== context.auth.uid) {
    throw new functions.https.HttpsError('permission-denied', 'Acesso negado');
  }

  return patient.data();
});

// functions/api/exercises.js
exports.createExercise = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated');

  const exerciseData = {
    ...data,
    professionalId: context.auth.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };

  const exercise = await admin.firestore().collection('exercises').add(exerciseData);

  return { id: exercise.id, ...exerciseData };
});

// functions/triggers/payments.js
exports.onPaymentCreated = functions.firestore
  .document('payments/{paymentId}')
  .onCreate(async (snap, context) => {
    const payment = snap.data();

    // Update appointment payment status
    if (payment.appointmentId) {
      await admin.firestore()
        .collection('appointments')
        .doc(payment.appointmentId)
        .update({ paymentStatus: 'paid' });
    }

    // Send notification to professional
    await admin.messaging().send({
      token: payment.professionalFcmToken,
      notification: {
        title: 'Pagamento Recebido',
        body: `Pagamento de R$ ${payment.amount.toFixed(2)} confirmado`
      }
    });
  });

// functions/scheduled/reminders.js
exports.sendExerciseReminders = functions.pubsub
  .schedule('every day 08:00')
  .timeZone('America/Sao_Paulo')
  .onRun(async (context) => {
    const snapshot = await admin.firestore()
      .collection('exercise_sessions')
      .where('scheduledDate', '==', admin.firestore.Timestamp.now())
      .where('status', '==', 'scheduled')
      .get();

    const messages = snapshot.docs.map(doc => {
      const session = doc.data();
      return {
        token: session.patientFcmToken,
        notification: {
          title: 'Lembrete de Exercícios',
          body: 'Você tem exercícios para fazer hoje!'
        }
      };
    });

    await admin.messaging().sendAll(messages);
  });
```

### 7.2 Notificações Push

```typescript
// src/lib/notifications.ts
import { messaging, getToken, onMessage } from 'firebase/messaging';
import { Firestore, doc, setDoc } from 'firebase/firestore';

export async function requestNotificationPermission() {
  const permission = await Notification.requestPermission();

  if (permission === 'granted') {
    const token = await getToken(messaging, {
      vapidKey: process.env.EXPO_PUBLIC_VAPID_KEY
    });

    // Save token to Firestore
    await setDoc(doc(db, 'users', auth.currentUser.uid), {
      fcmToken: token
    }, { merge: true });

    return token;
  }

  return null;
}

export function setupMessageListener() {
  onMessage(messaging, (payload) => {
    const { notification, data } = payload;

    // Show in-app notification
    showToast({
      title: notification?.title,
      message: notification?.body,
      data
    });

    // Navigate to relevant screen
    if (data?.screen) {
      navigation.navigate(data.screen, JSON.parse(data.params));
    }
  });
}

// Send notification (Cloud Function)
export async function sendNotification(userId: string, notification: {
  title: string;
  body: string;
  data?: any;
}) {
  const userDoc = await getDoc(doc(db, 'users', userId));
  const fcmToken = userDoc.data()?.fcmToken;

  if (!fcmToken) return;

  await admin.messaging().send({
    token: fcmToken,
    notification: {
      title: notification.title,
      body: notification.body
    },
    data: notification.data
  });
}
```

### 7.3 Armazenamento de Vídeos

```typescript
// src/lib/storage.ts
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export async function uploadExerciseVideo(
  exerciseId: string,
  file: File,
  onProgress?: (progress: number) => void
) {
  const storageRef = ref(storage, `exercises/${exerciseId}/${Date.now()}.mp4`);

  const uploadTask = uploadBytes(storageRef, file);

  return new Promise<string>((resolve, reject) => {
    uploadTask.on('state_changed', {
      next: (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.(progress);
      },
      error: reject,
      complete: async () => {
        const url = await getDownloadURL(storageRef);
        resolve(url);
      }
    });
  });
}

export async function uploadPatientSessionVideo(
  sessionId: string,
  file: File
) {
  const storageRef = ref(storage, `sessions/${sessionId}/${Date.now()}.mp4`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}
```

---

## 8. Custos e Infraestrutura

### 8.1 Custos Mensais Estimados

| Serviço | Plano | Custo Mensal | Observações |
|---------|-------|--------------|-------------|
| **Firebase Blaze** | Pay-as-you-go | $0-25 | Database, Auth, Hosting |
| **Cloud Functions** | Pay-as-you-go | $0-15 | Invocações e tempo de execução |
| **Firebase Storage** | Pay-as-you-go | $0-10 | 5-10 GB de vídeos |
| **Expo EAS** | Free/Production | $0-29 | 30 builds/mês grátis ou ilimitados |
| **Vercel** | Pro | $20 | Deploy Web |
| **Apple Developer** | Anual | $99/ano | $8.25/mês |
| **TOTAL ESTIMADO** | | **$38-106/mês** | Cresce com usuários |

### 8.2 Custos por Usuário (estimativa)

| Componente | Custo por 1000 usuários/mês |
|------------|------------------------------|
| Firestore reads | $0.06 |
| Firestore writes | $0.18 |
| Firestore storage | $0.02 |
| Auth | $0 (incluído) |
| Storage (100GB) | $2 |
| Hosting | $0 (incluído) |
| Cloud Functions | $1-5 |
| **Total** | **~$3-7 por 1000 usuários ativos/mês** |

---

## 9. Cronograma Detalhado

### Gantt Chart (18 semanas)

```
Semana:  01  02  03  04  05  06  07  08  09  10  11  12  13  14  15  16  17  18
         │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │
Fase 0   ██
Fase 1           ████████████████████████████████████████
                  └─S1─┘ └─S2─┘ └─S3─┘ └─S4─┘ └─S5─┘ └─S6─┘ └─S7─┘ └─S8─┘
Fase 2                                           ████████████████████████████████
                                                      └─S9─┘ └─S10─┘ └─S11─┘ └─S12─┘ └─S13─┘ └─S14─┘
Fase 3                                                                      ████████████
Fase 4                                                                                  ██
```

### Milestones

| Data | Milestone | Entregável |
|------|-----------|------------|
| Semana 2 | Fundação Completa | Infraestrutura pronta |
| Semana 8 | MVP Profissionais | TestFlight disponível |
| Semana 14 | MVP Pacientes | TestFlight disponível |
| Semana 16 | Beta Test Fechado | 10 prof + 50 pacientes |
| Semana 18 | App Store Submission | Aguardando aprovação |
| Semana 19+ | Lançamento | Disponível na App Store |

---

## 10. Riscos e Mitigações

### 10.1 Riscos Técnicos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Build EAS falhar | Média | Alto | Testar builds frequentemente; ter Mac de backup |
| Performance Firestore | Baixa | Médio | Otimizar queries; usar índices corretos |
| Upload de vídeos lento | Média | Médio | Compressão no cliente; upload progressivo |
| Crash em iOS específico | Baixa | Alto | Testar em múltiplos dispositivos; Crashlytics |
| Limite de custo Firebase | Baixa | Médio | Monitorar gastos; alertas de budget |

### 10.2 Riscos de Produto

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Baixa adoção pacientes | Média | Alto | Onboarding simples; gamificação |
| Profissionais não usam | Média | Alto | Focar em valor real; reduzir tempo |
| Concorrência | Alta | Alto | Diferenciação: IA + análise de movimento |
| Cancelamentos | Média | Médio | Engajamento constante; suporte |

### 10.3 Riscos de Negócio

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| App Store rejeição | Baixa | Alto | Seguir guidelines diretrizes |
| Custos acima do previsto | Média | Médio | Monitorar; otimizar; free tier |
| Suporte insuficiente | Média | Médio | FAQ; chatbot; documentação |

---

## 11. Próximos Passos Imediatos

### 11.1 Esta Semana

```bash
# 1. Criar conta Expo (já feita)
# 2. Instalar EAS CLI
npm install -g eas-cli

# 3. Criar projeto Expo para pacientes
npx create-expo-app fisioflow-patients

# 4. Configurar Firebase
# Adicionar GoogleService-Info.plist (já existe no projeto atual)

# 5. Primeiro build de teste
eas build --profile development --platform ios
```

### 11.2 Checklist Inicial

- [ ] Criar projetos Expo (patients + professionals)
- [ ] Configurar EAS Build
- [ ] Configurar Firebase Cloud Functions
- [ ] Definir estrutura de monorepo
- [ ] Setup CI/CD
- [ ] Primeiro build funcional
- [ ] Configurar TestFlight
- [ ] Criar designs no Figma
- [ ] Definir paleta de cores compartilhada
- [ ] Setup linting e code style

### 11.3 Decisões Pendentes

1. **Monorepo vs Multi-repo**: Recomendo monorepo com Turborepo
2. **State Management**: Zustand (já usado no projeto)
3. **Forms**: React Hook Form (já usado)
4. **Navigation**: React Navigation (Expo)
5. **Data Fetching**: TanStack Query (já usado)
6. **Video Processing**: ffmpeg (via expo-av)

---

## 12. Referências e Links Úteis

### Documentação Oficial
- [Expo Documentation](https://docs.expo.dev/)
- [EAS Build Guide](https://docs.expo.dev/build/introduction/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [React Navigation](https://reactnavigation.org/)
- [TanStack Query](https://tanstack.com/query/latest)

### Ferramentas
- [Expo Dashboard](https://expo.dev/)
- [Firebase Console](https://console.firebase.google.com/)
- [App Store Connect](https://appstoreconnect.apple.com/)

### Comunidade
- [Expo Discord](https://discord.gg/expo)
- [Firebase Community](https://stackoverflow.com/questions/tagged/firebase)
- [React Native Brasil](https://discord.gg/reactnativebr)

---

## 13. Conclusão

Este planejamento estabelece um caminho claro e realista para o desenvolvimento do ecossistema FisioFlow em 2026:

### Pontos Chave

1. **Tecnologia**: Expo + EAS Build = Sem necessidade de Mac
2. **Custo**: $38-106/mês (escalável com usuários)
3. **Tempo**: 18 semanas até lançamento
4. **Escopo**: MVP bem definido e iterativo
5. **Infraestrutura**: Firebase (já configurado)

### Vantagens da Abordagem

- [x] Sem custo inicial com hardware
- [x] Workflow profissional e automatizado
- [x] Updates OTA sem App Store
- [x] Código compartilhado entre apps
- [x] Firebase já configurado e testado
- [x] Escalável para milhares de usuários

### Próximo Passo

**Começar pela Fase 0**: Configurar infraestrutura base e realizar primeiro build EAS com sucesso.

---

**Data**: 24 de Janeiro de 2026
**Versão**: 1.0
**Status**: Pronto para Implementação
