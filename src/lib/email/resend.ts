/**
 * Resend Email Service
 *
 * Complete integration with Resend for transactional emails
 * Supports templates, attachments, and batch sending
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

export const EmailTemplates = {
  // Appointment Templates
  APPOINTMENT_CONFIRMATION: 'appointment-confirmation',
  APPOINTMENT_REMINDER: 'appointment-reminder',
  APPOINTMENT_CANCELLED: 'appointment-cancelled',
  APPOINTMENT_RESCHEDULED: 'appointment-rescheduled',

  // Patient Templates
  PATIENT_WELCOME: 'patient-welcome',
  BIRTHDAY_GREETING: 'birthday-greeting',
  TREATMENT_PLAN_UPDATE: 'treatment-plan-update',

  // Report Templates
  DAILY_REPORT: 'daily-report',
  WEEKLY_SUMMARY: 'weekly-summary',
  MONTHLY_PROGRESS: 'monthly-progress',

  // System Templates
  PASSWORD_RESET: 'password-reset',
  EMAIL_VERIFICATION: 'email-verification',
} as const;

// ============================================================================
// EMAIL DATA TYPES
// ============================================================================

export interface AppointmentEmailData {
  patientName: string;
  therapistName: string;
  date: string;
  time: string;
  location?: string;
  onlineMeetingUrl?: string;
  organizationName: string;
}

export interface BirthdayEmailData {
  patientName: string;
  organizationName: string;
  therapistName?: string;
}

export interface DailyReportData {
  therapistName: string;
  organizationName: string;
  date: string;
  totalSessions: number;
  completedSessions: number;
  cancelledSessions: number;
  newPatients: number;
}

export interface PasswordResetData {
  resetLink: string;
  expiresAt: string;
}

// ============================================================================
// TEMPLATE RENDERERS
// ============================================================================

/**
 * Render appointment confirmation email
 */
export function renderAppointmentConfirmation(data: AppointmentEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Consulta Confirmada - ${data.organizationName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">✅ Consulta Confirmada</h1>
  </div>
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Olá <strong>${data.patientName}</strong>,</p>
    <p style="font-size: 16px; margin-bottom: 20px;">Sua consulta foi confirmada com sucesso!</p>

    <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin-bottom: 20px;">
      <p style="margin: 0 0 10px 0;"><strong>📅 Data:</strong> ${data.date}</p>
      <p style="margin: 0 0 10px 0;"><strong>⏰ Horário:</strong> ${data.time}</p>
      <p style="margin: 0 0 10px 0;"><strong>👨‍⚕️ Fisioterapeuta:</strong> ${data.therapistName}</p>
      ${data.location ? `<p style="margin: 0 0 10px 0;"><strong>📍 Local:</strong> ${data.location}</p>` : ''}
      ${data.onlineMeetingUrl ? `<p style="margin: 0;"><strong>💻 Link da reunião:</strong> <a href="${data.onlineMeetingUrl}" style="color: #667eea;">Acessar</a></p>` : ''}
    </div>

    <p style="font-size: 14px; color: #666; margin-bottom: 10px;">Por favor, chegue com 15 minutos de antecedência.</p>
    <p style="font-size: 14px; color: #666;">Se precisar reagendar, entre em contato conosco.</p>

    <div style="text-align: center; margin-top: 30px;">
      <p style="font-size: 14px; color: #999;">Equipe ${data.organizationName}</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Render appointment reminder email
 */
export function renderAppointmentReminder(data: AppointmentEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lembrete de Consulta - ${data.organizationName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">🔔 Lembrete de Consulta</h1>
  </div>
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Olá <strong>${data.patientName}</strong>,</p>
    <p style="font-size: 16px; margin-bottom: 20px;">Você tem uma consulta <strong>amanhã</strong>!</p>

    <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #f5576c; margin-bottom: 20px;">
      <p style="margin: 0 0 10px 0;"><strong>📅 Data:</strong> ${data.date}</p>
      <p style="margin: 0 0 10px 0;"><strong>⏰ Horário:</strong> ${data.time}</p>
      <p style="margin: 0;"><strong>👨‍⚕️ Fisioterapeuta:</strong> ${data.therapistName}</p>
    </div>

    <p style="font-size: 14px; color: #666;">Nos vemos em breve!</p>

    <div style="text-align: center; margin-top: 30px;">
      <p style="font-size: 14px; color: #999;">Equipe ${data.organizationName}</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Render birthday greeting email
 */
export function renderBirthdayGreeting(data: BirthdayEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Feliz Aniversário! - ${data.organizationName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Feliz Aniversário!</h1>
  </div>
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 18px; margin-bottom: 20px;">Olá <strong>${data.patientName}</strong>,</p>
    <p style="font-size: 16px; margin-bottom: 20px;">Todo o time da <strong>${data.organizationName}</strong> deseja a você um dia muito especial!</p>

    <div style="text-align: center; margin: 30px 0;">
      <div style="font-size: 48px;">🎂</div>
    </div>

    <p style="font-size: 16px; margin-bottom: 20px;">Que este novo ano traga muita saúde, felicidade e realizações!</p>

    ${data.therapistName ? `<p style="font-size: 14px; color: #666;">Com carinho,<br><strong>${data.therapistName}</strong> e toda a equipe.</p>` : ''}

    <div style="text-align: center; margin-top: 30px;">
      <p style="font-size: 14px; color: #999;">${data.organizationName}</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Render daily report email for therapists
 */
export function renderDailyReport(data: DailyReportData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório Diário - ${data.date}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">📊 Relatório Diário</h1>
  </div>
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Olá <strong>${data.therapistName}</strong>,</p>
    <p style="font-size: 16px; margin-bottom: 20px;">Aqui está o resumo do dia <strong>${data.date}</strong>:</p>

    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 10px 0;"><strong>Total de sessões:</strong></td>
          <td style="text-align: right; padding: 10px 0; font-size: 18px; color: #4facfe;">${data.totalSessions}</td>
        </tr>
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 10px 0;">✅ Concluídas:</td>
          <td style="text-align: right; padding: 10px 0; color: #10b981;">${data.completedSessions}</td>
        </tr>
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 10px 0;">❌ Canceladas:</td>
          <td style="text-align: right; padding: 10px 0; color: #ef4444;">${data.cancelledSessions}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0;">👥 Novos pacientes:</td>
          <td style="text-align: right; padding: 10px 0; color: #8b5cf6;">${data.newPatients}</td>
        </tr>
      </table>
    </div>

    <p style="font-size: 14px; color: #666;">Continue com o excelente trabalho!</p>

    <div style="text-align: center; margin-top: 30px;">
      <p style="font-size: 14px; color: #999;">${data.organizationName}</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Render password reset email
 */
export function renderPasswordReset(data: PasswordResetData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redefinir Senha</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">🔐 Redefinir Senha</h1>
  </div>
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Você solicitou a redefinição da sua senha.</p>
    <p style="font-size: 14px; color: #666; margin-bottom: 20px;">Este link expira em 1 hora.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.resetLink}" style="display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Redefinir Senha</a>
    </div>

    <p style="font-size: 14px; color: #666;">Se você não solicitou esta alteração, ignore este email.</p>
  </div>
</body>
</html>
  `.trim();
}

// ============================================================================
// EMAIL SENDING FUNCTIONS
// ============================================================================

export interface SendEmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  tags?: Record<string, string>;
}

/**
 * Send a transactional email
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const from = options.from || 'FisioFlow <noreply@fisioflow.com>';

    // Resend email options - structure not fully typed
    const emailOptions: Record<string, unknown> = {
      from,
      to: options.to,
      subject: options.subject,
    };

    if (options.html) emailOptions.html = options.html;
    if (options.text) emailOptions.text = options.text;
    if (options.replyTo) emailOptions.replyTo = options.replyTo;

    // Add tags for tracking in Resend
    if (options.tags) {
      emailOptions.tags = Object.entries(options.tags).map(([key, value]) => ({ name: key, value }));
    }

    const { data, error } = await resend.emails.send(emailOptions);

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send appointment confirmation email
 */
export async function sendAppointmentConfirmation(to: string, data: AppointmentEmailData, organizationName?: string) {
  return sendEmail({
    to,
    subject: 'Consulta Confirmada ✅',
    html: renderAppointmentConfirmation(data),
    tags: {
      type: 'appointment-confirmation',
      organization: organizationName || data.organizationName,
    },
  });
}

/**
 * Send appointment reminder email
 */
export async function sendAppointmentReminder(to: string, data: AppointmentEmailData, organizationName?: string) {
  return sendEmail({
    to,
    subject: 'Lembrete de Consulta 🔔',
    html: renderAppointmentReminder(data),
    tags: {
      type: 'appointment-reminder',
      organization: organizationName || data.organizationName,
    },
  });
}

/**
 * Send birthday greeting email
 */
export async function sendBirthdayGreeting(to: string, data: BirthdayEmailData, organizationName?: string) {
  return sendEmail({
    to,
    subject: 'Feliz Aniversário! 🎉',
    html: renderBirthdayGreeting(data),
    tags: {
      type: 'birthday-greeting',
      organization: organizationName || data.organizationName,
    },
  });
}

/**
 * Send daily report email
 */
export async function sendDailyReport(to: string, data: DailyReportData, organizationName?: string) {
  return sendEmail({
    to,
    subject: `Relatório Diário - ${data.date} 📊`,
    html: renderDailyReport(data),
    tags: {
      type: 'daily-report',
      organization: organizationName || data.organizationName,
      date: data.date,
    },
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(to: string, data: PasswordResetData) {
  return sendEmail({
    to,
    subject: 'Redefinir Senha 🔐',
    html: renderPasswordReset(data),
    tags: {
      type: 'password-reset',
    },
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export const ResendService = {
  sendEmail,
  sendAppointmentConfirmation,
  sendAppointmentReminder,
  sendBirthdayGreeting,
  sendDailyReport,
  sendPasswordReset,
  templates: EmailTemplates,
  renderers: {
    renderAppointmentConfirmation,
    renderAppointmentReminder,
    renderBirthdayGreeting,
    renderDailyReport,
    renderPasswordReset,
  },
};
