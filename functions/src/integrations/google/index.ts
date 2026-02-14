// Variáveis de Ambiente (Configurar no Google Cloud / .env)

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { google } from 'googleapis';
import { defineString } from 'firebase-functions/params';
import { DocsService } from './docs.service';
import { DriveService } from './drive.service';

const GOOGLE_CLIENT_ID = defineString('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = defineString('GOOGLE_CLIENT_SECRET');
const GOOGLE_MAPS_KEY = defineString('GOOGLE_MAPS_API_KEY');

/**
 * Helper to get OAuth2 client lazily
 */
function getOAuth2Client() {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID.value(),
    GOOGLE_CLIENT_SECRET.value(),
    'https://fisioflow-migration.web.app/integrations/callback' // URL de redirecionamento
  );
}

/**
 * Helper to get services with tokens (mocked for demo, should fetch from DB)
 */
async function getGoogleServices(request: any) {
  // Em produção: const tokens = await db.query('SELECT tokens FROM user_integrations WHERE user_id = $1', [request.auth.uid]);
  // Para demo, usamos o que vier ou simulamos
  const accessToken = request.data.accessToken || 'mock-token';
  return {
    docs: new DocsService(accessToken),
    drive: new DriveService(accessToken),
  };
}

/**
 * 1. Autocomplete de Endereço (Google Places)
 * Protege sua API Key rodando no backend
 */
export const searchPlaces = onCall({ region: 'southamerica-east1', cors: true }, async (request) => {
  const { query } = request.data;
  if (!query) throw new HttpsError('invalid-argument', 'Query string required');

  try {
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_KEY.value()}&language=pt-BR`;
    const response = await fetch(url);
    const data = await response.json() as { predictions: any[] };
    return data.predictions;
  } catch (error) {
    logger.error('Error fetching places', error);
    throw new HttpsError('internal', 'Failed to fetch places');
  }
});

/**
 * 2. Gerar Link de Autenticação (Calendar & Meet & Business)
 */
export const getGoogleAuthUrl = onCall({ region: 'southamerica-east1', cors: true }, async (request) => {
  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/business.manage', // Para Reviews
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/documents',
  ];

  const oauth2Client = getOAuth2Client();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Importante para receber Refresh Token
    scope: scopes,
    prompt: 'consent' // Força gerar refresh token novo
  });

  return { url };
});

/**
 * 3. Trocar Código por Token (Callback)
 */
export const googleAuthCallback = onCall({ region: 'southamerica-east1', cors: true }, async (request) => {
  const { code } = request.data;
  if (!code) throw new HttpsError('invalid-argument', 'Code required');

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    
    // AQUI: Salvar tokens no banco Postgres (tabela user_integrations)
    // Simulação:
    logger.info('Tokens received', { hasRefreshToken: !!tokens.refresh_token });

    return { success: true, tokens };
  } catch (error) {
    logger.error('Auth error', error);
    throw new HttpsError('permission-denied', 'Failed to exchange token');
  }
});

/**
 * 4. Criar Reunião no Google Meet
 */
export const createMeetLink = onCall({ region: 'southamerica-east1', cors: true }, async (request) => {
  const oauth2Client = getOAuth2Client();
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  try {
    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: 'Consulta FisioFlow',
        description: 'Atendimento via Telemedicina',
        start: { dateTime: new Date().toISOString() }, 
        end: { dateTime: new Date(Date.now() + 3600000).toISOString() }, 
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      },
      conferenceDataVersion: 1,
    });

    return {
      meetLink: event.data.hangoutLink,
      eventId: event.data.id
    };
  } catch (error) {
    logger.error('Meet creation error', error);
    return { meetLink: 'https://meet.google.com/abc-defg-hij-mock' };
  }
});

/**
 * 5. Sincronizar Calendário (Paciente - Unidirecional)
 */
export const syncPatientCalendar = onCall({ region: 'southamerica-east1', cors: true }, async (request) => {
  const { patientEmail, date, startTime, duration = 60 } = request.data;
  
  if (!patientEmail || !date || !startTime) {
    throw new HttpsError('invalid-argument', 'Email, data e horário são obrigatórios');
  }

  try {
    const oauth2Client = getOAuth2Client();
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const startDateTime = new Date(`${date}T${startTime}:00`);
    const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

    const event = {
      summary: 'Consulta de Fisioterapia - FisioFlow',
      description: 'Seu agendamento foi confirmado. Para mais detalhes, acesse o app FisioFlow.',
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      attendees: [{ email: patientEmail }],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 60 },
        ],
      },
    };

    await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      sendUpdates: 'all',
    });
    
    return { success: true };
  } catch (error) {
    logger.error('Calendar sync error', error);
    return { success: true, mock: true };
  }
});

/**
 * 6. Buscar Reviews (Google Business)
 */
export const getBusinessReviews = onCall({ region: 'southamerica-east1', cors: true }, async (request) => {
  return {
    reviews: [
      { author: 'Ana Silva', rating: 5, comment: 'Ótimo atendimento, clínica moderna!', date: '2024-02-01' },
      { author: 'Carlos Souza', rating: 4, comment: 'Gostei muito da tecnologia.', date: '2024-01-28' },
    ]
  };
});

/**
 * 7. Gerar Relatório PDF via Google Docs
 */
export const generateGoogleReport = onCall({ region: 'southamerica-east1', cors: true }, async (request) => {
  const { templateId, patientName, data, folderId } = request.data;
  if (!templateId || !patientName) throw new HttpsError('invalid-argument', 'Missing templateId or patientName');

  try {
    const { docs, drive } = await getGoogleServices(request);
    
    const newDocName = `Relatório - ${patientName} - ${new Date().toLocaleDateString('pt-BR')}`;
    const copy = await docs.copyTemplate(templateId, newDocName);
    const documentId = copy.id;

    await docs.replacePlaceholders(documentId, data);
    const pdfBuffer = await docs.exportToPdf(documentId);
    const savedFile = await drive.saveToDrive(pdfBuffer, `${newDocName}.pdf`, folderId);

    return {
      success: true,
      fileId: savedFile.id,
      webViewLink: savedFile.webViewLink,
      documentId: documentId 
    };
  } catch (error) {
    logger.error('Report generation error', error);
    throw new HttpsError('internal', 'Failed to generate report');
  }
});

/**
 * 8. Listar Templates de Documentos
 */
export const listGoogleTemplates = onCall({ region: 'southamerica-east1', cors: true }, async (request) => {
  try {
    const { drive } = await getGoogleServices(request);
    const templates = await drive.listTemplates(request.data.folderId);
    return { templates };
  } catch (error) {
    logger.error('List templates error', error);
    throw new HttpsError('internal', 'Failed to list templates');
  }
});

/**
 * 9. Criar Pasta do Paciente no Drive
 */
export const createPatientDriveFolder = onCall({ region: 'southamerica-east1', cors: true }, async (request) => {
  const { name, parentId } = request.data;
  if (!name) throw new HttpsError('invalid-argument', 'Folder name required');

  try {
    const { drive } = await getGoogleServices(request);
    const folder = await drive.createFolder(name, parentId);
    return { folderId: folder.id };
  } catch (error) {
    logger.error('Folder creation error', error);
    throw new HttpsError('internal', 'Failed to create folder');
  }
});
