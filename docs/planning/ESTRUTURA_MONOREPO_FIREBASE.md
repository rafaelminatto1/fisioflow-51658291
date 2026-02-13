# Estrutura de Monorepo - FisioFlow Firebase

## Detalhamento Completo da Estrutura de Arquivos

---

## 1. Visão Geral da Estrutura

```
fisioflow-ecosystem/
├── apps/
│   ├── web/                    # Web app (existente)
│   ├── patient-ios/            # Expo app para pacientes
│   └── professional-ios/       # Expo app para profissionais
│
├── packages/
│   ├── shared-ui/              # Componentes UI compartilhados
│   ├── shared-api/             # Clientes Firebase (callable + firestore)
│   ├── shared-types/           # Tipos TypeScript
│   ├── shared-utils/           # Utilitários (date, format, etc)
│   └── shared-constants/       # Constantes (collections, storage paths)
│
├── functions/                  # Firebase Cloud Functions (existente)
├── public/                     # Assets estáticos do web app
├── dist/                       # Build do web app (Firebase Hosting)
│
├── firebase.json               # Config Firebase Hosting
├── firestore.rules             # Regras Firestore
├── firestore.indexes.json      # Índices Firestore
├── storage.rules               # Regras Storage
│
├── pnpm-workspace.yaml         # Config workspace
├── package.json                # Root package.json
├── turbo.json                  # Config Turborepo
└── tsconfig.json               # Config TypeScript root
```

---

## 2. Apps

### 2.1 Web App (Existente)

```
apps/web/
├── src/
│   ├── components/             # Componentes específicos do web
│   ├── pages/                  # Páginas (React Router)
│   ├── lib/                    # Firebase config
│   ├── hooks/                  # Hooks específicos
│   └── main.tsx                # Entry point
├── public/                     # Assets estáticos
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### 2.2 Patient iOS (Novo)

```
apps/patient-ios/
├── app/                        # Expo Router (file-based)
│   ├── _layout.tsx             # Layout raiz
│   ├── index.tsx               # Redirect
│   │
│   ├── (auth)/                 # Rotas de autenticação
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── forgot-password.tsx
│   │
│   └── (tabs)/                 # Rotas principais
│       ├── _layout.tsx         # Tabs navigation
│       ├── index.tsx           # Dashboard
│       ├── exercises.tsx       # Lista de exercícios
│       ├── progress.tsx        # Progresso
│       └── profile.tsx         # Perfil
│
├── components/                 # Componentes específicos
│   ├── dashboard/
│   ├── exercises/
│   └── profile/
│
├── hooks/                      # Hooks específicos
│   ├── useAuth.ts
│   ├── useExercises.ts
│   └── useProgress.ts
│
├── lib/                        # Firebase e serviços
│   ├── firebase.ts
│   └── services/
│
├── assets/                     # Imagens, fontes, etc
│   ├── icon.png
│   ├── splash.png
│   └── adaptive-icon.png
│
├── app.json                    # Config Expo
├── eas.json                    # Config EAS Build
├── package.json
└── tsconfig.json
```

**package.json - patient-ios:**

```json
{
  "name": "@fisioflow/patient-ios",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "build:dev": "eas build --profile development --platform ios",
    "build:preview": "eas build --profile preview --platform ios",
    "build:prod": "eas build --profile production --platform ios"
  },
  "dependencies": {
    "expo": "~51.0.0",
    "expo-router": "~3.5.0",
    "expo-status-bar": "~1.12.0",
    "expo-font": "~12.0.0",
    "@expo-google-fonts/inter": "~0.2.0",
    "expo-av": "~14.0.0",
    "expo-camera": "~15.0.0",
    "expo-media-library": "~16.0.0",
    "@react-navigation/native": "^6.1.0",
    "firebase": "^10.0.0",
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^4.4.0",
    "@phosphor-icons/react-native": "^2.0.0"
  },
  "devDependencies": {
    "@types/react": "~18.2.0",
    "typescript": "~5.3.0"
  }
}
```

### 2.3 Professional iOS (Novo)

```
apps/professional-ios/
├── app/
│   ├── _layout.tsx
│   ├── index.tsx
│   │
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── register.tsx
│   │
│   └── (drawer)/              # Drawer navigation
│       ├── _layout.tsx
│       ├── dashboard.tsx
│       ├── patients/
│       │   ├── index.tsx
│       │   ├── [id].tsx
│       │   └── new.tsx
│       ├── calendar/
│       ├── exercises/
│       └── financial/
│
├── components/
│   ├── patients/
│   ├── evaluations/
│   ├── exercises/
│   └── calendar/
│
├── hooks/
│   ├── usePatients.ts
│   ├── useEvaluations.ts
│   └── useAppointments.ts
│
├── lib/
│   ├── firebase.ts
│   └── services/
│
├── assets/
├── app.json
├── eas.json
├── package.json
└── tsconfig.json
```

**app.json - professional-ios:**

```json
{
  "expo": {
    "name": "FisioFlow Profissionais",
    "slug": "fisioflow-professionals",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "fisioflowprofessional",
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.fisioflow.professionals",
      "infoPlist": {
        "NSCameraUsageDescription": "Necessário para registrar avaliações"
      },
      "googleServicesFile": "./GoogleService-Info.plist"
    }
  }
}
```

---

## 3. Packages Compartilhados

### 3.1 shared-ui

```
packages/shared-ui/
├── src/
│   ├── components/
│   │   ├── button/
│   │   │   ├── Button.tsx
│   │   │   ├── index.ts
│   │   │   └── types.ts
│   │   ├── input/
│   │   ├── card/
│   │   ├── modal/
│   │   ├── avatar/
│   │   ├── badge/
│   │   └── ...
│   │
│   ├── hooks/
│   │   ├── useTheme.ts
│   │   └── useMediaQuery.ts
│   │
│   ├── theme/
│   │   ├── index.ts
│   │   ├── colors.ts
│   │   └── typography.ts
│   │
│   └── index.ts
│
├── package.json
└── tsconfig.json
```

**package.json:**

```json
{
  "name": "@fisioflow/shared-ui",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./button": "./src/components/button/index.ts",
    "./input": "./src/components/input/index.ts",
    "./theme": "./src/theme/index.ts"
  },
  "dependencies": {
    "react": "*",
    "@expo-google-fonts/inter": "*",
    "@phosphor-icons/react": "^2.0.0",
    "@phosphor-icons/react-native": "^2.0.0"
  },
  "peerDependencies": {
    "react": "*",
    "react-native": "*"
  }
}
```

### 3.2 shared-api

```
packages/shared-api/
├── src/
│   ├── firebase/
│   │   ├── config.ts
│   │   ├── auth.ts
│   │   └── index.ts
│   │
│   ├── functions/               # Callable Functions
│   │   ├── patients.ts
│   │   ├── appointments.ts
│   │   ├── evaluations.ts
│   │   ├── exercises.ts
│   │   ├── payments.ts
│   │   └── index.ts
│   │
│   ├── firestore/               # Direct Firestore access
│   │   ├── patients.ts
│   │   ├── exercises.ts
│   │   ├── sessions.ts
│   │   └── index.ts
│   │
│   ├── storage/
│   │   ├── upload.ts
│   │   ├── download.ts
│   │   └── index.ts
│   │
│   └── index.ts
│
├── package.json
└── tsconfig.json
```

**package.json:**

```json
{
  "name": "@fisioflow/shared-api",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./firebase": "./src/firebase/index.ts",
    "./functions": "./src/functions/index.ts",
    "./firestore": "./src/firestore/index.ts",
    "./storage": "./src/storage/index.ts"
  },
  "dependencies": {
    "firebase": "^10.0.0"
  }
}
```

### 3.3 shared-types

```
packages/shared-types/
├── src/
│   ├── auth.ts
│   ├── patient.ts
│   ├── professional.ts
│   ├── evaluation.ts
│   ├── exercise.ts
│   ├── appointment.ts
│   ├── payment.ts
│   ├── session.ts
│   └── index.ts
│
├── package.json
└── tsconfig.json
```

**Exemplo - patient.ts:**

```typescript
export interface Patient {
  id: string;
  userId: string;
  professionalId: string;
  name: string;
  birthDate: string;
  cpf?: string;
  phone?: string;
  email?: string;
  photoURL?: string;
  address?: Address;
  emergencyContact?: EmergencyContact;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}
```

### 3.4 shared-utils

```
packages/shared-utils/
├── src/
│   ├── date/
│   │   ├── format.ts
│   │   ├── parse.ts
│   │   └── index.ts
│   │
│   ├── validation/
│   │   ├── cpf.ts
│   │   ├── phone.ts
│   │   └── index.ts
│   │
│   ├── format/
│   │   ├── currency.ts
│   │   ├── phone.ts
│   │   └── index.ts
│   │
│   └── index.ts
│
├── package.json
└── tsconfig.json
```

### 3.5 shared-constants

```
packages/shared-constants/
├── src/
│   ├── collections.ts           # Nomes das collections Firestore
│   ├── storage.ts               # Paths do Storage
│   ├── routes.ts                # Rotas da API
│   ├── errors.ts                # Mensagens de erro
│   └── index.ts
│
├── package.json
└── tsconfig.json
```

**Exemplo - collections.ts:**

```typescript
export const COLLECTIONS = {
  USERS: 'users',
  PATIENTS: 'patients',
  EVALUATIONS: 'evaluations',
  EVALUATION_TEMPLATES: 'evaluation_templates',
  TREATMENT_PLANS: 'treatment_plans',
  EXERCISE_PRESCRIPTIONS: 'exercise_prescriptions',
  EXERCISE_SESSIONS: 'exercise_sessions',
  EXERCISES: 'exercises',
  APPOINTMENTS: 'appointments',
  PAYMENTS: 'payments',
} as const;
```

---

## 4. Configuração do Monorepo

### 4.1 pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### 4.2 package.json (Root)

```json
{
  "name": "fisioflow-monorepo",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "clean": "turbo run clean && rm -rf node_modules",
    "build:web": "cd apps/web && npm run build",
    "deploy:web": "firebase deploy --only hosting",
    "deploy:functions": "firebase deploy --only functions",
    "patient:dev": "pnpm --filter @fisioflow/patient-ios start",
    "patient:build": "pnpm --filter @fisioflow/patient-ios build:prod",
    "professional:dev": "pnpm --filter @fisioflow/professional-ios start",
    "professional:build": "pnpm --filter @fisioflow/professional-ios build:prod"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "prettier": "^3.0.0",
    "typescript": "^5.0.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=8.0.0"
  }
}
```

### 4.3 turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "expo/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

### 4.4 tsconfig.json (Root)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "module": "commonjs",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

---

## 5. Comandos do Monorepo

```bash
# Instalar dependências
pnpm install

# Adicionar dependência em um app específico
pnpm --filter @fisioflow/patient-ios add expo-camera

# Adicionar dependência em todos os apps
pnpm -w add firebase

# Adicionar dependência em um pacote compartilhado
pnpm --filter @fisioflow/shared-api add firebase

# Executar script em um app
pnpm --filter @fisioflow/patient-ios start

# Executar script em todos os apps
pnpm dev

# Build de todos os pacotes
pnpm build
```

---

## 6. Integração entre Apps e Pacotes

### 6.1 Importar em App React (Web)

```typescript
// apps/web/src/components/PatientCard.tsx
import { Button } from '@fisioflow/shared-ui/button';
import { Patient } from '@fisioflow/shared-types';
import { formatCurrency } from '@fisioflow/shared-utils';

interface Props {
  patient: Patient;
}

export function PatientCard({ patient }: Props) {
  return (
    <div>
      <h3>{patient.name}</h3>
      <Button onClick={() => console.log('click')}>
        Ver Detalhes
      </Button>
    </div>
  );
}
```

### 6.2 Importar em App React Native (iOS)

```typescript
// apps/patient-ios/app/(tabs)/profile.tsx
import { View, Text } from 'react-native';
import { Button } from '@fisioflow/shared-ui/button';
import { User } from '@phosphor-icons/react-native';
import { useAuth } from '@fisioflow/shared-api';
import { Patient } from '@fisioflow/shared-types';

export default function ProfileScreen() {
  const { user } = useAuth();

  return (
    <View>
      <Text>Olá, {user?.name}</Text>
      <Button onPress={() => console.log('logout')}>
        Sair
      </Button>
    </View>
  );
}
```

---

**Estrutura pronta para implementação!**
