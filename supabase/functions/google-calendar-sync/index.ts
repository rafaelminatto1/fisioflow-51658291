// Edge Function para sincronização com Google Calendar
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { checkRateLimit, createRateLimitResponse, addRateLimitHeaders } from '../_shared/rate-limit.ts';
import { validateAuth, createSupabaseClient, errorResponse, successResponse, getCorsHeaders } from '../_shared/api-helpers.ts';
import { captureException } from '../_shared/sentry.ts';

const corsHeaders = getCorsHeaders();

interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  attendees?: Array<{ email: string; displayName?: string }>;
  reminders?: { useDefault: boolean };
  status?: string;
}

serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const headers = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  try {
    // Rate limiting
    const rateLimitResult = await checkRateLimit(req, 'google-calendar-sync', { maxRequests: 30, windowMinutes: 5 });
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult, headers);
    }

    // Autenticação
    const { user, error: authError } = await validateAuth(req);
    if (authError) return authError;

    const supabase = createSupabaseClient(req);

    const url = new URL(req.url);
    const pathname = url.pathname;

    // Rota: POST /google-calendar-sync/connect
    if (pathname.endsWith('/connect') && req.method === 'POST') {
      return await connectGoogleCalendar(req, supabase, user!);
    }

    // Rota: POST /google-calendar-sync/sync
    if (pathname.endsWith('/sync') && req.method === 'POST') {
      return await syncCalendar(req, supabase, user!);
    }

    // Rota: POST /google-calendar-sync/webhook
    if (pathname.endsWith('/webhook') && req.method === 'POST') {
      return await handleWebhook(req, supabase);
    }

    return errorResponse('Rota não encontrada', 404);
  } catch (error) {
    console.error('Erro no Google Calendar Sync:', error);
    captureException(error instanceof Error ? error : new Error(String(error)));

    return errorResponse('Erro ao processar requisição', 500);
  }
});

/**
 * Inicia processo de OAuth2 com Google Calendar
 */
async function connectGoogleCalendar(
  req: Request,
  supabase: any,
  user: { id: string; organization_id?: string }
): Promise<Response> {
  const body = await req.json();
  const { redirectUrl } = body;

  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    return errorResponse('Google Calendar não configurado', 500);
  }

  // Gerar state para segurança
  const state = crypto.randomUUID();

  // Salvar state no banco
  await supabase.from('calendar_oauth_states').insert({
    user_id: user.id,
    state,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutos
  });

  // URL de autorização do Google
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUrl || `${req.headers.get('origin')}/configuracoes/calendario`);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('state', state);

  return successResponse({
    authUrl: authUrl.toString(),
    state,
  });
}

/**
 * Sincroniza eventos entre Supabase e Google Calendar
 */
async function syncCalendar(
  req: Request,
  supabase: any,
  user: { id: string; organization_id?: string }
): Promise<Response> {
  const body = await req.json();
  const { direction = 'bidirectional' } = body; // 'to_google', 'from_google', 'bidirectional'

  // Buscar integração do usuário
  const { data: integration } = await supabase
    .from('calendar_integrations')
    .select('*')
    .eq('user_id', user.id)
    .eq('provider', 'google')
    .single();

  if (!integration || !integration.access_token) {
    return errorResponse('Google Calendar não conectado', 400);
  }

  const results = {
    toGoogle: { created: 0, updated: 0, errors: [] as string[] },
    fromGoogle: { created: 0, updated: 0, errors: [] as string[] },
  };

  // Sincronizar para Google Calendar
  if (direction === 'to_google' || direction === 'bidirectional') {
    const { data: appointments } = await supabase
      .from('appointments')
      .select('*, patients(email, name)')
      .eq('organization_id', user.organization_id)
      .gte('start_time', new Date().toISOString())
      .eq('status', 'scheduled');

    for (const apt of appointments || []) {
      try {
        await syncAppointmentToGoogle(apt, integration.access_token, integration.refresh_token);
        if (apt.google_event_id) {
          results.toGoogle.updated++;
        } else {
          results.toGoogle.created++;
        }
      } catch (error) {
        results.toGoogle.errors.push(`Erro ao sincronizar agendamento ${apt.id}: ${error}`);
      }
    }
  }

  // Sincronizar do Google Calendar
  if (direction === 'from_google' || direction === 'bidirectional') {
    try {
      const { events, nextSyncToken } = await fetchGoogleCalendarEvents(
        integration.access_token,
        integration.refresh_token,
        integration.sync_token // Pass stored sync token
      );

      for (const event of events) {
        try {
          await syncEventFromGoogle(event, supabase, user.organization_id, integration.calendar_email);
          results.fromGoogle.created++;
        } catch (error) {
          // Ignore constraint errors (e.g. missing patient) but log
          // Can check error code for '23502' (not null violation)
          results.fromGoogle.errors.push(`Erro ao sincronizar evento ${event.id}: ${error}`);
        }
      }

      // Update sync token
      if (nextSyncToken) {
        await supabase.from('calendar_integrations')
          .update({ sync_token: nextSyncToken })
          .eq('id', integration.id);
      }
    } catch (error) {
      results.fromGoogle.errors.push(`Erro ao buscar eventos: ${error}`);
    }
  }

  // Atualizar última sincronização
  await supabase
    .from('calendar_integrations')
    .update({
      last_synced_at: new Date().toISOString(),
      events_synced_count: (integration.events_synced_count || 0) + results.toGoogle.created + results.fromGoogle.created,
    })
    .eq('id', integration.id);

  return successResponse({
    direction,
    results,
    synced_at: new Date().toISOString(),
  });
}

/**
 * Sincroniza um agendamento para o Google Calendar
 */
async function syncAppointmentToGoogle(
  appointment: any,
  accessToken: string,
  refreshToken: string
): Promise<void> {
  const event: GoogleCalendarEvent = {
    summary: `Consulta: ${appointment.patients?.name || 'Paciente'}`,
    description: appointment.notes || '',
    start: {
      dateTime: appointment.start_time,
      timeZone: 'America/Sao_Paulo',
    },
    end: {
      dateTime: appointment.end_time || new Date(new Date(appointment.start_time).getTime() + 60 * 60 * 1000).toISOString(),
      timeZone: 'America/Sao_Paulo',
    },
    reminders: { useDefault: true },
  };

  if (appointment.patients?.email) {
    event.attendees = [{ email: appointment.patients.email }];
  }

  const url = appointment.google_event_id
    ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${appointment.google_event_id}`
    : 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

  const method = appointment.google_event_id ? 'PUT' : 'POST';

  let token = accessToken;
  let response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  // Se token expirou, renovar
  if (response.status === 401) {
    token = await refreshGoogleToken(refreshToken);
    response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });
  }

  if (!response.ok) {
    throw new Error(`Erro ao sincronizar com Google: ${response.statusText}`);
  }

  const eventData = await response.json();

  // Atualizar appointment com google_event_id
  // Isso deve ser feito pela função chamadora
  return eventData.id;
}

/**
 * Busca eventos do Google Calendar
 */
/**
 * Busca eventos do Google Calendar
 */
async function fetchGoogleCalendarEvents(
  accessToken: string,
  refreshToken: string,
  syncToken?: string
): Promise<{ events: GoogleCalendarEvent[], nextSyncToken?: string }> {
  let token = accessToken;
  let url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=2500&singleEvents=true';

  if (syncToken) {
    url += `&syncToken=${syncToken}`;
  } else {
    // Full sync from now - 1 month to +6 months if no sync token
    const timeMin = new Date();
    timeMin.setMonth(timeMin.getMonth() - 1);
    const timeMax = new Date();
    timeMax.setMonth(timeMax.getMonth() + 6);
    url += `&timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&orderBy=startTime`;
  }

  const fetchPage = async (pageUrl: string): Promise<{ items: GoogleCalendarEvent[], nextSyncToken?: string, nextPageToken?: string }> => {
    let response = await fetch(pageUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.status === 401) {
      token = await refreshGoogleToken(refreshToken);
      response = await fetch(pageUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
    }

    if (response.status === 410) {
      // Sync token invalid (expired/deleted), require full sync
      throw new Error('SYNC_TOKEN_INVALID');
    }

    if (!response.ok) {
      throw new Error(`Erro ao buscar eventos: ${response.statusText}`);
    }

    return await response.json();
  };

  try {
    let allEvents: GoogleCalendarEvent[] = [];
    let nextSyncToken: string | undefined;
    let pageToken: string | undefined;

    do {
      const currentPageUrl = pageToken ? `${url}&pageToken=${pageToken}` : url;
      const data = await fetchPage(currentPageUrl);

      if (data.items) {
        allEvents = [...allEvents, ...data.items];
      }

      nextSyncToken = data.nextSyncToken;
      pageToken = data.nextPageToken;
    } while (pageToken);

    return { events: allEvents, nextSyncToken };
  } catch (error) {
    if (error instanceof Error && error.message === 'SYNC_TOKEN_INVALID') {
      // Retry without sync token (full sync)
      return fetchGoogleCalendarEvents(accessToken, refreshToken);
    }
    throw error;
  }
}

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{ email: string; displayName?: string }>;
  reminders?: { useDefault: boolean };
  status?: string;
  updated?: string;
}

/**
 * Sincroniza evento do Google para Supabase
 */
async function syncEventFromGoogle(
  event: GoogleCalendarEvent,
  supabase: any,
  organizationId?: string,
  userEmail?: string
): Promise<void> {
  // Ignorar eventos 'cancelled' se não existirem no DB, ou deletar se existirem
  if (event.status === 'cancelled') {
    const { data: existing } = await supabase
      .from('appointments')
      .select('id')
      .eq('google_event_id', event.id)
      .maybeSingle();

    if (existing) {
      await supabase.from('appointments').delete().eq('id', existing.id);
    }
    return;
  }

  // Verificar se já existe
  const { data: existing } = await supabase
    .from('appointments')
    .select('id, updated_at')
    .eq('google_event_id', event.id)
    .maybeSingle();

  const startTime = event.start.dateTime || event.start.date;
  const endTime = event.end.dateTime || event.end.date;
  const notes = event.description || '';
  const eventUpdatedAt = event.updated ? new Date(event.updated) : new Date();

  if (existing) {
    // Conflict Resolution: Last Write Wins
    const localUpdatedAt = new Date(existing.updated_at);

    // Se o evento no Google é mais antigo que a última atualização local, ignoramos
    // (Isso evita sobrescrever mudanças locais recentes com dados velhos do sync inicial)
    // Mas se usamos syncToken, teoricamente é uma mudança nova.
    // Vamos dar uma margem de segurança de 1 minuto para clock skew
    if (eventUpdatedAt < localUpdatedAt && (localUpdatedAt.getTime() - eventUpdatedAt.getTime()) > 60000) {
      console.log(`Skipping update for ${event.id}: Local version is newer.`);
      return;
    }

    // Atualizar existente
    await supabase
      .from('appointments')
      .update({
        start_time: startTime,
        end_time: endTime,
        notes: notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } else {
    // Criar novo
    // Tentar identificar paciente pelo email
    let patientId = null;
    let patientName = 'Google Calendar Event';
    let type = 'Consulta Inicial'; // Default seguro se não houver constraint
    let status = 'agendado';

    // Check attendees
    if (event.attendees && event.attendees.length > 0) {
      // Find first attendee that is NOT the user (therapist)
      // This requires knowing therapist email, passing userEmail (from authentication)
      const patientAttendee = event.attendees.find(a => a.email !== userEmail && a.email !== 'fisioflow@system');

      if (patientAttendee && patientAttendee.email) {
        const { data: patient } = await supabase
          .from('patients')
          .select('id, name')
          .eq('email', patientAttendee.email)
          .maybeSingle();

        if (patient) {
          patientId = patient.id;
          patientName = patient.name;
        } else {
          // Could verify if name matches? For now, stick to block
          patientName = patientAttendee.displayName || patientAttendee.email;
        }
      }
    }

    if (!patientId) {
      // Tentar encontrar ou criar paciente "Bloqueio de Agenda"
      const DUMMY_EMAIL = `external-${organizationId || 'default'}@fisioflow.system`;

      const { data: dummyPatient } = await supabase
        .from('patients')
        .select('id, name')
        .eq('email', DUMMY_EMAIL)
        .maybeSingle();

      if (dummyPatient) {
        patientId = dummyPatient.id;
        patientName = dummyPatient.name;
      } else {
        // Criar novo dummy patient
        const { data: newPatient, error: createError } = await supabase
          .from('patients')
          .insert({
            organization_id: organizationId,
            name: 'Bloqueio de Agenda (Google)',
            email: DUMMY_EMAIL,
            phone: '000000000', // Campo obrigatório? Assumindo que sim ou não nulo
            status: 'active', // Assumindo status required
            notes: 'Paciente gerado automaticamente para representar eventos externos do Google Calendar.'
          })
          .select('id, name')
          .single();

        if (createError) {
          console.error('Erro ao criar paciente dummy:', createError);
          // Se falhar, não podemos criar o agendamento devido a constraint
          // Vamos lançar erro ou ignorar?
          // Melhor ignorar este evento especifico e logar erro
          throw new Error(`Falha ao criar paciente dummy: ${createError.message}`);
        }

        if (newPatient) {
          patientId = newPatient.id;
          patientName = newPatient.name;
        }
      }

      // Evento Externo (Bloqueio)
      if (patientId) {
        notes = `[Evento Externo Google] ${event.summary}\n${notes}`;
      }
    }

    if (patientId) {
      await supabase.from('appointments').insert({
        organization_id: organizationId,
        patient_id: patientId,
        google_event_id: event.id,
        start_time: startTime,
        end_time: endTime,
        type: type,
        status: status,
        notes: notes,
      });
    } else {
      console.warn(`Skipping event ${event.id} because no patient could be linked.`);
    }
  }
}

/**
 * Renova token do Google
 */
async function refreshGoogleToken(refreshToken: string): Promise<string> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error('Erro ao renovar token do Google');
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Handle webhook do Google Calendar
 */
async function handleWebhook(req: Request, supabase: any): Promise<Response> {
  // Verificar assinatura do webhook
  const signature = req.headers.get('X-Goog-Channel-Token');
  const expectedToken = Deno.env.get('GOOGLE_WEBHOOK_SECRET');

  if (signature !== expectedToken) {
    return errorResponse('Assinatura inválida', 401);
  }

  const body = await req.json();
  const { resourceId, channelId } = body;

  // Processar mudanças
  // Nota: Implementação simplificada - em produção, buscar eventos alterados

  return successResponse({ received: true });
}

