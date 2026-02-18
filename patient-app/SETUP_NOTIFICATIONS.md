# Configuração de Notificações - EAS Project ID

## Problema Resolvido ✅

O erro `"projectId": Invalid uuid.` foi resolvido adicionando o **EAS Project ID** correto ao arquivo `.env`.

## Variável de Ambiente Necessária

Adicione ao arquivo `.env` em ambos os apps (professional-app e patient-app):

```env
# Expo EAS Project ID (for push notifications)
EXPO_PUBLIC_PROJECT_ID=8e006901-c021-464d-bbcd-96d821ab62d0
```

## Importante ⚠️

O `EXPO_PUBLIC_PROJECT_ID` deve ser o **EAS Project ID** (UUID), não o Firebase Project ID.

- ❌ **Errado**: `EXPO_PUBLIC_PROJECT_ID=fisioflow-migration` (Firebase Project ID)
- ✅ **Correto**: `EXPO_PUBLIC_PROJECT_ID=8e006901-c021-464d-bbcd-96d821ab62d0` (EAS Project ID)

## Como Encontrar seu EAS Project ID

O EAS Project ID pode ser encontrado no arquivo `app.json`:

```json
"extra": {
  "eas": {
    "projectId": "8e006901-c021-464d-bbcd-96d821ab62d0"
  }
}
```

Ou executando:
```bash
eas project:info
```

## Arquivo .env Completo

Ambos os apps devem ter o seguinte `.env`:

```env
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyCz2c3HvQoV7RvFCbCaudbEEelEQaO-tY8
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=moocafisio.com.br
EXPO_PUBLIC_FIREBASE_PROJECT_ID=fisioflow-migration
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=fisioflow-migration.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=412418905255
EXPO_PUBLIC_FIREBASE_APP_ID=1:412418905255:web:07bc8e405b6f5c1e597782
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=G-PK7XQCBZ57

# Expo EAS Project ID (CRITICAL for push notifications)
EXPO_PUBLIC_PROJECT_ID=8e006901-c021-464d-bbcd-96d821ab62d0
```

Após criar o arquivo `.env`, reinicie o servidor Expo:

```bash
npx expo start --clear
```

## Teste

Depois de configurar, você deve ver no console:

```
✅ Expo Push Token: ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
```

Em vez de:

```
❌ Error: "projectId": Invalid uuid.
```

## Integração com Cloud Functions

- Os tokens de push são persistidos tanto em `users/{uid}` quanto em `profiles/{uid}` para que as Cloud Functions possam consumir as listas quando enviam lembretes 24h/2h.
- As Cloud Functions `appointmentReminders` e `appointmentReminders2h` agora disparam notificações por e-mail, WhatsApp e push (Expo Server) usando os tokens armazenados.
- Garanta que as funções estejam implantadas na região `southamerica-east1` para manter a consistência com o app.
