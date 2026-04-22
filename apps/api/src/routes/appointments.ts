import { Hono } from 'hono';
import type { MiddlewareHandler } from 'hono';
import type { Env } from '../types/env';
import { requireAuth, type AuthVariables } from '../lib/auth';
import { rateLimit } from '../middleware/rateLimit';
import { eq, and, sql, desc, lte, gte, isNull } from 'drizzle-orm';
import { appointments, patients } from '@fisioflow/db';
import {
  normalizeStatus,
  normalizeAppointmentType,
  presentAppointmentType,
  calculateEndTime,
  isConflictError,
  countsTowardCapacity,
} from './appointmentHelpers';
import { createDb } from '../lib/db';
import { withTenant } from '../lib/db-utils';
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
    type: presentAppointmentType(row.type),
    patient_name: row.patient?.fullName ?? row.patient_name ?? null,
    patient_phone: row.patient?.phone ?? row.patient_phone ?? null,
    created_at: row.createdAt ? String(row.createdAt) : null,
    updated_at: row.updatedAt ? String(row.updatedAt) : null,
    is_group: row.isGroup,
    is_unlimited: row.isUnlimited,
    additional_names: row.additionalNames,
  };
}


app.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env, 'read');
  try {
    const { dateFrom, dateTo, therapistId, patientId, status, limit = '100' } = c.req.query();

    const organizationId = user.organizationId;

    let conditions: any = withTenant(appointments, organizationId);

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
        date: sql<string>`${appointments.date}::text`,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        status: appointments.status,
        type: appointments.type,
        notes: appointments.notes,
        paymentStatus: appointments.paymentStatus,
        paymentAmount: appointments.paymentAmount,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt,
        isGroup: appointments.isGroup,
        isUnlimited: appointments.isUnlimited,
        additionalNames: appointments.additionalNames,
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
  _useLock: boolean = false
): Promise<number> {
  try {
    // FOR UPDATE is not compatible with aggregate functions; capacity is read-only here
    const result = await db.execute(sql`
      SELECT MIN(max_patients)::int AS capacity
      FROM schedule_capacity
      WHERE organization_id = ${organizationId}
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
  try {
    // Usamos sql.raw para garantir que o Postgres receba os tipos corretos (time, date, uuid)
    // e evitar falhas de inferência do driver HTTP do Neon.
    // Guardamos o cast ::uuid para evitar erro se organizationId não for UUID válido
    const safeOrgId = isUuid(organizationId) ? organizationId : '00000000-0000-0000-0000-000000000000';
    const result = await db.execute(sql`
      SELECT id, patient_id AS "patientId", start_time AS "startTime", date
      FROM appointments
      WHERE organization_id = ${safeOrgId}::uuid
        AND date = ${date}::date
        AND status::text NOT IN (
          'cancelado', 'cancelled',
          'faltou', 'faltou_com_aviso', 'faltou_sem_aviso',
          'nao_atendido', 'nao_atendido_sem_cobranca', 'no_show',
          'remarcar', 'remarcado', 'rescheduled'
        )
        AND deleted_at IS NULL
        AND start_time < ${endTime}::time
        AND end_time > ${startTime}::time
        ${excludeAppointmentId && isUuid(excludeAppointmentId) ? sql`AND id != ${excludeAppointmentId}::uuid` : sql``}
      ORDER BY start_time ASC, created_at ASC
    `);

    return (result.rows || []) as any;
  } catch (error: any) {
    console.error('[getOverlappingAppointments] Query failed:', error.message);
    // Se a tabela não existir ou outro erro crítico, retornamos vazio para não travar o fluxo principal
    // mas logamos o erro para auditoria.
    if (error.message.includes('does not exist')) return [];
    throw error;
  }
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
    useLock?: boolean;
  },
) {

  if (payload.ignoreCapacity || !countsTowardCapacity(payload.status)) {
    return null;
  }

  const capacity = await getIntervalCapacity(
    db,
    organizationId,
    payload.date,
    payload.startTime,
    payload.endTime,
    payload.useLock
  );
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


// 20 agendamentos criados por organização por hora
app.post('/', requireAuth, rateLimit({ limit: 20, windowSeconds: 3600, endpoint: 'appointments-create' }), async (c) => {
  const user = c.get('user');
  const db = createDb(c.env, 'write');

  try {
    const body = await c.req.json();
    // Accept both camelCase and snake_case
    const patientId   = body.patientId   || body.patient_id;
    const date        = body.date        || body.appointment_date;
    const startTime   = body.startTime   || body.start_time;
    const endTime     = body.endTime     || body.end_time;

    // Calculate duration in minutes if not provided
    let durationMinutes = body.durationMinutes || body.duration;
    if (!durationMinutes && startTime && endTime) {
      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);
      durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);
      if (durationMinutes < 0) durationMinutes += 24 * 60; // handle overnight
    }
    durationMinutes = durationMinutes || 60;

    // Sempre usa user.uid do JWT (confiável) como therapistId
    const therapistId = user.uid;
    const notes       = body.notes ?? null;
    const type        = normalizeAppointmentType(body.type ?? body.session_type);
    const status      = normalizeStatus(body.status);
    const ignoreCapacity = body.ignoreCapacity === true;
    const isGroup     = body.isGroup ?? body.is_group ?? false;
    const isUnlimited = body.isUnlimited ?? body.is_unlimited ?? false;
    const additionalNames = body.additionalNames ?? body.additional_names ?? null;

    const organizationId = user.organizationId;

    console.log('[Appointments/Create] Input Body:', JSON.stringify(body));
    console.log('[Appointments/Create] Processed Fields:', {
      patientId,
      therapistId,
      date,
      startTime,
      endTime,
      durationMinutes,
      status,
      organizationId
    });

    if (!patientId)    return c.json({ error: 'patient_id é obrigatório' }, 400);
    if (!date)         return c.json({ error: 'date é obrigatório' }, 400);
    if (!startTime)    return c.json({ error: 'start_time é obrigatório' }, 400);
    if (!endTime)      return c.json({ error: 'end_time é obrigatório' }, 400);
    if (!therapistId)  return c.json({ error: 'therapist_id não encontrado no token' }, 401);

    // Validação de UUID para therapistId
    if (!isUuid(therapistId)) {
      console.error('[Appointments/Create] Invalid therapistId (not a UUID):', therapistId);
      return c.json({
        error: 'Erro de configuração de perfil',
        details: `O ID do terapeuta no token (${therapistId}) não é um UUID válido. Verifique o cadastro do perfil.`
      }, 400);
    }

    const response = await (async (tx: typeof db) => {
      const capacityError = await enforceCapacity(tx, organizationId, {
        date,
        startTime,
        endTime,
        status,
        ignoreCapacity,
        useLock: true,
      });
      if (capacityError) {
        return { status: 409, data: capacityError };
      }

      const insertValues: any = {
        patientId,
        therapistId,
        date,
        startTime: startTime.length === 5 ? `${startTime}:00` : startTime,
        endTime: endTime.length === 5 ? `${endTime}:00` : endTime,
        durationMinutes,
        organizationId,
        status,
        type,
        notes,
        isGroup,
        isUnlimited,
        additionalNames,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: therapistId,
      };

      console.log('[Appointments/Create] Final Insert Values:', JSON.stringify(insertValues));
      const result = await tx.insert(appointments).values(insertValues).returning();
      const row = result[0];
      if (!row) {
        throw new Error('Database insertion returned no rows');
      }
      console.log('[Appointments/Create] Success! Row ID:', row.id);
      return { status: 201, data: { data: normalizeAppointmentRow(row) } };
    })(db);

    return c.json(response.data, response.status as any);
  } catch (error: any) {
    if (isConflictError(error)) {
      return c.json({ error: 'Conflito de horário: o terapeuta já possui um agendamento neste período.' }, 409);
    }
    console.error('[Appointments/Create] Critical Error Catch-All:', error.message, error.stack);
    return c.json({
      error: 'Erro ao criar agendamento',
      details: error.message,
      code: error.code || 'UNKNOWN_ERROR'
    }, 500);
  }
});

app.get("/last-updated", requireAuth, async (c) => {
	const user = c.get("user");
	const db = createDb(c.env, 'read');

	try {
		const result = await db
			.select({ last_updated_at: sql<string>`MAX(${appointments.updatedAt})` })
			.from(appointments)
			.where(withTenant(appointments, user.organizationId));

		const lastUpdated = result[0]?.last_updated_at;
		return c.json({
			data: { last_updated_at: lastUpdated ? String(lastUpdated) : null },
		});
	} catch (error) {
		console.error("[Appointments/LastUpdated] Error:", error);
		return c.json({ data: { last_updated_at: null } });
	}
});

app.get('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env, 'read');
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'ID é obrigatório' }, 400);
  if (!isUuid(id)) return c.json({ error: 'ID inválido' }, 400);
  try {
    const organizationId = user.organizationId;

    const result = await db
      .select({
        id: appointments.id,
        patientId: appointments.patientId,
        therapistId: appointments.therapistId,
        date: sql<string>`${appointments.date}::text`,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        status: appointments.status,
        type: appointments.type,
        notes: appointments.notes,
        paymentStatus: appointments.paymentStatus,
        paymentAmount: appointments.paymentAmount,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt,
        isGroup: appointments.isGroup,
        isUnlimited: appointments.isUnlimited,
        additionalNames: appointments.additionalNames,
        patient_name: patients.fullName,
      })
      .from(appointments)
      .leftJoin(patients, eq(patients.id, appointments.patientId))
      .where(
        withTenant(appointments, organizationId, eq(appointments.id, id as string))
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
  const db = createDb(c.env, 'write');
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'ID é obrigatório' }, 400);
  if (!isUuid(id)) return c.json({ error: 'ID inválido' }, 400);
  try {
    const body = await c.req.json() as Record<string, any>;

    const organizationId = user.organizationId;

    const response = await (async (tx: typeof db) => {
      const currentResult = await tx
        .select({
          id: appointments.id,
          patientId: appointments.patientId,
          date: appointments.date,
          startTime: appointments.startTime,
          endTime: appointments.endTime,
          durationMinutes: appointments.durationMinutes,
          status: appointments.status,
        })
        .from(appointments)
        .where(
          withTenant(appointments, organizationId, eq(appointments.id, id as string))
        )
        .limit(1);

      const current = currentResult[0];
      if (!current) return { status: 404, data: { error: 'Agendamento não encontrado' } };

      const date = body.date ?? body.appointment_date;
      const startTime = body.startTime ?? body.start_time ?? body.appointment_time;
      const explicitEndTime = body.endTime ?? body.end_time;
      const status = body.status;
      const notes = body.notes;
      const therapistIdInput = body.therapist_id ?? body.therapistId;
      const rawDuration = body.duration ?? body.duration_minutes;
      const type = body.type !== undefined ? normalizeAppointmentType(body.type) : undefined;
      const room = body.room ?? body.room_id;
      const paymentStatus = body.payment_status ?? body.paymentStatus;
      const paymentAmount = body.payment_amount ?? body.paymentAmount;
      const ignoreCapacity = body.ignoreCapacity === true;

      const parsedDuration = rawDuration !== undefined ? parseInt(String(rawDuration), 10) : undefined;
      const normalizedStatus = status !== undefined ? normalizeStatus(status) : String(current.status ?? 'scheduled');

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
        const capacityError = await enforceCapacity(tx, organizationId, {
          date: effectiveDate,
          startTime: effectiveStartTime,
          endTime: finalEndTime,
          status: normalizedStatus,
          ignoreCapacity,
          excludeAppointmentId: id as string,
          useLock: true,
        });
        if (capacityError) {
          return { status: 409, data: capacityError };
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
      if (body.isGroup !== undefined || body.is_group !== undefined) updatePayload.isGroup = body.isGroup ?? body.is_group;
      if (body.isUnlimited !== undefined || body.is_unlimited !== undefined) updatePayload.isUnlimited = body.isUnlimited ?? body.is_unlimited;
      if (body.additionalNames !== undefined || body.additional_names !== undefined) updatePayload.additionalNames = body.additionalNames ?? body.additional_names;

      if (Object.keys(updatePayload).length === 1) {
        return { status: 400, data: { error: 'Nenhum campo para atualizar' } };
      }

      const result = await tx
        .update(appointments)
        .set(updatePayload)
        .where(
          withTenant(appointments, organizationId, eq(appointments.id, id as string))
        )
        .returning();

      const row = result[0];
      if (!row) return { status: 404, data: { error: 'Agendamento não encontrado' } };
      return { status: 200, data: { data: normalizeAppointmentRow(row) } };
    })(db);

    if (response.status >= 400) {
      return c.json(response.data, response.status as any);
    }

    const row = (response.data as any).data;

    // Push side effects to background to keep response fast
    c.executionCtx.waitUntil((async () => {
      try {
        // Real-time Broadcast
        await broadcastToOrg(c.env, organizationId, {
          type: 'APPOINTMENT_UPDATED',
          payload: { id: row.id, action: 'updated', timestamp: new Date().toISOString() }
        });

        // Eventos Inngest baseasedos em mudança de status
        if (row.status === 'atendido') {
          const patientRow = await db.select({
              fullName: patients.fullName,
              phone: patients.phone
          }).from(patients).where(eq(patients.id, row.patientId)).limit(1).then(res => res[0]);

          await triggerInngestEvent(c.env, c.executionCtx, 'appointment.completed', {
            appointmentId: row.id,
            patientId: row.patientId,
            name: patientRow?.fullName,
            phone: patientRow?.phone
          }, { id: user.uid });
        } else {
          await triggerInngestEvent(c.env, c.executionCtx, 'appointment.updated', {
            appointmentId: row.id,
            patientId: row.patientId,
            date: row.date,
            startTime: row.startTime,
            status: row.status,
          }, { id: user.uid });
        }

        // Audit Log placeholder (could be a DB insert or external service)
        console.log(`[Audit] Appointment ${row.id} updated by user ${user.uid}`);
      } catch (bgError: any) {
        console.error('[Appointments/Update] Background Task Error:', bgError?.message ?? bgError);
      }
    })());

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
  const db = createDb(c.env, 'write');
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'ID é obrigatório' }, 400);
  if (!isUuid(id)) return c.json({ error: 'ID inválido' }, 400);

  try {
    const body = await c.req.json().catch(() => ({}));

    const organizationId = user.organizationId;

    const result = await db
      .update(appointments)
      .set({
        status: 'cancelado',
        cancellationReason: body.reason ?? null,
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        withTenant(appointments, organizationId, eq(appointments.id, id))
      )
      .returning({ id: appointments.id });

    const row = result[0];

    if (!row) return c.json({ error: 'Agendamento não encontrado' }, 404);

    // Real-time Broadcast in background
    c.executionCtx.waitUntil((async () => {
      try {
        await broadcastToOrg(c.env, organizationId, {
          type: 'APPOINTMENT_UPDATED',
          payload: { id, action: 'cancelado', timestamp: new Date().toISOString() }
        });
        console.log(`[Audit] Appointment ${id} cancelled by user ${user.uid}`);
      } catch (err) {
        console.error('[Appointments/Cancel] Broadcast failed:', err);
      }
    })());

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: 'Erro ao cancelar agendamento', details: error.message }, 500);
  }
});

app.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env, 'write');
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'ID é obrigatório' }, 400);
  if (!isUuid(id)) return c.json({ error: 'ID inválido' }, 400);

  try {
    const organizationId = user.organizationId;

    const result = await db
      .update(appointments)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        withTenant(appointments, organizationId, eq(appointments.id, id))
      )
      .returning({ id: appointments.id });

    const row = result[0];

    if (!row) return c.json({ error: 'Agendamento não encontrado' }, 404);

    // Real-time Broadcast
    await broadcastToOrg(c.env, organizationId, {
      type: 'APPOINTMENT_UPDATED',
      payload: { id, action: 'deleted', timestamp: new Date().toISOString() }
    });

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: 'Erro ao excluir agendamento', details: error.message }, 500);
  }
});

export { app as appointmentsRoutes };
