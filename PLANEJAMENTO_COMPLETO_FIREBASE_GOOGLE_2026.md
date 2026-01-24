# FisioFlow - Planejamento Completo 2026
## Ecossistema 100% Google/Firebase

---

## 1. Visão Geral

### 1.1 Objetivo

Desenvolver um ecossistema completo de aplicativos FisioFlow centralizado no Google Cloud Platform:

| Aplicativo | Plataforma | Hosting | Backend | Prioridade |
|------------|------------|---------|---------|------------|
| **FisioFlow Web** | Web (PWA) | **Firebase Hosting** | **Cloud Functions** | ✅ Já existe |
| **FisioFlow Pacientes** | iOS App | App Store | Firebase SDK | MVP - Alta |
| **FisioFlow Profissionais** | iOS App | App Store | Firebase SDK | MVP - Alta |

### 1.2 Arquitetura 100% Google

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        GOOGLE CLOUD PLATFORM                                │
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │   Firebase       │  │   Firebase       │  │   Firebase       │          │
│  │   Hosting        │  │   Authentication │  │   Firestore      │          │
│  │   (Web App)      │  │   (Login)        │  │   (Database)     │          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │   Firebase       │  │   Firebase       │  │   Firebase       │          │
│  │   Storage        │  │   Cloud          │  │   Cloud          │          │
│  │   (Files)        │  │   Functions      │  │   Messaging      │          │
│  │                  │  │   (API)          │  │   (Push)         │          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │   Firebase       │  │   Firebase       │  │   Expo EAS       │          │
│  │   Analytics      │  │   Crashlytics    │  │   Build          │          │
│  │   (Metrics)      │  │   (Crashes)      │  │   (iOS Builds)   │          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Benefícios do Ecossistema Google

| Benefício | Descrição |
|-----------|-----------|
| **Tudo em um lugar** | Um projeto Firebase para tudo |
| **Plano Blaze** | Pay-as-you-go, só paga o que usa |
| **Hosting gratuito** | Web app com CDN global incluído |
| **Integração nativa** | SDKs otimizados entre serviços |
| **Escalabilidade** | Cresce automaticamente com usuários |
| **Segurança** | Rules nativos para Firestore e Storage |
| **Monitoring** | Analytics e Crashlytics integrados |

---

## 2. Estado Atual do Projeto

### 2.1 Firebase Configurado

**Projeto:** `fisioflow-migration`
**Project Number:** `412418905255`
**Plano:** Blaze (Pay-as-you-go)

### 2.2 Serviços Ativos

| Serviço | Status | Detalhes |
|---------|--------|----------|
| **Firebase Hosting** | ✅ Ativo | `fisioflow-migration.web.app` |
| **Firestore** | ✅ Ativo | Rules e indexes configurados |
| **Authentication** | ✅ Ativo | Email/Password, Google |
| **Storage** | ✅ Ativo | Rules configuradas |
| **Cloud Functions** | ✅ Ativo | 40+ funções deployadas |
| **Web App** | ✅ Ativo | App ID: `1:412418905255:web:07bc8e405b6f5c1e597782` |

### 2.3 Cloud Functions Existentes

**APIs HTTP:**
- `apiEvaluate` - Avaliações
- `apiRouter` - Router principal
- `healthCheck` - Health check

**Callable Functions:**
- `createPatient`, `updatePatient`, `deletePatient`
- `createAppointment`, `updateAppointment`, `cancelAppointment`
- `createPayment`, `listPayments`
- `createAssessment`, `updateAssessment`, `listAssessments`
- `createMedicalRecord`, `updateMedicalRecord`
- `createTreatmentSession`, `updateTreatmentSession`, `listTreatmentSessions`
- `getExercise`, `listExercises`, `searchSimilarExercises`
- `checkTimeConflict`, `getPatientFinancialSummary`
- `createAdminUser`

**Triggers:**
- `onAppointmentCreated` - Trigger ao criar compromisso
- `onAppointmentUpdated` - Trigger ao atualizar compromisso
- `onPatientCreated` - Trigger ao criar paciente

### 2.4 Firebase Hosting Configurado

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      { "source": "/api/v1/**", "function": "apiRouter" },
      { "source": "**", "destination": "/index.html" }
    ]
  }
}
```

---

## 3. Estratégia para iOS (Sem Mac)

### 3.1 Expo EAS Build

**Decisão:** Usar Expo + EAS Build para compilar iOS sem Mac

| Recurso | Descrição |
|---------|-----------|
| **Compilação na nuvem** | Servidores Mac da Expo |
| **Custo** | Free tier: 30 builds/mês |
| **Production tier** | $29/mês para builds ilimitados |
| **OTA Updates** | Atualizações sem App Store |
| **CI/CD** | GitHub Actions integrado |

### 3.2 Estrutura de Projetos

```
fisioflow-ecosystem/
├── apps/
│   ├── web/                     # Web app (Vite + React)
│   │   ├── src/
│   │   ├── public/
│   │   ├── dist/                # Firebase Hosting
│   │   └── package.json
│   │
│   ├── patient-ios/             # Expo app para pacientes
│   │   ├── app/                 # Expo Router
│   │   ├── assets/
│   │   ├── app.json
│   │   └── eas.json
│   │
│   └── professional-ios/        # Expo app para profissionais
│       ├── app/
│       ├── assets/
│       ├── app.json
│       └── eas.json
│
├── packages/
│   ├── shared-ui/               # Componentes UI compartilhados
│   ├── shared-api/              # Clientes Firebase
│   ├── shared-types/            # Tipos TypeScript
│   ├── shared-utils/            # Utilitários
│   └── shared-constants/        # Constantes Firebase
│
├── functions/                   # Firebase Cloud Functions
│   ├── src/
│   └── package.json
│
├── firebase.json                # Config Firebase Hosting
├── firestore.rules
├── firestore.indexes.json
├── storage.rules
└── package.json                 # Monorepo root
```

### 3.3 Configuração Expo EAS

#### app.json - App Pacientes

```json
{
  "expo": {
    "name": "FisioFlow Pacientes",
    "slug": "fisioflow-patients",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "fisioflowpatient",
    "userInterfaceStyle": "automatic",
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.fisioflow.patients",
      "buildNumber": "1",
      "infoPlist": {
        "NSCameraUsageDescription": "Necessário para registrar seus exercícios",
        "NSPhotoLibraryUsageDescription": "Necessário para salvar seu progresso",
        "NSMicrophoneUsageDescription": "Necessário para gravar feedback"
      },
      "googleServicesFile": "./GoogleService-Info.plist"
    },
    "plugins": [
      "@expo/config-plugins",
      "@expo-google-fonts/inter"
    ]
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

---

## 4. Firebase Hosting (Web App)

### 4.1 Deploy no Firebase Hosting

**Comandos:**

```bash
# Build do web app
npm run build

# Deploy no Firebase Hosting
firebase deploy --only hosting

# Deploy com mensagem
firebase deploy --only hosting --message "Release v1.0.0"
```

### 4.2 Configuração Avançada

```json
{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "predeploy": [
      "npm run build"
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      },
      {
        "source": "**",
        "headers": [
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "X-Frame-Options",
            "value": "DENY"
          }
        ]
      }
    ],
    "rewrites": [
      {
        "source": "/api/v1/evaluate",
        "function": "apiEvaluate"
      },
      {
        "source": "/api/v1/exercises/**",
        "function": "apiExercises"
      },
      {
        "source": "/api/v1/patients/**",
        "function": "apiPatients"
      },
      {
        "source": "/api/v1/appointments/**",
        "function": "apiAppointments"
      },
      {
        "source": "/api/v1/payments/**",
        "function": "apiPayments"
      },
      {
        "source": "/api/**",
        "function": "apiRouter"
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

### 4.3 URLs do Projeto

| Tipo | URL |
|------|-----|
| **Produção** | `https://fisioflow-migration.web.app` |
| **Custom Domain** | `https://app.fisioflow.com.br` (configurar) |
| **Preview** | `https://fisioflow-migration--<pr>.web.app` |

---

## 5. Integração Firebase SDK

### 5.1 Configuração Firebase (Apps iOS)

```typescript
// packages/shared-api/src/firebase/config.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging } from 'firebase/messaging';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const messaging = getMessaging(app);
export const functions = getFunctions(app, 'us-central1');

// Connect to emulator in development
if (__DEV__) {
  // connectFunctionsEmulator(functions, 'localhost', 5001);
}

export default app;
```

### 5.2 Callable Functions (Apps iOS)

```typescript
// packages/shared-api/src/functions/patients.ts
import { functions } from '../firebase/config';
import { httpsCallable } from 'firebase/functions';

export class PatientFunctions {
  // Criar paciente
  static async createPatient(data: {
    name: string;
    email?: string;
    phone?: string;
    birthDate: string;
  }) {
    const createPatientFn = httpsCallable(functions, 'createPatient');
    const result = await createPatientFn(data);
    return result.data;
  }

  // Listar pacientes
  static async listPatients(options?: {
    limit?: number;
    activeOnly?: boolean;
  }) {
    const listPatientsFn = httpsCallable(functions, 'listPatients');
    const result = await listPatientsFn(options || {});
    return result.data;
  }

  // Obter paciente
  static async getPatient(patientId: string) {
    const getPatientFn = httpsCallable(functions, 'getPatient');
    const result = await getPatientFn({ patientId });
    return result.data;
  }

  // Atualizar paciente
  static async updatePatient(patientId: string, updates: any) {
    const updatePatientFn = httpsCallable(functions, 'updatePatient');
    const result = await updatePatientFn({ patientId, ...updates });
    return result.data;
  }

  // Deletar paciente
  static async deletePatient(patientId: string) {
    const deletePatientFn = httpsCallable(functions, 'deletePatient');
    const result = await deletePatientFn({ patientId });
    return result.data;
  }
}
```

### 5.3 Firestore Direct (Apps iOS)

```typescript
// packages/shared-api/src/firestore/patients.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase/config';

export class PatientFirestore {
  // Real-time listener
  static onPatientChanged(
    patientId: string,
    callback: (patient: any) => void
  ) {
    const docRef = doc(db, 'patients', patientId);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback({ id: docSnap.id, ...docSnap.data() });
      }
    });

    return unsubscribe;
  }

  // Listar com query
  static async listPatients(professionalId: string) {
    const q = query(
      collection(db, 'patients'),
      where('professionalId', '==', professionalId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }
}
```

---

## 6. Roadmap de Implementação

### Fase 0: Fundação (Semanas 1-2)

**Objetivo:** Configurar infraestrutura base

| Tarefa | Descrição | Status |
|--------|-----------|--------|
| Criar conta Expo | Registro em expo.dev | ⬜ |
| Instalar EAS CLI | `npm install -g eas-cli` | ⬜ |
| Criar projeto paciente-ios | `npx create-expo-app` | ⬜ |
| Criar projeto profissional-ios | `npx create-expo-app` | ⬜ |
| Configurar Firebase iOS | Adicionar apps no console | ⬜ |
| Baixar GoogleService-Info.plist | Configurar SDK | ⬜ |
| Configurar monorepo | pnpm-workspace.yaml | ⬜ |
| Setup pacotes compartilhados | shared-api, shared-types, etc | ⬜ |
| Primeiro build EAS | Testar compilação | ⬜ |
| Configurar CI/CD | GitHub Actions | ⬜ |

### Fase 1: MVP Profissionais iOS (Semanas 3-8)

**Sprint 1-2:** Autenticação e Onboarding
- Login/Registro
- Onboarding profissional
- Setup Firebase Auth

**Sprint 3-4:** Gestão de Pacientes
- Lista de pacientes
- Criar/editar paciente
- Detalhes do paciente
- Foto do paciente

**Sprint 5-6:** Avaliações
- Templates de avaliação
- Nova avaliação
- Histórico
- Anexar arquivos

**Sprint 7-8:** Planos e Exercícios
- Biblioteca de exercícios
- Prescrição de exercícios
- Planos de tratamento

### Fase 2: MVP Pacientes iOS (Semanas 9-14)

**Sprint 9-10:** Onboarding e Dashboard
- Registro com código
- Dashboard personalizado
- Exercícios de hoje

**Sprint 11-12:** Execução de Exercícios
- Lista de exercícios
- Timer integrado
- Feedback de dor/dificuldade
- Gravar vídeo

**Sprint 13-14:** Progresso e Engajamento
- Gráficos de progresso
- Conquistas/badges
- Notificações push

### Fase 3: Polimento e Launch (Semanas 15-18)

**Sprint 15-16:** Testes com Usuários
- Beta test fechado
- Coletar feedback
- Corrigir bugs

**Sprint 17-18:** Preparação Launch
- Screenshots App Store
- Descrição e metadata
- Submissão

---

## 7. Custos 100% Google/Firebase

### 7.1 Custos Mensais Estimados

| Serviço Google | Plano | Custo Mensal |
|----------------|-------|--------------|
| **Firebase Hosting** | Blaze | $0 (incluído no plano) |
| **Cloud Functions** | Pay-as-you-go | $0-15 |
| **Firestore** | Blaze | $0-25 |
| **Storage** | Blaze | $0-10 |
| **Authentication** | Blaze | $0 (incluído) |
| **Cloud Messaging** | Blaze | $0 (incluído) |
| **Analytics** | Gratuito | $0 |
| **Crashlytics** | Gratuito | $0 |
| **Expo EAS** | Free/Production | $0-29 |
| **Apple Developer** | Anual | $8.25/mês |
| **TOTAL** | | **$8-87/mês** |

### 7.2 Custos por Usuário

**Estimativa: ~$2-5 por 1000 usuários ativos/mês**

### 7.3 Comparativo: Antes vs Depois

| Item | Antes (Vercel) | Depois (Firebase Hosting) |
|------|----------------|---------------------------|
| **Hosting Web** | $20/mês | $0 (incluído) |
| **API** | Cloud Functions | Cloud Functions (mesmo) |
| **Database** | Firestore | Firestore (mesmo) |
| **Storage** | Firebase Storage | Firebase Storage (mesmo) |
| **Auth** | Firebase Auth | Firebase Auth (mesmo) |
| **TOTAL Web** | ~$50/mês | ~$40/mês |
| **Economia** | - | **~$10/mês** |

---

## 8. Vantagens do Firebase Hosting

### 8.1 Comparativo

| Recurso | Firebase Hosting | Vercel |
|---------|------------------|--------|
| **Custo** | Grátis (Blaze) | $20/mês |
| **CDN Global** | ✅ Sim | ✅ Sim |
| **SSL** | ✅ Automático | ✅ Automático |
| **Custom Domain** | ✅ Sim | ✅ Sim |
| **Preview Deployments** | ⚠️ Manual | ✅ Automático |
| **Edge Functions** | ❌ Não | ✅ Sim |
| **Integração Firebase** | ✅ Nativa | ⚠️ Requer config |
| **Web App Rewrites** | ✅ Sim | ✅ Sim |
| **Headers Customizados** | ✅ Sim | ✅ Sim |

### 8.2 Por que Firebase Hosting?

1. **Já configurado** - Funciona com o projeto atual
2. **Grátis no plano Blaze** - Economia de $20/mês
3. **Integração nativa** - Cloud Functions via rewrites
4. **Mesmo projeto** - Um console para tudo
5. **Deploy simples** - `firebase deploy --only hosting`

---

## 9. Próximos Passos Imediatos

### 9.1 Esta Semana

```bash
# 1. Criar conta Expo
# Acessar: https://expo.dev/
# Email: activityfisioterapiamooca@gmail.com

# 2. Instalar EAS CLI
npm install -g eas-cli

# 3. Login
eas login

# 4. Criar estrutura de monorepo
mkdir -p apps/patient-ios apps/professional-ios packages/shared-api

# 5. Criar projeto paciente
npx create-expo-app@latest apps/patient-ios --template blank-typescript

# 6. Configurar Firebase no projeto
# - Adicionar app iOS no console
# - Baixar GoogleService-Info.plist
# - Copiar para apps/patient-ios/

# 7. Primeiro build
cd apps/patient-ios
eas build:configure
eas build --profile development --platform ios
```

### 9.2 Checklist de Configuração

- [ ] Criar conta Expo
- [ ] Instalar EAS CLI
- [ ] Criar projeto paciente-ios
- [ ] Criar projeto profissional-ios
- [ ] Configurar Firebase iOS no console
- [ ] Baixar GoogleService-Info.plist (ambos apps)
- [ ] Configurar app.json (ambos apps)
- [ ] Configurar eas.json (ambos apps)
- [ ] Primeiro build desenvolvimento
- [ ] Testar em dispositivo/simulador
- [ ] Configurar CI/CD com GitHub Actions

---

## 10. Cronograma Resumido

```
Semana:  01  02  03  04  05  06  07  08  09  10  11  12  13  14  15  16  17  18
         │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │
Fase 0   ██
Fase 1           ████████████████████████████████████████
Fase 2                                           ████████████████████████████████
Fase 3                                                                      ████████████
```

| Fase | Semanas | Objetivo |
|------|---------|----------|
| **Fundação** | 1-2 | Infraestrutura + primeiro build |
| **MVP Profissionais** | 3-8 | TestFlight funcional |
| **MVP Pacientes** | 9-14 | TestFlight funcional |
| **Polimento + Launch** | 15-18 | App Store |

---

## 11. Conclusão

### Decisões Principais

✅ **100% Google/Firebase** - Tudo em um só lugar
✅ **Firebase Hosting** - Grátis no plano Blaze (economia de $20/mês)
✅ **Expo EAS Build** - Compilar iOS sem Mac
✅ **Monorepo** - Código compartilhado entre apps
✅ **Cloud Functions** - Já tem 40+ funções criadas

### Resumo de Custos

| Item | Custo Mensal |
|------|--------------|
| Firebase Hosting | $0 |
| Cloud Functions | $0-15 |
| Firestore | $0-25 |
| Storage | $0-10 |
| Expo EAS | $0-29 |
| Apple Developer | $8.25 |
| **TOTAL** | **$8-87/mês** |

### Pronto para Implementar

Todos os documentos estão prontos e o próximo passo é **começar a implementação**.

---

**Data:** 24 de Janeiro de 2026
**Versão:** 2.0 (100% Firebase/Google)
**Status:** ✅ PRONTO PARA IMPLEMENTAÇÃO
