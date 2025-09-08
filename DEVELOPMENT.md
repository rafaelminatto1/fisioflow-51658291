# FisioFlow - Guia de Desenvolvimento

## 🚀 Setup do Ambiente de Desenvolvimento

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn
- Git

### 1. Clonar e Instalar
```bash
git clone [repository-url]
cd fisioflow-51658291
npm install
```

### 2. Configurar Variáveis de Ambiente
```bash
cp .env.example .env
# Edite o arquivo .env com suas credenciais do Supabase
```

### 3. Scripts Disponíveis
```bash
# Desenvolvimento
npm run dev              # Inicia servidor de desenvolvimento
npm run build           # Build para produção
npm run build:dev       # Build para desenvolvimento
npm run preview         # Preview do build

# Qualidade do Código
npm run lint            # Executa ESLint
npm run test            # Executa testes com Vitest
npm run test:ui         # Interface gráfica dos testes
npm run test:coverage   # Cobertura de testes
```

## 🏗️ Estrutura do Projeto

```
src/
├── components/          # Componentes React
│   ├── ui/             # Componentes base (shadcn/ui)
│   ├── forms/          # Formulários
│   ├── layout/         # Layout e navegação
│   └── ...
├── hooks/              # Custom hooks
├── lib/                # Utilitários e configurações
├── pages/              # Páginas da aplicação
├── types/              # Definições de tipos TypeScript
├── contexts/           # React contexts
└── test/               # Testes
```

## 🛠️ Tecnologias Utilizadas

- **React 18** - Framework principal
- **TypeScript** - Tipagem estática
- **Vite** - Build tool e dev server
- **Tailwind CSS** - Framework CSS
- **shadcn/ui** - Componentes UI
- **Supabase** - Backend as a Service
- **React Query** - State management e cache
- **React Hook Form** - Formulários
- **Vitest** - Framework de testes
- **ESLint** - Linting

## 🏆 Status da Qualidade do Código

✅ **0 erros de lint**  
✅ **0 avisos de lint**  
✅ **Build sucessful**  
✅ **TypeScript compilado**  
✅ **React Fast Refresh compatível**

## 🔧 Configurações de Desenvolvimento

### ESLint
- Configurado com TypeScript
- Regras para React e React Hooks
- Ignora parâmetros com prefixo `_`

### Vite
- Hot module replacement
- Otimizações de build
- Code splitting automático
- Remoção de console.log em produção

### Vitest
- Configurado para testes unitários
- Cobertura de código
- Mock de dependências

## 📝 Padrões de Código

### Imports
- Use paths absolutos com `@/` 
- Agrupe imports por categoria
- Remova imports não utilizados

### Componentes
- Use TypeScript para todas as props
- Implemente interfaces claras
- Evite `any` - use tipos específicos

### Hooks
- Separe hooks em arquivos próprios
- Use useCallback para funções
- Gerencie dependências corretamente

## 🐛 Debug e Desenvolvimento

### Logs
```typescript
import { errorLogger } from '@/lib/errors/logger';

errorLogger.logError(error);
errorLogger.logWarning(message);
errorLogger.logInfo(data);
```

### Environment Variables
- Use `VITE_` prefix para variáveis do client
- Configure no `.env` local
- Nunca commite credenciais reais

## 🚀 Deploy

### Build de Produção
```bash
npm run build
npm run preview  # testar build local
```

### Otimizações Incluídas
- Code splitting por vendor/ui/supabase
- Tree shaking automático
- Minificação e compressão
- Remoção de logs de desenvolvimento

---

## 🆘 Solução de Problemas

### Build Falha
1. Limpe node_modules: `rm -rf node_modules && npm install`
2. Verifique ESLint: `npm run lint`
3. Verifique tipos: `npx tsc --noEmit`

### Testes Falhando
1. Atualize snapshots: `npm run test -- -u`
2. Verifique mocks estão corretos
3. Importe paths foram atualizados

### Performance Lenta
1. Verifique bundle size: analise o build
2. Implemente lazy loading
3. Otimize re-renders com memo/callback