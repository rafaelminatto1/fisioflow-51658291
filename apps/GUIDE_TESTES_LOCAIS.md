# FisioFlow - Guia de Testes Locais com Expo Go

Este guia fornece instruções completas para testar os aplicativos FisioFlow localmente usando Expo Go.

## Pré-requisitos

### Software Necessário

- **Node.js** 18+ e **npm** (ou pnpm)
- **Git** para controle de versão
- **VS Code** (recomendado) ou outro editor de código

### Apps Necessários

- **Expo Go** no seu dispositivo físico
  - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
  - [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

### Hardware (Opcional)

- Dispositivo iOS físico (iPhone/iPad) para testes completos
- Ou simulador iOS (requer Mac com Xcode)

## Configuração Inicial

### 1. Clonar e Configurar o Projeto

```bash
# Clone o repositório (se ainda não fez)
cd ~/antigravity/fisioflow/fisioflow-51658291

# Instale as dependências
pnpm install

# Configure as variáveis de ambiente (se necessário)
cp apps/patient-ios/.env.example apps/patient-ios/.env
cp apps/professional-ios/.env.example apps/professional-ios/.env
```

### 2. Verificar Firebase

Certifique-se de que os arquivos de configuração do Firebase estão no lugar:

```bash
# Verificar se os arquivos existem
ls apps/patient-ios/GoogleService-Info.plist
ls apps/professional-ios/GoogleService-Info.plist
```

Se não existirem, você precisará criá-los no [Firebase Console](https://console.firebase.google.com/).

## Iniciando o App Paciente

### Passo 1: Navegar até o diretório

```bash
cd apps/patient-ios
```

### Passo 2: Iniciar o servidor de desenvolvimento

```bash
pnpm start
```

ou

```bash
npx expo start
```

### Passo 3: Conectar com Expo Go

Você verá um QR code no terminal. Para conectar:

**Opção A: Usando o app Expo Go**
1. Abra o Expo Go no seu dispositivo
2. Toque em "Scan QR Code"
3. Escaneie o QR code no terminal
4. Aguarde o app carregar

**Opção B: Usando URL Manual**
1. Abra o Expo Go no seu dispositivo
2. Digite a URL mostrada no terminal (algo como `exp://xxx.xxx.xxx.xxx:19000`)
3. Toque em "Go to project"

**Opção C: Usando Tunel (se necessário)**
Se a conexão local não funcionar:
```bash
npx expo start --tunnel
```
Isso usará os servidores da Expo para criar um túnel.

## Iniciando o App Profissional

### Passo 1: Parar o servidor atual

Pressione `Ctrl + C` no terminal onde o paciente está rodando.

### Passo 2: Navegar e iniciar

```bash
cd ../professional-ios
pnpm start
```

### Passo 3: Conectar com Expo Go

Siga os mesmos passos de conexão QR code/URL.

## Comandos Úteis do Expo

### Limpar Cache

Se você enfrentar problemas de cache:

```bash
# Limpar cache do Expo
npx expo start --clear

# Limpar cache completamente e reinstalar
rm -rf node_modules
pnpm install
npx expo start --clear
```

### Modos de Conexão

```bash
# Conexão via túnel (requer internet)
npx expo start --tunnel

# Conexão local (mesma rede)
npx expo start --lan

# Conexão via USB (Android apenas)
npx expo start --host localhost
```

### Abrir Web

```bash
# Abrir no navegador (debugging)
npx expo start --web
```

## Debugging

### React Native Debugger

Para debug mais avançado:

1. Instale o [React Native Debugger](https://github.com/jhen0409/react-native-debugger)
2. Inicie com:
   ```bash
   npx expo start --devtools
   ```
3. Abra o React Native Debugger

### Chrome DevTools

1. Abra o app no Expo Go
2. Abra o menu no dispositivo (shake gesture ou botão)
3. Toque em "Debug with Chrome"
4. Use as DevTools do Chrome

### Console Logs

Para ver os console.log:
- Use o terminal onde o Expo está rodando
- Ou use o Chrome DevTools quando em modo debug

## Testando Funcionalidades Específicas

### Autenticação Firebase

```typescript
// Teste se o Firebase está configurado
import { initializeApp } from 'firebase/app';

// Abra o console e verifique se não há erros de inicialização
console.log('Firebase initialized:', app);
```

### Notificações Push

**Importante:** Notificações push não funcionam no Expo Go. Você precisa de um build de desenvolvimento.

### Câmera e Galeria

A maioria das funcionalidades de câmera/galeria funcionam no Expo Go.

### Offline Mode

Para testar o modo offline:
1. Abra o app normalmente
2. Deixe carregar alguns dados
3. Ative o modo avião no dispositivo
4. Navegue pelo app - os dados cacheados devem ainda estar visíveis

## Resolvendo Problemas Comuns

### "Unable to resolve module"

```bash
cd apps/patient-ios  # ou professional-ios
pnpm install
npx expo start --clear
```

### "Network request failed"

- Verifique se o dispositivo e computador estão na mesma rede
- Tente usar `--tunnel` ao invés de conexão local
- Verifique as configurações de firewall

### Firebase não conecta

- Verifique se o `GoogleService-Info.plist` está correto
- Verifique se o Firebase App ID corresponde
- Verifique as regras de segurança do Firestore

### Erro de tipagem TypeScript

```bash
# Reinicie o servidor TypeScript
npx tsc --noEmit --watch
```

### Layout Quebrado

- Verifique se `SafeAreaProvider` está envolvendo o app
- Verifique se o `app.json` tem as configurações corretas de iOS

## Build de Desenvolvimento (para notificações e recursos nativos)

Para testar recursos que não funcionam no Expo Go (push notifications, etc.):

### Criar Build de Desenvolvimento

```bash
# No diretório do app
cd apps/patient-ios

# Login no EAS (primeira vez apenas)
npx eas login

# Configurar projeto EAS (primeira vez apenas)
npx eas build:configure

# Build de desenvolvimento
npx eas build --profile development --platform ios

# Depois de aprovado, instale no dispositivo
npx eas build:view
```

### Instalar Build de Desenvolvimento

1. Quando o build terminar, você receberá um email
2. Baixe o arquivo `.ipa` (TestFlight)
3. Instale no seu dispositivo iOS

## Testes Automatizados

### Rodar Testes Unitários

```bash
# Na raiz do projeto
pnpm test

# Com cobertura
pnpm test:coverage

# Watch mode
pnpm test:watch
```

### Testes E2E (Cypress)

```bash
# Testes end-to-end do web app
pnpm test:e2e
```

## Checklist de Testes

Antes de considerar o app pronto para produção:

### App Paciente
- [ ] Login/logout funciona
- [ ] Home screen exibe dados corretos
- [ ] Lista de exercícios carrega
- [ ] Execução de exercício completa
- [ ] Cronômetro funciona corretamente
- [ ] Registro de dor (EVA) salva
- [ ] Tela de progresso exibe gráficos
- [ ] Modo offline mantém dados
- [ ] Notificações são recebidas (build dev)

### App Profissional
- [ ] Login/logout funciona
- [ ] Dashboard exibe estatísticas
- [ ] Lista de pacientes carrega
- [ ] Perfil do paciente mostra dados
- [ ] Calendário exibe agendamentos
- [ ] Criação de agendamento funciona
- [ ] Visualização dia/semana/mês funciona
- [ ] Modo offline mantém dados
- [ ] Notificações são recebidas (build dev)

## Recursos Adicionais

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)

## Próximos Passos

Após testar localmente:

1. **Gerar build de desenvolvimento** para testar notificações
2. **Testar em múltiplos dispositivos** (iPhone, iPad, diferentes versões de iOS)
3. **Testar cenários de borda** (modo avião, erro de rede, etc.)
4. **Submeter para TestFlight** para testes com beta testers
5. **Coletar feedback** e fazer ajustes

## Suporte

Se encontrar problemas:

1. Verifique os logs no terminal do Expo
2. Consulte a documentação do Expo
3. Abra uma issue no repositório do projeto
4. Entre em contato com a equipe de desenvolvimento
