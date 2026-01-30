"use strict";
/**
 * API Functions: Patients
 * Cloud Functions para gestão de pacientes
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
exports.getPatientStats = exports.deletePatient = exports.updatePatient = exports.createPatient = exports.getPatient = exports.listPatients = void 0;
const https_1 = require("firebase-functions/v2/https");
const init_1 = require("../init");
const auth_1 = require("../middleware/auth");
const app_check_1 = require("../middleware/app-check");
const rate_limit_1 = require("../middleware/rate-limit");
/**
 * Lista pacientes com filtros opcionais
 */
exports.listPatients = (0, https_1.onCall)({ secrets: [init_1.DB_PASS_SECRET, init_1.DB_USER_SECRET, init_1.DB_NAME_SECRET, init_1.DB_HOST_IP_SECRET, init_1.DB_HOST_IP_PUBLIC_SECRET],
    vpcConnector: "cloudsql-connector",
    vpcConnectorEgressSettings: "PRIVATE_RANGES_ONLY" }, async (request) => {
    console.log('[listPatients] ===== START =====');
    if (!request.auth || !request.auth.token) {
        console.error('[listPatients] Unauthenticated request');
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    console.log('[listPatients] Auth token present, uid:', request.auth.uid);
    // Verificar App Check
    (0, app_check_1.verifyAppCheck)(request);
    console.log('[listPatients] App Check verified');
    // Verificar rate limit
    await (0, rate_limit_1.enforceRateLimit)(request, rate_limit_1.RATE_LIMITS.callable);
    console.log('[listPatients] Rate limit check passed');
    const auth = await (0, auth_1.authorizeRequest)(request.auth.token);
    const { status, search, limit = 50, offset = 0 } = request.data;
    const pool = (0, init_1.getPool)();
    try {
        // Construir query dinâmica
        let query = `
      SELECT
        id, name, cpf, email, phone, birth_date, gender,
        main_condition, status, progress, is_active,
        created_at, updated_at
      FROM patients
      WHERE organization_id = $1
        AND is_active = true
    `;
        const params = [auth.organizationId];
        let paramCount = 1;
        if (status) {
            paramCount++;
            query += ` AND status = $${paramCount}`;
            params.push(status);
        }
        if (search) {
            paramCount++;
            query += ` AND (name ILIKE $${paramCount} OR cpf ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
            params.push(`%${search}%`);
        }
        query += ` ORDER BY name ASC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(limit, offset);
        const result = await pool.query(query, params);
        // Buscar total
        let countQuery = `
      SELECT COUNT(*) as total
      FROM patients
      WHERE organization_id = $1 AND is_active = true
    `;
        const countParams = [auth.organizationId];
        let countParamCount = 1;
        if (status) {
            countParamCount++;
            countQuery += ` AND status = $${countParamCount}`;
            countParams.push(status);
        }
        if (search) {
            countParamCount++;
            countQuery += ` AND (name ILIKE $${countParamCount} OR cpf ILIKE $${countParamCount} OR email ILIKE $${countParamCount})`;
            countParams.push(`%${search}%`);
        }
        const countResult = await pool.query(countQuery, countParams);
        return {
            data: result.rows,
            total: parseInt(countResult.rows[0].total, 10),
            page: Math.floor(offset / limit) + 1,
            perPage: limit,
        };
    }
    catch (error) {
        console.error('Error in listPatients:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        const errorMessage = error instanceof Error ? error.message : 'Erro interno ao listar pacientes';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
/**
 * Busca um paciente por ID
 */
exports.getPatient = (0, https_1.onCall)({ secrets: [init_1.DB_PASS_SECRET, init_1.DB_USER_SECRET, init_1.DB_NAME_SECRET, init_1.DB_HOST_IP_SECRET, init_1.DB_HOST_IP_PUBLIC_SECRET],
    vpcConnector: "cloudsql-connector",
    vpcConnectorEgressSettings: "PRIVATE_RANGES_ONLY" }, async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await (0, auth_1.authorizeRequest)(request.auth.token);
    (0, app_check_1.verifyAppCheck)(request);
    console.log('App Check verified');
    (0, app_check_1.verifyAppCheck)(request);
    console.log("App Check verified");
    const { patientId, profileId } = request.data;
    if (!patientId && !profileId) {
        throw new https_1.HttpsError('invalid-argument', 'patientId ou profileId é obrigatório');
    }
    const pool = (0, init_1.getPool)();
    try {
        let query = 'SELECT * FROM patients WHERE organization_id = $1';
        const params = [auth.organizationId];
        if (patientId) {
            query += ' AND id = $2';
            params.push(patientId);
        }
        else if (profileId) {
            query += ' AND profile_id = $2';
            params.push(profileId);
        }
        const result = await pool.query(query, params);
        if (result.rows.length === 0) {
            throw new https_1.HttpsError('not-found', 'Paciente não encontrado');
        }
        return { data: result.rows[0] };
    }
    catch (error) {
        console.error('Error in getPatient:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro interno ao buscar paciente';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
/**
 * Cria um novo paciente
 */
exports.createPatient = (0, https_1.onCall)({ secrets: [init_1.DB_PASS_SECRET, init_1.DB_USER_SECRET, init_1.DB_NAME_SECRET, init_1.DB_HOST_IP_SECRET, init_1.DB_HOST_IP_PUBLIC_SECRET],
    vpcConnector: "cloudsql-connector",
    vpcConnectorEgressSettings: "PRIVATE_RANGES_ONLY" }, async (request) => {
    console.log('[createPatient] ===== START =====');
    if (!request.auth || !request.auth.token) {
        console.error('[createPatient] Unauthenticated request');
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    console.log('[createPatient] Auth token present, uid:', request.auth.uid);
    // Verificar App Check
    (0, app_check_1.verifyAppCheck)(request);
    console.log('[createPatient] App Check verified');
    // Verificar rate limit
    await (0, rate_limit_1.enforceRateLimit)(request, rate_limit_1.RATE_LIMITS.callable);
    console.log('[createPatient] Rate limit check passed');
    const auth = await (0, auth_1.authorizeRequest)(request.auth.token);
    const data = request.data;
    // DEBUG: Log organization_id ao criar paciente
    console.log('[createPatient] auth.organizationId:', auth.organizationId);
    console.log('[createPatient] auth.userId:', auth.userId);
    console.log('[createPatient] data:', JSON.stringify({ name: data.name, phone: data.phone }));
    // Validar campos obrigatórios
    if (!data.name) {
        throw new https_1.HttpsError('invalid-argument', 'name é obrigatório');
    }
    const pool = (0, init_1.getPool)();
    try {
        // Verificar duplicidade de CPF
        if (data.cpf) {
            const existing = await pool.query('SELECT id FROM patients WHERE cpf = $1 AND organization_id = $2', [data.cpf.replace(/\D/g, ''), auth.organizationId]);
            if (existing.rows.length > 0) {
                throw new https_1.HttpsError('already-exists', 'Já existe um paciente com este CPF');
            }
        }
        // [AUTO-FIX] Ensure organization exists to satisfy FK constraint
        console.log('[createPatient] Target Org ID:', auth.organizationId);
        const orgInsertSql = `INSERT INTO organizations (id, name, slug, active, email)
       VALUES ($1, 'Clínica Principal', 'default-org', true, 'admin@fisioflow.com.br')
       ON CONFLICT (id) DO NOTHING`;
        console.log('[createPatient] Org Insert SQL:', orgInsertSql);
        await pool.query(orgInsertSql, [auth.organizationId]);
        // Inserir paciente
        const result = await pool.query(`INSERT INTO patients (
        name, cpf, email, phone, birth_date, gender,
        address, emergency_contact, medical_history,
        main_condition, status, organization_id, incomplete_registration
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`, [
            data.name,
            data.cpf?.replace(/\D/g, '') || null,
            data.email || null,
            data.phone || null,
            data.birth_date || null,
            data.gender || null,
            data.address ? JSON.stringify(data.address) : null,
            data.emergency_contact ? JSON.stringify(data.emergency_contact) : null,
            data.medical_history || null,
            data.main_condition || null,
            data.status || 'Inicial',
            auth.organizationId,
            data.incomplete_registration || false
        ]);
        const patient = result.rows[0];
        console.log('[createPatient] Patient created:', JSON.stringify({
            id: patient.id,
            name: patient.name,
            organization_id: patient.organization_id,
            is_active: patient.is_active
        }));
        // Publicar no Ably para atualização em tempo real
        try {
            const realtime = await Promise.resolve().then(() => __importStar(require('../realtime/publisher')));
            await realtime.publishPatientEvent(auth.organizationId, {
                event: 'INSERT',
                new: patient,
                old: null,
            });
        }
        catch (err) {
            console.error('Erro ao publicar evento no Ably:', err);
        }
        return { data: patient };
    }
    catch (error) {
        console.error('Error in createPatient:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro interno ao criar paciente';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
/**
 * Atualiza um paciente existente
 */
exports.updatePatient = (0, https_1.onCall)({ secrets: [init_1.DB_PASS_SECRET, init_1.DB_USER_SECRET, init_1.DB_NAME_SECRET, init_1.DB_HOST_IP_SECRET, init_1.DB_HOST_IP_PUBLIC_SECRET],
    vpcConnector: "cloudsql-connector",
    vpcConnectorEgressSettings: "PRIVATE_RANGES_ONLY" }, async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await (0, auth_1.authorizeRequest)(request.auth.token);
    (0, app_check_1.verifyAppCheck)(request);
    console.log('App Check verified');
    (0, app_check_1.verifyAppCheck)(request);
    console.log("App Check verified");
    const { patientId, ...updates } = request.data;
    if (!patientId) {
        throw new https_1.HttpsError('invalid-argument', 'patientId é obrigatório');
    }
    const pool = (0, init_1.getPool)();
    try {
        // Verificar se paciente existe e pertence à organização
        const existing = await pool.query('SELECT * FROM patients WHERE id = $1 AND organization_id = $2', [patientId, auth.organizationId]);
        if (existing.rows.length === 0) {
            throw new https_1.HttpsError('not-found', 'Paciente não encontrado');
        }
        // Construir SET dinâmico
        const setClauses = [];
        const values = [];
        let paramCount = 0;
        const allowedFields = [
            'name',
            'cpf',
            'email',
            'phone',
            'birth_date',
            'gender',
            'medical_history',
            'main_condition',
            'status',
            'progress',
        ];
        for (const field of allowedFields) {
            if (field in updates) {
                paramCount++;
                setClauses.push(`${field} = $${paramCount}`);
                if (field === 'cpf') {
                    values.push(updates[field]?.replace(/\D/g, '') || null);
                }
                else {
                    values.push(updates[field]);
                }
            }
        }
        if (setClauses.length === 0) {
            throw new https_1.HttpsError('invalid-argument', 'Nenhum campo válido para atualizar');
        }
        // Adicionar updated_at
        paramCount++;
        setClauses.push(`updated_at = $${paramCount}`);
        values.push(new Date());
        // Adicionar WHERE params
        values.push(patientId, auth.organizationId);
        const query = `
      UPDATE patients
      SET ${setClauses.join(', ')}
      WHERE id = $${paramCount + 1} AND organization_id = $${paramCount + 2}
      RETURNING *
    `;
        const result = await pool.query(query, values);
        const patient = result.rows[0];
        // Publicar no Ably
        try {
            const realtime = await Promise.resolve().then(() => __importStar(require('../realtime/publisher')));
            await realtime.publishPatientEvent(auth.organizationId, {
                event: 'UPDATE',
                new: patient,
                old: existing.rows[0],
            });
        }
        catch (err) {
            console.error('Erro ao publicar evento no Ably:', err);
        }
        return { data: patient };
    }
    catch (error) {
        console.error('Error in updatePatient:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro interno ao atualizar paciente';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
/**
 * Remove (soft delete) um paciente
 */
exports.deletePatient = (0, https_1.onCall)({ secrets: [init_1.DB_PASS_SECRET, init_1.DB_USER_SECRET, init_1.DB_NAME_SECRET, init_1.DB_HOST_IP_SECRET, init_1.DB_HOST_IP_PUBLIC_SECRET],
    vpcConnector: "cloudsql-connector",
    vpcConnectorEgressSettings: "PRIVATE_RANGES_ONLY" }, async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await (0, auth_1.authorizeRequest)(request.auth.token);
    (0, app_check_1.verifyAppCheck)(request);
    console.log('App Check verified');
    (0, app_check_1.verifyAppCheck)(request);
    console.log("App Check verified");
    const { patientId } = request.data;
    if (!patientId) {
        throw new https_1.HttpsError('invalid-argument', 'patientId é obrigatório');
    }
    const pool = (0, init_1.getPool)();
    try {
        // Soft delete
        const result = await pool.query(`UPDATE patients
       SET is_active = false, updated_at = NOW()
       WHERE id = $1 AND organization_id = $2
       RETURNING *`, [patientId, auth.organizationId]);
        if (result.rows.length === 0) {
            throw new https_1.HttpsError('not-found', 'Paciente não encontrado');
        }
        // Publicar no Ably
        try {
            const realtime = await Promise.resolve().then(() => __importStar(require('../realtime/publisher')));
            await realtime.publishPatientEvent(auth.organizationId, {
                event: 'DELETE',
                new: null,
                old: result.rows[0],
            });
        }
        catch (err) {
            console.error('Erro ao publicar evento no Ably:', err);
        }
        return { success: true };
    }
    catch (error) {
        console.error('Error in deletePatient:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro interno ao excluir paciente';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
/**
 * Busca estatísticas de um paciente
 */
exports.getPatientStats = (0, https_1.onCall)({ secrets: [init_1.DB_PASS_SECRET, init_1.DB_USER_SECRET, init_1.DB_NAME_SECRET, init_1.DB_HOST_IP_SECRET, init_1.DB_HOST_IP_PUBLIC_SECRET],
    vpcConnector: "cloudsql-connector",
    vpcConnectorEgressSettings: "PRIVATE_RANGES_ONLY" }, async (request) => {
    if (!request.auth || !request.auth.token) {
        throw new https_1.HttpsError('unauthenticated', 'Requisita autenticação.');
    }
    const auth = await (0, auth_1.authorizeRequest)(request.auth.token);
    (0, app_check_1.verifyAppCheck)(request);
    console.log('App Check verified');
    (0, app_check_1.verifyAppCheck)(request);
    console.log("App Check verified");
    const { patientId } = request.data;
    if (!patientId) {
        throw new https_1.HttpsError('invalid-argument', 'patientId é obrigatório');
    }
    const pool = (0, init_1.getPool)();
    try {
        // Verificar se paciente pertence à organização
        const patient = await pool.query('SELECT id FROM patients WHERE id = $1 AND organization_id = $2', [patientId, auth.organizationId]);
        if (patient.rows.length === 0) {
            throw new https_1.HttpsError('not-found', 'Paciente não encontrado');
        }
        // Buscar estatísticas
        const [appointmentsResult, sessionsResult, plansResult,] = await Promise.all([
            pool.query(`SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'concluido') as completed,
          COUNT(*) FILTER (WHERE status = 'agendado') as scheduled,
          COUNT(*) FILTER (WHERE date >= CURRENT_DATE) as upcoming
        FROM appointments
        WHERE patient_id = $1`, [patientId]),
            pool.query(`SELECT COUNT(*) as total_sessions
        FROM treatment_sessions
        WHERE patient_id = $1`, [patientId]),
            pool.query(`SELECT COUNT(*) as active_plans
        FROM exercise_plans
        WHERE patient_id = $1 AND status = 'ativo'`, [patientId]),
        ]);
        const apptStats = appointmentsResult.rows[0];
        return {
            data: {
                appointments: {
                    total: parseInt(apptStats.total || '0', 10),
                    completed: parseInt(apptStats.completed || '0', 10),
                    scheduled: parseInt(apptStats.scheduled || '0', 10),
                    upcoming: parseInt(apptStats.upcoming || '0', 10),
                },
                treatment_sessions: parseInt(sessionsResult.rows[0].total_sessions || '0', 10),
                active_plans: parseInt(plansResult.rows[0].active_plans || '0', 10),
            },
        };
    }
    catch (error) {
        console.error('Error in getPatientStats:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        const errorMessage = error instanceof Error ? error.message : 'Erro interno ao buscar estatísticas';
        throw new https_1.HttpsError('internal', errorMessage);
    }
});
//# sourceMappingURL=patients.js.map