# Expo EAS Build: Desenvolvimento iOS sem Mac

## O que é EAS (Expo Application Services)?

**EAS** é um conjunto de ferramentas poderosas e altamente customizáveis que permitem construir apps React Native tanto na nuvem EAS quanto localmente. O principal benefício é que você pode **compilar apps iOS sem ter um Mac**.

## Componentes Principais

### 1. EAS Build
- **Serviço de build na nuvem** que compila seu app iOS/Android
- Elimina necessidade de ter um Mac para builds iOS
- Builds acontecem em servidores da Expo
- Suporta builds customizados e configurações avançadas

### 2. EAS Submit
- **Serviço de submissão automática** para App Store e Google Play
- Upload e submissão de binários diretamente para as lojas
- Pode ser automatizado com flag `--auto-submit`
- Integrado com EAS Build para fluxo contínuo

### 3. EAS Update
- **Updates over-the-air (OTA)** sem passar pela App Store
- Atualizações instantâneas de JavaScript/assets
- Ideal para correções rápidas e pequenas melhorias
- Não funciona para mudanças nativas

## Workflow Completo sem Mac

### Pré-requisitos
1. **Conta Expo** (gratuita): https://expo.dev/
2. **Apple Developer Account** ($99/ano) - você já tem ✅
3. **EAS CLI** instalado: `npm install -g eas-cli`
4. **Projeto React Native com Expo**

### Passo a Passo

#### 1. Configuração Inicial
```bash
# Login na conta Expo
eas login

# Configurar EAS no projeto
eas build:configure
```

Isso cria dois arquivos:
- `app.json` - com o EAS project ID
- `eas.json` - com configurações de build

#### 2. Estrutura do eas.json
```json
{
  "cli": {
    "version": ">= 16.19.3",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "seu-email@apple.com",
        "ascAppId": "ID-do-app-no-app-store-connect",
        "appleTeamId": "ID-do-time-apple-developer"
      }
    }
  }
}
```

#### 3. Tipos de Build

**Development Build**:
- Para desenvolvimento e testes
- Inclui ferramentas de debug
- Pode ser instalado via Expo Go ou TestFlight
- Comando: `eas build --profile development --platform ios`

**Preview Build**:
- Para testes internos (beta testing)
- Distribuição interna via TestFlight
- Comando: `eas build --profile preview --platform ios`

**Production Build**:
- Para submissão à App Store
- Build otimizado e minificado
- Comando: `eas build --profile production --platform ios`

#### 4. Processo de Build na Nuvem

```bash
# Build para iOS (produção)
eas build --profile production --platform ios

# Build com submissão automática
eas build --profile production --platform ios --auto-submit
```

**O que acontece**:
1. Código é enviado para servidores EAS
2. Dependências são instaladas
3. App é compilado em um Mac na nuvem da Expo
4. IPA (arquivo iOS) é gerado
5. Você recebe link para download do IPA
6. (Opcional) IPA é automaticamente submetido à App Store

#### 5. Submissão Manual

Se não usar `--auto-submit`:

```bash
# Submeter build existente
eas submit --platform ios --latest

# Ou submeter um IPA específico
eas submit --platform ios --path ./path/to/app.ipa
```

### Credenciais Apple

EAS gerencia suas credenciais automaticamente:

1. **Certificados de Distribuição**: Criados e gerenciados pela Expo
2. **Provisioning Profiles**: Gerados automaticamente
3. **App Store Connect API Key**: Você fornece uma vez, Expo armazena com segurança

**Como configurar**:
```bash
eas credentials
```

Siga o wizard interativo para configurar:
- Apple ID
- App-specific password
- Team ID
- App Store Connect API Key

## Limitações e Considerações

### O que NÃO precisa de Mac
✅ Desenvolvimento do código React Native
✅ Compilação do app iOS (via EAS Build)
✅ Submissão para App Store (via EAS Submit)
✅ Testes em simulador (via Expo Go no iOS)
✅ Updates OTA (via EAS Update)

### O que PODE precisar de Mac
⚠️ **Testes em dispositivo iOS físico durante desenvolvimento**:
- Você pode usar Expo Go para testar (sem Mac)
- Ou criar development build e instalar via TestFlight (sem Mac)
- Mas para debug avançado com Xcode, precisa de Mac

⚠️ **Módulos nativos customizados**:
- Se você criar código Swift/Objective-C do zero
- Mas 99% dos casos usa bibliotecas prontas

⚠️ **Troubleshooting de erros nativos complexos**:
- Xcode logs são mais detalhados
- Mas EAS Build fornece logs completos também

### Custos

**Expo EAS Build**:
- **Free tier**: 30 builds/mês (suficiente para começar)
- **Production tier**: $29/mês - builds ilimitados
- **Enterprise tier**: $999/mês - para grandes equipes

**Para FisioFlow**:
- Com 2 apps (Pacientes + Profissionais)
- Estimativa: 5-10 builds/semana durante desenvolvimento
- **Free tier é suficiente para MVP**
- Depois, $29/mês é muito mais barato que comprar um Mac ($1000+)

## Vantagens do EAS Build

1. **Sem necessidade de Mac** - build na nuvem
2. **Configuração simplificada** - credenciais gerenciadas automaticamente
3. **CI/CD pronto** - integração com GitHub Actions, GitLab CI, etc.
4. **Builds consistentes** - mesmo ambiente para todos
5. **Logs detalhados** - fácil debug de problemas de build
6. **Versionamento automático** - incremento de build number
7. **Distribuição facilitada** - TestFlight e App Store integrados

## Desvantagens do EAS Build

1. **Tempo de build** - 10-20 minutos na nuvem vs 5-10 minutos local
2. **Dependência de internet** - precisa enviar código para nuvem
3. **Custo** - após free tier, $29/mês (mas ainda mais barato que Mac)
4. **Menos controle** - ambiente de build é gerenciado pela Expo

## Alternativas

### 1. Comprar um Mac
**Prós**:
- Builds locais mais rápidos
- Controle total
- Pode usar Xcode para debug avançado

**Contras**:
- Custo inicial alto ($1000-$3000)
- Manutenção e atualizações
- Ocupa espaço físico
- Pode ficar obsoleto

### 2. Mac Mini na Nuvem (MacStadium, AWS Mac, etc.)
**Prós**:
- Acesso remoto a um Mac real
- Pode usar Xcode
- Paga apenas pelo uso

**Contras**:
- Custo mensal ($50-$100/mês)
- Latência de rede
- Configuração mais complexa

### 3. VM com macOS no Ubuntu
**Prós**:
- "Gratuito" (usa seu hardware)

**Contras**:
- **Viola termos de serviço da Apple** ⚠️
- Performance ruim
- Instável e difícil de manter
- Problemas de compatibilidade
- **NÃO RECOMENDADO**

## Recomendação para FisioFlow

### Cenário Ideal: EAS Build (sem Mac)

**Por quê**:
1. ✅ Você já tem Apple Developer Account
2. ✅ Você tem Ubuntu (não precisa comprar Mac)
3. ✅ Free tier é suficiente para começar
4. ✅ Depois, $29/mês é muito mais barato que Mac
5. ✅ Workflow simplificado e automatizado
6. ✅ Foco no desenvolvimento, não na infraestrutura

**Quando considerar comprar um Mac**:
- Se você for fazer muitos builds diários (>30/mês)
- Se precisar de debug muito avançado com Xcode
- Se quiser builds mais rápidos (5-10 min vs 15-20 min)
- Se tiver orçamento disponível ($1000-$1500 para Mac Mini M2)

### Workflow Recomendado

**Fase 1: MVP (0-3 meses)**
- Usar EAS Build free tier
- Development builds para testes internos
- Preview builds para beta testers
- Production builds para App Store

**Fase 2: Crescimento (3-12 meses)**
- Upgrade para EAS Production ($29/mês)
- Builds ilimitados
- CI/CD automatizado com GitHub Actions
- Updates OTA para correções rápidas

**Fase 3: Escala (12+ meses)**
- Avaliar se vale a pena comprar Mac Mini
- Ou continuar com EAS se workflow estiver funcionando bem
- Considerar Enterprise tier se tiver equipe grande

## Integração com GitHub Actions

Você pode automatizar builds com GitHub Actions:

```yaml
name: EAS Build
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install -g eas-cli
      - run: eas build --platform ios --non-interactive --no-wait
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

## Recursos e Documentação

- **Documentação Oficial**: https://docs.expo.dev/build/introduction/
- **EAS Build**: https://docs.expo.dev/build/setup/
- **EAS Submit**: https://docs.expo.dev/submit/introduction/
- **EAS Update**: https://docs.expo.dev/eas-update/introduction/
- **Pricing**: https://expo.dev/pricing
- **Dashboard**: https://expo.dev/accounts/[your-account]/projects

## Conclusão

Para o FisioFlow, **EAS Build é a solução ideal**:

1. ✅ Não precisa comprar Mac
2. ✅ Workflow simplificado
3. ✅ Custo-benefício excelente
4. ✅ Escalável conforme crescimento
5. ✅ Suporte oficial da Expo
6. ✅ Comunidade ativa

**Comece com o free tier e avalie**. Se funcionar bem (e vai funcionar), você economiza $1000+ de um Mac e tem um workflow mais profissional e automatizado.
