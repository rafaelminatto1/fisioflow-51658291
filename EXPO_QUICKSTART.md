# 🎯 EXPO QUICKSTART - Teste no seu iPhone 15 AGORA!

## 📱 Passo a Passo - Do Zero ao App Rodando

### 1️⃣ Instalar Expo CLI (no seu computador)

```bash
# Instalar Expo CLI globalmente
pnpm add -g expo-cli
pnpm add -g eas-cli

# Verificar instalação
expo --version
```

### 2️⃣ Instalar Expo no Projeto

```bash
cd fisioflow-51658291

# Adicionar Expo
pnpm add expo expo-status-bar expo-splash-screen expo-constants expo-local-authentication expo-haptics

# Adicionar React Native essentials
pnpm add react-native react-native-safe-area-context @react-navigation/native @react-navigation/bottom-tabs react-native-screens react-native-gesture-handler

# Adicionar Supabase para React Native
pnpm add @supabase/supabase-js
```

### 3️⃣ Instalar Expo Go no iPhone 15

1. Abra a **App Store** no seu iPhone
2. Pesquise: **"Expo Go"**
3. Toque em **"Obter"** ou **"Instalar"**
4. Abra o app Expo Go

### 4️⃣ Preparar Assets (Ícones)

```bash
# Criar pasta de assets
mkdir -p assets

# Criar ícone temporário (você pode substituir depois)
# Use qualquer imagem quadrada de 1024x1024px
```

**Opcional:** Se tiver uma logo:
- Coloque uma imagem em `assets/icon.png` (1024x1024px)
- Coloque uma imagem em `assets/splash.png` (1284x2778px)
- Coloque uma imagem em `assets/adaptive-icon.png` (1024x1024px)

### 5️⃣ Iniciar o Expo

```bash
npx expo start
```

Você verá algo assim:

```
› Waiting for bundler...
› Bundler ready.
› Metro is ready.

› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)

› Press a  │ open Android
› Press w  │ open web
› Press i  │ open iOS simulator
› Press s  │ switch server

› Press q to display QR code
› Press r  │ restart project
› Press d  │ open DevTools
```

### 6️⃣ Escanear no iPhone

1. No iPhone, abra o **Expo Go**
2. Toque em **"Scan QR Code"**
3. Escaneie o QR code que apareceu no terminal
4. **Pronto!** O app vai carregar no seu iPhone 🎉

### 7️⃣ Usar o App

No seu iPhone você pode:
- ✅ Ver o app rodando
- ✅ Testar todas as funcionalidades
- ✅ Navegar nas telas
- ✅ Shake o phone para abrir menu de desenvolvedor

---

## 🔧 Comandos Úteis

```bash
# Iniciar o servidor
npx expo start

# Forçar cache limpar
npx expo start --clear

# Abrir no iOS Simulator (se tiver Mac)
npx expo start --ios

# Abrir no Android
npx expo start --android

# Abrir no navegador (web)
npx expo start --web
```

---

## 🆚 Expo vs Capacitor - Por Que Mudar?

| Capacitor | Expo ✅ |
|-----------|---------|
| ❌ Precisa do Xcode no Mac | ✅ **Funciona em qualquer OS** |
| ❌ Compilar a cada mudança | ✅ **Hot reload instantâneo** |
| ❌ Configuração complexa | ✅ **Simples e rápido** |
| ❌ Difícil debug | ✅ **Debug no Chrome/Edge** |
| ❌ Reinstalar app para testar | ✅ **Expo Go - escaneia e pronto** |

---

## ⚠️ Limitações do Expo Go

O **Expo Go** é perfeito para desenvolvimento rápido, mas não inclui:
- ❌ HealthKit (Apple Health)
- ❌ Face ID/Touch ID nativo
- ❌ Push notifications

**Solução:** Quando precisar dessas features, criamos um **Development Build** (15 min na nuvem).

---

## 🚀 Para Features Nativas (HealthKit, Biometria)

### Criar Development Build

```bash
# 1. Login no Expo
npx expo login

# 2. Configurar EAS (primeira vez só)
eas build:configure

# 3. Criar build de desenvolvimento (demora ~15 min)
eas build --profile development --platform ios

# 4. Instalar no iPhone via TestFlight
eas build:view
```

### Depois do Development Build

- Instale o app personalizado no seu iPhone
- Ele terá acesso a **TODAS** as features nativas
- Ainda tem hot reload!

---

## 📦 Publicação na App Store

```bash
# Build de produção
eas build --profile production --platform ios

# Submeter para App Store
eas submit --platform ios
```

---

## 🎯 Resumo

**Para começar AGORA no seu iPhone 15:**

1. `pnpm add -g expo-cli`
2. `pnpm add expo`
3. Instalar **Expo Go** na App Store do iPhone
4. `npx expo start`
5. Escanear o QR code

**Em 5 minutos você está testando!** 🚀

---

## 🆘 Problemas Comuns

### "Could not find app.json"
```bash
# O arquivo app.json já foi criado
# Se o erro persistir:
git pull origin main
```

### "Metro is stuck"
```bash
# Limpar cache e reiniciar
npx expo start --clear
```

### "Cannot connect to Expo"
```bash
# Verificar se está na mesma rede Wi-Fi
# Ou usar tunnel:
npx expo start --tunnel
```

---

## 📚 Referências

- [Expo Documentation](https://docs.expo.dev)
- [Expo Go App Store](https://apps.apple.com/us/app/expo-go/id982107779)
- [EAS Build Guide](https://docs.expo.dev/build/introduction)

---

**Pronto! Comece a testar no seu iPhone agora!** 📱✨
