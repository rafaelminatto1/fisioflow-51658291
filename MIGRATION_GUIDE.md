# 🔄 FisioFlow - Guia de Migração

**Data:** 2026-02-18
**Versão:** 2.0.0

---

## 📋 Visão Geral

Este guia ajuda desenvolvedores a migrar para as novas features implementadas na Fase 1 do Roadmap 2026.

**Boa notícia:** ✅ Todas as mudanças são **retrocompatíveis**. Nenhuma ação obrigatória é necessária.

---

## 🎯 O Que Mudou?

### Adicionado ✅
- Performance monitoring
- System health dashboard
- Test helpers
- Accessibility hooks
- Global error boundary
- CI/CD workflows
- Documentação completa

### Modificado 🔄
- `vite.config.ts` - Bundle splitting otimizado
- `src/App.tsx` - Global error boundary
- `src/routes.tsx` - System health route
- `package.json` - Novos scripts

### Removido ❌
- Nada foi removido!

---

## 🚀 Migração Opcional (Recomendada)

### 1. Performance Monitoring

#### Antes (sem monitoring)
```typescript
function MyComponent() {
  const loadData = async () => {
    const data = await fetchData();
    return data;
  };
}
```

#### Depois (com monitoring)
```typescript
import { performanceMonitor } from '@/lib/monitoring/performance';

function MyComponent() {
  const loadData = async () => {
    return performanceMonitor.measure('loadData', async () => {
      const data = await fetchData();
      return data;
    });
  };
}
```

**Benefício:** Tracking automático de performance

---

### 2. Acessibilidade

#### Antes (sem feedback para screen readers)
```typescript
function MyForm() {
  const handleSave = async () => {
    await saveData();
    toast.success('Salvo!');
  };
}
```

#### Depois (com ARIA announcements)
```typescript
import { useAnnouncer } from '@/hooks/useAccessibility';

function MyForm() {
  const { announceSuccess } = useAnnouncer();
  
  const handleSave = async () => {
    await saveData();
    toast.success('Salvo!');
    announceSuccess('Dados salvos com sucesso');
  };
}
```

**Benefício:** Melhor experiência para usuários com deficiências

---

### 3. Testing

#### Antes (setup manual)
```typescript
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('MyComponent', () => {
  it('should render', () => {
    const queryClient = new QueryClient();
    
    render(
      <QueryClientProvider client={queryClient}>
        <MyComponent />
      </QueryClientProvider>
    );
  });
});
```

#### Depois (com test helpers)
```typescript
import { renderWithProviders } from '@/lib/testing/test-helpers';

describe('MyComponent', () => {
  it('should render', () => {
    renderWithProviders(<MyComponent />);
  });
});
```

**Benefício:** Menos boilerplate, testes mais limpos

---

### 4. Error Handling

#### Antes (sem error boundary)
```typescript
function MyComponent() {
  // Erros não tratados podem quebrar a aplicação
  const data = riskyOperation();
}
```

#### Depois (com error boundary automático)
```typescript
// Nada muda no código!
// Global error boundary captura automaticamente
function MyComponent() {
  const data = riskyOperation();
}
```

**Benefício:** Aplicação mais robusta, melhor UX em erros

---

### 5. Animações Acessíveis

#### Antes (sem considerar preferências)
```typescript
import { motion } from 'framer-motion';

function MyComponent() {
  return (
    <motion.div animate={{ scale: 1.1 }}>
      Content
    </motion.div>
  );
}
```

#### Depois (respeitando preferências)
```typescript
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useAccessibility';

function MyComponent() {
  const prefersReducedMotion = useReducedMotion();
  
  return (
    <motion.div 
      animate={prefersReducedMotion ? {} : { scale: 1.1 }}
    >
      Content
    </motion.div>
  );
}
```

**Benefício:** Respeita preferências de acessibilidade

---

## 📦 Novos Scripts NPM

### Performance
```bash
# Analisar bundle size
pnpm analyze

# Lighthouse audit
pnpm lighthouse
```

### Testing
```bash
# Testes de componentes
pnpm test:components

# Testes de hooks
pnpm test:hooks
```

### Uso
```bash
# Antes
pnpm test

# Depois (mais específico)
pnpm test:components  # Apenas componentes
pnpm test:hooks       # Apenas hooks
pnpm test             # Todos (ainda funciona)
```

---

## 🔧 Configuração Necessária

### 1. GitHub Secrets (para CI/CD)

Se você quer usar o staging environment:

```bash
# No GitHub: Settings > Secrets > Actions

STAGING_FIREBASE_API_KEY=...
STAGING_FIREBASE_AUTH_DOMAIN=...
STAGING_FIREBASE_PROJECT_ID=...
FIREBASE_SERVICE_ACCOUNT_STAGING=...
SLACK_WEBHOOK_URL=...
```

### 2. Sentry (para error tracking)

Se você quer usar o Sentry:

```bash
# .env
SENTRY_AUTH_TOKEN=...
SENTRY_ORG=fisioflow
SENTRY_PROJECT=fisioflow-web
```

### 3. Lighthouse CI (opcional)

Já configurado! Apenas faça PR e veja os resultados.

---

## 🎯 Checklist de Migração

### Para Cada Componente

- [ ] Adicionar performance tracking (opcional)
- [ ] Adicionar ARIA announcements (recomendado)
- [ ] Adicionar testes (recomendado)
- [ ] Respeitar reduced motion (recomendado)
- [ ] Adicionar keyboard navigation (se aplicável)

### Para Cada Página

- [ ] Adicionar page load tracking
- [ ] Testar com screen reader
- [ ] Validar keyboard navigation
- [ ] Verificar contraste de cores
- [ ] Adicionar skip links (se necessário)

### Para Cada API Call

- [ ] Adicionar API tracking (opcional)
- [ ] Adicionar error handling
- [ ] Adicionar loading states
- [ ] Adicionar retry logic

---

## 📊 Priorização

### Alta Prioridade (Fazer Agora)
1. ✅ Atualizar dependências: `pnpm install`
2. ✅ Executar testes: `pnpm test`
3. ✅ Validar build: `pnpm build`
4. ✅ Ler documentação: `docs2026/`

### Média Prioridade (Próximas Semanas)
1. 🔄 Adicionar ARIA announcements em forms
2. 🔄 Adicionar performance tracking em operações críticas
3. 🔄 Escrever testes para componentes novos
4. 🔄 Validar acessibilidade com screen reader

### Baixa Prioridade (Quando Possível)
1. 📝 Refatorar componentes antigos
2. 📝 Adicionar mais testes
3. 📝 Melhorar documentação inline
4. 📝 Otimizar performance

---

## 🐛 Troubleshooting

### Build Falha

**Problema:** `pnpm build` falha

**Solução:**
```bash
# Limpar cache
pnpm clean:vite

# Reinstalar dependências
rm -rf node_modules
pnpm install

# Build novamente
pnpm build
```

### Testes Falhando

**Problema:** Testes quebrados após atualização

**Solução:**
```bash
# Atualizar snapshots
pnpm test -- -u

# Executar testes específicos
pnpm test:components

# Verificar coverage
pnpm test:coverage
```

### Performance Degradada

**Problema:** App mais lento após atualização

**Solução:**
```bash
# Analisar bundle
pnpm analyze

# Verificar chunks grandes
# Adicionar lazy loading se necessário

# Validar com Lighthouse
pnpm lighthouse
```

### Acessibilidade

**Problema:** Screen reader não funciona

**Solução:**
1. Verificar se ARIA announcer está inicializado
2. Testar com NVDA/JAWS
3. Validar ARIA labels
4. Executar audit: `pnpm test:e2e:a11y`

---

## 📚 Recursos Adicionais

### Documentação
- [Quick Start](./docs2026/QUICK_START_IMPROVEMENTS.md)
- [API Docs](./docs2026/API_DOCUMENTATION.md)
- [Roadmap](./docs2026/ROADMAP_2026.md)

### Exemplos
- [Test Examples](./src/components/**/__tests__/)
- [Performance Examples](./src/lib/monitoring/performance.ts)
- [Accessibility Examples](./src/hooks/useAccessibility.ts)

### Suporte
- Slack: #fisioflow-dev
- Email: dev@fisioflow.com
- GitHub Issues: Tag `migration`

---

## ✅ Validação Pós-Migração

### Checklist

- [ ] Build passa: `pnpm build`
- [ ] Testes passam: `pnpm test`
- [ ] Lint passa: `pnpm lint`
- [ ] Type check passa: `pnpm tsc --noEmit`
- [ ] App funciona localmente: `pnpm dev`
- [ ] Performance OK: `pnpm analyze`
- [ ] Acessibilidade OK: `pnpm test:e2e:a11y`

### Métricas

- [ ] Bundle size < 2MB
- [ ] Test coverage > 80%
- [ ] Lighthouse score > 85
- [ ] Zero TypeScript errors
- [ ] Zero ESLint errors

---

## 🎉 Conclusão

Parabéns! Você migrou com sucesso para a versão 2.0.0 do FisioFlow.

### Próximos Passos

1. ✅ Explorar novas features
2. ✅ Adicionar monitoring aos seus componentes
3. ✅ Melhorar acessibilidade
4. ✅ Escrever mais testes
5. ✅ Compartilhar feedback

### Feedback

Encontrou algum problema? Tem sugestões?
- Crie uma issue no GitHub
- Envie mensagem no Slack
- Fale com o tech lead

---

**Última atualização:** 2026-02-18
**Versão:** 2.0.0
**Autor:** Equipe FisioFlow
