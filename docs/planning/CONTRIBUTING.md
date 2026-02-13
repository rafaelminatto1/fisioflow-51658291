# 🤝 Contribuindo com o FisioFlow

Obrigado por seu interesse em contribuir com o FisioFlow! Este guia irá ajudá-lo a começar.

## 📋 Sumário

- [Código de Conduta](#código-de-conduta)
- [Como Começar](#como-começar)
- [Processo de Desenvolvimento](#processo-de-desenvolvimento)
- [Pull Requests](#pull-requests)
- [Estilo de Código](#estilo-de-código)
- [Testes](#testes)
- [Commit Messages](#commit-messages)

## 🎯 Código de Conduta

- Respeite todas as pessoas
- Seja construtivo
- Aceite feedback construtivo
- Foque no que é melhor para a comunidade

## 🚀 Como Começar

### 1. Fork e Clone

```bash
# Fork o repositório no GitHub
git clone https://github.com/SEU_USUARIO/fisioflow.git
cd fisioflow
git remote add upstream https://github.com/rafaelminatto1/fisioflow.git
```

### 2. Instale Dependências

```bash
# Use pnpm (recomendado)
pnpm install

# Ou npm
npm install
```

### 3. Configure Ambiente

```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Configure as variáveis necessárias
```

### 4. Execute o Projeto

```bash
pnpm dev
# Acesse http://localhost:8080
```

## 🔧 Processo de Desenvolvimento

### Branch Strategy

```
main           → Produção
develop        → Desenvolvimento
feature/*      → Novas funcionalidades
fix/*          → Correções de bugs
hotfix/*       → Correções urgentes em produção
docs/*         → Documentação
test/*         → Testes
```

### Workflow

1. **Crie uma branch** para sua feature/fix
   ```bash
   git checkout -b feature/nova-funcionalidade
   ```

2. **Faça suas mudanças**
   - Siga o [Estilo de Código](#estilo-de-código)
   - Adicione [Testes](#testes)
   - Atualize [Documentação](#documentação)

3. **Execute os testes**
   ```bash
   pnpm run test:pre-deploy
   ```

4. **Faça commit** das mudanças
   ```bash
   git add .
   git commit -m "feat: add nova funcionalidade"
   ```

5. **Push** para o seu fork
   ```bash
   git push origin feature/nova-funcionalidade
   ```

6. **Abra um Pull Request** no GitHub

## 📨 Pull Requests

### Título do PR

Use conventional commits:

```
feat: add patient search functionality
fix: resolve issue with date picker
docs: update README with new features
refactor: optimize database queries
test: add unit tests for patient form
chore: update dependencies
```

### Descrição do PR

Inclua:

- **Descrição**: O que e por que
- **Tipo**: Feature, Bugfix, Breaking change
- **Screenshots**: Para mudanças visuais
- **Testes**: Como testar
- **Relacionado**: Issue #123

### Checklist de Review

- [ ] Código segue o style guide
- [ ] Testes adicionados/atualizados
- [ ] Documentação atualizada
- [ ] Sem warnings no TypeScript
- [ ] Sem erros no ESLint
- [ ] Build funciona sem erros
- [ ] Todos os testes passam

## 📐 Estilo de Código

### TypeScript

```typescript
// ✅ BOM - Use tipos explícitos
interface Patient {
  id: string
  name: string
  email: string
  birthDate: Date
}

// ❌ RUIM - Evite 'any'
function process(data: any) { }

// ✅ BOM - Use interfaces para shapes públicos
interface PatientRepository {
  findById(id: string): Promise<Patient | null>
  create(patient: Omit<Patient, 'id'>): Promise<Patient>
}

// ✅ BOM - Use type aliases para unions
type PatientStatus = 'Inicial' | 'Em Tratamento' | 'Concluído'
```

### React Components

```typescript
// ✅ BOM - Hooks primeiro
function PatientList({ patients }: PatientListProps) {
  const [filter, setFilter] = useState('')
  const filtered = useMemo(() =>
    patients.filter(p => p.name.includes(filter))
  , [patients, filter])

  // Handlers depois
  const handleDelete = (id: string) => {
    // ...
  }

  // Early returns
  if (patients.length === 0) {
    return <EmptyState />
  }

  // JSX final
  return <div>{/* ... */}</div>
}
```

### Nomenclatura

```typescript
// Componentes: PascalCase
const PatientCard: React.FC<Props> = () => {}

// Hooks: camelCase com 'use' prefix
const usePatients = () => {}

// Funções utilitárias: camelCase
const formatDate = (date: Date) => {}

// Constantes: SCREAMING_SNAKE_CASE
const MAX_PATIENTS = 100

// Interfaces/Types: PascalCase
interface PatientProps {}
type PatientStatus = 'active' | 'inactive'

// Arquivos:
// Componentes: PascalCase.tsx (PatientCard.tsx)
// Hooks: camelCase.ts (usePatients.ts)
// Utilitários: camelCase.ts (formatDate.ts)
// Types: types.ts ou *.types.ts
```

### Imports

```typescript
// 1. React e bibliotecas externas
import { useState, useEffect } from 'react'
import { Button } from '@radix-ui/react-button'

// 2. Componentes internos (alias @)
import { PatientCard } from '@/components/patients'
import { usePatients } from '@/hooks/usePatients'

// 3. Types
import type { Patient } from '@/types'

// 4. Estilos, assets, etc.
import './styles.css'
import { Logo } from '@/assets/logo.svg'
```

## 🧪 Testes

### Unit Tests

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PatientCard } from './PatientCard'

describe('PatientCard', () => {
  it('should render patient name', () => {
    const patient = {
      id: '1',
      name: 'João Silva'
    }
    render(<PatientCard patient={patient} />)
    expect(screen.getByText('João Silva')).toBeInTheDocument()
  })

  it('should call onDelete when delete button is clicked', () => {
    const onDelete = vi.fn()
    render(<PatientCard patient={mockPatient} onDelete={onDelete} />)

    screen.getByRole('button', { name: /deletar/i }).click()
    expect(onDelete).toHaveBeenCalledWith('1')
  })
})
```

### E2E Tests

```typescript
import { test, expect } from '@playwright/test'

test('should create new patient', async ({ page }) => {
  await page.goto('/patients')
  await page.click('button:has-text("Novo Paciente")')

  await page.fill('[name="name"]', 'Maria Santos')
  await page.fill('[name="email"]', 'maria@example.com')
  await page.click('button:has-text("Salvar")')

  await expect(page.locator('text=Maria Santos')).toBeVisible()
})
```

## 📝 Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer]
```

### Types

- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `docs`: Mudanças na documentação
- `style`: Formatação, missing semicolons, etc.
- `refactor`: Refatoração de código
- `test`: Adicionando ou atualizando testes
- `chore`: Atualização de tarefas de build, configs, etc.
- `perf`: Melhoria de performance
- `ci`: Mudanças nos arquivos de CI

### Exemplos

```
feat(patients): add advanced search filters

Add filters for:
- Treatment status
- Last session date
- Payment status

Closes #123

fix(auth): resolve token expiration issue

The token was not being refreshed properly
when users remained idle for extended periods.

Fixes #456
```

## 📚 Documentação

### JSDoc para funções

```typescript
/**
 * Busca pacientes com base nos filtros fornecidos
 * @param filters - Objeto com filtros de busca
 * @param filters.status - Filtrar por status do paciente
 * @param filters.search - Termo de busca textual
 * @returns Lista de pacientes encontrados
 * @throws {Error} Quando a API retorna erro
 * @example
 * ```ts
 * const patients = await findPatients({
 *   status: 'active',
 *   search: 'João'
 * })
 * ```
 */
async function findPatients(filters: PatientFilters): Promise<Patient[]> {
  // ...
}
```

### Componentes

```typescript
/**
 * PatientCard - Card exibindo informações de um paciente
 *
 * @param patient - Dados do paciente a serem exibidos
 * @param onEdit - Callback quando botão editar é clicado
 * @param onDelete - Callback quando botão deletar é clicado
 *
 * @example
 * ```tsx
 * <PatientCard
 *   patient={patientData}
 *   onEdit={(id) => navigate(`/patients/${id}/edit`)}
 *   onDelete={(id) => deletePatient(id)}
 * />
 * ```
 */
```

## 🐛 Relatando Bugs

Use o GitHub Issues com o template:

```markdown
## Descrição
Breve descrição do bug

## Passos para Reproduzir
1. Ir para '...'
2. Clicar em '....'
3. Scroll até '....'
4. Ver erro

## Comportamento Esperado
Deveria acontecer '...'

## Screenshots
Se aplicável, adicione screenshots

## Ambiente
- OS: [e.g. Windows 11, macOS 14]
- Browser: [e.g. Chrome 120, Firefox 121]
- Versão: [e.g. 1.0.0]
```

## 💡 Sugestões de Features

Use o GitHub Issues:

```markdown
## Descrição
Descrição clara da feature sugerida

## Problema que Resolve
Qual problema esta feature resolve?

## Solução Proposta
Como você imagina a implementação?

## Alternativas
Quais alternativas foram consideradas?
```

## 🎨 Design System

### Cores

```css
/* Primary */
--primary-50: #f0f9ff;
--primary-500: #0ea5e9;
--primary-600: #0284c7;
--primary-700: #0369a1;

/* Semantic */
--success: #10b981;
--warning: #f59e0b;
--error: #ef4444;
--info: #3b82f6;
```

### Espaçamento

```css
/* Multiplicadores de 4px */
--spacing-1: 0.25rem;  /* 4px */
--spacing-2: 0.5rem;   /* 8px */
--spacing-4: 1rem;     /* 16px */
--spacing-6: 1.5rem;   /* 24px */
--spacing-8: 2rem;     /* 32px */
```

## 📖 Recursos de Aprendizagem

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Radix UI Primitives](https://www.radix-ui.com/primitives)
- [Tailwind CSS](https://tailwindcss.com/docs)

## ❓ Perguntas Frequentes

### Posso usar npm em vez de pnpm?

Sim, mas pnpm é recomendado por ser mais rápido e eficiente.

### Como rodo os testes localmente?

```bash
# Todos os testes
pnpm run test:pre-deploy

# Apenas unit tests
pnpm run test:unit

# Apenas E2E tests
pnpm run test:e2e

# Com coverage
pnpm run test:coverage
```

## 🙋‍♂️ Precisa de Ajuda?

- Abra uma issue no GitHub
- Entre no [Discord](https://discord.gg/fisioflow)
- Email: dev@fisioflow.com

---

**Obrigado por contribuir! 🎉**
