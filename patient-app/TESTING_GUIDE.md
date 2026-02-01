# Guia de Testes - FisioFlow Patient iOS App

Este guia fornece instruções completas para criar e executar testes no aplicativo.

## 📋 Índice

- [Configuração](#configuração)
- [Executar Testes](#executar-testes)
- [Estrutura de Testes](#estrutura-de-testes)
- [Convenções](#convenções)
- [Exemplos](#exemplos)

## 🔧 Configuração

### Dependências Instaladas

```json
{
  "@testing-library/react-native": "^12.9.0",
  "@types/jest": "^29.5.14",
  "jest": "^29.7.0",
  "jest-expo": "~54.0.16",
  "ts-jest": "^29.4.6",
  "jest-environment-jsdom": "^30.2.0",
  "babel-jest": "^30.2.0",
  "react-test-renderer": "19.1.0",
  "expo-sharing": "^14.0.8",
  "expo-document-picker": "^14.0.8",
  "expo-clipboard": "^8.0.8"
}
```

**Nota:** `@testing-library/react-native` v12+ inclui matchers integrados, então não é necessário instalar `@testing-library/jest-native`.

### Arquivos de Configuração

- **jest.config.js** - Configuração principal do Jest
- **jest.setup.js** - Mocks globais para Firebase, Expo, Navigation
- **test/setup.ts** - Polyfills e configuração de ambiente

## 🚀 Executar Testes

### Comandos Disponíveis

```bash
# Executar todos os testes
pnpm test

# Modo watch (re-executa ao detectar mudanças)
pnpm test:watch

# Com cobertura de código
pnpm test:coverage

# Para CI/CD (parallel execution)
pnpm test:ci
```

### Executar Testes Específicos

```bash
# Testes de um arquivo específico
pnpm test Button.test.tsx

# Testes de uma pasta
pnpm test components/

# Testes com nome específico
pnpm test -t "should render correctly"
```

## 📁 Estrutura de Testes

```
patient-app/
├── test/
│   ├── setup.ts                    # Setup de testes
│   ├── index.ts                    # Exportações
│   ├── utils/
│   │   └── test-utils.tsx          # Helpers de teste
│   └── mocks/
│       └── firebase.ts             # Mocks do Firebase
├── components/
│   ├── Button.test.tsx             # Testes do Button
│   ├── Input.test.tsx              # Testes do Input
│   └── ...
├── services/
│   ├── authService.test.ts         # Testes do authService
│   └── ...
└── hooks/
    ├── useTheme.test.ts            # Testes do useTheme
    └── ...
```

## 📝 Convenções

### Nomenclatura

- Arquivos de teste: `ComponentName.test.tsx` ou `serviceName.test.ts`
- Grupos de testes: `describe('ComponentName', () => {})`
- Casos de teste: `it('should do something', () => {})`

### Estrutura de um Teste

```tsx
describe('ComponentName', () => {
  // Setup antes de cada teste
  beforeEach(() => {
    // Configuração
    jest.clearAllMocks();
  });

  // Cleanup após cada teste
  afterEach(() => {
    // Limpeza
  });

  it('should do something', () => {
    // Arrange (preparar)
    const prop = 'value';

    // Act (executar)
    const { getByText } = render(<MyComponent prop={prop} />);

    // Assert (verificar)
    expect(getByText('value')).toBeTruthy();
  });
});
```

## 🧪 Exemplos

### Teste de Componente

```tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Button } from './Button';

describe('Button Component', () => {
  it('renders correctly with default props', () => {
    const { getByText } = render(
      <Button onPress={() => {}}>
        Test Button
      </Button>
    );
    expect(getByText('Test Button')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(
      <Button onPress={onPressMock}>
        Test Button
      </Button>
    );

    fireEvent.press(getByText('Test Button'));
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(
      <Button onPress={onPressMock} disabled>
        Test Button
      </Button>
    );

    fireEvent.press(getByText('Test Button'));
    expect(onPressMock).not.toHaveBeenCalled();
  });
});
```

### Teste de Serviço com Mock

```tsx
import { signIn } from './authService';
import { setMockAuthUser, createMockUser } from '../test/mocks/firebase';

jest.mock('../../lib/firebase');

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should sign in with valid credentials', async () => {
    const mockUser = createMockUser({ email: 'test@example.com' });
    setMockAuthUser(mockUser);

    const result = await signIn('test@example.com', 'password123');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.email).toBe('test@example.com');
    }
  });

  it('should return error with invalid credentials', async () => {
    const result = await signIn('test@example.com', 'wrongpassword');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('Credenciais inválidas');
    }
  });
});
```

### Teste de Hook

```tsx
import { renderHook, act } from '@testing-library/react-native';
import { useDebounce } from './useDebounce';

describe('useDebounce Hook', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 },
      }
    );

    expect(result.current).toBe('initial');

    rerender({ value: 'updated', delay: 500 });
    expect(result.current).toBe('initial');

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current).toBe('updated');
  });
});
```

## 🛠️ Utilitários de Teste

### TestData - Geradores de Dados

```tsx
import { TestData } from '../test/utils/test-utils';

// Dados de usuário
const user = TestData.user({ name: 'Custom User' });

// Dados de exercício
const exercise = TestData.exercise({ name: 'Custom Exercise' });

// Dados de consulta
const appointment = TestData.appointment({ status: 'confirmed' });
```

### MockFirebase - Mocks de Firebase

```tsx
import {
  setMockAuthUser,
  createMockUser,
  createMockDocSnapshot,
} from '../test/mocks/firebase';

// Configurar usuário autenticado
setMockAuthUser(createMockUser({ uid: 'test-123' }));

// Criar snapshot de documento
const docSnap = createMockDocSnapshot({ name: 'Test' }, 'doc-123');
```

### Helpers de Asserção

```tsx
import { Assertions } from '../test/utils/test-utils';

// Verificar que texto existe
Assertions.assertTextExists(getByText, 'Expected Text');

// Verificar que elemento existe
Assertions.assertElementExists(getByTestId, container);
```

## 📊 Cobertura de Código

### Metas de Cobertura

O projeto visa as seguintes metas de cobertura:

```javascript
coverageThreshold: {
  global: {
    branches: 60,
    functions: 60,
    lines: 60,
    statements: 60,
  },
}
```

### Relatório de Cobertura

```bash
# Gerar relatório
pnpm test:coverage

# Relatório será gerado em coverage/
# Abrir: coverage/lcov-report/index.html
```

## 🐛 Debug de Testes

### Executar em Modo Debug

```bash
# Com logs detalhados
pnpm test --verbose

# Executar apenas testes que falharam
pnpm test --onlyFailures

# Executar testes em série (mais fácil de debugar)
pnpm test --runInBand
```

### Debug com Console

```tsx
it('should debug something', () => {
  console.log('Debug info:', someVariable);
  // ...
});
```

## 📚 Recursos Adicionais

- [Jest Documentation](https://jestjs.io/)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Testing Library Guidelines](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## ✅ Checklist para Novos Testes

- [ ] Testar casos de sucesso
- [ ] Testar casos de erro
- [ ] Testar estados de loading
- [ ] Testar estados vazios
- [ ] Testar interações do usuário
- [ ] Testar validações
- [ ] Usar mocks apropriados
- [ ] Limpar mocks em `afterEach`
- [ ] Seguir convenções de nomenclatura
- [ ] Documentar testes complexos
