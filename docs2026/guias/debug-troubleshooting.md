# Debug e Troubleshooting

## Problemas Comuns

### Erro: "Module not found"

**Solução:**
```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Erro: "Failed to fetch"

**Causa:** Problema de CORS ou credenciais Firebase

**Solução:**
1. Verifique `.env` (VITE_FIREBASE_*)
2. Verifique Firestore Security Rules e Auth
3. Verifique se o domínio está em Authorized domains no Firebase Auth

### Erro: "Invalid JWT"

**Causa:** Token expirado ou inválido

**Solução:**
```typescript
// Firebase Auth gerencia refresh automaticamente; verifique onAuthStateChanged
import { getAuth, onAuthStateChanged } from 'firebase/auth';
onAuthStateChanged(getAuth(), (user) => { ... });
```

### Performance: Build lenta

**Solução:**
```bash
# Aumentar memória
NODE_OPTIONS='--max-old-space-size=4096' pnpm build
```

### Deploy falhando

**Causa:** Variáveis de ambiente faltando

**Solução:**
```bash
# Verificar variáveis no Cloud Build ou no Firebase Console (Functions config)
# Ou: firebase functions:config:get
```

## Debugging no Browser

### React DevTools

```tsx
// Adicionar nome para debug
const PatientForm = function PatientForm() {
  // ...
};
```

### Console Logs Estruturados

```typescript
// Ao invés de:
console.log(patient);

// Use:
console.log('Patient:', { id: patient.id, name: patient.name });
console.table([patient1, patient2, patient3]);
```

### Network Tab

Monitore:
- Requisições ao Firestore / Cloud Functions
- Tempo de resposta
- Status codes

## Debugging Firebase

### Ver Dados no Firestore

Use o **Firebase Console → Firestore** para inspecionar coleções e documentos.

### Ver Regras de Segurança

Edite e teste regras em **Firebase Console → Firestore → Regras** ou no arquivo `firestore.rules`.

### Testar Auth

```typescript
// Verificar user atual
import { getAuth } from 'firebase/auth';
const user = getAuth().currentUser;
console.log('User:', user?.uid, user?.email);
```

## Debugging Cloud Functions

### Logs

```typescript
// functions/src/index.ts
console.log('Request:', req.method, req.url);
```

### Testar Localmente

```bash
firebase emulators:start --only functions
```

## Debugging Testes

### Vitest (Unitários)

```bash
# Com UI interativa
pnpm test:ui

# Modo watch
pnpm test

# Apenas um arquivo
pnpm test paciente.test
```

### Playwright (E2E)

```bash
# Com UI
pnpm test:e2e:ui

# Apenas um teste
pnpm test:e2e tests/login.spec.ts

# Modo debug
pnpm test:e2e --debug
```

## Performance Issues

### Lighthouse

```bash
# Instalar
pnpm add -D lighthouse

# Rodar
npx lighthouse http://localhost:8080 --view
```

### Bundle Analyzer

```bash
pnpm build:analyze
```

## Error Tracking (Sentry)

Erros são automaticamente reportados ao Sentry.

Ver em: [sentry.io](https://sentry.io)

## Recursos de Suporte

- [GitHub Issues](https://github.com/fisioflow/fisioflow/issues)
- [Discord](https://discord.gg/fisioflow)
- [Email](mailto:suporte@fisioflow.com)
