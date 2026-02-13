# 📧 Configuração de Email para Agendamentos

## Visão Geral

Sistema de notificações por email usando **Resend** integrado com Supabase Edge Functions. Envia emails profissionais e responsivos para:
- ✅ Confirmação de agendamento
- 🔄 Reagendamento
- ❌ Cancelamento
- ⏰ Lembretes (24h antes)

---

## 🚀 Setup do Resend

### **Passo 1: Criar Conta no Resend**
1. Acesse https://resend.com
2. Crie uma conta gratuita (100 emails/dia no plano free)
3. Confirme seu email

### **Passo 2: Validar Domínio**
Para enviar emails profissionais (ex: `agendamentos@activityfisioterapia.com.br`):

1. Vá para https://resend.com/domains
2. Clique em **"Add Domain"**
3. Digite seu domínio: `activityfisioterapia.com.br`
4. Copie os registros DNS fornecidos (SPF, DKIM, DMARC)
5. Adicione esses registros no painel do seu provedor de domínio
6. Aguarde validação (pode levar até 72h)

**Registros DNS típicos:**
```
TXT @ "v=spf1 include:_spf.resend.com ~all"
TXT resend._domainkey "p=MIGfMA0GCSqGSIb3..."
TXT _dmarc "v=DMARC1; p=none;"
```

### **Passo 3: Criar API Key**
1. Acesse https://resend.com/api-keys
2. Clique em **"Create API Key"**
3. Dê um nome: `Activity Fisioterapia - Agendamentos`
4. Escolha permissões: **"Full Access"** (ou apenas "Sending Access")
5. Copie a key (ex: `re_abc123...`)

⚠️ **IMPORTANTE**: Guarde a key em local seguro! Ela só é exibida uma vez.

### **Passo 4: Adicionar Secret no Supabase**
Execute no terminal ou use a dashboard do Supabase:

```bash
# Via CLI (recomendado)
supabase secrets set RESEND_API_KEY=re_abc123...

# Ou via Dashboard:
# Supabase > Project Settings > Edge Functions > Secrets
# Adicionar: RESEND_API_KEY = re_abc123...
```

---

## 📨 Edge Function: send-appointment-email

Já criada em `supabase/functions/send-appointment-email/index.ts`.

### **Deploy Automático**
A Edge Function será deployada automaticamente com o resto do código.

### **Testar Manualmente**
```typescript
// No console do navegador ou em um script
const { data, error } = await supabase.functions.invoke('send-appointment-email', {
  body: {
    patientEmail: 'paciente@example.com',
    patientName: 'João Silva',
    appointmentDate: '15/01/2025',
    appointmentTime: '14:00',
    appointmentType: 'Fisioterapia',
    action: 'created', // ou 'rescheduled' | 'cancelled' | 'reminder'
    clinicName: 'Activity Fisioterapia',
    clinicAddress: 'Rua Exemplo, 123 - São Paulo, SP',
    clinicPhone: '(11) 99999-9999'
  }
});

console.log('Resultado:', data, error);
```

---

## 🔗 Integrar com Agendamentos

### **Atualizar AppointmentNotificationService**

Edite `src/lib/services/AppointmentNotificationService.ts` para incluir envio de email:

```typescript
static async scheduleNotification(
  appointmentId: string, 
  patientId: string,
  patientEmail: string, // NOVO
  date: Date, 
  time: string,
  patientName: string
) {
  try {
    // ... código existente de WhatsApp ...

    // ADICIONAR: Envio de email
    const { data: emailData, error: emailError } = await supabase.functions.invoke('send-appointment-email', {
      body: {
        patientEmail,
        patientName,
        appointmentDate: date.toLocaleDateString('pt-BR'),
        appointmentTime: time,
        appointmentType: 'Fisioterapia', // ou obter do appointment
        action: 'created',
      }
    });

    if (emailError) {
      logger.error('Erro ao enviar email de confirmação', emailError, 'AppointmentNotificationService');
    } else {
      logger.info('Email de confirmação enviado', { appointmentId, emailData }, 'AppointmentNotificationService');
    }

  } catch (error) {
    logger.error('Falha ao notificar', error, 'AppointmentNotificationService');
    return null;
  }
}
```

Faça o mesmo para `notifyReschedule()` e `notifyCancellation()`.

---

## 📅 Sistema de Lembretes Automáticos

### **Criar Edge Function de Lembretes**

```typescript
// supabase/functions/send-appointment-reminders/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const handler = async (req: Request): Promise<Response> => {
  try {
    // Buscar agendamentos de amanhã
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_time,
        type,
        patients!inner(id, name, email)
      `)
      .eq('appointment_date', tomorrowStr)
      .in('status', ['agendado', 'confirmado']);

    if (error) throw error;

    console.log(`Enviando lembretes para ${appointments?.length || 0} agendamentos`);

    // Enviar lembretes
    const results = await Promise.allSettled(
      (appointments || []).map(apt => 
        supabase.functions.invoke('send-appointment-email', {
          body: {
            patientEmail: apt.patients.email,
            patientName: apt.patients.name,
            appointmentDate: tomorrow.toLocaleDateString('pt-BR'),
            appointmentTime: apt.appointment_time,
            appointmentType: apt.type,
            action: 'reminder',
          }
        })
      )
    );

    const successCount = results.filter(r => r.status === 'fulfilled').length;

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount,
        total: appointments?.length || 0 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Erro ao enviar lembretes:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
```

### **Agendar Execução Diária (Cron)**

No Supabase SQL Editor, execute:

```sql
-- Habilitar extensões
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Agendar lembretes diários às 18h
SELECT cron.schedule(
  'daily-appointment-reminders',
  '0 18 * * *', -- Cron: todo dia às 18h
  $$
  SELECT
    net.http_post(
        url:='https://ycvbtjfrchcyvmkvuocu.supabase.co/functions/v1/send-appointment-reminders',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);

-- Verificar jobs agendados
SELECT * FROM cron.job;

-- Cancelar job (se necessário)
SELECT cron.unschedule('daily-appointment-reminders');
```

---

## 🎨 Customizar Templates de Email

Os templates HTML estão em `send-appointment-email/index.ts`. Para personalizar:

1. **Cores**: Ajuste gradientes e cores inline
2. **Logo**: Adicione `<img src="https://seu-dominio.com/logo.avif" />`
3. **Rodapé**: Atualize informações de contato
4. **Textos**: Modifique mensagens conforme preferência

**Exemplo de inserir logo:**
```html
<div style="background: ...; text-align: center;">
  <img 
    src="https://activityfisioterapia.com.br/logo.avif" 
    alt="Activity Fisioterapia" 
    style="width: 150px; margin-bottom: 15px;"
  />
  <h1 style="color: white; ...">✅ Agendamento Confirmado!</h1>
</div>
```

---

## 🐛 Troubleshooting

### **Emails não chegam**
1. Verifique logs da Edge Function:
   ```
   Dashboard Supabase > Functions > send-appointment-email > Logs
   ```
2. Confirme que domínio está validado (ícone verde no Resend)
3. Verifique caixa de spam do destinatário
4. Teste com email pessoal primeiro (Gmail/Outlook)

### **Erro: "API key not found"**
```bash
# Verificar se secret foi adicionado
supabase secrets list

# Adicionar novamente
supabase secrets set RESEND_API_KEY=re_abc123...
```

### **Erro: "Invalid from address"**
- Se domínio não validado, use: `onboarding@resend.dev` (padrão Resend)
- Após validação, use: `agendamentos@seu-dominio.com.br`

### **Limite de 100 emails/dia excedido**
- Upgrade para plano pago do Resend ($20/mês = 50k emails)
- Ou implemente fila de envio para controlar volume

---

## 📊 Monitoramento

### **Dashboard do Resend**
- https://resend.com/emails
- Veja status: enviado, aberto, clicado, bounced
- Logs detalhados de cada email

### **Logs Supabase**
```bash
# Via CLI
supabase functions logs send-appointment-email

# Ou Dashboard > Functions > Logs
```

---

## ✅ Checklist de Implementação

- [ ] Conta Resend criada
- [ ] Domínio validado (ou usando `onboarding@resend.dev`)
- [ ] API Key gerada e adicionada ao Supabase
- [ ] Edge Function `send-appointment-email` deployada
- [ ] Integração em `AppointmentNotificationService` completa
- [ ] Edge Function `send-appointment-reminders` criada
- [ ] Cron job configurado (lembretes diários)
- [ ] Testes de envio realizados
- [ ] Templates personalizados (logo, cores, textos)

---

## 🚀 Próximos Passos

1. **SMS via Twilio**: Adicionar notificações por SMS além de email/WhatsApp
2. **Push Notifications**: Implementar PWA push para app mobile
3. **Analytics**: Rastrear taxa de abertura e conversão de emails
4. **A/B Testing**: Testar diferentes templates e horários de envio
5. **Segmentação**: Emails personalizados por tipo de serviço

---

**Sistema pronto para produção!** 🎉
