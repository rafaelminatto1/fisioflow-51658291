# FisioFlow Monorepo

Ecossistema completo de aplicativos FisioFlow 100% hospedado no Google/Firebase.

## Estrutura do Monorepo

```
fisioflow-ecosystem/
├── apps/
│   ├── web/                    # Web app existente (Vite + React)
│   ├── patient-ios/            # App iOS para pacientes (Expo)
│   └── professional-ios/       # App iOS para profissionais (Expo)
│
├── packages/
│   ├── shared-ui/              # Componentes UI compartilhados
│   ├── shared-api/             # Clientes Firebase (callable + firestore)
│   ├── shared-types/           # Tipos TypeScript
│   ├── shared-utils/           # Utilitários (date, format, validation)
│   └── shared-constants/       # Constantes (collections, storage paths)
│
├── functions/                  # Firebase Cloud Functions (existente)
├── firebase.json               # Config Firebase Hosting
├── firestore.rules             # Regras Firestore
├── firestore.indexes.json      # Índices Firestore
├── storage.rules               # Regras Storage
├── pnpm-workspace.yaml         # Config workspace
├── turbo.json                  # Config Turborepo
└── package.json                # Root package.json
```

## Apps

### Web App (Existente)
- **Stack:** Vite + React + TypeScript
- **Hosting:** Firebase Hosting
- **Status:** ✅ Já em produção

### Patient iOS (Novo)
- **Stack:** Expo + React Native
- **Target:** Pacientes que fazem exercícios em casa
- **Build:** Expo EAS Build (sem Mac)
- **Status:** 🚧 Em desenvolvimento

### Professional iOS (Novo)
- **Stack:** Expo + React Native
- **Target:** Fisioterapeutas em consulta (iPad/iPhone)
- **Build:** Expo EAS Build (sem Mac)
- **Status:** 🚧 Em desenvolvimento

## Comandos Principais

### Instalar Dependências
```bash
pnpm install
```

### Desenvolvimento Web
```bash
pnpm dev:web
# ou
npm run dev
```

### Desenvolvimento App Pacientes
```bash
pnpm patient:dev
# ou
cd apps/patient-ios && pnpm start
```

### Desenvolvimento App Profissionais
```bash
pnpm professional:dev
# ou
cd apps/professional-ios && pnpm start
```

### Build iOS (EAS)
```bash
# Pacientes - Desenvolvimento
pnpm patient:build:dev

# Pacientes - Preview
pnpm patient:build:preview

# Pacientes - Produção
pnpm patient:build:prod

# Profissionais - Produção
pnpm professional:build:prod
```

### Deploy Firebase
```bash
# Web
pnpm deploy:web

# Cloud Functions
pnpm deploy:functions
```

## Pacotes Compartilhados

### @fisioflow/shared-types
Tipos TypeScript compartilhados entre todos os apps.

```typescript
import { Patient, Exercise, Appointment } from '@fisioflow/shared-types';
```

### @fisioflow/shared-api
Clientes Firebase (Callable Functions + Firestore + Storage).

```typescript
import { login, signOut } from '@fisioflow/shared-api';
import { PatientFunctions } from '@fisioflow/shared-api';
```

### @fisioflow/shared-utils
Utilitários para formatação, validação, datas, etc.

```typescript
import { formatCurrency, formatPhone, validateCPF } from '@fisioflow/shared-utils';
import { formatDate, calculateAge } from '@fisioflow/shared-utils/date';
```

### @fisioflow/shared-constants
Constantes do Firebase e outras configurações.

```typescript
import { COLLECTIONS, STORAGE_PATHS } from '@fisioflow/shared-constants';
```

## Firebase Configuração

### Projeto
- **ID:** fisioflow-migration
- **Number:** 412418905255
- **Console:** https://console.firebase.google.com/

### Serviços Configurados
- ✅ Hosting (web)
- ✅ Firestore
- ✅ Authentication
- ✅ Storage
- ✅ Cloud Functions (40+ funções)
- ✅ Cloud Messaging

## Próximos Passos

### 1. Configurar Firebase para iOS
- Adicionar apps iOS no Firebase Console
- Baixar GoogleService-Info.plist
- Copiar para apps/patient-ios/ e apps/professional-ios/

### 2. Configurar Expo EAS
```bash
# Instalar EAS CLI
npm install -g eas-cli

# Login
eas login

# Configurar
cd apps/patient-ios
eas build:configure

cd apps/professional-ios
eas build:configure
```

### 3. Primeiro Build
```bash
cd apps/patient-ios
eas build --profile development --platform ios
```

### 4. TestFlight
- Configurar app no App Store Connect
- Enviar build para TestFlight
- Testar em dispositivo real

## Custos Mensais (Estimados)

| Serviço | Custo |
|---------|-------|
| Firebase Hosting | $0 (Blaze) |
| Cloud Functions | $0-15 |
| Firestore | $0-25 |
| Storage | $0-10 |
| Expo EAS | $0-29 |
| Apple Developer | $8.25/mês |
| **TOTAL** | **$8-87/mês** |

## Documentação

- [Planejamento Completo](./PLANEJAMENTO_COMPLETO_FIREBASE_GOOGLE_2026.md)
- [Guia de Implementação](./GUIA_IMPLEMENTACAO_FIREBASE_IOS.md)
- [Estrutura do Monorepo](./ESTRUTURA_MONOREPO_FIREBASE.md)

## Licença

Privado - FisioFlow © 2026
