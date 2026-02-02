# Ambiente de Desenvolvimento Local

## Setup Completo

### 1. Fork e Clone

```bash
# Fork no GitHub
# Clone seu fork
git clone https://github.com/seu-usuario/fisioflow.git
cd fisioflow
```

### 2. Instalar Dependências

```bash
pnpm install
```

### 3. Configurar Firebase (emuladores opcional)

```bash
# Emuladores locais (Auth, Firestore, Storage, Functions)
firebase emulators:start --only auth,firestore,storage,functions
```

### 4. Configurar Environment

```bash
cp .env.example .env.local
# Edite o arquivo com suas credenciais
```

### 5. Iniciar Servidor

```bash
pnpm dev
```

Acesse: [http://localhost:8080](http://localhost:8080)

## Ferramentas de Desenvolvimento

### VS Code Extensions

```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss
code --install-extension ms-vscode.vscode-typescript-next
```

### Chrome DevTools

1. Abra DevTools (F12)
2. **React DevTools**: Inspecione componentes
3. **TanStack Query DevTools**: Cache e queries

### Firebase Emulator UI

```bash
firebase emulators:start
# Acesse a URL indicada no terminal (ex.: http://localhost:4000)
```

## Debugging

### React Components

```tsx
// Use React DevTools ou
console.log('Debug:', { patient, appointment });
```

### API Calls

```typescript
// Firebase: use o console do navegador ou Firebase Debug View
// Para Firestore, ative persistência e inspecione no DevTools
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';
```

### Performance

```bash
# Analisar bundle
pnpm build:analyze

# Abre http://localhost:8080/stats
```

## Hot Reload

Vite tem HMR automático. Mudanças refletem instantaneamente.

## Testing Local

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e
```

## Troubleshooting

### Porta em uso

```bash
# Mudar porta
pnpm dev --port 3000
```

### Cache corrompido

```bash
rm -rf node_modules .vite
pnpm install
pnpm dev
```

### Emuladores Firebase

```bash
# Parar emuladores
# Ctrl+C

# Ver status
firebase emulators:start --only firestore
```

## 🔗 Recursos

- [Vite Dev Server](https://vitejs.dev/guide/dev-features.html)
- [React Fast Refresh](https://react.dev/reference/react/react-dom#fast-refresh)
- [Firebase Emulators](https://firebase.google.com/docs/emulator-suite)
