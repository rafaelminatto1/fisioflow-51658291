# EAS Build Setup Guide - FisioFlow Patient App

## Pré-requisitos

### 1. Apple Developer Account
- Ter uma conta de desenvolvedor Apple ($99/ano)
- Team ID disponível

### 2. Instalar EAS CLI
```bash
npm install -g eas-cli
# ou
yarn global add eas-cli
```

### 3. Login no EAS
```bash
eas login
```

### 4. Configurar o projeto
```bash
eas build:configure
```

## Configuração do EAS.json

O arquivo `eas.json` já está configurado com os seguintes builds:

### Build Profiles

**Development**
```bash
eas build --profile development --platform ios
```
- Para desenvolvimento com Expo Dev Tools
- Simulator support

**Preview**
```bash
eas build --profile preview --platform ios
```
- Para testes internos (TestFlight/Internal distribution)
- Device build (não simulator)

**TestFlight**
```bash
eas build --profile testflight --platform ios
```
- Para beta testing via TestFlight
- Auto-increment de version

**Production**
```bash
eas build --profile production --platform ios
```
- Para submissão à App Store
- Auto-increment de version

## Certificados e Provisioning Profiles

O EAS gerencia automaticamente os certificados, mas você precisa configurar no painel:

### Passos:
1. Acesse: https://expo.dev/accounts/rafaelminatto/projects/fisioflow-patient
2. Vá em "Credentials" ou "iOS Certificates"
3. O EAS irá gerar automaticamente:
   - Distribution Certificate
   - Provisioning Profile
   - Push Notification Certificate (já configurado)

## Submissão para TestFlight

### Primeira vez:
```bash
# 1. Build para TestFlight
eas build --profile testflight --platform ios

# 2. Após o build completar, submeter para TestFlight
eas submit --platform ios --profile testflight
```

### Builds subsequentes:
```bash
eas build --profile testflight --platform ios
```

## Submissão para App Store (Production)

### 1. Build para produção
```bash
eas build --profile production --platform ios
```

### 2. Submissão
```bash
eas submit --platform ios --profile production
```

## Configurações necessárias no eas.json

Antes de fazer o build, atualize as seguintes informações no `eas.json`:

```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "seu@email.com",           // Seu Apple ID
        "ascAppId": "YOUR_APP_ID",            // App Store Connect App ID
        "appleTeamId": "YOUR_TEAM_ID"         // Apple Developer Team ID
      }
    }
  }
}
```

## App Store Connect

### Criar o App no App Store Connect:

1. Acesse: https://appstoreconnect.apple.com
2. Vá em "Meus Apps" → "+"
3. Preencha as informações:
   - **Platform**: iOS
   - **Nome**: FisioFlow Paciente
   - **Idioma primário**: Português (Brasil)
   - **Bundle ID**: com.rafaelminatto.fisioflow
   - **SKU**: FISIOFLOW-PATIENT-001

### Informações do App necessárias:

- **Nome**: FisioFlow Paciente
- **Categoria**: Medical (Saúde)
- **Idiomas**: Português (Brasil)
- **Age Rating**: 12+ (orientado para saúde)

## Screenshots necessários

### iPhone (requisito mínimo):
- **6.7" Display** (iPhone 14 Pro Max, iPhone 15 Pro Max): 1290 x 2796 pixels
  - Mínimo: 3 screenshots
  - Recomendado: 6 screenshots

### iPad (opcional):
- **12.9" Display**: 2048 x 2732 pixels
  - Mínimo: 3 screenshots
  - Recomendado: 6 screenshots

## Metadata da App Store

### Descrição Curta (30 caracteres):
```
Fisioterapia na palma da mão
```

### Descrição Longa (4000 caracteres):
```
O FisioFlow é o aplicativo ideal para pacientes de fisioterapia que desejam acompanhar seu progresso e realizar exercícios em casa, com orientação profissional.

COMO FUNCIONA:
1. Vincule-se ao seu fisioterapeuta usando um código de convite
2. Receba planos de exercícios personalizados com vídeos demonstrativos
3. Marque exercícios como concluídos e acompanhe seu progresso
4. Agende consultas e receba lembretes automáticos

RECURSOS PRINCIPAIS:
• Planos de exercícios personalizados com vídeos
• Acompanhamento de evolução e nível de dor
• Lembretes de consultas e exercícios
• Funciona offline - sincronização automática
• Histórico completo de evoluções SOAP
• Interface intuitiva e acessível

PARA FISIOTERAPEUTAS:
O FisioFlow permite que profissionais prescrevam exercícios, acompanhem o progresso dos pacientes e mantenham um registro completo do tratamento.

INFORMAÇÕES DE SEGURANÇA:
Seus dados são armazenados de forma segura e estão em conformidade com a LGPD. Você pode solicitar a exclusão de seus dados a qualquer momento.

Comece sua jornada de recuperação com o FisioFlow hoje!
```

### Palavras-chave (100 caracteres):
```
fisioterapia, exercícios, reabilitação, saúde, fisioterapeuta, tratamento, dolor, evolution
```

### URL de Suporte:
```
https://fisioflow.com.br/suporte
```

### URL de Política de Privacidade:
```
https://fisioflow.com.br/privacidade
```

## Checklist de Preparação

### Antes do primeiro build:
- [ ] Atualizar `eas.json` com Apple ID e Team ID
- [ ] Criar App no App Store Connect
- [ ] Preparar screenshots (mínimo 3 por dispositivo)
- [ ] Escrever descrição e metadata
- [ ] Criar política de privacidade
- [ ] Definir URL de suporte
- [ ] Configurar notificações push (já feito)
- [ ] Testar app em dispositivo físico
- [ ] Verificar todos os fluxos principais

### Testes antes de submeter:
- [ ] Fluxo de cadastro completo
- [ ] Login e logout
- [ ] Vinculação ao profissional
- [ ] Marcar exercícios como completos
- [ ] Reprodução de vídeos
- [ ] Notificações funcionando
- [ ] Modo offline
- [ ] Temas claro/escuro
- [ ] Different screen sizes (iPhone SE, iPhone 14/15, iPhone Pro Max)

## Comandos úteis

### Verificar status do build
```bash
eas build:list
```

### Ver build específico
```bash
eas build:view [BUILD_ID]
```

### Cancelar build
```bash
eas build:cancel [BUILD_ID]
```

### Limpar cache
```bash
eas build:clear-cache
```

## Solução de Problemas

### Erro: "Apple credentials expired"
```bash
eas credentials:reset
```

### Erro: "Missing team ID"
Verifique se o Team ID está correto no `eas.json` e no Apple Developer Portal.

### Erro: "Bundle ID already in use"
O Bundle ID precisa ser único. Se já existe, você precisa usar um diferente ou remover o existente no Apple Developer Portal.

## URLs Úteis

- EAS Docs: https://docs.expo.dev/eas
- App Store Connect: https://appstoreconnect.apple.com
- Apple Developer: https://developer.apple.com
- Expo Dashboard: https://expo.dev

---

**Nota**: Este é um guia inicial. Consulte a documentação oficial da Apple e do EAS para informações mais detalhadas.
