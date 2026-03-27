import { Hono } from 'hono';
import type { MiddlewareHandler } from 'hono';
import type { Env } from '../types/env';
import { requireAuth, type AuthVariables } from '../lib/auth';
import { eq, and, sql, desc, asc, lte, gte, ne } from 'drizzle-orm';
import { appointments, patients } from '@fisioflow/db';
import {
  normalizeStatus,
  calculateEndTime,
  isConflictError,
  countsTowardCapacity,
} from './appointmentHelpers';
import { createDb } from '../lib/db';
import { isUuid } from '../lib/validators';
import { triggerInngestEvent } from '../lib/inngest-client';
import { broadcastToOrg } from '../lib/realtime';



const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

function normalizeAppointmentRow(row: any) {
  return {
    ...row,
    id: String(row.id),
    patient_id: row.patientId,
    therapist_id: row.therapistId,
    organization_id: row.organizationId,
    start_time: row.startTime ? String(row.startTime).substring(0, 5) : null,
    end_time: row.endTime ? String(row.endTime).substring(0, 5) : null,
    duration_minutes: row.durationMinutes,
    payment_status: row.paymentStatus,
    payment_amount: row.paymentAmount,
    patient_name: row.patient?.fullName ?? row.patient_name ?? null,
    patient_phone: row.patient?.phone ?? row.patient_phone ?? null,
    created_at: row.createdAt ? String(row.createdAt) : null,
    updated_at: row.updatedAt ? String(row.updatedAt) : null,
  };
}


app.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  try {
    const { dateFrom, dateTo, therapistId, patientId, status, limit = '100' } = c.req.query();
    
    let conditions = eq(appointments.organizationId, user.organizationId);

    if (dateFrom) conditions = and(conditions, gte(appointments.date, dateFrom))!;
    if (dateTo)   conditions = and(conditions, lte(appointments.date, dateTo))!;
    if (therapistId) conditions = and(conditions, eq(appointments.therapistId, therapistId))!;
    if (patientId)   conditions = and(conditions, eq(appointments.patientId, patientId))!;
    if (status)      conditions = and(conditions, eq(appointments.status, status as any))!;

    const limitNum = Math.min(1000, Math.max(1, parseInt(limit) || 100));

    const result = await db
      .select({
        id: appointments.id,
        patientId: appointments.patientId,
        therapistId: appointments.therapistId,
        date: appointments.date,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        status: appointments.status,
        type: appointments.type,
        notes: appointments.notes,
        paymentStatus: appointments.paymentStatus,
        paymentAmount: appointments.paymentAmount,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt,
        patient_name: patients.fullName,
        patient_phone: patients.phone,
      })
      .from(appointments)
      .leftJoin(patients, eq(patients.id, appointments.patientId))
      .where(conditions)
      .orderBy(desc(appointments.date), desc(appointments.startTime))
      .limit(limitNum);

    
    const sanitizedRows = result.map(normalizeAppointmentRow);

    c.header('Cache-Control', 'no-store');
    return c.json({ data: sanitizedRows });
  } catch (error: any) {
    console.error('[Appointments/List] Error:', error.message);
    return c.json({ data: [] });
  }
});



async function getIntervalCapacity(
  db: any,
  organizationId: string,
  date: string,
  startTime: string,
  endTime: string,
): Promise<number> {
  try {
    // schedule_capacity table might not be in schema, use sql fallback
    const result = await db.execute(sql`
      SELECT MIN(max_patients)::int AS capacity
      FROM schedule_capacity
      WHERE organization_id = ${organizationId}::uuid
        AND day_of_week = EXTRACT(DOW FROM ${date}::date)
        AND start_time < ${endTime}::time
        AND end_time > ${startTime}::time
    `);

    const capacity = Number(result.rows?.[0]?.capacity ?? 1);
    return Number.isFinite(capacity) && capacity > 0 ? capacity : 1;
  } catch (error: any) {
    if (error?.message?.includes('does not exist')) {
      return 1;
    }
    throw error;
  }
}

async function getOverlappingAppointments(
  db: any,
  organizationId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeAppointmentId?: string,
): Promise<Array<{ id: string; patientId: string; startTime: string; date: string }>> {
  let conditions = and(
    eq(appointments.organizationId, organizationId),
    eq(appointments.date, date),
    sql`${appointments.status} NOT IN ('cancelado', 'faltou', 'faltou_com_aviso', 'faltou_sem_aviso', 'remarcar')`,
    sql`${appointments.startTime} < ${endTime}::time`,
    sql`${appointments.endTime} > ${startTime}::time`,
  );

  if (excludeAppointmentId) {
    conditions = and(conditions, ne(appointments.id, excludeAppointmentId))!;
  }

  const result = await db
    .select({
      id: appointments.id,
      patientId: appointments.patientId,
      startTime: appointments.startTime,
      date: appointments.date,
    })
    .from(appointments)
    .where(conditions)
    .orderBy(asc(appointments.startTime), asc(appointments.createdAt));

  return result;
}


async function enforceCapacity(
  db: any,
  organizationId: string,
  payload: {
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    ignoreCapacity?: boolean;
    excludeAppointmentId?: string;
  },
) {

  if (payload.ignoreCapacity || !countsTowardCapacity(payload.status)) {
    return null;
  }

  const capacity = await getIntervalCapacity(db, organizationId, payload.date, payload.startTime, payload.endTime);
  const conflicts = await getOverlappingAppointments(
    db,
    organizationId,
    payload.date,
    payload.startTime,
    payload.endTime,
    payload.excludeAppointmentId,
  );

  if (conflicts.length < capacity) {
    return null;
  }

  return {
    error: 'Capacidade do horário excedida para este intervalo.',
    capacity,
    total: conflicts.length + 1,
    conflicts,
  };
}


app.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);

  try {
    const body = await c.req.json();
    // Accept both camelCase and snake_case
    const patientId   = body.patientId   || body.patient_id;
    const date        = body.date        || body.appointment_date;
    const startTime   = body.startTime   || body.start_time;
    const endTime     = body.endTime     || body.end_time;
    const rawTherapist = body.therapistId || body.therapist_id || user.uid;
    const therapistId = isUuid(rawTherapist) ? rawTherapist : null;
    const notes       = body.notes ?? null;
    const type        = body.type ?? body.session_type ?? 'Fisioterapia';
    const status      = normalizeStatus(body.status);
    const ignoreCapacity = body.ignoreCapacity === true;

    if (!patientId)    return c.json({ error: 'patient_id é obrigatório' }, 400);
    if (!date)         return c.json({ error: 'date é obrigatório' }, 400);
    if (!startTime)    return c.json({ error: 'start_time é obrigatório' }, 400);
    if (!endTime)      return c.json({ error: 'end_time é obrigatório' }, 400);
    if (!therapistId)  return c.json({ error: 'therapist_id inválido — user.uid não é UUID' }, 400);

    const capacityError = await enforceCapacity(db, user.organizationId, {
      date,
      startTime,
      endTime,
      status,
      ignoreCapacity,
    });
    if (capacityError) {
      return c.json(capacityError, 409);
    }

    const insertValues: any = {
      patientId,
      therapistId,
      date,
      startTime,
      endTime,
      organizationId: user.organizationId,
      status,
      type,
      notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.insert(appointments).values(insertValues).returning();
    const row = result[0];
    
    // Real-time Broadcast
    await broadcastToOrg(c.env, user.organizationId, {
      type: 'APPOINTMENT_UPDATED',
      payload: { id: row.id, action: 'created', timestamp: new Date().toISOString() }
    });
    
    // Busca dados do paciente para o lembrete
    const patientRow = await db.select({
      fullName: patients.fullName,
      phone: patients.phone
    }).from(patients).where(eq(patients.id, patientId)).limit(1).then(res => res[0]);

    try {
      triggerInngestEvent(c.env, c.executionCtx, 'appointment.created', {
        appointmentId: row.id,
        patientId: row.patientId,
        name: patientRow?.fullName,
        phone: patientRow?.phone,
        date: row.date,
        startTime: row.startTime,
        status: row.status,
      }, { id: user.uid });
    } catch (eventError: any) {
      console.error('[Appointments/Create] Failed to trigger event:', eventError?.message ?? eventError);
    }

    return c.json({ data: normalizeAppointmentRow(row) }, 201);
  } catch (error: any) {
    if (isConflictError(error)) {
      return c.json({ error: 'Conflito de horário: o terapeuta já possui um agendamento neste período.' }, 409);
    }
    console.error('[Appointments/Create] Error:', error.message);
    return c.json({ error: 'Erro ao criar agendamento', details: error.message }, 500);
  }
});

app.get('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'ID é obrigatório' }, 400);
  try {
    const result = await db
      .select({
        id: appointments.id,
        patientId: appointments.patientId,
        therapistId: appointments.therapistId,
        date: appointments.date,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        status: appointments.status,
        type: appointments.type,
        notes: appointments.notes,
        paymentStatus: appointments.paymentStatus,
        paymentAmount: appointments.paymentAmount,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt,
        patient_name: patients.fullName,
      })
      .from(appointments)
      .leftJoin(patients, eq(patients.id, appointments.patientId))
      .where(
        and(eq(appointments.id, id as string), eq(appointments.organizationId, user.organizationId))
      )
      .limit(1);

    const row = result[0];
    if (!row) return c.json({ error: 'Agendamento não encontrado' }, 404);
    return c.json({ data: normalizeAppointmentRow(row) });

  } catch (error: any) {
    return c.json({ error: 'Erro ao buscar agendamento', details: error.message }, 500);
  }
});

const updateAppointmentHandler: MiddlewareHandler<{ Bindings: Env; Variables: AuthVariables }> = async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'ID é obrigatório' }, 400);
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = await c.req.json() as Record<string, any>;
    const currentResult = await db
      .select({
        id: appointments.id,
        patientId: appointments.patientId, // needed for events
        date: appointments.date,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        durationMinutes: appointments.durationMinutes,
        status: appointments.status,
      })
      .from(appointments)
      .where(
        and(eq(appointments.id, id as string), eq(appointments.organizationId, user.organizationId))
      )
      .limit(1);

    const current = currentResult[0];

    if (!current) return c.json({ error: 'Agendamento não encontrado' }, 404);

    const date = body.date ?? body.appointment_date;
    const startTime = body.startTime ?? body.start_time ?? body.appointment_time;
    const explicitEndTime = body.endTime ?? body.end_time;
    const status = body.status;
    const notes = body.notes;
    const therapistIdInput = body.therapist_id ?? body.therapistId;
    const rawDuration = body.duration ?? body.duration_minutes;
    const type = body.type;
    const room = body.room ?? body.room_id;
    const paymentStatus = body.payment_status ?? body.paymentStatus;
    const paymentAmount = body.payment_amount ?? body.paymentAmount;
    const ignoreCapacity = body.ignoreCapacity === true;

    const parsedDuration = rawDuration !== undefined ? parseInt(String(rawDuration), 10) : undefined;
    const normalizedStatus = status !== undefined ? normalizeStatus(status) : String(current.status ?? 'agendado');

    if (parsedDuration !== undefined && (!Number.isFinite(parsedDuration) || parsedDuration <= 0)) {
      return c.json({ error: 'duration inválida' }, 400);
    }

    const effectiveDate = date ?? current.date;
    const effectiveStartTime = startTime ?? current.startTime;
    const effectiveDuration = parsedDuration ?? Number(current.durationMinutes ?? 60);
    const calculatedEndTime = (startTime !== undefined || parsedDuration !== undefined)
        ? calculateEndTime(effectiveStartTime, effectiveDuration)
        : undefined;

    const finalEndTime = explicitEndTime ?? calculatedEndTime ?? current.endTime;
    const shouldRecheckCapacity =
      !ignoreCapacity &&
      (
        date !== undefined ||
        startTime !== undefined ||
        parsedDuration !== undefined ||
        explicitEndTime !== undefined ||
        (status !== undefined && countsTowardCapacity(normalizedStatus))
      );

    if (shouldRecheckCapacity) {
      const capacityError = await enforceCapacity(db, user.organizationId, {
        date: effectiveDate,
        startTime: effectiveStartTime,
        endTime: finalEndTime,
        status: normalizedStatus,
        ignoreCapacity,
        excludeAppointmentId: id as string,
      });
      if (capacityError) {
        return c.json(capacityError, 409);
      }
    }

    const updatePayload: any = {
      updatedAt: new Date(),
    };

    if (date !== undefined) updatePayload.date = date;
    if (startTime !== undefined) updatePayload.startTime = startTime;
    if (finalEndTime !== undefined) updatePayload.endTime = finalEndTime;
    if (status !== undefined) updatePayload.status = normalizedStatus;
    if (notes !== undefined) updatePayload.notes = notes;
    if (therapistIdInput !== undefined) updatePayload.therapistId = therapistIdInput || null;
    if (parsedDuration !== undefined) updatePayload.durationMinutes = parsedDuration;
    if (type !== undefined) updatePayload.type = type;
    if (room !== undefined) updatePayload.roomId = isUuid(room) ? room : null;
    if (paymentStatus !== undefined) updatePayload.paymentStatus = paymentStatus;
    if (paymentAmount !== undefined) updatePayload.paymentAmount = paymentAmount;

    if (Object.keys(updatePayload).length === 1) { // only updatedAt
        return c.json({ error: 'Nenhum campo para atualizar' }, 400);
    }

    const result = await db
      .update(appointments)
      .set(updatePayload)
      .where(
        and(eq(appointments.id, id as string), eq(appointments.organizationId, user.organizationId))
      )
      .returning();

    const row = result[0];

    if (!row) return c.json({ error: 'Agendamento não encontrado' }, 404);

    // Real-time Broadcast
    await broadcastToOrg(c.env, user.organizationId, {
      type: 'APPOINTMENT_UPDATED',
      payload: { id: row.id, action: 'updated', timestamp: new Date().toISOString() }
    });

    // Eventos Inngest baseados em mudança de status
    try {
      if (row.status === 'atendido') {
        const patientRow = await db.select({
            fullName: patients.fullName,
            phone: patients.phone
        }).from(patients).where(eq(patients.id, row.patientId)).limit(1).then(res => res[0]);

        triggerInngestEvent(c.env, c.executionCtx, 'appointment.completed', {
          appointmentId: row.id,
          patientId: row.patientId,
          name: patientRow?.fullName,
          phone: patientRow?.phone
        }, { id: user.uid });
      } else {
        triggerInngestEvent(c.env, c.executionCtx, 'appointment.updated', {
          appointmentId: row.id,
          patientId: row.patientId,
          date: row.date,
          startTime: row.startTime,
          status: row.status,
        }, { id: user.uid });
      }
    } catch (eventError: any) {
      console.error('[Appointments/Update] Failed to trigger event:', eventError?.message ?? eventError);
    }

    return c.json({ data: normalizeAppointmentRow(row) });
  } catch (error: any) {
    console.error('[Appointments/Update] Critical Error:', error.message, error.stack);
    if (isConflictError(error)) {
      return c.json({ error: 'Conflito de horário: o terapeuta já possui um agendamento neste período.' }, 409);
    }
    return c.json({ error: 'Erro ao atualizar agendamento', details: error.message }, 500);
  }
};

app.patch('/:id', requireAuth, updateAppointmentHandler);
app.put('/:id', requireAuth, updateAppointmentHandler);

app.post('/:id/cancel', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'ID é obrigatório' }, 400);

  try {
    const body = await c.req.json().catch(() => ({}));
    const result = await db
      .update(appointments)
      .set({
        status: 'cancelado',
        cancellationReason: body.reason ?? null,
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(eq(appointments.id, id), eq(appointments.organizationId, user.organizationId))
      )
      .returning({ id: appointments.id });

    const row = result[0];

    if (!row) return c.json({ error: 'Agendamento não encontrado' }, 404);

    // Real-time Broadcast
    await broadcastToOrg(c.env, user.organizationId, {
      type: 'APPOINTMENT_UPDATED',
      payload: { id, action: 'cancelled', timestamp: new Date().toISOString() }
    });

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: 'Erro ao cancelar agendamento', details: error.message }, 500);
  }
});

app.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env);
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'ID é obrigatório' }, 400);

  try {
    const result = await db
      .delete(appointments)
      .where(
        and(eq(appointments.id, id), eq(appointments.organizationId, user.organizationId))
      )
      .returning({ id: appointments.id });

    const row = result[0];

    if (!row) return c.json({ error: 'Agendamento não encontrado' }, 404);

    // Real-time Broadcast
    await broadcastToOrg(c.env, user.organizationId, {
      type: 'APPOINTMENT_UPDATED',
      payload: { id, action: 'deleted', timestamp: new Date().toISOString() }
    });

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: 'Erro ao excluir agendamento', details: error.message }, 500);
  }
});

export { app as appointmentsRoutes };

