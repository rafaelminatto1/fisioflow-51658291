# Guia de Implementação - Firebase + iOS (Expo EAS)

## Passo a Passo para Implementação Completa

---

## 1. Configuração Inicial do Monorepo

### 1.1 Estrutura de Diretórios

```bash
# No diretório raiz do projeto
cd /home/rafael/antigravity/fisioflow/fisioflow-51658291

# Criar estrutura de monorepo
mkdir -p apps/patient-ios
mkdir -p apps/professional-ios
mkdir -p packages/shared-ui
mkdir -p packages/shared-api
mkdir -p packages/shared-types
mkdir -p packages/shared-utils
mkdir -p packages/shared-constants
```

### 1.2 Configurar pnpm-workspace.yaml

```yaml
# pnpm-workspace.yaml (criar na raiz)
packages:
  - 'apps/*'
  - 'packages/*'
```

### 1.3 Configurar package.json raiz

```json
{
  "name": "fisioflow-monorepo",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "build:web": "cd apps/web && npm run build",
    "deploy:web": "firebase deploy --only hosting",
    "deploy:functions": "firebase deploy --only functions",
    "patient:ios": "pnpm --filter @fisioflow/patient-ios",
    "professional:ios": "pnpm --filter @fisioflow/professional-ios"
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

---

## 2. Criar App iOS Pacientes

### 2.1 Criar projeto Expo

```bash
# Criar app pacientes
npx create-expo-app@latest apps/patient-ios --template blank-typescript

# Entrar no diretório
cd apps/patient-ios

# Instalar dependências
pnpm add expo-router expo-linking expo-constants expo-status-bar
pnpm add @react-navigation/native
pnpm add firebase
pnpm add @tanstack/react-query
pnpm add zustand
pnpm add expo-font @expo-google-fonts/inter
pnpm add expo-av @react-native-community/netinfo
```

### 2.2 Configurar app.json

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
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#3B82F6"
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.fisioflow.patients",
      "buildNumber": "1",
      "infoPlist": {
        "NSCameraUsageDescription": "Necessário para registrar seus exercícios em vídeo",
        "NSPhotoLibraryUsageDescription": "Necessário para salvar fotos do seu progresso",
        "NSPhotoLibraryAddUsageDescription": "Necessário para salvar fotos do seu progresso",
        "NSMicrophoneUsageDescription": "Necessário para gravar feedback de áudio"
      },
      "googleServicesFile": "./GoogleService-Info.plist",
      "config": {
        "googleSignIn": {
          "reservedClientId": "CLIENT_ID_REVERSO_DO_FIREBASE"
        }
      }
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
    "experiments": {
      "typedRoutes": true
    },
    "extra": {
      "eas": {
        "projectId": "será-adicionado-pelo-eas"
      },
      "router": {
        "origin": false
      }
    }
  }
}
```

### 2.3 Configurar eas.json

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

## 3. Configurar Firebase para iOS

### 3.1 Adicionar App iOS no Firebase Console

1. Acessar: https://console.firebase.google.com/
2. Projeto: `fisioflow-migration`
3. Clique no ícone iOS (+)
4. Bundle ID: `com.fisioflow.patients`
5. App name: `FisioFlow Pacientes`
6. Clique em "Register app"

### 3.2 Baixar GoogleService-Info.plist

```bash
# No Firebase Console:
# 1. Clique em "Download GoogleService-Info.plist"
# 2. Copiar para apps/patient-ios/

# Criar diretório se não existir
mkdir -p apps/patient-ios/ios

# Copiar o arquivo baixado para:
# apps/patient-ios/GoogleService-Info.plist
```

### 3.3 Configurar Environment Variables

```bash
# apps/patient-ios/.env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=moocafisio.com.br
EXPO_PUBLIC_FIREBASE_PROJECT_ID=fisioflow-migration
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=fisioflow-migration.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=412418905255
EXPO_PUBLIC_FIREBASE_APP_ID=1:412418905255:ios:your_ios_app_id
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

### 3.4 Criar Config Firebase

```typescript
// apps/patient-ios/src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging } from 'firebase/messaging';

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

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const messaging = getMessaging(app);

export default app;
```

---

## 4. Estrutura de App com Expo Router

### 4.1 Layout Principal

```typescript
// apps/patient-ios/app/_layout.tsx
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { Inter_400, Inter_500, Inter_600, Inter_700 } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400,
    Inter_500,
    Inter_600,
    Inter_700,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
```

### 4.2 Tabs Layout

```typescript
// apps/patient-ios/app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Home, Dumbbell, TrendingUp, User } from '@phosphor-icons/react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#64748B',
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: 'Exercícios',
          tabBarIcon: ({ color }) => <Dumbbell size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progresso',
          tabBarIcon: ({ color }) => <TrendingUp size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
```

---

## 5. Primeiro Build com EAS

### 5.1 Configurar EAS

```bash
# No diretório do app
cd apps/patient-ios

# Inicializar EAS
eas build:configure

# Este comando cria:
# - Adiciona "eas.projectId" no app.json
# - Cria/atualiza eas.json
```

### 5.2 Login no Expo

```bash
# Login na conta Expo
eas login

# Usar:
# Email: activityfisioterapiamooca@gmail.com
# Senha: [sua senha]
```

### 5.3 Configurar Credenciais Apple

```bash
# Configurar credenciais
eas credentials

# Seguir o wizard:
# 1. Escolher iOS
# 2. Escolher "Configure new credentials"
# 3. Fornecer Apple ID
# 4. Fornecer app-specific password
# 5. EAS cria certificados automaticamente
```

### 5.4 Primeiro Build

```bash
# Build de desenvolvimento
eas build --profile development --platform ios

# O que acontece:
# 1. Código é enviado para servidores EAS
# 2. Dependências são instaladas
# 3. App é compilado em Mac na nuvem
# 4. IPA é gerado
# 5. Link para download é fornecido
```

### 5.5 Monitorar Build

```bash
# Ver builds recentes
eas build:list

# Ver logs do build
eas build:view [BUILD_ID] --logs
```

---

## 6. Configurar Firebase Hosting para Web

### 6.1 Build do Web App

```bash
# No diretório raiz
cd /home/rafael/antigravity/fisioflow/fisioflow-51658291

# Build do web app
npm run build

# Output em dist/
```

### 6.2 Deploy no Firebase Hosting

```bash
# Deploy do hosting
firebase deploy --only hosting

# Com mensagem
firebase deploy --only hosting --message "Release v1.0.0"

# Deploy específico
firebase deploy --only hosting:fisioflow-migration
```

### 6.3 URLs Disponíveis

```
Produção:     https://fisioflow-migration.web.app
Custom:       https://app.fisioflow.com.br (configurar)
```

---

## 7. Comandos Úteis

### 7.1 Expo EAS

```bash
# Build
eas build --profile development --platform ios
eas build --profile preview --platform ios
eas build --profile production --platform ios

# Submit
eas submit --platform ios --latest

# Update (OTA)
eas update --branch production --message "Bug fix"

# Credenciais
eas credentials
eas credentials:list
```

### 7.2 Firebase

```bash
# Deploy completo
firebase deploy

# Deploy específico
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only storage:rules

# Emulador local
firebase emulators:start
```

### 7.3 Monorepo

```bash
# Instalar dependências
pnpm install

# Build de todos os pacotes
pnpm build

# Dev de todos os apps
pnpm dev

# Executar em pacote específico
pnpm --filter @fisioflow/patient-ios dev
```

---

## 8. Checklist de Implementação

### Fase 0: Infraestrutura (Semana 1)

- [ ] Criar estrutura de monorepo
- [ ] Configurar pnpm-workspace.yaml
- [ ] Criar apps/patient-ios
- [ ] Criar apps/professional-ios
- [ ] Criar pacotes compartilhados
- [ ] Configurar Firebase iOS
- [ ] Baixar GoogleService-Info.plist
- [ ] Configurar app.json
- [ ] Configurar eas.json
- [ ] Primeiro build EAS

### Fase 1: MVP Profissionais (Semanas 2-8)

- [ ] Autenticação e onboarding
- [ ] Gestão de pacientes
- [ ] Avaliações
- [ ] Biblioteca de exercícios
- [ ] Planos de tratamento
- [ ] Agenda básica

### Fase 2: MVP Pacientes (Semanas 9-14)

- [ ] Dashboard personalizado
- [ ] Lista de exercícios
- [ ] Execução com timer
- [ ] Progresso visual
- [ ] Notificações push

### Fase 3: Launch (Semanas 15-18)

- [ ] Testes com usuários
- [ ] Polimento de UI
- [ ] App Store submission
- [ ] Marketing inicial

---

## 9. Troubleshooting

### Erro: "Invalid credentials"

```bash
# Resetar credenciais
eas credentials:reset --platform ios
eas credentials
```

### Erro: "Build failed"

```bash
# Ver logs completos
eas build:view [BUILD_ID] --logs

# Reconfigurar
eas build:configure
```

### Erro: Firebase module not found

```bash
# Reinstalar dependências
rm -rf node_modules
pnpm install
```

---

**Pronto para começar a implementar!**
