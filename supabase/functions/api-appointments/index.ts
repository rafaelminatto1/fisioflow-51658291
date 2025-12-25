import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  successResponse,
  errorResponse,
  createdResponse,
  noContentResponse,
  optionsResponse,
  createSupabaseClient,
  validateAuth,
  extractIdFromPath,
  isValidUUID,
  methodNotAllowed,
  parseJsonBody,
  logRequest,
  handleSupabaseError,
} from '../_shared/api-helpers.ts';
import { appointmentCreateSchema, appointmentUpdateSchema, appointmentCancelSchema, validateSchema } from '../_shared/schemas.ts';
import { checkRateLimit, createRateLimitResponse } from '../_shared/rate-limit.ts';

const BASE_PATH = '/api-appointments';

serve(async (req: Request) => {
  const url = new URL(req.url);
  const pathname = url.pathname;
  logRequest(req, 'Appointments API');

  if (req.method === 'OPTIONS') {
    return optionsResponse();
  }

  // Rate limiting
  const rateLimitResult = await checkRateLimit(req, 'api-appointments', { maxRequests: 100, windowMinutes: 1 });
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult, {});
  }

  // Autenticação
  const { user, error: authError } = await validateAuth(req);
  if (authError) return authError;

  const supabase = createSupabaseClient(req);

  try {
    const appointmentId = extractIdFromPath(pathname, BASE_PATH);

    // Rota: GET /api-appointments/availability
    if (pathname.endsWith('/availability')) {
      return await checkAvailability(url, supabase, user!.organization_id);
    }

    // Rota: POST /api-appointments/:id/confirm
    if (appointmentId && pathname.endsWith('/confirm') && req.method === 'POST') {
      return await confirmAppointment(supabase, appointmentId, user!.organization_id);
    }

    // Rota: POST /api-appointments/:id/cancel
    if (appointmentId && pathname.endsWith('/cancel') && req.method === 'POST') {
      return await cancelAppointment(req, supabase, appointmentId, user!.organization_id);
    }

    // Rotas com ID
    if (appointmentId && !pathname.includes('/confirm') && !pathname.includes('/cancel')) {
      if (!isValidUUID(appointmentId)) {
        return errorResponse('ID de agendamento inválido', 400);
      }

      switch (req.method) {
        case 'GET':
          return await getAppointment(supabase, appointmentId, user!.organization_id);
        case 'PATCH':
          return await updateAppointment(req, supabase, appointmentId, user!.organization_id);
        default:
          return methodNotAllowed(['GET', 'PATCH']);
      }
    }

    // Rotas sem ID (collection)
    switch (req.method) {
      case 'GET':
        return await listAppointments(url, supabase, user!.organization_id);
      case 'POST':
        return await createAppointment(req, supabase, user!);
      default:
        return methodNotAllowed(['GET', 'POST']);
    }
  } catch (error) {
    console.error('Appointments API Error:', error);
    return errorResponse('Erro interno do servidor', 500);
  }
});

// ========== LIST APPOINTMENTS ==========
async function listAppointments(url: URL, supabase: any, organizationId?: string) {
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');
  const therapistId = url.searchParams.get('therapistId');
  const statusParam = url.searchParams.get('status');

  if (!startDate || !endDate) {
    return errorResponse('startDate e endDate são obrigatórios', 400);
  }

  let query = supabase
    .from('appointments')
    .select(`
      *,
      patient:patients(id, name, phone, email, photo_url),
      therapist:profiles(id, name)
    `)
    .gte('start_time', startDate)
    .lte('start_time', endDate + 'T23:59:59');

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  if (therapistId) {
    query = query.eq('therapist_id', therapistId);
  }

  if (statusParam) {
    const statuses = statusParam.split(',');
    query = query.in('status', statuses);
  }

  query = query.order('start_time', { ascending: true });

  const { data, error } = await query;

  if (error) {
    return handleSupabaseError(error);
  }

  return successResponse(data || []);
}

// ========== GET APPOINTMENT ==========
async function getAppointment(supabase: any, appointmentId: string, organizationId?: string) {
  let query = supabase
    .from('appointments')
    .select(`
      *,
      patient:patients(*),
      therapist:profiles(id, name, email),
      session:sessions(*)
    `)
    .eq('id', appointmentId);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query.single();

  if (error) {
    if (error.code === 'PGRST116') {
      return errorResponse('Agendamento não encontrado', 404);
    }
    return handleSupabaseError(error);
  }

  return successResponse(data);
}

// ========== CREATE APPOINTMENT ==========
async function createAppointment(req: Request, supabase: any, user: { id: string; organization_id?: string }) {
  const { data: body, error: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;

  const validation = validateSchema(appointmentCreateSchema, body);
  if (!validation.success) {
    return errorResponse(validation.error, 400);
  }

  const { patient_id, therapist_id, start_time, duration, notes } = validation.data;

  // Calcular end_time
  const startDate = new Date(start_time);
  const endDate = new Date(startDate.getTime() + duration * 60000);

  // Verificar conflito de horário
  const { data: conflicts } = await supabase
    .from('appointments')
    .select('id')
    .eq('organization_id', user.organization_id)
    .neq('status', 'cancelled')
    .or(`and(start_time.lt.${endDate.toISOString()},end_time.gt.${startDate.toISOString()})`)
    .eq('therapist_id', therapist_id || user.id);

  if (conflicts && conflicts.length > 0) {
    return errorResponse('Conflito de horário detectado', 409, 'SCHEDULE_CONFLICT');
  }

  const appointmentData = {
    patient_id,
    therapist_id: therapist_id || user.id,
    start_time: startDate.toISOString(),
    end_time: endDate.toISOString(),
    duration,
    status: 'scheduled',
    notes,
    organization_id: user.organization_id,
    created_by: user.id,
    reminder_sent: false,
  };

  const { data, error } = await supabase
    .from('appointments')
    .insert(appointmentData)
    .select(`
      *,
      patient:patients(id, name, phone),
      therapist:profiles(id, name)
    `)
    .single();

  if (error) {
    return handleSupabaseError(error);
  }

  return createdResponse(data);
}

// ========== UPDATE APPOINTMENT ==========
async function updateAppointment(req: Request, supabase: any, appointmentId: string, organizationId?: string) {
  const { data: body, error: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;

  const validation = validateSchema(appointmentUpdateSchema, body);
  if (!validation.success) {
    return errorResponse(validation.error, 400);
  }

  const updateData: any = { ...validation.data, updated_at: new Date().toISOString() };

  // Se start_time ou duration foram alterados, recalcular end_time
  if (validation.data.start_time || validation.data.duration) {
    // Buscar dados atuais
    const { data: current } = await supabase
      .from('appointments')
      .select('start_time, duration')
      .eq('id', appointmentId)
      .single();

    if (current) {
      const startTime = validation.data.start_time || current.start_time;
      const duration = validation.data.duration || current.duration;
      const startDate = new Date(startTime);
      updateData.end_time = new Date(startDate.getTime() + duration * 60000).toISOString();
      if (validation.data.start_time) updateData.start_time = startDate.toISOString();
    }
  }

  let query = supabase
    .from('appointments')
    .update(updateData)
    .eq('id', appointmentId);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query.select().single();

  if (error) {
    if (error.code === 'PGRST116') {
      return errorResponse('Agendamento não encontrado', 404);
    }
    return handleSupabaseError(error);
  }

  return successResponse(data);
}

// ========== CONFIRM APPOINTMENT ==========
async function confirmAppointment(supabase: any, appointmentId: string, organizationId?: string) {
  let query = supabase
    .from('appointments')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', appointmentId)
    .eq('status', 'scheduled');

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query.select().single();

  if (error) {
    if (error.code === 'PGRST116') {
      return errorResponse('Agendamento não encontrado ou já confirmado', 404);
    }
    return handleSupabaseError(error);
  }

  return successResponse(data);
}

// ========== CANCEL APPOINTMENT ==========
async function cancelAppointment(req: Request, supabase: any, appointmentId: string, organizationId?: string) {
  const { data: body } = await parseJsonBody(req);
  
  const validation = body ? validateSchema(appointmentCancelSchema, body) : { success: true, data: {} };

  const updateData = {
    status: 'cancelled',
    cancelled_at: new Date().toISOString(),
    cancel_reason: validation.success ? (validation.data as any).reason : undefined,
    cancelled_by: validation.success ? (validation.data as any).cancelled_by : 'clinic',
  };

  let query = supabase
    .from('appointments')
    .update(updateData)
    .eq('id', appointmentId)
    .neq('status', 'cancelled');

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query.select().single();

  if (error) {
    if (error.code === 'PGRST116') {
      return errorResponse('Agendamento não encontrado ou já cancelado', 404);
    }
    return handleSupabaseError(error);
  }

  // TODO: Trigger waitlist offer

  return successResponse(data);
}

// ========== CHECK AVAILABILITY ==========
async function checkAvailability(url: URL, supabase: any, organizationId?: string) {
  const date = url.searchParams.get('date');
  const therapistId = url.searchParams.get('therapistId');
  const duration = parseInt(url.searchParams.get('duration') || '60', 10);

  if (!date) {
    return errorResponse('date é obrigatório', 400);
  }

  // Buscar configuração de horários (9h às 18h default)
  const workStartHour = 9;
  const workEndHour = 18;
  const slotDuration = 30; // slots de 30 min

  // Buscar agendamentos do dia
  let query = supabase
    .from('appointments')
    .select('start_time, end_time, therapist_id')
    .gte('start_time', `${date}T00:00:00`)
    .lt('start_time', `${date}T23:59:59`)
    .neq('status', 'cancelled');

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  if (therapistId) {
    query = query.eq('therapist_id', therapistId);
  }

  const { data: appointments, error } = await query;

  if (error) {
    return handleSupabaseError(error);
  }

  // Gerar slots disponíveis
  const slots: { time: string; available: boolean; occupancy: number; maxCapacity: number }[] = [];
  const dateObj = new Date(date);

  for (let hour = workStartHour; hour < workEndHour; hour++) {
    for (let min = 0; min < 60; min += slotDuration) {
      const slotTime = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      const slotStart = new Date(dateObj);
      slotStart.setHours(hour, min, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + duration * 60000);

      // Verificar se há conflito
      const hasConflict = appointments?.some((apt: any) => {
        const aptStart = new Date(apt.start_time);
        const aptEnd = new Date(apt.end_time);
        return slotStart < aptEnd && slotEnd > aptStart;
      });

      const occupancy = appointments?.filter((apt: any) => {
        const aptStart = new Date(apt.start_time);
        return aptStart.getHours() === hour && aptStart.getMinutes() === min;
      }).length || 0;

      slots.push({
        time: slotTime,
        available: !hasConflict,
        occupancy,
        maxCapacity: 1, // Por terapeuta
      });
    }
  }

  return successResponse(slots);
}

