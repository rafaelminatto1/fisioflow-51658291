"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelAppointment = exports.updateAppointment = exports.createAppointment = exports.checkTimeConflict = exports.getAppointment = exports.listAppointments = void 0;
const https_1 = require("firebase-functions/v2/https");
const init_1 = require("../init");
const auth_1 = require("../middleware/auth");
/**
 * Lista agendamentos com filtros
 */
exports.listAppointments = (0, https_1.onCall)(async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await (0, auth_1.authorizeRequest)(request.auth.token);
    const { dateFrom, dateTo, therapistId, status, patientId, limit = 100, offset = 0, } = request.data;
    const pool = (0, init_1.getPool)();
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
        const params = [auth.organizationId];
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
        return { data: result.rows };
    }
    catch (error) {
        console.error('Error in listAppointments:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao listar agendamentos';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
/**
 * Busca um agendamento por ID
 */
exports.getAppointment = (0, https_1.onCall)(async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await (0, auth_1.authorizeRequest)(request.auth.token);
    const { appointmentId } = request.data;
    if (!appointmentId) {
        throw new https_1.HttpsError('invalid-argument', 'appointmentId é obrigatório');
    }
    const pool = (0, init_1.getPool)();
    try {
        const result = await pool.query(`SELECT
        a.*,
        p.name as patient_name,
        p.phone as patient_phone,
        prof.full_name as therapist_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN profiles prof ON a.therapist_id = prof.user_id
      WHERE a.id = $1 AND a.organization_id = $2`, [appointmentId, auth.organizationId]);
        if (result.rows.length === 0) {
            throw new https_1.HttpsError('not-found', 'Agendamento não encontrado');
        }
        return { data: result.rows[0] };
    }
    catch (error) {
        console.error('Error in getAppointment:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar agendamento';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
/**
 * Verifica conflito de horário (Internal helper)
 */
async function checkTimeConflictHelper(pool, params) {
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
    const sqlParams = [organizationId, therapistId, date, startTime, endTime];
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
exports.checkTimeConflict = (0, https_1.onCall)(async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await (0, auth_1.authorizeRequest)(request.auth.token);
    const { therapistId, date, startTime, endTime, excludeAppointmentId } = request.data || {};
    if (!therapistId || !date || !startTime || !endTime) {
        throw new https_1.HttpsError('invalid-argument', 'terapeuta, data, horário início e fim são obrigatórios');
    }
    const pool = (0, init_1.getPool)();
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
    }
    catch (error) {
        console.error('Error in checkTimeConflict:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao verificar conflito';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
/**
 * Cria um novo agendamento
 */
exports.createAppointment = (0, https_1.onCall)(async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await (0, auth_1.authorizeRequest)(request.auth.token);
    const data = request.data;
    // Validar campos obrigatórios
    const requiredFields = ['patientId', 'therapistId', 'date', 'startTime', 'endTime', 'type'];
    for (const field of requiredFields) {
        if (!data[field]) {
            // Fallback check for session_type/type if needed
            if (field === 'type' && data.session_type)
                continue;
            throw new https_1.HttpsError('invalid-argument', `Campo obrigatório faltando: ${field}`);
        }
    }
    const pool = (0, init_1.getPool)();
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
            throw new https_1.HttpsError('failed-precondition', 'Conflito de horário detectado');
        }
        // Inserir agendamento
        const result = await pool.query(`INSERT INTO appointments (
        patient_id, therapist_id, date, start_time, end_time,
        session_type, notes, status, organization_id, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`, [
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
        ]);
        const appointment = result.rows[0];
        // Publicar Evento
        try {
            const realtime = await Promise.resolve().then(() => __importStar(require('../realtime/publisher')));
            await realtime.publishAppointmentEvent(auth.organizationId, {
                event: 'INSERT',
                new: appointment,
                old: null,
            });
        }
        catch (err) {
            console.error('Erro Ably:', err);
        }
        return { data: appointment };
    }
    catch (error) {
        console.error('Error in createAppointment:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao criar agendamento';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
/**
 * Atualiza um agendamento
 */
exports.updateAppointment = (0, https_1.onCall)(async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await (0, auth_1.authorizeRequest)(request.auth.token);
    const { appointmentId, ...updates } = request.data;
    if (!appointmentId) {
        throw new https_1.HttpsError('invalid-argument', 'appointmentId é obrigatório');
    }
    const pool = (0, init_1.getPool)();
    try {
        // Buscar agendamento atual
        const current = await pool.query('SELECT * FROM appointments WHERE id = $1 AND organization_id = $2', [appointmentId, auth.organizationId]);
        if (current.rows.length === 0) {
            throw new https_1.HttpsError('not-found', 'Agendamento não encontrado');
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
                throw new https_1.HttpsError('failed-precondition', 'Conflito de horário detectado');
            }
        }
        // Construir UPDATE
        const setClauses = [];
        const values = [];
        let paramCount = 1;
        const allowedFields = ['date', 'start_time', 'end_time', 'therapist_id', 'status', 'type', 'notes'];
        // Mapeamento de campos request camelCase para db snake_case
        const fieldMap = {
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
            throw new https_1.HttpsError('invalid-argument', 'Nenhum campo para atualizar');
        }
        paramCount++;
        setClauses.push(`updated_at = $${paramCount}`);
        values.push(new Date());
        values.push(appointmentId, auth.organizationId);
        const result = await pool.query(`UPDATE appointments
       SET ${setClauses.join(', ')}
       WHERE id = $${paramCount + 1} AND organization_id = $${paramCount + 2}
       RETURNING *`, values);
        const updatedAppt = result.rows[0];
        // Publicar Evento
        try {
            const realtime = await Promise.resolve().then(() => __importStar(require('../realtime/publisher')));
            await realtime.publishAppointmentEvent(auth.organizationId, {
                event: 'UPDATE',
                new: updatedAppt,
                old: currentAppt,
            });
        }
        catch (err) {
            console.error('Erro Ably:', err);
        }
        return { data: updatedAppt };
    }
    catch (error) {
        console.error('Error in updateAppointment:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar agendamento';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
/**
 * Cancela um agendamento
 */
exports.cancelAppointment = (0, https_1.onCall)(async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await (0, auth_1.authorizeRequest)(request.auth.token);
    const { appointmentId, reason } = request.data;
    if (!appointmentId) {
        throw new https_1.HttpsError('invalid-argument', 'appointmentId é obrigatório');
    }
    const pool = (0, init_1.getPool)();
    try {
        const current = await pool.query('SELECT * FROM appointments WHERE id = $1 AND organization_id = $2', [appointmentId, auth.organizationId]);
        if (current.rows.length === 0) {
            throw new https_1.HttpsError('not-found', 'Agendamento não encontrado');
        }
        const result = await pool.query(`UPDATE appointments
       SET status = 'cancelado', notes = notes || $1, updated_at = NOW()
       WHERE id = $2 AND organization_id = $3
       RETURNING *`, [reason ? `\n[Cancelamento: ${reason}]` : '', appointmentId, auth.organizationId]);
        // Publicar Evento
        try {
            const realtime = await Promise.resolve().then(() => __importStar(require('../realtime/publisher')));
            await realtime.publishAppointmentEvent(auth.organizationId, {
                event: 'UPDATE',
                new: result.rows[0],
                old: current.rows[0],
            });
        }
        catch (err) {
            console.error('Erro Ably:', err);
        }
        return { success: true };
    }
    catch (error) {
        console.error('Error in cancelAppointment:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro ao cancelar agendamento';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
//# sourceMappingURL=appointments.js.map