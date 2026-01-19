# 🚀 Guia de Implementação iOS - FisioFlow Mobile

## 📋 Índice

1. [Setup Inicial](#1-setup-inicial)
2. [Adicionando Plataforma iOS](#2-adicionando-plataforma-ios)
3. [Configuração do Projeto](#3-configuração-do-projeto)
4. [Implementando Features Mobile](#4-implementando-features-mobile)
5. [Ajustes de UI/UX](#5-ajustes-de-uiux)
6. [Testes](#6-testes)
7. [Build de Produção](#7-build-de-produção)

---

## 1. Setup Inicial

### 1.1 Pré-requisitos

Antes de começar, certifique-se de ter:

- [ ] macOS 12.0+ (Monterey ou superior)
- [ ] Xcode 13.0+ instalado
- [ ] CocoaPods instalado (`sudo gem install cocoapods`)
- [ ] Node.js 18.0+
- [ ] Conta Apple Developer ($99/ano)

### 1.2 Verificar Ambiente

```bash
# Criar script de verificação
cat > verify-setup.sh << 'EOF'
#!/bin/bash

echo "🔍 Verificando ambiente..."

# macOS
echo -n "macOS: "
sw_vers -productVersion

# Xcode
echo -n "Xcode: "
xcodebuild -version | head -n 1

# CocoaPods
echo -n "CocoaPods: "
pod --version

# Node.js
echo -n "Node.js: "
node --version

# Capacitor
echo -n "Capacitor: "
npx cap --version 2>/dev/null || echo "usando npx"

echo "✅ Verificação concluída!"
EOF

chmod +x verify-setup.sh
./verify-setup.sh
```

---

## 2. Adicionando Plataforma iOS

### 2.1 Instalar Dependências Capacitor

As dependências já estão instaladas no projeto. Verifique:

```bash
# Verificar package.json
grep "@capacitor" package.json

# Saída esperada:
# "@capacitor/core": "^7.4.3",
# "@capacitor/cli": "^7.4.3",
# "@capacitor/ios": "^7.4.3",
```

### 2.2 Adicionar Plataforma iOS

```bash
# No diretório raiz do projeto
cd /home/rafael/cursor/fisiolovable/fisioflow-51658291

# Adicionar plataforma iOS
npm run cap:ios

# Ou manualmente:
npx cap add ios

# Verificar que pasta ios/ foi criada
ls -la ios/

# Saída esperada:
# drwxr-xr-x  App
# -rw-r--r--  Podfile
# -rw-r--r--  capacitor.config.json
```

### 2.3 Estrutura Criada

```
ios/
├── App/
│   ├── App.xcodeproj          # Projeto Xcode
│   ├── App.xcworkspace         # Workspace (com CocoaPods)
│   └── App/
│       ├── public/             # Arquivos build (sync do dist/)
│       ├── AppDelegate.swift   # Delegate principal
│       └── Info.plist          # Configurações iOS
├── Podfile                     # Dependências Ruby/CocoaPods
└── capacitor.config.json       # Config sync Capacitor
```

---

## 3. Configuração do Projeto

### 3.1 Primeiro Build

```bash
# Build do projeto web
npm run build

# Sincronizar com iOS (copia arquivos + atualiza nativo)
npm run cap:sync

# Abrir no Xcode
npm run cap:open:ios
```

### 3.2 Configurações no Xcode

#### 3.2.1 Abrir Projeto

O Xcode abrirá automaticamente com o projeto `App.xcodeproj`.

#### 3.2.2 General Settings

No Xcode, selecione o target "App" e vá em "General":

| Campo | Valor |
|-------|-------|
| **Display Name** | FisioFlow |
| **Bundle Identifier** | com.fisioflow.app |
| **Version** | 1.0.0 |
| **Build** | 1 |
| **Deployment Target** | 13.0 |

#### 3.2.3 Signing & Capabilities

Vá em "Signing & Capabilities":

1. **Team**: Selecione sua conta Apple Developer
2. **Capabilities**: Adicione:
   - ✅ Push Notifications
   - ✅ In-App Purchase (futuro)
   - ✅ Background Modes > Remote notifications

#### 3.2.4 Info.plist

Abra `ios/App/App/Info.plist` e adicione:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <!-- App Info -->
  <key>CFBundleDisplayName</key>
  <string>FisioFlow</string>
  <key>CFBundleIdentifier</key>
  <string>com.fisioflow.app</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0.0</string>

  <!-- Permissões -->
  <key>NSCameraUsageDescription</key>
  <string>Precisamos da câmera para tirar fotos de exercícios e evoluções dos pacientes</string>

  <key>NSPhotoLibraryUsageDescription</key>
  <string>Precisamos acessar suas fotos para adicionar aos prontuários dos pacientes</string>

  <key>NSPhotoLibraryAddUsageDescription</key>
  <string>Precisamos salvar fotos de exercícios na sua galeria</string>

  <key>NSMicrophoneUsageDescription</key>
  <string>Precisamos do microfone para videoconferências com pacientes</string>

  <key>NSLocationWhenInUseUsageDescription</key>
  <string>Precisamos da sua localização para registrar check-in em atendimentos</string>

  <key>NSFaceIDUsageDescription</key>
  <string>Use Face ID ou Touch ID para login rápido e seguro no FisioFlow</string>

  <!-- Orientação -->
  <key>UISupportedInterfaceOrientations</key>
  <array>
    <string>UIInterfaceOrientationPortrait</string>
  </array>

  <key>UISupportedInterfaceOrientations~ipad</key>
  <array>
    <string>UIInterfaceOrientationPortrait</string>
    <string>UIInterfaceOrientationPortraitUpsideDown</string>
    <string>UIInterfaceOrientationLandscapeLeft</string>
    <string>UIInterfaceOrientationLandscapeRight</string>
  </array>

  <!-- Status Bar -->
  <key>UIStatusBarStyle</key>
  <string>UIStatusBarStyleDefault</string>

  <key>UIViewControllerBasedStatusBarAppearance</key>
  <true/>

  <!-- Background Modes -->
  <key>UIBackgroundModes</key>
  <array>
    <string>remote-notification</string>
  </array>

  <!-- App Transport Security -->
  <key>NSAppTransportSecurity</key>
  <dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
  </dict>
</dict>
</plist>
```

### 3.3 Instalar CocoaPods

```bash
# Entrar na pasta iOS
cd ios

# Instalar dependências
pod install

# Se der erro, tente:
pod update

# Voltar à raiz
cd ..
```

---

## 4. Implementando Features Mobile

### 4.1 Hooks e Services

#### Criar Estrutura de Pastas

```bash
# Criar pastas para código mobile
mkdir -p src/hooks
mkdir -p src/lib
mkdir -p src/components/mobile
```

#### 4.1.1 Hook de Biometria

Crie `src/hooks/useBiometricAuth.ts`:

```typescript
import { LocalAuthentication } from '@capacitor/local-authentication';
import { useCallback, useEffect, useState } from 'react';

export function useBiometricAuth() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [deviceType, setDeviceType] = useState<'faceId' | 'touchId'>('faceId');

  useEffect(() => {
    checkAvailability();
  }, []);

  const checkAvailability = useCallback(async () => {
    try {
      const available = await LocalAuthentication.isAvailable();
      setIsAvailable(available);

      if (available) {
        const supported = await LocalAuthentication.getSupportedAuthenticationTypes();

        if (supported.includes('face')) {
          setDeviceType('faceId');
        } else if (supported.includes('finger')) {
          setDeviceType('touchId');
        }
      }
    } catch (error) {
      console.error('Erro ao verificar disponibilidade:', error);
      setIsAvailable(false);
    }
  }, []);

  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!isAvailable) return false;

    try {
      const result = await LocalAuthentication.authenticate({
        reason: 'Autentique para acessar o FisioFlow',
        title: 'Autenticação Biométrica',
        subtitle: deviceType === 'faceId' ? 'Use Face ID' : 'Use Touch ID',
        fallbackTitle: 'Usar Senha',
        cancelTitle: 'Cancelar',
      });

      setIsAuthenticated(result);
      return result;
    } catch (error) {
      console.error('Erro na autenticação:', error);
      return false;
    }
  }, [isAvailable, deviceType]);

  return {
    isAvailable,
    isAuthenticated,
    deviceType,
    authenticate,
    checkAvailability,
  };
}
```

#### 4.1.2 Service de Push Notifications

Crie `src/lib/push-notifications.ts`:

```typescript
import { PushNotifications, Token, PushNotificationSchema } from '@capacitor/push-notifications';
import { supabase } from './supabase';

export async function initPushNotifications() {
  const result = await PushNotifications.requestPermissions();

  if (result.receive !== 'granted') {
    console.warn('Permissão de notificação negada');
    return;
  }

  await PushNotifications.register();

  await PushNotifications.addListener('registration', async (token: Token) => {
    console.log('Push token:', token.value);
    await savePushToken(token.value);
  });

  await PushNotifications.addListener('registrationError', (error: any) => {
    console.error('Erro no registro:', error);
  });

  await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
    console.log('Notificação recebida:', notification);
  });

  await PushNotifications.addListener('pushNotificationActionPerformed', (notification: PushNotificationSchema) => {
    console.log('Notificação clicada:', notification);
    // TODO: Navegar para tela relevante
  });
}

async function savePushToken(token: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from('user_push_tokens').upsert({
      user_id: user.id,
      token: token,
      platform: 'ios',
    });
  }
}
```

#### 4.1.3 Service de Câmera

Crie `src/lib/camera.ts`:

```typescript
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export async function takePhoto() {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: true,
      correctOrientation: true,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
    });

    return image.webPath;
  } catch (error) {
    console.error('Erro ao tirar foto:', error);
    return null;
  }
}

export async function pickFromGallery() {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: true,
      resultType: CameraResultType.Uri,
      source: CameraSource.Photos,
    });

    return image.webPath;
  } catch (error) {
    console.error('Erro ao selecionar foto:', error);
    return null;
  }
}
```

#### 4.1.4 Service de Geolocalização

Crie `src/lib/geolocation.ts`:

```typescript
import { Geolocation } from '@capacitor/geolocation';

export async function getCurrentLocation() {
  try {
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
    });

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
    };
  } catch (error) {
    console.error('Erro ao obter localização:', error);
    return null;
  }
}
```

### 4.2 Componentes Mobile

#### 4.2.1 Bottom Tab Bar

Crie `src/components/mobile/BottomTabBar.tsx`:

```typescript
import { Home, Users, Calendar, Dumbbell, User } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface TabItem {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const tabs: TabItem[] = [
  { path: '/dashboard', icon: Home, label: 'Início' },
  { path: '/patients', icon: Users, label: 'Pacientes' },
  { path: '/agenda', icon: Calendar, label: 'Agenda' },
  { path: '/exercises', icon: Dumbbell, label: 'Exercícios' },
  { path: '/profile', icon: User, label: 'Perfil' },
];

export function BottomTabBar() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe">
      <div className="flex justify-around items-center h-16">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;

          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive: isNavActive }) =>
                cn(
                  'flex flex-col items-center justify-center flex-1 h-full',
                  isNavActive ? 'text-blue-500' : 'text-gray-400'
                )
              }
            >
              <Icon className={cn('w-6 h-6', isActive && 'fill-current')} />
              <span className="text-xs mt-1">{tab.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
```

#### 4.2.2 Safe Area Wrapper

Crie `src/components/mobile/SafeArea.tsx`:

```typescript
import { ReactNode } from 'react';

interface SafeAreaProps {
  children: ReactNode;
  className?: string;
}

export function SafeArea({ children, className = '' }: SafeAreaProps) {
  return (
    <div
      className={className}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      {children}
    </div>
  );
}
```

### 4.3 Integração no App

#### Atualizar `src/App.tsx`:

```typescript
import { Capacitor } from '@capacitor/core';
import { BottomTabBar } from '@/components/mobile/BottomTabBar';
import { SafeArea } from '@/components/mobile/SafeArea';
import { useEffect } from 'react';
import { initPushNotifications } from '@/lib/push-notifications';

function App() {
  useEffect(() => {
    // Inicializar push notifications apenas em iOS nativo
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
      initPushNotifications();
    }
  }, []);

  return (
    <SafeArea className="min-h-screen bg-gray-50">
      {/* Routes existentes */}
      <Routes>
        {/* ... suas rotas ... */}
      </Routes>

      {/* Bottom Tab Bar apenas em mobile */}
      {Capacitor.isNativePlatform() && <BottomTabBar />}
    </SafeArea>
  );
}

export default App;
```

---

## 5. Ajustes de UI/UX

### 5.1 Meta Tags para Mobile

Atualize `index.html`:

```html
<head>
  <!-- Viewport -->
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no" />

  <!-- Apple Mobile Web App -->
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="FisioFlow" />

  <!-- Theme Color -->
  <meta name="theme-color" content="#0EA5E9" />

  <!-- Safe Area -->
  <meta name="viewport-fit" content="cover" />
</head>
```

### 5.2 CSS Adjustments

Adicione ao `src/index.css`:

```css
/* Safe Area Insets */
@supports (padding: env(safe-area-inset-top)) {
  .pb-safe {
    padding-bottom: env(safe-area-inset-bottom);
  }

  .pt-safe {
    padding-top: env(safe-area-inset-top);
  }

  .px-safe {
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
  }
}

/* Touch Targets */
button,
a,
[role="button"] {
  min-height: 44px;
  min-width: 44px;
}

/* Scroll Momentum */
.overflow-y-auto {
  -webkit-overflow-scrolling: touch;
}

/* Text Selection */
* {
  -webkit-tap-highlight-color: transparent;
}

/* Disable zoom on input focus */
input,
textarea,
select {
  font-size: 16px !important;
}
```

### 5.3 Tailwind Config

Atualize `tailwind.config.ts`:

```typescript
export default {
  theme: {
    extend: {
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
    },
  },
};
```

---

## 6. Testes

### 6.1 Testar no Simulador

```bash
# Rodar no simulador
npm run cap:run:ios

# Ou via Xcode:
# 1. Abra o Xcode: npm run cap:open:ios
# 2. Selecione o simulador (ex: iPhone 15 Pro)
# 3. Clique no botão ▶️ (Run)
```

### 6.2 Testar em Dispositivo Real

```bash
# 1. Conecte iPhone via USB
# 2. Confie no computador (no iPhone)
# 3. No Xcode, selecione seu dispositivo
# 4. Clique em ▶️ (Run)
```

### 6.3 Verificar Logs

```bash
# Via Xcode:
# Window > Devices and Simulators > Selecione device > Open Console

# Ou via Terminal:
xcrun simctl spawn booted log stream --predicate 'processImagePath contains "App"'
```

---

## 7. Build de Produção

### 7.1 Build Otimizado

```bash
# Build de produção
npm run build:prod

# Sync com iOS
npm run cap:sync
```

### 7.2 Archive no Xcode

1. Abra o Xcode: `npm run cap:open:ios`
2. Selecione target "Any iOS Device"
3. Product > Archive
4. Aguarde o build
5. Organizer abrirá automaticamente

### 7.3 Distribuir

1. No Organizer: "Distribute App"
2. Selecione "App Store Connect"
3. Siga o wizard
4. Upload

---

## 📋 Checklist Final

### Setup
- [ ] Capacitor iOS adicionado
- [ ] Xcode configurado
- [ ] CocoaPods instalados
- [ ] Info.plist configurado
- [ ] Build funcional

### Features
- [ ] Autenticação biométrica
- [ ] Push notifications
- [ ] Câmera
- [ ] Geolocalização
- [ ] Haptics
- [ ] Safe area

### UI/UX
- [ ] Bottom tab bar
- [ ] Safe area insets
- [ ] Touch targets (44x44px)
- [ ] Meta tags configuradas
- [ ] CSS ajustes

### Testes
- [ ] Testado no simulador
- [ ] Testado em dispositivo real
- [ ] Todas as features funcionando
- [ ] Performance ok

### Deploy
- [ ] Archive criado
- [ ] Upload para App Store Connect
- [ ] Metadados preenchidos
- [ ] Submetido para revisão

---

**Última atualização**: 19 de Janeiro de 2026
