import { Hono } from 'hono';
import { Inngest } from 'inngest';
import { serve } from 'inngest/hono';
import type { Env } from '../types/env';
import { WhatsAppService } from '../lib/whatsapp';

/**
 * Cliente Inngest SDK
 */
export const inngest = new Inngest({ 
  id: 'fisioflow-api',
  name: 'FisioFlow'
});

/**
 * Funções de Automação
 */
const appointmentReminder = inngest.createFunction(
  { id: 'send-appointment-reminder', name: 'Lembrete de Consulta' },
  { event: 'appointment.created' },
  async ({ event, step, env }) => {
    const { date, startTime, appointmentId, phone, name } = event.data;

    // 1. Calcula o horário do lembrete (24h antes da consulta)
    const appointmentDateTime = new Date(`${date}T${startTime}`);
    const reminderTime = new Date(appointmentDateTime.getTime() - 24 * 60 * 60 * 1000);

    // 2. Aguarda até o momento certo
    if (reminderTime > new Date()) {
      await step.sleepUntil('wait-for-24h-reminder', reminderTime);
    }

    // 3. Dispara o WhatsApp Real
    await step.run('send-whatsapp-reminder', async () => {
      if (!phone) return { error: 'Telefone do paciente ausente' };
      const whatsapp = new WhatsAppService(env as Env);
      
      const calendarUrl = `https://api-pro.moocafisio.com.br/api/calendar/${appointmentId}.ics`;
      
      // Tenta usar template aprovado, enviando também o link do calendário
      try {
        // No template da Meta, você pode configurar o link do calendário em um botão ou texto {{4}}
        return await whatsapp.sendSmartTemplate(phone, 'lembrete_consulta_v1', [name, date, startTime, calendarUrl]);
      } catch {
        const message = `Olá ${name}! 👋 Lembrete da sua consulta amanhã às ${startTime}. 

Adicionar à sua agenda (iPhone/Google):
${calendarUrl}`;
        return await whatsapp.sendTextMessage(phone, message);
      }
    });

    return { message: 'Lembrete enviado via WhatsApp' };
  }
);

/**
 * Automação: Boas-vindas para novos pacientes
 */
const patientWelcome = inngest.createFunction(
  { id: 'patient-welcome', name: 'Boas-vindas Paciente' },
  { event: 'patient.created' },
  async ({ event, step, env }) => {
    const { patientId, name, phone } = event.data;

    await step.run('send-welcome-whatsapp', async () => {
      if (!phone) return { error: 'Telefone ausente' };
      const db = createPool(env as Env);
      const whatsapp = new WhatsAppService(env as Env);

      // Verifica se o paciente já instalou o app (se tem token de push ou login)
      const res = await db.query('SELECT fcm_token FROM patients WHERE id = $1', [patientId]);
      const hasApp = !!res.rows[0]?.fcm_token;

      if (hasApp) {
        // Mensagem para quem JÁ TEM o app
        return await whatsapp.sendTextMessage(phone, `Seja bem-vindo(a), ${name}! 🚀 Suas consultas já estão sincronizadas com a agenda do seu celular através do nosso App.`);
      } else {
        // Mensagem com link para quem NÃO TEM o app ainda
        const calendarUrl = `webcal://api-pro.moocafisio.com.br/api/calendar/feed/${patientId}.ics`;
        return await whatsapp.sendTextMessage(phone, `Seja bem-vindo(a), ${name}! 🚀 Clique no link abaixo para adicionar suas consultas automaticamente à agenda do seu celular:\n\n${calendarUrl}`);
      }
    });

    return { status: 'welcome_sent' };
  }
);

/**
 * Automação: Feedback pós-consulta
 */
const appointmentFeedback = inngest.createFunction(
  { id: 'appointment-feedback', name: 'Feedback Pós-Consulta' },
  { event: 'appointment.completed' },
  async ({ event, step, env }) => {
    const { phone, name } = event.data;

    // Aguarda 2 horas após a consulta
    await step.sleep('wait-2h', '2h');

    await step.run('send-feedback-request', async () => {
      if (!phone) return { error: 'Telefone ausente' };
      const whatsapp = new WhatsAppService(env as Env);
      return await whatsapp.sendSmartTemplate(phone, 'feedback_atendimento', [name]);
    });

    return { status: 'feedback_requested' };
  }
);

/**
 * Automação: Lembrete de Exercícios (2 dias após consulta)
 */
const exerciseReminder = inngest.createFunction(
  { id: 'exercise-reminder', name: 'Lembrete de Exercícios em Casa' },
  { event: 'appointment.completed' },
  async ({ event, step, env }) => {
    const { phone, name } = event.data;

    // Aguarda 2 dias para perguntar sobre os exercícios
    await step.sleep('wait-2-days', '2d');

    await step.run('send-exercise-whatsapp', async () => {
      if (!phone) return;
      const whatsapp = new WhatsAppService(env as Env);
      return await whatsapp.sendSmartTemplate(phone, 'lembrete_exercicios_v1', [name]);
    });

    return { status: 'exercise_reminder_sent' };
  }
);

/**
 * Automação: Parabéns Aniversariante
 */
const birthdayGreeting = inngest.createFunction(
  { id: 'birthday-greeting', name: 'Parabéns Aniversariante' },
  { event: 'patient.birthday' },
  async ({ event, step, env }) => {
    const { phone, name } = event.data;

    await step.run('send-birthday-whatsapp', async () => {
      if (!phone) return;
      const whatsapp = new WhatsAppService(env as Env);
      return await whatsapp.sendSmartTemplate(phone, 'parabens_paciente', [name]);
    });

    return { status: 'birthday_sent' };
  }
);

/**
 * Automação: Recuperação de Inativo
 */
const inactiveRecovery = inngest.createFunction(
  { id: 'inactive-recovery', name: 'Recuperação de Inativo' },
  { event: 'patient.inactive' },
  async ({ event, step, env }) => {
    const { phone, name } = event.data;

    await step.run('send-recovery-whatsapp', async () => {
      if (!phone) return;
      const whatsapp = new WhatsAppService(env as Env);
      return await whatsapp.sendSmartTemplate(phone, 'recuperacao_inativo', [name]);
    });

    return { status: 'recovery_sent' };
  }
);

/**
 * Automação: Confirmação de Pagamento
 */
const paymentConfirmation = inngest.createFunction(
  { id: 'payment-confirmation', name: 'Confirmação de Pagamento' },
  { event: 'payment.received' },
  async ({ event, step, env }) => {
    const { phone, name } = event.data;

    await step.run('send-payment-whatsapp', async () => {
      if (!phone) return;
      const whatsapp = new WhatsAppService(env as Env);
      return await whatsapp.sendSmartTemplate(phone, 'pagamento_confirmado', [name]);
    });

    return { status: 'payment_notified' };
  }
);

/**
 * Automação: Solicitação de Review no Google (Após 5 sessões)
 */
const googleReviewRequest = inngest.createFunction(
  { id: 'google-review-request', name: 'Solicitar Avaliação Google' },
  { event: 'appointment.completed' },
  async ({ event, step, env }) => {
    const { patientId, phone, name } = event.data;

    // 1. Verifica no banco se o paciente já completou 5 sessões
    const sessionCount = await step.run('count-sessions', async () => {
      const db = createPool(env as Env);
      const res = await db.query(
        "SELECT COUNT(*)::int FROM appointments WHERE patient_id = $1 AND status = 'completed'",
        [patientId]
      );
      return res.rows[0].count;
    });

    // 2. Se for exatamente a 5ª sessão, pede o review
    if (sessionCount === 5) {
      await step.run('send-review-whatsapp', async () => {
        if (!phone) return;
        const whatsapp = new WhatsAppService(env as Env);
        return await whatsapp.sendSmartTemplate(phone, 'avaliacao_google', [name]);
      });
    }

    return { sessionCount };
  }
);

const app = new Hono<{ Bindings: Env }>();

/**
 * Endpoint de Integração Inngest
 */
app.use('/', async (c, next) => {
  const handler = serve({
    client: inngest,
    functions: [
      appointmentReminder, 
      patientWelcome, 
      appointmentFeedback,
      exerciseReminder,
      birthdayGreeting,
      inactiveRecovery,
      paymentConfirmation,
      googleReviewRequest
    ],
    signingKey: c.env.INNGEST_SIGNING_KEY,
  });
  
  return handler(c);
});

export { app as inngestRoutes };
