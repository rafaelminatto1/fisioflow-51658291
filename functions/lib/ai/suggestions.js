"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.patientChatbot = exports.predictRecoveryTime = exports.analyzePatientRecord = exports.suggestExercises = void 0;
const https_1 = require("firebase-functions/v2/https");
const init_1 = require("../init");
const firestore = (0, init_1.getAdminDb)();
/**
 * Cloud Function: Sugerir exercícios baseado em diagnóstico
 */
exports.suggestExercises = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '512MiB',
    maxInstances: 10,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
    }
    const { pathology, bodyPart, goals, limitations } = request.data;
    // Buscar exercícios da biblioteca
    let query = firestore.collection('exercises');
    if (bodyPart) {
        // Buscar exercícios que mencionam a parte do corpo
        query = query.where('category', '==', mapBodyPartToCategory(bodyPart));
    }
    const exercisesSnapshot = await query.limit(50).get();
    const exercises = exercisesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));
    // Aplicar filtros baseado em patologia e limitações
    const filtered = filterExercisesByCriteria(exercises, {
        pathology,
        limitations,
    });
    // Ordenar por relevância
    const ranked = rankExercisesByRelevance(filtered, {
        pathology,
        bodyPart,
        goals,
    });
    // Retornar top 10 sugestões
    return {
        success: true,
        suggestions: ranked.slice(0, 10),
    };
});
/**
 * Cloud Function: Analisar prontuário do paciente
 */
exports.analyzePatientRecord = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '512MiB',
    maxInstances: 10,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
    }
    const { patientId } = request.data;
    // Buscar evoluções do paciente
    const evolutionsSnapshot = await firestore
        .collection('evolutions')
        .where('patientId', '==', patientId)
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();
    const evolutions = evolutionsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
    }));
    if (evolutions.length < 2) {
        return {
            success: true,
            insights: null,
            message: 'Dados insuficientes para análise (mínimo 2 evoluções)',
        };
    }
    // Analisar tendências
    const insights = {
        painTrend: analyzePainTrend(evolutions),
        adherenceRate: await calculateAdherenceRate(patientId, evolutions),
        progressRate: calculateProgressRate(evolutions),
        recommendations: generateRecommendations(evolutions),
        riskFactors: identifyRiskFactors(evolutions),
    };
    return {
        success: true,
        insights,
    };
});
/**
 * Cloud Function: Predizer tempo de recuperação
 */
exports.predictRecoveryTime = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 10,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
    }
    const { pathology, severity, age, comorbidities } = request.data;
    // Estimativa baseada em dados médicos gerais
    const baseRecoveryTimes = {
        'entorse': 21, // dias
        'tendinite': 30,
        'luxacao': 45,
        'fratura': 90,
        'pos_cirurgia': 60,
        'lombalgia': 14,
        'cervicalgia': 14,
        'capsulite': 45,
        'lesao_lca': 180,
        'lesao_menisco': 60,
    };
    let baseDays = baseRecoveryTimes[pathology] || 30;
    // Ajustar por severidade
    if (severity) {
        const severityMultipliers = {
            mild: 0.7,
            moderate: 1,
            severe: 1.5,
        };
        baseDays *= severityMultipliers[severity];
    }
    // Ajustar por idade
    if (age) {
        if (age > 60) {
            baseDays *= 1.3;
        }
        else if (age > 40) {
            baseDays *= 1.1;
        }
    }
    // Ajustar por comorbidades
    if (comorbidities && comorbidities.length > 0) {
        baseDays *= (1 + comorbidities.length * 0.15);
    }
    // Adicionar margem de erro (+/- 20%)
    const minDays = Math.round(baseDays * 0.8);
    const maxDays = Math.round(baseDays * 1.2);
    return {
        success: true,
        prediction: {
            estimatedDays: Math.round(baseDays),
            minDays,
            maxDays,
            estimatedWeeks: Math.round(baseDays / 7),
            confidence: 'moderate',
            factors: {
                pathology,
                severity,
                age,
                comorbidities,
            },
        },
    };
});
/**
 * Cloud Function: Chatbot IA para pacientes
 */
exports.patientChatbot = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '512MiB',
    maxInstances: 10,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
    }
    const { message, conversationHistory: _conversationHistory } = request.data;
    // Processar mensagem com NLP simples
    const lowerMessage = message.toLowerCase();
    // Detectar intenções
    let intent = '';
    if (lowerMessage.includes('agendar') || lowerMessage.includes('marcar') || lowerMessage.includes('horário')) {
        intent = 'schedule_appointment';
    }
    else if (lowerMessage.includes('exercício') || lowerMessage.includes('exercicio')) {
        intent = 'exercises';
    }
    else if (lowerMessage.includes('dor') || lowerMessage.includes('sinto')) {
        intent = 'report_pain';
    }
    else if (lowerMessage.includes('cancelar') || lowerMessage.includes('desmarcar')) {
        intent = 'cancel_appointment';
    }
    else if (lowerMessage.includes('pagamento') || lowerMessage.includes('voucher')) {
        intent = 'payment';
    }
    else if (lowerMessage.includes('ajuda') || lowerMessage.includes('socorro')) {
        intent = 'help';
    }
    else {
        intent = 'general';
    }
    // Gerar resposta baseada na intenção
    const response = generateChatbotResponse(intent, message);
    // Salvar conversa para histórico e melhoria contínua
    const conversationRef = firestore.collection('chatbot_conversations').doc();
    await conversationRef.create({
        userId: request.auth.uid,
        message,
        intent,
        response,
        timestamp: new Date().toISOString(),
    });
    return {
        success: true,
        response,
        intent,
    };
});
// ============================================================================================
// HELPER FUNCTIONS
// ============================================================================================
/**
 * Mapeia parte do corpo para categoria de exercício
 */
function mapBodyPartToCategory(bodyPart) {
    const mappings = {
        'coluna': 'coluna',
        'joelho': 'joelho',
        'ombro': 'ombro',
        'quadril': 'quadril',
        'tornozelo': 'tornozelo',
        'punho': 'punho',
        'cotovelo': 'cotovelo',
        'pescoço': 'pescoço',
        'lombar': 'coluna',
        'dorsal': 'coluna',
        'quadríceps': 'alongamento',
        'isquiotibiais': 'alongamento',
    };
    return mappings[bodyPart.toLowerCase()] || 'funcional';
}
/**
 * Filtra exercícios baseado em critérios
 */
function filterExercisesByCriteria(exercises, criteria) {
    let filtered = [...exercises];
    // Filtrar por limitações físicas
    if (criteria.limitations && criteria.limitations.length > 0) {
        filtered = filtered.filter(ex => {
            const tags = ex.tags || [];
            const description = (ex.description || '').toLowerCase();
            // Remover exercícios conflitantes com limitações
            return !criteria.limitations.some(limitation => tags.includes(limitation) || description.includes(limitation));
        });
    }
    return filtered;
}
/**
 * Ordena exercícios por relevância
 */
function rankExercisesByRelevance(exercises, context) {
    return exercises.map(ex => {
        let score = 0;
        // Pontuação por correspondência de categoria
        if (context.bodyPart && ex.category === mapBodyPartToCategory(context.bodyPart)) {
            score += 10;
        }
        // Pontuação por tags correspondentes
        if (context.goals && context.goals.length > 0) {
            context.goals.forEach(goal => {
                if (ex.tags?.includes(goal)) {
                    score += 5;
                }
                if (ex.name?.toLowerCase().includes(goal.toLowerCase())) {
                    score += 3;
                }
            });
        }
        // Pontuação por dificuldade
        if (ex.difficulty === 'medio' || ex.difficulty === 'intermediate') {
            score += 2;
        }
        else if (ex.difficulty === 'facil' || ex.difficulty === 'beginner') {
            score += 1;
        }
        return { ...ex, relevanceScore: score };
    })
        .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
}
/**
 * Analisa tendência de dor
 */
function analyzePainTrend(evolutions) {
    const painLevels = evolutions
        .filter(e => e.painLevel !== null && e.painLevel !== undefined)
        .map(e => e.painLevel)
        .reverse();
    if (painLevels.length < 2) {
        return 'stable';
    }
    // Calcular tendência linear
    const n = painLevels.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += painLevels[i];
        sumXY += i * painLevels[i];
        sumX2 += i * i;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    if (slope < -0.5) {
        return 'improving';
    }
    else if (slope > 0.5) {
        return 'worsening';
    }
    return 'stable';
}
/**
 * Calcula taxa de adesão ao tratamento
 */
async function calculateAdherenceRate(patientId, _evolutions) {
    const appointmentsSnapshot = await firestore
        .collection('appointments')
        .where('patientId', '==', patientId)
        .where('date', '<=', new Date().toISOString())
        .limit(50)
        .get();
    const appointments = appointmentsSnapshot.docs.map((doc) => doc.data());
    if (appointments.length === 0) {
        return 100;
    }
    const attended = appointments.filter(a => a.status === 'concluido' || a.status === 'atendido').length;
    return Math.round((attended / appointments.length) * 100);
}
/**
 * Calcula taxa de progresso
 */
function calculateProgressRate(evolutions) {
    if (evolutions.length < 2) {
        return 0;
    }
    const first = evolutions[evolutions.length - 1];
    const last = evolutions[0];
    if (first.painLevel !== null && last.painLevel !== null && first.painLevel !== undefined && last.painLevel !== undefined) {
        const improvement = first.painLevel - last.painLevel;
        const maxPossible = first.painLevel;
        if (maxPossible > 0) {
            return Math.min(100, Math.round((improvement / maxPossible) * 100));
        }
    }
    return 50;
}
/**
 * Gera recomendações baseadas nas evoluções
 */
function generateRecommendations(evolutions) {
    const recommendations = [];
    const painTrend = analyzePainTrend(evolutions);
    if (painTrend === 'improving') {
        recommendations.push('Continue com o protocolo atual, os resultados estão positivos');
    }
    else if (painTrend === 'worsening') {
        recommendations.push('Considere revisar o protocolo de tratamento');
        recommendations.push('Avalie necessidade de encaminhamento especializado');
    }
    const lastEvolution = evolutions[0];
    if (lastEvolution?.painLevel && lastEvolution.painLevel >= 7) {
        recommendations.push('Nível de dor elevado - considere ajustar intensidade dos exercícios');
    }
    return recommendations;
}
/**
 * Identifica fatores de risco
 */
function identifyRiskFactors(evolutions) {
    const risks = [];
    const painTrend = analyzePainTrend(evolutions);
    if (painTrend === 'worsening') {
        risks.push('Dor progressiva sem melhora');
    }
    const lastEvolution = evolutions[0];
    if (lastEvolution?.painLevel && lastEvolution.painLevel >= 8) {
        risks.push('Dor severa persistente');
    }
    return risks;
}
/**
 * Gera resposta do chatbot
 */
function generateChatbotResponse(intent, _message) {
    const responses = {
        'schedule_appointment': 'Para agendar uma sessão, você pode:\n\n1. Acessar a aba "Agenda" no app\n2. Clicar em "Novo Agendamento"\n3. Escolher data e horário disponível\n\nOu se preferir, me diga a data desejada e posso verificar a disponibilidade.',
        'exercises': 'Seus exercícios prescritos estão disponíveis na aba "Exercícios". Você pode ver vídeos, instruções e marcar quando completar cada um.\n\nDeseja ver seus planos de exercício?',
        'report_pain': 'Entendi que você está sentindo dor. Por favor, me informe:\n\n1. Qual é a intensidade da dor (0-10)?\n2. Onde está localizada?\n\nVou registrar isso no seu prontuário para que seu fisioterapeuta possa avaliar.',
        'cancel_appointment': 'Para cancelar um agendamento:\n\n1. Vá até a aba "Agenda"\n2. Encontre o agendamento desejado\n3. Clique em "Cancelar"\n\nLembre-se: cancelamentos devem ser feitos com pelo menos 24h de antecedência.',
        'payment': 'Para adquirir novos vouchers de sessões:\n\n1. Acesse "Perfil" > "Vouchers"\n2. Escolha o plano desejado\n3. Prossiga para o pagamento seguro\n\nAceitamos cartão de crédito e PIX.',
        'help': 'Olá! Sou o assistente virtual do FisioFlow. Como posso ajudar?\n\nPosso ajudar com:\n• Agendar sessões\n• Informações sobre exercícios\n• Pagamentos\n• Dúvidas gerais\n\nDigite sua dúvida ou escolha uma opção acima.',
        'general': 'Obrigado pela mensagem! Em breve um membro da nossa equipe entrará em contato.\n\nSe precisar de ajuda imediata, você pode:\n• Agendar uma sessão pelo app\n• Ver seus exercícios prescritos\n• Ver o histórico de agendamentos',
    };
    return responses[intent] || responses['general'];
}
//# sourceMappingURL=suggestions.js.map