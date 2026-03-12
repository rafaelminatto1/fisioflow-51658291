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
      
      // Mensagem personalizada
      const message = `Olá ${name || 'Paciente'}! 👋 Este é um lembrete da sua consulta de fisioterapia amanhã, dia ${date} às ${startTime}. Confirmamos sua presença?`;
      
      return await whatsapp.sendTextMessage(phone, message);
    });

    return { message: 'Lembrete enviado via WhatsApp' };
  }
);

const app = new Hono<{ Bindings: Env }>();

/**
 * Endpoint de Integração Inngest
 * Usa o handler oficial do SDK para Cloudflare/Hono.
 */
app.use('/', async (c, next) => {
  // O Inngest SDK precisa das chaves no env para o Sync funcionar
  const handler = serve({
    client: inngest,
    functions: [appointmentReminder],
    signingKey: c.env.INNGEST_SIGNING_KEY,
  });
  
  return handler(c);
});

export { app as inngestRoutes };
