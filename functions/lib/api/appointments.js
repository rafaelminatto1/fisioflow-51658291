"use strict";
/**
 * API Functions: Appointments
 * Cloud Functions para gestão de agendamentos
 */
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
const pg_1 = require("pg");
const auth_1 = require("../middleware/auth");
/**
 * Lista agendamentos com filtros
 */
exports.listAppointments = (0, https_1.onCall)(async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await (0, auth_1.authorizeRequest)(request.auth.token);
    const { dateFrom, dateTo, therapistId, status, patientId, limit = 100, offset = 0, } = request.data || {};
    const pool = new pg_1.Pool({
        connectionString: process.env.CLOUD_SQL_CONNECTION_STRING,
    });
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
    finally {
        await pool.end();
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
    const { appointmentId } = request.data || {};
    if (!appointmentId) {
        throw new https_1.HttpsError('invalid-argument', 'appointmentId é obrigatório');
    }
    const pool = new pg_1.Pool({
        connectionString: process.env.CLOUD_SQL_CONNECTION_STRING,
    });
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
    finally {
        await pool.end();
    }
});
/**
 * Verifica conflito de horário
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
    const pool = new pg_1.Pool({
        connectionString: process.env.CLOUD_SQL_CONNECTION_STRING,
    });
    try {
        let query = `
      SELECT id, start_time, end_time, patient_id, status
      FROM appointments
      WHERE therapist_id = $1
        AND date = $2
        AND organization_id = $3
        AND status NOT IN ('cancelado', 'paciente_faltou')
        AND (
          (start_time < $3 AND end_time > $4)  -- Sobrepõe parcialmente
          OR (start_time >= $3 AND end_time <= $4)  -- Contido no período
          OR (start_time <= $3 AND end_time >= $4)  -- Contém o período
        )
    `;
        const params = [therapistId, date, endTime, startTime, auth.organizationId];
        if (excludeAppointmentId) {
            query += ' AND id != $5';
            params.push(excludeAppointmentId);
        }
        const result = await pool.query(query, params);
        return {
            hasConflict: result.rows.length > 0,
            conflictingAppointments: result.rows,
        };
    }
    finally {
        await pool.end();
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
    const data = request.data || {};
    // Validar campos obrigatórios
    if (!data.patient_id || !data.therapist_id || !data.date || !data.start_time || !data.end_time) {
        throw new https_1.HttpsError('invalid-argument', 'patient_id, therapist_id, date, start_time e end_time são obrigatórios');
    }
    const pool = new pg_1.Pool({
        connectionString: process.env.CLOUD_SQL_CONNECTION_STRING,
    });
    try {
        // Verificar conflito de horário
        const conflictResult = await pool.query(`SELECT id FROM appointments
       WHERE therapist_id = $1
         AND date = $2
         AND organization_id = $3
         AND status NOT IN ('cancelado', 'paciente_faltou')
         AND (
          (start_time < $4 AND end_time > $3)
          OR (start_time >= $3 AND end_time <= $4)
          OR (start_time <= $3 AND end_time >= $4)
         )`, [data.therapist_id, data.date, data.start_time, data.end_time, auth.organizationId]);
        if (conflictResult.rows.length > 0) {
            throw new https_1.HttpsError('already-exists', 'Já existe um agendamento neste horário para este terapeuta');
        }
        // Inserir agendamento
        const result = await pool.query(`INSERT INTO appointments (
        patient_id, therapist_id, date, start_time, end_time,
        session_type, notes, status, organization_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`, [
            data.patient_id,
            data.therapist_id,
            data.date,
            data.start_time,
            data.end_time,
            data.session_type || 'individual',
            data.notes || null,
            data.status || 'agendado',
            auth.organizationId,
        ]);
        const appointment = result.rows[0];
        // Publicar no Ably
        const realtime = await Promise.resolve().then(() => __importStar(require('../realtime/publisher')));
        await realtime.publishAppointmentEvent(auth.organizationId, {
            event: 'INSERT',
            new: appointment,
            old: null,
        });
        return { data: appointment };
    }
    finally {
        await pool.end();
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
    const { appointmentId, ...updates } = request.data || {};
    if (!appointmentId) {
        throw new https_1.HttpsError('invalid-argument', 'appointmentId é obrigatório');
    }
    const pool = new pg_1.Pool({
        connectionString: process.env.CLOUD_SQL_CONNECTION_STRING,
    });
    try {
        // Buscar agendamento existente
        const existing = await pool.query('SELECT * FROM appointments WHERE id = $1 AND organization_id = $2', [appointmentId, auth.organizationId]);
        if (existing.rows.length === 0) {
            throw new https_1.HttpsError('not-found', 'Agendamento não encontrado');
        }
        const existingAppointment = existing.rows[0];
        // Se está mudando horário/terapeuta, verificar conflito
        if ((updates.therapist_id && updates.therapist_id !== existingAppointment.therapist_id) ||
            (updates.date && updates.date !== existingAppointment.date) ||
            (updates.start_time && updates.start_time !== existingAppointment.start_time) ||
            (updates.end_time && updates.end_time !== existingAppointment.end_time)) {
            const therapistId = updates.therapist_id || existingAppointment.therapist_id;
            const date = updates.date || existingAppointment.date;
            const startTime = updates.start_time || existingAppointment.start_time;
            const endTime = updates.end_time || existingAppointment.end_time;
            const conflictResult = await pool.query(`SELECT id FROM appointments
         WHERE therapist_id = $1
           AND date = $2
           AND organization_id = $3
           AND id != $4
           AND status NOT IN ('cancelado', 'paciente_faltou')
           AND (
            (start_time < $5 AND end_time > $4)
            OR (start_time >= $4 AND end_time <= $5)
            OR (start_time <= $4 AND end_time >= $5)
           )`, [therapistId, date, auth.organizationId, appointmentId, endTime, startTime]);
            if (conflictResult.rows.length > 0) {
                throw new https_1.HttpsError('already-exists', 'Conflito de horário com outro agendamento');
            }
        }
        // Construir SET dinâmico
        const setClauses = [];
        const values = [];
        let paramCount = 1;
        const allowedFields = [
            'patient_id',
            'therapist_id',
            'date',
            'start_time',
            'end_time',
            'session_type',
            'notes',
            'status',
        ];
        for (const field of allowedFields) {
            if (field in updates) {
                paramCount++;
                setClauses.push(`${field} = $${paramCount}`);
                values.push(updates[field]);
            }
        }
        if (setClauses.length === 0) {
            throw new https_1.HttpsError('invalid-argument', 'Nenhum campo válido para atualizar');
        }
        paramCount++;
        setClauses.push(`updated_at = $${paramCount}`);
        values.push(new Date());
        values.push(appointmentId, auth.organizationId);
        const query = `
      UPDATE appointments
      SET ${setClauses.join(', ')}
      WHERE id = $${paramCount + 1} AND organization_id = $${paramCount + 2}
      RETURNING *
    `;
        const result = await pool.query(query, values);
        const appointment = result.rows[0];
        // Publicar no Ably
        const realtime = await Promise.resolve().then(() => __importStar(require('../realtime/publisher')));
        await realtime.publishAppointmentEvent(auth.organizationId, {
            event: 'UPDATE',
            new: appointment,
            old: existingAppointment,
        });
        return { data: appointment };
    }
    finally {
        await pool.end();
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
    const { appointmentId, reason } = request.data || {};
    if (!appointmentId) {
        throw new https_1.HttpsError('invalid-argument', 'appointmentId é obrigatório');
    }
    const pool = new pg_1.Pool({
        connectionString: process.env.CLOUD_SQL_CONNECTION_STRING,
    });
    try {
        const result = await pool.query(`UPDATE appointments
       SET status = 'cancelado',
           cancellation_reason = $2,
           cancelled_at = NOW(),
           cancelled_by = $3,
           updated_at = NOW()
       WHERE id = $1 AND organization_id = $4
       RETURNING *`, [appointmentId, reason || null, auth.userId, auth.organizationId]);
        if (result.rows.length === 0) {
            throw new https_1.HttpsError('not-found', 'Agendamento não encontrado');
        }
        // Publicar no Ably
        const realtime = await Promise.resolve().then(() => __importStar(require('../realtime/publisher')));
        await realtime.publishAppointmentEvent(auth.organizationId, {
            event: 'UPDATE',
            new: result.rows[0],
            old: null,
        });
        return { data: result.rows[0] };
    }
    finally {
        await pool.end();
    }
});
//# sourceMappingURL=appointments.js.map