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
```
**Versões Suportadas:** macOS 12+ (Monterey ou superior)

#### 2. Xcode
**Versão Mínima:** 14.0+ (para iOS 16 SDK)
**Instalação:** Via Mac App Store

#### 3. Node.js (LTS)
```bash
node --version
# Recomendado: v18 LTS ou v20 LTS
```

#### 4. Watchman (Obrigatório para React Native)
```bash
brew install watchman
watchman --version
```

#### 5. Expo CLI
```bash
npm install -g expo-cli
# ou use npx expo
```

#### 6. CocoaPods (Necessário para builds locais)
```bash
sudo gem install cocoapods
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

```json
{
  "expo": "~52.0.0",
  "react-native": "0.76.0",
  "expo-status-bar": "~2.0.0",
  "expo-camera": "~16.0.0",
  "expo-location": "~18.0.0",
  "expo-local-authentication": "~15.0.0",
  "expo-notifications": "~0.29.0"
}
```

## 🔧 Configuração do Ambiente

### Variáveis de Ambiente

#### `.env` (Na raiz do projeto)
```bash
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx...
EXPO_PUBLIC_API_URL=https://api.fisioflow.com
```

### Expo Config

#### `app.json`
```json
{
  "expo": {
    "name": "FisioFlow",
    "slug": "fisioflow",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.fisioflow.app",
      "supportsTablet": true,
      "infoPlist": {
        "NSCameraUsageDescription": "Precisamos da câmera para...",
        "NSFaceIDUsageDescription": "Autenticação segura..."
      }
    }
  }
}
```

## 🧪 Verificação do Ambiente

### Script de Verificação

Crie `verify-expo-env.sh`:

```bash
#!/bin/bash
echo "🔍 Verificando ambiente Expo..."
node --version
npm --version
watchman --version
npx expo-doctor
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
