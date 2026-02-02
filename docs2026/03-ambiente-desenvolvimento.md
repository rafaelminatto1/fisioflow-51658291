# 03. Ambiente de Desenvolvimento

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter as seguintes ferramentas instaladas:

### Obrigatório
| Ferramenta | Versão Mínima | Como Instalar |
|------------|---------------|---------------|
| **Node.js** | 18.0.0 | [nodejs.org](https://nodejs.org/) |
| **pnpm** | 9.15.0 | `npm install -g pnpm` |
| **Git** | 2.0+ | [git-scm.com](https://git-scm.com/) |

### Recomendado
| Ferramenta | Para Que Serve |
|------------|----------------|
| **VS Code** | IDE recomendada |
| **Chrome DevTools** | Debugging |
| **Postman** | Testar APIs |

## 🚀 Instalação Rápida

### 1. Clone o Repositório

```bash
git clone https://github.com/fisioflow/fisioflow.git
cd fisioflow
```

### 2. Instale as Dependências

```bash
pnpm install
```

### 3. Configure as Variáveis de Ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais do Firebase:

```env
# Firebase
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...

# Opcional: Analytics e Monitoring
VITE_SENTRY_DSN=seu-sentry-dsn
VITE_ENABLE_ANALYTICS=true
```

### 4. Inicie o Servidor de Desenvolvimento

```bash
pnpm dev
```

Acesse: [http://localhost:8080](http://localhost:8080)

## 🔧 Scripts Disponíveis

```json
{
  "dev": "vite",                              // Servidor de desenvolvimento
  "build": "vite build",                      // Build de produção
  "build:prod": "NODE_OPTIONS='--max-old-space-size=4096' vite build",
  "build:analyze": "ANALYZE=true vite build", // Analisa bundle size
  "preview": "vite preview",                  // Preview da build
  "lint": "eslint .",                         // Verifica código
  "lint:fix": "eslint . --fix",               // Corrige automaticamente
  "test": "vitest",                           // Roda testes
  "test:ui": "vitest --ui",                   // Testes com UI
  "test:coverage": "vitest run --coverage",   // Cobertura de testes
  "test:e2e": "playwright test",              // Testes E2E
  "test:e2e:ui": "playwright test --ui"       // E2E com UI
}
```

## 🗂️ Estrutura de Arquivos de Configuração

```bash
fisioflow/
├── .env                    # Variáveis de ambiente (não commitar)
├── .env.example            # Template de variáveis
├── .env.local              # Override local (não commitar)
├── package.json            # Dependências e scripts
├── pnpm-lock.yaml          # Lock file do pnpm
├── tsconfig.json           # Configuração TypeScript
├── tsconfig.app.json       # Config TypeScript app
├── tsconfig.node.json      # Config TypeScript node
├── vite.config.ts          # Configuração Vite
├── tailwind.config.js      # Configuração Tailwind
├── postcss.config.js       # Configuração PostCSS
├── eslint.config.js        # Configuração ESLint
├── vitest.config.ts        # Configuração Vitest
├── playwright.config.ts    # Configuração Playwright
├── firebase.json           # Configuração Firebase Hosting/Functions
└── components.json         # Config shadcn/ui
```

## ⚙️ Configuração do IDE

### VS Code (Recomendado)

Instale as extensões recomendadas:

```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension EditorConfig.EditorConfig
code --install-extension Streetsidesoftware.code-spell-checker
```

### Configurações do VS Code

Crie ou edite `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cn\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ],
  "files.associations": {
    "*.css": "tailwindcss"
  }
}
```

## 🔐 Configuração do Firebase

### 1. Criar Projeto

1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Clique em "Adicionar projeto" ou use um existente
3. Configure:
   - **Nome**: `fisioflow-dev`
   - **Região**: South America (São Paulo) quando aplicável

### 2. Obter Credenciais

No projeto Firebase:
1. Vá em **Configurações do projeto** (ícone de engrenagem) → **Configurações gerais**
2. Em "Seus apps", adicione um app Web e copie o objeto `firebaseConfig`:
   - **apiKey**, **authDomain**, **projectId**, **storageBucket**, **messagingSenderId**, **appId**, **measurementId** (opcional)

### 3. Firestore e Regras

1. No console Firebase, crie o banco Firestore (modo Produção ou Teste).
2. Configure as **Regras de segurança** em Firestore Database → Regras (conforme `firestore.rules` do projeto).
3. Para desenvolvimento local, use os emuladores: `firebase emulators:start --only auth,firestore,storage`.

### 4. Regras de Segurança

As regras do Firestore garantem acesso por organização e role. Edite em Firebase Console → Firestore → Regras ou via arquivo `firestore.rules` no projeto.

## 🐛 Debugging

### Chrome DevTools

1. Abra o DevTools (F12)
2. Aba **Console**: Veja logs e erros
3. Aba **Network**: Monitore requisições API
4. Aba **Application**:
   - **Local Storage**: Tokens de auth
   - **IndexedDB**: Cache do TanStack Query
   - **Service Workers**: PWA offline

### React DevTools

```bash
pnpm add -D @tanstack/react-query-devtools
```

Adicione no [main.tsx](../src/main.tsx):

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// No render
<ReactQueryDevtools initialIsOpen={false} />
```

### Source Maps

Os source maps são gerados automaticamente em desenvolvimento. Para produção, configure em `vite.config.ts`:

```typescript
export default defineConfig({
  build: {
    sourcemap: true, // Apenas para debug de produção
  },
});
```

## 🧪 Testando Localmente

### Testes Unitários

```bash
# Modo watch
pnpm test

# Uma vez
pnpm test:run

# Com coverage
pnpm test:coverage

# Com UI
pnpm test:ui
```

### Testes E2E

```bash
# Instalar browsers (primeira vez)
pnpm exec playwright install

# Rodar todos
pnpm test:e2e

# Com UI interativa
pnpm test:e2e:ui

# Apenas um arquivo
pnpm test:e2e tests/login.spec.ts
```

## 🐳 Docker (Opcional)

Para desenvolvimento com Docker:

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install
COPY . .
EXPOSE 8080
CMD ["pnpm", "dev", "--host"]
```

```bash
# Build e run
docker build -t fisioflow .
docker run -p 8080:8080 --env-file .env fisioflow
```

## 📱 Desenvolvimento Mobile

### Capacitor Setup

```bash
# Adicionar plataformas
pnpm cap:sync

# iOS
pnpm cap:open:ios
# Abre o Xcode

# Android
pnpm cap:open:android
# Abre o Android Studio
```

### Debug Mobile

1. **Safari** (iOS): Develop → [Seu iPhone] → Inspect
2. **Chrome** (Android): chrome://inspect → Devices

## 🔧 Troubleshooting

### Problema: "Module not found"

```bash
# Limpar cache e reinstalar
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

### Problema: Porta 8080 em uso

```bash
# Usar outra porta
pnpm dev --port 3000
```

### Problema: Erro de CORS no Firebase

Verifique se:
1. As credenciais do Firebase no `.env` estão corretas
2. As regras do Firestore e Auth estão configuradas
3. O domínio `localhost` está em Authorized domains no Firebase Auth (se aplicável)

### Problema: Build falha com "Out of memory"

```bash
# Aumentar memória do Node
NODE_OPTIONS='--max-old-space-size=4096' pnpm build
```

## 📚 Próximos Passos

- [Estrutura do Projeto](./04-estrutura-projeto.md) - Entenda a organização do código
- [Guia de Início Rápido](./guias/inicio-rapido.md) - Setup completo passo a passo
- [Configuração Firebase](./guias/configuracao-firebase.md) - Setup detalhado do Firebase

## 🔗 Links Úteis

- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)
