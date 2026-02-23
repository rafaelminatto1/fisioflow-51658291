# Configuração de GitHub Secrets para CI/CD

Este guia explica como configurar os secrets necessários para os workflows do GitHub Actions.

## Secrets Necessários

### Para CI/CD (obrigatório)

#### 1. EXPO_TOKEN (obrigatório)

Token de acesso pessoal do Expo para executar builds EAS.

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

### Para Submissão ao App Store (opcional, apenas quando for submeter)

#### 2. EXPO_APPLE_ID

Seu Apple ID para submissão de apps à App Store.

**Como adicionar:**
- Nome: `EXPO_APPLE_ID`
- Valor: seu email da Apple (ex: `seu@email.com`)

#### 3. EXPO_APPLE_APP_SPECIFIC_PASSWORD

Senha específica de aplicativo para autenticação com a Apple.

**Como obter:**
1. Acesse https://appleid.apple.com/
2. Faça login com sua Apple ID
3. Vá em "Security" → "App-Specific Passwords"
4. Clique em "Generate Password"
5. Dê um rótulo (ex: "Expo EAS")
6. Copie a senha gerada (só aparece uma vez!)

**Como adicionar ao GitHub:**
- Nome: `EXPO_APPLE_APP_SPECIFIC_PASSWORD`
- Valor: cole a senha gerada

---

### Para Submissão ao Google Play (opcional, apenas quando for submeter)

#### 4. EXPO_ANDROID_KEYSTORE_PASSWORD

Senha do keystore Android para assinar o APK/AAB.

**Nota:** Você precisa configurar o keystore primeiro no painel EAS.

**Como adicionar ao GitHub:**
- Nome: `EXPO_ANDROID_KEYSTORE_PASSWORD`
- Valor: a senha do seu keystore

---

### Para Sentry (monitoramento de erros)

#### 5. SENTRY_AUTH_TOKEN (opcional, mas recomendado)

Token de autenticação do Sentry para upload de source maps nos builds.

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
- Nome: `SENTRY_AUTH_TOKEN`
- Valor: cole o token do Sentry

**Nota:** Configure também o `SENTRY_ORG` e `SENTRY_PROJECT` se necessário:
- Nome: `SENTRY_ORG` → Valor: `activity-fisioterapia-rg`
- Nome: `SENTRY_PROJECT` → Valor: `fisioflow-professional-app-tm`

---

## Verificação de Configuração

Após adicionar os secrets, você pode verificar se funcionam:

### Teste Local

1. Faça um push para o branch `develop` ou `main`
2. Vá em Actions no seu repositório
3. Veja se o workflow "CI" foi executado com sucesso

### Teste de Build

1. Vá em Actions → EAS Build
2. Clique em "Run workflow"
3. Selecione o profile (preview, production)
4. Selecione o platform (ios, android)
5. Execute o workflow

---

## Troubleshooting

### Workflow falha com "EXPO_TOKEN not found"

- Verifique se o secret foi criado corretamente
- O nome deve ser exatamente `EXPO_TOKEN` (maiúsculas)
- Verifique se você adicionou no repositório correto

### Build falha com "authentication failed"

- Verifique se o token do Expo ainda é válido
- Tokens expiram após um ano
- Gere um novo token se necessário

### Submissão falha com "Apple authentication failed"

- Verifique a senha específica do app
- Gere uma nova senha se tiver problemas
- Verifique se o Apple ID está correto

### Sentry não está capturando erros

- Verifique se o `SENTRY_AUTH_TOKEN` tem os escopos corretos (project:read, project:releases, org:read)
- Verifique se o projeto Sentry foi criado corretamente com nome e organização corretos
- Em desenvolvimento, verifique se `EXPO_PUBLIC_ENVIRONMENT=development` está configurado
- Verifique se o DSN está correto no `.env` e `app.json`
- Adicione um botão de teste para disparar um erro e verificar se está chegando ao Sentry

---

## Checklist de Configuração

- [ ] `EXPO_TOKEN` configurado (obrigatório)
- [ ] `EXPO_APPLE_ID` configurado (opcional)
- [ ] `EXPO_APPLE_APP_SPECIFIC_PASSWORD` configurado (opcional)
- [ ] `EXPO_ANDROID_KEYSTORE_PASSWORD` configurado (opcional)
- [ ] `SENTRY_AUTH_TOKEN` configurado (recomendado)
- [ ] Workflow CI testado com sucesso
- [ ] Workflow EAS Build testado com sucesso

---

## Recursos Adicionais

- [Documentação do EAS](https://docs.expo.dev/build/introduction/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Configuração de Apple Specific Passwords](https://support.apple.com/en-us/HT204397)
- [Documentação do Sentry para React Native](https://docs.sentry.io/platforms/react-native/)
- [Guia do Expo com Sentry](https://docs.expo.dev/guides/using-sentry/)

## Arquivos de Configuração Local

### .sentryclirc (opcional)

Para desenvolvimento local, você pode criar um arquivo `.sentryclirc` na raiz do projeto:

1. Copie o arquivo de exemplo:
   ```bash
   cp .sentryclirc.example .sentryclirc
   ```

2. Edite o arquivo e adicione seu token de autenticação:
   ```ini
   [auth]
   token=seu_sentry_auth_token_aqui
   ```

3. O token deve ter os seguintes escopos:
   - `project:read`
   - `project:releases`
   - `org:read`

**Nota:** O arquivo `.sentryclirc` já está no `.gitignore` para que seu token não seja commitado.
