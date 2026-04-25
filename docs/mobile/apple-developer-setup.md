# Apple Developer + App Store Connect — Setup

**Quem precisa fazer**: usuário (sem Mac, tudo via navegador).
**Quando fazer**: antes do primeiro build TestFlight com sucesso.
**Custo**: $99 USD/ano (Apple Developer Program).

## 1. Comprar Apple Developer Account

1. https://developer.apple.com/programs/enroll/
2. Login com Apple ID pessoal (criar se não tiver)
3. Tipo: **Individual** (mais simples) ou **Organization** (precisa D-U-N-S, mais demorado)
4. Pagar $99 com cartão internacional (a cobrança é em USD)
5. Aprovação: Individual = imediato; Organization = 24-72h

## 2. Criar App ID

1. https://developer.apple.com/account/resources/identifiers/list
2. **+** (botão azul) → **App IDs** → **App** → Continue
3. Configurar:
   - **Description**: FisioFlow
   - **Bundle ID**: Explicit → `com.moocafisio.fisioflow`
   - **Capabilities** (marcar):
     - Push Notifications
     - Associated Domains (deep links)
     - HealthKit (se usar wearables — opcional)
4. Continue → Register

## 3. Gerar certificado de distribuição

1. https://developer.apple.com/account/resources/certificates/list
2. **+** → **Apple Distribution** → Continue
3. Aqui Apple pede um **CSR (Certificate Signing Request)**:
   - Sem Mac local? **Use uma alternativa online**: https://nctools.org/csr-generator (insira info, baixe `.csr` e `.key`)
   - Subir o `.csr` no painel Apple
4. Apple emite o certificado `.cer`. Baixar.
5. **Converter para .p12** (necessário pro CI):
   - No Linux: `openssl x509 -in cert.cer -inform DER -out cert.pem` + `openssl pkcs12 -export -inkey private.key -in cert.pem -out distribution.p12`
   - Define uma senha forte e **anota** (vai virar `IOS_CERT_PASSWORD`)

## 4. Criar Provisioning Profile

1. https://developer.apple.com/account/resources/profiles/list
2. **+** → **App Store** → Continue
3. App ID: `com.moocafisio.fisioflow`
4. Certificate: o que você acabou de criar
5. **Profile Name**: `FisioFlow App Store` (anota — vai pra `IOS_PROVISIONING_PROFILE_NAME`)
6. Generate → Download `.mobileprovision`

## 5. Criar app no App Store Connect

1. https://appstoreconnect.apple.com/apps
2. **+** → **New App**
3. Configuração:
   - **Platform**: iOS
   - **Name**: FisioFlow
   - **Primary Language**: Portuguese (Brazil)
   - **Bundle ID**: selecionar `com.moocafisio.fisioflow`
   - **SKU**: `fisioflow-ios-001`
   - **User Access**: Full Access
4. Create

## 6. Gerar API Key (para uploads via CI)

1. https://appstoreconnect.apple.com/access/api
2. **Keys** → **+** (Generate API Key)
3. **Name**: `FisioFlow CI`
4. **Access**: App Manager (suficiente pra TestFlight)
5. Generate → Download `.p8` (**só pode baixar UMA vez**, guarde!)
6. Copiar:
   - **Key ID** (10 chars, ex: `ABC123DEF4`)
   - **Issuer ID** (UUID, ao topo da página)

## 7. Anotar valores e converter para base64

No Linux/terminal:

```bash
# Cert .p12 → base64
base64 -w0 distribution.p12 > distribution.p12.b64

# Provisioning profile → base64
base64 -w0 FisioFlow_App_Store.mobileprovision > profile.b64

# API key .p8 → base64
base64 -w0 AuthKey_ABC123DEF4.p8 > apikey.b64
```

## 8. Configurar GitHub Secrets

Em https://github.com/rafaelminatto1/fisioflow-51658291/settings/secrets/actions:

| Secret name | Valor |
|---|---|
| `IOS_DISTRIBUTION_CERT_BASE64` | conteúdo de `distribution.p12.b64` |
| `IOS_CERT_PASSWORD` | senha do `.p12` (passo 3) |
| `IOS_PROVISIONING_PROFILE_BASE64` | conteúdo de `profile.b64` |
| `IOS_PROVISIONING_PROFILE_NAME` | `FisioFlow App Store` |
| `IOS_TEAM_ID` | seu Team ID (10 chars, no canto superior do Apple Developer) |
| `KEYCHAIN_PASSWORD` | qualquer string longa (ex: `openssl rand -hex 16`) |
| `APP_STORE_CONNECT_API_KEY_ID` | Key ID (ex: `ABC123DEF4`) |
| `APP_STORE_CONNECT_API_KEY_ISSUER_ID` | UUID do passo 6 |
| `APP_STORE_CONNECT_API_KEY_BASE64` | conteúdo de `apikey.b64` |

## 9. Trigger primeiro build TestFlight

```bash
# Branch que dispara CI mas não envia
git checkout -b release/mobile-test1
git push -u origin release/mobile-test1

# Ou tag que dispara CI + upload TestFlight
git tag mobile-v0.1.0
git push origin mobile-v0.1.0
```

Acompanhe em https://github.com/rafaelminatto1/fisioflow-51658291/actions/workflows/mobile-ios.yml

Após sucesso (~10-15 min), o IPA aparece em **App Store Connect → My Apps → FisioFlow → TestFlight** (pode levar mais ~10 min para processar).

## 10. Adicionar testers internos

1. App Store Connect → TestFlight → **Internal Testing**
2. Criar grupo "Equipe FisioFlow"
3. Adicionar emails (você + fisios beta)
4. Eles recebem convite por email + instalam pelo app TestFlight no iPhone

## ⚠️ Sem Mac — alternativas pra criar CSR

CSR é o único passo que tradicionalmente requer Mac (Keychain Access). Sem Mac:

1. **nctools.org/csr-generator** — gera CSR + private key online (cuidado: nunca compartilhe o .key)
2. **Linux openssl** local:
   ```bash
   openssl req -new -newkey rsa:2048 -nodes -keyout ios-distribution.key -out ios-distribution.csr \
     -subj "/emailAddress=rafael.minatto@yahoo.com.br/CN=Rafael Minatto/C=BR"
   ```
   Depois faz upload do `.csr` no Apple Developer e guarda o `.key` pra montar o `.p12`.

## Custo total ano 1

- Apple Developer: $99/ano
- App Store Connect: incluído
- Builds GitHub Actions macOS: ~$0–25/mês (free tier público; private = $0.08/min)

## Próximos passos depois do TestFlight

1. Submeter a primeira versão pra **App Store review** (botão na própria App Store Connect)
2. Preencher metadata: descrição, keywords, screenshots (5.5", 6.5", 6.9"), ícone 1024×1024
3. Privacy Policy URL: `https://moocafisio.com.br/privacidade`
4. Aguardar review Apple: 24-72h tipicamente
