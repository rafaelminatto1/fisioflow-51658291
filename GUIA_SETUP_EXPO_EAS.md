# Guia de Setup Inicial - Expo EAS Build

## Guia Passo a Passo para Compilar iOS sem Mac

Este guia detalha todo o processo de configuração do Expo EAS Build para compilar aplicativos iOS sem precisar de um Mac.

---

## Sumário

1. [Pré-requisitos](#1-pré-requisitos)
2. [Criar Conta Expo](#2-criar-conta-expo)
3. [Configurar Projeto Expo](#3-configurar-projeto-expo)
4. [Configurar Firebase](#4-configurar-firebase)
5. [Configurar EAS Build](#5-configurar-eas-build)
6. [Configurar Credenciais Apple](#6-configurar-credenciais-apple)
7. [Primeiro Build](#7-primeiro-build)
8. [TestFlight](#8-testflight)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Pré-requisitos

### 1.1 Contas Necessárias

| Serviço | Custo | Status |
|---------|-------|--------|
| Apple Developer Account | $99/ano | ✅ Já possui |
| Expo Account | Grátis | ⚠️ Criar |
| Firebase Project | Grátis/Pay-as-you-go | ✅ Já configurado |

### 1.2 Ferramentas Necessárias

```bash
# Verificar Node.js (v20+)
node --version

# Verificar pnpm (v8+)
pnpm --version

# Instalar EAS CLI
npm install -g eas-cli

# Verificar instalação
eas --version
```

### 1.3 Ambiente de Desenvolvimento

- [x] Ubuntu/Linux
- [x] Node.js 24.x
- [x] pnpm 9.15.0
- [x] Git configurado
- [x] Editor de código (VS Code)

---

## 2. Criar Conta Expo

### 2.1 Criar Conta

1. Acesse: https://expo.dev/
2. Clique em "Sign Up"
3. Use o e-mail: `activityfisioterapiamooca@gmail.com`
4. Confirme o e-mail de verificação

### 2.2 Login via CLI

```bash
# Fazer login na conta Expo
eas login

# Será solicitado:
# - Press Enter to log in via web browser
# - Ou colar o token de autenticação
```

### 2.3 Verificar Login

```bash
# Verificar se está logado
eas whoami

# Deverá mostrar: activityfisioterapiamooca@gmail.com
```

---

## 3. Configurar Projeto Expo

### 3.1 Criar Projeto para Pacientes

```bash
# Navegar para o diretório principal
cd /home/rafael/antigravity/fisioflow/fisioflow-51658291

# Criar projeto Expo para pacientes
npx create-expo-app@latest apps/patient-ios --template blank-typescript

# Navegar para o projeto
cd apps/patient-ios

# Instalar dependências adicionais
pnpm add expo-router expo-linking expo-constants expo-status-bar
pnpm add @react-navigation/native @react-navigation/stack
pnpm add firebase @firebase/app
pnpm add @tanstack/react-query
pnpm add zustand
```

### 3.2 Estrutura Inicial

```
apps/patient-ios/
├── app/
│   ├── _layout.tsx
│   ├── index.tsx
│   └── (auth)/
│       ├── _layout.tsx
│       ├── login.tsx
│       └── register.tsx
├── assets/
│   ├── icon.png
│   ├── splash.png
│   └── adaptive-icon.png
├── components/
├── hooks/
├── services/
├── app.json
├── package.json
├── tsconfig.json
└── eas.json
```

### 3.3 Configurar app.json

```json
// apps/patient-ios/app.json
{
  "expo": {
    "name": "FisioFlow Pacientes",
    "slug": "fisioflow-patients",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#3B82F6"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.fisioflow.patients",
      "buildNumber": "1",
      "infoPlist": {
        "NSCameraUsageDescription": "Necessário para registrar seus exercícios",
        "NSPhotoLibraryUsageDescription": "Necessário para salvar seu progresso",
        "NSMicrophoneUsageDescription": "Necessário para gravar feedback"
      }
    },
    "android": {
      "package": "com.fisioflow.patients"
    },
    "extra": {
      "eas": {
        "projectId": "será-adicionado-pelo-eas"
      }
    }
  }
}
```

---

## 4. Configurar Firebase

### 4.1 Adicionar App iOS no Firebase

1. Acesse: https://console.firebase.google.com/
2. Projeto: `fisioflow-migration`
3. Clique no ícone iOS (+)
4. Bundle ID: `com.fisioflow.patients`
5. App name: `FisioFlow Pacientes`
6. Clique em "Register app"

### 4.2 Baixar GoogleService-Info.plist

```bash
# No diretório do projeto
cd apps/patient-ios

# Criar diretório para o arquivo
mkdir -p ios

# Copiar o arquivo baixado para:
# ios/GoogleService-Info.plist
```

### 4.3 Instalar Firebase no Projeto

```bash
# Instalar Firebase SDK
pnpm add firebase
pnpm add -D @types/firebase

# Instalar Expo Google Fonts
pnpm add expo-font @expo-google-fonts/inter
```

### 4.4 Configurar Firebase no app.json

```json
// apps/patient-ios/app.json - adicionar na seção ios
{
  "expo": {
    "ios": {
      "googleServicesFile": "./GoogleService-Info.plist",
      "config": {
        "googleSignIn": {
          "reservedClientId": "CLIENT_ID_REVERSO_DO_FIREBASE"
        }
      }
    }
  }
}
```

---

## 5. Configurar EAS Build

### 5.1 Inicializar EAS no Projeto

```bash
# No diretório do projeto
cd apps/patient-ios

# Inicializar EAS
eas build:configure
```

Este comando:
- Cria/atualiza `eas.json`
- Adiciona `projectId` no `app.json`
- Configura integração com Expo

### 5.2 Configurar eas.json

```json
// apps/patient-ios/eas.json
{
  "cli": {
    "version": ">= 5.2.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "resourceClass": "m-medium"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "resourceClass": "m-medium"
      }
    },
    "production": {
      "autoIncrement": "buildNumber",
      "ios": {
        "resourceClass": "m-medium"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "activityfisioterapiamooca@gmail.com",
        "ascAppId": "APP_STORE_CONNECT_APP_ID",
        "appleTeamId": "APPLE_TEAM_ID"
      }
    }
  }
}
```

### 5.3 Resource Classes

| Resource Class | Descrição | Quando Usar |
|----------------|-----------|-------------|
| `m-medium` | 2 cores, 4GB RAM | Desenvolvimento, builds pequenos |
| `m-large` | 8 cores, 16GB RAM | Produção, builds grandes |
| `m-xl` | 16 cores, 32GB RAM | Apps complexos, CI/CD |

---

## 6. Configurar Credenciais Apple

### 6.1 Entender as Credenciais

Para compilar um app iOS, você precisa:

1. **Apple ID** - Login do desenvolvedor (já tem ✅)
2. **Team ID** - Identificador da equipe de desenvolvimento
3. **Bundle Identifier** - ID único do app (`com.fisioflow.patients`)
4. **Provisioning Profile** - Perfil de provisionamento
5. **Distribution Certificate** - Certificado de distribuição

### 6.2 Configurar Credenciais via EAS

```bash
# Executar o comando de credenciais
eas credentials

# Seguir o wizard:
#
# 1. Escolher plataforma: iOS
# 2. Escolher ação: Configure new credentials
# 3. EAS vai:
#    - Pedir Apple ID
#    - Pedir app-specific password
#    - Criar automaticamente:
#      - Distribution Certificate
#      - Provisioning Profile
#    - Armazenar de forma segura
```

### 6.3 Gerar App-Specific Password

1. Acesse: https://appleid.apple.com/
2. Faça login
3. Seção "Segurança" → "Senhas Específicas"
4. Clique em "Gerar senha"
5. Label: `Expo EAS Build`
6. Copie a senha gerada (formato: `abcd-efgh-ijkl-mnop`)

### 6.4 Obter Team ID

```bash
# Se ainda não souber o Team ID:
# 1. Acesse: https://developer.apple.com/account/
# 2. Verifique em "Membership"
# 3. Team ID está no formato: ABC123XYZ
```

### 6.5 Opção: Gerenciar Credenciais Manualmente

Se preferir controle total:

```bash
# Listar credenciais existentes
eas credentials:list

# Remover credenciais locais
eas credentials:reset --platform ios
```

---

## 7. Primeiro Build

### 7.1 Build de Desenvolvimento

```bash
# Build para desenvolvimento (com ferramentas de debug)
eas build --profile development --platform ios

# O que acontece:
# 1. Código é enviado para servidores EAS
# 2. Dependências são instaladas
# 3. App é compilado em um Mac na nuvem
# 4. IPA é gerado (arquivo do iOS)
# 5. Link para download é fornecido
```

### 7.2 Monitorar Build

```bash
# Ver builds recentes
eas build:list

# Ver detalhes de um build específico
eas build:view [BUILD_ID]

# Ver logs do build
eas build:view [BUILD_ID] --logs
```

### 7.3 Build de Preview

```bash
# Build para testes internos (beta)
eas build --profile preview --platform ios

# Este build:
# - Não tem ferramentas de debug
# - Pode ser instalado via TestFlight
# - É mais leve que o de produção
```

### 7.4 Build de Produção

```bash
# Build para App Store
eas build --profile production --platform ios

# Este build:
# - É otimizado e minificado
# - Não tem logs de debug
# - Está pronto para submissão
```

### 7.5 Build com Auto-Submit

```bash
# Build E submissão automática para App Store
eas build --profile production --platform ios --auto-submit

# Requisitos:
# - Ter app configurado no App Store Connect
# - Informar ascAppId no eas.json
```

---

## 8. TestFlight

### 8.1 Configurar App no App Store Connect

1. Acesse: https://appstoreconnect.apple.com/
2. "Meus Apps" → "+" → "Novo App"
3. Preencha:
   - Plataforma: iOS
   - Nome: FisioFlow Pacientes
   - Idioma Primário: Português (Brasil)
   - Bundle ID: com.fisioflow.patients
   - SKU: FISIOFLOW-PATIENTS-001

### 8.2 Informações Básicas do App

No App Store Connect, preencha:

| Campo | Valor |
|-------|-------|
| Nome | FisioFlow Pacientes |
| Categoria | Saúde |
| Subcategoria | Médica |
| Idiomas | Português (Brasil) |
| Faixa Etária | 12+ |

### 8.3 Adicionar Testers Internos

1. App Store Connect → "Meus Apps" → FisioFlow Pacientes
2. "TestFlight" → "Testadores Internos"
3. Adicionar e-mails dos testers
4. Enviar convite

### 8.4 Enviar Build para TestFlight

```bash
# Após o build completar
eas submit --platform ios --latest

# Ou enviar build específico
eas submit --platform ios --path ./fisioflow-patients.ipa
```

### 8.5 Testar em Dispositivo

1. Baixar app "TestFlight" na App Store
2. Aceitar convite de teste
3. Baixar e instalar o build
4. Testar funcionalidades

---

## 9. Troubleshooting

### 9.1 Erros Comuns

#### Erro: "Invalid credentials"

```bash
# Solução: Resetar e reconfigurar credenciais
eas credentials:reset --platform ios
eas credentials
```

#### Erro: "Build failed"

```bash
# Ver logs completos
eas build:view [BUILD_ID] --logs

# Verificar app.json
eas build:configure
```

#### Erro: "Provisioning profile expired"

```bash
# Recriar perfil de provisionamento
eas credentials:reset --platform ios
```

### 9.2 Debug de Builds

```bash
# Ver status do build
eas build:list --limit=10 --status=finished

# Ver logs de build específico
eas build:view [BUILD_ID] --platform ios --output=json

# Build local (requer Mac)
eas build --profile development --platform ios --local
```

### 9.3 Problemas de Permissão

#### Erro: Camera permission denied

```json
// app.json - adicionar permissões
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "Necessário para registrar seus exercícios em vídeo"
      }
    }
  }
}
```

#### Erro: Photo library permission denied

```json
// app.json - adicionar permissões
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSPhotoLibraryUsageDescription": "Necessário para salvar fotos do seu progresso",
        "NSPhotoLibraryAddUsageDescription": "Necessário para salvar fotos do seu progresso"
      }
    }
  }
}
```

### 9.4 Performance

#### Build muito lento

```json
// eas.json - usar resource class maior
{
  "build": {
    "production": {
      "ios": {
        "resourceClass": "m-large"  // ou "m-xl"
      }
    }
  }
}
```

#### Erro de memória no build

```bash
# Aumentar memória do Node
NODE_OPTIONS="--max-old-space-size=8192" eas build --profile production --platform ios
```

---

## 10. Comandos Úteis

### 10.1 Build

```bash
# Build de desenvolvimento
eas build --profile development --platform ios

# Build de preview
eas build --profile preview --platform ios

# Build de produção
eas build --profile production --platform ios

# Build com auto-submit
eas build --profile production --platform ios --auto-submit

# Build local (requer Mac)
eas build --profile development --platform ios --local
```

### 10.2 Submit

```bash
# Submit último build
eas submit --platform ios --latest

# Submit build específico
eas submit --platform ios --path ./app.ipa

# Submit com mensagem
eas submit --platform ios --latest --message "Bug fixes and improvements"
```

### 10.3 Update (OTA)

```bash
# Criar update branch
eas update --branch production --message "Fix login bug"

# Listar updates
eas update:list --branch production

# Reverter update
eas update:revert --branch production
```

### 10.4 Credenciais

```bash
# Ver credenciais
eas credentials:list

# Resetar credenciais
eas credentials:reset --platform ios

# Configurar credenciais
eas credentials
```

---

## 11. CI/CD com GitHub Actions

### 11.1 Configurar Secrets no GitHub

1. Repositório → Settings → Secrets and variables → Actions
2. Adicionar secrets:
   - `EXPO_TOKEN`: Token da conta Expo
   - `APPLE_ID`: Seu Apple ID
   - `APPLE_APP_SPECIFIC_PASSWORD`: Senha específica
   - `APPLE_TEAM_ID`: Seu Team ID

### 11.2 Workflow GitHub Actions

```yaml
# .github/workflows/eas-build.yml
name: EAS Build

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:

jobs:
  build:
    name: Build iOS App
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Build iOS App
        run: eas build --platform ios --non-interactive --output ./app.ipa
        working-directory: ./apps/patient-ios
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}

      - name: Upload IPA
        uses: actions/upload-artifact@v4
        with:
          name: ios-ipa
          path: ./apps/patient-ios/app.ipa
          retention-days: 30
```

---

## 12. Checklist Final

### Antes do Primeiro Build

- [ ] Conta Expo criada
- [ ] EAS CLI instalado
- [ ] Projeto Expo criado
- [ ] Firebase configurado
- [ ] GoogleService-Info.plist baixado
- [ ] app.json configurado
- [ ] eas.json configurado
- [ ] Credenciais Apple configuradas
- [ ] App criado no App Store Connect
- [ ] Bundle ID verificado
- [ ] Permissões configuradas
- [ ] Primeiro build executado com sucesso

### Antes do Submit para App Store

- [ ] Icones gerados (1024x1024)
- [ ] Splash screen configurada
- [ ] Screenshots preparadas (todos tamanhos)
- [ ] Descrição do app escrita
- [ ] Palavras-chave definidas
- [ ] URL de suporte
- [ ] Política de privacidade
- [ ] Termos de uso
- [ ] Faixa etária definida
- [ ] TestFlight testado
- [ ] Bugs críticos corrigidos

---

## 13. Recursos

- [Expo Documentation](https://docs.expo.dev/)
- [EAS Build Guide](https://docs.expo.dev/build/introduction/)
- [EAS Submit Guide](https://docs.expo.dev/submit/introduction/)
- [App Store Connect](https://appstoreconnect.apple.com/)
- [Apple Developer](https://developer.apple.com/)

---

**Data:** 24 de Janeiro de 2026
**Versão:** 1.0
**Status:** Pronto para Uso
