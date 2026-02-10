/**
 * FisioFlow - Email Notifications Integration
 *
 * Integração com Gmail/SendGrid para notificações automatizadas
 * usando a skill gmail-automation via Rube MCP (Composio).
 *
 * Funcionalidades:
 * - Lembretes de agendamento
 * - Confirmações de consulta
 * - Avisos de falta/marcation
 * - Relatórios periódicos
 * - Comunicação com pacientes
 *
 * Baseado na claude-skills gmail-automation
 */

import { Resend } from 'resend';
import { format, addDays, addHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Tipos
export interface EmailConfig {
  provider: 'resend' | 'gmail' | 'sendgrid';
  apiKey?: string;
  from?: string;
  fromName?: string;
}

export interface AppointmentData {
  id: string;
  patientName: string;
  patientEmail: string;
  professionalName: string;
  start: Date;
  end: Date;
  type: string;
  location?: string;
  notes?: string;
  googleMeetLink?: string;
}

export interface PatientData {
  name: string;
  email: string;
  phone?: string;
}

/**
 * Classe para envio de emails
 */
export class EmailNotificationService {
  private resend: Resend | null = null;
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;

    if (config.provider === 'resend' && config.apiKey) {
      this.resend = new Resend(config.apiKey);
    }
  }

  /**
   * Envia email de confirmação de agendamento
   */
  async sendAppointmentConfirmation(appointment: AppointmentData): Promise<void> {
    const subject = `Confirmação de Agendamento - ${appointment.type}`;
    const html = this.getAppointmentConfirmationTemplate(appointment);

    await this.sendEmail({
      to: appointment.patientEmail,
      subject,
      html,
    });
  }

  /**
   * Envia lembrete de agendamento (24h antes)
   */
  async sendAppointmentReminder(appointment: AppointmentData): Promise<void> {
    const subject = `Lembrete: Sua consulta é amanhã - ${appointment.type}`;
    const html = this.getAppointmentReminderTemplate(appointment);

    await this.sendEmail({
      to: appointment.patientEmail,
      subject,
      html,
    });
  }

  /**
   * Envia lembrete de hoje (2h antes)
   */
  async sendSameDayReminder(appointment: AppointmentData): Promise<void> {
    const subject = `Lembrete: Sua consulta é hoje - ${appointment.type}`;
    const html = this.getSameDayReminderTemplate(appointment);

    await this.sendEmail({
      to: appointment.patientEmail,
      subject,
      html,
    });
  }

  /**
   * Envia aviso de falta/marcation
   */
  async sendNoShowNotice(appointment: AppointmentData): Promise<void> {
    const subject = `Ausência na consulta - ${format(appointment.start, 'dd/MM/yyyy')}`;
    const html = this.getNoShowTemplate(appointment);

    await this.sendEmail({
      to: appointment.patientEmail,
      subject,
      html,
    });
  }

  /**
   * Envida convite para telemedicina
   */
  async sendTelemedicineInvite(appointment: AppointmentData): Promise<void> {
    const subject = `Link para consulta online - ${appointment.type}`;
    const html = this.getTelemedicineInviteTemplate(appointment);

    await this.sendEmail({
      to: appointment.patientEmail,
      subject,
      html,
    });
  }

  /**
   * Envia relatório de evolução
   */
  async sendEvolutionReport(
    patient: PatientData,
    reportData: {
      period: { start: Date; end: Date };
      summary: string;
      nextAppointment?: Date;
      attachmentUrl?: string;
    }
  ): Promise<void> {
    const subject = `Relatório de Evolução - ${patient.name}`;
    const html = this.getEvolutionReportTemplate(patient, reportData);

    await this.sendEmail({
      to: patient.email,
      subject,
      html,
      attachments: reportData.attachmentUrl
        ? [{ filename: 'evolucao.pdf', path: reportData.attachmentUrl }]
        : undefined,
    });
  }

  /**
   * Envia email de boas-vindas
   */
  async sendWelcomeEmail(patient: PatientData): Promise<void> {
    const subject = 'Bem-vindo(a) ao FisioFlow';
    const html = this.getWelcomeTemplate(patient);

    await this.sendEmail({
      to: patient.email,
      subject,
      html,
    });
  }

  /**
   * Envia email de aniversário
   */
  async sendBirthdayEmail(patient: PatientData): Promise<void> {
    const subject = 'Feliz Aniversário! 🎉';
    const html = this.getBirthdayTemplate(patient);

    await this.sendEmail({
      to: patient.email,
      subject,
      html,
    });
  }

  /**
   * Envia relatório semanal para profissionais
   */
  async sendWeeklyReport(
    professionalEmail: string,
    data: {
      week: { start: Date; end: Date };
      totalAppointments: number;
      completedSessions: number;
      noShows: number;
      newPatients: number;
      revenue?: number;
    }
  ): Promise<void> {
    const subject = `Relatório Semanal - ${format(data.week.start, 'dd/MM')} a ${format(data.week.end, 'dd/MM')}`;
    const html = this.getWeeklyReportTemplate(professionalEmail, data);

    await this.sendEmail({
      to: professionalEmail,
      subject,
      html,
    });
  }

  /**
   * Método genérico de envio
   */
  private async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    attachments?: Array<{ filename: string; path: string }>;
  }): Promise<void> {
    if (this.config.provider === 'resend' && this.resend) {
      await this.resend.emails.send({
        from: this.config.from || 'FisioFlow <contato@fisioflow.com.br>',
        to: params.to,
        subject: params.subject,
        html: params.html,
        attachments: params.attachments,
      });
    } else {
      console.warn('Provider não configurado para envio de email');
      console.log('Email seria enviado:', params);
    }
  }

  // ==================== TEMPLATES ====================

  private getAppointmentConfirmationTemplate(data: AppointmentData): string {
    const dateStr = format(data.start, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    const timeStr = format(data.start, 'HH:mm');
    const endTimeStr = format(data.end, 'HH:mm');

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #005293 0%, #009688 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 28px; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .detail-row { display: flex; padding: 10px 0; border-bottom: 1px solid #eee; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { font-weight: bold; width: 140px; color: #005293; }
    .detail-value { flex: 1; }
    .button { display: inline-block; background: #005293; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Agendamento Confirmado</h1>
    </div>
    <div class="content">
      <p>Olá, <strong>${data.patientName}</strong>!</p>
      <p>Seu agendamento foi confirmado. Seguem os detalhes:</p>

      <div class="details">
        <div class="detail-row">
          <div class="detail-label">Tipo:</div>
          <div class="detail-value">${data.type}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Data:</div>
          <div class="detail-value">${dateStr}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Horário:</div>
          <div class="detail-value">${timeStr} às ${endTimeStr}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Profissional:</div>
          <div class="detail-value">${data.professionalName}</div>
        </div>
        ${data.location ? `
        <div class="detail-row">
          <div class="detail-label">Local:</div>
          <div class="detail-value">${data.location}</div>
        </div>
        ` : ''}
        ${data.googleMeetLink ? `
        <div class="detail-row">
          <div class="detail-label">Link da Sessão:</div>
          <div class="detail-value"><a href="${data.googleMeetLink}">Acessar Google Meet</a></div>
        </div>
        ` : ''}
      </div>

      ${data.googleMeetLink ? `
      <a href="${data.googleMeetLink}" class="button">Entrar na Sessão</a>
      ` : ''}

      ${data.notes ? `
      <p><strong>Observações:</strong> ${data.notes}</p>
      ` : ''}

      <p>Por favor, chegue com 15 minutos de antecedência.</p>
      <p>Se precisar reagendar, responda a este email ou entre em contato pelo telefone.</p>
    </div>
    <div class="footer">
      <p>Enviado pelo FisioFlow - Sistema de Gestão em Fisioterapia</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  private getAppointmentReminderTemplate(data: AppointmentData): string {
    const dateStr = format(data.start, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    const timeStr = format(data.start, 'HH:mm');

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 28px; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .reminder-box { background: #FFF3E0; border-left: 4px solid #FF9800; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔔 Lembrete de Consulta</h1>
    </div>
    <div class="content">
      <p>Olá, <strong>${data.patientName}</strong>!</p>

      <div class="reminder-box">
        <p style="margin: 0;">Sua consulta é <strong>amanhã</strong>, dia <strong>${dateStr}</strong>, às <strong>${timeStr}</strong>.</p>
      </div>

      <p>Não se esqueça de:</p>
      <ul>
        <li>Trazer documentos e exames recentes</li>
        <li>Chegar com 15 minutos de antecedência</li>
        <li>Vestir roupas confortáveis</li>
      </ul>

      ${data.googleMeetLink ? `
      <p>Para sua sessão online, <a href="${data.googleMeetLink}">clique aqui</a> para acessar a sala de espera.</p>
      ` : ''}

      <p>Se precisar reagendar, por favor nos avise com antecedência.</p>
    </div>
    <div class="footer">
      <p>Enviado pelo FisioFlow</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  private getSameDayReminderTemplate(data: AppointmentData): string {
    const timeStr = format(data.start, 'HH:mm');

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #005293; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 28px; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .time-box { text-align: center; font-size: 48px; font-weight: bold; color: #005293; padding: 20px; }
    .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Hoje é o dia!</h1>
    </div>
    <div class="content">
      <p>Olá, <strong>${data.patientName}</strong>!</p>
      <p>Sua consulta é hoje às:</p>
      <div class="time-box">${timeStr}</div>
      <p style="text-align: center;">com ${data.professionalName}</p>

      ${data.googleMeetLink ? `
      <p style="text-align: center; margin-top: 30px;">
        <a href="${data.googleMeetLink}" style="display: inline-block; background: #005293; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold;">Entrar na Chamada</a>
      </p>
      ` : ''}

      <p style="text-align: center; margin-top: 30px; font-size: 14px; color: #666;">
        Te esperamos lá! 💪
      </p>
    </div>
    <div class="footer">
      <p>Enviado pelo FisioFlow</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  private getNoShowTemplate(data: AppointmentData): string {
    const dateStr = format(data.start, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    const timeStr = format(data.start, 'HH:mm');

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #F44336; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 28px; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 Ausência Registrada</h1>
    </div>
    <div class="content">
      <p>Olá, <strong>${data.patientName}</strong>!</p>
      <p>Registramos sua ausência na consulta de hoje (${dateStr} às ${timeStr}).</p>

      <p>Compreendemos que imprevistos acontecem. Por favor, entre em contato para reagendar.</p>

      <p><strong>Para reagendar:</strong></p>
      <ul>
        <li>Responda a este email</li>
        <li>Ligue para nossa clínica</li>
        <li>Use o app do FisioFlow</li>
      </ul>

      <p>Estamos aguardando seu retorno para continuarmos seu tratamento!</p>
    </div>
    <div class="footer">
      <p>Enviado pelo FisioFlow</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  private getTelemedicineInviteTemplate(data: AppointmentData): string {
    const dateStr = format(data.start, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    const timeStr = format(data.start, 'HH:mm');

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 28px; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .video-link { text-align: center; margin: 30px 0; }
    .video-link a { display: inline-block; background: #9C27B0; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; }
    .instructions { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📹 Consulta Online</h1>
    </div>
    <div class="content">
      <p>Olá, <strong>${data.patientName}</strong>!</p>
      <p>Sua consulta online está agendada para:</p>
      <p style="text-align: center; font-size: 20px; color: #9C27B0; font-weight: bold;">
        ${dateStr} às ${timeStr}
      </p>

      <div class="video-link">
        <a href="${data.googleMeetLink}">🎥 Entrar na Sessão</a>
      </div>

      <div class="instructions">
        <h3 style="margin-top: 0;">📋 Como se preparar:</h3>
        <ul>
          <li>Use um computador, tablet ou celular com câmera</li>
          <li>Conecte-se 10 minutos antes para testar</li>
          <li>Escolha um local bem iluminado e silencioso</li>
          <li>Tenha à mão seus exames e relatórios recentes</li>
          <li>Use roupas confortáveis que permitam visualizar a região tratada</li>
        </ul>
      </div>

      <p>Às ${timeStr}, clique no botão acima para entrar na chamada.</p>
      <p>Qualquer dúvida, estamos à disposição!</p>
    </div>
    <div class="footer">
      <p>Enviado pelo FisioFlow</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  private getWelcomeTemplate(patient: PatientData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #005293 0%, #009688 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 28px; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .features { display: flex; gap: 20px; margin: 20px 0; }
    .feature { flex: 1; background: white; padding: 15px; border-radius: 8px; text-align: center; }
    .feature-icon { font-size: 32px; }
    .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>👋 Bem-vindo ao FisioFlow</h1>
    </div>
    <div class="content">
      <p>Olá, <strong>${patient.name}</strong>!</p>
      <p>É um prazer ter você conosco. Estamos aqui para ajudá-lo em sua jornada de recuperação e bem-estar.</p>

      <h3 style="color: #005293;">Com o FisioFlow, você pode:</h3>

      <div class="features">
        <div class="feature">
          <div class="feature-icon">📅</div>
          <p>Agendar consultas</p>
        </div>
        <div class="feature">
          <div class="feature-icon">📋</div>
          <p>Ver suas evoluções</p>
        </div>
        <div class="feature">
          <div class="feature-icon">💪</div>
          <p>Acessar exercícios</p>
        </div>
      </div>

      <p style="text-align: center;">
        <a href="https://app.fisioflow.com.br" style="display: inline-block; background: #005293; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">Acessar o App</a>
      </p>

      <p>Se tiver alguma dúvida, não hesite em entrar em contato conosco.</p>
    </div>
    <div class="footer">
      <p>Enviado pelo FisioFlow - Sistema de Gestão em Fisioterapia</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  private getBirthdayTemplate(patient: PatientData): string {
    const firstName = patient.name.split(' ')[0];

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #E91E63 0%, #9C27B0 100%); padding: 40px; border-radius: 10px 10px 0 0; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 36px; }
    .content { background: #f9f9f9; padding: 40px; border-radius: 0 0 10px 10px; text-align: center; }
    .cake { font-size: 72px; margin-bottom: 20px; }
    .message { font-size: 18px; line-height: 1.8; }
    .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="cake">🎂</div>
      <h1>Feliz Aniversário!</h1>
    </div>
    <div class="content">
      <p class="message">
        Parabéns, <strong>${firstName}</strong>! 🎉<br><br>
        Que este novo ciclo traga muita saúde, paz e realizações.<br>
        É um privilégio fazer parte da sua jornada de bem-estar.<br><br>
        Desejamos a você um ano fantástico! 💪✨
      </p>
    </div>
    <div class="footer">
      <p>Com carinho, Equipe FisioFlow</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  private getEvolutionReportTemplate(
    patient: PatientData,
    data: {
      period: { start: Date; end: Date };
      summary: string;
      nextAppointment?: Date;
    }
  ): string {
    const periodStr = `${format(data.period.start, 'dd/MM')} a ${format(data.period.end, 'dd/MM/yyyy')}`;

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #005293; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 28px; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .summary-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #009688; }
    .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Relatório de Evolução</h1>
    </div>
    <div class="content">
      <p>Olá, <strong>${patient.name}</strong>!</p>
      <p>Segue seu relatório de evolução do período de <strong>${periodStr}</strong>:</p>

      <div class="summary-box">
        <strong>Resumo:</strong><br>
        ${data.summary}
      </div>

      ${data.nextAppointment ? `
      <p style="text-align: center; color: #005293; font-weight: bold;">
        Próxima consulta: ${format(data.nextAppointment, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
      </p>
      ` : ''}

      <p>Continue se dedicando ao tratamento. Cada dia é um passo a mais em direção aos seus objetivos!</p>
    </div>
    <div class="footer">
      <p>Enviado pelo FisioFlow</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  private getWeeklyReportTemplate(
    email: string,
    data: {
      week: { start: Date; end: Date };
      totalAppointments: number;
      completedSessions: number;
      noShows: newPatients: number;
      revenue?: number;
    }
  ): string {
    const weekStr = `${format(data.week.start, 'dd/MM')} a ${format(data.week.end, 'dd/MM')}`;
    const completionRate = data.totalAppointments > 0
      ? Math.round((data.completedSessions / data.totalAppointments) * 100)
      : 0;

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #005293; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 28px; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .stats { display: flex; gap: 10px; margin: 20px 0; }
    .stat { flex: 1; background: white; padding: 15px; border-radius: 8px; text-align: center; }
    .stat-value { font-size: 32px; font-weight: bold; color: #005293; }
    .stat-label { font-size: 14px; color: #666; }
    .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📈 Relatório Semanal</h1>
    </div>
    <div class="content">
      <p style="text-align: center;">Semana de <strong>${weekStr}</strong></p>

      <div class="stats">
        <div class="stat">
          <div class="stat-value">${data.totalAppointments}</div>
          <div class="stat-label">Agendamentos</div>
        </div>
        <div class="stat">
          <div class="stat-value">${data.completedSessions}</div>
          <div class="stat-label">Realizados</div>
        </div>
        <div class="stat">
          <div class="stat-value">${completionRate}%</div>
          <div class="stat-label">Taxa de Comparecimento</div>
        </div>
      </div>

      <div class="stats">
        <div class="stat">
          <div class="stat-value">${data.newPatients}</div>
          <div class="stat-label">Novos Pacientes</div>
        </div>
        ${data.revenue !== undefined ? `
        <div class="stat">
          <div class="stat-value">R$${data.revenue.toLocaleString('pt-BR')}</div>
          <div class="stat-label">Receita</div>
        </div>
        ` : ''}
      </div>

      <p style="text-align: center; color: #666; font-size: 14px;">
        Acesso o relatório completo no app FisioFlow.
      </p>
    </div>
    <div class="footer">
      <p>Enviado pelo FisioFlow</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }
}

/**
 * Factory para criar serviço de email
 */
export class EmailServiceFactory {
  static create(config: EmailConfig): EmailNotificationService {
    return new EmailNotificationService(config);
  }

  static async createFromEnv(): Promise<EmailNotificationService> {
    const provider = (process.env.EMAIL_PROVIDER || 'resend') as 'resend' | 'gmail' | 'sendgrid';
    const apiKey = process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY;
    const from = process.env.EMAIL_FROM || 'contato@fisioflow.com.br';
    const fromName = process.env.EMAIL_FROM_NAME || 'FisioFlow';

    return new EmailNotificationService({
      provider,
      apiKey,
      from,
      fromName,
    });
  }
}
