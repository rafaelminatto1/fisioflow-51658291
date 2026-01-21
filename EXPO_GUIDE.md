# 🚀 FisioFlow iOS com Expo - Guia Completo

## ✅ Por Que Expo?

**Expo é MUITO mais fácil que Xcode/Capacitor:**

| Capacitor | Expo ✅ |
|-----------|---------|
| Precisa abrir Xcode manualmente | ✅ **Não precisa!** |
| Compilar nativamente a cada mudança | ✅ **Hot reload instantâneo** |
| Difícil configuração iOS | ✅ **Config automática** |
 | | ✅ **Expo Go no iPhone** |
 | | ✅ **EAS Build na nuvem** |

---

## 📱 Como Vamos Funcionar

### Passo 1: Testar com Expo Go (GRÁTIS e RÁPIDO)
- Instalar Expo Go no seu iPhone 15
- Rodar o projeto e escanear QR code
- Testar tudo imediatamente

### Passo 2: Development Build (Opcional)
- Criar uma build personalizada para HealthKit
- Instalar no iPhone via TestFlight

### Passo 3: EAS Build (Para Produção)
- Enviar código para Expo
- Receber app compilado na nuvem
- Publicar na App Store

---

## 🛠️ Migração para Expo

### 1. Instalar Expo CLI

```bash
# No seu Mac (ou Linux/Windows)
pnpm add -g expo-cli
pnpm add -g eas-cli
```

### 2. Instalar dependências Expo

```bash
cd fisioflow-51658291

# Instalar Expo
pnpm add expo expo-status-bar expo-splash-screen expo-constants

# Instalar React Native (necessário para Expo)
pnpm add react-native react-native-safe-area-context

# Instalar Supabase para React Native
pnpm add @supabase/supabase-js
```

### 3. Criar app.json (configuração Expo)

Crie o arquivo `app.json` na raiz:

```json
{
  "expo": {
    "name": "FisioFlow",
    "slug": "fisioflow",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#0ea5e9"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.fisioflow.app",
      "infoPlist": {
        "NSHealthShareUsageDescription": "FisioFlow precisa acessar seus dados de saúde para acompanhar seu progresso.",
        "NSHealthUpdateUsageDescription": "FisioFlow vai registrar suas sessões no app Saúde.",
        "NSFaceIDUsageDescription": "Use Face ID para acessar o FisioFlow rapidamente."
      },
      "config": {
        "usesNonExemptEncryption": false
      }
    },
    "plugins": [
      [
        "expo-status-bar",
        {
          "color": "#0ea5e9",
          "style": "light"
        }
      ],
      [
        "expo-splash-screen",
        {
          "backgroundColor": "#0ea5e9",
          "image": "./assets/splash.png",
          "imageStyle": "contain"
        }
      ]
    ]
  }
}
```

### 4. Criar assets (ícones)

```bash
# Criar pasta de assets
mkdir -p assets

# Criar ícone temporário (pode substituir depois)
# Vamos usar um ícone padrão por enquanto
```

---

## 📱 Testar no iPhone 15 com Expo Go

### Passo 1: Instalar Expo Go

1. Abra a **App Store** no seu iPhone 15
2. Busque por **"Expo Go"**
3. Instale o app (é gratuito)

### Passo 2: Preparar o projeto

```bash
cd fisioflow-51658291

# Instalar Expo no projeto
pnpm add expo

# Iniciar development server
npx expo start
```

### Passo 3: Escanear QR Code

1. O terminal vai mostrar um **QR code**
2. Abra o **Expo Go** no iPhone
3. Toque em **"Scan QR Code"**
4. Escaneie o QR code

**Pronto!** O app vai abrir no seu iPhone! 🎉

---

## 🔧 Configurações Avançadas

### HealthKit (requer development build)

Para usar HealthKit nativo, precisamos de um development build:

```bash
# 1. Instalar EAS CLI
pnpm add -g eas-cli

# 2. Login no Expo
npx expo login

# 3. Configurar EAS
eas build:configure
```

Criar `eas.json`:

```json
{
  "cli": {
    "version": ">= 5.2.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "ios": {
        "autoIncrement": true
      }
    }
  }
}
```

### Criar Development Build

```bash
# Criar build para iPhone (toma ~15-20 min na nuvem)
eas build --profile development --platform ios

# Depois de pronto, instalar no iPhone
eas build:view
```

---

## 📦 Scripts Úteis

Adicione ao `package.json`:

```json
{
  "scripts": {
    "start": "npx expo start",
    "android": "npx expo start --android",
    "ios": "npx expo start --ios",
    "web": "npx expo start --web",
    "dev:ios": "eas build --profile development --platform ios",
    "submit:ios": "eas build --profile production --platform ios"
  }
}
```

---

## 🎯 Fluxo de Trabalho Recomendado

### Fase 1: Desenvolvimento Rápido (HOJE!)
1. Usar **Expo Go** no iPhone
2. Testar funcionalidades básicas
3. Verificar layout e navegação

### Fase 2: Features Nativas (Esta semana)
1. Criar **development build**
2. Instalar no iPhone via TestFlight
3. Testar HealthKit, biometria, etc.

### Fase 3: Produção (Futuro)
1. Usar **EAS Build** para criar IPA
2. Submeter para App Store
3. Publicar!

---

## ✅ Vantagens do Expo para o Seu Caso

1. ✅ **NÃO precisa abrir o Xcode!**
2. ✅ Testa no iPhone real imediatamente
3. ✅ Hot reload super rápido
4. ✅ Mesmo código React/TypeScript
5. ✅ Builds na nuvem (EAS)
6. ✅ Over-the-air updates
7. ✅ Suporte a HealthKit (com config plugin)

---

## 🚀 Começar AGORA

```bash
# 1. Instalar Expo CLI
pnpm add -g expo-cli

# 2. No projeto
cd fisioflow-51658291
pnpm add expo

# 3. Criar app.json (copie o código acima)
nano app.json

# 4. Criar assets básicos
mkdir -p assets

# 5. Iniciar!
npx expo start
```

Depois é só escanear o QR code no Expo Go do seu iPhone!

---

**Próximo passo**: Me avise quando quiser que eu crie os arquivos de configuração do Expo!
