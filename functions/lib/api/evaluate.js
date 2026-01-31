"use strict";
/**
 * API Endpoint: /api/v1/evaluate
 * Endpoint genérico para avaliações via HTTP
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiEvaluate = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger_1 = require("../lib/logger");
/**
 * Endpoint HTTP para avaliações
 * Suporta GET (listar/buscar) e POST (criar)
 */
exports.apiEvaluate = (0, https_1.onRequest)((req, res) => {
    // CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    try {
        const { method, query, body } = req;
        // Router básico baseado no método
        if (method === 'GET') {
            // Listar assessments ou buscar assessment específico
            const { patientId, templateId, assessmentId } = query;
            if (assessmentId) {
                res.json({
                    message: 'Buscar assessment específico',
                    assessmentId,
                    note: 'Implementar chamada à getAssessment',
                });
                return;
            }
            if (patientId) {
                res.json({
                    message: 'Listar assessments do paciente',
                    patientId,
                    note: 'Implementar chamada à listAssessments',
                });
                return;
            }
            if (templateId) {
                res.json({
                    message: 'Buscar template de avaliação',
                    templateId,
                    note: 'Implementar chamada à getAssessmentTemplate',
                });
                return;
            }
            // Listar todos os templates
            res.json({
                message: 'Listar todos os templates de avaliação',
                note: 'Implementar chamada à listAssessmentTemplates',
            });
            return;
        }
        if (method === 'POST') {
            // Criar nova avaliação
            res.json({
                message: 'Criar nova avaliação',
                data: body,
                note: 'Implementar chamada à createAssessment',
            });
            return;
        }
        if (method === 'PUT') {
            // Atualizar avaliação
            const { assessmentId } = query;
            res.json({
                message: 'Atualizar avaliação',
                assessmentId,
                data: body,
                note: 'Implementar chamada à updateAssessment',
            });
            return;
        }
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    catch (error) {
        logger_1.logger.error('Erro em apiEvaluate:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error?.message || 'Unknown error',
        });
    }
});
//# sourceMappingURL=evaluate.js.map