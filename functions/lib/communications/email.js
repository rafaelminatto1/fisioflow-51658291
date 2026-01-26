"use strict";
/**
 * Email Service Integration
 *
 * Integração com SendGrid/Resend para envio de emails transacionais
 *
 * @module communications/email
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendExercisePlanEmail = exports.sendPaymentConfirmation = exports.sendWelcomeEmail = exports.sendAppointmentReminder = exports.sendAppointmentConfirmation = exports.EmailTemplate = void 0;
const https_1 = require("firebase-functions/v2/https");
const firebase_admin_1 = require("firebase-admin");
const logger = __importStar(require("firebase-functions/logger"));
// Configuração do provedor de email
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'resend'; // 'sendgrid' ou 'resend'
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@fisioflow.app';
const FROM_NAME = process.env.FROM_NAME || 'FisioFlow';
/**
 * Templates de email disponíveis
 */
var EmailTemplate;
(function (EmailTemplate) {
    EmailTemplate["APPOINTMENT_CONFIRMATION"] = "appointment_confirmation";
    EmailTemplate["APPOINTMENT_REMINDER"] = "appointment_reminder";
    EmailTemplate["APPOINTMENT_CANCELLED"] = "appointment_cancelled";
    EmailTemplate["APPOINTMENT_RESCHEDULED"] = "appointment_rescheduled";
    EmailTemplate["WELCOME"] = "welcome";
    EmailTemplate["PASSWORD_RESET"] = "password_reset";
    EmailTemplate["PAYMENT_CONFIRMATION"] = "payment_confirmation";
    EmailTemplate["VOUCHER_PURCHASED"] = "voucher_purchased";
    EmailTemplate["EVOLUTION_SHARED"] = "evolution_shared";
    EmailTemplate["EXERCISE_PLAN_ASSIGNED"] = "exercise_plan_assigned";
})(EmailTemplate || (exports.EmailTemplate = EmailTemplate = {}));
/**
 * Cloud Function: Enviar email de confirmação de agendamento
 */
exports.sendAppointmentConfirmation = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 10,
}, async (request) => {
    // Verificar autenticação
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Não autenticado');
    }
    const { patientId, appointmentId } = request.data;
    // Buscar dados do paciente
    const patientDoc = await (0, firebase_admin_1.firestore)()
        .collection('patients')
        .doc(patientId)
        .get();
    if (!patientDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Paciente não encontrado');
    }
    const patient = patientDoc.data();
    // Buscar dados do agendamento
    const appointmentDoc = await (0, firebase_admin_1.firestore)()
        .collection('appointments')
        .doc(appointmentId)
        .get();
    if (!appointmentDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Agendamento não encontrado');
    }
    const appointment = appointmentDoc.data();
    // Buscar dados do terapeuta
    const therapistDoc = await (0, firebase_admin_1.firestore)()
        .collection('users')
        .doc(appointment?.therapistId)
        .get();
    const therapist = therapistDoc.data();
    // Formatar data e hora
    const date = new Date(appointment?.date);
    const formattedDate = date.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    // Enviar email
    await sendEmail({
        to: patient?.email,
        templateId: EmailTemplate.APPOINTMENT_CONFIRMATION,
        subject: 'Confirmação de Agendamento - FisioFlow',
        data: {
            patientName: patient?.fullName || patient?.name,
            therapistName: therapist?.displayName || 'Seu fisioterapeuta',
            date: formattedDate,
            time: appointment?.startTime,
            type: appointment?.type,
            clinicName: therapist?.organizationName || 'FisioFlow',
            location: therapist?.clinicAddress || '',
            calendarUrl: `${process.env.PUBLIC_URL}/calendar/${appointmentId}`,
        },
    });
    // Marcar lembrete como enviado
    await appointmentDoc.ref.update({
        reminderSent: true,
        reminderSentAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true };
});
/**
 * Cloud Function: Enviar lembrete de agendamento
 */
exports.sendAppointmentReminder = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 10,
}, async (request) => {
    const { patientId, appointmentId, hoursBefore } = request.data;
    const patientDoc = await (0, firebase_admin_1.firestore)()
        .collection('patients')
        .doc(patientId)
        .get();
    if (!patientDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Paciente não encontrado');
    }
    const patient = patientDoc.data();
    const appointmentDoc = await (0, firebase_admin_1.firestore)()
        .collection('appointments')
        .doc(appointmentId)
        .get();
    if (!appointmentDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Agendamento não encontrado');
    }
    const appointment = appointmentDoc.data();
    const date = new Date(appointment?.date);
    const formattedDate = date.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });
    await sendEmail({
        to: patient?.email,
        templateId: EmailTemplate.APPOINTMENT_REMINDER,
        subject: 'Lembrete: Sua sessão de fisioterapia é amanhã! - FisioFlow',
        data: {
            patientName: patient?.fullName || patient?.name,
            date: formattedDate,
            time: appointment?.startTime,
            type: appointment?.type,
            hoursBefore: hoursBefore || 24,
        },
    });
    return { success: true };
});
/**
 * Cloud Function: Enviar email de boas-vindas
 */
exports.sendWelcomeEmail = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 10,
}, async (request) => {
    const { userId } = request.data;
    const userDoc = await (0, firebase_admin_1.firestore)()
        .collection('users')
        .doc(userId)
        .get();
    if (!userDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Usuário não encontrado');
    }
    const user = userDoc.data();
    await sendEmail({
        to: user?.email,
        templateId: EmailTemplate.WELCOME,
        subject: 'Bem-vindo ao FisioFlow! 🎉',
        data: {
            name: user?.displayName || user?.fullName,
            email: user?.email,
            loginUrl: `${process.env.PUBLIC_URL}/auth`,
            dashboardUrl: `${process.env.PUBLIC_URL}/dashboard`,
        },
    });
    return { success: true };
});
/**
 * Cloud Function: Enviar confirmação de pagamento
 */
exports.sendPaymentConfirmation = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 10,
}, async (request) => {
    const { userId, voucherId, amount } = request.data;
    const userDoc = await (0, firebase_admin_1.firestore)()
        .collection('users')
        .doc(userId)
        .get();
    const user = userDoc.exists ? userDoc.data() : null;
    const voucherDoc = await (0, firebase_admin_1.firestore)()
        .collection('user_vouchers')
        .doc(voucherId)
        .get();
    const voucher = voucherDoc.data();
    await sendEmail({
        to: user?.email || voucher?.patientEmail,
        templateId: EmailTemplate.PAYMENT_CONFIRMATION,
        subject: 'Pagamento Confirmado - FisioFlow',
        data: {
            name: user?.displayName || voucher?.patientName,
            voucherName: voucher?.name,
            amount: (amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            sessions: voucher?.sessionsTotal,
            voucherUrl: `${process.env.PUBLIC_URL}/vouchers/${voucherId}`,
        },
    });
    return { success: true };
});
/**
 * Cloud Function: Enviar plano de exercícios
 */
exports.sendExercisePlanEmail = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 10,
}, async (request) => {
    const { patientId, planId } = request.data;
    const patientDoc = await (0, firebase_admin_1.firestore)()
        .collection('patients')
        .doc(patientId)
        .get();
    if (!patientDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Paciente não encontrado');
    }
    const patient = patientDoc.data();
    const planDoc = await (0, firebase_admin_1.firestore)()
        .collection('exercise_plans')
        .doc(planId)
        .get();
    if (!planDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Plano não encontrado');
    }
    const plan = planDoc.data();
    await sendEmail({
        to: patient?.email,
        templateId: EmailTemplate.EXERCISE_PLAN_ASSIGNED,
        subject: 'Novo Plano de Exercícios Disponível - FisioFlow',
        data: {
            patientName: patient?.fullName || patient?.name,
            planName: plan?.name,
            exercisesCount: plan?.exercises?.length || 0,
            planUrl: `${process.env.PUBLIC_URL}/exercises/${planId}`,
        },
    });
    return { success: true };
});
// ============================================================================================
// HELPER FUNCTIONS
// ============================================================================================
/**
 * Envia email usando o provedor configurado
 */
async function sendEmail(params) {
    const { to, templateId, subject, data } = params;
    try {
        if (EMAIL_PROVIDER === 'resend') {
            await sendEmailViaResend({ to, subject, templateId, data });
        }
        else {
            await sendEmailViaSendGrid({ to, subject, templateId, data });
        }
        logger.info(`Email sent: ${templateId} to ${to}`);
    }
    catch (error) {
        logger.error(`Failed to send email: ${error.message}`);
        throw error;
    }
}
/**
 * Envia email via Resend
 */
async function sendEmailViaResend(params) {
    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: `${FROM_NAME} <${FROM_EMAIL}>`,
            to: params.to,
            subject: params.subject,
            html: renderEmailTemplate(params.templateId, params.data),
        }),
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Resend API error: ${error}`);
    }
}
/**
 * Envia email via SendGrid
 */
async function sendEmailViaSendGrid(params) {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SENDGRID_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            personalizations: [
                {
                    to: [{ email: params.to }],
                    subject: params.subject,
                    dynamic_template_data: params.data,
                },
            ],
            from: { email: FROM_EMAIL, name: FROM_NAME },
            content: [{ type: 'text/html', value: renderEmailTemplate(params.templateId, params.data) }],
            template_id: getSendGridTemplateId(params.templateId),
        }),
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`SendGrid API error: ${error}`);
    }
}
/**
 * Renderiza template HTML de email
 */
function renderEmailTemplate(templateId, data) {
    const templates = {
        [EmailTemplate.APPOINTMENT_CONFIRMATION]: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10B981;">Agendamento Confirmado ✓</h2>
        <p>Olá {{patientName}},</p>
        <p>Seu agendamento foi confirmado para:</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <p><strong>Data:</strong> {{date}}</p>
          <p><strong>Horário:</strong> {{time}}</p>
          <p><strong>Tipo:</strong> {{type}}</p>
          <p><strong>Com:</strong> {{therapistName}}</p>
        </div>
        <p>Até breve!</p>
      </div>
    `,
        [EmailTemplate.APPOINTMENT_REMINDER]: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #F59E0B;">⏰ Lembrete de Agendamento</h2>
        <p>Olá {{patientName}},</p>
        <p>Sua sessão de fisioterapia é em {{hoursBefore}} horas!</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <p><strong>Data:</strong> {{date}}</p>
          <p><strong>Horário:</strong> {{time}}</p>
        </div>
        <p>Não se esqueça!</p>
      </div>
    `,
        [EmailTemplate.WELCOME]: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #10B981;">Bem-vindo ao FisioFlow! 🎉</h1>
        <p>Olá {{name}},</p>
        <p>Estamos muito felizes em ter você conosco!</p>
        <p>O FisioFlow é a plataforma completa para gestão de fisioterapia.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{dashboardUrl}}" style="background: #10B981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px;">Acessar Dashboard</a>
        </div>
      </div>
    `,
        [EmailTemplate.PAYMENT_CONFIRMATION]: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10B981;">Pagamento Confirmado ✓</h2>
        <p>Olá {{name}},</p>
        <p>Seu pagamento foi confirmado!</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <p><strong>Voucher:</strong> {{voucherName}}</p>
          <p><strong>Valor:</strong> {{amount}}</p>
          <p><strong>Sessões:</strong> {{sessions}}</p>
        </div>
        <p>Agradecemos pela preferência!</p>
      </div>
    `,
        [EmailTemplate.EXERCISE_PLAN_ASSIGNED]: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10B981;">Novo Plano de Exercícios 💪</h2>
        <p>Olá {{patientName}},</p>
        <p>Seu fisioterapeuta atribuiu um novo plano de exercícios!</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <p><strong>Plano:</strong> {{planName}}</p>
          <p><strong>Exercícios:</strong> {{exercisesCount}}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{planUrl}}" style="background: #10B981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px;">Ver Plano</a>
        </div>
      </div>
    `,
        [EmailTemplate.APPOINTMENT_CANCELLED]: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #EF4444;">Agendamento Cancelado</h2>
        <p>Olá {{patientName}},</p>
        <p>Seu agendamento foi cancelado.</p>
        <p>Se você não solicitou isso, entre em contato conosco.</p>
      </div>
    `,
        [EmailTemplate.APPOINTMENT_RESCHEDULED]: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10B981;">Agendamento Remarcado 📅</h2>
        <p>Olá {{patientName}},</p>
        <p>Seu agendamento foi remarcado para:</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <p><strong>Nova Data:</strong> {{newDate}}</p>
          <p><strong>Novo Horário:</strong> {{newTime}}</p>
        </div>
      </div>
    `,
        [EmailTemplate.PASSWORD_RESET]: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10B981;">Redefinir Senha</h2>
        <p>Olá {{name}},</p>
        <p>Clique no link abaixo para redefinir sua senha:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{resetUrl}}" style="background: #10B981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px;">Redefinir Senha</a>
        </div>
        <p>Se você não solicitou isso, ignore este email.</p>
      </div>
    `,
        [EmailTemplate.VOUCHER_PURCHASED]: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10B981;">Voucher Adquirido! 🎟️</h2>
        <p>Olá {{name}},</p>
        <p>Seu voucher foi adquirido com sucesso!</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <p><strong>Voucher:</strong> {{voucherName}}</p>
          <p><strong>Código:</strong> {{voucherCode}}</p>
          <p><strong>Sessões:</strong> {{sessions}}</p>
        </div>
      </div>
    `,
        [EmailTemplate.EVOLUTION_SHARED]: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10B981;">Nova Evolução Disponível 📊</h2>
        <p>Olá {{patientName}},</p>
        <p>Seu fisioterapeuta compartilhou uma nova evolução com você!</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{evolutionUrl}}" style="background: #10B981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px;">Ver Evolução</a>
        </div>
      </div>
    `,
    };
    let html = templates[templateId] || '<p>Email</p>';
    // Substituir variáveis
    Object.keys(data).forEach(key => {
        html = html.replace(new RegExp(`{{${key}}}`, 'g'), String(data[key]));
    });
    return html;
}
/**
 * Retorna o ID do template no SendGrid (se configurado)
 */
function getSendGridTemplateId(templateId) {
    const templateIds = {
        [EmailTemplate.APPOINTMENT_CONFIRMATION]: 'd-xxxxx',
        [EmailTemplate.APPOINTMENT_REMINDER]: 'd-xxxxx',
        [EmailTemplate.APPOINTMENT_CANCELLED]: 'd-xxxxx',
        [EmailTemplate.APPOINTMENT_RESCHEDULED]: 'd-xxxxx',
        [EmailTemplate.WELCOME]: 'd-xxxxx',
        [EmailTemplate.PASSWORD_RESET]: 'd-xxxxx',
        [EmailTemplate.PAYMENT_CONFIRMATION]: 'd-xxxxx',
        [EmailTemplate.VOUCHER_PURCHASED]: 'd-xxxxx',
        [EmailTemplate.EVOLUTION_SHARED]: 'd-xxxxx',
        [EmailTemplate.EXERCISE_PLAN_ASSIGNED]: 'd-xxxxx',
        // Adicionar outros templates conforme necessário
    };
    return templateIds[templateId];
}
//# sourceMappingURL=email.js.map