# FisioFlow iOS - Guia de Desenvolvimento

## 📱 Visão Geral

Este projeto contém dois apps iOS em um único projeto Capacitor:
- **FisioFlow Pro** - Para profissionais da clínica (fisioterapeutas, admin)
- **FisioFlow Patient** - Para pacientes

## 🚀 Configuração Inicial (No Mac)

### 1. Pré-requisitos

```bash
# Verificar se está em Mac
uname -s  # Deve retornar "Darwin"

# Verificar Node.js (deve ser v18+)
node --version

# Verificar pnpm (deve ser v9+)
pnpm --version
```

### 2. Instalar Dependências do Projeto

```bash
# Clonar o repositório
cd fisioflow-51658291

# Instalar dependências base
pnpm install

# Instalar plugins Capacitor para iOS
pnpm add @capgo/capacitor-health
pnpm add @capgo/capacitor-watch
pnpm add @capgo/capacitor-native-biometric
pnpm add @capacitor/safe-area-insets
```

### 3. Configurar Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar .env com suas credenciais Supabase
nano .env  # ou use seu editor preferido
```

Variáveis necessárias:
```bash
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

### 4. Build do Projeto

```bash
# Build para produção
pnpm build

# Ou build de desenvolvimento
pnpm run build:dev
```

### 5. Adicionar Plataforma iOS

```bash
# Adicionar iOS ao projeto Capacitor
npx cap add ios

# Sync com iOS (necessário após cada build)
npx cap sync ios
```

### 6. Abrir no Xcode

```bash
# Abrir projeto iOS no Xcode
npx cap open ios
```

## 📱 Configuração no Xcode

### 1. Selecionar Team

1. No Xcode, selecione o projeto na sidebar (ícone azul)
2. Em "Signing & Capabilities", selecione seu Team
3. O Xcode irá gerar automaticamente os certificados necessários

### 2. Configurar Capabilities

Adicione as seguintes capabilities:

#### Push Notifications
- "Signing & Capabilities" → "+ Capability" → "Push Notifications"

#### HealthKit
- "Signing & Capabilities" → "+ Capability" → "HealthKit"
- Adicionar as seguintes permissões:
  - Steps Count
  - Distance
  - Active Energy
  - Heart Rate
  - Resting Heart Rate

#### Background Modes
- "Signing & Capabilities" → "+ Capability" → "Background Modes"
- Selecione:
  - "Background fetch"
  - "Remote notifications"

### 3. Configurar Info.plist

O arquivo `ios/App/App/Info.plist` deve incluir:

```xml
<key>NSHealthShareUsageDescription</key>
<string>FisioFlow precisa acessar seus dados de saúde para acompanhar seu progresso.</string>

<key>NSHealthUpdateUsageDescription</key>
<string>FisioFlow vai escrever dados de suas sessões de fisioterapia no app Saúde.</string>

<key>NSFaceIDUsageDescription</key>
<string>Use Face ID para acessar o FisioFlow Pro rapidamente.</string>
```

### 4. Configurar Bundle Identifier

- O Bundle ID deve ser único: `com.fisioflow.app`
- Se necessário, altere em: "capacitor.config.ts"

## 🔐 Configuração Apple Developer

### 1. Criar App ID

1. Acesse [Apple Developer](https://developer.apple.com)
2. Go to "Identifiers" → "App IDs"
3. Clique em "+" → "App IDs"
4. Configure:
   - App ID: `com.fisioflow.app`
   - Platform: iOS
   - Capabilities:
     - Push Notifications
     - HealthKit
     - In-App Purchase (se necessário no futuro)

### 2. Criar Provisioning Profile

1. Go to "Profiles" → "+"
2. Select "iOS App Development"
3. Configure:
   - App ID: FisioFlow
   - Devices: Selecione seus dispositivos de teste
4. Download e instalar no Mac (duplo clique)

### 3. Configurar Push Notifications (APNs)

1. Go to "Keys" → "+" (ou "Certificates" → "Create a Certificate")
2. Key Type: "APNs Authentication Key"
3. Configure e baixe o arquivo `.p8`
4. **IMPORTANTE**: Salve o Key ID e Team ID - você não poderá baixar novamente!
5. Configure no [Dashboard Supabase](https://supabase.com):
   - Project Settings → Authentication → Providers
   - Adicionar credenciais APNs

## 🏃 Comandos Úteis

### Desenvolvimento

```bash
# Build e sync
pnpm run build && npx cap sync ios

# Rodar no simulador iOS
npx cap run ios

# Rodar em dispositivo físico (conectado via USB)
npx cap run ios --target <device-name>

# Abrir no Xcode
npx cap open ios

# Ver logs do console
# No Xcode: View → Debug Area → Show Debug Area (⇧⌘Y)
```

### Testar Plugins

```bash
# Testar HealthKit
# No simulador iOS: Features → HealthKit → Add Data

# Testar Push Notifications
# Usar Supabase Dashboard → Authentication → Push → Send Test

# Testar Biometria
# Em device físico com Face ID/Touch ID
```

## 📁 Estrutura de Arquivos Criados

```
src/
├── lib/mobile/
│   ├── biometric.ts           # Autenticação Face ID/Touch ID
│   ├── healthkit.ts           # Integração Apple Health
│   └── watch.ts               # Integração Apple Watch
├── components/mobile/
│   ├── shared/
│   │   ├── SafeAreaWrapper.tsx      # Safe areas do iOS
│   │   ├── MobileTabBar.tsx         # Navegação inferior
│   │   └── MobileAuth.tsx            # Login mobile
│   ├── pro/
│   │   └── ProDashboard.tsx          # Dashboard profissional
│   └── patient/
│       └── [existente]              # App paciente melhorado
└── pages/
    └── mobile/
        ├── index.tsx               # Router baseado em role
        ├── pro/
        │   └── ProApp.tsx            # Entry point profissional
        └── patient/
            └── PatientApp.tsx         # Entry point paciente
```

## 🔧 Solução de Problemas

### Erro: "No matching provisioning profiles found"

**Solução**: Adicione seu dispositivo ao Apple Developer:
1. Conecte o dispositivo via USB
2. No Xcode: Window → Devices and Simulators
3. Selecione "Use for Development"
4. Siga as instruções para registrar o dispositivo

### Erro: "Could not find module @capacitor/ios"

**Solução**:
```bash
npx cap add ios
npx cap sync
```

### Erro: "HealthKit authorization failed"

**Solução**: Verifique se:
1. HealthKit capability está adicionada no Xcode
2. Entitlements estão configurados corretamente
3. Descriptions no Info.plist estão presentes

### Push Notifications não funcionam

**Solução**:
1. Verifique se APNs está configurado no Supabase
2. Certifique-se que o device token foi salvo no banco
3. Verifique se as notificações estão habilitadas nas configurações do iOS

## 📱 Publicação na App Store

### 1. Preparar para Lançamento

```bash
# Build de produção
pnpm run build

# Sync final
npx cap sync ios --prod

# Abrir no Xcode para archive
npx cap open ios
```

### 2. Criar Archive

1. No Xcode: Product → Archive
2. Selecione "Any iOS Device (arm64)" como destino
3. Wait for archive completion

### 3. Distribuir

1. Na janela Organizer, clique em "Distribute App"
2. Selecione "App Store Connect"
3. Siga as instruções para upload
4. Preencha as informações na App Store Connect

## 📚 Recursos Úteis

- [Capacitor iOS Docs](https://capacitorjs.com/docs/ios)
- [Supabase Swift SDK](https://github.com/supabase/supabase-swift)
- [Capacitor Health Plugin](https://github.com/Cap-go/capacitor-health)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)

## 🆘 Suporte

Para dúvidas ou problemas:
1. Consulte o plano completo em `/home/rafael/.claude/plans/refactored-marinating-charm.md`
2. Use os logs do Xcode para debugar
3. Teste frequentemente em dispositivos físicos
4. Verifique a documentação oficial dos plugins Capacitor

---

**Última atualização**: 2026-01-21
**Versão**: 1.0
