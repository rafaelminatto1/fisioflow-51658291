# Setup de Desenvolvimento para FisioFlow Pro

## Configuração Inicial

### 1. Instalar Dependências

```bash
cd professional-app
pnpm install
```

### 2. Variáveis de Ambiente

O arquivo `.env` já está configurado. Para produção, atualize os seguintes valores:

```bash
# Sentry Configuration
EXPO_PUBLIC_SENTRY_DSN=your_sentry_dsn_here
EXPO_PUBLIC_ENVIRONMENT=production

# API Signing Configuration
EXPO_PUBLIC_API_SIGNING_KEY=your_secure_random_key_here
```

### 3. Login no Expo

```bash
npx expo login
```

Isso é necessário para builds EAS e para o Expo MCP Server.

## Iniciar o Servidor de Desenvolvimento

### Modo Normal

```bash
pnpm start
```

### Modo com MCP (para usar recursos locais)

Para usar capacidades locais do Expo MCP (screenshots, automação):

```bash
EXPO_UNSTABLE_MCP_SERVER=1 pnpm start
```

### No Linux/Mac

```bash
EXPO_UNSTABLE_MCP_SERVER=1 pnpm start
```

### No Windows (PowerShell)

```powershell
$env:EXPO_UNSTABLE_MCP_SERVER=1; pnpm start
```

### No Windows (CMD)

```cmd
set EXPO_UNSTABLE_MCP_SERVER=1
pnpm start
```

## Testar Localmente

### Executar Testes

```bash
# Todos os testes
pnpm test

# Modo watch
pnpm test:watch

# Com cobertura
pnpm test:coverage
```

### Lint

```bash
pnpm lint
```

### Type Check

```bash
pnpm typecheck
```

## Builds Locais

### iOS Development Build

```bash
pnpm ios
```

### Android Development Build

```bash
pnpm android
```

## EAS Builds

### Development Build (com Dev Client)

```bash
eas build --profile development --platform ios
```

### Preview Build

```bash
eas build --profile preview --platform ios
```

### Production Build

```bash
eas build --profile production --platform ios
```

## Submissão às Lojas

### iOS App Store

```bash
eas submit --platform ios
```

### Android Google Play

```bash
eas submit --platform android
```

## Troubleshooting

### Metro bundler não funciona

```bash
# Limpe o cache
npx expo start -c
```

### Problemas com pnpm workspace

```bash
# Reinstale as dependências
rm -rf node_modules
cd ..
pnpm install
cd professional-app
```

### Erro de certificação no iOS

```bash
# Limpe o cache do build
rm -rf ios/build
rm -rf ios/Pods
cd ios && pod install && cd ..
```

### Problemas com o Expo MCP

1. Certifique-se de ter uma conta Expo com plano EAS pago
2. Verifique se o token do Expo está configurado
3. Reinicie o servidor MCP nas configurações do Claude Code

## Verificar Expo Doctor

```bash
npx expo-doctor
```

Isso verificará problemas comuns na configuração.

## Links Úteis

- [Expo Documentation](https://docs.expo.dev/)
- [Expo EAS](https://docs.expo.dev/eas/)
- [Expo Router](https://docs.expo.dev/router/)
- [React Native](https://reactnative.dev/)
- [TypeScript](https://www.typescriptlang.org/)
