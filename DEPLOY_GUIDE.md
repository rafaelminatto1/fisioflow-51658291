# FisioFlow Agenda - Guia de Deploy

## Visão Geral

Este documento descreve o processo completo de deploy das melhorias da agenda do FisioFlow para produção.

---

## Pré-Requisitos

### Ambiente de Desenvolvimento

```bash
# Verificar versão do Node.js
node --version  # Recomendado: >= 18.x

# Verificar versão do npm
npm --version # Recomendado: >= 9.x

# Verificar versão do Firebase CLI
firebase --version # Recomendado: >= 13.x

# Verificar React Native (se aplicável)
npx react-native --version # Recomendado: >= 0.73.x
```

### Dependências

```json
{
  "firebase": ">=10.7.1",
  "react": ">=18.2.0",
  "react-native": ">=0.73.0",
  "date-fns": ">=3.0.0",
  "framer-motion": ">=11.0.0",
  "@tanstack/react-query": "^5.0.0"
}
```

---

## 1. Checklist Antes do Deploy

### Frontend (React Web)

- [ ] Testes unitários executando com sucesso
- [ ] Testes E2E passando
- [ ] Linting sem erros (`npm run lint`)
- [ ] TypeScript sem erros (`npm run type-check`)
- [ ] Build de produção funcionando (`npm run build`)
- [ ] Tamanho do bundle dentro do budget (< 300KB)
- [ ] Variáveis de ambiente configuradas
- [ ] Firebase endpoints atualizados
- [ ] Keys de API Firebase configuradas

### Frontend (React Native)

- [ ] Testes funcionais passando
- [ ] Build de produção funcionando
- [ ] Versões mínimas do iOS/Android atendidas
- [ ] Firebase configurado para iOS e Android
- [ ] Capacidades otimizadas
- [ ] Offline sync testado
- [ ] Haptic feedback testado

### Backend (Firebase Functions)

- [ ] Functions deploy testado em ambiente de staging
- [ ] Emuladores locais funcionando
- [ ] Genkit flows testados
- [ ] Performance monitor configurado
- [ ] Logs de erros implementados
- [ ] Rate limiting configurado

---

## 2. Configuração de Ambiente

### Variáveis de Ambiente

```bash
# .env.production
FIREBASE_PROJECT_ID=fisioflow-production
FIREBASE_API_KEY=AIzaSy...
FIREBASE_AUTH_DOMAIN=fisioflow.firebaseapp.com
FIREBASE_DATABASE_URL=fisioflow-production.firebaseio.com
FIREBASE_STORAGE_BUCKET=fisioflow-production.appspot.com
VITE_FIREBASE_AUTH_DOMAIN=fisioflow.firebaseapp.com
VITE_FIREBASE_API_KEY=AIzaSy...

# API Keys externas
GOOGLE_CALENDAR_CLIENT_ID=...
GOOGLE_CALENDAR_CLIENT_SECRET=...
ZOOM_API_KEY=...
ZOOM_API_SECRET=...
```

### Firebase Project

```javascript
// firebase.json
{
  "firestore": {
    "indexes": "firestore.indexes.json",
    "rules": "firestore.rules",
    "indexes": "indexes": "firestore.indexes.json"
  },
  "functions": {
    "source": "functions",
    "runtimeopts": {
      "timeoutSeconds": 540,
      "memory": "1024MiB",
      "maxInstances": 100
    },
    "env": {
      "GENKIT_ENV": "production",
      "FIREBASE_CONFIG": "firebase-config.json"
    }
  },
  "hosting": {
    "public": "build",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ]
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```

---

## 3. Deploy do Frontend

### React Web (Vite)

```bash
# 1. Build de produção
npm run build

# 2. Otimizar bundle (opcional)
npx vite-bundle-visualizer dist

# 3. Deploy no Firebase Hosting
firebase deploy --only hosting

# 4. Verificar
firebase deploy --only hosting:changelog
```

### React Native

```bash
# 1. Build iOS
cd apps/professional-ios
npx pod-install
npm run ios

# 2. Build Android
cd apps/professional-android
cd android && ./gradlew assembleRelease

# 3. Deploy (via EAS ou Fastlane)
# Seguir guia específico de cada plataforma
```

---

## 4. Deploy do Backend (Firebase Functions)

```bash
# 1. Instalar dependências
cd functions
npm install

# 2. Deploy functions
firebase deploy --only functions

# 3. Verificar deploy
firebase functions:list
```

---

## 5. Configuração de Firestore

### Indexes

```javascript
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "appointments",
      "queryScope": null,
      "fields": [
        { "fieldPath": "patientId", "order": "ASCENDING" },
        { "fieldPath": "startTime", "order": "ASCENDING" },
        { "fieldPath": "startTime", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "patients",
      "queryScope": null,
      "fields": [
        { "fieldPath": "name", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

### Security Rules

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Regras básicas de autenticação
    match /appointments/{appointment} {
      allow read, write: if request.auth != null &&
        request.auth.uid == request.resource.data.patientId ||
        request.auth.token.admin == true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth.token.admin == true;
    }

    match /patients/{patient} {
      allow read: if request.auth != null &&
        request.auth.uid == request.resource.data.userId ||
        request.auth.token.admin == true;
      allow write: if request.auth.token.admin == true;
    }
  }
}
```

---

## 6. Monitoramento e Analytics

### Firebase Performance Monitoring

```typescript
// functions/src/monitoring/performance.ts
import * as functions from "firebase-functions/v2";
import { performance } from "firebase-functions/performance";

export const recordAppointmentCreated = functions.https.onCall(
  async (request, response) => {
    const startTime = Date.now();

    // Operação de criação de agendamento
    // ... código ...

    performance.trace({
      name: 'appointment_created',
      startTime,
      attributes: { patientId: request.data.patientId },
    });

    // Registrar métrica personalizada
    performance.recordMetric('appointment_create_duration', Date.now() - startTime);
  }
);
```

### Crashlytics

```typescript
// src/lib/crashlytics.ts
import * as Crashlytics from '@sentry/react';
import { FirebaseCrashlytics } from '@sentry/react';

const crashlytics = new Crashlytics();

crashlytics.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === 'production',
  tracesSampleRate: 0.1,
});

export { trackError, trackWarning, trackInfo } from './analytics';
```

---

## 7. Rollback Procedures

### Frontend Rollback

```bash
# Rollback para versão anterior
firebase deploy --only hosting --version <version-id>

# Firebase Storage
# firebase storage:deploy --only storage
```

### Functions Rollback

```bash
# Rollback functions
firebase deploy --only functions --version <version-id>

# Firestore rules
# firebase deploy --only firestore:rules
```

### Database Rollback

```javascript
// Função de emergência
import { getFirestore } from 'firebase/firestore';

async function emergencyRollback(backupId: string) {
  const db = getFirestore();

  // Restaurar backup
  const backupRef = doc(db, 'backups', backupId);
  const snapshot = await getDoc(backupRef);

  if (snapshot.exists()) {
    const data = snapshot.data();

    // Restaurar coleções
    for (const [collection, docs] of Object.entries(data)) {
      for (const doc of docs) {
        await setDoc(doc(db, collection, doc.id), doc);
      }
    }

    console.log('Rollback completed:', backupId);
  }
}
```

---

## 8. CI/CD Pipeline

### GitHub Actions (exemplo)

```yaml
name: Deploy FisioFlow Agenda

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18.x'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:e2e

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Build and test
        run: npm run build
      - name: Upload to Firebase
        uses: w9jds/firebase-action@main
        with:
          args: deploy --only hosting --message "Deploy from GitHub Actions"
        env:
          FIREBASE_SERVICE_ACCOUNT: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}

  deploy-functions:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy Firebase Functions
        uses: w9jds/firebase-action@main
        with:
          args: deploy --only functions --message "Deploy functions from GitHub Actions"
        env:
          FIREBASE_SERVICE_ACCOUNT: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

---

## 9. Verificação Pós-Deploy

### Testes de Smoke Test

```typescript
// e2e/critical-flows.smoke.spec.ts
import { test, expect } from '@playwright/test';

test('agenda carrega corretamente', async ({ page }) => {
  await page.goto('/agenda');

  // Verificar se componentes principais estão visíveis
  await expect(page.locator('text=Quick Filtros')).toBeVisible();
  await expect(page.locator('text=Calendário')).toBeVisible();
  await expect(page.locator('text=Agendamentos')).toBeVisible();
});

test('criar novo agendamento', async ({ page }) => {
  await page.goto('/agenda');

  // Clicar em novo agendamento
  await page.click('text=Novo Agendamento');

  // Preencher formulário
  await page.fill('[placeholder="Nome do paciente"]', 'João Silva');
  await page.click('[role="dialog"] button:has-text("Salvar")');

  // Verificar sucesso
  await expect(page.locator('text=Agendamento criado com sucesso')).toBeVisible({ timeout: 5000 });
});

test('filtrar agendamentos', async ({ page }) => {
  await page.goto('/agenda');

  // Aplicar filtro
  await page.click('text=Hoje');

  // Verificar filtro aplicado
  await expect(page.locator('.filter-active')).toBeVisible();
  await expect(page.locator('text=Filtros: Hoje')).toBeVisible();
});
```

### Performance Checks

```typescript
// scripts/verify-performance.ts
interface PerformanceMetrics {
  bundleSize: number;
  loadTime: number;
  renderTime: number;
  fcp: number;
  lcp: number;
}

async function verifyPerformance(): Promise<PerformanceMetrics> {
  const metrics: PerformanceMetrics = {
    bundleSize: 0,
    loadTime: 0,
    renderTime: 0,
    fcp: 0,
    lcp: 0,
  };

  // Verificar build size
  const fs = await import('fs');
  const buildDir = fs.readdirSync('dist');

  for (const file of buildDir) {
    if (file.endsWith('.js')) {
      const filePath = path.join('dist', file);
      const stats = fs.statSync(filePath);
      metrics.bundleSize += stats.size;
    }
  }

  console.log('Bundle size:', metrics.bundleSize / 1024, 'KB');

  // Verificar se dentro do budget
  if (metrics.bundleSize > 300 * 1024) {
    console.warn('Bundle size exceeds 300KB budget!');
  }

  return metrics;
}
```

---

## 10. Troubleshooting Comum

### Erros de Build

```
Error: Module not found: 'react-window'
Solução: npm install react-window react-virtualized-auto-sizer

Error: Failed to compile
Solução: Verificar imports no arquivo, verificar se o arquivo existe

Error: "Cannot find module '@/components/xxx'"
Solução: Verificar tsconfig.json include paths
```

### Erros de Deploy

```
Error: Insufficient permissions
Solução: Verificar IAM roles no Firebase Console

Error: Function execution timed out
Solução: Aumentar timeout no firebase.json

Error: Storage quota exceeded
Solução: Limpar arquivos antigos, aumentar quota
```

### Erros de Runtime

```
Error: "Document is missing required index"
Solução: firebase firestore:indexes deploy

Error: "Invalid API key"
Solução: Verificar variáveis de ambiente

Error: "Component failed to render"
Solução: Verificar console do navegador, verificar imports
```

---

## 11. Notas de Manutenção

### Backup Automático

```typescript
// functions/src/backup/scheduled-backup.ts
import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase/firestore';

export const scheduledBackup = functions.pubsub
  .schedule('0 2 * *') // 2h da madrugada
  .timeZone('America/Sao_Paulo')
  .onRun(async (context) => {
    const db = admin.firestore();

    // Backup de agendamentos
    const appointmentsSnapshot = await db
      .collection('appointments')
      .get();

    // Salvar no storage
    const bucket = admin.storage().bucket('backups');
    const timestamp = Date.now();

    await bucket.upload(
      `appointments-backup-${timestamp}.json`,
      JSON.stringify(appointmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })))
    );
  });
```

### Limpe de Cache

```typescript
// scripts/cleanup-cache.ts
import { clearCache } from './lib/cache/cleanup';

async function cleanupOldCache() {
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

  // Remover entradas antigas do IndexedDB
  await clearCache({ olderThan: thirtyDaysAgo });

  console.log('Cache limpo');
}
```

---

## 12. Checklist Final de Go-Live

### Última Verificação Antes de Deploy

- [ ] Todas as features testadas manualmente
- [ ] Performance validado em ambiente de staging
- [ ] Backup dos dados mais recente criado
- [ ] Plano de rollback documentado
- [ ] Equipe de monitoramento configurada
- [ ] Notificações aos usuários preparadas

### Após Deploy

- [ ] Deploy concluído sem erros
- [ ] Testes de smoke test passando
- [ ] Monitoramento ativo e recebendo dados
- [ ] Performance dentro dos limites
- [ ] Crash reports sendo recebidos
- [ ] Analytics dashboards funcionando

---

## Suporte

Em caso de problemas durante o deploy, consulte:

1. Logs do Firebase Console
2. Crashlytics dashboard
3. Performance dashboard
4. GitHub Actions workflows
5. Documentação: `IMPLEMENTACAO_FINAL.md`
