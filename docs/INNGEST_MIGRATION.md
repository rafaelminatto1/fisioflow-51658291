# Inngest Migration Guide

## Resumo da Implementação

A integração do Inngest foi implementada no FisioFlow para substituir os cron jobs síncronos da Vercel por workflows resilientes com retry automático.

## Arquivos Criados

### Configuração e Utilitários

| Arquivo | Descrição |
|---------|-----------|
| `src/lib/inngest/client.ts` | Cliente Inngest com configurações de retry |
| `src/lib/inngest/types.ts` | Tipos TypeScript para eventos e payloads |
| `src/lib/inngest/helpers.ts` | Funções helper para enviar eventos |
| `src/lib/inngest/serve.ts` | Handler para API route do Inngest |
| `src/lib/inngest/index.ts` | Export principal do módulo |
| `api/inngest/route.ts` | API route para Inngest |

### Workflows

| Workflow | Arquivo | Origem |
|---------|---------|--------|
| Cleanup | `src/inngest/workflows/cleanup.ts` | `/api/crons/cleanup` |
| Birthday Messages | `src/inngest/workflows/birthdays.ts` | `/api/crons/birthdays` |
| Daily Reports | `src/inngest/workflows/daily-reports.ts` | `/api/crons/daily-reports` |
| Weekly Summary | `src/inngest/workflows/weekly-summary.ts` | `/api/crons/weekly-summary` |
| Expiring Vouchers | `src/inngest/workflows/expiring-vouchers.ts` | `/api/crons/expiring-vouchers` |
| Data Integrity | `src/inngest/workflows/data-integrity.ts` | `/api/crons/data-integrity` |

### Novos Workflows

| Workflow | Arquivo | Descrição |
|---------|---------|-----------|
| Notifications | `src/inngest/workflows/notifications.ts` | Sistema de notificações com retry |
| Email | `src/inngest/workflows/email.ts` | Envio de emails via Resend |
| WhatsApp | `src/inngest/workflows/whatsapp.ts` | Envio de WhatsApp via Evolution API |
| Appointments | `src/inngest/workflows/appointments.ts` | Lembretes de consulta |
| AI Insights | `src/inngest/workflows/ai-insights.ts` | Análise de pacientes com AI |

## Setup na Vercel

### 1. Instalar a Integração

1. Acesse: https://vercel.com/marketplace/inngest
2. Clique em "Install" e "Connect Account"
3. Selecione o projeto FisioFlow
4. A variável `INNGEST_KEY` será configurada automaticamente

### 2. Deploy

```bash
vercel --prod
```

## Setup Local

### 1. Instalar CLI do Inngest

```bash
npm install -g inngest-cli
# ou
pnpm add -D inngest-cli
```

### 2. Adicionar ao .env

```bash
INNGEST_DEV=http://localhost:8288
```

### 3. Rodar em desenvolvimento

Terminal 1:
```bash
inngest dev
```

Terminal 2:
```bash
pnpm dev
```

## Próximos Passos

### Fase 1: Testar Workflows de Cron

1. Acessar o dashboard do Inngest: https://app.inngest.com
2. Verificar se os workflows foram registrados
3. Executar manualmente para testar

### Fase 2: Implementar Integrações Pendentes

| Workflow | Status | TODO |
|----------|--------|------|
| Birthdays | ⚠️ Parcial | Integrar com Evolution API |
| Daily Reports | ⚠️ Parcial | Integrar com Resend |
| Weekly Summary | ⚠️ Parcial | Integrar com Resend |
| Expiring Vouchers | ⚠️ Parcial | Integrar com Resend e WhatsApp |
| Notifications | ⚠️ Parcial | Completar integrações |

### Fase 3: Migrar Cron Jobs Completamente

Quando os workflows estiverem funcionando:

1. Remover as entradas de `crons` do `vercel.json`
2. Deletar os arquivos antigos em `/api/crons/`
3. Os workflows do Inngest assumem a responsabilidade

### Fase 4: Adicionar Novos Workflows

- Processamento de pagamentos assíncronos
- Geração de relatórios em batch
- Sincronização com Google Calendar
- Backup automatizado de dados

## Exemplos de Uso

### Enviar Notificação

```typescript
import { InngestHelpers } from '@/lib/inngest/helpers';

// Após criar um appointment
await InngestHelpers.sendNotification({
  userId: patient.user_id,
  organizationId: patient.organization_id,
  type: 'email',
  to: patient.email,
  subject: 'Consulta Agendada',
  body: 'Sua consulta foi agendada para...',
});
```

### Gerar Insights AI

```typescript
// Após uma sessão ser completada
await InngestHelpers.generatePatientInsights({
  patientId: session.patient_id,
  organizationId: session.organization_id,
});
```

### Disparar Lembretes de Consulta

```typescript
// Pode ser chamado por um cron job diário
await InngestHelpers.triggerAppointmentReminders();
```

## Monitoramento

Acesse o dashboard do Inngest para:
- Ver status dos workflows
- Debugar erros
- Ver histograma de execuções
- Re-executar workflows falhados

## Suporte

- Documentação Inngest: https://www.inngest.com/docs
- Dashboard: https://app.inngest.com
- Vercel Integration: https://vercel.com/marketplace/inngest
