# Configuração Completa do Firebase

## 1. Criar Projeto

1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Clique em **"Adicionar projeto"** ou use um projeto existente
3. Configure:
   - **Nome**: `fisioflow-prod` (ou o desejado)
   - **Google Analytics**: opcional
   - **Região**: South America (São Paulo) quando aplicável

## 2. Configurar Serviços

### Authentication

1. **Authentication → Sign-in method**
2. Habilite **Email/Password** e, se desejar, **Google**, **Apple**, etc.
3. Em **Settings → Authorized domains**, adicione seu domínio de produção

### Firestore Database

1. **Firestore Database → Criar banco**
2. Escolha modo **Produção** e localização (ex.: `southamerica-east1`)
3. Configure **Regras de segurança** conforme o modelo do projeto (acesso por `organization_id` e role)

### Storage

1. **Storage → Começar**
2. Crie buckets ou use o padrão; configure regras de acesso por autenticação e organização

### Cloud Functions (opcional)

1. **Functions** — deploy via Firebase CLI (`firebase deploy --only functions`)
2. Variáveis de ambiente em `.env` ou Secret Manager

## 3. Variáveis de Ambiente

No `.env` do projeto (e no Cloud Build / CI):

```env
# Firebase (Web)
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

Para Cloud Functions, use `firebase functions:config` ou Secret Manager.

## 4. Estrutura de Coleções (Firestore)

Principais coleções: `organizations`, `profiles`, `patients`, `appointments`, `sessions`, `exercises`, `prescriptions`, etc. Documente as regras de segurança para cada coleção (ex.: `request.auth != null` e `resource.data.organization_id == request.auth.token.organization_id`).

## 5. Deploy e Emuladores

```bash
# Instalar CLI
npm install -g firebase-tools
firebase login

# Inicializar (se ainda não)
firebase init

# Emuladores locais (Auth, Firestore, Functions, Storage)
firebase emulators:start --only auth,firestore,functions,storage
```

## 6. Segurança

- **Regras do Firestore**: restringir leitura/escrita por `organization_id` e role do usuário
- **Storage**: regras por path e `request.auth`
- Rotacione chaves de API se expostas; use variáveis de ambiente em produção

## 🔗 Recursos

- [Documentação Firebase](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Auth](https://firebase.google.com/docs/auth)
