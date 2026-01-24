"use strict";
/**
 * API Functions: Assessments (Evaluations)
 * Cloud Functions para gestão de avaliações de pacientes
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
exports.updateAssessment = exports.createAssessment = exports.getAssessment = exports.listAssessments = exports.getAssessmentTemplate = exports.listAssessmentTemplates = void 0;
const https_1 = require("firebase-functions/v2/https");
const pg_1 = require("pg");
const auth_1 = require("../middleware/auth");
/**
 * Helper para verificar auth e chamar authorizeRequest
 */
async function getAuth(request) {
    if (!request.auth?.token) {
        throw new https_1.HttpsError('unauthenticated', 'Autenticação necessária');
    }
    return (0, auth_1.authorizeRequest)(request.auth.token);
}
/**
 * Lista templates de avaliação
 */
exports.listAssessmentTemplates = (0, https_1.onCall)(async (request) => {
    const auth = await getAuth(request);
    const pool = new pg_1.Pool({
        connectionString: process.env.CLOUD_SQL_CONNECTION_STRING,
        ssl: { rejectUnauthorized: false },
    });
    try {
        const result = await pool.query(`SELECT
        id, name, description, category,
        is_global, display_order, is_active,
        created_at, updated_at
      FROM assessment_templates
      WHERE is_active = true
        AND (organization_id = $1 OR is_global = true)
      ORDER BY display_order, name`, [auth.organizationId]);
        return { data: result.rows };
    }
    finally {
        await pool.end();
    }
});
/**
 * Busca um template de avaliação com seções e perguntas
 */
exports.getAssessmentTemplate = (0, https_1.onCall)(async (request) => {
    const auth = await getAuth(request);
    const { templateId } = request.data || {};
    if (!templateId) {
        throw new https_1.HttpsError('invalid-argument', 'templateId é obrigatório');
    }
    const pool = new pg_1.Pool({
        connectionString: process.env.CLOUD_SQL_CONNECTION_STRING,
        ssl: { rejectUnauthorized: false },
    });
    try {
        // Buscar template
        const templateResult = await pool.query(`SELECT * FROM assessment_templates
       WHERE id = $1
         AND is_active = true
         AND (organization_id = $2 OR is_global = true)`, [templateId, auth.organizationId]);
        if (templateResult.rows.length === 0) {
            throw new https_1.HttpsError('not-found', 'Template não encontrado');
        }
        const template = templateResult.rows[0];
        // Buscar seções
        const sectionsResult = await pool.query(`SELECT * FROM assessment_sections
       WHERE template_id = $1 AND is_active = true
       ORDER BY order`, [templateId]);
        // Buscar perguntas de cada seção
        const sectionsWithQuestions = await Promise.all(sectionsResult.rows.map(async (section) => {
            const questionsResult = await pool.query(`SELECT * FROM assessment_questions
           WHERE section_id = $1 AND is_active = true
           ORDER BY order`, [section.id]);
            return {
                ...section,
                questions: questionsResult.rows,
            };
        }));
        return {
            data: {
                ...template,
                sections: sectionsWithQuestions,
            },
        };
    }
    finally {
        await pool.end();
    }
});
/**
 * Lista avaliações de um paciente
 */
exports.listAssessments = (0, https_1.onCall)(async (request) => {
    const auth = await getAuth(request);
    const { patientId, status } = request.data || {};
    if (!patientId) {
        throw new https_1.HttpsError('invalid-argument', 'patientId é obrigatório');
    }
    const pool = new pg_1.Pool({
        connectionString: process.env.CLOUD_SQL_CONNECTION_STRING,
        ssl: { rejectUnauthorized: false },
    });
    try {
        let query = `
      SELECT
        a.*,
        t.name as template_name,
        p.full_name as performer_name
      FROM patient_assessments a
      LEFT JOIN assessment_templates t ON a.template_id = t.id
      LEFT JOIN profiles p ON a.performed_by = p.user_id
      WHERE a.patient_id = $1
        AND a.organization_id = $2
    `;
        const params = [patientId, auth.organizationId];
        if (status) {
            query += ` AND a.status = $3`;
            params.push(status);
        }
        query += ` ORDER BY a.assessment_date DESC, a.created_at DESC`;
        const result = await pool.query(query, params);
        return { data: result.rows };
    }
    finally {
        await pool.end();
    }
});
/**
 * Busca uma avaliação específica
 */
exports.getAssessment = (0, https_1.onCall)(async (request) => {
    const auth = await getAuth(request);
    const { assessmentId } = request.data || {};
    if (!assessmentId) {
        throw new https_1.HttpsError('invalid-argument', 'assessmentId é obrigatório');
    }
    const pool = new pg_1.Pool({
        connectionString: process.env.CLOUD_SQL_CONNECTION_STRING,
        ssl: { rejectUnauthorized: false },
    });
    try {
        // Buscar avaliação
        const assessmentResult = await pool.query(`SELECT * FROM patient_assessments
       WHERE id = $1 AND organization_id = $2`, [assessmentId, auth.organizationId]);
        if (assessmentResult.rows.length === 0) {
            throw new https_1.HttpsError('not-found', 'Avaliação não encontrada');
        }
        const assessment = assessmentResult.rows[0];
        // Buscar respostas
        const responsesResult = await pool.query(`SELECT
        ar.*,
        q.question_text,
        q.answer_type,
        q.options
      FROM assessment_responses ar
      LEFT JOIN assessment_questions q ON ar.question_id = q.id
      WHERE ar.assessment_id = $1
      ORDER BY q.section_id, q.order`, [assessmentId]);
        return {
            data: {
                ...assessment,
                responses: responsesResult.rows,
            },
        };
    }
    finally {
        await pool.end();
    }
});
/**
 * Cria uma nova avaliação
 */
exports.createAssessment = (0, https_1.onCall)(async (request) => {
    const auth = await getAuth(request);
    const { patientId, templateId, title, assessmentDate, responses, } = request.data || {};
    if (!patientId || !templateId) {
        throw new https_1.HttpsError('invalid-argument', 'patientId e templateId são obrigatórios');
    }
    const pool = new pg_1.Pool({
        connectionString: process.env.CLOUD_SQL_CONNECTION_STRING,
        ssl: { rejectUnauthorized: false },
    });
    try {
        // Verificar se template existe
        const templateCheck = await pool.query(`SELECT id FROM assessment_templates
       WHERE id = $1 AND is_active = true`, [templateId]);
        if (templateCheck.rows.length === 0) {
            throw new https_1.HttpsError('not-found', 'Template não encontrado');
        }
        // Iniciar transação
        await pool.query('BEGIN');
        // Criar avaliação
        const assessmentResult = await pool.query(`INSERT INTO patient_assessments (
        patient_id, template_id, title, assessment_date,
        performed_by, organization_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`, [
            patientId,
            templateId,
            title || 'Avaliação',
            assessmentDate || new Date().toISOString().split('T')[0],
            auth.userId,
            auth.organizationId,
            'completed',
        ]);
        const assessment = assessmentResult.rows[0];
        // Inserir respostas
        if (responses && Array.isArray(responses)) {
            for (const response of responses) {
                await pool.query(`INSERT INTO assessment_responses (
            assessment_id, question_id,
            answer_text, answer_number, answer_json
          ) VALUES ($1, $2, $3, $4, $5)`, [
                    assessment.id,
                    response.question_id,
                    response.answer_text || null,
                    response.answer_number || null,
                    response.answer_json ? JSON.stringify(response.answer_json) : null,
                ]);
            }
        }
        await pool.query('COMMIT');
        // Publicar no Ably
        const realtime = await Promise.resolve().then(() => __importStar(require('../realtime/publisher')));
        await realtime.publishPatientUpdate(patientId, {
            type: 'assessment_created',
            assessmentId: assessment.id,
        });
        return { data: assessment };
    }
    catch (error) {
        await pool.query('ROLLBACK');
        throw error;
    }
    finally {
        await pool.end();
    }
});
/**
 * Atualiza uma avaliação
 */
exports.updateAssessment = (0, https_1.onCall)(async (request) => {
    const auth = await getAuth(request);
    const { assessmentId, responses, ...updates } = request.data || {};
    if (!assessmentId) {
        throw new https_1.HttpsError('invalid-argument', 'assessmentId é obrigatório');
    }
    const pool = new pg_1.Pool({
        connectionString: process.env.CLOUD_SQL_CONNECTION_STRING,
        ssl: { rejectUnauthorized: false },
    });
    try {
        // Verificar se avaliação existe
        const existing = await pool.query('SELECT * FROM patient_assessments WHERE id = $1 AND organization_id = $2', [assessmentId, auth.organizationId]);
        if (existing.rows.length === 0) {
            throw new https_1.HttpsError('not-found', 'Avaliação não encontrada');
        }
        // Iniciar transação
        await pool.query('BEGIN');
        // Atualizar campos da avaliação
        const setClauses = [];
        const values = [];
        let paramCount = 0;
        const allowedFields = ['title', 'status', 'conclusion', 'recommendations', 'next_assessment_date'];
        for (const field of allowedFields) {
            if (field in updates) {
                paramCount++;
                setClauses.push(`${field} = $${paramCount}`);
                values.push(updates[field]);
            }
        }
        if (setClauses.length > 0) {
            paramCount++;
            setClauses.push(`updated_at = $${paramCount}`);
            values.push(new Date());
            values.push(assessmentId, auth.organizationId);
            await pool.query(`UPDATE patient_assessments
         SET ${setClauses.join(', ')}
         WHERE id = $${paramCount + 1} AND organization_id = $${paramCount + 2}`, values);
        }
        // Atualizar respostas se fornecidas
        if (responses && Array.isArray(responses)) {
            // Remover respostas antigas
            await pool.query('DELETE FROM assessment_responses WHERE assessment_id = $1', [
                assessmentId,
            ]);
            // Inserir novas respostas
            for (const response of responses) {
                await pool.query(`INSERT INTO assessment_responses (
            assessment_id, question_id,
            answer_text, answer_number, answer_json
          ) VALUES ($1, $2, $3, $4, $5)`, [
                    assessmentId,
                    response.question_id,
                    response.answer_text || null,
                    response.answer_number || null,
                    response.answer_json ? JSON.stringify(response.answer_json) : null,
                ]);
            }
        }
        await pool.query('COMMIT');
        return { data: { success: true } };
    }
    catch (error) {
        await pool.query('ROLLBACK');
        throw error;
    }
    finally {
        await pool.end();
    }
});
//# sourceMappingURL=assessments.js.map