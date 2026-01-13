# Setup Completo - Inngest + Resend + Evolution API

## ✅ Já Configurado (Local)

Variáveis adicionadas ao `.env`:
- `INNGEST_EVENT_KEY`
- `INNGEST_SIGNING_KEY`
- `RESEND_API_KEY`

---

## 🔧 Configuração na Vercel

### Opção 1: Via Dashboard (Mais Fácil)

1. Acesse: https://vercel.com/rafaelminatto1/fisioflow-51658291/settings/environment-variables

2. Adicione as variáveis:

| Nome | Valor | Sensitive |
|------|-------|-----------|
| `INNGEST_EVENT_KEY` | `9wvvKcSTUi2STGzvwEImNg_j1XUcKjUgP-o-1HfIt-j9eKulwyfV-B1J95OXTKSHoO3huyTgcZCI6b5AEMD-xw` | ✅ |
| `INNGEST_SIGNING_KEY` | `signkey-prod-4d62ed650596226610b6190151611dee99a864a9863ebdfdb3bc328f1d020a18` | ✅ |
| `RESEND_API_KEY` | `re_VAuoDfvE_4L8cJbMsdxmqMBdr28AuETkj` | ✅ |

### Opção 2: Via CLI

Execute o script:
```bash
bash ./scripts/setup-vercel-env.sh
```

Ou manualmente:
```bash
# Inngest
vercel env add INNGEST_EVENT_KEY
# Cole: 9wvvKcSTUi2STGzvwEImNg_j1XUcKjUgP-o-1HfIt-j9eKulwyfV-B1J95OXTKSHoO3huyTgcZCI6b5AEMD-xw

vercel env add INNGEST_SIGNING_KEY
# Cole: signkey-prod-4d62ed650596226610b6190151611dee99a864a9863ebdfdb3bc328f1d020a18

# Resend (já existe, pode precisar atualizar)
vercel env rm RESEND_API_KEY production
vercel env add RESEND_API_KEY
# Cole: re_VAuoDfvE_4L8cJbMsdxmqMBdr28AuETkj
```

---

## 💬 Evolution API (WhatsApp)

### Opção 1: Docker Local

```bash
docker run -d \
  --name evolution-api \
  --restart always \
  -p 8443:8443 \
  -e SERVER_PORT=8443 \
  evolutionapi/evolution-api:latest
```

### Opção 2: Docker Compose (Recomendado)

Crie `docker-compose.yml`:
```yaml
version: '3.8'
services:
  evolution-api:
    image: evolutionapi/evolution-api:latest
    container_name: evolution-api
    restart: always
    ports:
      - "8443:8443"
    environment:
      - SERVER_PORT=8443
    volumes:
      - evolution-data:/home/evolution/data

volumes:
  evolution-data:
```

Execute:
```bash
docker-compose up -d
```

### Opção 3: Cloud Services

Use um provedor de Evolution API hospedado:
- Evolution API Cloud (oficial)
- Provedores terceiros

### Configurar na Vercel

Após instalar o Evolution API:

1. Acesse a interface do Evolution API (http://localhost:8443)
2. Crie uma instância
3. Conecte o WhatsApp QR Code
4. Adicione na Vercel:

| Nome | Valor |
|------|-------|
| `WHATSAPP_API_URL` | `http://seu-servidor:8443` (ou URL cloud) |
| `WHATSAPP_API_KEY` | API Key gerada na instância |

---

## 🚀 Deploy Final

```bash
# Deploy para produção
vercel --prod
```

Ou automaticamente ao fazer push.

---

## ✅ Verificar Configuração

### 1. Verificar Inngest

Acesse: https://app.inngest.com

Você deve ver os workflows registrados:
- ✅ fisioflow-daily-cleanup
- ✅ fisioflow-birthday-messages
- ✅ fisioflow-daily-reports
- ✅ E mais...

### 2. Verificar Resend

Acesse: https://resend.com/dashboard

Veja se o domínio está verificado.

### 3. Testar Envio

```typescript
import { InngestHelpers } from '@/lib/inngest/helpers';

// Testar email
await InngestHelpers.sendEmail({
  to: 'seu@email.com',
  subject: 'Teste Inngest + Resend',
  html: '<p>Funcionou! 🎉</p>',
});

// Testar WhatsApp (após configurar Evolution API)
await InngestHelpers.sendWhatsApp({
  to: '+5511999999999',
  message: 'Teste via Inngest!',
});
```

---

## 📊 Dashboard

| Serviço | Dashboard |
|---------|-----------|
| Inngest | https://app.inngest.com |
| Resend | https://resend.com/dashboard |
| Vercel | https://vercel.com/dashboard |
| Evolution API | http://localhost:8443 (local) |
