# Hospedar Evolution API Gratuitamente

## Opção 1: Render (Plano Gratuito) ⭐

1. Acesse: https://render.com
2. Crie uma conta
3. Clique em "New" → "Web Service"
4. Conecte seu GitHub
5. Ou use "Deploy Example":

```bash
# Clone o repositório oficial
git clone https://github.com/EvolutionAPI/evolution-api.git
cd evolution-api
```

6. No Render, configure:
   - **Name**: `fisioflow-whatsapp`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free` (limitado, mas funciona)

### Opção 2: Railway (Free Trial)

1. Acesse: https://railway.app
2. Clique em "Deploy from GitHub"
3. Ou "New Project" → "Deploy from Docker Image"
4. Use: `evolutionapi/evolution-api:latest`
5. $5 de crédito grátis

### Opção 3: Fly.io (Plano Gratis)

```bash
# Instalar flyctl
curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login

# Criar app
flyctl launch --image evolutionapi/evolution-api:latest

# Definir porta
flyctl info
```

### Opção 4: CodeSandbox (Free)

1. Acesse: https://codesandbox.io/dashboard
2. Create → Port Container
3. Use a imagem pública ou Dockerfile

---

## Variáveis de Ambiente na Vercel

Após hospedar, você terá uma URL como:

```
https://fisioflow-whatsapp.onrender.com
```

Adicione na Vercel:

```bash
vercel env add WHATSAPP_API_URL production
# Valor: https://fisioflow-whatsapp.onrender.com

vercel env add WHATSAPP_API_KEY production
# Valor: [API Key gerada no Evolution API]
```

---

## Conectar WhatsApp

1. Acesse sua URL hospedada
2. Crie uma instância
3. Escaneie o QR Code
4. Copie a API Key
5. Adicione na Vercel

---

## URLs de Exemplo após hospedar:

- Render: `https://seu-app.onrender.com`
- Railway: `https://seu-app.up.railway.app`
- Fly.io: `https://seu-app.fly.dev`
