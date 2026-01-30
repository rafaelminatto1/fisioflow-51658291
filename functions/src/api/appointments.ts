import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getPool } from '../init';
import { authorizeRequest } from '../middleware/auth';
import { Appointment } from '../types/models';

/**
 * Lista agendamentos com filtros
 */
interface ListAppointmentsRequest {
  dateFrom?: string;
  dateTo?: string;
  therapistId?: string;
  status?: string;
  patientId?: string;
  limit?: number;
  offset?: number;
}

interface ListAppointmentsResponse {
  data: Appointment[];
}

/**
 * Lista agendamentos com filtros
 */
export const listAppointments = onCall<ListAppointmentsRequest, Promise<ListAppointmentsResponse>>({ cors: true }, async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);

  const {
    dateFrom,
    dateTo,
    therapistId,
    status,
    patientId,
    limit = 100,
    offset = 0,
  } = request.data;

  const pool = getPool();

  try {
    let query = `
      SELECT
        a.*,
        p.name as patient_name,
        p.phone as patient_phone,
        prof.full_name as therapist_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN profiles prof ON a.therapist_id = prof.user_id
      WHERE a.organization_id = $1
    `;
    const params: (string | number)[] = [auth.organizationId];
    let paramCount = 1;

    if (dateFrom) {
      paramCount++;
      query += ` AND a.date >= $${paramCount}`;
      params.push(dateFrom);
    }

    if (dateTo) {
      paramCount++;
      query += ` AND a.date <= $${paramCount}`;
      params.push(dateTo);
    }

    if (therapistId) {
      paramCount++;
      query += ` AND a.therapist_id = $${paramCount}`;
      params.push(therapistId);
    }

    if (status) {
      paramCount++;
      query += ` AND a.status = $${paramCount}`;
      params.push(status);
    }

    if (patientId) {
      paramCount++;
      query += ` AND a.patient_id = $${paramCount}`;
      params.push(patientId);
    }

    query += ` ORDER BY a.date, a.start_time LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    return { data: result.rows as Appointment[] };
  } catch (error: unknown) {
    console.error('Error in listAppointments:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao listar agendamentos';
    throw new HttpsError('internal', errorMessage);
  }
});

interface GetAppointmentRequest {
  appointmentId: string;
}

interface GetAppointmentResponse {
  data: Appointment;
}

/**
 * Busca um agendamento por ID
 */
export const getAppointment = onCall<GetAppointmentRequest, Promise<GetAppointmentResponse>>({ cors: true }, async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);
  const { appointmentId } = request.data;

  if (!appointmentId) {
    throw new HttpsError('invalid-argument', 'appointmentId é obrigatório');
  }

  const pool = getPool();

  try {
    const result = await pool.query(
      `SELECT
        a.*,
        p.name as patient_name,
        p.phone as patient_phone,
        prof.full_name as therapist_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN profiles prof ON a.therapist_id = prof.user_id
      WHERE a.id = $1 AND a.organization_id = $2`,
      [appointmentId, auth.organizationId]
    );

    if (result.rows.length === 0) {
      throw new HttpsError('not-found', 'Agendamento não encontrado');
    }

    return { data: result.rows[0] as Appointment };
  } catch (error: unknown) {
    console.error('Error in getAppointment:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar agendamento';
    throw new HttpsError('internal', errorMessage);
  }
});

interface CheckTimeConflictRequest {
  date: string;
  startTime: string;
  endTime: string;
  therapistId: string;
  excludeAppointmentId?: string;
  organizationId: string;
}

/**
 * Verifica conflito de horário (Internal helper)
 */
async function checkTimeConflictHelper(pool: any, params: CheckTimeConflictRequest): Promise<boolean> {
  const { date, startTime, endTime, therapistId, excludeAppointmentId, organizationId } = params;

  let query = `
    SELECT id FROM appointments
    WHERE organization_id = $1
      AND therapist_id = $2
      AND date = $3
      AND status NOT IN ('cancelado', 'remarcado', 'paciente_faltou')
      AND (
        (start_time <= $4 AND end_time > $4) OR
        (start_time < $5 AND end_time >= $5) OR
        (start_time >= $4 AND end_time <= $5)
      )
  `;
  const sqlParams: (string | number)[] = [organizationId, therapistId, date, startTime, endTime];

  if (excludeAppointmentId) {
    query += ` AND id != $6`;
    sqlParams.push(excludeAppointmentId);
  }

  const result = await pool.query(query, sqlParams);
  return result.rows.length > 0;
}

/**
 * Verifica conflito de horário (Exposed Function)
 */
export const checkTimeConflict = onCall({ cors: true }, async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);
  const { therapistId, date, startTime, endTime, excludeAppointmentId } = request.data || {};

  if (!therapistId || !date || !startTime || !endTime) {
    throw new HttpsError('invalid-argument', 'terapeuta, data, horário início e fim são obrigatórios');
  }

  const pool = getPool();

  try {
    const hasConflict = await checkTimeConflictHelper(pool, {
      date,
      startTime,
      endTime,
      therapistId,
      excludeAppointmentId,
      organizationId: auth.organizationId,
    });

    return {
      hasConflict,
      conflictingAppointments: [], // Deprecated detailed list for now to simplify
    };
  } catch (error: unknown) {
    console.error('Error in checkTimeConflict:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao verificar conflito';
    throw new HttpsError('internal', errorMessage);
  }
});

interface CreateAppointmentRequest {
  patientId: string;
  therapistId: string;
  date: string;
  startTime: string;
  endTime: string;
  type: string;
  notes?: string;
  status?: string;
  session_type?: string;
}

interface CreateAppointmentResponse {
  data: Appointment;
}

/**
 * Cria um novo agendamento
 */
export const createAppointment = onCall<CreateAppointmentRequest, Promise<CreateAppointmentResponse>>({ cors: true }, async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);
  const data = request.data;

  // Validar campos obrigatórios
  const requiredFields = ['patientId', 'therapistId', 'date', 'startTime', 'endTime', 'type'];
  for (const field of requiredFields) {
    if (!data[field as keyof CreateAppointmentRequest]) {
      // Fallback check for session_type/type if needed
      if (field === 'type' && data.session_type) continue;
      throw new HttpsError('invalid-argument', `Campo obrigatório faltando: ${field}`);
    }
  }

  const pool = getPool();

  try {
    // Verificar conflitos
    const hasConflict = await checkTimeConflictHelper(pool, {
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      therapistId: data.therapistId,
      organizationId: auth.organizationId,
    });

    if (hasConflict) {
      throw new HttpsError('failed-precondition', 'Conflito de horário detectado');
    }

    // Inserir agendamento
    const result = await pool.query(
      `INSERT INTO appointments (
        patient_id, therapist_id, date, start_time, end_time,
        session_type, notes, status, organization_id, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        data.patientId,
        data.therapistId,
        data.date,
        data.startTime,
        data.endTime,
        data.type || data.session_type || 'individual',
        data.notes || null,
        data.status || 'agendado',
        auth.organizationId,
        auth.userId,
      ]
    );

    const appointment = result.rows[0];

    // Publicar Evento
    try {
      const realtime = await import('../realtime/publisher');
      await realtime.publishAppointmentEvent(auth.organizationId, {
        event: 'INSERT',
        new: appointment,
        old: null,
      });
    } catch (err) {
      console.error('Erro Ably:', err);
    }

    return { data: appointment as Appointment };
  } catch (error: unknown) {
    console.error('Error in createAppointment:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao criar agendamento';
    throw new HttpsError('internal', errorMessage);
  }
});

interface UpdateAppointmentRequest {
  appointmentId: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  therapistId?: string;
  status?: string;
  type?: string;
  notes?: string;
  [key: string]: any;
}

interface UpdateAppointmentResponse {
  data: Appointment;
}

/**
 * Atualiza um agendamento
 */
export const updateAppointment = onCall<UpdateAppointmentRequest, Promise<UpdateAppointmentResponse>>({ cors: true }, async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);
  const { appointmentId, ...updates } = request.data;

  if (!appointmentId) {
    throw new HttpsError('invalid-argument', 'appointmentId é obrigatório');
  }

  const pool = getPool();

  try {
    // Buscar agendamento atual
    const current = await pool.query(
      'SELECT * FROM appointments WHERE id = $1 AND organization_id = $2',
      [appointmentId, auth.organizationId]
    );

    if (current.rows.length === 0) {
      throw new HttpsError('not-found', 'Agendamento não encontrado');
    }

    const currentAppt = current.rows[0];

    // Se houver alteração de horário/terapeuta, verificar conflito
    if (updates.date || updates.startTime || updates.endTime || (updates.therapistId && updates.therapistId !== currentAppt.therapist_id)) {
      const hasConflict = await checkTimeConflictHelper(pool, {
        date: updates.date || currentAppt.date,
        startTime: updates.startTime || currentAppt.start_time,
        endTime: updates.endTime || currentAppt.end_time,
        therapistId: updates.therapistId || currentAppt.therapist_id,
        excludeAppointmentId: appointmentId,
        organizationId: auth.organizationId,
      });

      if (hasConflict) {
        throw new HttpsError('failed-precondition', 'Conflito de horário detectado');
      }
    }

    // Construir UPDATE
    const setClauses: string[] = [];
    const values: (string | number | boolean | Date | null)[] = [];
    let paramCount = 0;

    const allowedFields = ['date', 'start_time', 'end_time', 'therapist_id', 'status', 'type', 'notes'];

    // Mapeamento de campos request camelCase para db snake_case
    const fieldMap: Record<string, string> = {
      startTime: 'start_time',
      endTime: 'end_time',
      therapistId: 'therapist_id',
    };

    for (const key of Object.keys(updates)) {
      const dbField = fieldMap[key] || key;
      if (allowedFields.includes(dbField)) {
        paramCount++;
        setClauses.push(`${dbField} = $${paramCount}`);
        values.push(updates[key]);
      }
    }

    if (setClauses.length === 0) {
      throw new HttpsError('invalid-argument', 'Nenhum campo para atualizar');
    }

    paramCount++;
    setClauses.push(`updated_at = $${paramCount}`);
    values.push(new Date());

    values.push(appointmentId, auth.organizationId);

    const result = await pool.query(
      `UPDATE appointments
       SET ${setClauses.join(', ')}
       WHERE id = $${paramCount + 1} AND organization_id = $${paramCount + 2}
       RETURNING *`,
      values
    );

    const updatedAppt = result.rows[0];

    // Publicar Evento
    try {
      const realtime = await import('../realtime/publisher');
      await realtime.publishAppointmentEvent(auth.organizationId, {
        event: 'UPDATE',
        new: updatedAppt,
        old: currentAppt,
      });
    } catch (err) {
      console.error('Erro Ably:', err);
    }

    return { data: updatedAppt as Appointment };
  } catch (error: unknown) {
    console.error('Error in updateAppointment:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar agendamento';
    throw new HttpsError('internal', errorMessage);
  }
});

interface CancelAppointmentRequest {
  appointmentId: string;
  reason?: string;
}

interface CancelAppointmentResponse {
  success: boolean;
}

/**
 * Cancela um agendamento
 */
export const cancelAppointment = onCall<CancelAppointmentRequest, Promise<CancelAppointmentResponse>>({ cors: true }, async (request) => {
  if (!request.auth || !request.auth.token) {
    throw new HttpsError('unauthenticated', 'Requisita autenticação.');
  }
  const auth = await authorizeRequest(request.auth.token);
  const { appointmentId, reason } = request.data;

  if (!appointmentId) {
    throw new HttpsError('invalid-argument', 'appointmentId é obrigatório');
  }

  const pool = getPool();

  try {
    const current = await pool.query(
      'SELECT * FROM appointments WHERE id = $1 AND organization_id = $2',
      [appointmentId, auth.organizationId]
    );

    if (current.rows.length === 0) {
      throw new HttpsError('not-found', 'Agendamento não encontrado');
    }

    const result = await pool.query(
      `UPDATE appointments
       SET status = 'cancelado', notes = notes || $1, updated_at = NOW()
       WHERE id = $2 AND organization_id = $3
       RETURNING *`,
      [reason ? `\n[Cancelamento: ${reason}]` : '', appointmentId, auth.organizationId]
    );

    // Publicar Evento
    try {
      const realtime = await import('../realtime/publisher');
      await realtime.publishAppointmentEvent(auth.organizationId, {
        event: 'UPDATE',
        new: result.rows[0],
        old: current.rows[0],
      });
    } catch (err) {
      console.error('Erro Ably:', err);
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Error in cancelAppointment:', error);
    if (error instanceof HttpsError) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Erro ao cancelar agendamento';
    throw new HttpsError('internal', errorMessage);
  }
});
