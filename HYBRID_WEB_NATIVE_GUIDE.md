# Guia de Migração: Web + React Native Híbrido

## Visão Geral

O FisioFlow agora suporta tanto **Web** (Vite + React DOM + shadcn/ui) quanto **Mobile** (Expo + React Native + NativeWind).

## Arquitetura

```
fisioflow/
├── src/
│   ├── components/
│   │   ├── web/ui/          # Componentes shadcn/ui (web-only)
│   │   │   ├── button.tsx    # Usa <button> HTML
│   │   │   ├── card.tsx      # Usa <div> HTML
│   │   │   ├── input.tsx     # Usa <input> HTML
│   │   │   └── ...           # 69 componentes web
│   │   ├── native/ui/        # Componentes React Native (mobile-only)
│   │   │   ├── button.tsx    # Usa TouchableOpacity + NativeWind
│   │   │   ├── card.tsx      # Usa View + NativeWind
│   │   │   ├── input.tsx     # Usa TextInput + NativeWind
│   │   │   └── ...
│   │   └── shared/ui/        # Componentes cross-platform
│   │       ├── button.tsx    # Detecta plataforma e usa o correto
│   │       ├── card.tsx      # Wrapper inteligente
│   │       ├── input.tsx     # Props normalizadas
│   │       ├── text.tsx      # Typography cross-platform
│   │       └── index.ts      # Exportações
│   ├── hooks/
│   │   └── platform/
│   │       ├── usePlatform.ts    # Hook para detectar plataforma
│   │       └── index.ts
│   ├── lib/
│   │   ├── utils.ts          # Utilitários cross-platform
│   │   └── ui-variants.ts    # Variantes CVA
│   ├── global.css            # CSS global (web + NativeWind)
│   └── index.css             # CSS web-only
├── metro.config.js           # Metro bundler + NativeWind
├── babel.config.js           # Babel + NativeWind preset
├── tailwind.config.ts        # Tailwind (web) e NativeWind
└── app.json                  # Config Expo
```

## Configuração

### 1. Dependências Instaladas

```json
{
  "dependencies": {
    "@react-native-clipboard/clipboard": "^1.16.3",
    "nativewind": "^4.2.1",
    "tailwind-merge": "^2.6.0",
    "clsx": "^2.1.1"
  },
  "devDependencies": {
    "tailwindcss": "^3.4.17",
    "tailwindcss-animate": "^1.0.7",
    "@tailwindcss/typography": "^0.5.16"
  }
}
```

### 2. Configurações Principais

#### metro.config.js
```javascript
import { getDefaultConfig } from 'expo/metro-config.js';
import { withNativeWind } from 'nativewind/metro';

const config = getDefaultConfig(__dirname);

// Excluir pacotes web-only do bundle mobile
const webOnlyPackages = [
  '@radix-ui/react-*',
  'react-dom',
  'react-router-dom',
  // ...
];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (webOnlyPackages.some(pkg => moduleName.startsWith(pkg))) {
    return { filePath: '', type: 'empty' };
  }
  return config.resolver.resolveRequest(context, moduleName, platform);
};

export default withNativeWind(config, {
  input: './src/global.css',
  inlineRem: 16,
});
```

#### babel.config.js
```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      'react-native-reanimated/plugin',
    ],
  };
};
```

#### tailwind.config.ts
Já configurado para suportar web e NativeWind através do preset.

## Como Usar

### Importar Componentes Cross-Platform

```tsx
// ✅ CORRETO - Usa componente cross-platform
import { Button, Card, Input } from '@/components/shared/ui';

function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Título</CardTitle>
      </CardHeader>
      <CardContent>
        <Input placeholder="Digite algo" />
        <Button onPress={() => console.log('click')}>Enviar</Button>
      </CardContent>
    </Card>
  );
}
```

### Importar Componentes Específicos da Plataforma

```tsx
// Web-only (só funciona na web)
import { Button as WebButton } from '@/components/web/ui/button';

// Native-only (só funciona no React Native)
import { Button as NativeButton } from '@/components/native/ui/button';
```

### Detectar Plataforma

```tsx
import { usePlatform } from '@/hooks/platform';

function MyComponent() {
  const { isWeb, isNative, isIOS, isAndroid } = usePlatform();

  if (isWeb) {
    return <div>Só na web</div>;
  }

  if (isIOS) {
    return <div>Só no iOS</div>;
  }

  return <div>Android ou genérico</div>;
}
```

### Utilitários Cross-Platform

```tsx
import { cn, isWeb, isNative, copyToClipboard } from '@/lib/utils';

// cn funciona tanto em web quanto native
<div className={cn('bg-primary text-white', className)} />

// isWeb/isNative para APIs específicas
if (isWeb()) {
  navigator.clipboard.writeText(text);
}

// copyToClipboard é cross-platform
await copyToClipboard('Texto para copiar');
```

## Componentes Disponíveis

### Cross-Platform (src/components/shared/ui/)

| Componente | Web | Native | Status |
|------------|-----|--------|--------|
| Button | `<button>` | TouchableOpacity | ✅ |
| Card | `<div>` | View | ✅ |
| Input | `<input>` | TextInput | ✅ |
| Text | `<span>/<p>` | Text | ✅ |

### Web-Only (src/components/web/ui/)

69 componentes shadcn/ui que usam HTML elements:

- accordion, alert, alert-dialog, aspect-ratio
- avatar, badge, breadcrumb, button, calendar, card
- carousel, chart, checkbox, collapsible, command
- context-menu, date-range-picker, dialog, drawer
- dropdown-menu, form, hover-card, input, label
- menubar, navigation-menu, pagination, popover
- progress, radio-group, resizable, scroll-area
- select, separator, sheet, sidebar, slider, sonner
- switch, table, tabs, textarea, toast, toggle
- toggle-group, tooltip, e muito mais...

### Native-Only (src/components/native/ui/)

Componentes que precisam ser criados para React Native:

Use como base:
- [NativeWind UI Components](https://www.nativewind.dev/)
- [React Native Elements](https://reactnativeelements.com/)
- [Gluestack UI](https://gluestack.io/)

## Criando Novos Componentes Cross-Platform

### Template

```tsx
// src/components/shared/ui/my-component.tsx
import * as React from 'react';
import { usePlatform } from '@/hooks/platform';

// Import web component
const WebComponent = React.lazy(() =>
  import('@/components/web/ui/my-component').then(m => ({ default: m.MyComponent }))
);

// Import native component
const NativeComponent = React.lazy(() =>
  import('@/components/native/ui/my-component').then(m => ({ default: m.MyComponent }))
);

export interface SharedMyComponentProps {
  children: React.ReactNode;
  className?: string;
  // ... props compartilhadas
}

export const MyComponent = React.forwardRef<any, SharedMyComponentProps>(
  ({ children, className, ...props }, ref) => {
    const { isWeb } = usePlatform();

    const platformProps = {
      className,
      children,
      ref,
      // Normalizar props para cada plataforma
      ...(isWeb ? { /* web-specific props */ } : { /* native-specific props */ }),
    };

    return (
      <React.Suspense fallback={<Fallback {...platformProps} />}>
        {isWeb ? <WebComponent {...platformProps} /> : <NativeComponent {...platformProps} />}
      </React.Suspense>
    );
  }
);

MyComponent.displayName = 'MyComponent';

const Fallback: React.FC<SharedMyComponentProps> = ({ children }) => (
  <div style={{ padding: 16 }}>{children}</div>
);

export default MyComponent;
```

## Migrando Componentes Existentes

### Passo 1: Identificar componentes que usam HTML

```bash
# Encontrar componentes com elementos HTML
grep -r "React\.forwardRef<HTMLButtonElement" src/components/ui/
grep -r "React\.forwardRef<HTMLDivElement" src/components/ui/
grep -r "className=" src/components/ui/ | head -20
```

### Passo 2: Criar versão native

Use a biblioteca nativa correspondente:

| HTML Element | React Native Component |
|--------------|----------------------|
| `<div>` | `<View>` (de nativewind) |
| `<span>` | `<Text>` (de nativewind) |
| `<button>` | `<TouchableOpacity>` ou `<Pressable>` |
| `<input>` | `<TextInput>` |
| `<img>` | `<Image>` |
| `<a>` | `<Text onPress={...}>` |
| `<ul>/<li>` | `<View>` com estilos |

### Passo 3: Criar wrapper cross-platform

Siga o template acima em `src/components/shared/ui/`.

### Passo 4: Atualizar imports

```tsx
// Antes
import { Button } from '@/components/ui/button';

// Depois
import { Button } from '@/components/shared/ui';
```

## Comandos

### Desenvolvimento

```bash
# Web (Vite)
pnpm dev

# iOS (Expo)
pnpm expo:ios

# Android (Expo)
pnpm expo:android

# Web (Expo)
pnpm expo:web
```

### Build

```bash
# Web
pnpm build

# iOS (EAS)
pnpm expo:build:dev
pnpm expo:build:prod

# Android (EAS)
eas build --platform android
```

## Troubleshooting

### Erro: "Element type is invalid"

Causa: Usando componente HTML no React Native.

Solução: Mover para `src/components/web/ui/` e criar versão native em `src/components/native/ui/`.

### Erro: "Cannot read property 'X' of undefined"

Causa: Usando API web-only (window, document) no React Native.

Solução: Usar `isWeb()` ou `isNative()` para detectar plataforma.

```tsx
import { isWeb } from '@/lib/utils';

if (isWeb()) {
  // Usar window, document, etc
  window.localStorage.setItem('key', 'value');
}
```

### NativeWind não está funcionando

Verifique:

1. `babel.config.js` tem `nativewind/babel` preset
2. `metro.config.js` usa `withNativeWind()`
3. `src/global.css` existe e tem `@tailwind` directives
4. Tailwind config tem content paths corretos

### Componentes não estão sendo carregados

Verifique se está importando do lugar certo:

```tsx
// ✅ CORRETO
import { Button } from '@/components/shared/ui';

// ❌ ERRADO (web-only)
import { Button } from '@/components/ui/button';
// ou
import { Button } from '@/components/web/ui/button';
```

## Próximos Passos

1. ✅ Estrutura criada
2. ✅ Hook `usePlatform` implementado
3. ✅ Componentes cross-platform base criados (Button, Card, Input, Text)
4. ✅ Metro + Babel + NativeWind configurados
5. 🔄 **TODO**: Criar versões native dos 69 componentes
6. 🔄 **TODO**: Migrar imports existentes para shared components
7. 🔄 **TODO**: Testar em dispositivos reais

## Referências

- [NativeWind Documentation](https://www.nativewind.dev/)
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Reusables](https://github.com/mrzachnugent/react-native-reusables)
- [shadcn/ui](https://ui.shadcn.com/)
