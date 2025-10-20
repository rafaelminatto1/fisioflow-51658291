# 📱 Setup do App Nativo - FisioFlow

## ✅ Configuração Inicial Completa

O Capacitor foi configurado no projeto! Agora você pode rodar o FisioFlow como um app nativo em iOS e Android.

## 🚀 Próximos Passos

### 1. Exportar para seu GitHub
Clique no botão **"Export to Github"** no Lovable para transferir o projeto.

### 2. Clonar o repositório
```bash
git clone [seu-repositorio]
cd fisioflow
```

### 3. Instalar dependências
```bash
npm install
```

### 4. Adicionar plataformas nativas

**Para Android:**
```bash
npx cap add android
npx cap update android
```

**Para iOS (apenas em Mac com Xcode):**
```bash
npx cap add ios
npx cap update ios
```

### 5. Build do projeto
```bash
npm run build
```

### 6. Sincronizar com plataformas nativas
```bash
npx cap sync
```

### 7. Rodar no dispositivo/emulador

**Android (precisa ter Android Studio instalado):**
```bash
npx cap run android
```

**iOS (precisa ter Xcode instalado em Mac):**
```bash
npx cap run ios
```

## 🔄 Workflow de Desenvolvimento

Sempre que fizer alterações no código:

1. **Git pull** do projeto atualizado
2. Rodar `npm install` (se houver novas dependências)
3. Rodar `npm run build`
4. Rodar `npx cap sync` para sincronizar com as plataformas nativas
5. Testar no emulador/dispositivo

## 📝 Configuração Atual

- **App ID**: `app.lovable.5aa177ed5a714e0d9acbd82af5218253`
- **App Name**: FisioFlow
- **Hot Reload**: Desabilitado por padrão (usa build local)
- **Splash Screen**: Configurado com cor azul (#0EA5E9)

## 🎯 Recursos Nativos Disponíveis

Com o Capacitor, você tem acesso completo a:
- 📸 Câmera e galeria
- 📍 Geolocalização
- 🔔 Push notifications
- 💾 Armazenamento local
- 🔐 Biometria (Touch ID/Face ID)
- 📱 Sensores do dispositivo
- E muito mais!

---

# 🍎 Setup iOS - Guia Completo

## 📋 Requisitos do Sistema

### Software Obrigatório

1. **macOS**: Versão 12.0 (Monterey) ou superior
   - Verificar: `sw_vers` no Terminal

2. **Xcode**: Versão 13.0 ou superior
   - Download: [Apple Developer](https://developer.apple.com/xcode/)
   - Instalar: Abra o App Store e procure "Xcode"
   - Após instalar, execute: `sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer`
   - Aceite a licença: `sudo xcodebuild -license accept`

3. **CocoaPods**: Gerenciador de dependências do iOS
   - Instalar: `sudo gem install cocoapods`
   - Verificar versão: `pod --version` (deve ser 1.11.0 ou superior)

4. **Node.js**: Versão 16.0 ou superior
   - Verificar: `node --version`

### Hardware

- **Mac**: Qualquer Mac com suporte a macOS 12.0+
- **Dispositivo iOS** (opcional): Para testes em dispositivo real
- **Conta Apple Developer** (opcional): Para publicar na App Store

## 🛠 Instalação Passo a Passo

### Passo 1: Adicionar Plataforma iOS

```bash
# Adicionar a plataforma iOS ao projeto
npm run cap:ios

# Ou manualmente:
npx cap add ios
```

Isso criará a pasta `ios/` no seu projeto.

### Passo 2: Build do Projeto

```bash
# Gerar o build de produção
npm run build

# Ou build de desenvolvimento
npm run build:dev
```

### Passo 3: Sincronizar com iOS

```bash
# Sincronizar (build + sync em um comando)
npm run cap:sync

# Ou manualmente:
npx cap sync
```

### Passo 4: Abrir no Xcode

```bash
# Abrir o projeto no Xcode
npm run cap:open:ios

# Ou manualmente:
npx cap open ios
```

### Passo 5: Configurar no Xcode

1. **Selecionar o Target**: Clique em "App" no navegador de arquivos
2. **Configurar Team**:
   - Vá em "Signing & Capabilities"
   - Selecione seu Team (sua conta Apple)
   - Se não tiver, clique em "Add Account" e faça login

3. **Configurar Bundle Identifier** (se necessário):
   - O padrão é: `app.lovable.5aa177ed5a714e0d9acbd82af5218253`
   - Se quiser mudar, altere em "Bundle Identifier"

4. **Instalar CocoaPods Dependencies**:
   - No Terminal, navegue até a pasta `ios/`:
   ```bash
   cd ios
   pod install
   cd ..
   ```

### Passo 6: Executar o App

**Opção A - Via Terminal:**
```bash
npm run cap:run:ios
```

**Opção B - Via Xcode:**
1. Selecione o simulador desejado (ex: iPhone 15 Pro)
2. Clique no botão ▶️ (Run)
3. Aguarde o build e o app abrirá no simulador

## 🔧 Troubleshooting - Problemas Comuns

### ❌ Erro: "Command not found: cap"

**Causa**: Capacitor não está instalado

**Solução**:
```bash
npm install
```

---

### ❌ Erro: "No such module 'Capacitor'"

**Causa**: CocoaPods não instalou as dependências

**Solução**:
```bash
cd ios
pod install
pod update
cd ..
npx cap sync
```

---

### ❌ Erro: "Signing for 'App' requires a development team"

**Causa**: Team não configurado no Xcode

**Solução**:
1. Abra o projeto no Xcode: `npx cap open ios`
2. Selecione o target "App"
3. Vá em "Signing & Capabilities"
4. Selecione seu Team
5. Se não tiver um Team, crie um em [Apple Developer](https://developer.apple.com/account/)

---

### ❌ Erro: "Bundle identifier is already in use"

**Causa**: Bundle ID já está em uso por outro app

**Solução**:
1. No Xcode, vá em "Signing & Capabilities"
2. Altere o "Bundle Identifier" para algo único
3. Exemplo: `com.suaempresa.fisioflow`

---

### ❌ Erro: "Failed to install CocoaPods dependencies"

**Causa**: Problema com CocoaPods ou versão do Ruby

**Solução**:
```bash
# Atualizar CocoaPods
sudo gem install cocoapods

# Limpar cache
pod cache clean --all

# Reinstalar pods
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
```

---

### ❌ Erro: "The file 'Info.plist' couldn't be opened"

**Causa**: Arquivo corrompido ou permissões incorretas

**Solução**:
```bash
cd ios/App
chmod 644 Info.plist
cd ../..
npx cap sync
```

---

### ❌ Erro: "Build failed" no Xcode

**Causa**: Múltiplas possibilidades

**Solução - Checklist**:
1. ✅ Xcode está atualizado?
2. ✅ CocoaPods instalado corretamente?
3. ✅ Team configurado?
4. ✅ Bundle Identifier único?
5. ✅ Command Line Tools instalados?

```bash
# Verificar Command Line Tools
xcode-select --install

# Limpar build
cd ios
xcodebuild clean
pod install
cd ..
npx cap sync
```

---

### ❌ Erro: "Permission denied" ao executar npx cap

**Causa**: Permissões do Node.js

**Solução**:
```bash
# Dar permissão de execução
chmod +x node_modules/.bin/cap
```

---

### ❌ App abre mas mostra tela branca

**Causa**: Problema com build ou servidor

**Solução**:
1. Verificar se o build foi feito: `npm run build`
2. Verificar se o sync foi feito: `npx cap sync`
3. Verificar console do Xcode (View > Debug Area > Show Debug Area)
4. Limpar e rebuildar:
```bash
rm -rf dist ios/App/App/public
npm run build
npx cap sync
```

---

### ❌ Erro: "Cannot find module" no Xcode

**Causa**: Dependências não instaladas

**Solução**:
```bash
cd ios
pod install
pod update
cd ..
npx cap sync
```

---

### ❌ Erro: "The app couldn't be installed"

**Causa**: Problema com certificados ou dispositivo

**Solução**:
1. Verificar se o dispositivo/emulador está confiável
2. Verificar certificados em "Signing & Capabilities"
3. Limpar Derived Data:
```bash
rm -rf ~/Library/Developer/Xcode/DerivedData
```

---

### ❌ Erro: "Unable to boot simulator"

**Causa**: Simulador corrompido

**Solução**:
```bash
# Listar simuladores
xcrun simctl list devices

# Apagar simulador
xcrun simctl erase "iPhone 15 Pro"

# Abrir Xcode e criar novo simulador
```

---

## 🔍 Debug e Logs

### Ver logs do app no console

**Via Terminal:**
```bash
# iOS Simulator
xcrun simctl spawn booted log stream --predicate 'processImagePath contains "App"'

# iOS Device (conectado via USB)
idevicesyslog
```

**Via Xcode:**
1. Abra o projeto no Xcode
2. Clique em "View" > "Debug Area" > "Show Debug Area"
3. Execute o app (⌘ + R)
4. Veja os logs na área inferior

### Verificar versões instaladas

```bash
# Node.js
node --version

# npm
npm --version

# Capacitor
npx cap --version

# CocoaPods
pod --version

# Xcode
xcodebuild -version

# macOS
sw_vers
```

### Limpar cache e rebuildar

```bash
# Limpar tudo e começar do zero
rm -rf node_modules dist ios/App/App/public
npm install
npm run build
npx cap sync
```

---

## 📱 Testando em Dispositivo Real

### Pré-requisitos

1. **Conta Apple Developer** (gratuita funciona para testes)
2. **Dispositivo iOS** conectado via USB
3. **Xcode** instalado

### Passo a Passo

1. **Conectar dispositivo** via cabo USB
2. **Confiar no computador** (no iPhone/iPad)
3. **Abrir Xcode**: `npx cap open ios`
4. **Selecionar dispositivo** no dropdown (ao invés de simulador)
5. **Configurar Team** em "Signing & Capabilities"
6. **Executar**: Clique no botão ▶️

### Primeira Execução

Na primeira vez, o iOS pode bloquear o app:
1. Vá em **Configurações** > **Geral** > **Gerenciamento de VPN e Dispositivo**
2. Toque no perfil do desenvolvedor
3. Toque em **Confiar**

---

## 📦 Scripts Disponíveis

O projeto inclui scripts úteis no `package.json`:

```bash
# Adicionar plataforma iOS
npm run cap:ios

# Build + Sync (recomendado)
npm run cap:sync

# Executar no simulador/dispositivo
npm run cap:run:ios

# Abrir no Xcode
npm run cap:open:ios
```

---

## 🔐 Configuração de Permissões

### Adicionar permissões ao Info.plist

Se você usar recursos nativos (câmera, localização, etc.), adicione no `ios/App/App/Info.plist`:

```xml
<!-- Câmera -->
<key>NSCameraUsageDescription</key>
<string>Precisamos da câmera para tirar fotos de exercícios</string>

<!-- Galeria -->
<key>NSPhotoLibraryUsageDescription</key>
<string>Precisamos acessar fotos para adicionar aos prontuários</string>

<!-- Localização -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>Precisamos da localização para registrar atendimentos</string>

<!-- Microfone -->
<key>NSMicrophoneUsageDescription</key>
<string>Precisamos do microfone para videoconferências</string>

<!-- Notificações -->
<key>NSUserNotificationsUsageDescription</key>
<string>Precisamos enviar notificações sobre agendamentos</string>
```

---

## 🚀 Publicando na App Store

### Checklist Pré-Publicação

- [ ] Testar em dispositivos reais
- [ ] Configurar ícones e splash screens
- [ ] Configurar versão e build number
- [ ] Criar conta Apple Developer ($99/ano)
- [ ] Criar App ID no Apple Developer
- [ ] Configurar certificados e provisioning profiles
- [ ] Testar todos os recursos nativos
- [ ] Revisar App Store Guidelines

### Passo a Passo

1. **Criar App ID**:
   - Acesse [Apple Developer](https://developer.apple.com/account/)
   - Vá em "Certificates, Identifiers & Profiles"
   - Crie um novo App ID

2. **Configurar no Xcode**:
   - Abra o projeto: `npx cap open ios`
   - Configure o Bundle Identifier
   - Configure o Team
   - Configure o Provisioning Profile

3. **Archive**:
   - No Xcode: Product > Archive
   - Aguarde o build

4. **Upload**:
   - Organizer abrirá automaticamente
   - Clique em "Distribute App"
   - Siga o wizard

5. **App Store Connect**:
   - Acesse [App Store Connect](https://appstoreconnect.apple.com/)
   - Complete as informações do app
   - Submeta para revisão

---

## 📚 Recursos Adicionais

### Documentação Oficial

- [Capacitor Docs](https://capacitorjs.com/docs)
- [Capacitor iOS Guide](https://capacitorjs.com/docs/ios)
- [Apple Developer](https://developer.apple.com/)
- [Xcode User Guide](https://developer.apple.com/documentation/xcode)

### Comunidade

- [Capacitor Discord](https://discord.gg/capacitor)
- [Stack Overflow - Capacitor](https://stackoverflow.com/questions/tagged/capacitor)
- [Ionic Forums](https://forum.ionicframework.com/)

### Tutoriais

- [Capacitor Getting Started](https://capacitorjs.com/docs/getting-started)
- [Building iOS Apps with Capacitor](https://capacitorjs.com/docs/guides/building-for-ios)

---

## 🆘 Precisa de Ajuda?

Se encontrar problemas não listados aqui:

1. Verifique os logs do Xcode
2. Consulte a [documentação oficial do Capacitor](https://capacitorjs.com/docs)
3. Busque no [Stack Overflow](https://stackoverflow.com/questions/tagged/capacitor)
4. Abra uma issue no [GitHub do Capacitor](https://github.com/ionic-team/capacitor/issues)

---

**Status**: ✅ Capacitor configurado e pronto para uso
**Próximo passo**: Executar `npm run cap:ios` para adicionar a plataforma iOS
