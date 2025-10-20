import { supabase } from '@/integrations/supabase/client';

export interface WhatsAppMessage {
  to: string; // Número do telefone no formato +55XXXXXXXXXXX
  message: string;
  scheduledFor?: Date;
}

export interface AppointmentReminder {
  patientName: string;
  patientPhone: string;
  appointmentDate: Date;
  appointmentTime: string;
  therapistName: string;
  location: string;
}

export class WhatsAppService {
  /**
   * Envia mensagem via WhatsApp usando edge function
   */
  static async sendMessage({ to, message }: WhatsAppMessage): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: { to, message }
      });

      if (error) {
        console.error('Erro ao enviar mensagem WhatsApp:', error);
        return false;
      }

      console.log('Mensagem WhatsApp enviada com sucesso:', data);
      return true;
    } catch (error) {
      console.error('Erro ao enviar mensagem WhatsApp:', error);
      return false;
    }
  }

  /**
   * Envia lembrete de consulta
   */
  static async sendAppointmentReminder(reminder: AppointmentReminder): Promise<boolean> {
    const message = this.formatAppointmentReminder(reminder);
    return this.sendMessage({
      to: reminder.patientPhone,
      message
    });
  }

  /**
   * Formata mensagem de lembrete de consulta
   */
  private static formatAppointmentReminder(reminder: AppointmentReminder): string {
    const date = reminder.appointmentDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    return `🏥 *Lembrete de Consulta - Activity Fisioterapia*

Olá *${reminder.patientName}*!

Este é um lembrete da sua consulta:

📅 *Data:* ${date}
⏰ *Horário:* ${reminder.appointmentTime}
👨‍⚕️ *Fisioterapeuta:* ${reminder.therapistName}
📍 *Local:* ${reminder.location}

⚠️ Em caso de cancelamento, favor avisar com 24h de antecedência.

Até breve! 💙`;
  }

  /**
   * Envia lembrete de exercícios
   */
  static async sendExerciseReminder(
    patientName: string,
    patientPhone: string,
    exercises: string[]
  ): Promise<boolean> {
    const exerciseList = exercises.map((ex, i) => `${i + 1}. ${ex}`).join('\n');
    
    const message = `🏋️ *Lembrete de Exercícios - Activity Fisioterapia*

Olá *${patientName}*!

Não se esqueça de realizar seus exercícios hoje:

${exerciseList}

💪 Manter a constância é fundamental para sua recuperação!

Dúvidas? Entre em contato conosco! 💙`;

    return this.sendMessage({
      to: patientPhone,
      message
    });
  }

  /**
   * Envia mensagem de confirmação de agendamento
   */
  static async sendAppointmentConfirmation(reminder: AppointmentReminder): Promise<boolean> {
    const date = reminder.appointmentDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const message = `✅ *Agendamento Confirmado - Activity Fisioterapia*

Olá *${reminder.patientName}*!

Sua consulta foi confirmada com sucesso:

📅 *Data:* ${date}
⏰ *Horário:* ${reminder.appointmentTime}
👨‍⚕️ *Fisioterapeuta:* ${reminder.therapistName}
📍 *Local:* ${reminder.location}

Aguardamos você! 💙`;

    return this.sendMessage({
      to: reminder.patientPhone,
      message
    });
  }

  /**
   * Envia mensagem de boas-vindas a novo paciente
   */
  static async sendWelcomeMessage(
    patientName: string,
    patientPhone: string
  ): Promise<boolean> {
    const message = `👋 *Bem-vindo à Activity Fisioterapia!*

Olá *${patientName}*!

É um prazer tê-lo(a) conosco! 

Nossa equipe está pronta para auxiliá-lo(a) em sua jornada de recuperação e bem-estar.

📱 Você receberá lembretes automáticos de consultas e exercícios por este número.

💬 Em caso de dúvidas, estamos à disposição!

Bem-vindo! 💙`;

    return this.sendMessage({
      to: patientPhone,
      message
    });
  }
}
