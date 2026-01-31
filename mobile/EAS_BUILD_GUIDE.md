# FisioFlow Mobile Apps - EAS Build Guide

Este guia explica como configurar e fazer builds dos apps móveis do FisioFlow usando o EAS (Expo Application Services).

## Pré-requisitos

1. **Conta Expo**: Crie uma conta em [expo.dev](https://expo.dev)
2. **Apple Developer Account** (para iOS): [developer.apple.com](https://developer.apple.com)
3. **Node.js** instalado (v18+)
4. **EAS CLI instalado**:
   ```bash
   npm install -g eas-cli
   # ou
   yarn global add eas-cli
   ```

## Configuração Inicial

### 1. Login no EAS

```bash
eas login
```

### 2. Configurar Project IDs

Execute `eas build:configure` em cada app para configurar o projectId automaticamente:

```bash
# Patient App
cd patient-app
eas build:configure

# Professional App
cd ../professional-app
eas build:configure
```

Isso vai atualizar o `projectId` no `app.json` de cada app.

### 3. Configurar Firebase Cloud Messaging (FCM)

Para notificações push, você precisa configurar o Firebase:

#### Para iOS:

1. Baixe o `GoogleService-Info.plist` do [Firebase Console](https://console.firebase.google.com)
2. Coloque em `patient-app/` e `professional-app/`
3. Adicione ao `app.json`:

```json
"ios": {
  "googleServicesFile": "./GoogleService-Info.plist"
}
```

#### Para Android:

1. Baixe o `google-services.json` do Firebase Console
2. Coloque em `patient-app/` e `professional-app/`
3. Adicione ao `app.json`:

```json
"android": {
  "googleServicesFile": "./google-services.json"
}
```

### 4. Configurar Apple Credentials (iOS)

No [dashboard do EAS](https://expo.dev/accounts):

1. Vá em **Credentials** → **iOS Certificates**
2. Clique em **Create** → **Apple Distribution Certificate**
3. Siga as instruções para criar:
   - Distribution Certificate
   - Provisioning Profile
4. Ou use **Apple ID Login** para automação

## Comandos de Build

### Development Build (para testes em dispositivo físico)

```bash
# Patient App - iOS
cd patient-app
eas build --profile development --platform ios

# Patient App - Android
eas build --profile development --platform android

# Professional App - iOS
cd ../professional-app
eas build --profile development --platform ios

# Professional App - Android
eas build --profile development --platform android
```

### Preview Build (distribuição interna via TestFlight)

```bash
# Patient App
cd patient-app
eas build --profile preview --platform ios

# Professional App
cd ../professional-app
eas build --profile preview --platform ios
```

### Production Build (App Store)

```bash
# Patient App
cd patient-app
eas build --profile production --platform ios

# Professional App
cd ../professional-app
eas build --profile production --platform ios
```

## Perfis de Build (eas.json)

### Development
- Usa development client
- Distribuição interna
- Simulator suportado para iOS

### Preview
- Cliente de produção
- Distribuição interna
- Para TestFlight/Internal Testing

### Production
- Auto incrementa versão
- Para App Store/Play Store

## Instalando Builds

### iOS

1. Após o build, você receberá um link
2. Abra no dispositivo iOS
3. Instale via TestFlight (preview) ou diretamente (development)

### Android

1. Baixe o APK do link fornecido
2. Instale no dispositivo Android
3. Ou use QR code no dashboard EAS

## Submit para App Stores

### iOS App Store

Primeiro configure as credenciais Apple no `eas.json`:

```json
"submit": {
  "production": {
    "ios": {
      "appleId": "seu@email.com",
      "ascAppId": "SEU_APP_ID",
      "appleTeamId": "SEU_TEAM_ID"
    }
  }
}
```

Depois:

```bash
eas submit --platform ios --profile production
```

### Android Play Store

```bash
# Cria o keystore (primeira vez)
keytool -genkeypair -v -keystore fisioflow.keystore -alias fisioflow -keyalg RSA -keysize 2048 -validity 10000

# Submit
eas submit --platform android --profile production
```

## Variáveis de Ambiente

Crie o arquivo `.env` em cada app:

```bash
# Patient App
cd patient-app
cp .env.example .env

# Professional App
cd ../professional-app
cp .env.example .env
```

Preencha com suas credenciais Firebase:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=sua_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=seu_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=seu_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=seu_app_id
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=seu_measurement_id
```

## Troubleshooting

### Erro "Project ID not configured"
```bash
cd patient-app  # ou professional-app
eas build:configure
```

### Erro "No Apple credentials found"
- Configure as credenciais no dashboard EAS
- Ou use Apple ID login para automação

### Build falhou com "TypeError: Cannot read properties of null"
- Verifique se todas as dependências estão instaladas
- Execute `npm install` ou `pnpm install`

### Notificações não funcionam
- Verifique se `GoogleService-Info.plist` (iOS) ou `google-services.json` (Android) estão configurados
- Certifique-se de que `expo-notifications` está nos plugins do `app.json`

## Links Úteis

- [EAS Docs](https://docs.expo.dev/eas/)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [EAS Submit](https://docs.expo.dev/submit/introduction/)
- [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Firebase in Expo](https://docs.expo.dev/guides/using-firebase/)

## Próximos Passos

1. Configure os Project IDs com `eas build:configure`
2. Faça um build development para testar
3. Configure notificações push com Firebase
4. Prepare os assets finais (ícones, splash screens)
5. Faça build production para submissão
