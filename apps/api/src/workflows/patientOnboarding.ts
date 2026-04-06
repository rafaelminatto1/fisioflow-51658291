import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';
import type { Env } from '../types/env';

export type PatientOnboardingParams = {
  patientId: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  organizationId: string;
  therapistName: string;
};

/**
 * Workflow: Onboarding de Novo Paciente
 *
 * Fluxo:
 *  1. Envia mensagem de boas-vindas (WhatsApp)
 *  2. Aguarda até 7 dias para paciente confirmar dados / assinar LGPD
 *  3. Se confirmado → ativa conta + notifica terapeuta
 *  4. Se timeout → envia lembrete e aguarda mais 7 dias
 *  5. Agenda primeira consulta (envia link de agendamento público)
 */
export class PatientOnboardingWorkflow extends WorkflowEntrypoint<Env, PatientOnboardingParams> {
  async run(event: WorkflowEvent<PatientOnboardingParams>, step: WorkflowStep) {
    const { patientId, patientName, patientEmail: _patientEmail, patientPhone, organizationId, therapistName } =
      event.payload;

    // 1. Boas-vindas imediatas
    await step.do('send-welcome', async () => {
      await this.sendWhatsApp(
        patientPhone,
        `Olá ${patientName}! 👋 Bem-vindo(a) à clínica!\n\nSou o assistente digital. Para ativar seu prontuário e garantir a segurança dos seus dados, precisamos que você confirme seu cadastro.\n\nResponda SIM para confirmar ou acesse o link enviado por email.`,
      );
    });

    // 2. Aguarda confirmação LGPD (até 7 dias)
    let lgpdConfirmed = false;
    try {
      const confirmation = await step.waitForEvent<{ confirmed: boolean }>('lgpd-confirmed', {
        type: 'lgpd-confirmation',
        timeout: '7 days',
      });
      lgpdConfirmed = confirmation.payload?.confirmed === true;
    } catch {
      // Timeout — envia lembrete
      await step.do('send-lgpd-reminder', async () => {
        await this.sendWhatsApp(
          patientPhone,
          `Olá ${patientName}! Ainda não recebemos sua confirmação. Por favor, confirme seus dados para ativarmos seu prontuário. Responda SIM ou ignore caso não queira prosseguir.`,
        );
      });

      // Aguarda mais 7 dias
      try {
        const retry = await step.waitForEvent<{ confirmed: boolean }>('lgpd-confirmed-retry', {
          type: 'lgpd-confirmation',
          timeout: '7 days',
        });
        lgpdConfirmed = retry.payload?.confirmed === true;
      } catch {
        // Paciente não confirmou — encerra sem ativar
        await step.do('log-abandoned', async () => {
          await this.logEvent(organizationId, 'onboarding_abandoned', patientId);
        });
        return;
      }
    }

    if (!lgpdConfirmed) return;

    // 3. Ativa prontuário
    await step.do('activate-patient', async () => {
      await this.logEvent(organizationId, 'patient_activated', patientId);
    });

    // 4. Notifica terapeuta
    await step.do('notify-therapist', async () => {
      await this.sendWhatsApp(
        patientPhone,
        `✅ Cadastro confirmado! ${patientName}, seu prontuário foi ativado com sucesso.\n\nSeu fisioterapeuta ${therapistName} entrará em contato em breve para agendar sua primeira consulta.`,
      );
    });

    // 5. Aguarda 1 dia → envia link de agendamento
    await step.sleep('wait-before-booking-link', '1 day');

    await step.do('send-booking-link', async () => {
      await this.sendWhatsApp(
        patientPhone,
        `Olá ${patientName}! Para agendar sua primeira consulta, acesse:\nhttps://moocafisio.com.br/agendar\n\nCaso prefira, ligue diretamente para nossa recepção. 😊`,
      );
    });
  }

  private async sendWhatsApp(phone: string, message: string) {
    if (!this.env.WHATSAPP_PHONE_NUMBER_ID || !this.env.WHATSAPP_ACCESS_TOKEN) return;
    await fetch(
      `https://graph.facebook.com/v19.0/${this.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.env.WHATSAPP_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone.replace(/\D/g, ''),
          type: 'text',
          text: { body: message },
        }),
      },
    );
  }

  private async logEvent(orgId: string, event: string, _entityId: string) {
    if (!this.env.ANALYTICS) return;
    try {
      this.env.ANALYTICS.writeDataPoint({
        blobs: ['/workflow/patient-onboarding', 'WORKFLOW', orgId, event],
        doubles: [0, 200, 0],
        indexes: [orgId],
      });
    } catch {}
  }
}
