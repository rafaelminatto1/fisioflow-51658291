# 🧪 Scripts de Teste - FisioFlow

## 📋 Comandos Disponíveis

### Testes Unitários (Vitest)

```bash
# Rodar todos os testes unitários
npm test

# Testes em modo watch (auto-reload)
npm test -- --watch

# Testes com interface visual
npm run test:ui

# Cobertura de código
npm run test:coverage

# Rodar apenas um arquivo específico
npm test evento.test.ts

# Rodar testes relacionados a arquivos alterados
npm test -- --changed

# Limpar cache de testes
npm test -- --clearCache
```

### Testes E2E (Playwright)

```bash
# Rodar todos os testes E2E
npm run test:e2e

# Testes E2E em modo UI (interface gráfica)
npm run test:e2e:ui

# Rodar spec específico
npm run test:e2e auth.spec.ts

# Debug mode (passo a passo)
npm run test:e2e -- --debug

# Rodar em navegador específico
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=firefox
npm run test:e2e -- --project=webkit

# Headed mode (ver navegador)
npm run test:e2e -- --headed

# Gerar relatório HTML
npm run test:e2e -- --reporter=html

# Rodar apenas testes de acessibilidade
npm run test:e2e accessibility.spec.ts
```

### Desenvolvimento

```bash
# Iniciar servidor de desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview

# Linter
npm run lint

# TypeScript check
npm run typecheck
```

## 🎯 Fluxo de Trabalho Recomendado

### 1. Durante o Desenvolvimento

```bash
# Terminal 1: Servidor
npm run dev

# Terminal 2: Testes em watch mode
npm test -- --watch

# Fazer alterações no código...
# Testes rodam automaticamente
```

### 2. Antes de Commit

```bash
# Rodar todos os testes
npm test

# Verificar cobertura
npm run test:coverage

# Linter
npm run lint

# TypeScript
npm run typecheck
```

### 3. CI/CD

```bash
# Build
npm run build

# Testes unitários
npm test -- --run

# Testes E2E
npm run test:e2e
```

## 📊 Interpretando Resultados

### Cobertura de Código

```bash
npm run test:coverage
```

Isso gera um relatório em `coverage/index.html`:

```bash
# macOS
open coverage/index.html

# Linux
xdg-open coverage/index.html

# Windows
start coverage/index.html
```

**Métricas:**
- **Statements**: % de declarações executadas
- **Branches**: % de condições (if/else) testadas
- **Functions**: % de funções chamadas
- **Lines**: % de linhas executadas

**Meta:** >70% em todas as métricas

### Relatório E2E

```bash
npm run test:e2e -- --reporter=html
```

Relatório em `playwright-report/index.html`

## 🐛 Troubleshooting

### Testes Unitários

**Erro: "Cannot find module"**
```bash
npm install
```

**Erro: "TypeError: Cannot read property"**
- Verificar mocks do Supabase
- Verificar imports de componentes

**Testes lentos**
```bash
# Limitar workers
npm test -- --maxWorkers=4

# Modo não-watch
npm test -- --run
```

### Testes E2E

**Erro: "Browser not found"**
```bash
npx playwright install
```

**Erro: "Target closed" ou "Timeout"**
- Aumentar timeout no teste
- Verificar se servidor está rodando
- Usar `--headed` para ver o navegador

```bash
npm run test:e2e -- --headed --timeout=60000
```

**Testes falhando em CI**
```bash
# Aumentar workers em CI
npm run test:e2e -- --workers=1
```

## 📁 Estrutura de Testes

```
src/
├── lib/validations/__tests__/
│   ├── evento.test.ts
│   ├── prestador.test.ts
│   ├── checklist.test.ts
│   ├── participante.test.ts
│   ├── pagamento.test.ts
│   └── auth.test.ts
│
├── hooks/__tests__/
│   ├── usePermissions.test.ts
│   ├── useEventos.test.ts
│   ├── useAuth.test.ts
│   └── hooks.integration.test.ts
│
└── components/ui/__tests__/
    ├── empty-state.test.tsx
    ├── loading-skeleton.test.tsx
    ├── responsive-table.test.tsx
    ├── button.test.tsx
    └── card.test.tsx

e2e/
├── fixtures/
│   └── test-data.ts
├── auth.spec.ts
├── eventos.spec.ts
├── prestadores.spec.ts
├── checklist.spec.ts
├── participantes.spec.ts
└── accessibility.spec.ts
```

## 🎓 Boas Práticas

### Testes Unitários

1. **Isolar testes**: Cada teste deve ser independente
2. **Mock externo**: Mockar Supabase, APIs, etc.
3. **Nomear claramente**: Descrever o que está testando
4. **Testar edge cases**: Não só caminho feliz
5. **Manter rápido**: Testes unitários devem ser rápidos

### Testes E2E

1. **Evitar seletores frágeis**: Usar `data-testid`
2. **Esperas explícitas**: Usar `waitFor`, não `waitForTimeout`
3. **Limpar estado**: `beforeEach` para setup
4. **Testar fluxos reais**: Como usuário usaria
5. **Screenshots em falhas**: Configurado automaticamente

### Acessibilidade

1. **Automatizar**: Usar Axe em todos os specs
2. **Teste manual também**: Automação não pega tudo
3. **Priorize críticos**: Corrigir violações críticas primeiro
4. **Documente exceções**: Se algo não pode ser corrigido
5. **Teste com teclado**: Navegação sem mouse

## 📊 Checklist de Qualidade

Antes de fazer merge:

- [ ] Todos os testes passando (`npm test`)
- [ ] Cobertura >70% (`npm run test:coverage`)
- [ ] Testes E2E passando (`npm run test:e2e`)
- [ ] Sem violações de acessibilidade críticas
- [ ] TypeScript sem erros (`npm run typecheck`)
- [ ] Linter sem warnings (`npm run lint`)
- [ ] Build bem-sucedido (`npm run build`)

## 🚀 Próximos Passos

1. [ ] Atingir >80% de cobertura
2. [ ] Adicionar testes visuais (snapshots)
3. [ ] Testes de performance
4. [ ] CI/CD automático
5. [ ] Monitoramento de acessibilidade contínuo

---

**Documentação completa:** Ver `TESTING_README.md`, `PLANEJAMENTO_TESTES_E2E_UX.md`, `IMPLEMENTACAO_COMPLETA_E2E.md`
