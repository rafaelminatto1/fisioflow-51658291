# Configuração de GitHub Secrets - Para o Dev

Para que o CI/CD funcione corretamente, você precisa configurar os seguintes secrets no seu repositório do GitHub:

## Secrets Obrigatórios (para CI/CD funcionar)

### 1. EXPO_TOKEN

Este é OBRIGATÓRIO para que o CI/CD e builds EAS funcionem.

**Como obter:**
1. Vá para https://expo.dev/settings/access-tokens
2. Clique em "Create new token"
3. Dê um nome (ex: "GitHub Actions CI/CD")
4. Selecione os escopos:
   - `project:read`
   - `project:write`
   - `build:read`
   - `build:write`
5. Copie o token gerado

**Como adicionar ao GitHub:**
1. Vá ao seu repositório no GitHub
2. Clique em Settings → Secrets and variables → Actions
3. Clique em "New repository secret"
4. Nome: `EXPO_TOKEN`
5. Valor: cole o token do Expo
6. Clique em "Add secret"

---

## Secrets Opcionais (para submissão à App Store/Google Play)

Quando for submeter o app à loja, configure estes secrets:

### 2. EXPO_APPLE_ID
- Nome: `EXPO_APPLE_ID`
- Valor: `rafael.minatto@yahoo.com.br`

### 3. EXPO_APPLE_APP_SPECIFIC_PASSWORD
- Nome: `EXPO_APPLE_APP_SPECIFIC_PASSWORD`
- Valor: senha específica do app (gere em https://appleid.apple.com/)

### 4. EXPO_ANDROID_KEYSTORE_PASSWORD
- Nome: `EXPO_ANDROID_KEYSTORE_PASSWORD`
- Valor: senha do keystore Android

---

## Secrets Opcionais (para Sentry - recomendado)

### 5. SENTRY_AUTH_TOKEN
Para monitoramento de erros com Sentry funcionar corretamente:

**Como obter:**
1. Acesse https://sentry.io/settings/account/api/auth-tokens/
2. Clique em "Create New Token"
3. Dê um nome (ex: "GitHub Actions EAS")
4. Selecione os escopos necessários:
   - `project:read` - Ler informações do projeto
   - `project:releases` - Gerenciar releases e upload de source maps
   - `org:read` - Ler informações da organização
5. Copie o token gerado

**Como adicionar ao GitHub:**
1. Vá ao seu repositório no GitHub
2. Clique em Settings → Secrets and variables → Actions
3. Clique em "New repository secret"
4. Nome: `SENTRY_AUTH_TOKEN`
5. Valor: cole o token do Sentry
6. Clique em "Add secret"

---

## Próximos Passos Após Configurar Secrets

1. Os workflows CI/CD vão funcionar automaticamente no push/PR
2. Para builds manuais, use Actions → EAS Build → Run workflow
3. Para submissão à App Store, use Actions → EAS Submit → Run workflow

---
