# Quick Reference - Componentes Cross-Platform

## Resumo Rápido

| Import Antigo | Import Novo | O que mudou |
|---------------|-------------|-------------|
| `@/components/ui/button` | `@/components/shared/ui` | ✅ Cross-platform |
| `@/components/ui/card` | `@/components/shared/ui` | ✅ Cross-platform |
| `@/components/ui/input` | `@/components/shared/ui` | ✅ Cross-platform |

## Cheat Sheet de Imports

```tsx
// ✅ Cross-Platform (funciona em web e mobile)
import { Button, Card, Input } from '@/components/shared/ui';

// ⚠️ Web-Only (só funciona na web)
import { Button as WebButton } from '@/components/web/ui/button';

// ⚠️ Native-Only (só funciona no React Native)
import { Button as NativeButton } from '@/components/native/ui/button';
```

## Hook usePlatform

```tsx
import { usePlatform } from '@/hooks/platform';

function MyComponent() {
  const { isWeb, isNative, isIOS, isAndroid } = usePlatform();

  if (isWeb) return <WebComponent />;
  if (isIOS) return <IOSComponent />;
  return <AndroidComponent />;
}
```

## Utilitários

```tsx
import { cn, isWeb, isNative, copyToClipboard } from '@/lib/utils';

// cn funciona igual em web e native
<div className={cn('bg-primary text-white', isActive && 'bg-secondary')} />

// Detecção de plataforma
if (isWeb()) {
  window.open(url);
}

// Clipboard cross-platform
await copyToClipboard('Texto');
```

## Props Normalizadas

| Prop Web | Prop Native | Componente Cross-Platform |
|----------|-------------|---------------------------|
| `onClick` | `onPress` | Ambos aceitam ✅ |
| `className` | `className` | Ambos aceitam ✅ |
| `type="email"` | `keyboardType="email-address"` | Auto-normalizado ✅ |
| `readOnly` | `editable={false}` | Auto-normalizado ✅ |
| `onChange` | `onChangeText` | Ambos aceitos ✅ |
| `id` | `testID` | Auto-normalizado ✅ |

## Exemplos Práticos

### Button

```tsx
import { Button } from '@/components/shared/ui';

// ✅ Funciona em ambos
<Button variant="primary" onPress={handleClick}>
  Clique Aqui
</Button>

// ✅ Loading state
<Button loading={isLoading}>
  Salvando...
</Button>
```

### Card

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shared/ui';

// ✅ Funciona em ambos
<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle>
  </CardHeader>
  <CardContent>
    <Text>Conteúdo</Text>
  </CardContent>
</Card>
```

### Input

```tsx
import { Input } from '@/components/shared/ui';

// ✅ Funciona em ambos
<Input
  placeholder="Email"
  keyboardType="email-address"
  value={email}
  onChangeText={setEmail}
/>
```

## Componentes Pendentes de Migração

Migrar estes 69 componentes web para native:

```
accordion, alert, alert-dialog, aspect-ratio, avatar, badge,
breadcrumb, calendar, carousel, chart, checkbox, collapsible,
command, context-menu, date-range-picker, dialog, drawer,
dropdown-menu, form, hover-card, label, menubar, navigation-menu,
pagination, popover, progress, radio-group, resizable, scroll-area,
select, separator, sheet, sidebar, slider, sonner, switch, table,
tabs, textarea, toast, toggle, toggle-group, tooltip, etc...
```

## Como Criar Componente Native

1. **Criar em `src/components/native/ui/`**
```tsx
import { View } from 'react-native';
import { cn } from '@/lib/utils';

export const MyComponent = ({ className, ...props }) => (
  <View className={cn('base-styles', className)} {...props} />
);
```

2. **Criar wrapper em `src/components/shared/ui/`**
```tsx
import { usePlatform } from '@/hooks/platform';
const Web = React.lazy(() => import('@/components/web/ui/my-component'));
const Native = React.lazy(() => import('@/components/native/ui/my-component'));

export const MyComponent = (props) => {
  const { isWeb } = usePlatform();
  return <React.Suspense fallback={null}>
    {isWeb ? <Web {...props} /> : <Native {...props} />}
  </React.Suspense>;
};
```

## Comandos Úteis

```bash
# Desenvolvimento
pnpm dev              # Web
pnpm expo:ios         # iOS
pnpm expo:android     # Android

# Build
pnpm build            # Web
eas build --platform ios    # iOS
eas build --platform android  # Android
```
