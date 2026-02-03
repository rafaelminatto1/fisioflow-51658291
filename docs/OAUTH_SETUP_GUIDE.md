# Guia de Configuração - Apps OAuth

Este guia explica como configurar os apps OAuth necessários para as integrações do FisioFlow.

---

## 1. Google Calendar API (Google Cloud Console)

### Passo 1: Criar Projeto no Google Cloud

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Clique em **"Selecionar um projeto"** → **"NOVO PROJETO"**
3. Nome do projeto: `FisioFlow-Production`
4. Clique em **"CRIAR"**

### Passo 2: Habilitar Google Calendar API

1. No menu, vá para **APIs e Serviços** → **Biblioteca de APIs**
2. Pesquise por **"Google Calendar API"**
3. Clique em **"ATIVAR"**

### Passo 3: Configurar tela de consentimento OAuth

1. Vá para **APIs e Serviços** → **Credenciais**
2. Clique em **"Configurar tela de consentimento OAuth"**
3. Preencha:
   - **Nome do aplicativo**: `FisioFlow`
   - **Email de suporte**: `suporte@fisioflow.com`
   - **Escopos** do OAuth:
     - `.../auth/calendar.events`
     - `.../auth/calendar.readonly`
   - **Domínios autorizados**: Seu domínio (ex: `fisioflow.com`)
   - **URL de autorização**: `http://localhost:5173/integrations/google/callback` (dev)
   - **Production**: `https://app.fisioflow.com/integrations/google/callback`

4. Clique em **"SALVAR"**

### Passo 4: Criar credenciais OAuth 2.0

1. Em **Credenciais**, clique em **"Criar credenciais"** → **"ID do cliente OAuth"**
2. Tipo de aplicativo: **"Aplicativo Web"**
3. Nome: `FisioFlow Web Client`
4. URIs redirecionados autorizados:
   - `http://localhost:5173/integrations/google/callback` (desenvolvimento)
   - `https://app.fisioflow.com/integrations/google/callback` (produção)
5. Clique em **"CRIAR"**

### Passo 5: Obter chaves

1. Copie o **Client ID** gerado
2. Clique no ícone de olho ao lado do Client Secret para ver o **Client Secret**
3. Salve ambos no FisioFlow em **Integrações → Google Calendar**

### Variáveis de Ambiente

```bash
VITE_GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_SECRET=seu-client-secret
VITE_GOOGLE_REDIRECT_URI=http://localhost:5173/integrations/google/callback
```

---

## 2. Zoom (Zoom Marketplace)

### Passo 1: Criar App no Zoom Marketplace

1. Acesse [Zoom Marketplace](https://marketplace.zoom.us/)
2. Faça login na sua conta Zoom
3. Clique em **"Build"** no menu superior
4. Clique em **"Create App"**

### Passo 2: Configurar o App

1. **App Type**: **"JWT"** ou **"Server-to-Server OAuth"**
2. **App Name**: `FisioFlow Integration`
3. **User Type**: **"Account Level App"** (recomendado) ou **"User Managed App"**

### Passo 3: Configurar Scopes

Adicione os seguintes scopes:

```
meeting:write
meeting:read
recording:write
recording:read
user:read
user:write
```

### Passo 4: Obter credenciais

#### Para JWT (mais simples para produção):

1. Vá para **App Credentials**
2. Zoom vai gerar **API Key** e **API Secret**
3. Copie ambos e salve no FisioFlow

#### Para Server-to-Server OAuth:

1. Crie uma conta de servidor
2. Copie o **Account ID**, **Client ID** e **Client Secret**
3. Configure redirect URI no app

### Webhook para Zoom

1. No app Zoom, vá em **Event Subscriptions**
2. Adicione eventos:
   - `meeting.started`
   - `meeting.ended`
   - `recording.completed`
3. **Endpoint URL**: `https://app.fisioflow.com/api/webhooks/zoom`
4. Copie o **Verification Token**

### Variáveis de Ambiente

```bash
VITE_ZOOM_API_KEY=sua-api-key
VITE_ZOOM_API_SECRET=sua-api-secret
VITE_ZOOM_WEBHOOK_SECRET=seu-verification-token
```

---

## 3. Stripe (Stripe Dashboard)

### Passo 1: Criar conta Stripe

1. Acesse [Stripe](https://dashboard.stripe.com/register)
2. Crie uma conta ou faça login
3. Complete a verificação do negócio

### Passo 2: Obter chaves API

1. No dashboard, vá para **Developers** → **API keys**
2. Você verá duas chaves:
   - **Publishable key** (pk_test_...) - Usada no frontend
   - **Secret key** (sk_test_...) - Usada no backend
3. Clique em **"Reveal test key"** para ver a secret key

### Passo 3: Criar Webhook Endpoint

1. Vá para **Developers** → **Webhooks**
2. Clique em **"Add endpoint"**
3. **Endpoint URL**: `https://app.fisioflow.com/api/webhooks/stripe`
4. Selecione os eventos a ouvir:
   - `checkout.session.completed`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

5. Clique em **"Add endpoint"**

### Passo 4: Copiar Webhook Signing Secret

1. No webhook criado, clique em **"Reveal"** ao lado de "Signing secret"
2. Copie este segredo para configurar no FisioFlow

### Passo 5: Criar Products e Prices (para assinaturas)

1. Vá para **Products** → **Add product**
2. Para cada plano de tratamento, crie:
   - **Name**: "Plano Mensal de Fisioterapia"
   - **Description**: "Sessões ilimitadas por mês"
3. Adicione **Pricing**:
   - **Price**: 297.00 (em reais)
   - **Currency**: BRL
   - **Billing**: Monthly
   - Copie o **Price ID** (price_...) gerado

### Variáveis de Ambiente

```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_STRIPE_SECRET_KEY=sk_test_...
VITE_STRIPE_WEBHOOK_SECRET=whsec_...
VITE_STRIPE_MONTHLY_PRICE_ID=price_...
```

---

## 4. Configurar no FisioFlow

### Via Interface (Integrações → Configurar)

1. Acesse `/integrations` no FisioFlow
2. Clique em **"Conectar"** na integração desejada
3. Cole as chaves obtidas
4. Clique em **"Salvar"**

### Via Variáveis de Ambiente (para produção)

Crie o arquivo `.env.production`:

```bash
# Firebase
VITE_FIREBASE_API_KEY=seu-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto-id
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com

# Google Calendar
VITE_GOOGLE_CLIENT_ID=seu-client-id
VITE_GOOGLE_CLIENT_SECRET=seu-client-secret

# Zoom
VITE_ZOOM_API_KEY=sua-zoom-api-key
VITE_ZOOM_API_SECRET=sua-zoom-api-secret

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

---

## 5. Testar Integrações Localmente

### Google Calendar (Local)

Para testar OAuth localmente:

1. Use o **Client ID** de teste do Google
2. Configure o redirect URI como: `http://localhost:8086/integrations/google/callback`
3. No Google Console, adicione este URI aos URIs autorizados

### Stripe (Test Mode)

O Stripe tem duas chaves:
- `pk_test_...` / `sk_test_...` → Teste (sandbox)
- `pk_live_...` / `sk_live_...` → Produção

Use as chaves de teste durante desenvolvimento.

---

## 6. URLs de Redirect para Produção

| Integração | URL de Redirect |
|------------|-----------------|
| Google Calendar | `https://app.fisioflow.com/integrations/google/callback` |
| Zoom (opcional) | `https://app.fisioflow.com/integrations/zoom/callback` |

---

## 7. Security Best Practices

1. **Nunca commite secrets** no repositório
2. Use **variáveis de ambiente** para todas as chaves
3. Rotacione chaves periodicamente
4. Use **HTTPs** em produção para callbacks
5. Valide webhooks com HMAC signatures
6. Limite os scopes OAuth ao mínimo necessário

---

## 8. Troubleshooting

### Google Calendar - "redirect_uri_mismatch"

Erro: `redirect_uri_mismatch`

**Solução**: Adicione exatamente o URL de redirect no Google Console, incluindo a barra final.

### Stripe - "Invalid API Key"

Erro: `Invalid API Key`

**Solução**: Verifique se você está usando a chave correta (test vs live).

### Zoom - "Invalid access token"

Erro: `Invalid access token`

**Solução**: Verifique se o API Secret está correto e se JWT está sendo gerado com as credenciais certas.

---

## 9. Checklists de Deploy

### Pré-Produção

- [ ] Todas as chaves API obtidas
- [ ] Apps OAuth criados
- [ ] Webhooks configurados
- [ ] Redirect URIs autorizados
- [ ] Variáveis de ambiente configuradas
- [ ] Firestore indexes criados
- [ ] Security Rules atualizados

### Pós-Deploy

- [ ] Testar cada integração
- [ ] Verificar webhooks recebendo eventos
- [ ] Monitorar logs de erros
- [ ] Configurar alertas de monitoramento

---

## Suporte

Para dúvidas sobre configuração de integrações:
- 📧 Email: `suporte@fisioflow.com`
- 📚 Docs: `https://docs.fisioflow.com`
- 💬 Discord: `https://discord.gg/fisioflow`
