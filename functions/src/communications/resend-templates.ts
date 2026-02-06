/**
 * Resend Email Templates and Service
 *
 * Centralized email service using Resend for all transactional emails
 *
 * @module communications/resend-templates
 */


// Resend instance

import { Resend } from 'resend';
import { RESEND_API_KEY_SECRET } from '../init';
import * as logger from 'firebase-functions/logger';

let resendInstance: Resend | null = null;

const getResend = (): Resend => {
  if (!resendInstance) {
    const apiKey = RESEND_API_KEY_SECRET.value();
    if (!apiKey) {
      throw new Error('RESEND_API_KEY not configured in Secret Manager');
    }
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
};

// Default from email
const FROM_EMAIL = 'FisioFlow <contato@moocafisio.com.br>';

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

/**
 * Template for daily report email
 */
export const getDailyReportTemplate = (data: {
  therapistName: string;
  organizationName: string;
  date: string;
  totalSessions: number;
  totalAppointments: number;
  completedSessions: number;
  draftSessions: number;
  appointmentsByStatus: Record<string, number>;
}): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório Diário - ${data.organizationName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; }
    .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
    .stat-card { background: white; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #e5e7eb; }
    .stat-value { font-size: 32px; font-weight: bold; color: #7c3aed; }
    .stat-label { font-size: 14px; color: #6b7280; margin-top: 5px; }
    .section { margin: 30px 0; }
    .section-title { font-size: 18px; font-weight: 600; color: #1f2937; margin-bottom: 15px; border-bottom: 2px solid #7c3aed; padding-bottom: 10px; }
    .status-list { list-style: none; padding: 0; }
    .status-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .status-item:last-child { border-bottom: none; }
    .status-label { color: #6b7280; }
    .status-count { font-weight: 600; color: #1f2937; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
    .positive { color: #10b981; }
    .warning { color: #f59e0b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Relatório Diário</h1>
      <p style="margin: 5px 0 0 0; opacity: 0.9;">${data.organizationName}</p>
    </div>
    <div class="content">
      <p style="text-align: center; color: #6b7280; margin-bottom: 20px;">
        <strong>Data:</strong> ${formatDate(data.date)}
      </p>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${data.totalSessions}</div>
          <div class="stat-label">Sessões Realizadas</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${data.totalAppointments}</div>
          <div class="stat-label">Agendamentos</div>
        </div>
        <div class="stat-card">
          <div class="stat-value positive">${data.completedSessions}</div>
          <div class="stat-label">Finalizadas</div>
        </div>
        <div class="stat-card">
          <div class="stat-value warning">${data.draftSessions}</div>
          <div class="stat-label">Em Rascunho</div>
        </div>
      </div>

      <div class="section">
        <h3 class="section-title">Status dos Agendamentos</h3>
        <ul class="status-list">
          ${Object.entries(data.appointmentsByStatus).map(([status, count]) => `
            <li class="status-item">
              <span class="status-label">${formatStatus(status)}</span>
              <span class="status-count">${count}</span>
            </li>
          `).join('')}
        </ul>
      </div>

      <div class="footer">
        <p>© ${new Date().getFullYear()} ${data.organizationName}. Todos os direitos reservados.</p>
        <p style="margin-top: 10px;">
          <a href="https://fisioflow-migration.web.app" style="color: #7c3aed; text-decoration: none;">Acessar FisioFlow</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`;

/**
 * Template for weekly summary email
 */
export const getWeeklySummaryTemplate = (data: {
  therapistName: string;
  organizationName: string;
  weekStart: string;
  weekEnd: string;
  totalSessions: number;
  totalAppointments: number;
  completedSessions: number;
  completedAppointments: number;
  cancelledAppointments: number;
  missedAppointments: number;
}): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resumo Semanal - ${data.organizationName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; }
    .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
    .stat-card { background: white; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #e5e7eb; }
    .stat-value { font-size: 32px; font-weight: bold; color: #7c3aed; }
    .stat-label { font-size: 14px; color: #6b7280; margin-top: 5px; }
    .highlight-box { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
    .highlight-box h3 { margin: 0 0 10px 0; color: #92400e; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📈 Resumo Semanal</h1>
      <p style="margin: 5px 0 0 0; opacity: 0.9;">${data.organizationName}</p>
    </div>
    <div class="content">
      <p style="text-align: center; color: #6b7280; margin-bottom: 20px;">
        <strong>Semana:</strong> ${formatDate(data.weekStart)} a ${formatDate(data.weekEnd)}
      </p>

      <div class="highlight-box">
        <h3>🏆 Destaque da Semana</h3>
        <p style="margin: 0; font-size: 18px; color: #92400e;">
          ${data.completedSessions} sessões finalizadas
        </p>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${data.totalSessions}</div>
          <div class="stat-label">Sessões Totais</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${data.totalAppointments}</div>
          <div class="stat-label">Agendamentos</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color: #10b981;">${data.completedAppointments}</div>
          <div class="stat-label">Compareceram</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color: #ef4444;">${data.missedAppointments}</div>
          <div class="stat-label">Faltaram</div>
        </div>
      </div>

      <div class="footer">
        <p>© ${new Date().getFullYear()} ${data.organizationName}. Todos os direitos reservados.</p>
        <p style="margin-top: 10px;">
          <a href="https://fisioflow-migration.web.app" style="color: #7c3aed; text-decoration: none;">Acessar FisioFlow</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`;

/**
 * Template for appointment confirmation
 */
export const getAppointmentConfirmationTemplate = (data: {
  patientName: string;
  therapistName: string;
  date: string;
  time: string;
  clinicName: string;
  clinicAddress?: string;
}): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Agendamento Confirmado</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; }
    .appointment-card { background: white; padding: 25px; border-radius: 12px; border-left: 5px solid #10b981; margin: 20px 0; }
    .appointment-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
    .appointment-row:last-child { border-bottom: none; }
    .label { color: #6b7280; font-weight: 500; }
    .value { font-weight: 600; color: #1f2937; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">✅ Agendamento Confirmado</h1>
    </div>
    <div class="content">
      <p style="font-size: 16px; color: #374151;">Olá, <strong>${data.patientName}</strong>!</p>
      <p style="color: #6b7280;">Seu agendamento foi confirmado com sucesso. Seguem os detalhes:</p>

      <div class="appointment-card">
        <div class="appointment-row">
          <span class="label">📅 Data</span>
          <span class="value">${formatDate(data.date)}</span>
        </div>
        <div class="appointment-row">
          <span class="label">⏰ Horário</span>
          <span class="value">${data.time}</span>
        </div>
        <div class="appointment-row">
          <span class="label">👨‍⚕️ Terapeuta</span>
          <span class="value">${data.therapistName}</span>
        </div>
        <div class="appointment-row">
          <span class="label">🏥 Clínica</span>
          <span class="value">${data.clinicName}</span>
        </div>
        ${data.clinicAddress ? `
        <div class="appointment-row">
          <span class="label">📍 Endereço</span>
          <span class="value">${data.clinicAddress}</span>
        </div>
        ` : ''}
      </div>

      <p style="color: #6b7280; font-size: 14px;">Por favor, chegue com 15 minutos de antecedência.</p>

      <div class="footer">
        <p>© ${new Date().getFullYear()} ${data.clinicName}. Todos os direitos reservados.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

/**
 * Template for appointment reminder
 */
export const getAppointmentReminderTemplate = (data: {
  patientName: string;
  date: string;
  time: string;
  therapistName: string;
  clinicName: string;
}): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lembrete de Agendamento</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; }
    .reminder-card { background: white; padding: 25px; border-radius: 12px; border-left: 5px solid #f59e0b; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">⏰ Lembrete de Agendamento</h1>
    </div>
    <div class="content">
      <p style="font-size: 16px; color: #374151;">Olá, <strong>${data.patientName}</strong>!</p>
      <p style="color: #6b7280;">Você tem uma sessão de fisioterapia agendada para <strong>amanhã</strong>:</p>

      <div class="reminder-card">
        <p style="margin: 0 0 10px 0; color: #6b7280;">📅 <strong>Data:</strong> ${formatDate(data.date)}</p>
        <p style="margin: 10px 0; color: #6b7280;">⏰ <strong>Horário:</strong> ${data.time}</p>
        <p style="margin: 10px 0; color: #6b7280;">👨‍⚕️ <strong>Com:</strong> ${data.therapistName}</p>
        <p style="margin: 10px 0 0 0; color: #6b7280;">🏥 <strong>Local:</strong> ${data.clinicName}</p>
      </div>

      <p style="color: #6b7280; font-size: 14px;">Não se esqueça! Caso precise remarcar, entre em contato conosco.</p>

      <div class="footer">
        <p>© ${new Date().getFullYear()} ${data.clinicName}. Todos os direitos reservados.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

/**
 * Template for voucher purchase confirmation
 */
export const getVoucherConfirmationTemplate = (data: {
  customerName: string;
  voucherName: string;
  voucherType: string;
  sessionsTotal: number;
  amountPaid: string;
  expirationDate: string;
  organizationName: string;
}): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Compra Confirmada - Voucher</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; }
    .voucher-card { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 25px; border-radius: 12px; margin: 20px 0; position: relative; overflow: hidden; }
    .voucher-card::before { content: '🎟️'; position: absolute; right: -10px; bottom: -20px; font-size: 100px; opacity: 0.1; }
    .voucher-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #b45309; }
    .voucher-row:last-child { border-bottom: none; }
    .voucher-label { color: #92400e; font-weight: 500; }
    .voucher-value { font-weight: 700; color: #78350f; }
    .total-amount { font-size: 32px; font-weight: bold; color: #059669; text-align: center; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">✅ Compra Confirmada!</h1>
      <p style="margin: 5px 0 0 0; opacity: 0.9;">${data.organizationName}</p>
    </div>
    <div class="content">
      <p style="font-size: 16px; color: #374151;">Olá, <strong>${data.customerName}</strong>!</p>
      <p style="color: #6b7280;">Seu voucher foi adquirido com sucesso. Confira os detalhes:</p>

      <div class="voucher-card">
        <h2 style="margin: 0 0 15px 0; color: #78350f; text-align: center;">🎫 ${data.voucherName}</h2>
        <div class="voucher-row">
          <span class="voucher-label">Sessões</span>
          <span class="voucher-value">${data.sessionsTotal === -1 ? 'Ilimitado' : data.sessionsTotal}</span>
        </div>
        <div class="voucher-row">
          <span class="voucher-label">Validade</span>
          <span class="voucher-value">${formatDate(data.expirationDate)}</span>
        </div>
      </div>

      <div class="total-amount">
        ${data.amountPaid}
      </div>

      <p style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 20px;">
        Você já pode usar seu voucher para agendar sessões!
      </p>

      <div style="text-align: center; margin-top: 20px;">
        <a href="https://fisioflow-migration.web.app" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">Agendar Sessão</a>
      </div>

      <div class="footer">
        <p>© ${new Date().getFullYear()} ${data.organizationName}. Todos os direitos reservados.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

/**
 * Template for payment failed notification
 */
export const getPaymentFailedTemplate = (data: {
  customerName: string;
  amount: string;
  voucherName: string;
  errorMessage?: string;
  organizationName: string;
}): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pagamento Falhou</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; }
    .alert-box { background: #fef2f2; border-left: 5px solid #ef4444; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">⚠️ Pagamento Não Processado</h1>
    </div>
    <div class="content">
      <p style="font-size: 16px; color: #374151;">Olá, <strong>${data.customerName}</strong>!</p>
      <p style="color: #6b7280;">Infelizmente, não foi possível processar seu pagamento:</p>

      <div class="alert-box">
        <p style="margin: 0 0 10px 0; color: #991b1b;"><strong>Voucher:</strong> ${data.voucherName}</p>
        <p style="margin: 10px 0; color: #991b1b;"><strong>Valor:</strong> ${data.amount}</p>
        ${data.errorMessage ? `<p style="margin: 10px 0 0 0; color: #dc2626; font-size: 14px;"><strong>Motivo:</strong> ${data.errorMessage}</p>` : ''}
      </div>

      <p style="color: #6b7280;">Por favor, tente novamente ou entre em contato conosco para ajuda.</p>

      <div style="text-align: center; margin-top: 20px;">
        <a href="https://fisioflow-migration.web.app/checkout" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">Tentar Novamente</a>
      </div>

      <div class="footer">
        <p>© ${new Date().getFullYear()} ${data.organizationName}. Todos os direitos reservados.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

/**
 * Template for voucher expiration reminder
 */
export const getVoucherExpiringTemplate = (data: {
  customerName: string;
  voucherName: string;
  sessionsRemaining: number;
  expirationDate: string;
  daysUntilExpiration: number;
  organizationName: string;
}): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Seu Voucher Está Expirando</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; }
    .warning-box { background: #fef3c7; border-left: 5px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .sessions-highlight { font-size: 48px; font-weight: bold; color: #f59e0b; text-align: center; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">⚠️ Seu Voucher Está Expirando</h1>
    </div>
    <div class="content">
      <p style="font-size: 16px; color: #374151;">Olá, <strong>${data.customerName}</strong>!</p>
      <p style="color: #6b7280;">Seu voucher vai expirar em <strong>${data.daysUntilExpiration} dias</strong>. Aproveite suas sessões restantes!</p>

      <div class="warning-box">
        <p style="margin: 0 0 15px 0; text-align: center; color: #92400e;">${data.voucherName}</p>
        <div class="sessions-highlight">${data.sessionsRemaining}</div>
        <p style="margin: 0; text-align: center; color: #92400e; font-size: 14px;">sessões restantes</p>
      </div>

      <div style="text-align: center; margin-top: 20px;">
        <p style="color: #6b7280; margin-bottom: 10px;">Expira em: <strong>${formatDate(data.expirationDate)}</strong></p>
        <a href="https://fisioflow-migration.web.app" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">Agendar Agora</a>
      </div>

      <div class="footer">
        <p>© ${new Date().getFullYear()} ${data.organizationName}. Todos os direitos reservados.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

/**
 * Template for birthday greeting
 */
export const getBirthdayTemplate = (data: {
  patientName: string;
  therapistName: string;
  clinicName: string;
}): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Feliz Aniversário!</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ec4899 0%, #f472b6 50%, #fb923c 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; }
    .birthday-emoji { font-size: 80px; margin-bottom: 10px; }
    .message { background: white; padding: 25px; border-radius: 12px; margin: 20px 0; text-align: center; border: 2px dashed #f472b6; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="birthday-emoji">🎂</div>
      <h1 style="margin: 0; font-size: 32px;">Feliz Aniversário!</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 18px;">${data.patientName}</p>
    </div>
    <div class="content">
      <div class="message">
        <p style="font-size: 18px; color: #374151; margin: 0 0 15px 0;">
          Que este novo ciclo traga muita saúde, paz e realização! 🌟
        </p>
        <p style="color: #6b7280; margin: 0;">
          É um privilegio poder fazer parte da sua jornada de recuperação e bem-estar.
        </p>
        <p style="margin: 15px 0 0 0; color: #924331; font-weight: 500;">
          Com carinho,<br><strong>${data.therapistName}</strong><br>
          <span style="font-size: 14px; color: #6b7280;">${data.clinicName}</span>
        </p>
      </div>

      <div class="footer">
        <p>© ${new Date().getFullYear()} ${data.clinicName}. Todos os direitos reservados.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format date to Brazilian Portuguese format
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format appointment status for display
 */
function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'agendado': 'Agendados',
    'concluido': 'Concluídos',
    'cancelado': 'Cancelados',
    'faltou': 'Faltas',
    'pendente': 'Pendentes',
    'confirmed': 'Confirmados',
    'completed': 'Concluídos',
    'cancelled': 'Cancelados',
  };
  return statusMap[status] || status;
}

// ============================================================================
// EMAIL SENDING FUNCTIONS
// ============================================================================

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

/**
 * Send email using Resend
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const resend = getResend();

    const result = await resend.emails.send({
      from: options.from || FROM_EMAIL,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
    });

    if (result.error) {
      logger.error('[Resend] Error sending email:', result.error);
      return { success: false, error: result.error.message };
    }

    logger.info('[Resend] Email sent successfully:', { id: result.data?.id, to: options.to });
    return { success: true, id: result.data?.id };
  } catch (error: any) {
    logger.error('[Resend] Exception sending email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send daily report email
 */
export async function sendDailyReportEmail(to: string | string[], data: Parameters<typeof getDailyReportTemplate>[0]): Promise<{ success: boolean; id?: string; error?: string }> {
  return sendEmail({
    to,
    subject: `📊 Relatório Diário - ${data.organizationName} (${data.date})`,
    html: getDailyReportTemplate(data),
  });
}

/**
 * Send weekly summary email
 */
export async function sendWeeklySummaryEmail(to: string | string[], data: Parameters<typeof getWeeklySummaryTemplate>[0]): Promise<{ success: boolean; id?: string; error?: string }> {
  return sendEmail({
    to,
    subject: `📈 Resumo Semanal - ${data.organizationName}`,
    html: getWeeklySummaryTemplate(data),
  });
}

/**
 * Send appointment confirmation email
 */
export async function sendAppointmentConfirmationEmail(to: string, data: Parameters<typeof getAppointmentConfirmationTemplate>[0]): Promise<{ success: boolean; id?: string; error?: string }> {
  return sendEmail({
    to,
    subject: '✅ Agendamento Confirmado',
    html: getAppointmentConfirmationTemplate(data),
  });
}

/**
 * Send appointment reminder email
 */
export async function sendAppointmentReminderEmail(to: string, data: Parameters<typeof getAppointmentReminderTemplate>[0]): Promise<{ success: boolean; id?: string; error?: string }> {
  return sendEmail({
    to,
    subject: '⏰ Lembrete: Sua sessão é amanhã!',
    html: getAppointmentReminderTemplate(data),
  });
}

/**
 * Send voucher confirmation email
 */
export async function sendVoucherConfirmationEmail(to: string, data: Parameters<typeof getVoucherConfirmationTemplate>[0]): Promise<{ success: boolean; id?: string; error?: string }> {
  return sendEmail({
    to,
    subject: '✅ Compra Confirmada - Seu Voucher',
    html: getVoucherConfirmationTemplate(data),
  });
}

/**
 * Send payment failed email
 */
export async function sendPaymentFailedEmail(to: string, data: Parameters<typeof getPaymentFailedTemplate>[0]): Promise<{ success: boolean; id?: string; error?: string }> {
  return sendEmail({
    to,
    subject: '⚠️ Pagamento Não Processado',
    html: getPaymentFailedTemplate(data),
  });
}

/**
 * Send voucher expiring email
 */
export async function sendVoucherExpiringEmail(to: string, data: Parameters<typeof getVoucherExpiringTemplate>[0]): Promise<{ success: boolean; id?: string; error?: string }> {
  return sendEmail({
    to,
    subject: '⚠️ Seu Voucher Está Expirando',
    html: getVoucherExpiringTemplate(data),
  });
}

/**
 * Send birthday greeting email
 */
export async function sendBirthdayEmail(to: string, data: Parameters<typeof getBirthdayTemplate>[0]): Promise<{ success: boolean; id?: string; error?: string }> {
  return sendEmail({
    to,
    subject: '🎂 Feliz Aniversário!',
    html: getBirthdayTemplate(data),
  });
}
