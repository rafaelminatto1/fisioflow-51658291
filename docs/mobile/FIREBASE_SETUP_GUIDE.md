# 🔥 Guia de Configuração Firebase - FisioFlow Mobile

## 📋 Status Atual

- ✅ **Projeto Firebase:** `fisioflow-migration` (Project ID: `fisioflow-migration`)
- ✅ **Project Number:** `412418905255`
- ✅ **Web App ID:** `1:412418905255:web:07bc8405b6f5c1e597782`
- ✅ **EAS Project ID:** `8e006901-c021-464d-bbcd-96d821ab62d0`
- ✅ **Firebase Data Connect:** Configurado com PostgreSQL
- ✅ **Cloud SQL:** Instance `fisioflow-db` em `southamerica-east1`

---

## 🚀 Passo a Passo: Configuração Completa

### 1. Variáveis de Ambiente (Credenciais Firebase)

As credenciais podem ser obtidas via:
- **Firebase Console** → Project Settings → General → Your apps → Web app
- **Firebase Console** → Project Settings → General → Your apps → iOS app
- **Firebase Console** → Project Settings → General → Your apps → Android app

#### Criar arquivo `.env` no app paciente

```bash
cd apps/patient-ios
cp .env.example .env
```

#### Preencher o `.env` com as credenciais corretas:

```bash
# Firebase Configuration - FisioFlow Paciente
# Obtido em: https://console.firebase.google.com/project/fisioflow-migration/settings/general

# API Key (Web app)
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXX-XXXXXXXXXXXXXXXXX

# Auth Domain
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=fisioflow-migration.firebaseapp.com

# Project ID
EXPO_PUBLIC_FIREBASE_PROJECT_ID=fisioflow-migration

# Storage Bucket
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=fisioflow-migration.appspot.com

# Messaging Sender ID
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=412418905255

# App ID (Web app - usado como fallback)
EXPO_PUBLIC_FIREBASE_APP_ID=1:412418905255:web:07bc8e405b6f5c1e597782

# Measurement ID (Analytics)
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Development
EXPO_PUBLIC_USE_EMULATOR=false
```

### 2. Configurar Apps iOS no Firebase Console

#### App Paciente (Bundle ID: `com.fisioflow.patients`)

1. **Acessar** Firebase Console → Project Settings → Your apps
2. **Adicionar app iOS:**
   - Bundle ID: `com.fisioflow.patients`
   - App Name: `FisioFlow Pacientes`
   - Baixar `GoogleService-Info.plist`

3. **Configurar APNs para Push Notifications:**
   - Certificate: Production (Push Notifications)
   - Certificate: Development (Sandbox)

4. **Colocar o arquivo `GoogleService-Info.plist` em:**
   ```
   apps/patient-ios/GoogleService-Info.plist
   ```

#### App Profissional (Bundle ID: `com.fisioflow.professionals`)

1. **Adicionar app iOS:**
   - Bundle ID: `com.fisioflow.professionals`
   - App Name: `FisioFlow Profissionais`
   - Baixar `GoogleService-Info.plist`

2. **Colocar em:**
   ```
   apps/professional-ios/GoogleService-Info.plist
   ```

### 3. Configurar Cloud Messaging (FCM)

#### Chaves de API necessárias:

**Server Key** (para Cloud Functions):
```
Firebase Console → Project Settings → Cloud Messaging → Cloud Messaging API (Legacy)
Server Key: AAAAXXXXX_XXXXX:APA91bXXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX_XXXXX
```

**Sender ID** (já existe no .env):
```
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=412418905255
```

**VAPID Key** (para Web Push - futuro):
```
Firebase Console → Project Settings → Cloud Messaging → Web Push configuration
Key pair: XXXXX_XXXXX_XXXXX_XXXXX_XXXXX_XXXXX_XXXXX_XXXXX_XXXXX_XXXXX_XXXX
```

### 4. Firebase Data Connect + Cloud SQL

Já está configurado em:
- **Database:** `fisioflow`
- **Instance:** `fisioflow-db`
- **Region:** `southamerica-east1`

#### Schemas GraphQL existentes:
- ✅ `patients.gql` - Pacientes
- ✅ `exercises.gql` - Exercícios
- ✅ `appointments.gql` - Agendamentos
- ✅ `assessments.gql` - Avaliações
- ✅ `medical-records.gql` - Prontuários
- ✅ `organizations.gql` - Organizações
- ✅ `payments.gql` - Pagamentos

---

## 🔐 Segurança - NUNCA COMMITAR O ARQUIVO `.env`

O arquivo `.env` com credenciais reais **NUNCA** deve ser commitado. Já existe `.gitignore` configurado.

---

## 📱 Apps iOS Configurados

### App Paciente
- **Nome:** FisioFlow Pacientes
- **Slug:** fisioflow-patients
- **Bundle ID:** com.fisioflow.patients
- **EAS Project:** 8e006901-c021-464d-bbcd-96d821ab62d0

### App Profissional
- **Nome:** FisioFlow Profissionais
- **Slug:** fisioflow-professionals
- **Bundle ID:** com.fisioflow.professionals

---

## 🚀 Próximos Passos Imediatos

### 1. Copiar .env.example → .env
```bash
cd apps/patient-ios
cp .env.example .env
# Editar .env com as credenciais reais
```

### 2. Criar GoogleService-Info.plist
```bash
# No Firebase Console, baixar o arquivo para cada app iOS
# Colocar na raiz de cada app
```

### 3. Testar conexão Firebase
```bash
cd apps/patient-ios
npm start
# Verificar se não há erros de conexão Firebase
```

### 4. Deploy para EAS
```bash
cd apps/patient-ios
eas build --platform ios --profile development
```

---

## 📚 Referências Úteis

- [Firebase Console](https://console.firebase.google.com)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Expo + Firebase Guide](https://docs.expo.dev/guides/using-firebase/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction)

---

**Documento Versão:** 1.0
**Data:** 24 de Janeiro de 2026
**Status:** Pronto para configuração
