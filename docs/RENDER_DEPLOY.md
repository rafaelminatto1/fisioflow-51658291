# Deploy Evolution API no Render

## Passo a Passo Completo

### 1. Acessar o Render

1. Acesse: https://render.com
2. Clique em **"Sign Up"** ou **"Log In"**
3. Faça login com GitHub (recomendado)

### 2. Criar Novo Web Service

1. No dashboard, clique em **"New +"**
2. Selecione **"Web Service"**
3. Escolha **"Deploy a Docker image"**

### 3. Configurar o Service

Preencha assim:

| Campo | Valor |
|------|-------|
| **Name** | `fisioflow-whatsapp` |
| **Image** | `evolutionapi/evolution-api:v2.0.5` |
| **Environment** | `Docker` |
| **Region** | `Oregon (US West)` ou `Singapore` (mais perto do Brasil) |
| **Branch** | (deixe vazio) |

### 4. Configurar Variáveis de Ambiente

Clique em **"Advanced"** → **"Add Environment Variable"**

Adicione:

| Key | Value |
|-----|-------|
| `SERVER_PORT` | `8443` |
| `AUTHENTICATION_TYPE` | `apikey` |
| `API_KEY` | `sua-chave-secreta-aqui` (defina uma) |

### 5. Plano

Selecione o plano **"Free"** (sobe para sleep após 15min inativo, mas funciona para testes)

### 6. Deploy

Clique em **"Deploy"** e aguarde ~5 minutos

---

## Após Deploy Terminar

### 7. Obter a URL

O Render vai gerar uma URL como:
```
https://fisioflow-whatsapp.onrender.com
```

### 8. Acessar o Painel Evolution API

1. Acesse sua URL: `https://fisioflow-whatsapp.onrender.com`
2. Crie uma instância
3. Conecte o WhatsApp (QR Code)
4. Copie a **API Key** gerada

---

## Configurar na Vercel

Execute no seu terminal:

```bash
# URL do Evolution API no Render
vercel env add WHATSAPP_API_URL production
# Cole: https://fisioflow-whatsapp.onrender.com

# API Key gerada no painel
vercel env add WHATSAPP_API_KEY production
# Cole: a API Key que você copiou
```

---

## Deploy Final

```bash
vercel --prod
```

---

## ⚠️ Limitação do Plano Gratuito Render

O serviço vai "dormir" após 15 minutos sem uso e acordará em ~30 segundos quando receber uma requisição.

Para produção, considere o plano pago (~$7/mês).

---

## Solução para Wake-up (Opcional)

Se quiser manter o serviço sempre ativo no plano grátis, crie um cron job:

```bash
# A cada 10 minutos faz uma request
*/10 * * * * curl https://fisioflow-whatsapp.onrender.com/health
```

Use [UptimeRobot](https://uptimerobot.com) gratuitamente para isso.
