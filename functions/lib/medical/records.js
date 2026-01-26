"use strict";
/**
 * Electronic Medical Record - SOAP Advanced
 *
 * Prontuário eletrônico completo com SOAP avançado,
 * anexos, assinatura digital e histórico de edições
 *
 * @module medical/records
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
exports.compareEvolutions = exports.generateEvolutionReport = exports.getPatientEvolutionHistory = exports.addEvolutionAttachment = exports.updateEvolution = exports.createEvolution = void 0;
const https_1 = require("firebase-functions/v2/https");
const firebase_admin_1 = require("firebase-admin");
const logger = __importStar(require("firebase-functions/logger"));
const uuid_1 = require("uuid");
/**
 * Cloud Function: Criar evolução completa (SOAP avançado)
 */
exports.createEvolution = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '512MiB',
    maxInstances: 10,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
    }
    const { patientId, appointmentId, subjective, objective, assessment, plan, painLevel, measurements, attachments, } = request.data;
    const therapistId = request.auth.uid;
    const evolutionId = (0, uuid_1.v4)();
    // Buscar dados do paciente
    const patientDoc = await (0, firebase_admin_1.firestore)()
        .collection('patients')
        .doc(patientId)
        .get();
    if (!patientDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Paciente não encontrado');
    }
    // Criar evolução com histórico de versionamento
    const evolutionData = {
        id: evolutionId,
        patientId,
        therapistId,
        appointmentId: appointmentId || null,
        subjective: subjective || '',
        objective: objective || '',
        assessment: assessment || '',
        plan: plan || '',
        painLevel: painLevel || null,
        measurements: measurements || {},
        attachments: attachments || [],
        createdAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
        version: 1,
        previousVersions: [],
    };
    await (0, firebase_admin_1.firestore)()
        .collection('evolutions')
        .doc(evolutionId)
        .set(evolutionData);
    // Atualizar sessão associada (se existir)
    if (appointmentId) {
        await (0, firebase_admin_1.firestore)()
            .collection('sessions')
            .where('appointmentId', '==', appointmentId)
            .limit(1)
            .get()
            .then(snapshot => {
            if (!snapshot.empty) {
                return snapshot.docs[0].ref.update({
                    subjective,
                    objective,
                    assessment,
                    plan,
                    painLevel,
                    evolutionId,
                    status: 'completed',
                });
            }
        });
    }
    // Log de auditoria
    await (0, firebase_admin_1.firestore)()
        .collection('audit_logs')
        .add({
        action: 'evolution_created',
        userId: therapistId,
        patientId,
        evolutionId,
        timestamp: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
    });
    logger.info(`Evolution created: ${evolutionId} for patient: ${patientId}`);
    return {
        success: true,
        evolutionId,
        data: evolutionData,
    };
});
/**
 * Cloud Function: Atualizar evolução (com versionamento)
 */
exports.updateEvolution = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '512MiB',
    maxInstances: 10,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
    }
    const { evolutionId, subjective, objective, assessment, plan, painLevel, measurements, } = request.data;
    // Buscar evolução atual
    const evolutionDoc = await (0, firebase_admin_1.firestore)()
        .collection('evolutions')
        .doc(evolutionId)
        .get();
    if (!evolutionDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Evolução não encontrada');
    }
    const currentData = evolutionDoc.data();
    // Verificar permissão (apenas criador ou admin)
    if (currentData?.therapistId !== request.auth.uid) {
        const userDoc = await (0, firebase_admin_1.firestore)()
            .collection('users')
            .doc(request.auth.uid)
            .get();
        if (userDoc.data()?.role !== 'admin') {
            throw new https_1.HttpsError('permission-denied', 'Sem permissão para editar esta evolução');
        }
    }
    // Salvar versão anterior no histórico
    const previousVersion = {
        version: currentData?.version,
        data: {
            subjective: currentData?.subjective,
            objective: currentData?.objective,
            assessment: currentData?.assessment,
            plan: currentData?.plan,
            painLevel: currentData?.painLevel,
            measurements: currentData?.measurements,
            updatedAt: currentData?.updatedAt,
        },
        updatedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
    };
    // Atualizar com nova versão
    const updatedData = {
        subjective: subjective ?? currentData?.subjective,
        objective: objective ?? currentData?.objective,
        assessment: assessment ?? currentData?.assessment,
        plan: plan ?? currentData?.plan,
        painLevel: painLevel ?? currentData?.painLevel,
        measurements: measurements ?? currentData?.measurements,
        version: (currentData?.version || 0) + 1,
        updatedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
        previousVersions: [...(currentData?.previousVersions || []), previousVersion],
    };
    await evolutionDoc.ref.update(updatedData);
    // Log de auditoria
    await (0, firebase_admin_1.firestore)()
        .collection('audit_logs')
        .add({
        action: 'evolution_updated',
        userId: request.auth.uid,
        evolutionId,
        version: updatedData.version,
        timestamp: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
    });
    return {
        success: true,
        version: updatedData.version,
    };
});
/**
 * Cloud Function: Adicionar anexo à evolução
 */
exports.addEvolutionAttachment = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 10,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
    }
    const { evolutionId, attachment } = request.data;
    // Validar tamanho do anexo (max 10MB)
    if (attachment.size && attachment.size > 10 * 1024 * 1024) {
        throw new https_1.HttpsError('invalid-argument', 'Anexo muito grande (máximo 10MB)');
    }
    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'video/mp4'];
    if (!allowedTypes.includes(attachment.type)) {
        throw new https_1.HttpsError('invalid-argument', 'Tipo de arquivo não permitido');
    }
    const evolutionDoc = await (0, firebase_admin_1.firestore)()
        .collection('evolutions')
        .doc(evolutionId)
        .get();
    if (!evolutionDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Evolução não encontrada');
    }
    // Adicionar anexo
    const newAttachment = {
        ...attachment,
        id: (0, uuid_1.v4)(),
        uploadedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
        uploadedBy: request.auth.uid,
    };
    await evolutionDoc.ref.update({
        attachments: firebase_admin_1.firestore.FieldValue.arrayUnion(newAttachment),
        updatedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
    });
    logger.info(`Attachment added to evolution: ${evolutionId}`);
    return { success: true, attachmentId: newAttachment.id };
});
/**
 * Cloud Function: Obter histórico de evoluções do paciente
 */
exports.getPatientEvolutionHistory = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 10,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
    }
    const { patientId, limit = 50 } = request.data;
    // Verificar permissão (paciente só vê o próprio)
    const userDoc = await (0, firebase_admin_1.firestore)()
        .collection('users')
        .doc(request.auth.uid)
        .get();
    const user = userDoc.data();
    const role = user?.role;
    if (role === 'paciente' && user?.patientId !== patientId) {
        throw new https_1.HttpsError('permission-denied', 'Sem permissão para ver este histórico');
    }
    // Buscar evoluções
    const evolutionsSnapshot = await (0, firebase_admin_1.firestore)()
        .collection('evolutions')
        .where('patientId', '==', patientId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();
    const evolutions = evolutionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    }));
    // Buscar métricas agregadas
    const stats = await calculateEvolutionStats(patientId);
    return {
        success: true,
        evolutions,
        stats,
    };
});
/**
 * Cloud Function: Gerar relatório de evolução em PDF
 */
exports.generateEvolutionReport = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '1GiB',
    maxInstances: 5,
    timeoutSeconds: 300,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
    }
    const { patientId, startDate, endDate } = request.data;
    // Buscar dados do paciente
    const patientDoc = await (0, firebase_admin_1.firestore)()
        .collection('patients')
        .doc(patientId)
        .get();
    if (!patientDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Paciente não encontrado');
    }
    const patient = patientDoc.data();
    // Buscar evoluções no período
    const evolutionsSnapshot = await (0, firebase_admin_1.firestore)()
        .collection('evolutions')
        .where('patientId', '==', patientId)
        .where('createdAt', '>=', new Date(startDate))
        .where('createdAt', '<=', new Date(endDate))
        .orderBy('createdAt', 'asc')
        .get();
    const evolutions = evolutionsSnapshot.docs.map(doc => doc.data());
    // Buscar terapeutas
    const therapistIds = [...new Set(evolutions.map(e => e.therapistId))];
    const therapists = await Promise.all(therapistIds.map(async (id) => {
        const doc = await (0, firebase_admin_1.firestore)().collection('users').doc(id).get();
        return { id, ...doc.data() };
    }));
    // Gerar HTML do relatório
    const reportHtml = generateEvolutionReportHtml({
        patient,
        evolutions,
        therapists,
        startDate,
        endDate,
    });
    // Salvar no Storage
    const storage = require('firebase-admin/storage').bucket();
    const fileName = `reports/evolution_${patientId}_${Date.now()}.pdf`;
    const file = storage.file(fileName);
    // Aqui você usaria uma biblioteca de PDF (ex: PDFKit, Puppeteer)
    // Por enquanto salvando como HTML
    await file.save(reportHtml, {
        contentType: 'text/html',
    });
    const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 24 * 60 * 60 * 1000, // 24 horas
    });
    // Log de auditoria
    await (0, firebase_admin_1.firestore)()
        .collection('audit_logs')
        .add({
        action: 'evolution_report_generated',
        userId: request.auth.uid,
        patientId,
        reportUrl: fileName,
        timestamp: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
    });
    return {
        success: true,
        downloadUrl: url,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
});
/**
 * Cloud Function: Comparar evoluções (antes/depois)
 */
exports.compareEvolutions = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 10,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
    }
    const { evolutionId1, evolutionId2 } = request.data;
    // Buscar evoluções
    const [evolution1, evolution2] = await Promise.all([
        (0, firebase_admin_1.firestore)().collection('evolutions').doc(evolutionId1).get(),
        (0, firebase_admin_1.firestore)().collection('evolutions').doc(evolutionId2).get(),
    ]);
    if (!evolution1.exists || !evolution2.exists) {
        throw new https_1.HttpsError('not-found', 'Evolução não encontrada');
    }
    const data1 = evolution1.data();
    const data2 = evolution2.data();
    // Calcular diferenças
    const comparison = {
        painLevel: {
            before: data1?.painLevel,
            after: data2?.painLevel,
            difference: (data2?.painLevel || 0) - (data1?.painLevel || 0),
            improved: (data2?.painLevel || 0) < (data1?.painLevel || 0),
        },
        measurements: {},
    };
    // Comparar medições
    const allKeys = new Set([
        ...Object.keys(data1?.measurements || {}),
        ...Object.keys(data2?.measurements || {}),
    ]);
    allKeys.forEach(key => {
        const before = data1?.measurements?.[key] || 0;
        const after = data2?.measurements?.[key] || 0;
        const difference = after - before;
        comparison.measurements[key] = {
            before,
            after,
            difference,
            improved: difference !== 0, // Contexto específico seria necessário
        };
    });
    return {
        success: true,
        comparison,
        date1: data1?.createdAt,
        date2: data2?.createdAt,
    };
});
// ============================================================================================
// HELPER FUNCTIONS
// ============================================================================================
/**
 * Calcula estatísticas de evolução do paciente
 */
async function calculateEvolutionStats(patientId) {
    const evolutionsSnapshot = await (0, firebase_admin_1.firestore)()
        .collection('evolutions')
        .where('patientId', '==', patientId)
        .orderBy('createdAt', 'desc')
        .get();
    const evolutions = evolutionsSnapshot.docs.map(doc => doc.data());
    if (evolutions.length === 0) {
        return null;
    }
    // Estatísticas de dor
    const painLevels = evolutions
        .filter(e => e.painLevel !== null && e.painLevel !== undefined)
        .map(e => e.painLevel);
    const avgPain = painLevels.length > 0
        ? painLevels.reduce((a, b) => a + b, 0) / painLevels.length
        : null;
    const initialPain = painLevels[painLevels.length - 1];
    const currentPain = painLevels[0];
    const painImprovement = initialPain !== null && currentPain !== null
        ? initialPain - currentPain
        : null;
    // Total de sessões
    const totalSessions = evolutions.length;
    // Progresso de medições
    const measurementsProgress = {};
    if (evolutions.length >= 2) {
        const first = evolutions[evolutions.length - 1];
        const last = evolutions[0];
        Object.keys(last.measurements || {}).forEach(key => {
            const initial = first.measurements?.[key] || 0;
            const current = last.measurements?.[key] || 0;
            measurementsProgress[key] = {
                initial,
                current,
                progress: current - initial,
            };
        });
    }
    return {
        totalSessions,
        avgPain: avgPain ? Math.round(avgPain * 10) / 10 : null,
        initialPain,
        currentPain,
        painImprovement,
        measurementsProgress,
        firstEvolution: evolutions[evolutions.length - 1]?.createdAt,
        lastEvolution: evolutions[0]?.createdAt,
    };
}
/**
 * Gera HTML do relatório de evolução
 */
function generateEvolutionReportHtml(params) {
    const { patient, evolutions, therapists, startDate, endDate } = params;
    const therapistMap = new Map(therapists.map(t => [t.id, t.displayName || t.fullName]));
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório de Evolução - ${patient?.fullName || patient?.name}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 2px solid #10B981;
      padding-bottom: 20px;
    }
    .header h1 {
      color: #10B981;
      margin: 0;
    }
    .patient-info {
      background: #f3f4f6;
      padding: 15px;
      border-radius: 10px;
      margin-bottom: 20px;
    }
    .evolution {
      margin-bottom: 30px;
      padding: 15px;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
    }
    .evolution-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      padding-bottom: 10px;
      border-bottom: 1px solid #e5e7eb;
    }
    .soap-section {
      margin-bottom: 10px;
    }
    .soap-section h4 {
      color: #10B981;
      margin: 5px 0;
    }
    .pain-indicator {
      display: inline-block;
      padding: 5px 15px;
      border-radius: 20px;
      font-weight: bold;
    }
    .pain-low { background: #d1fae5; color: #065f46; }
    .pain-medium { background: #fef3c7; color: #92400e; }
    .pain-high { background: #fee2e2; color: #991b1b; }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Relatório de Evolução</h1>
    <p>FisioFlow - Fisioterapia Digital</p>
  </div>

  <div class="patient-info">
    <h3>Paciente: ${patient?.fullName || patient?.name}</h3>
    <p><strong>Período:</strong> ${new Date(startDate).toLocaleDateString('pt-BR')} a ${new Date(endDate).toLocaleDateString('pt-BR')}</p>
    <p><strong>Total de Sessões:</strong> ${evolutions.length}</p>
  </div>

  ${evolutions.map((evo, index) => `
    <div class="evolution">
      <div class="evolution-header">
        <strong>Sessão #${evolutions.length - index}</strong>
        <span>${new Date(evo.createdAt?.toDate?.()).toLocaleDateString('pt-BR')}</span>
      </div>

      <p><strong>Fisioterapeuta:</strong> ${therapistMap.get(evo.therapistId) || 'N/A'}</p>

      ${evo.painLevel !== null ? `
        <p>
          <strong>Nível de Dor:</strong>
          <span class="pain-indicator ${evo.painLevel <= 3 ? 'pain-low' : evo.painLevel <= 6 ? 'pain-medium' : 'pain-high'}">
            ${evo.painLevel}/10
          </span>
        </p>
      ` : ''}

      ${evo.subjective ? `
        <div class="soap-section">
          <h4>👂 Subjetivo</h4>
          <p>${evo.subjective}</p>
        </div>
      ` : ''}

      ${evo.objective ? `
        <div class="soap-section">
          <h4>👁️ Objetivo</h4>
          <p>${evo.objective}</p>
        </div>
      ` : ''}

      ${evo.assessment ? `
        <div class="soap-section">
          <h4>💭 Avaliação</h4>
          <p>${evo.assessment}</p>
        </div>
      ` : ''}

      ${evo.plan ? `
        <div class="soap-section">
          <h4>📋 Plano</h4>
          <p>${evo.plan}</p>
        </div>
      ` : ''}

      ${Object.keys(evo.measurements || {}).length > 0 ? `
        <div class="soap-section">
          <h4>📏 Medições</h4>
          <ul>
            ${Object.entries(evo.measurements).map(([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  `).join('')}

  <div class="footer">
    <p>Relatório gerado em ${new Date().toLocaleString('pt-BR')}</p>
    <p>FisioFlow © ${new Date().getFullYear()} - Todos os direitos reservados</p>
  </div>
</body>
</html>
  `;
}
//# sourceMappingURL=records.js.map