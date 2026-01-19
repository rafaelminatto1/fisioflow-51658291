# 🔄 Diferenças Web vs Mobile - FisioFlow

## 📊 Comparativo Geral

### Arquitetura

| Aspecto | Web App | iOS App |
|---------|---------|---------|
| **Código Compartilhado** | 100% | ~90% |
| **Entry Point** | `index.html` | `ios/App/App/public` |
| **Build Output** | `dist/` | Sync via Capacitor |
| **Deploy** | Vercel (automático) | App Store (manual) |
| **Atualizações** | Instantâneas | Via review da Apple |
| **Debug** | Chrome DevTools | Safari + Xcode |
| **Performance** | V8 (Chrome/Safari) | Safari WebView (otimizado) |

## 🎯 Funcionalidades

### ✅ Funcionalidades Iguais

#### Core Features
- [x] Autenticação via Supabase
- [x] Gestão completa de pacientes
- [x] Agenda com visualizações múltiplas
- [x] Prontuário SOAP
- [x] Biblioteca de exercícios
- [x] Fichas de avaliação
- [x] Evoluções de pacientes
- [x] Dashboard analytics
- [x] Relatórios básicos

#### Estado Global
- [x] Zustand stores (compartilhado)
- [x] React Query (compartilhado)
- [x] Context API (compartilhado)
- [x] Local Storage (compartilhado)

#### UI Components
- [x] shadcn/ui components
- [x] Tailwind CSS styling
- [x] Responsive design
- [x] Dark mode (futuro)

### 🆕 Funcionalidades Exclusivas iOS

#### 1. Autenticação Biométrica

**Web**: ❌ Não disponível
**iOS**: ✅ Face ID / Touch ID

```typescript
// Hook exclusivo mobile
import { useBiometricAuth } from '@/hooks/useBiometricAuth';

function LoginScreen() {
  const { authenticate, isAvailable } = useBiometricAuth();

  return (
    <Button
      onPress={authenticate}
      disabled={!isAvailable}
    >
      Entrar com Face ID
    </Button>
  );
}
```

**Benefícios:**
- Login rápido (sem digitar senha)
- Maior segurança
- Experiência premium

#### 2. Push Notifications Nativas

**Web**: ⚠️ Limitado (Service Worker, pouco suporte)
**iOS**: ✅ Apple Push Notification Service (APNs)

```typescript
// Exclusivo mobile
import { registerPushNotifications } from '@/lib/push-notifications';

// Efeito na UX:
// - Lembrete de consulta (mesmo app fechado)
// - Confirmação de agendamento
// - Mensagem do paciente
// - Alerta de tarefa pendente
```

**Benefícios:**
- Notificações em tempo real
- Customizáveis (som, badge, alert)
- Maior taxa de abertura

#### 3. Câmera Nativa

**Web**: ⚠️ Via browser (limitado, sem edição)
**iOS**: ✅ UIImagePickerController com edição

```typescript
// Exclusivo mobile
import { Camera, CameraResultType } from '@capacitor/camera';

async function takePhoto() {
  const image = await Camera.getPhoto({
    quality: 90,
    allowEditing: true,
    resultType: CameraResultType.Uri,
  });

  // Usar para:
  // - Foto de exercícios
  // - Documentos do paciente
  // - Comprovantes
}
```

**Benefícios:**
- Melhor qualidade de imagem
- Edição embutida
- Acesso direto à galeria

#### 4. Geolocalização Precisa

**Web**: ⚠️ IP-based (pouco preciso)
**iOS**: ✅ GPS real (precisão de metros)

```typescript
// Exclusivo mobile
import { Geolocation } from '@capacitor/geolocation';

async function recordCheckIn() {
  const position = await Geolocation.getCurrentPosition({
    enableHighAccuracy: true,
  });

  // Usar para:
  // - Check-in em atendimentos
  // - Verificar presença do fisioterapeuta
  // - Comprovação de consulta
}
```

**Benefícios:**
- Precisão de GPS real
- Permite comprovação de presença
- Mais confiável

#### 5. Haptics (Feedback Tátil)

**Web**: ❌ Não disponível
**iOS**: ✅ UIImpactFeedbackGenerator

```typescript
// Exclusivo mobile
import { Haptics, ImpactStyle } from '@capacitor/haptics';

// Efeitos:
await Haptics.impact({ style: ImpactStyle.Light });   // Toque leve
await Haptics.impact({ style: ImpactStyle.Medium });  // Toque médio
await Haptics.impact({ style: ImpactStyle.Heavy });   // Toque forte
await Haptics.notification({ type: NotificationType.Success }); // Sucesso
```

**Benefícios:**
- Feedback tátil em ações
- Confirmação sem olhar
- Experiência mais imersiva

#### 6. Safe Area / Notch

**Web**: ❌ Não se aplica
**iOS**: ✅ Adaptação automática

```typescript
// Exclusivo mobile
import { SafeArea } from 'capacitor-safe-area';

// Usar para:
// - Evitar conteúdo atrás do notch
// - Respeitar área inferior (home indicator)
// - Layout perfeito em todos os iPhones
```

#### 7. Keyboard Handling

**Web**: ⚠️ Limitado
**iOS**: ✅ Controle total do teclado

```typescript
// Exclusivo mobile
import { Keyboard } from '@capacitor/keyboard';

// Mostrar/ocultar teclado programaticamente
await Keyboard.show();
await Keyboard.hide();

// Eventos
Keyboard.addListener('keyboardWillShow', (info) => {
  // Ajustar layout quando teclado abrir
});
```

#### 8. Share Sheet Nativo

**Web**: ⚠️ Navigator.share (pouco suporte)
**iOS**: ✅ UIActivityViewController

```typescript
// Exclusivo mobile
import { Share } from '@capacitor/share';

await Share.share({
  title: 'FisioFlow',
  text: 'Confira este exercício!',
  url: 'https://fisioflow.com/exercicio/123',
});
```

### ❌ Funcionalidades NÃO Disponíveis no Mobile

#### 1. Admin de Sistema

**Motivo:** Complexidade para tela pequena

**Solução:** Usar web app para admin

```typescript
// Detectar mobile e mostrar aviso
import { Capacitor } from '@capacitor/core';

if (Capacitor.isNativePlatform()) {
  // Redirect to web for admin
  // ou mostrar mensagem: "Use o web app para admin"
}
```

#### 2. Relatórios Complexos

**Motivo:** Tela pequena não comporta tabelas grandes

**Solução:** Simplificar ou exportar PDF

```typescript
// No mobile, oferecer:
// - Resumo simplificado
// - Exportar PDF
// - Enviar por email
```

#### 3. Configurações Avançadas

**Motivo:** Usuário mobile geralmente é final user, não admin

**Solução:** Manter no web app

#### 4. Multi-window (Simultaneous)

**Motivo:** iOS não suporta múltiplas janelas como desktop

**Solução:** Navegação por tabs

## 🎨 Diferenças de UI/UX

### Navegação

| Web | iOS |
|-----|-----|
| Sidebar (esquerda) | Bottom Tab Bar (inferior) |
| Dropdown menu | Action Sheet |
| Hover states | Tap states |
| Scroll livre | Scroll com physics |

### Layout

| Aspecto | Web | iOS |
|---------|-----|-----|
| **Breakpoints** | sm, md, lg, xl | iPhone, iPad |
| **Safe Area** | Não se aplica | Respeitar notch/home indicator |
| **Touch Target** | 32x32px | Mínimo 44x44px |
| **Font Size** | 14-16px base | 16-18px base |
| **Spacing** | 4px grid | 8px grid |

### Componentes

#### 1. Navegação Principal

**Web** - Sidebar:
```tsx
<Sidebar>
  <SidebarItem icon={Users}>Pacientes</SidebarItem>
  <SidebarItem icon={Calendar}>Agenda</SidebarItem>
  <SidebarItem icon={Dumbbell}>Exercícios</SidebarItem>
</Sidebar>
```

**iOS** - Bottom Tab Bar:
```tsx
import { BottomTabBar } from '@/components/mobile/BottomTabBar';

<BottomTabBar>
  <TabBar icon={Users}>Pacientes</TabBar>
  <TabBar icon={Calendar}>Agenda</TabBar>
  <TabBar icon={Dumbbell}>Exercícios</TabBar>
</BottomTabBar>
```

#### 2. Listas

**Web** - Table:
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableCell>Nome</TableCell>
      <TableCell>Email</TableCell>
      <TableCell>Ações</TableCell>
    </TableRow>
  </TableHeader>
  <TableBody>
    {/* linhas */}
  </TableBody>
</Table>
```

**iOS** - Cards with swipe:
```tsx
import { SwipeableListItem } from '@/components/mobile/SwipeableListItem';

<SwipeableListItem
  leftActions={[{ icon: Edit, action: onEdit }]}
  rightActions={[{ icon: Trash, action: onDelete }]}
>
  <PatientCard patient={patient} />
</SwipeableListItem>
```

#### 3. Modais

**Web** - Dialog:
```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    {/* conteúdo */}
  </DialogContent>
</Dialog>
```

**iOS** - Sheet (bottom sheet):
```tsx
import { BottomSheet } from '@/components/mobile/BottomSheet';

<BottomSheet open={open} onClose={onClose} snapPoints={['50%', '90%']}>
  {/* conteúdo */}
</BottomSheet>
```

## 🔄 Sincronização de Estado

### AsyncStorage (Mobile) vs LocalStorage (Web)

```typescript
// Abstração que funciona em ambos
import { Storage } from '@capacitor/storage';

// Em web, usa localStorage
// Em mobile, usa SQLite nativo

await Storage.set({ key: 'user', value: JSON.stringify(user) });
const { value } = await Storage.get({ key: 'user' });
```

### Supabase Realtime (Ambos)

```typescript
// Funciona igual em ambos
import { RealtimeChannel } from '@supabase/supabase-js';

const channel = supabase
  .channel('appointments')
  .on('postgres_changes', { event: 'INSERT', schema: 'public' }, (payload) => {
    // Nova consulta criada
  })
  .subscribe();
```

## 📱 Detecção de Plataforma

### Capacitor APIs

```typescript
import { Capacitor } from '@capacitor/core';

// Verificar se é nativo
if (Capacitor.isNativePlatform()) {
  // Código específico mobile
}

// Verificar plataforma específica
if (Capacitor.getPlatform() === 'ios') {
  // iOS-specific
} else if (Capacitor.getPlatform() === 'android') {
  // Android-specific (futuro)
}

// Verificar se está disponível
import { Camera } from '@capacitor/camera';

// Camera não funciona em web
if (Capacitor.isPluginAvailable('Camera')) {
  // Usar câmera nativa
} else {
  // Fallback para web
}
```

### Hook de Plataforma

```typescript
// src/hooks/usePlatform.ts
import { Capacitor } from '@capacitor/core';
import { createContext, useContext } from 'react';

interface PlatformContext {
  isNative: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isWeb: boolean;
}

const PlatformContext = createContext<PlatformContext>({
  isNative: false,
  isIOS: false,
  isAndroid: false,
  isWeb: true,
});

export function PlatformProvider({ children }) {
  const platform = Capacitor.getPlatform();
  const isNative = Capacitor.isNativePlatform();

  const value: PlatformContext = {
    isNative,
    isIOS: platform === 'ios',
    isAndroid: platform === 'android',
    isWeb: platform === 'web',
  };

  return (
    <PlatformContext.Provider value={value}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform() {
  return useContext(PlatformContext);
}
```

## 🧪 Testes Diferenciados

### Web Tests
```typescript
// Vitest - corre rápido
import { render, screen } from '@testing-library/react';

test('renders patient list', () => {
  render(<PatientList />);
  expect(screen.getByText('Pacientes')).toBeInTheDocument();
});
```

### Mobile Tests
```typescript
// @capacitor/device para informações do device
import { Device } from '@capacitor/device';

const info = await Device.getInfo();
// info.model = "iPhone15,2"
// info.platform = "ios"
```

## 📊 Estrutura de Pastas

```
fisioflow-51658291/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui (compartilhado)
│   │   ├── web/             # Web-only components
│   │   │   ├── Sidebar.tsx
│   │   │   └── DataTable.tsx
│   │   └── mobile/          # iOS-only components
│   │       ├── BottomTabBar.tsx
│   │       ├── SafeArea.tsx
│   │       └── SwipeableListItem.tsx
│   ├── hooks/
│   │   ├── useAuth.ts       # Compartilhado
│   │   └── useBiometricAuth.ts  # Mobile-only
│   └── lib/
│       ├── api.ts           # Compartilhado
│       └── camera.ts        # Mobile-only
├── ios/                     # iOS nativo (gerado pelo Capacitor)
└── capacitor.config.ts      # Config Capacitor
```

## 🔄 Fluxo de Desenvolvimento

### Web
```bash
npm run dev              # Hot reload
# Mudanças refletem instantaneamente
```

### iOS
```bash
npm run build            # Build do web
npx cap sync             # Sync com iOS
npm run cap:run:ios      # Roda no simulador
# Precisa rebuild+sync a cada mudança
```

---

**Última atualização**: 19 de Janeiro de 2026
