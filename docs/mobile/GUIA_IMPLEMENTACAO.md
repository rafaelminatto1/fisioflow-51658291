# 🚀 Guia de Implementação iOS - FisioFlow Mobile (React Native + Expo)

## 📋 Índice

1. [Setup Inicial](#1-setup-inicial)
2. [Criando o Projeto](#2-criando-o-projeto)
3. [Configuração do Projeto](#3-configuração-do-projeto)
4. [Implementando Features Mobile](#4-implementando-features-mobile)
5. [Estilização com NativeWind](#5-estilização-com-nativewind)
6. [Testes](#6-testes)
7. [Build de Produção](#7-build-de-produção)

---

## 1. Setup Inicial

### 1.1 Pré-requisitos

- [ ] Node.js 18+ (LTS)
- [ ] Watchman (`brew install watchman`)
- [ ] Conta Expo (opcional, recomendado para EAS)
- [ ] Expo Go instalado no seu iPhone

### 1.2 Verificar Ambiente

```bash
node --version
npm --version
watchman --version
```

---

## 2. Criando o Projeto

### 2.1 Inicializar com Expo

Vamos criar um novo projeto Expo dentro da pasta `apps/mobile` (ou similar, dependendo da estrutura de monorepo, ou na raiz se for separado).

```bash
# Criar projeto com template TypeScript
npx create-expo-app@latest fisioflow-mobile --template blank-typescript

# Entrar na pasta
cd fisioflow-mobile
```

### 2.2 Instalar Dependências Principais

```bash
# Navegação
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar

# Supabase
npm install @supabase/supabase-js @react-native-async-storage/async-storage

# UI e Estilo
npm install nativewind tailwindcss
```

---

## 3. Configuração do Projeto

### 3.1 Configurar `app.json`

Edite o arquivo `app.json` para configurar o bundle identifier e permissões.

```json
{
  "expo": {
    "name": "FisioFlow",
    "slug": "fisioflow",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#0EA5E9"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.fisioflow.app",
      "infoPlist": {
        "NSCameraUsageDescription": "Precisamos da câmera para fotos de exercícios.",
        "NSFaceIDUsageDescription": "Autenticação segura via FaceID."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0EA5E9"
      },
      "package": "com.fisioflow.app"
    },
    "plugins": [
      "expo-router",
      "expo-secure-store"
    ]
  }
}
```

---

## 4. Implementando Features Mobile

### 4.1 Autenticação Biométrica

```bash
npx expo install expo-local-authentication
```

```typescript
import * as LocalAuthentication from 'expo-local-authentication';

export async function authenticate() {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Autentique-se para acessar o FisioFlow',
  });

  return result.success;
}
```

### 4.2 Câmera e Fotos

```bash
npx expo install expo-camera expo-image-picker
```

```typescript
import * as ImagePicker from 'expo-image-picker';

export async function pickImage() {
  let result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 1,
  });

  if (!result.canceled) {
    return result.assets[0].uri;
  }
}
```

---

## 5. Estilização com NativeWind

### 5.1 Configurar Tailwind

Siga o guia oficial do NativeWind para configurar o `tailwind.config.js` no React Native.

```javascript
// tailwind.config.js
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./app/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### 5.2 Uso nos Componentes

```tsx
import { View, Text, Pressable } from 'react-native';
import { styled } from 'nativewind';

const StyledView = styled(View);
const StyledText = styled(Text);

export default function Button({ title, onPress }) {
  return (
    <Pressable onPress={onPress} className="bg-blue-500 p-4 rounded-lg">
      <Text className="text-white font-bold text-center">{title}</Text>
    </Pressable>
  );
}
```

---

## 6. Testes

### 6.1 Expo Go

A maneira mais rápida de testar é usando o app **Expo Go**.

1. Inicie o servidor: `npx expo start`
2. Escaneie o QR Code com a câmera do iPhone (ou app Expo Go no Android).
3. O app carrega instantaneamente.

### 6.2 Simulador iOS

1. Certifique-se de ter o Xcode instalado.
2. Pressione `i` no terminal após rodar `npx expo start`.

---

## 7. Build de Produção

### 7.1 EAS Build

O **EAS (Expo Application Services)** é a forma recomendada de gerar builds.

1. Instale a CLI: `npm install -g eas-cli`
2. Login: `eas login`
3. Configure: `eas build:configure`
4. Gere o build iOS:

```bash
eas build --platform ios
```

### 7.2 Submissão

Após o build, você pode submeter automaticamente para a App Store:

```bash
eas submit --platform ios
```

---

## 📋 Checklist Final

- [ ] App roda no Expo Go sem erros
- [ ] Navegação configurada (Expo Router)
- [ ] Autenticação Supabase funcionando
- [ ] Features nativas (Câmera, Biometria) testadas
- [ ] Build de produção gerado via EAS