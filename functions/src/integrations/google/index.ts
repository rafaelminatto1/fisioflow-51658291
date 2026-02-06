/**
 * Cloud Functions - Google Integrations
 * Functions para Google Calendar, Docs, Drive e FCM
 */

import { functions } from '@/lib/firebase/functions';
import { httpsCallable, HttpsError } from 'firebase-functions';
import { getFCMService, NotificationTemplates } from '@/integrations/firebase/fcm';
import {
  getGoogleAuthUrl,
  exchangeCodeForTokens,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  syncToGoogleCalendar,
} from '@/lib/integrations/google/calendar';
import {
  createDocsService,
  createDriveService,
} from '@/lib/integrations/google/docs';
import { DriveService } from '@/lib/integrations/google/drive';

// ============================================================================
// Google Calendar Functions
// ============================================================================

/**
 * Gera URL de autorização OAuth
 */
export const getGoogleAuthUrlFn = httpsCallable(async (request) => {
  const { clientId, redirectUri } = request.data;

  if (!clientId || !redirectUri) {
    throw new HttpsError('invalid-argument', 'clientId e redirectUri são obrigatórios');
  }

  const authUrl = getGoogleAuthUrl(clientId, redirectUri, [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/documents',
  ]);

  return { authUrl };
});

/**
 * Troca código de autorização por tokens
 */
export const exchangeGoogleCodeFn = httpsCallable(async (request) => {
  const { clientId, clientSecret, redirectUri, code } = request.data;

  if (!clientId || !clientSecret || !redirectUri || !code) {
    throw new HttpsError('invalid-argument', 'Todos os parâmetros são obrigatórios');
  }

  try {
    const tokens = await exchangeCodeForTokens(clientId, clientSecret, redirectUri, code);

    // TODO: Salvar tokens no Firestore para o usuário
    // await saveUserTokens(request.auth.uid, tokens);

    return tokens;
  } catch (error) {
    throw new HttpsError('internal', 'Erro ao trocar código por tokens');
  }
});

/**
 * Sincroniza agendamentos com Google Calendar
 */
export const syncCalendarToGoogleFn = httpsCallable(async (request) => {
  const { accessToken, appointments } = request.data;

  if (!accessToken || !Array.isArray(appointments)) {
    throw new HttpsError('invalid-argument', 'accessToken e appointments são obrigatórios');
  }

  try {
    const result = await syncToGoogleCalendar(accessToken, appointments);
    return result;
  } catch (error) {
    throw new HttpsError('internal', 'Erro ao sincronizar com Google Calendar');
  }
});

/**
 * Cria evento no Google Calendar
 */
export const createCalendarEventFn = httpsCallable(async (request) => {
  const { accessToken, eventData } = request.data;

  if (!accessToken || !eventData) {
    throw new HttpsError('invalid-argument', 'accessToken e eventData são obrigatórios');
  }

  try {
    const eventId = await createCalendarEvent(accessToken, eventData);
    return { eventId };
  } catch (error) {
    throw new HttpsError('internal', 'Erro ao criar evento no Google Calendar');
  }
});

/**
 * Atualiza evento no Google Calendar
 */
export const updateCalendarEventFn = httpsCallable(async (request) => {
  const { accessToken, eventId, eventData } = request.data;

  if (!accessToken || !eventId || !eventData) {
    throw new HttpsError('invalid-argument', 'accessToken, eventId e eventData são obrigatórios');
  }

  try {
    await updateCalendarEvent(accessToken, eventId, eventData);
    return { success: true };
  } catch (error) {
    throw new HttpsError('internal', 'Erro ao atualizar evento no Google Calendar');
  }
});

/**
 * Deleta evento no Google Calendar
 */
export const deleteCalendarEventFn = httpsCallable(async (request) => {
  const { accessToken, eventId } = request.data;

  if (!accessToken || !eventId) {
    throw new HttpsError('invalid-argument', 'accessToken e eventId são obrigatórios');
  }

  try {
    await deleteCalendarEvent(accessToken, eventId);
    return { success: true };
  } catch (error) {
    throw new HttpsError('internal', 'Erro ao deletar evento no Google Calendar');
  }
});

// ============================================================================
// Google Docs/Drive Functions
// ============================================================================

/**
 * Gera relatório a partir de template
 */
export const generateReportFn = httpsCallable(async (request) => {
  const {
    accessToken,
    templateId,
    reportName,
    data,
    convertToPdf,
    saveToFolder,
  } = request.data;

  if (!accessToken || !templateId || !reportName || !data) {
    throw new HttpsError('invalid-argument', 'Parâmetros obrigatórios faltando');
  }

  try {
    const docsService = new (await import('@/lib/integrations/google/docs')).DocsService(accessToken);

    const result = await docsService.generateReport(
      templateId,
      reportName,
      data,
      {
        convertToPdf: convertToPdf ?? false,
        saveToFolder,
      }
    );

    return result;
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    throw new HttpsError('internal', 'Erro ao gerar relatório');
  }
});

/**
 * Gera relatório clínico
 */
export const generateClinicalReportFn = httpsCallable(async (request) => {
  const {
    accessToken,
    templateId,
    patientData,
    clinicalData,
    therapistData,
    options,
  } = request.data;

  if (!accessToken || !templateId || !patientData || !clinicalData || !therapistData) {
    throw new HttpsError('invalid-argument', 'Parâmetros obrigatórios faltando');
  }

  try {
    const docsService = new (await import('@/lib/integrations/google/docs')).DocsService(accessToken);

    const result = await docsService.generateClinicalReport(
      templateId,
      patientData,
      clinicalData,
      therapistData,
      options
    );

    return result;
  } catch (error) {
    console.error('Erro ao gerar relatório clínico:', error);
    throw new HttpsError('internal', 'Erro ao gerar relatório clínico');
  }
});

/**
 * Lista templates do Google Docs
 */
export const listTemplatesFn = httpsCallable(async (request) => {
  const { accessToken, folderId } = request.data;

  if (!accessToken) {
    throw new HttpsError('unauthenticated', 'accessToken é obrigatório');
  }

  try {
    const docsService = new (await import('@/lib/integrations/google/docs')).DocsService(accessToken);
    const templates = await docsService.listTemplates(folderId);
    return { templates };
  } catch (error) {
    console.error('Erro ao listar templates:', error);
    throw new HttpsError('internal', 'Erro ao listar templates');
  }
});

/**
 * Cria pasta do paciente no Google Drive
 */
export const createPatientFolderFn = httpsCallable(async (request) => {
  const { accessToken, tenantId, patientId, patientName } = request.data;

  if (!accessToken || !tenantId || !patientId || !patientName) {
    throw new HttpsError('invalid-argument', 'Todos os parâmetros são obrigatórios');
  }

  try {
    const driveService = new DriveService(accessToken);
    const folderStructure = await driveService.createPatientFolderStructure(
      tenantId,
      patientId,
      patientName
    );

    return folderStructure;
  } catch (error) {
    console.error('Erro ao criar pasta do paciente:', error);
    throw new HttpsError('internal', 'Erro ao criar pasta no Google Drive');
  }
});

/**
 * Upload de PDF para Google Drive
 */
export const uploadPdfFn = httpsCallable(async (request) => {
  const { accessToken, fileName, pdfData, folderId } = request.data;

  if (!accessToken || !fileName || !pdfData) {
    throw new HttpsError('invalid-argument', 'fileName e pdfData são obrigatórios');
  }

  try {
    const driveService = new DriveService(accessToken);
    const pdfBuffer = Buffer.from(pdfData, 'base64');
    const result = await driveService.uploadPdf(fileName, pdfBuffer, folderId);
    return result;
  } catch (error) {
    console.error('Erro ao fazer upload de PDF:', error);
    throw new HttpsError('internal', 'Erro ao fazer upload de PDF');
  }
});

/**
 * Compartilha arquivo do Google Drive
 */
export const shareFileFn = httpsCallable(async (request) => {
  const { accessToken, fileId, email, role } = request.data;

  if (!accessToken || !fileId || !email) {
    throw new HttpsError('invalid-argument', 'fileId e email são obrigatórios');
  }

  try {
    const driveService = new DriveService(accessToken);
    const permission = await driveService.shareFile(fileId, email, role || 'reader', true);
    return permission;
  } catch (error) {
    console.error('Erro ao compartilhar arquivo:', error);
    throw new HttpsError('internal', 'Erro ao compartilhar arquivo');
  }
});

/**
 * Gera link compartilhável
 */
export const getShareableLinkFn = httpsCallable(async (request) => {
  const { accessToken, fileId } = request.data;

  if (!accessToken || !fileId) {
    throw new HttpsError('invalid-argument', 'fileId é obrigatório');
  }

  try {
    const driveService = new DriveService(accessToken);
    const link = await driveService.getShareableLink(fileId);
    return { link };
  } catch (error) {
    console.error('Erro ao gerar link compartilhável:', error);
    throw new HttpsError('internal', 'Erro ao gerar link compartilhável');
  }
});

// ============================================================================
// FCM Functions
// ============================================================================

/**
 * Registra token de dispositivo
 */
export const registerDeviceTokenFn = httpsCallable(async (request) => {
  const { token, deviceInfo } = request.data;

  if (!token) {
    throw new HttpsError('invalid-argument', 'token é obrigatório');
  }

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  try {
    const fcmService = getFCMService();
    await fcmService.saveDeviceToken({
      token,
      userId: request.auth.uid,
      deviceInfo,
      active: true,
    });

    return { success: true };
  } catch (error) {
    console.error('Erro ao registrar token:', error);
    throw new HttpsError('internal', 'Erro ao registrar token');
  }
});

/**
 * Remove token de dispositivo
 */
export const unregisterDeviceTokenFn = httpsCallable(async (request) => {
  const { token } = request.data;

  if (!token) {
    throw new HttpsError('invalid-argument', 'token é obrigatório');
  }

  try {
    const fcmService = getFCMService();
    await fcmService.removeDeviceToken(token);

    return { success: true };
  } catch (error) {
    console.error('Erro ao remover token:', error);
    throw new HttpsError('internal', 'Erro ao remover token');
  }
});

/**
 * Envia notificação de teste
 */
export const sendTestNotificationFn = httpsCallable(async (request) => {
  const { token } = request.data;

  if (!token) {
    throw new HttpsError('invalid-argument', 'token é obrigatório');
  }

  try {
    const fcmService = getFCMService();
    const result = await fcmService.sendToDevice(token, {
      title: '🔔 Teste FisioFlow',
      body: 'Notificações push estão funcionando!',
      data: { type: 'test' },
    });

    return result;
  } catch (error) {
    console.error('Erro ao enviar notificação de teste:', error);
    throw new HttpsError('internal', 'Erro ao enviar notificação');
  }
});

/**
 * Envia lembrete de sessão
 */
export const sendSessionReminderFn = httpsCallable(async (request) => {
  const { userId, patientName, therapistName, dateTime } = request.data;

  if (!userId || !patientName || !therapistName || !dateTime) {
    throw new HttpsError('invalid-argument', 'Todos os parâmetros são obrigatórios');
  }

  try {
    const fcmService = getFCMService();
    const notification = NotificationTemplates.SESSION_REMINDER(
      patientName,
      therapistName,
      dateTime
    );

    const results = await fcmService.notifyUser(userId, notification);

    return {
      success: results.some((r) => r.success),
      results,
    };
  } catch (error) {
    console.error('Erro ao enviar lembrete de sessão:', error);
    throw new HttpsError('internal', 'Erro ao enviar lembrete');
  }
});

/**
 * Envia notificação para múltiplos usuários
 */
export const sendBulkNotificationFn = httpsCallable(async (request) => {
  const { userIds, title, body, data } = request.data;

  if (!Array.isArray(userIds) || !title || !body) {
    throw new HttpsError('invalid-argument', 'userIds, title e body são obrigatórios');
  }

  try {
    const fcmService = getFCMService();
    const results = await fcmService.notifyUsers(userIds, {
      title,
      body,
      data,
    });

    return {
      success: results.some((r) => r.success),
      results,
    };
  } catch (error) {
    console.error('Erro ao enviar notificação em massa:', error);
    throw new HttpsError('internal', 'Erro ao enviar notificações');
  }
});

/**
 * Inscreve usuário em tópicos do tenant
 */
export const subscribeToTenantTopicsFn = httpsCallable(async (request) => {
  const { tenantId } = request.data;

  if (!tenantId) {
    throw new HttpsError('invalid-argument', 'tenantId é obrigatório');
  }

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  try {
    const fcmService = getFCMService();
    await fcmService.subscribeUserToTenantTopics(request.auth.uid, tenantId);

    return { success: true };
  } catch (error) {
    console.error('Erro ao inscrever em tópicos:', error);
    throw new HttpsError('internal', 'Erro ao inscrever em tópicos');
  }
});

// ============================================================================
// AI Document Scanner Functions
// ============================================================================

/**
 * Análise completa de documento com IA
 * Usa Gemini Vision para classificação, OCR, sumarização e tradução
 */
export const aiDocumentAnalysis = httpsCallable(async (request) => {
  const { fileUrl, fileName, mediaType, options } = request.data;

  if (!fileUrl) {
    throw new HttpsError('invalid-argument', 'fileUrl é obrigatório');
  }

  try {
    // Importar serviços dinamicamente
    const { GoogleAIService } = await import('@/lib/integrations/google/ai');
    const aiService = new GoogleAIService();

    // Executar análise completa
    const results = await aiService.analyzeDocument(fileUrl, {
      fileName,
      mediaType,
      includeClassification: options?.includeClassification ?? true,
      includeSummary: options?.includeSummary ?? true,
      includeExtraction: options?.includeExtraction ?? true,
      includeTables: options?.includeTables ?? true,
      includeTranslation: options?.includeTranslation ?? false,
      targetLanguage: options?.targetLanguage || 'pt',
      compareWithPrevious: options?.compareWithPrevious ?? false,
      patientId: options?.patientId || null,
    });

    return results;
  } catch (error) {
    console.error('Erro na análise de documento:', error);
    throw new HttpsError('internal', 'Erro ao analisar documento');
  }
});

/**
 * Classificação de documento com Gemini Vision
 */
export const aiClassifyDocument = httpsCallable(async (request) => {
  const { text, fileUrl } = request.data;

  if (!text && !fileUrl) {
    throw new HttpsError('invalid-argument', 'text ou fileUrl é obrigatório');
  }

  try {
    const { GoogleAIService } = await import('@/lib/integrations/google/ai');
    const aiService = new GoogleAIService();

    const classification = await aiService.classifyDocument(text || '', fileUrl || '');

    return classification;
  } catch (error) {
    console.error('Erro na classificação:', error);
    throw new HttpsError('internal', 'Erro ao classificar documento');
  }
});

/**
 * Sumarização de documento com Gemini/MedLM
 */
export const aiSummarizeDocument = httpsCallable(async (request) => {
  const { text, documentType } = request.data;

  if (!text) {
    throw new HttpsError('invalid-argument', 'text é obrigatório');
  }

  try {
    const { GoogleAIService } = await import('@/lib/integrations/google/ai');
    const aiService = new GoogleAIService();

    const summary = await aiService.summarizeDocument(text, documentType || 'clinical_report');

    return summary;
  } catch (error) {
    console.error('Erro na sumarização:', error);
    throw new HttpsError('internal', 'Erro ao sumarizar documento');
  }
});

/**
 * Tradução de documento com Google Translation API
 */
export const aiTranslateDocument = httpsCallable(async (request) => {
  const { text, targetLanguage } = request.data;

  if (!text) {
    throw new HttpsError('invalid-argument', 'text é obrigatório');
  }

  if (!targetLanguage) {
    throw new HttpsError('invalid-argument', 'targetLanguage é obrigatório');
  }

  try {
    const { GoogleAIService } = await import('@/lib/integrations/google/ai');
    const aiService = new GoogleAIService();

    const translation = await aiService.translateDocument(text, targetLanguage);

    return translation;
  } catch (error) {
    console.error('Erro na tradução:', error);
    throw new HttpsError('internal', 'Erro ao traduzir documento');
  }
});

/**
 * Comparação de documentos com Gemini
 */
export const aiCompareDocuments = httpsCallable(async (request) => {
  const { currentText, patientId, documentType } = request.data;

  if (!currentText || !patientId) {
    throw new HttpsError('invalid-argument', 'currentText e patientId são obrigatórios');
  }

  try {
    const { GoogleAIService } = await import('@/lib/integrations/google/ai');
    const aiService = new GoogleAIService();

    // Buscar exames anteriores do Firestore
    const { getFirestore } = await import('firebase-admin/firestore');
    const db = getFirestore();

    const examsRef = db.collection('medical_records')
      .where('patientId', '==', patientId)
      .where('type', '==', 'exam_result')
      .orderBy('date', 'desc')
      .limit(1);

    const snapshot = await examsRef.get();

    if (snapshot.empty) {
      return {
        hasChanges: false,
        changes: [],
        message: 'Nenhum exame anterior encontrado para comparação',
      };
    }

    const previousExam = snapshot.docs[0].data();
    const previousText = previousExam.description || '';

    const comparison = await aiService.compareDocuments(
      currentText,
      previousText,
      documentType,
      previousExam.date
    );

    return comparison;
  } catch (error) {
    console.error('Erro na comparação:', error);
    throw new HttpsError('internal', 'Erro ao comparar documentos');
  }
});

/**
 * Gera PDF do documento analisado
 */
export const generateDocumentPDF = httpsCallable(async (request) => {
  const { documentData, includeTranslation } = request.data;

  if (!documentData) {
    throw new HttpsError('invalid-argument', 'documentData é obrigatório');
  }

  try {
    const { GoogleAIService } = await import('@/lib/integrations/google/ai');
    const aiService = new GoogleAIService();

    const pdfUrl = await aiService.generatePDF(documentData, includeTranslation || false);

    return { pdfUrl };
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    throw new HttpsError('internal', 'Erro ao gerar PDF');
  }
});

/**
 * Análise de movimento com MediaPipe Pose
 */
export const aiMovementAnalysisWithPose = httpsCallable(async (request) => {
  const { fileUrl, mediaType, includePoseData } = request.data;

  if (!fileUrl) {
    throw new HttpsError('invalid-argument', 'fileUrl é obrigatório');
  }

  try {
    const { GoogleAIService } = await import('@/lib/integrations/google/ai');
    const aiService = new GoogleAIService();

    const analysis = await aiService.analyzeMovement(fileUrl, {
      mediaType: mediaType || 'video',
      includePoseData: includePoseData ?? true,
    });

    return analysis;
  } catch (error) {
    console.error('Erro na análise de movimento:', error);
    throw new HttpsError('internal', 'Erro ao analisar movimento');
  }
});

/**
 * Chat com RAG para análise clínica
 */
export const aiChatWithRAG = httpsCallable(async (request) => {
  const { patientId, message, conversationHistory } = request.data;

  if (!patientId || !message) {
    throw new HttpsError('invalid-argument', 'patientId e message são obrigatórios');
  }

  try {
    const { GoogleAIService } = await import('@/lib/integrations/google/ai');
    const aiService = new GoogleAIService();

    const response = await aiService.chatWithRAG(patientId, message, conversationHistory || []);

    return response;
  } catch (error) {
    console.error('Erro no chat RAG:', error);
    throw new HttpsError('internal', 'Erro no chat com RAG');
  }
});

// ============================================================================
// Webhooks
// ============================================================================

/**
 * Webhook para Google Calendar (recebe notificações de mudanças)
 */
export const calendarWebhookFn = functions.https.onRequest(async (req, res) => {
  // Verificar método
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  // TODO: Validar signature do webhook
  const channelToken = req.query.channelToken as string;
  const signature = req.headers['x-goog-signature'] as string;

  if (!signature) {
    return res.status(401).send('Missing signature');
  }

  try {
    const headers = new Headers(Object.entries(req.headers));
    await (await import('@/lib/integrations/google/calendar')).handleCalendarWebhook(
      headers,
      req.body,
      channelToken,
      async (eventId, action) => {
        // TODO: Processar mudança no calendário
        console.log(`Calendar ${action}: ${eventId}`);
      }
    );

    return res.status(200).send('OK');
  } catch (error) {
    console.error('Erro no webhook do Calendar:', error);
    return res.status(500).send('Internal server error');
  }
});
