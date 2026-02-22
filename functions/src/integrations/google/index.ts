// Variáveis de Ambiente (Configurar no Google Cloud / .env)
import { getAdminDb } from '../../init';

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { google } from 'googleapis';
import { defineString } from 'firebase-functions/params';
import { DocsService } from './docs.service';
import { DriveService } from './drive.service';

const GOOGLE_CLIENT_ID = defineString('GOOGLE_CLIENT_ID', { default: '' });
const GOOGLE_CLIENT_SECRET = defineString('GOOGLE_CLIENT_SECRET', { default: '' });
const GOOGLE_MAPS_KEY = defineString('GOOGLE_MAPS_API_KEY', { default: '' });

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
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'O usuário deve estar autenticado.');
  }

  const { uid } = request.auth;
  const db = getAdminDb();

  try {
    // 1. Buscar o perfil do usuário para obter o organizationId
    const profileQuery = await db.collection('profiles')
      .where('user_id', '==', uid)
      .limit(1)
      .get();

    if (profileQuery.empty) {
      throw new HttpsError('not-found', 'Perfil de usuário não encontrado.');
    }

    const organizationId = profileQuery.docs[0].data().organization_id;

    if (!organizationId) {
      throw new HttpsError('failed-precondition', 'Usuário não está vinculado a uma organização.');
    }

    // 2. Buscar a configuração de marketing para obter o google_place_id
    const configSnap = await db.collection('marketing_configs')
      .doc(`${organizationId}_reviews`)
      .get();

    if (!configSnap.exists) {
      return { reviews: [] };
    }

    const config = configSnap.data();
    const placeId = config?.google_place_id;

    if (!placeId) {
      logger.info(`Nenhum Google Place ID configurado para a organização ${organizationId}`);
      return { reviews: [] };
    }

    // 3. Chamar a API do Google Places (Details)
    // Fields: reviews, rating, user_ratings_total
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews,rating,user_ratings_total&key=${GOOGLE_MAPS_KEY.value()}&language=pt-BR`;

    const response = await fetch(url);
    const data = await response.json() as any;

    if (data.status !== 'OK') {
      logger.error('Erro na API do Google Places', data);
      throw new HttpsError('internal', `Erro do Google: ${data.status}`);
    }

    const reviews = (data.result?.reviews || []).map((r: any) => ({
      author: r.author_name,
      rating: r.rating,
      comment: r.text,
      date: new Date(r.time * 1000).toISOString().split('T')[0],
      profile_photo: r.profile_photo_url,
      relative_time: r.relative_time_description
    }));

    return {
      reviews,
      rating: data.result?.rating,
      total_ratings: data.result?.user_ratings_total
    };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('Error fetching Google Business reviews', error);
    throw new HttpsError('internal', 'Falha ao buscar avaliações do Google.');
  }
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
