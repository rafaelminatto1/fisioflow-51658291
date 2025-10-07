# 📋 Planejamento: Testes E2E, UX e Acessibilidade

## 🎯 Objetivos

1. ✅ Expandir testes E2E com Playwright
2. ✅ Aplicar componentes UX nas demais páginas
3. ✅ Implementar testes de acessibilidade
4. ✅ Atingir >70% de cobertura

---

## 📦 Fase 1: Configuração Playwright

### Instalação
```bash
npm install -D @playwright/test @axe-core/playwright
```

### Estrutura de Testes E2E
```
e2e/
├── auth.spec.ts           # Login, logout, registro
├── eventos.spec.ts        # CRUD completo de eventos
├── prestadores.spec.ts    # Gestão de prestadores
├── checklist.spec.ts      # Checklist de eventos
├── participantes.spec.ts  # Gestão de participantes
├── accessibility.spec.ts  # Testes de acessibilidade WCAG 2.1
└── fixtures/
    └── test-data.ts       # Dados de teste reutilizáveis
```

### Cenários E2E Priorizados

#### 1. Fluxo de Autenticação (auth.spec.ts)
- ✅ Login com credenciais válidas
- ✅ Login com credenciais inválidas
- ✅ Logout
- ✅ Redirecionamento para /auth quando não autenticado

#### 2. Fluxo de Eventos (eventos.spec.ts)
- ✅ Criar novo evento
- ✅ Visualizar lista de eventos
- ✅ Editar evento existente
- ✅ Buscar evento por nome
- ✅ Filtrar eventos por status
- ✅ Cancelar evento
- ✅ Exportar relatório (CSV/PDF)

#### 3. Fluxo de Prestadores (prestadores.spec.ts)
- ✅ Adicionar prestador a evento
- ✅ Editar prestador
- ✅ Marcar pagamento como pago
- ✅ Excluir prestador
- ✅ Exportar lista de prestadores

#### 4. Fluxo de Checklist (checklist.spec.ts)
- ✅ Adicionar item ao checklist
- ✅ Marcar item como concluído
- ✅ Editar item
- ✅ Excluir item
- ✅ Visualizar totais por tipo

#### 5. Fluxo de Participantes (participantes.spec.ts)
- ✅ Adicionar participante
- ✅ Editar participante
- ✅ Validar campo Instagram
- ✅ Excluir participante
- ✅ Exportar lista

---

## 🎨 Fase 2: Componentes UX nas Páginas

### Páginas que Precisam de UX Components

| Página | EmptyState | LoadingSkeleton | ResponsiveTable | Status |
|--------|------------|-----------------|-----------------|--------|
| Eventos | ✅ | ✅ | ❌ | Implementado |
| Patients | ✅ | ✅ | ❌ | Implementado |
| Schedule | ❌ | ❌ | ❌ | **A FAZER** |
| Exercises | ❌ | ❌ | ❌ | **A FAZER** |
| Reports | ❌ | ❌ | ❌ | **A FAZER** |
| Financial | ❌ | ❌ | ❌ | **A FAZER** |
| Settings | ❌ | ❌ | ❌ | **A FAZER** |
| EventoDetalhes | ❌ | ❌ | ✅ | **A FAZER** |

### Plano de Aplicação

#### Schedule.tsx
- LoadingSkeleton type="list" para appointments
- EmptyState quando não há agendamentos
- Mensagem clara: "Nenhum agendamento hoje"

#### Exercises.tsx
- LoadingSkeleton type="card" para exercícios
- EmptyState quando biblioteca vazia
- Ação: "Adicionar Primeiro Exercício"

#### Reports.tsx
- LoadingSkeleton type="card" para relatórios
- EmptyState quando sem dados
- Mensagem: "Nenhum relatório disponível"

#### Financial.tsx
- LoadingSkeleton type="table" para transações
- EmptyState quando sem movimentações
- Gráficos com skeleton próprio

#### Settings.tsx
- LoadingSkeleton type="form" para configurações
- Feedback visual ao salvar

#### EventoDetalhes.tsx
- ResponsiveTable para prestadores (mobile)
- EmptyState nas abas vazias
- LoadingSkeleton em cada aba

---

## ♿ Fase 3: Testes de Acessibilidade

### Ferramentas
- `@axe-core/playwright` - Testes automatizados WCAG 2.1
- `@testing-library/jest-dom` - Matchers de acessibilidade

### Checklist de Acessibilidade (WCAG 2.1 AA)

#### Estrutura Semântica
- ✅ Uso correto de headings (h1 único por página)
- ✅ Landmarks (main, nav, header, footer)
- ✅ Listas semânticas (ul, ol)

#### Navegação por Teclado
- ✅ Todos os elementos interativos acessíveis via Tab
- ✅ Ordem de foco lógica
- ✅ Esc fecha modais
- ✅ Enter/Space ativa botões

#### Labels e Textos Alternativos
- ✅ Inputs com labels associados
- ✅ Botões com texto descritivo
- ✅ Ícones decorativos com aria-hidden
- ✅ Imagens com alt text

#### Contraste de Cores
- ✅ Ratio mínimo 4.5:1 para texto
- ✅ Ratio mínimo 3:1 para elementos interativos

#### Estados e Feedback
- ✅ Foco visível
- ✅ Estados de erro claramente marcados
- ✅ Loading states com aria-live
- ✅ Mensagens de sucesso/erro anunciadas

### Testes Automatizados
```typescript
// accessibility.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('deve passar em testes de acessibilidade na página de eventos', async ({ page }) => {
  await page.goto('/eventos');
  
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  
  expect(accessibilityScanResults.violations).toEqual([]);
});
```

---

## 📊 Fase 4: Cobertura >70%

### Estratégia para Aumentar Cobertura

#### Hooks (prioridade alta)
- ✅ usePermissions (implementado)
- ⏳ useEventos
- ⏳ usePrestadores
- ⏳ useParticipantes
- ⏳ useChecklist
- ⏳ usePagamentos
- ⏳ useAuth

#### Validações (prioridade alta)
- ✅ eventoSchema (implementado)
- ✅ prestadorSchema (implementado)
- ✅ checklistSchema (implementado)
- ✅ participanteSchema (implementado)
- ✅ pagamentoSchema (implementado)
- ⏳ authSchema
- ⏳ agendaSchema

#### Componentes UI (prioridade média)
- ✅ EmptyState (implementado)
- ✅ LoadingSkeleton (implementado)
- ⏳ ResponsiveTable
- ⏳ Button variants
- ⏳ Card
- ⏳ Dialog

#### Páginas (prioridade baixa)
- ⏳ Eventos (testes de integração)
- ⏳ EventoDetalhes (navegação entre abas)
- ⏳ Patients (CRUD)

### Meta de Cobertura
```
Statements   : >70%
Branches     : >65%
Functions    : >70%
Lines        : >70%
```

---

## 🚀 Cronograma de Implementação

### Sprint 1 (Atual)
1. ✅ Instalar Playwright + Axe
2. ✅ Configurar Playwright
3. ✅ Criar 5 specs E2E principais
4. ✅ Aplicar UX em 6 páginas restantes
5. ✅ Implementar testes de acessibilidade
6. ✅ Expandir testes de hooks e validações

### Sprint 2 (Próximo)
- E2E para fluxos complexos (financeiro, relatórios)
- Testes visuais com snapshots
- Testes de performance
- Documentação de testes

---

## 📈 Métricas de Sucesso

### Testes E2E
- ✅ 15+ cenários E2E implementados
- ✅ Cobertura dos 5 fluxos principais
- ✅ Testes passando em CI/CD

### UX/UI
- ✅ 100% das páginas com loading states
- ✅ 100% das páginas com empty states
- ✅ Mobile-first em todas as tabelas

### Acessibilidade
- ✅ 0 violações WCAG 2.1 AA críticas
- ✅ Navegação 100% por teclado
- ✅ Contraste >4.5:1 em todos os textos

### Cobertura
- ✅ Statements >70%
- ✅ Branches >65%
- ✅ Functions >70%

---

## 🛠️ Comandos Úteis

```bash
# Rodar todos os testes
npm test

# Rodar testes E2E
npm run test:e2e

# Rodar testes E2E em modo UI
npm run test:e2e:ui

# Rodar testes de acessibilidade
npm run test:e2e -- accessibility.spec.ts

# Cobertura de testes
npm run test:coverage

# Abrir relatório de cobertura
open coverage/index.html
```

---

## 📚 Recursos

- [Playwright Docs](https://playwright.dev/)
- [Axe Accessibility](https://www.deque.com/axe/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Testing Library](https://testing-library.com/)

---

**Status:** 🚀 Pronto para implementação  
**Estimativa:** 4-6 horas de desenvolvimento  
**Prioridade:** ALTA
