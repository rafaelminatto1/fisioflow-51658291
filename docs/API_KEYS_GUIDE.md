# Guia de Obtenção de API Keys

Guia passo a passo para obter e configurar chaves API de serviços terceiros.

---

## 1. Stripe - API Keys

### Localização

1. Faça login em [Stripe Dashboard](https://dashboard.stripe.com/)
2. No menu lateral, clique em **Developers** → **API keys**

### Obter Chaves

Você verá duas seções:

#### **Public Keys** (Frontend)
- **Publishable key** → Começa com `pk_`
- Use esta chave no frontend do FisioFlow
- Exemplo: `pk_test_51Mz...`

#### **Secret Keys** (Backend)
- **Secret key** → Começa com `sk_`
- NUNCA use esta chave no frontend
- Use apenas no backend/Cloud Functions
- Clique em "Reveal" para ver
- Exemplo: `sk_test_51Mz...`

### Criar Prices para Assinaturas

1. Vá em **Products** → **Add product**
2. Crie o produto (ex: "Plano Mensal")
3. Adicione preços (pricing)
4. Copie o **Price ID** (ex: `price_1JZ...`)

### Webhook Signing Secret

1. Vá em **Developers** → **Webhooks**
2. Clique no webhook configurado
3. Role até "Signing secret"
4. Clique em "Reveal"
5. Copie o segredo (começa com `whsec_`)

### Variáveis de Ambiente

```bash
# .env.production
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_STRIPE_SECRET_KEY=sk_test_...
VITE_STRIPE_WEBHOOK_SECRET=whsec_...
VITE_STRIPE_MONTHLY_PRICE_ID=price_1JZ...
VITE_STRIPE_QUARTERLY_PRICE_ID=price_2XY...
```

---

## 2. Zoom - API Key e Secret

### Localização

1. Acesse [Zoom App Marketplace](https://marketplace.zoom.us/)
2. Faça login
3. Clique em **Build** → **Create App** (ou ver apps existentes)

### Criar JWT App (Recomendado)

1. **App Type**: Selecione **"JWT"**
2. **App Name**: `FisioFlow Production`
3. **User Type**: **"Account Level App"** (pode criar reuniões para qualquer usuário)

### Configurar Scopes

Adicione estes scopes no app:

```
meeting:write      # Criar/editar reuniões
meeting:read       # Ver reuniões
recording:write   # Gerenciar gravações
recording:read     # Ver gravações
user:read          # Ver info de usuários
```

### Obter Credenciais

1. Vá em **App Credentials** no app Zoom
2. Você receberá:
   - **API Key** (ex: `39jZ...`)
   - **API Secret** (ex: `q7xK...`)
3. Copie ambos

### Webhook Verification Token

1. No app Zoom, vá em **Feature** → **Event Subscription**
2. Clique em **"Add new feature"** → **Chatbot**
3. Configure:
   - **Event Subscription URL**: `https://app.fisioflow.com/api/webhooks/zoom`
   - Selecione eventos: `meeting.started`, `meeting.ended`, `recording.completed`
4. Copie o **Verification Token**

### Variáveis de Ambiente

```bash
# .env.production
VITE_ZOOM_API_KEY=39jZ...
VITE_ZOOM_API_SECRET=q7xK...
VITE_ZOOM_WEBHOOK_SECRET=seu-token
```

---

## 3. Google Calendar - Client ID e Secret

### Localização

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Selecione seu projeto
3. Menu: **APIs e Serviços** → **Credenciais**

### Criar OAuth 2.0 Client ID

1. Clique em **"Criar credenciais"** → **"ID do cliente OAuth"**
2. **Tipo de aplicativo**: Aplicativo Web
3. **Nome**: FisioFlow Web Client
4. **URIs redirecionados autorizados**:
   ```
   http://localhost:8086/integrations/google/callback  # Desenvolvimento
   https://app.fisioflow.com/integrations/google/callback  # Produção
   ```
5. Clique em **"CRIAR"**

### Obter Client ID e Secret

1. Na tela de credenciais OAuth 2.0:
   - **Client ID**: Visível diretamente (ex: `123456789-abc...apps.googleusercontent.com`)
   - **Client Secret**: Clique no ícone de olho para ver

### Scopes do Calendar

Na configuração do OAuth, inclua estes scopes:

- `https://www.googleapis.com/auth/calendar.events` - Criar/editar eventos
- `https://www.googleapis.com/auth/calendar.readonly` - Ler eventos

### Variáveis de Ambiente

```bash
# .env.production
VITE_GOOGLE_CLIENT_ID=123456789-abc...apps.googleusercontent.com
VITE_GOOGLE_CLIENT_SECRET=GOCSPX-...
VITE_GOOGLE_REDIRECT_URI=https://app.fisioflow.com/integrations/google/callback
```

---

## 4. Firebase - Configuração

### Obter Configurações do Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto
3. Clique no ícone de engrenagem **⚙️** → **Configurações do projeto**

### Service Account (para Cloud Functions)

1. Vá em **Contas de serviço** → **Gerar nova chave privada**
2. Selecione **App Engine default service account**
3. Clique em **"Gerar"**
4. Baixe o arquivo JSON

### API Key do Firebase

1. Vá em **Configurações gerais** → **Chaves de API da Web**
2. Crie uma chave ou use uma existente
3. Copie a **API Key** (ex: `AIzaSy...`)

### Variáveis de Ambiente

```bash
# .env.production
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto-id
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

---

## 5. Twilio (para WhatsApp/SMS) - Opcional

### Criar Conta Twilio

1. Acesse [Twilio Console](https://www.twilio.com/console)
2. Faça signup/login

### Obter Credenciais

1. No dashboard, você verá:
   - **Account SID** (ex: `AC12...`)
   - **Auth Token** (clique em "View" para ver)

### Configurar WhatsApp Sender

1. Vá em **Messaging** → **Try it out** → **Send a WhatsApp message**
2. Siga o passo a passo para configurar um número WhatsApp
3. Copie o **Sender ID** (número com `whatsapp:` prefixo)

### Variáveis de Ambiente

```bash
# .env.production
VITE_TWILIO_ACCOUNT_SID=AC12...
VITE_TWILIO_AUTH_TOKEN=seu-auth-token
VITE_TWILIO_WHATSAPP_FROM=whatsapp:+5511999999999
```

---

## 6. SendGrid (para Emails Transacionais) - Opcional

### Criar Conta SendGrid

1. Acesse [SendGrid](https://sendgrid.com/)
2. Crie uma conta

### Obter API Key

1. Vá em **Settings** → **API Keys**
2. Clique em **"Create API Key"**
3. Dê um nome (ex: "FisioFlow Production")
4. Selecione permissões: "Mail Send", "Template Read/Edit"
5. Copie a API Key gerada

### Criar Templates

1. Vá em **Email API** → **Dynamic Templates**
2. Crie templates para:
   - Boas-vindas ao paciente
   - Lembrete de consulta
   - Notificações de pagamento
3. Copie os **Template IDs**

### Variáveis de Ambiente

```bash
# .env.production
VITE_SENDGRID_API_KEY=SG.xxxxx.YYYYY
VITE_SENDGRID_TEMPLATE_WELCOME=d-xxxxx
VITE_SENDGRID_TEMPLATE_REMINDER=d-yyyyy
```

---

## 7. Como Armazenar Secrets Seguramente

### Nunca commite secrets no repositório

Sempre use variáveis de ambiente.

### Estrutura de arquivos

```
.env                    # Gitignore (chaves locais)
.env.example          # Committado (modelo)
.env.production       # Gitignore (produção)
firebase-service-account.json  # Gitignore (Firebase)
```

### .env.example (modelo)

```bash
# Firebase
VITE_FIREBASE_API_KEY=your-firebase-api-key-here
VITE_FIREBASE_PROJECT_ID=your-project-id

# Google Calendar
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_GOOGLE_CLIENT_SECRET=your-google-client-secret

# Zoom
VITE_ZOOM_API_KEY=your-zoom-api-key
VITE_ZOOM_API_SECRET=your-zoom-api-secret

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
VITE_STRIPE_SECRET_KEY=your-stripe-secret-key
VITE_STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret

# Twilio (opcional)
VITE_TWILIO_ACCOUNT_SID=your-twilio-account-sid
VITE_TWILIO_AUTH_TOKEN=your-twilio-auth-token
```

---

## 8. Validação de Chaves

### Validar Stripe Key

Uma chave Stripe válida começa com:
- `pk_test_` ou `pk_live_` (publicável)
- `sk_test_` ou `sk_live_` (secreta)

### Validar Zoom Key

A chave Zoom tem formato: `39jZ...` (aprox. 20 caracteres alfanuméricos)

### Validar Google Client ID

Formato: `123456789-abcdef...apps.googleusercontent.com`

---

## 9. Testar Chaves Localmente

### Script de Teste

```bash
# Testar Stripe
curl https://api.stripe.com/v1/charges \
  -u sk_test_...: \
  -d amount=1000 \
  -d currency=brl \
  -d source=tok_visa
```

### Testar Zoom

```bash
curl https://api.zoom.us/v2/users \
  -H "Authorization: Bearer $(echo -n your_api_key:your_api_secret | base64)"
```

---

## 10. Rotacionar Chaves (Security Best Practice)

### Quando Rotacionar?

- A cada 90 dias (Stripe recomenda)
- Se houver suspeita de vazamento
- Quando um funcionário com acesso sair

### Como Rotacionar?

1. Gere novas chaves no console do serviço
2. Atualize variáveis de ambiente
3. Faça deploy da aplicação
4. Remova/chave antigas

---

## 11. Checklists

### Pré-Produção

- [ ] Obter chaves de todos os serviços
- [ ] Criar arquivo `.env.production`
- [ ] Configurar apps OAuth
- [ ] Configurar webhooks
- [ ] Testar cada integração localmente

### Pós-Deploy

- [ ] Verificar se variáveis de ambiente estão carregadas
- [ ] Testar integração com chave de produção
- [ ] Monitorar logs de erros
- [ ] Configurar alertas para falhas de API
