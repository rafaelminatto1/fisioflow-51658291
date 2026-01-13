# 10. Testes e Qualidade

## 🧪 Visão Geral

O FisioFlow utiliza **Vitest** para testes unitários/integração e **Playwright** para testes E2E, com foco em cobertura de código >70%.

## 📋 Configuração dos Testes

### Vitest (Unitários)

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### Playwright (E2E)

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
  },
});
```

## 🎯 Testes Unitários

### Teste de Validação

```typescript
// src/lib/validations/__tests__/patient.test.ts
import { describe, it, expect } from 'vitest';
import { patientSchema } from '../patient';

describe('Patient Validation', () => {
  it('should validate valid patient data', () => {
    const validData = {
      full_name: 'João Silva',
      email: 'joao@example.com',
      phone: '11999999999',
      date_of_birth: '1990-01-01',
    };

    const result = patientSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const invalidData = {
      full_name: 'João Silva',
      email: 'invalid-email',
      phone: '11999999999',
    };

    const result = patientSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Email inválido');
    }
  });

  it('should reject phone number with wrong format', () => {
    const invalidData = {
      full_name: 'João Silva',
      phone: '123', // Muito curto
    };

    const result = patientSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});
```

### Teste de Hook

```typescript
// src/hooks/__tests__/usePermissions.test.ts
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePermissions } from '../usePermissions';

describe('usePermissions Hook', () => {
  it('should allow admin to access everything', () => {
    const { result } = renderHook(() => usePermissions());

    act(() => {
      // Mock user as admin
      result.current.hasRole(['admin']);
    });

    expect(result.current.canAccess('anything', 'anything')).toBe(true);
  });

  it('should allow therapist to read patients', () => {
    const { result } = renderHook(() => usePermissions());

    const canRead = result.current.canAccess('patients', 'read');
    expect(canRead).toBe(true);
  });

  it('should not allow intern to delete patients', () => {
    const { result } = renderHook(() => usePermissions());

    const canDelete = result.current.canAccess('patients', 'delete');
    expect(canDelete).toBe(false);
  });
});
```

### Teste de Componente

```typescript
// src/components/ui/__tests__/button.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../button';

describe('Button Component', () => {
  it('should render children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should call onClick when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click me</Button>);

    await user.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when loading', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should apply variant classes correctly', () => {
    const { rerender } = render(<Button variant="destructive">Delete</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-destructive');

    rerender(<Button variant="outline">Cancel</Button>);
    expect(screen.getByRole('button')).toHaveClass('border');
  });
});
```

## 🎭 Testes E2E (Playwright)

### Teste de Login

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/auth');

    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/');
    await expect(page.locator('text=Bem-vindo')).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/auth');

    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Credenciais inválidas')).toBeVisible();
  });
});
```

### Teste de Funcionalidade

```typescript
// e2e/patients.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Patient Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login antes de cada teste
    await page.goto('/auth');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('should create a new patient', async ({ page }) => {
    await page.goto('/patients');
    await page.click('text=Novo Paciente');

    await page.fill('input[name="full_name"]', 'Maria Silva');
    await page.fill('input[name="email"]', 'maria@example.com');
    await page.fill('input[name="phone"]', '11999999999');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Paciente cadastrado com sucesso')).toBeVisible();
    await expect(page.locator('text=Maria Silva')).toBeVisible();
  });

  test('should filter patients by name', async ({ page }) => {
    await page.goto('/patients');
    await page.fill('input[placeholder*="Buscar"]', 'João');

    await expect(page.locator('text=João Silva')).toBeVisible();
    await expect(page.locator('text=Maria Silva')).not.toBeVisible();
  });
});
```

### Teste de Acessibilidade

```typescript
// e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('should not have accessibility violations', async ({ page }) => {
    await page.goto('/patients');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper labels on form inputs', async ({ page }) => {
    await page.goto('/patients/new');

    const inputs = page.locator('input[type="text"], input[type="email"], textarea');
    const count = await inputs.count();

    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');

      expect(id || ariaLabel || ariaLabelledBy).toBeTruthy();
    }
  });
});
```

## 📊 Cobertura de Código

### Comandos

```bash
# Rodar testes com coverage
pnpm test:coverage

# Output esperado
# ----------|---------|----------|---------|---------|-------------------
# File      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
# ----------|---------|----------|---------|---------|-------------------
# All files |   68.45 |    56.23 |   72.15 |   68.45 |
#  ...      |         |          |         |         |
```

### Meta

```
Objetivo: >70% cobertura
Atual: ~50-60%

Falta:
- Testar mais componentes UI
- Testar edge cases em hooks
- Testar caminhos de erro
- Testar boundary conditions
```

## 🔍 Linting e Type Checking

### ESLint

```javascript
// eslint.config.js
export default [
  {
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-unused-vars': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
];
```

### TypeScript

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": false,  // TODO: Ativar para true
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noImplicitAny": true,
    "strictNullChecks": false
  }
}
```

## 🔗 Recursos Relacionados

- [Ambiente de Desenvolvimento](./03-ambiente-desenvolvimento.md) - Setup de testes
- [Arquitetura](./02-arquitetura.md) - Estrutura de testes
- [Deploy Produção](./11-deploy-producao.md) - CI/CD
