# 11. Deploy e Produção (Firebase + Google Cloud)

## 🚀 Visão Geral

O FisioFlow é deployado **100% em Firebase e Google Cloud (GCP)**:

- **Frontend (SPA):** Firebase Hosting
- **Backend / APIs:** Cloud Functions (Firebase)
- **CI/CD:** Cloud Build (ou GitHub Actions com deploy Firebase)
- **Crons:** Cloud Scheduler + Cloud Functions
- **Monitoramento:** Cloud Monitoring, Sentry (opcional)

Não utilizamos Netlify. Veja o [Plano Firebase + GCP](./PLANO_FIREBASE_GCP.md) para a visão completa.

## 📦 Deploy no Firebase Hosting

### Configuração (firebase.json)

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [{ "key": "Cache-Control", "value": "max-age=31536000,immutable" }]
      },
      {
        "source": "**",
        "headers": [
          { "key": "X-Content-Type-Options", "value": "nosniff" },
          { "key": "X-Frame-Options", "value": "DENY" },
          { "key": "X-XSS-Protection", "value": "1; mode=block" },
          { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
        ]
      }
    ]
  },
  "functions": {
    "source": "functions",
    "predeploy": ["npm run build"]
  }
}
```

### Build e deploy manual

```bash
# Build do frontend
pnpm build

# Deploy apenas do hosting
firebase deploy --only hosting

# Deploy das Cloud Functions
firebase deploy --only functions

# Deploy completo (hosting + functions)
firebase deploy
```

### Variáveis de ambiente (build)

Para o frontend (Vite), as variáveis `VITE_*` precisam estar disponíveis no **momento do build**. Opções:

1. **Cloud Build:** definir no passo de build (Secret Manager ou substituição).
2. **Local / GitHub Actions:** arquivo `.env.production` ou secrets no CI.

```bash
# Exemplo .env.production (não commitar valores reais)
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_SENTRY_DSN=...
VITE_ENABLE_ANALYTICS=true
```

## 🔄 CI/CD (Cloud Build)

Exemplo de pipeline no Google Cloud Build:

```yaml
# cloudbuild.yaml (na raiz do projeto)
steps:
  - name: 'node:18'
    entrypoint: pnpm
    args: ['install', '--frozen-lockfile']
  - name: 'node:18'
    entrypoint: pnpm
    args: ['run', 'build']
    env:
      - 'VITE_FIREBASE_API_KEY=${_VITE_FIREBASE_API_KEY}'
      - 'VITE_FIREBASE_PROJECT_ID=${_VITE_FIREBASE_PROJECT_ID}'
      # ... demais VITE_*
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'firebase'
      - 'deploy'
      - '--only'
      - 'hosting,functions'
      - '--token'
      - '${_FIREBASE_TOKEN}'
```

Substituir `${_FIREBASE_TOKEN}` e `${_VITE_*}` por variáveis do Cloud Build (ou Secret Manager). Configurar trigger no repositório (GitHub, Cloud Source Repositories, etc.).

### Alternativa: GitHub Actions + Firebase

Se preferir manter o CI no GitHub:

```yaml
# .github/workflows/deploy.yml
name: Deploy Firebase

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm tsc --noEmit
      - run: pnpm test:run

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
          # ... demais secrets
      - uses: w9jds/firebase-action@master
        with:
          args: deploy --only hosting,functions --token ${{ secrets.FIREBASE_TOKEN }}
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

## 📊 Monitoramento

### Sentry (Error Tracking)

```typescript
// main.tsx
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    new Sentry.BrowserTracing({
      tracePropagationTargets: ['localhost', /\.firebaseapp\.com$/, /\.web\.app$/],
    }),
    new Sentry.Replay({ maskAllText: true, blockAllMedia: true }),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  environment: import.meta.env.MODE,
});
```

### Firebase Analytics (opcional)

```typescript
import { getAnalytics } from 'firebase/analytics';
const analytics = getAnalytics(app);
// usar logEvent(analytics, 'event_name', { ... }) onde necessário
```

### Web Vitals

Manter coleta de Web Vitals (lib existente) e enviar para Google Analytics, Sentry ou Cloud Monitoring conforme preferência.

## 💾 Backups

- **Firestore:** exportação via `gcloud firestore export gs://SEU_BUCKET/backups`; agendar com Cloud Scheduler se desejar backups automáticos.
- **Storage:** cópias periódicas do bucket (gsutil ou script em Cloud Function).
- Restauração: Firebase Console ou `gcloud firestore import`.

## 🔄 Rollback

- **Firebase Hosting:** no Console, em Hosting → Histórico de versões, fazer rollback para uma versão anterior.
- **Cloud Functions:** redeploy da versão anterior do código e `firebase deploy --only functions`.

## 🔐 Segurança em Produção

- **Headers:** configurados em `firebase.json` (hosting.headers) conforme exemplo acima.
- **Rate limiting:** implementar em Cloud Functions (por IP ou userId) com Firestore ou Memorystore para contagem.

## 🔗 Recursos Relacionados

- [Plano Firebase + GCP](./PLANO_FIREBASE_GCP.md) - Arquitetura e checklist completo
- [Configuração Firebase](./guias/configuracao-firebase.md) - Setup do projeto
- [Configuração Firebase Hosting](./guias/configuracao-firebase-hosting.md) - Deploy e domínio
- [APIs e Integrações](./07-api-integracoes.md) - Cloud Functions
