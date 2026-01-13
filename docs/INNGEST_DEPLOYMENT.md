# Guia de Deployment - Inngest + FisioFlow

Este guia completo orienta você através do processo de configuração e deployment da integração Inngest com FisioFlow.

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Setup Local](#setup-local)
3. [Configuração na Vercel](#configuração-na-vercel)
4. [Integração de Serviços](#integração-de-serviços)
5. [Testes](#testes)
6. [Deploy em Produção](#deploy-em-produção)
7. [Troubleshooting](#troubleshooting)

---

## Pré-requisitos

- Node.js 18+
- pnpm 9+
- Conta na Vercel
- Conta no Inngest
- Conta no Resend (para emails)
- Evolution API configurado (para WhatsApp)

---

## Setup Local

### 1. Executar o script de setup

```bash
pnpm inngest:setup
```

Ou manualmente:

```bash
# Instalar CLI do Inngest globalmente
npm install -g inngest-cli

# Adicionar variável de ambiente ao .env
echo "INNGEST_DEV=http://localhost:8288" >> .env
```

### 2. Verificar instalação

```bash
inngest --version
```

### 3. Estrutura de arquivos criada

```
src/
├── lib/
│   ├── inngest/
│   │   ├── client.ts
│   │   ├── types.ts
│   │   ├── helpers.ts
│   │   ├── serve.ts
│   │   └── README.md
│   ├── email/
│   │   ├── resend.ts
│   │   └── index.ts
│   └── whatsapp/
│       ├── evolution.ts
│       └── index.ts
└── inngest/
    └── workflows/
        ├── cleanup.ts
        ├── birthdays.ts
        ├── daily-reports.ts
        ├── weekly-summary.ts
        ├── expiring-vouchers.ts
        ├── data-integrity.ts
        ├── notifications.ts
        ├── email.ts
        ├── whatsapp.ts
        ├── appointments.ts
        ├── ai-insights.ts
        └── index.ts
api/
└── inngest/
    └── route.ts
```

---

## Configuração na Vercel

### 1. Instalar Integração Inngest

1. Acesse: https://vercel.com/marketplace/inngest
2. Clique em **"Install"**
3. Faça login na conta Inngest (ou crie uma)
4. Selecione o projeto **FisioFlow**
5. A integração irá configurar automaticamente:
   - `INNGEST_KEY` nas variáveis de ambiente
   - Webhook para `/api/inngest`

### 2. Variáveis de Ambiente Necessárias

Adicione estas variáveis no projeto Vercel:

```bash
# Inngest (configurado automaticamente pela integração)
INNGEST_KEY=your-inngest-signing-key

# Resend Email
RESEND_API_KEY=re_xxxxxxxxxxxxxxx

# Evolution API (WhatsApp)
WHATSAPP_API_URL=https://your-evolution-instance.com
WHATSAPP_API_KEY=your-api-key

# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI (para workflows de AI)
OPENAI_API_KEY=sk-xxxxxxxxxxxxxx
```

---

## Integração de Serviços

### Resend (Emails)

1. Acesse: https://resend.com
2. Crie uma conta
3. Configure seu domínio de envio
4. Copie a API Key
5. Adicione `RESEND_API_KEY` nas variáveis de ambiente

#### Templates Disponíveis

- `sendAppointmentConfirmation()` - Confirmação de consulta
- `sendAppointmentReminder()` - Lembrete de consulta
- `sendBirthdayGreeting()` - Mensagem de aniversário
- `sendDailyReport()` - Relatório diário para terapeutas
- `sendPasswordReset()` - Redefinição de senha

### Evolution API (WhatsApp)

1. Instale o Evolution API (auto-hospedado ou cloud)
2. Crie uma instância e conecte o WhatsApp
3. Configure as variáveis de ambiente
4. Use os helpers do Inngest para enviar mensagens

---

## Testes

### Testar Localmente

**Terminal 1 - Inngest Dev Server:**

```bash
pnpm inngest:dev
# ou
inngest dev
```

**Terminal 2 - Aplicação FisioFlow:**

```bash
pnpm dev
```

**Terminal 3 - Testar envio de eventos:**

```bash
# Testar envio de email
curl -X POST http://localhost:5173/api/inngest \
  -H "Content-Type: application/json" \
  -d '{
    "name": "email/birthday.greeting",
    "data": {
      "to": "test@example.com",
      "patientName": "João Silva",
      "organizationName": "FisioFlow"
    }
  }'
```

### Testar via Helpers

```typescript
import { InngestHelpers } from '@/lib/inngest/helpers';

// Enviar confirmação de consulta
await InngestHelpers.sendAppointmentConfirmationEmail({
  to: 'patient@example.com',
  patientName: 'Maria Santos',
  therapistName: 'Dr. João',
  date: '15/01/2026',
  time: '14:00',
  organizationName: 'FisioFlow Clínica',
});

// Enviar mensagem de WhatsApp
await InngestHelpers.sendBirthdayGreetingWhatsApp({
  to: '+5511999999999',
  patientName: 'Carlos Oliveira',
  organizationName: 'FisioFlow',
});
```

---

## Deploy em Produção

### 1. Commit e Push

```bash
git add .
git commit -m "feat: add Inngest integration with email and WhatsApp workflows"
git push origin main
```

### 2. Deploy na Vercel

```bash
vercel --prod
```

Ou automaticamente via push para branch main.

### 3. Verificar Deploy

1. Acesse o dashboard Inngest: https://app.inngest.com
2. Verifique se todos os workflows estão registrados
3. Teste enviando um evento manual

---

## Workflows Disponíveis

### Workflows Agendados (Cron)

| Workflow | ID | Schedule | Descrição |
|----------|-----|----------|-----------|
| Cleanup | `fisioflow-daily-cleanup` | 3:00 AM | Limpeza de dados expirados |
| Birthday Messages | `fisioflow-birthday-messages` | 9:00 AM | Mensagens de aniversário |
| Daily Reports | `fisioflow-daily-reports` | 8:00 AM | Relatórios diários |
| Weekly Summary | `fisioflow-weekly-summary` | Segunda 9:00 AM | Resumo semanal |
| Expiring Vouchers | `fisioflow-expiring-vouchers` | 10:00 AM | Vouchers expirando |
| Data Integrity | `fisioflow-data-integrity` */6 | A cada 6 horas | Integridade dos dados |

### Workflows Event-Driven

| Workflow | Event | Descrição |
|----------|-------|-----------|
| Send Email | `email/send` | Enviar email |
| Appointment Confirmation Email | `email/appointment.confirmation` | Confirmação de consulta |
| Appointment Reminder Email | `email/appointment.reminder` | Lembrete de consulta |
| Birthday Greeting Email | `email/birthday.greeting` | Felicitação de aniversário |
| Daily Report Email | `email/daily.report` | Relatório diário |
| Send WhatsApp | `whatsapp/send` | Enviar mensagem WhatsApp |
| Appointment Confirmation WhatsApp | `whatsapp/appointment.confirmation` | Confirmação via WhatsApp |
| Appointment Reminder WhatsApp | `whatsapp/appointment.reminder` | Lembrete via WhatsApp |
| Birthday Greeting WhatsApp | `whatsapp/birthday.greeting` | Aniversário via WhatsApp |
| Appointment Reminder | `appointment/reminder` | Disparar lembretes |
| Appointment Created | `appointment/created` | Após criar consulta |
| AI Patient Insights | `ai/patient.insights` | Gerar insights AI |

---

## Troubleshooting

### Workflows não aparecem no dashboard

1. Verifique se `INNGEST_KEY` está configurado
2. Verifique se a route `/api/inngest` está acessível
3. Verifique os logs da Vercel para erros

### Erro "INNGEST_KEY not found"

Adicione a variável de ambiente na Vercel:

```bash
vercel env add INNGEST_KEY production
```

### Emails não são enviados

1. Verifique `RESEND_API_KEY` está correto
2. Verifique se o domínio está configurado no Resend
3. Cheque os logs no dashboard Resend

### WhatsApp não funciona

1. Verifique se a instância Evolution API está online
2. Confirme que o WhatsApp está conectado
3. Verifique as credenciais `WHATSAPP_API_URL` e `WHATSAPP_API_KEY`

### Timeout em workflows longos

Adicione `maxDuration` ao criar a função:

```typescript
inngest.createFunction(
  { maxDuration: '10m' }, // 10 minutos
  { event: 'my/event' },
  async ({ step }) => {
    // ...
  }
);
```

---

## Monitoramento

### Dashboard Inngest

- Produção: https://app.inngest.com
- Ver status dos workflows
- Re-executar workflows falhados
- Ver histograma de execuções

### Logs

- Vercel Logs: `vercel logs`
- Inngest: Dashboard > Functions > Select function > Runs

### Métricas

- Execuções por dia
- Taxa de sucesso
- Latência média
- Taxa de retry

---

## Suporte

- Documentação Inngest: https://www.inngest.com/docs
- Documentação Resend: https://resend.com/docs
- Vercel: https://vercel.com/docs
