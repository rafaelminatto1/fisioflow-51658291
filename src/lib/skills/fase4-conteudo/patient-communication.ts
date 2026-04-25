/**
 * FisioFlow - Patient Communication Automation
 *
 * Sistema de comunicação automatizada com pacientes
 *
 * Funcionalidades:
 * - Envio de mensagens via WhatsApp
 * - Campanhas de engajamento
 * - Lembretes de exercícios domiciliares
 * - Pesquisas de satisfação
 * - Mensagens de reativação
 */

import { format, addDays, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

// Tipos
export interface WhatsAppMessage {
  to: string; // número com DDI
  message: string;
  scheduledFor?: Date;
  mediaUrl?: string;
}

export interface CampaignData {
  name: string;
  targetAudience: {
    status?: "active" | "inactive" | "new";
    lastAppointment?: { before: Date; after: Date };
    tags?: string[];
  };
  message: string;
  schedule?: {
    startDate: Date;
    endDate?: Date;
    sendTime: string; // HH:mm
  };
}

export interface ExerciseReminder {
  patientName: string;
  patientPhone: string;
  exercises: Array<{
    name: string;
    sets: number;
    reps: string;
    observations?: string;
  }>;
  frequency: "daily" | "weekly";
  notes?: string;
}

export interface SatisfactionSurvey {
  patientName: string;
  patientPhone: string;
  appointmentDate: Date;
  professionalName: string;
  clinicName: string;
}

/**
 * Classe de comunicação com pacientes
 */
export class PatientCommunicationService {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    // Configuração para APIs de WhatsApp (Twilio, Z-API, etc.)
    this.apiKey = apiKey || process.env.WHATSAPP_API_KEY || "";
    this.baseUrl = process.env.WHATSAPP_API_URL || "";
  }

  /**
   * Envia mensagem via WhatsApp
   */
  async sendWhatsAppMessage(message: WhatsAppMessage): Promise<void> {
    if (!this.apiKey) {
      console.log("API do WhatsApp não configurada. Mensagem seria enviada:", message);
      return;
    }

    try {
      await fetch(`${this.baseUrl}/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          number: this.formatPhoneNumber(message.to),
          message: message.message,
          mediaUrl: message.mediaUrl,
          scheduledAt: message.scheduledFor?.toISOString(),
        }),
      });
    } catch (error) {
      console.error("Erro ao enviar mensagem WhatsApp:", error);
      throw error;
    }
  }

  /**
   * Formata número de telefone
   */
  private formatPhoneNumber(phone: string): string {
    // Remove caracteres não numéricos
    let cleaned = phone.replace(/\D/g, "");

    // Se não tiver DDI, adiciona +55 (Brasil)
    if (!cleaned.startsWith("55") && cleaned.length === 11) {
      cleaned = "55" + cleaned;
    }

    return `+${cleaned}`;
  }

  /**
   * Envia lembrete de exercícios domiciliares
   */
  async sendExerciseReminder(data: ExerciseReminder): Promise<void> {
    const message = this.buildExerciseReminderMessage(data);
    await this.sendWhatsAppMessage({
      to: data.patientPhone,
      message,
    });
  }

  /**
   * Constrói mensagem de lembrete de exercícios
   */
  private buildExerciseReminderMessage(data: ExerciseReminder): string {
    const greeting =
      data.frequency === "daily"
        ? `Olá, ${data.patientName}! 💪 É hora de fazer seus exercícios de hoje!`
        : `Olá, ${data.patientName}! 💪 Não esqueça de fazer seus exercícios semanais!`;

    let message = `${greeting}\n\n📋 *Exercícios de Hoje:*\n\n`;

    data.exercises.forEach((exercise, index) => {
      message += `${index + 1}. *${exercise.name}*\n`;
      message += `   Séries: ${exercise.sets} | Repetições: ${exercise.reps}\n`;
      if (exercise.observations) {
        message += `   Obs: ${exercise.observations}\n`;
      }
      message += "\n";
    });

    if (data.notes) {
      message += `📝 *Nota:* ${data.notes}\n\n`;
    }

    message += `Lembre-se: a constância é a chave para sua recuperação! 🎯\n\n`;
    message += `_Enviado pelo FisioFlow_`;

    return message;
  }

  /**
   * Envia pesquisa de satisfação
   */
  async sendSatisfactionSurvey(survey: SatisfactionSurvey): Promise<void> {
    const message = this.buildSatisfactionSurveyMessage(survey);
    await this.sendWhatsAppMessage({
      to: survey.patientPhone,
      message,
    });
  }

  /**
   * Constrói mensagem de pesquisa de satisfação
   */
  private buildSatisfactionSurveyMessage(data: SatisfactionSurvey): string {
    const dateStr = format(data.appointmentDate, "dd 'de' MMMM", {
      locale: ptBR,
    });

    let message = `Olá, ${data.patientName}! 👋\n\n`;
    message += `Gostaríamos de saber sua opinião sobre a consulta de ${dateStr} com ${data.professionalName}.\n\n`;
    message += `*Sua opinião é muito importante para nós!*\n\n`;
    message += `Por favor, avalie de 1 a 5 estrelas:\n\n`;
    message += `⭐ Atendimento do profissional\n`;
    message += `⭐ Limpeza e organização da clínica\n`;
    message += `⭐ Facilidade de agendamento\n`;
    message += `⭐ Clareza das orientações\n\n`;
    message += `Pode responder diretamente aqui! 😊\n\n`;
    message += `Muito obrigado!\n`;
    message += `Equipe ${data.clinicName}\n\n`;
    message += `_Enviado pelo FisioFlow_`;

    return message;
  }

  /**
   * Envia mensagem de reativação para pacientes inativos
   */
  async sendReactivationMessage(patient: {
    name: string;
    phone: string;
    lastAppointment: Date;
    clinicName: string;
  }): Promise<void> {
    const daysSinceLastVisit = differenceInDays(new Date(), patient.lastAppointment);
    let message = "";

    if (daysSinceLastVisit > 60 && daysSinceLastVisit <= 90) {
      // 2-3 meses
      message = `Olá, ${patient.name}! 👋\n\n`;
      message += `Sentimos sua falta! Já faz ${Math.floor(daysSinceLastVisit / 30)} meses desde sua última consulta.\n\n`;
      message += `Como está se sentindo? Queremos saber como está sua evolução!\n\n`;
      message += `Gostaria de agendar uma retorno? 📅\n\n`;
      message += `Estamos aqui para você! 💪\n\n`;
      message += `_Enviado pelo ${patient.clinameName}_`;
    } else if (daysSinceLastVisit > 90 && daysSinceLastVisit <= 180) {
      // 3-6 meses
      message = `Olá, ${patient.name}! 👋\n\n`;
      message += `Esperamos que esteja tudo bem! 😊\n\n`;
      message += `Faz um tempinho que não vemos você por aqui. `;
      message += `Queremos convidar você para retornar às sessões.\n\n`;
      message += `Estamos com horários disponíveis! 🕐\n\n`;
      message += `_Enviado pelo ${patient.clinicName}_`;
    } else {
      // +6 meses
      message = `Olá, ${patient.name}! 👋\n\n`;
      message += `Tem sido um tempo! Esperamos que esteja bem.\n\n`;
      message += `Gostaríamos muito de rever você na ${patient.clinicName}. `;
      message += `Tem alguma necessidade que podemos ajudar?\n\n`;
      message += `Responda esta mensagem para conversarmos! 💬\n\n`;
      message += `_Enviado pelo ${patient.clinicName}_`;
    }

    await this.sendWhatsAppMessage({
      to: patient.phone,
      message,
    });
  }

  /**
   * Envia mensagem de aniversário
   */
  async sendBirthdayMessage(patient: {
    name: string;
    phone: string;
    clinicName: string;
  }): Promise<void> {
    const message =
      `Parabéns, ${patient.name}! 🎂🎉\n\n` +
      `Que este novo ciclo traga muita saúde, paz e alegria! 🌟\n\n` +
      `Muitos parabéns do time ${patient.clinicName}! 💪\n\n` +
      `_Enviado pelo FisioFlow_`;

    await this.sendWhatsAppMessage({
      to: patient.phone,
      message,
    });
  }

  /**
   * Envia mensagem de Feliz Natal/Ano Novo
   */
  async sendHolidayMessage(
    patient: { name: string; phone: string },
    holiday: "natal" | "ano_novo",
  ): Promise<void> {
    let message = "";

    if (holiday === "natal") {
      message = `🎄 Boas Festas, ${patient.name}!\n\n`;
      message += `Que o Natal traga paz, amor e renovo para você e sua família. 🎁\n\n`;
      message += `Desejamos um 2025 incrível! ✨\n\n`;
      message += `_Enviado pelo FisioFlow_`;
    } else {
      message = `🎊 Feliz Ano Novo, ${patient.name}!\n\n`;
      message += `Que 2025 seja um ano de muita saúde, conquistas e realizações! 💪\n\n`;
      message += `Comece o ano se cuidando bem! Estamos aqui para isso. 🌟\n\n`;
      message += `_Enviado pelo FisioFlow_`;
    }

    await this.sendWhatsAppMessage({
      to: patient.phone,
      message,
    });
  }

  /**
   * Envia campanha em massa
   */
  async sendCampaign(
    campaign: CampaignData,
    patients: Array<{ name: string; phone: string }>,
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const patient of patients) {
      try {
        const personalizedMessage = this.personalizeMessage(campaign.message, patient);
        await this.sendWhatsAppMessage({
          to: patient.phone,
          message: personalizedMessage,
          scheduledFor: campaign.schedule?.startDate,
        });
        sent++;
      } catch (error) {
        console.error(`Erro ao enviar para ${patient.name}:`, error);
        failed++;
      }
    }

    return { sent, failed };
  }

  /**
   * Personaliza mensagem com nome do paciente
   */
  private personalizeMessage(template: string, patient: { name: string }): string {
    const firstName = patient.name.split(" ")[0];
    return template
      .replace(/\{nome\}/g, patient.name)
      .replace(/\{primeiro_nome\}/g, firstName)
      .replace(/\{Nome\}/g, patient.name)
      .replace(/\{Primeiro_Nome\}/g, firstName);
  }

  /**
   * Envia lembrete de agendamento
   */
  async sendAppointmentReminder(appointment: {
    patientName: string;
    patientPhone: string;
    date: Date;
    time: string;
    professionalName: string;
    type: string;
  }): Promise<void> {
    const dateStr = format(appointment.date, "dd 'de' MMMM", { locale: ptBR });

    let message = `🔔 Olá, ${appointment.patientName}! Lembrete de agendamento\n\n`;
    message += `Data: ${dateStr}\n`;
    message += `Horário: ${appointment.time}\n`;
    message += `Profissional: ${appointment.professionalName}\n`;
    message += `Tipo: ${appointment.type}\n\n`;
    message += `Por favor, chegue com 15 minutos de antecedência.\n\n`;
    message += `Se precisar reagendar, responda esta mensagem. 👇\n\n`;
    message += `_Enviado pelo FisioFlow_`;

    await this.sendWhatsAppMessage({
      to: appointment.patientPhone,
      message,
    });
  }

  /**
   * Envia mensagem de confirmação de agendamento
   */
  async sendAppointmentConfirmation(appointment: {
    patientName: string;
    patientPhone: string;
    date: Date;
    time: string;
    professionalName: string;
    type: string;
    location?: string;
  }): Promise<void> {
    const dateStr = format(appointment.date, "dd 'de' MMMM 'de' yyyy", {
      locale: ptBR,
    });

    let message = `✅ Agendamento Confirmado!\n\n`;
    message += `Olá, ${appointment.patientName}!\n\n`;
    message += `Seu agendamento foi confirmado:\n\n`;
    message += `📅 Data: ${dateStr}\n`;
    message += `🕐 Horário: ${appointment.time}\n`;
    message += `👨‍⚕️ Profissional: ${appointment.professionalName}\n`;
    message += `🏥 Tipo: ${appointment.type}\n`;

    if (appointment.location) {
      message += `📍 Local: ${appointment.location}\n`;
    }

    message += `\nTe esperamos lá! 💪\n\n`;
    message += `_Enviado pelo FisioFlow_`;

    await this.sendWhatsAppMessage({
      to: appointment.patientPhone,
      message,
    });
  }

  /**
   * Cria campanhas pré-definidas
   */
  static getPredefinedCampaigns(): Record<string, CampaignData> {
    return {
      reactivation_30d: {
        name: "Reativação 30 dias",
        targetAudience: {
          status: "inactive",
          lastAppointment: { before: addDays(new Date(), -30) },
        },
        message:
          "Olá, {primeiro_nome}! Sentimos sua falta. Como está sua recuperação? Gostaria de agendar uma retorno?",
      },
      reactivation_60d: {
        name: "Reativação 60 dias",
        targetAudience: {
          status: "inactive",
          lastAppointment: { before: addDays(new Date(), -60) },
        },
        message:
          "Olá, {primeiro_nome}! Já faz um tempinho que não vemos você. Estamos com novidades nos tratamentos. Quer voltar?",
      },
      injury_prevention: {
        name: "Prevenção de Lesões",
        targetAudience: { tags: ["esporte", "ativa"] },
        message:
          "Dica da semana: Aqueça sempre antes de exercícios! 5 minutos de aquecimento previnem 80% das lesões. 💪 Quer saber mais?",
      },
      home_exercises: {
        name: "Exercícios em Casa",
        targetAudience: { status: "active" },
        message:
          "Dica da fisio: Alongue-se por 2 minutos a cada hora de trabalho. Suas costas agradecem! 😊",
      },
    };
  }

  /**
   * Valida número de telefone
   */
  static validatePhoneNumber(phone: string): boolean {
    const cleaned = phone.replace(/\D/g, "");
    return cleaned.length >= 10 && cleaned.length <= 13;
  }

  /**
   * Verifica se pode enviar mensagem (horários permitidos)
   */
  static canSendMessage(now: Date = new Date()): boolean {
    const hour = now.getHours();
    const day = now.getDay();

    // Não enviar domingos
    if (day === 0) return false;

    // Apenas entre 8h e 20h
    return hour >= 8 && hour < 20;
  }

  /**
   * Agenda mensagem para horário permitido
   */
  scheduleForAllowedTime(message: WhatsAppMessage, now: Date = new Date()): Date {
    const canSendNow = PatientCommunicationService.canSendMessage(now);

    if (canSendNow) {
      return now;
    }

    // Agendar para o próximo dia útil às 9h
    const scheduled = new Date(now);
    scheduled.setHours(9, 0, 0, 0);

    // Se for domingo, vai para segunda
    if (scheduled.getDay() === 0) {
      scheduled.setDate(scheduled.getDate() + 1);
    }

    // Se for depois das 20h, vai para o próximo dia
    if (now.getHours() >= 20) {
      scheduled.setDate(scheduled.getDate() + 1);
    }

    return scheduled;
  }
}

/**
 * Factory para criar serviço de comunicação
 */
export class PatientCommunicationFactory {
  static create(apiKey?: string): PatientCommunicationService {
    return new PatientCommunicationService(apiKey);
  }

  static async createFromEnv(): Promise<PatientCommunicationService> {
    const apiKey = process.env.WHATSAPP_API_KEY;

    return new PatientCommunicationService(apiKey);
  }
}

// Exportar tipos
export type { WhatsAppMessage, CampaignData, ExerciseReminder, SatisfactionSurvey };
