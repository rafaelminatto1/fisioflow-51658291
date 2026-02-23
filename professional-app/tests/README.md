# Guia de Testes - FisioFlow Pro

Este guia descreve como executar e escrever testes para o projeto FisioFlow Professional.

## Índice

- [Comandos de Teste](#comandos-de-teste)
- [Estrutura de Testes](#estrutura-de-testes)
- [Escrevendo Testes](#escrevendo-testes)
- [Melhores Práticas](#melhores-práticas)
- [Mocks Configurados](#mocks-configurados)

## Comandos de Teste

```bash
# Executar todos os testes
pnpm test

# Executar em modo watch
pnpm test:watch

# Executar com cobertura
pnpm test:coverage

# Executar em CI (sem watch)
pnpm test:ci
```

## Estrutura de Testes

```
professional-app/
├── __tests__/              # Testes gerais e utilitários
├── app/                    # Telas e rotas
│   └── __tests__/         # Testes de telas
├── components/            # Componentes reutilizáveis
│   └── __tests__/        # Testes de componentes
├── hooks/                 # Hooks customizados
│   └── __tests__/        # Testes de hooks
├── lib/                   # Utilitários e serviços
│   └── __tests__/        # Testes de funções
└── store/                # Zustand stores
    └── __tests__/       # Testes de estado
```

## Escrevendo Testes

### Testes de Componentes

```tsx
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Button } from '../Button';

describe('Button', () => {
  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Button title="Click me" onPress={onPress} />
    );

    fireEvent.press(getByText('Click me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
```

### Testes de Hooks

```tsx
import { renderHook, act } from '@testing-library/react-native';
import { useAuth } from '../hooks/useAuth';

describe('useAuth', () => {
  it('initializes with loading state', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.isLoading).toBe(true);
  });

  it('signs in user successfully', async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn('user@example.com', 'password');
    });

    expect(result.current.user).toBeTruthy();
    expect(result.current.isAuthenticated).toBe(true);
  });
});
```

### Testes de Utilitários

```ts
import { formatCurrency } from '../utils/currency';

describe('formatCurrency', () => {
  it('formats positive numbers correctly', () => {
    expect(formatCurrency(1234.56)).toBe('R$ 1.234,56');
  });

  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('R$ 0,00');
  });
});
```

## Melhores Práticas

### 1. Use descritivos claros
```ts
// Bom
it('calls the API and returns user data', () => {});

// Ruim
it('works', () => {});
```

### 2. Teste comportamento, não implementação
```ts
// Bom - testa o resultado esperado
expect(user.name).toBe('John Doe');

// Ruim - testa detalhes de implementação
expect(mockFunction).toHaveBeenCalledWith({ name: 'John Doe', age: 30 });
```

### 3. Use `act` para mudanças de estado
```ts
await act(async () => {
  await result.current.signIn('user@example.com', 'password');
});
```

### 4. Limpe os mocks entre testes
```ts
beforeEach(() => {
  jest.clearAllMocks();
});
```

### 5. Use `waitFor` para operações assíncronas
```ts
await waitFor(() => {
  expect(result.current.user).toBeTruthy();
});
```

## Mocks Configurados

O seguinte mocks são configurados automaticamente em `jest.setup.js`:

### React Navigation
```ts
useNavigation, useRoute, useFocusEffect, useIsFocused
```

### Expo Router
```ts
useRouter, useSegments, useLocalSearchParams, useGlobalSearchParams
```

### Firebase
```ts
auth, db, e todas as funções relacionadas
```

### Expo SDK
```ts
expo-secure-store
expo-notifications
expo-haptics
expo-constants
expo-linking
expo-local-authentication
```

### React Native
```ts
@react-native-async-storage/async-storage
react-native-reanimated
react-native-safe-area-context
react-native-screens
```

### Hooks Customizados
```ts
useColorScheme, useColors
```

## Coverage Target

A meta de cobertura é:

- **Linhas**: 80%
- **Funções**: 80%
- **Branches**: 75%
- **Statements**: 80%

## Debug de Testes

### Debug com console.log
```ts
it('debug example', () => {
  console.log('Testing something...');
  // Seus testes
});
```

### Debug com debug() do Testing Library
```ts
import { screen, within } from '@testing-library/react-native';

it('debug example', () => {
  render(<MyComponent />);
  screen.debug(); // Mostra toda a árvore de componentes
});
```

## Recursos Adicionais

- [React Native Testing Library Docs](https://callstack.github.io/react-native-testing-library/)
- [Jest Docs](https://jestjs.io/docs/getting-started)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
