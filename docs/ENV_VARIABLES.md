# Variáveis de Ambiente - FisioFlow v3.0

Este documento lista todas as variáveis de ambiente necessárias para o funcionamento completo do sistema.

---

## 🔐 Variáveis Obrigatórias

### Supabase (Já Configuradas)
- `SUPABASE_URL` - URL do projeto Supabase
- `SUPABASE_ANON_KEY` - Chave pública do Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Chave de service role (para Edge Functions)

---

## 📊 Monitoramento e Observabilidade

### Sentry (Opcional mas Recomendado)
- **Frontend:**
  - `VITE_SENTRY_DSN` - DSN do projeto Sentry para frontend
  - Exemplo: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`

- **Backend (Edge Functions):**
  - `SENTRY_DSN` - DSN do projeto Sentry para backend
  - `ENVIRONMENT` - Ambiente (development, staging, production)

**Como obter:**
1. Acesse https://sentry.io
2. Crie um projeto para React (frontend) e outro para Deno (backend)
3. Copie o DSN de cada projeto

---

## 🚀 Rate Limiting (Upstash Redis)

### Upstash Redis (Opcional - Melhora Performance)
- `UPSTASH_REDIS_REST_URL` - URL REST do Redis
- `UPSTASH_REDIS_REST_TOKEN` - Token de autenticação

**Como obter:**
1. Acesse https://upstash.com
2. Crie uma conta e um banco Redis
3. Na página do banco, copie:
   - REST URL
   - REST Token

**Nota:** Se não configurado, o sistema usa fallback via banco de dados.

---

## 🤖 Inteligência Artificial

### Google AI / Gemini (Para funcionalidades de IA)
- `GOOGLE_AI_API_KEY` - Chave da API do Google AI
- OU `LOVABLE_API_KEY` - Chave da API Lovable (fallback)

**Como obter:**
1. Acesse https://aistudio.google.com/apikey
2. Crie uma nova API key
3. Copie a chave gerada

### OpenAI (Para transcrição com Whisper)
- `OPENAI_API_KEY` - Chave da API OpenAI

**Como obter:**
1. Acesse https://platform.openai.com/api-keys
2. Crie uma nova secret key
3. Copie a chave gerada

---

## 📅 Google Calendar Integration

### Google OAuth2
- `GOOGLE_CLIENT_ID` - Client ID do OAuth2
- `GOOGLE_CLIENT_SECRET` - Client Secret do OAuth2
- `GOOGLE_WEBHOOK_SECRET` - Secret para validar webhooks

**Como configurar:**
1. Acesse https://console.cloud.google.com
2. Crie um projeto ou selecione existente
3. Vá em "APIs & Services" > "Credentials"
4. Crie "OAuth 2.0 Client ID"
5. Configure redirect URIs:
   - `http://localhost:5173/configuracoes/calendario` (dev)
   - `https://fisioflow.vercel.app/configuracoes/calendario` (prod)
6. Copie Client ID e Client Secret

---

## 💾 Backup Automatizado

### Database Backup
- `DATABASE_URL` - Connection string do PostgreSQL
  - Formato: `postgresql://user:password@host:port/database`
  - Pode ser obtido no Supabase Dashboard > Settings > Database > Connection string
- `CRON_SECRET` - Secret para autenticar chamadas de cron
  - Gere um secret aleatório seguro (ex: `openssl rand -hex 32`)

---

## 📱 WhatsApp / Evolution API (Opcional)

### Evolution API
- `EVOLUTION_API_URL` - URL da instância Evolution API
- `EVOLUTION_API_KEY` - Chave da API
- `EVOLUTION_INSTANCE` - Nome da instância

---

## 💳 Stripe (Já Configurado)

### Stripe Payments
- `STRIPE_SECRET_KEY` - Secret key do Stripe
- `STRIPE_WEBHOOK_SECRET` - Secret do webhook

---

## 🔑 Clerk (Opcional - Não usado atualmente)

### Clerk Authentication
- `CLERK_SECRET_KEY` - Secret key do Clerk
- `CLERK_WEBHOOK_SECRET` - Secret do webhook

**Nota:** O sistema atualmente usa Supabase Auth. Clerk está preparado para uso futuro.

---

## 📝 Como Configurar no Supabase

### Via Dashboard:
1. Acesse https://supabase.com/dashboard/project/ycvbtjfrchcyvmkvuocu
2. Vá em **Settings** > **Edge Functions** > **Secrets**
3. Adicione cada variável clicando em **Add new secret**
4. Configure:
   - **Name:** Nome da variável (ex: `SENTRY_DSN`)
   - **Value:** Valor da variável
   - **Scope:** Deixe em branco para todas as funções

### Via CLI:
```bash
# Exemplo
supabase secrets set SENTRY_DSN=your-dsn-here
supabase secrets set UPSTASH_REDIS_REST_URL=your-url-here
supabase secrets set UPSTASH_REDIS_REST_TOKEN=your-token-here
```

---

## 🌐 Variáveis de Frontend (Vercel)

### Configurar no Vercel Dashboard:
1. Acesse https://vercel.com/dashboard
2. Selecione o projeto
3. Vá em **Settings** > **Environment Variables**
4. Adicione:
   - `VITE_SENTRY_DSN` - DSN do Sentry para frontend
   - `VITE_APP_VERSION` - Versão da aplicação (opcional)

---

## ✅ Checklist de Configuração

- [ ] Sentry DSN (frontend e backend)
- [ ] Upstash Redis (URL e Token)
- [ ] Google AI API Key
- [ ] OpenAI API Key (para Whisper)
- [ ] Google OAuth2 (Client ID e Secret)
- [ ] DATABASE_URL (para backups)
- [ ] CRON_SECRET (para backups)
- [ ] Evolution API (se usar WhatsApp)

---

## 🔒 Segurança

**IMPORTANTE:**
- Nunca commite arquivos `.env` no Git
- Use secrets do Supabase/Vercel para produção
- Rotacione secrets regularmente
- Use diferentes secrets para dev/staging/prod

---

## 📚 Referências

- [Supabase Environment Variables](https://supabase.com/docs/guides/functions/secrets)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Sentry Setup](https://docs.sentry.io/platforms/javascript/)
- [Upstash Redis](https://docs.upstash.com/redis)
- [Google AI Studio](https://aistudio.google.com/)

