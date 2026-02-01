/**
 * WhatsApp Business API Integration
 *
 * Integração com WhatsApp Cloud API para envio de mensagens
 *
 * @module communications/whatsapp
 */

import { onCall, HttpsError, onRequest } from 'firebase-functions/v2/https';
import { firestore } from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { defineSecret } from 'firebase-functions/params';

export const WHATSAPP_PHONE_NUMBER_ID_SECRET = defineSecret('WHATSAPP_PHONE_NUMBER_ID');
export const WHATSAPP_ACCESS_TOKEN_SECRET = defineSecret('WHATSAPP_ACCESS_TOKEN');

// WhatsApp API configuration
const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';
const WHATSAPP_TIMEOUT_MS = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000; // Initial delay with exponential backoff

// Helper to get secrets with environment variable fallback
const getWhatsAppPhoneNumberId = () => WHATSAPP_PHONE_NUMBER_ID_SECRET.value() || process.env.WHATSAPP_PHONE_NUMBER_ID!;
const getWhatsAppAccessToken = () => WHATSAPP_ACCESS_TOKEN_SECRET.value() || process.env.WHATSAPP_ACCESS_TOKEN!;

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry wrapper with exponential backoff for WhatsApp API calls
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retryCount = 0
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WHATSAPP_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Retry on 5xx errors or rate limiting (429)
    if (!response.ok && retryCount < MAX_RETRIES && (
      response.status >= 500 || response.status === 429
    )) {
      const delay = RETRY_DELAY_MS * Math.pow(2, retryCount);
      logger.warn(`WhatsApp API error ${response.status}, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await sleep(delay);
      return fetchWithRetry(url, options, retryCount + 1);
    }

    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);

    // Retry on network errors or timeout
    if (retryCount < MAX_RETRIES && (
      error.name === 'AbortError' || error.message?.includes('fetch') || error.message?.includes('network')
    )) {
      const delay = RETRY_DELAY_MS * Math.pow(2, retryCount);
      logger.warn(`WhatsApp API network error, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES}):`, error.message);
      await sleep(delay);
      return fetchWithRetry(url, options, retryCount + 1);
    }

    throw error;
  }
}

import { getPool } from '../init';
import { authorizeRequest } from '../middleware/auth';

/**
 * Templates de WhatsApp aprovados
 * Para adicionar novos templates: https://business.facebook.com/wa/manage/phone-numbers/
 */
export enum WhatsAppTemplate {
  APPOINTMENT_CONFIRMATION = 'appointment_confirmation',
  APPOINTMENT_REMINDER = 'appointment_reminder',
  APPOINTMENT_REMINDER_24H = 'appointment_reminder_24h',
  WELCOME = 'welcome_message',
  APPOINTMENT_CANCELLED = 'appointment_cancelled',
  PRECADASTRO_CONFIRMATION = 'precadastro_confirmation',
  BIRTHDAY_GREETING = 'birthday_greeting',
  PATIENT_REACTIVATION = 'patient_reactivation',
  PAYMENT_CONFIRMATION = 'payment_confirmation',
  EXERCISE_ASSIGNED = 'exercise_assigned',
}

/**
 * Cloud Function: Enviar confirmação de agendamento via WhatsApp
 */
export const sendWhatsAppAppointmentConfirmation = onCall({
  cors: true,
  region: 'southamerica-east1',
  memory: '256MiB',
  maxInstances: 10,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Não autenticado');
  }

  const { patientId, appointmentId } = request.data as {
    patientId: string;
    appointmentId: string;
  };

  // Buscar dados do paciente
  const patientDoc = await firestore()
    .collection('patients')
    .doc(patientId)
    .get();

  if (!patientDoc.exists) {
    throw new HttpsError('not-found', 'Paciente não encontrado');
  }

  const patient = patientDoc.data();

  if (!patient?.phone) {
    throw new HttpsError('failed-precondition', 'Paciente não tem telefone cadastrado');
  }

  // Buscar dados do agendamento
  const appointmentDoc = await firestore()
    .collection('appointments')
    .doc(appointmentId)
    .get();

  if (!appointmentDoc.exists) {
    throw new HttpsError('not-found', 'Agendamento não encontrado');
  }

  const appointment = appointmentDoc.data();

  // Formatar data e hora
  const date = new Date(appointment?.date);
  const formattedDate = date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  // Formatar telefone para o formato do WhatsApp
  const whatsappPhone = formatPhoneForWhatsApp(patient?.phone);

  // Enviar mensagem template
  const result = await sendWhatsAppTemplateMessage({
    to: whatsappPhone,
    template: WhatsAppTemplate.APPOINTMENT_CONFIRMATION,
    language: 'pt_BR',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: patient?.fullName || patient?.name },
          { type: 'text', text: formattedDate },
          { type: 'text', text: appointment?.startTime },
        ],
      },
    ],
  });

  // Log message to DB
  await logWhatsAppMessage({
    organization_id: (patient.organization_id || (appointment && appointment.organization_id)) as string,
    patient_id: patientId,
    from_phone: getWhatsAppPhoneNumberId(),
    to_phone: whatsappPhone,
    message: `Confirmação de agendamento: ${formattedDate} às ${appointment?.startTime}`,
    type: 'template',
    template_name: WhatsAppTemplate.APPOINTMENT_CONFIRMATION,
    message_id: result.messages[0].id,
    status: 'sent',
  });

  return { success: true };
});

/**
 * Cloud Function: Enviar lembrete de agendamento (24h antes)
 */
export const sendWhatsAppAppointmentReminder = onCall({
  cors: true,
  region: 'southamerica-east1',
  memory: '256MiB',
  maxInstances: 10,
}, async (request) => {
  const { patientId, appointmentId } = request.data as {
    patientId: string;
    appointmentId: string;
  };

  const patientDoc = await firestore()
    .collection('patients')
    .doc(patientId)
    .get();

  if (!patientDoc.exists) {
    throw new HttpsError('not-found', 'Paciente não encontrado');
  }

  const patient = patientDoc.data();

  if (!patient?.phone) {
    logger.info(`Patient ${patientId} has no phone, skipping WhatsApp reminder`);
    return { skipped: true, reason: 'no_phone' };
  }

  const appointmentDoc = await firestore()
    .collection('appointments')
    .doc(appointmentId)
    .get();

  if (!appointmentDoc.exists) {
    throw new HttpsError('not-found', 'Agendamento não encontrado');
  }

  const appointment = appointmentDoc.data();

  const date = new Date(appointment?.date);
  const formattedDate = date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });

  const whatsappPhone = formatPhoneForWhatsApp(patient?.phone);

  await sendWhatsAppTemplateMessage({
    to: whatsappPhone,
    template: WhatsAppTemplate.APPOINTMENT_REMINDER,
    language: 'pt_BR',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: patient?.fullName || patient?.name },
          { type: 'text', text: formattedDate },
          { type: 'text', text: appointment?.startTime },
        ],
      },
    ],
  });

  return { success: true };
});

/**
 * Cloud Function: Enviar mensagem de boas-vindas
 */
export const sendWhatsAppWelcome = onCall({
  cors: true,
  region: 'southamerica-east1',
  memory: '256MiB',
  maxInstances: 10,
}, async (request) => {
  const { userId } = request.data as { userId: string };

  const userDoc = await firestore()
    .collection('users')
    .doc(userId)
    .get();

  if (!userDoc.exists) {
    throw new HttpsError('not-found', 'Usuário não encontrado');
  }

  const user = userDoc.data();

  if (!user?.phoneNumber) {
    return { skipped: true, reason: 'no_phone' };
  }

  const whatsappPhone = formatPhoneForWhatsApp(user?.phoneNumber);

  await sendWhatsAppTemplateMessage({
    to: whatsappPhone,
    template: WhatsAppTemplate.WELCOME,
    language: 'pt_BR',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: user?.displayName || user?.fullName },
        ],
      },
    ],
  });

  return { success: true };
});

/**
 * Cloud Function: Enviar mensagem personalizada
 */
export const sendWhatsAppCustomMessage = onCall({
  cors: true,
  region: 'southamerica-east1',
  memory: '256MiB',
  maxInstances: 10,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Não autenticado');
  }

  const { to, message } = request.data as {
    to: string;
    message: string;
  };

  // Verificar permissões (apenas admin e profissionais)
  const userDoc = await firestore()
    .collection('users')
    .doc(request.auth.uid)
    .get();

  if (!userDoc.exists) {
    throw new HttpsError('not-found', 'Usuário não encontrado');
  }

  const role = userDoc.data()?.role;

  if (!['admin', 'fisioterapeuta', 'estagiario'].includes(role)) {
    throw new HttpsError('permission-denied', 'Sem permissão para enviar mensagens');
  }

  // Formatar telefone
  const whatsappPhone = formatPhoneForWhatsApp(to);

  const result = await sendWhatsAppTextMessage({
    to: whatsappPhone,
    message,
  });

  // Buscar dados básicos para o log
  const adminProfile = await firestore().collection('profiles').doc(request.auth.uid).get();
  const organizationId = adminProfile.data()?.organization_id;

  // Log message to DB
  await logWhatsAppMessage({
    organization_id: organizationId as string,
    from_phone: getWhatsAppPhoneNumberId(),
    to_phone: whatsappPhone,
    message: message,
    type: 'text',
    message_id: result.messages[0].id,
    status: 'sent',
  });

  return { success: true };
});

/**
 * Cloud Function: Enviar notificação de exercício atribuído
 */
export const sendWhatsAppExerciseAssigned = onCall({
  cors: true,
  region: 'southamerica-east1',
  memory: '256MiB',
  maxInstances: 10,
}, async (request) => {
  const { patientId, planName, exercisesCount } = request.data as {
    patientId: string;
    planName: string;
    exercisesCount: number;
  };

  const patientDoc = await firestore()
    .collection('patients')
    .doc(patientId)
    .get();

  if (!patientDoc.exists) {
    throw new HttpsError('not-found', 'Paciente não encontrado');
  }

  const patient = patientDoc.data();

  if (!patient?.phone) {
    return { skipped: true, reason: 'no_phone' };
  }

  const whatsappPhone = formatPhoneForWhatsApp(patient?.phone);

  await sendWhatsAppTemplateMessage({
    to: whatsappPhone,
    template: WhatsAppTemplate.EXERCISE_ASSIGNED,
    language: 'pt_BR',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: patient?.fullName || patient?.name },
          { type: 'text', text: planName },
          { type: 'text', text: String(exercisesCount) },
        ],
      },
    ],
  });

  return { success: true };
});

// ============================================================================================
// HELPER FUNCTIONS
// ============================================================================================

/**
 * Envia mensagem template do WhatsApp
 */
async function sendWhatsAppTemplateMessage(params: {
  to: string;
  template: string;
  language: string;
  components?: Array<{
    type: string;
    parameters: Array<{ type: string; text: string }>;
  }>;
}) {
  const url = `${WHATSAPP_API_URL}/${getWhatsAppPhoneNumberId()}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    to: params.to,
    type: 'template',
    template: {
      name: params.template,
      language: { code: params.language },
      components: params.components || [],
    },
  };

  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getWhatsAppAccessToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error(`WhatsApp API error: ${error}`);
    throw new Error(`WhatsApp API error: ${error}`);
  }

  const result = await response.json() as any;
  logger.info(`WhatsApp template sent: ${result.messages[0].id}`);

  return result;
}

/**
 * Envia mensagem de texto personalizada do WhatsApp
 */
async function sendWhatsAppTextMessage(params: {
  to: string;
  message: string;
}) {
  const url = `${WHATSAPP_API_URL}/${getWhatsAppPhoneNumberId()}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    to: params.to,
    type: 'text',
    text: {
      body: params.message,
    },
  };

  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getWhatsAppAccessToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error(`WhatsApp API error: ${error}`);
    throw new Error(`WhatsApp API error: ${error}`);
  }

  const result = await response.json() as any;
  logger.info(`WhatsApp text sent: ${result.messages[0].id}`);

  return result;
}

/**
 * Formata número de telefone para o formato do WhatsApp
 * Converte various formats para: 55DDDDDDDDD
 */
function formatPhoneForWhatsApp(phone: string): string {
  // Remover todos os caracteres não numéricos
  let cleaned = phone.replace(/\D/g, '');

  // Se começar com 0 (DDDD), remover
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // Se não tiver código do país (55), adicionar
  if (cleaned.length === 10 || cleaned.length === 11) {
    cleaned = '55' + cleaned;
  }

  // Remover dígito 9 extra se tiver (para número padrão)
  if (cleaned.length === 13 && cleaned.startsWith('551')) {
    cleaned = cleaned.substring(0, 12) + cleaned.substring(13);
  }

  return cleaned;
}

/**
 * Verifica se um número de telefone está válido
 */
export function isValidWhatsAppPhone(phone: string): boolean {
  const formatted = formatPhoneForWhatsApp(phone);
  // Deve ter código do país (55) + DDD (2 dígitos) + número (8-9 dígitos)
  return /^55\d{10,11}$/.test(formatted);
}

/**
 * Verify WhatsApp webhook signature using X-Hub-Signature-256
 */
function verifyWhatsAppSignature(
  payload: string,
  signature: string | undefined,
  appSecret: string
): boolean {
  if (!signature) {
    return false;
  }

  // WhatsApp uses SHA-256: signature format is "sha256=<hex>"
  const signatureParts = signature.split('=');
  if (signatureParts.length !== 2 || signatureParts[0] !== 'sha256') {
    logger.error('[WhatsApp] Invalid signature format');
    return false;
  }

  // Import crypto for HMAC verification
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', appSecret)
    .update(payload, 'utf8')
    .digest('hex');

  // Secure comparison
  const providedSignature = signatureParts[1];
  if (expectedSignature.length !== providedSignature.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'utf8'),
    Buffer.from(providedSignature, 'utf8')
  );
}

/**
 * HTTP Endpoint para webhook do WhatsApp (opcional)
 * Usado para receber mensagens e status updates dos usuários
 */
export const whatsappWebhookHttp = onRequest({
  region: 'southamerica-east1',
  memory: '256MiB',
  maxInstances: 10,
  secrets: ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_APP_SECRET'],
}, async (request: any, response: any) => {
  // Verificar token de verificação do WhatsApp
  const mode = request.query['hub.mode'];
  const challenge = request.query['hub.challenge'];
  const verifyToken = request.query['hub.verify_token'];

  if (mode && verifyToken) {
    if (mode === 'subscribe' && verifyToken === process.env.WHATSAPP_VERIFY_TOKEN) {
      logger.info('WhatsApp webhook verified');
      return response.status(200).send(challenge);
    }
    return response.status(403).send('Forbidden');
  }

  // Verify webhook signature for POST requests
  const signature = request.headers['x-hub-signature-256'] as string;
  const appSecret = WHATSAPP_ACCESS_TOKEN_SECRET.value() || process.env.WHATSAPP_APP_SECRET || process.env.WHATSAPP_ACCESS_TOKEN!;

  // Get raw body for signature verification
  const rawBody = request.rawBody?.toString() || JSON.stringify(request.body);

  if (!verifyWhatsAppSignature(rawBody, signature, appSecret)) {
    logger.error('[WhatsApp] Invalid webhook signature');
    return response.status(403).send('Invalid signature');
  }

  // Processar webhook
  try {
    const body = request.body;

    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages') {
            const changeValue: any = change.value;

            if (changeValue.messages && changeValue.messages.length > 0) {
              const message = changeValue.messages[0];

              // Processar mensagem recebida
              await handleIncomingWhatsAppMessage(message);
            }
          } else if (change.field === 'messaging_statuses') {
            // Processar atualização de status da mensagem
            const statuses = change.value.statuses;
            if (statuses && statuses.length > 0) {
              await handleWhatsAppMessageStatus(statuses[0]);
            }
          }
        }
      }
    }

    return response.status(200).json({ received: true });
  } catch (error: any) {
    logger.error('WhatsApp webhook error:', error);
    return response.status(500).json({ error: 'Erro ao processar webhook' });
  }
});

/**
 * Processa mensagem recebida do WhatsApp
 */
async function handleIncomingWhatsAppMessage(message: any) {
  logger.info('Received WhatsApp message:', message);

  const from = message.from;
  const messageId = message.id;
  const timestamp = message.timestamp;
  const type = message.type;

  // Buscar usuário por telefone
  const phone = from.replace(/\D/g, '').replace(/^55/, '');

  const patientsSnapshot = await firestore()
    .collection('patients')
    .where('phone', '==', phone)
    .get();

  if (patientsSnapshot.empty) {
    logger.info(`No patient found for phone: ${phone}`);
    return;
  }

  const patient = patientsSnapshot.docs[0].data();

  if (type === 'text') {
    const text = message.text.body;

    // Salvar mensagem recebida no Firestore (maintining legacy)
    await firestore()
      .collection('whatsapp_messages')
      .add({
        from,
        to: getWhatsAppPhoneNumberId(),
        messageId,
        type: 'text',
        text,
        timestamp: new Date(parseInt(timestamp) * 1000),
        patientId: patientsSnapshot.docs[0].id,
        read: false,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

    // Salvar mensagem recebida no Cloud SQL
    const pool = getPool();
    await pool.query(
      `INSERT INTO whatsapp_messages (
        organization_id, patient_id, from_phone, to_phone, message, type, message_id, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        patient.organization_id,
        patientsSnapshot.docs[0].id,
        from,
        getWhatsAppPhoneNumberId(),
        text,
        'text',
        messageId,
        'received',
        new Date(parseInt(timestamp) * 1000)
      ]
    );

    // Responder automaticamente se necessário
    await handleAutoReply(from, text, patient);
  }
}

/**
 * Processa atualização de status de mensagem
 */
async function handleWhatsAppMessageStatus(status: any) {
  logger.info('WhatsApp message status update:', status);

  const { id, status: messageStatus } = status;

  // Atualizar status da mensagem no Firestore
  const messagesSnapshot = await firestore()
    .collection('whatsapp_messages')
    .where('messageId', '==', id)
    .get();

  if (!messagesSnapshot.empty) {
    await messagesSnapshot.docs[0].ref.update({
      status: messageStatus,
      statusUpdatedAt: firestore.FieldValue.serverTimestamp(),
    });
  }

  // Atualizar status no Cloud SQL
  const pool = getPool();
  await pool.query(
    'UPDATE whatsapp_messages SET status = $1, metadata = jsonb_set(COALESCE(metadata, \'{}\'), \'{status_history}\', COALESCE(metadata->\'status_history\', \'[]\'::jsonb) || $2::jsonb) WHERE message_id = $3',
    [
      messageStatus,
      JSON.stringify([{ status: messageStatus, timestamp: new Date().toISOString() }]),
      id
    ]
  );
}

/**
 * Resposta automática a mensagens recebidas
 */
async function handleAutoReply(from: string, text: string, patient: any) {
  const lowerText = text.toLowerCase();

  let replyMessage = '';

  if (lowerText.includes('agendar') || lowerText.includes('horário')) {
    replyMessage = `Olá ${patient?.fullName || 'Paciente'}! Para agendar uma sessão, você pode:\n\n1. Acessar: ${process.env.PUBLIC_URL}/agenda\n2. Ou responder esta mensagem com a data desejada.`;
  } else if (lowerText.includes('cancelar')) {
    replyMessage = 'Para cancelar ou remarcar um agendamento, por favor entre em contato pelo telefone ou acesse o site.';
  } else if (lowerText.includes('exercício') || lowerText.includes('exercicio')) {
    replyMessage = `Seus exercícios estão disponíveis em: ${process.env.PUBLIC_URL}/exercises`;
  } else {
    replyMessage = `Obrigado pela mensagem, ${patient?.fullName || 'Paciente'}! Em breve retornaremos o contato.`;
  }

  if (replyMessage) {
    await sendWhatsAppTextMessage({
      to: from,
      message: replyMessage,
    });
  }
}

// ============================================================================================
// TEST FUNCTIONS
// ============================================================================================

/**
 * Cloud Function: Testar envio de mensagem WhatsApp
 * Útil para verificar se as credenciais estão configuradas corretamente
 */
export const testWhatsAppMessage = onCall({
  cors: true,
  region: 'southamerica-east1',
  memory: '256MiB',
  maxInstances: 10,
}, async (request) => {
  if (!request.auth && request.data.secret !== 'FISIOFLOW_TEST_SECRET') {
    throw new HttpsError('unauthenticated', 'Não autenticado');
  }

  const { phone, template = WhatsAppTemplate.WELCOME, name = 'Teste' } = request.data as {
    phone?: string;
    template?: string;
    name?: string;
  };

  // Se não fornecer telefone, usar o número do próprio usuário
  let targetPhone = phone;
  if (!targetPhone) {
    if (!request.auth) {
      throw new HttpsError('failed-precondition', 'Telefone não fornecido e usuário não autenticado');
    }

    const userDoc = await firestore()
      .collection('users')
      .doc(request.auth.uid)
      .get();

    if (!userDoc.exists) {
      throw new HttpsError('not-found', 'Usuário não encontrado');
    }

    const user = userDoc.data();
    if (!user?.phoneNumber) {
      throw new HttpsError('failed-precondition', 'Usuário não tem telefone cadastrado. Forneça um telefone no parâmetro "phone"');
    }

    targetPhone = user.phoneNumber;
  }

  if (!targetPhone) {
    throw new HttpsError('failed-precondition', 'Telefone não fornecido');
  }

  const whatsappPhone = formatPhoneForWhatsApp(targetPhone);

  // Enviar mensagem de teste
  await sendWhatsAppTextMessage({
    to: whatsappPhone,
    message: `🧪 Teste FisioFlow WhatsApp\n\nOlá ${name}!\n\nEsta é uma mensagem de teste do FisioFlow. Se você recebeu esta mensagem, a integração está funcionando corretamente! 🎉\n\nData: ${new Date().toLocaleString('pt-BR')}`,
  });

  logger.info(`Test message sent to ${whatsappPhone}`);

  return {
    success: true,
    phone: whatsappPhone,
    template,
    message: 'Mensagem de teste enviada com sucesso!',
  };
});

/**
 * Cloud Function: Testar template do WhatsApp
 * Envia um template específico para verificar se foi aprovado
 */
export const testWhatsAppTemplate = onCall({
  cors: true,
  region: 'southamerica-east1',
  memory: '256MiB',
  maxInstances: 10,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Não autenticado');
  }

  const {
    phone,
    template = WhatsAppTemplate.APPOINTMENT_CONFIRMATION,
    params
  } = request.data as {
    phone?: string;
    template?: string;
    params?: Record<string, string>;
  };

  // Se não fornecer telefone, usar o número do próprio usuário
  let targetPhone = phone;
  if (!targetPhone) {
    const userDoc = await firestore()
      .collection('users')
      .doc(request.auth.uid)
      .get();

    if (!userDoc.exists) {
      throw new HttpsError('not-found', 'Usuário não encontrado');
    }

    const user = userDoc.data();
    if (!user?.phoneNumber) {
      throw new HttpsError('failed-precondition', 'Usuário não tem telefone cadastrado. Forneça um telefone no parâmetro "phone"');
    }

    targetPhone = user.phoneNumber;
  }

  if (!targetPhone) {
    throw new HttpsError('failed-precondition', 'Telefone não fornecido');
  }

  const whatsappPhone = formatPhoneForWhatsApp(targetPhone);

  // Parâmetros padrão para teste
  const defaultParams: Record<string, string> = {
    patientName: params?.patientName || 'Paciente Teste',
    date: params?.date || new Date().toLocaleDateString('pt-BR'),
    time: params?.time || '14:00',
    professional: params?.professional || 'Dr. Teste',
    address: params?.address || 'Rua Teste, 123',
  };

  // Montar componentes do template
  const components: Array<{
    type: string;
    parameters: Array<{ type: string; text: string }>;
  }> = [];

  switch (template) {
    case WhatsAppTemplate.APPOINTMENT_CONFIRMATION:
      components.push({
        type: 'body',
        parameters: [
          { type: 'text', text: defaultParams.patientName },
          { type: 'text', text: defaultParams.date },
          { type: 'text', text: defaultParams.time },
          { type: 'text', text: defaultParams.professional },
          { type: 'text', text: defaultParams.address },
        ],
      });
      break;

    case WhatsAppTemplate.APPOINTMENT_REMINDER:
      components.push({
        type: 'body',
        parameters: [
          { type: 'text', text: defaultParams.patientName },
          { type: 'text', text: defaultParams.time },
          { type: 'text', text: defaultParams.professional },
        ],
      });
      break;

    case WhatsAppTemplate.WELCOME:
      components.push({
        type: 'body',
        parameters: [
          { type: 'text', text: defaultParams.patientName },
        ],
      });
      break;

    default:
      throw new HttpsError('invalid-argument', `Template não suportado: ${template}`);
  }

  // Enviar template
  await sendWhatsAppTemplateMessage({
    to: whatsappPhone,
    template,
    language: 'pt_BR',
    components,
  });

  logger.info(`Test template "${template}" sent to ${whatsappPhone}`);

  return {
    success: true,
    phone: whatsappPhone,
    template,
    message: `Template "${template}" enviado com sucesso!`,
  };
});

/**
 * Cloud Function: Buscar histórico de mensagens do WhatsApp
 */
export const getWhatsAppHistory = onCall({
  cors: true,
  region: 'southamerica-east1',
  memory: '256MiB',
}, async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Não autenticado');
  }

  const { patientId, limit = 50, offset = 0 } = request.data as {
    patientId: string;
    limit?: number;
    offset?: number;
  };

  const auth = await authorizeRequest(request.auth.token);
  const pool = getPool();

  try {
    const result = await pool.query(
      `SELECT * FROM whatsapp_messages 
       WHERE organization_id = $1 AND patient_id = $2
       ORDER BY created_at DESC 
       LIMIT $3 OFFSET $4`,
      [auth.organizationId, patientId, limit, offset]
    );

    return {
      data: result.rows,
      total: result.rowCount
    };
  } catch (error: any) {
    logger.error('Error fetching WhatsApp history:', error);
    throw new HttpsError('internal', 'Erro ao buscar histórico de mensagens');
  }
});

// ============================================================================================
// DATABASE HELPERS
// ============================================================================================

/**
 * Registra uma mensagem no banco de dados
 */
async function logWhatsAppMessage(params: {
  organization_id: string;
  patient_id?: string;
  from_phone: string;
  to_phone: string;
  message: string;
  type: string;
  template_name?: string;
  message_id: string;
  status: string;
}) {
  const pool = getPool();
  try {
    await pool.query(
      `INSERT INTO whatsapp_messages (
        organization_id, patient_id, from_phone, to_phone, message, type, template_name, message_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        params.organization_id,
        params.patient_id || null,
        params.from_phone,
        params.to_phone,
        params.message,
        params.type,
        params.template_name || null,
        params.message_id,
        params.status
      ]
    );
  } catch (error) {
    logger.error('Error logging WhatsApp message:', error);
    // Don't throw, just log the error to avoid breaking the main flow
  }
}
