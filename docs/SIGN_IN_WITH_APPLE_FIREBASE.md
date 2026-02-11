# Configurar Sign in with Apple no Firebase

Este guia descreve como habilitar o provedor **Sign in with Apple** no projeto Firebase (fisioflow-migration), seja pelo **script automatizado** ou manualmente no Console.

## Opção 1: Script (Identity Platform API)

O script `scripts/configure-firebase-apple-signin.mjs` configura o provedor Apple via REST API, sem precisar clicar no Console.

### Pré-requisitos

1. **Apple Developer** (developer.apple.com):
   - **Services ID**: em Identifiers > + > Services IDs. Em "Sign in with Apple", marque e defina **Return URL**:  
     `https://moocafisio.com.br/__/auth/handler`
   - **Key**: em Keys > + > "Sign in with Apple" ativado. Baixe o `.p8` e anote o **Key ID**.
   - **Team ID**: em Membership > Membership details.

2. **Firebase**: conta de serviço com permissão para Auth (ex.: `functions/service-account-key.json` ou `FIREBASE_SERVICE_ACCOUNT_KEY`).

### Variáveis de ambiente

Defina no `.env` ou no shell antes de rodar o script:

```bash
# Firebase (já usado em outros scripts)
export FIREBASE_SERVICE_ACCOUNT_KEY_PATH=./functions/service-account-key.json

# Apple (obtidos no Apple Developer)
export APPLE_SERVICE_ID=com.suaempresa.fisioflow.signin   # Services ID
export APPLE_TEAM_ID=XXXXXXXXXX
export APPLE_KEY_ID=XXXXXXXXXX
export APPLE_PRIVATE_KEY_PATH=./path/to/AuthKey_XXXXX.p8
# OU o conteúdo da chave:
# export APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
```

### Executar

```bash
node scripts/configure-firebase-apple-signin.mjs
```

Se o provedor Apple já existir, o script atualiza a configuração; caso contrário, cria. Em sucesso, o Sign in with Apple fica habilitado no Firebase Authentication.

---

## Opção 2: Console do Firebase (manual)

1. Acesse [Firebase Console](https://console.firebase.google.com/project/fisioflow-migration/authentication/providers).
2. Clique no provedor **Apple**.
3. Ative e preencha:
   - **Services ID** (Identifier do Services ID no Apple Developer).
   - **Apple Team ID**, **Key ID** e faça upload do arquivo **.p8** (chave privada).
4. Salve.

No **Apple Developer**, o Return URL do Services ID deve ser:

`https://moocafisio.com.br/__/auth/handler`

---

## Referências

- [Firebase: Authenticate with Apple (web)](https://firebase.google.com/docs/auth/web/apple)
- [Identity Platform API: defaultSupportedIdpConfigs](https://cloud.google.com/identity-platform/docs/reference/rest/v2/projects.defaultSupportedIdpConfigs)
- [Apple: Configure Sign in with Apple for the web](https://developer.apple.com/help/account/configure-app-capabilities/configure-sign-in-with-apple-for-the-web/)
