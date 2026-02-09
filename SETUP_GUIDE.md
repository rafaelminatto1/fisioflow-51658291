# FisioFlow - Guia de Configuração e Deploy

## Visão Geral

O FisioFlow utiliza **Google Firebase** e **Google Cloud Platform** como infraestrutura principal.

### Stack de Serviços

| Serviço | Uso | Substitui |
|---------|-----|-----------|
| Firebase Authentication | Autenticação de usuários | Supabase Auth |
| Firebase Firestore | Banco de dados principal | Supabase PostgreSQL |
| Firebase Realtime Database | Cache distribuído | Vercel KV |
| Firebase Storage | Armazenamento de arquivos | Vercel Blob |
| Firebase Remote Config | Feature flags dinâmicos | Vercel Edge Config |
| Firebase Cloud Functions | Funções serverless | Vercel Edge Functions |
| Firebase Hosting | Hospedagem web | Vercel Hosting |
| Google Analytics 4 | Analytics | Vercel Analytics |
| Google Cloud Vertex AI | IA e ML | OpenAI API |

---

## Pré-requisitos

1. **Node.js** 22+ instalado
2. **pnpm** como package manager
3. Conta **Google Cloud** com projeto Firebase criado
4. **Firebase CLI** instalado:
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

---

## 1. Configuração do Firebase

### 1.1 Criar Projeto Firebase

1. Acesse: https://console.firebase.google.com/
2. Clique em "Adicionar projeto"
3. Siga o assistente de configuração

### 1.2 Configurar Serviços Firebase

#### Authentication
- Ativar **Email/Password**
- Ativar **Google** (opcional)
- Configurar domínios autorizados

#### Firestore Database
- Criar banco de dados em **Produção**
- Região: `southamerica-east1` (São Paulo) ou mais próxima

#### Storage
- Ativar **Cloud Storage for Firebase**
- Região: mesma do Firestore
- Configurar regras de segurança

#### Remote Config
- Criar parâmetros de feature flags
- Verificar arquivo `src/lib/firebase/remote-config.ts` para referência

#### Cloud Functions
- Ativar **Cloud Functions** na região desejada
- Upgrade para plano **Blaze** (paga por uso) para funções

### 1.3 Obter Credenciais

No Firebase Console > Project Settings > General:

```bash
# Adicione ao seu .env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=projeto-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=projeto-id
VITE_FIREBASE_STORAGE_BUCKET=projeto-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

---

## 2. Configuração do Google Analytics

### 2.1 Criar Propriedade GA4

1. Acesse: https://analytics.google.com/
2. Crie uma conta GA4
3. Adicione a propriedade ao seu projeto Firebase

### 2.2 Configurar Measurement ID

Adicione ao `.env`:
```bash
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

---

## 3. Configuração de Integrações

### 3.1 Inngest (Background Jobs)

1. Acesse: https://app.inngest.com/
2. Crie um novo app
3. Configure as variáveis de ambiente:
   ```bash
   INNGEST_KEY=your-inngest-key
   INNGEST_EVENT_KEY=your-event-key
   INNGEST_SIGNING_KEY=your-signing-key
   ```

### 3.2 Evolution API (WhatsApp)

#### Docker Local:
```bash
docker run -d \
  --name evolution-api \
  --restart always \
  -p 8443:8443 \
  -e SERVER_PORT=8443 \
  evolutionapi/evolution-api:latest
```

#### Configure no .env:
```bash
WHATSAPP_API_URL=http://localhost:8443
WHATSAPP_API_KEY=your-api-key
WHATSAPP_VERIFY_TOKEN=your-verify-token
```

### 3.3 Resend (Email)

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
```



## 4. Deploy no Firebase

### 4.1 Build do Projeto

```bash
# Instalar dependências
pnpm install

# Build de produção
pnpm build:prod
```

### 4.2 Deploy

```bash
# Deploy Hosting + Functions
firebase deploy

# Deploy apenas Hosting
firebase deploy --only hosting

# Deploy apenas Functions
firebase deploy --only functions

# Deploy Firestore rules
firebase deploy --only firestore:rules
```

### 4.3 Configurar Firebase Hosting

O arquivo `firebase.json` já está configurado. Verifique:

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      },
      {
        "source": "/api/**",
        "function": "api"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(jpg|jpeg|png|gif|webp|svg)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

---

## 5. Deploy de Cloud Functions

### 5.1 Configurar Functions

As functions estão em `/functions`:

```bash
# Build das functions
cd functions
pnpm build
cd ..

# Deploy
firebase deploy --only functions
```

### 5.2 Variáveis de Ambiente das Functions

Configure via Firebase Console ou CLI:

```bash
firebase functions:config:set \
  openai.api_key="sk-..." \
  resend.api_key="re_..." \
  whatsapp.api_url="https://..."
```

---

## 6. Monitoramento e Logging

### 6.1 Firebase Crashlytics

```bash
pnpm add @sentry/react
```

### 6.2 Cloud Logging

Logs automáticos do Cloud Functions são visíveis no:
- Firebase Console > Functions > Logs
- Google Cloud Console > Logging

---

## 7. CI/CD

### 7.1 GitHub Actions

Crie `.github/workflows/deploy-firebase.yml`:

```yaml
name: Deploy to Firebase

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '22'

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Install dependencies
        run: pnpm install

      - name: Build
        run: pnpm build:prod
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
          # ... outras variáveis

      - name: Deploy to Firebase
        uses: w9jds/firebase-action@master
        with:
          args: deploy --only hosting,functions
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

### 7.2 Secrets do GitHub

Configure no GitHub Repository > Settings > Secrets:
- `FIREBASE_TOKEN` (obtenha com `firebase login:ci`)
- `FIREBASE_API_KEY`
- `FIREBASE_PROJECT_ID`
- etc.

---

## 8. Comandos Úteis

```bash
# Emular localmente (útil para desenvolvimento)
firebase emulators:start

# Testar functions localmente
firebase functions:shell

# Ver logs em tempo real
firebase functions:log

# Limpar cache local
pnpm clean:all

# Ver status do deployment
firebase deploy --only hosting --dry-run
```

---

## 9. Troubleshooting

### Erro de CORS
- Configure regras de CORS no Cloud Functions
- Verifique `firebase.json` headers

### Functions timeout
- Aumente timeout em `firebase.json`:
  ```json
    "functions": [
      {
        "source": "functions",
        "codebase": "default",
        "ignore": [
          "**/node_modules/**",
          "**/.ts",
          "**/map"
        ],
        "predeploy": [
          "pnpm --filter ./functions build"
        ]
      }
    ]
  ```

### Problemas de build
- Limpe `.vite` cache
- Delete `node_modules` e reinstale

---

## 10. Suporte

- **Firebase Documentation**: https://firebase.google.com/docs
- **Firebase Support**: https://firebase.google.com/support
- **Google Cloud Documentation**: https://cloud.google.com/docs
- **Stack Overflow**: Use tags `firebase` e `google-cloud-platform`
