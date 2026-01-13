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

### 3. Configurar Supabase Local

```bash
# Iniciar Supabase local
supabase start

# Linkar ao projeto remoto
supabase link --project-ref seu-project-id
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

### Supabase Local GUI

```bash
supabase start
# Acesse http://localhost:54323
```

## Debugging

### React Components

```tsx
// Use React DevTools ou
console.log('Debug:', { patient, appointment });
```

### API Calls

```typescript
// Ativar logging do Supabase
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, key, {
  global: {
    headers: { 'x-my-header': 'fisioflow-app' },
  },
  db: { schema: 'public' },
  auth: {
    debug: true,  // Ativa logs de auth
  },
});
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

### Supabase local

```bash
# Reset database
supabase db reset

# Ver logs
supabase status
```

## 🔗 Recursos

- [Vite Dev Server](https://vitejs.dev/guide/dev-features.html)
- [React Fast Refresh](https://react.dev/reference/react/react-dom#fast-refresh)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
