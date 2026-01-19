# 📋 Requisitos iOS - FisioFlow Mobile

## 🖥️ Requisitos de Sistema

### Hardware

#### Para Desenvolvimento
| Componente | Mínimo | Recomendado |
|------------|--------|-------------|
| **Mac** | MacBook Air M1 | MacBook Pro M2/M3 |
| **RAM** | 8GB | 16GB+ |
| **Armazenamento** | 256GB livre | 512GB+ livre |
| **Monitor** | 13" | 16"+ |

#### Para Testes
| Dispositivo | Versão iOS | Uso |
|-------------|------------|-----|
| **iPhone SE** | 15+ | Teste tela pequena |
| **iPhone 15** | 17+ | Teste padrão |
| **iPhone 15 Pro Max** | 17+ | Teste tela grande |
| **iPad** | 15+ | Teste tablet |

### Software Obrigatório

#### 1. macOS
```bash
# Verificar versão
sw_vers

# Saída esperada:
# ProductName:	macOS
# ProductVersion:	12.0.0+ (Monterey ou superior)
# BuildVersion:	21XXXX
```

**Versões Suportadas:**
- ✅ macOS 12 Monterey (LTS)
- ✅ macOS 13 Ventura
- ✅ macOS 14 Sonoma
- ✅ macOS 15 Sequoia

#### 2. Xcode
```bash
# Instalar via App Store
# Ou via linha de comando (requer Apple ID)
mas search xcode
mas install 497799835
```

**Versão Mínima:** 13.0+

**Verificar instalação:**
```bash
xcodebuild -version

# Saída esperada:
# Xcode 13.0+
# Build version 13XXXX
```

**Configurar Xcode Command Line Tools:**
```bash
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
```

#### 3. CocoaPods
```bash
# Instalar
sudo gem install cocoapods

# Verificar versão
pod --version

# Saída esperada: 1.11.0+
```

**Se não funcionar com gem:**
```bash
# Usar Homebrew
brew install cocoapods
```

#### 4. Node.js e Package Manager
```bash
# Verificar Node.js
node --version

# Esperado: v18.0.0+ ou v20.0.0+

# Verificar pnpm
pnpm --version

# Esperado: 9.0.0+
```

**Se não tiver Node.js:**
```bash
# Usar nvm (recomendado)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

#### 5. Git
```bash
# Verificar
git --version

# Esperado: 2.30.0+
```

## 👤 Conta Apple Developer

### Opções de Conta

| Tipo | Custo | Uso | Limitações |
|------|-------|-----|------------|
| **Gratuita** | $0 | Desenvolvimento e testes | 7 dias por app, sem App Store |
| **Individual** | $99/ano | Publicação pessoal | 1 app por categoria |
| **Organização** | $99/ano | Publicação empresarial | Requer documentos empresa |

### Criar Conta Apple Developer

1. Acesse [Apple Developer](https://developer.apple.com/account/)
2. Clique em "Join the Apple Developer Program"
3. Faça login com Apple ID
4. Escolha tipo de conta
5. Pague anuidade ($99/ano)
6. Aguarde aprovação (geralmente 24-48h)

### Configurações Necessárias

#### Certificados
- **Development Certificate**: Para testes
- **Distribution Certificate**: Para produção

#### Provisioning Profiles
- **Development Profile**: Para debug
- **App Store Profile**: Para distribuição

#### App ID
- **Bundle ID**: `com.fisioflow.app`
- **Capabilities**: Push, Camera, Location, etc.

## 📦 Dependências do Projeto

### NPM Packages

#### Core Capacitor
```json
{
  "@capacitor/core": "^7.4.3",
  "@capacitor/cli": "^7.4.3",
  "@capacitor/ios": "^7.4.3"
}
```

#### Plugins Nativos
```json
{
  "@capacitor/local-authentication": "latest",
  "@capacitor/push-notifications": "latest",
  "@capacitor/camera": "latest",
  "@capacitor/geolocation": "latest",
  "@capacitor/haptics": "latest",
  "@capacitor/keyboard": "latest",
  "@capacitor/status-bar": "latest",
  "@capacitor/splash-screen": "latest",
  "@capacitor/app": "latest",
  "@capacitor/device": "latest"
}
```

### Ruby Gems (via CocoaPods)

```ruby
# Podfile (gerado automaticamente)
platform :ios, '13.0'

target 'App' do
  capacitor_pods
  # Add your Pods here
end
```

## 🔧 Configuração do Ambiente

### Variáveis de Ambiente

#### `.env.local`
```bash
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxx...

# Firebase (para push notifications)
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx

# Apple (para Notificações Push)
APNs_KEY_ID=xxx
APNs_TEAM_ID=xxx
APNs_AUTH_KEY_PATH=/path/to/key.p8
```

### Capacitor Config

#### `capacitor.config.ts`
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fisioflow.app',
  appName: 'FisioFlow',
  webDir: 'dist',
  bundledWebRuntime: false,
  ios: {
    scheme: 'App',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0EA5E9',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalAuthentication: {
      promptTitle: 'Autenticação FisioFlow',
      promptDescription: 'Use Face ID ou Touch ID',
      fallbackTitle: 'Usar senha',
    },
  },
};

export default config;
```

## 🔐 Permissões iOS (Info.plist)

### `ios/App/App/Info.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <!-- Câmera -->
  <key>NSCameraUsageDescription</key>
  <string>Precisamos da câmera para tirar fotos de exercícios e evoluções dos pacientes</string>

  <!-- Galeria de Fotos -->
  <key>NSPhotoLibraryUsageDescription</key>
  <string>Precisamos acessar suas fotos para adicionar aos prontuários dos pacientes</string>

  <key>NSPhotoLibraryAddUsageDescription</key>
  <string>Precisamos salvar fotos de exercícios na sua galeria</string>

  <!-- Microfone -->
  <key>NSMicrophoneUsageDescription</key>
  <string>Precisamos do microfone para videoconferências com pacientes</string>

  <!-- Localização -->
  <key>NSLocationWhenInUseUsageDescription</key>
  <string>Precisamos da sua localização para registrar check-in em atendimentos</string>

  <key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
  <string>Precisamos da sua localização para registrar atendimentos em segundo plano</string>

  <!-- Face ID / Touch ID -->
  <key>NSFaceIDUsageDescription</key>
  <string>Use Face ID ou Touch ID para login rápido e seguro no FisioFlow</string>

  <!-- Notificações -->
  <key>UIBackgroundModes</key>
  <array>
    <string>remote-notification</string>
  </array>

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

  <!-- App Transport Security -->
  <key>NSAppTransportSecurity</key>
  <dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
    <key>NSExceptionDomains</key>
    <dict>
      <key>localhost</key>
      <dict>
        <key>NSExceptionAllowsInsecureHTTPLoads</key>
        <true/>
      </dict>
    </dict>
  </dict>
</dict>
</plist>
```

## 📱 Configurações de Build no Xcode

### 1. General Settings
- **Display Name**: FisioFlow
- **Bundle Identifier**: com.fisioflow.app
- **Version**: 1.0.0
- **Build**: 1
- **Deployment Target**: iOS 13.0+

### 2. Signing & Capabilities
- **Team**: Sua conta Apple Developer
- **Capabilities**:
  - ✅ Push Notifications
  - ✅ In-App Purchase (futuro)
  - ✅ Background Modes (remote-notification)
  - ✅ Access WiFi Information (opcional)

### 3. Build Settings
- **Swift Language Version**: Swift 5.0+
- **iOS Deployment Target**: 13.0
- **Valid Architecture**: arm64

## 🧪 Verificação do Ambiente

### Script de Verificação

Crie `verify-ios-setup.sh`:

```bash
#!/bin/bash

echo "🔍 Verificando ambiente de desenvolvimento iOS..."

# macOS Version
echo "📱 Verificando macOS..."
if sw_vers | grep -q "ProductVersion.*1[2-5]\."; then
  echo "✅ macOS $(sw_vers -productVersion)"
else
  echo "❌ macOS desatualizado. Requer 12.0+"
  exit 1
fi

# Xcode
echo "🛠️ Verificando Xcode..."
if command -v xcodebuild &> /dev/null; then
  XCODE_VERSION=$(xcodebuild -version | head -n 1 | awk '{print $2}')
  echo "✅ Xcode $XCODE_VERSION"
else
  echo "❌ Xcode não encontrado"
  exit 1
fi

# CocoaPods
echo "📦 Verificando CocoaPods..."
if command -v pod &> /dev/null; then
  POD_VERSION=$(pod --version)
  echo "✅ CocoaPods $POD_VERSION"
else
  echo "❌ CocoaPods não encontrado. Instale com: sudo gem install cocoapods"
  exit 1
fi

# Node.js
echo "🟢 Verificando Node.js..."
if command -v node &> /dev/null; then
  NODE_VERSION=$(node --version)
  echo "✅ Node.js $NODE_VERSION"
else
  echo "❌ Node.js não encontrado. Instale com nvm"
  exit 1
fi

# Capacitor
echo "⚡ Verificando Capacitor..."
if npx cap --version &> /dev/null; then
  CAP_VERSION=$(npx cap --version)
  echo "✅ Capacitor $CAP_VERSION"
else
  echo "⚠️ Capacitor não encontrado globalmente (usando npx)"
fi

# Apple Developer Account
echo "🍎 Verificando Apple Developer account..."
# Isso é manual, apenas lembrete
echo "⚠️ Verifique se você tem uma conta Apple Developer ativa"

echo ""
echo "✅ Ambiente verificado com sucesso!"
echo "🚀 Você pode começar o desenvolvimento iOS"
```

Execute:
```bash
chmod +x verify-ios-setup.sh
./verify-ios-setup.sh
```

## 📚 Recursos de Aprendizado

### Oficial Apple
- [Start Developing iOS Apps](https://developer.apple.com/library/archive/referencelibrary/GettingStarted/DevelopiOSAppsToday/)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [App Programming Guide](https://developer.apple.com/library/archive/documentation/iPhone/Conceptual/iPhoneOSProgrammingGuide/)

### Capacitor
- [Capacitor iOS Docs](https://capacitorjs.com/docs/ios)
- [Creating iOS Apps with Capacitor](https://capacitorjs.com/docs/guides/building-for-ios)

### Swift (para modificações nativas)
- [Swift Language Guide](https://docs.swift.org/swift-book/)
- [iOS App Development with Swift](https://developer.apple.com/library/archive/documentation/General/Conceptual/CocoaEncyclopedia/)

## 🔧 Troubleshooting

### Problema: "Command not found: cap"
**Solução:**
```bash
npm install -D @capacitor/cli
# ou usar npx sempre
npx cap <comando>
```

### Problema: "No such module 'Capacitor'"
**Solução:**
```bash
cd ios
pod install
pod update
cd ..
npx cap sync
```

### Problema: "Signing requires a development team"
**Solução:**
1. Abra Xcode: `npx cap open ios`
2. Selecione target "App"
3. Vá em "Signing & Capabilities"
4. Selecione seu Team

### Problema: CocoaPods não instala
**Solução:**
```bash
sudo gem install cocoapods
# ou
brew install cocoapods
```

### Problema: Build falha com erro de Swift
**Solução:**
```bash
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
npx cap sync
```

---

**Última atualização**: 19 de Janeiro de 2026
