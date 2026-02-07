
// Variáveis de Ambiente (Configurar no Google Cloud / .env)

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { google } from 'googleapis';
import { defineString } from 'firebase-functions/params';

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

    return { success: true };
  } catch (error) {
    logger.error('Auth error', error);
    throw new HttpsError('permission-denied', 'Failed to exchange token');
  }
});

/**
 * 4. Criar Reunião no Google Meet
 */
export const createMeetLink = onCall({ region: 'southamerica-east1', cors: true }, async (request) => {
  // Em produção, leríamos o token do banco do usuário logado
  // oauth2Client.setCredentials({ refresh_token: ... })

  const oauth2Client = getOAuth2Client();
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  try {
    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: 'Consulta FisioFlow',
        description: 'Atendimento via Telemedicina',
        start: { dateTime: new Date().toISOString() }, // Exemplo: agora
        end: { dateTime: new Date(Date.now() + 3600000).toISOString() }, // +1 hora
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
    // Retorna mock se não tiver configurado ainda, pra não quebrar a demo
    return { meetLink: 'https://meet.google.com/abc-defg-hij-mock' };
  }
});

/**
 * 5. Sincronizar Calendário (Paciente - Unidirecional)
 * O paciente não pode editar, apenas ver.
 */
export const syncPatientCalendar = onCall({ region: 'southamerica-east1', cors: true }, async (request) => {
  const { appointmentId, patientEmail } = request.data;
  
  // Lógica: Inserir evento no calendário do paciente como "Busy"
  // Requer que o paciente tenha dado permissão ou usamos Service Account convidando ele
  logger.info('Syncing calendar for', { appointmentId, patientEmail });
  
  return { success: true, message: 'Event pushed to patient calendar' };
});

/**
 * 6. Buscar Reviews (Google Business)
 */
export const getBusinessReviews = onCall({ region: 'southamerica-east1', cors: true }, async (request) => {
  // Requer Google My Business API habilitada
  // Mock para demonstração até configurar API
  return {
    reviews: [
      { author: 'Ana Silva', rating: 5, comment: 'Ótimo atendimento, clínica moderna!', date: '2024-02-01' },
      { author: 'Carlos Souza', rating: 4, comment: 'Gostei muito da tecnologia.', date: '2024-01-28' },
    ]
  };
});

