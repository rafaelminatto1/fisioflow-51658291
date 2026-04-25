# Google Play Console — Setup

**Quem precisa fazer**: usuário.
**Custo**: $25 USD pagamento único (vitalício).
**Mac não necessário**: tudo no Linux + navegador.

## 1. Criar conta Play Console

1. https://play.google.com/console/signup
2. Pagar $25 (taxa única)
3. Aceitar termos, preencher info de desenvolvedor
4. Aprovação: imediato

## 2. Gerar Android Keystore (assinatura do app)

No terminal Linux:

```bash
# Gera keystore RSA-2048 com validade 25 anos (recomendado Google)
keytool -genkey -v \
  -keystore fisioflow-release.keystore \
  -alias fisioflow \
  -keyalg RSA -keysize 2048 \
  -validity 9125 \
  -storepass "SENHA_FORTE_AQUI" \
  -keypass "SENHA_FORTE_AQUI" \
  -dname "CN=FisioFlow, OU=Mooca Fisio, O=Mooca Fisio, L=Sao Paulo, S=SP, C=BR"

# Converter pra base64 (pra usar em GitHub Secret)
base64 -w0 fisioflow-release.keystore > fisioflow-release.keystore.b64
```

**Guarde a senha em local seguro** — se perder, perde acesso ao app na Play Store.

## 3. Criar app no Play Console

1. https://play.google.com/console
2. **Criar app**
3. Configurar:
   - Nome: `FisioFlow`
   - Idioma padrão: Português (Brasil)
   - App ou jogo: App
   - Gratuito ou pago: Gratuito
   - Aceitar políticas
4. Criar app

## 4. Pré-requisitos antes do primeiro upload

Em **Política da app** → preencher:
- Política de Privacidade (URL: `https://moocafisio.com.br/privacidade`)
- Categoria: Saúde e fitness ou Medicina
- Classificação etária: Questionário rápido (sua app é livre)
- Audiência alvo: Adultos
- Anúncios: Não

## 5. Upload manual da primeira versão (sem CI)

Antes de configurar CI, faça um upload manual pra ativar a app:

```bash
cd /home/rafael/Documents/fisioflow/fisioflow-51658291

# Build local com keystore
NODE_OPTIONS="--max-old-space-size=8192" pnpm --filter fisioflow-web build
./apps/web/node_modules/.bin/cap sync android

cd android
./gradlew bundleRelease \
  -Pandroid.injected.signing.store.file="$PWD/../fisioflow-release.keystore" \
  -Pandroid.injected.signing.store.password="SENHA_FORTE_AQUI" \
  -Pandroid.injected.signing.key.alias=fisioflow \
  -Pandroid.injected.signing.key.password="SENHA_FORTE_AQUI"
```

O AAB fica em `android/app/build/outputs/bundle/release/app-release.aab`.

No Play Console:
1. **Versão** → **Internal testing** → **Criar nova versão**
2. Upload do AAB (arrastar)
3. Notas da versão
4. **Revisar e disponibilizar**

## 6. Criar Service Account (para CI uploads automáticos)

1. https://console.cloud.google.com/iam-admin/serviceaccounts
2. Selecionar projeto vinculado ao Play Console (criar se não tiver)
3. **+ Criar conta de serviço**
4. Nome: `playstore-ci`
5. Conceder role: `Service Account User`
6. Em **Keys** → Adicionar chave JSON → Download
7. Em https://play.google.com/console:
   - Configurações → Acesso à API
   - Vincular projeto Google Cloud
   - Convidar email da service account
   - Permissões: **Release apps to testing tracks** + **Manage releases**

## 7. Configurar GitHub Secrets

| Secret name | Valor |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | conteúdo de `fisioflow-release.keystore.b64` |
| `ANDROID_KEYSTORE_PASSWORD` | a senha do keystore (passo 2) |
| `ANDROID_KEY_ALIAS` | `fisioflow` |
| `ANDROID_KEY_PASSWORD` | mesma senha (passo 2) |
| `PLAY_SERVICE_ACCOUNT_JSON` | conteúdo do `.json` da service account (passo 6) |

## 8. Trigger primeiro build via CI

```bash
git checkout -b release/mobile-android-test
git push -u origin release/mobile-android-test
# Workflow Mobile Android dispara automaticamente
```

Ou pra upload Play Store automático:
```bash
git tag mobile-v0.1.0
git push origin mobile-v0.1.0
```

Acompanhe em https://github.com/rafaelminatto1/fisioflow-51658291/actions/workflows/mobile-android.yml

## 9. Tracks Play Console

Padrão usado neste workflow: `internal` (até 100 testers, deploy imediato).

Outras opções:
- `alpha` (closed testing): emails específicos
- `beta` (open testing): qualquer um com link
- `production`: público geral

Mudar com workflow_dispatch no GitHub Actions ou com o param `--track=beta`.

## ⚠️ Avisos comuns Play Console

- **Versão de SDK alvo**: Play exige SDK ≥34 (Android 14) desde Aug 2024. Capacitor 8 já cobre.
- **Política de dados**: declarar exatamente quais dados coletam (LGPD + Play Privacy)
- **App Bundle obrigatório**: AAB, não APK (já está no workflow)
- **Anúncios**: declarar "Não" se não tiver
- **Gerenciamento de assinaturas**: marcar "Não" se for grátis

## Diagnóstico se upload falhar

```bash
# Validar AAB localmente
bundletool validate --bundle=app-release.aab

# Inspecionar assinatura
jarsigner -verify -verbose -certs app-release.aab
```

## Custos contínuos

- Play Console: $25 único
- GitHub Actions ubuntu-latest: free tier público; private = ~$0.008/min

Total: ~$25 vitalício. Build no CI ubuntu-latest leva 4-6 min ($0.05/build).
