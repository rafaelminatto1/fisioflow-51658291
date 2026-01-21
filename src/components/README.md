# FisioFlow - Componentes Cross-Platform

## 📁 Estrutura de Diretórios

```
src/components/
├── web/ui/           # Componentes shadcn/ui (web-only)
│   ├── button.tsx    # Usa <button> HTML + Radix UI
│   ├── card.tsx      # Usa <div> HTML
│   ├── input.tsx     # Usa <input> HTML
│   └── ...           # 69 componentes web
│
├── native/ui/        # Componentes React Native (mobile-only)
│   ├── button.tsx    # Usa TouchableOpacity + NativeWind
│   ├── card.tsx      # Usa View + NativeWind
│   ├── input.tsx     # Usa TextInput + NativeWind
│   └── ...           # Componentes a serem criados
│
└── shared/ui/        # Componentes cross-platform ✨
    ├── button.tsx    # Detecta plataforma e usa o correto
    ├── card.tsx      # Wrapper inteligente
    ├── input.tsx     # Props normalizadas
    ├── text.tsx      # Typography cross-platform
    └── index.ts      # Exportações
```

## 🎯 Como Usar

### Importar Componentes Cross-Platform

```tsx
// ✅ CORRETO - Funciona em web E mobile
import { Button, Card, Input } from '@/components/shared/ui';

function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Título</CardTitle>
      </CardHeader>
      <CardContent>
        <Input placeholder="Digite algo" />
        <Button onPress={() => alert('Click')}>Enviar</Button>
      </CardContent>
    </Card>
  );
}
```

### Componentes Específicos da Plataforma

```tsx
// Web-only (só funciona na web)
import { Button as WebButton } from '@/components/web/ui/button';

// Native-only (só funciona no React Native)
import { Button as NativeButton } from '@/components/native/ui/button';
```

## 🪝 Hook usePlatform

```tsx
import { usePlatform } from '@/hooks/platform';

function MyComponent() {
  const { isWeb, isNative, isIOS, isAndroid } = usePlatform();

  if (isWeb) {
    return <div>Componente Web</div>;
  }

  if (isIOS) {
    return <View>Componente iOS</View>;
  }

  return <View>Componente Android</View>;
}
```

## 📦 Componentes Disponíveis

### Cross-Platform ✅

| Componente | Web Element | Native Component | Status |
|------------|-------------|------------------|--------|
| Button | `<button>` | TouchableOpacity | ✅ |
| Card | `<div>` | View | ✅ |
| Input | `<input>` | TextInput | ✅ |
| Text | `<span>/<p>` | Text | ✅ |

### Web-Only 🌐

69 componentes shadcn/ui baseados em HTML/Radix UI:
- accordion, alert, alert-dialog, aspect-ratio
- avatar, badge, breadcrumb, button, calendar
- card, carousel, chart, checkbox, collapsible
- command, context-menu, date-range-picker
- dialog, drawer, dropdown-menu, form
- hover-card, label, menubar, navigation-menu
- pagination, popover, progress, radio-group
- resizable, scroll-area, select, separator
- sheet, sidebar, slider, sonner, switch
- table, tabs, textarea, toast, toggle
- toggle-group, tooltip, etc...

### Native-Only 📱

Componentes que precisam ser criados:
- [ ] Accordion
- [ ] Alert/AlertDialog
- [ ] Avatar
- [ ] Badge
- [ ] Checkbox
- [ ] Select/Dropdown
- [ ] Switch
- [ ] Tabs
- [ ] Toast/Sonner
- [ ] ... (61 restantes)

## 🛠️ Criar Novo Componente Native

### 1. Criar Componente Native

```tsx
// src/components/native/ui/my-component.tsx
import React from 'react';
import { View } from 'react-native';
import { cn } from '@/lib/utils';

export interface MyComponentProps {
  children: React.ReactNode;
  className?: string;
}

export const MyComponent = React.forwardRef<View, MyComponentProps>(
  ({ children, className }, ref) => {
    return (
      <View ref={ref} className={cn('base-styles', className)}>
        {children}
      </View>
    );
  }
);
```

### 2. Criar Wrapper Cross-Platform

```tsx
// src/components/shared/ui/my-component.tsx
import React from 'react';
import { usePlatform } from '@/hooks/platform';

const WebComponent = React.lazy(() =>
  import('@/components/web/ui/my-component').then(m => ({ default: m.MyComponent }))
);

const NativeComponent = React.lazy(() =>
  import('@/components/native/ui/my-component').then(m => ({ default: m.MyComponent }))
);

export const MyComponent = (props) => {
  const { isWeb } = usePlatform();

  return (
    <React.Suspense fallback={<Fallback />}>
      {isWeb ? <WebComponent {...props} /> : <NativeComponent {...props} />}
    </React.Suspense>
  );
};
```

### 3. Exportar

```tsx
// src/components/shared/ui/index.ts
export { MyComponent } from './my-component';
```

## 📚 Documentação

- **Guia Completo**: [HYBRID_WEB_NATIVE_GUIDE.md](../../HYBRID_WEB_NATIVE_GUIDE.md)
- **Quick Reference**: [COMPONENTS_QUICK_REFERENCE.md](../../COMPONENTS_QUICK_REFERENCE.md)

## 🚀 Comandos

```bash
# Web
pnpm dev              # Desenvolvimento
pnpm build            # Build de produção

# iOS
pnpm expo:ios         # Desenvolvimento
eas build --platform ios    # Build de produção

# Android
pnpm expo:android     # Desenvolvimento
eas build --platform android  # Build de produção
```

## ⚠️ Importante

**Sempre** importe componentes cross-platform de `@/components/shared/ui` para garantir que funcione em ambas as plataformas.

```tsx
// ✅ CORRETO
import { Button } from '@/components/shared/ui';

// ❌ ERRADO (pode quebrar em uma das plataformas)
import { Button } from '@/components/ui/button';
```
