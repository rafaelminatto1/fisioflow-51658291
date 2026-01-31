# FisioFlow Pro - App do Profissional

App mobile para profissionais de fisioterapia do FisioFlow, construido com Expo e React Native.

## Requisitos

- Node.js 18+
- npm ou yarn
- Expo Go app no seu iPhone (para desenvolvimento)
- Conta no Expo (gratuita) - https://expo.dev

## Setup Rapido

### 1. Instalar dependencias

```bash
cd professional-app
npm install
```

### 2. Configurar Firebase

1. Copie o arquivo de exemplo:
```bash
cp .env.example .env
```

2. Preencha as variaveis com suas credenciais do Firebase Console:
```env
EXPO_PUBLIC_FIREBASE_API_KEY=sua_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=seu_projeto
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=seu_projeto.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=seu_app_id
```

### 3. Adicionar Icones

Substitua os arquivos placeholder em `assets/` pelos seus icones reais:
- `icon.png` (1024x1024)
- `splash-icon.png` (512x512)
- `adaptive-icon.png` (1024x1024)
- `favicon.png` (48x48)
- `notification-icon.png` (96x96)

### 4. Iniciar o servidor de desenvolvimento

```bash
npm start
```

### 5. Testar no iPhone

1. Baixe o app **Expo Go** na App Store
2. Escaneie o QR Code que aparece no terminal
3. O app sera carregado no seu iPhone

## Build para Producao (iOS)

### Configurar EAS Build

1. Instale o EAS CLI:
```bash
npm install -g eas-cli
```

2. Faca login na sua conta Expo:
```bash
eas login
```

3. Configure o projeto:
```bash
eas build:configure
```

4. Atualize o `app.json` com seu `projectId` do EAS

### Build de Desenvolvimento (para testar em device real)

```bash
npm run build:dev
```

### Build de Producao (para App Store)

```bash
npm run build:prod
```

### Submeter para App Store

```bash
npm run submit
```

> **Nota**: Para submeter para a App Store, voce precisa de uma conta Apple Developer ($99/ano)

## Estrutura do Projeto

```
professional-app/
├── app/                    # Telas (expo-router)
│   ├── (auth)/            # Telas de autenticacao
│   │   ├── login.tsx
│   │   └── forgot-password.tsx
│   ├── (tabs)/            # Telas principais (tab navigation)
│   │   ├── index.tsx      # Dashboard
│   │   ├── patients.tsx   # Lista de Pacientes
│   │   ├── agenda.tsx     # Agenda/Calendario
│   │   └── profile.tsx    # Perfil
│   ├── patient/           # Telas de detalhes
│   │   └── [id].tsx       # Detalhes do Paciente
│   ├── _layout.tsx        # Layout principal
│   └── index.tsx          # Redirect inicial
├── components/            # Componentes reutilizaveis
├── constants/             # Constantes (cores, etc)
├── hooks/                 # Custom hooks
├── lib/                   # Configuracoes (Firebase, etc)
├── store/                 # Estado global (Zustand)
└── types/                 # Tipos TypeScript
```

## Funcionalidades

- [x] Autenticacao (Login/Logout) - restrito a profissionais
- [x] Recuperar Senha
- [x] Dashboard com estatisticas
- [x] Lista de Pacientes com busca
- [x] Agenda de consultas
- [x] Detalhes do Paciente
- [x] Perfil do profissional
- [ ] Cadastro de novo paciente
- [ ] Criar/editar consultas
- [ ] Evolucoes (SOAP)
- [ ] Prescrever exercicios
- [ ] Push Notifications
- [ ] Relatorios

## Tecnologias

- **Expo SDK 52** - Framework React Native
- **Expo Router** - Navegacao baseada em arquivos
- **Firebase** - Autenticacao e banco de dados
- **Zustand** - Gerenciamento de estado
- **React Native Calendars** - Componente de calendario
- **TypeScript** - Tipagem estatica

## Desenvolvimento

### Comandos uteis

```bash
# Iniciar servidor de dev
npm start

# Limpar cache
npx expo start --clear

# Verificar tipos
npm run typecheck

# Lint
npm run lint
```

### Debug

Para debugar, use o Expo DevTools que abre automaticamente no navegador, ou pressione `j` no terminal para abrir o debugger do Chrome.

## Diferencas do App do Paciente

| Funcionalidade | App Paciente | App Profissional |
|----------------|--------------|------------------|
| Login | Qualquer usuario | Apenas profissionais |
| Ver exercicios | Proprios | De todos os pacientes |
| Gerenciar pacientes | Nao | Sim |
| Agendar consultas | Nao | Sim |
| Criar evolucoes | Nao | Sim |
| Dashboard | Pessoal | Geral da clinica |

## Suporte

Para duvidas ou problemas, abra uma issue no repositorio.
