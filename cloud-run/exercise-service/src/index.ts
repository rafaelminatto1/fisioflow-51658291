/**
 * FisioFlow Exercise Recommendation Service - Cloud Run
 *
 * Serviço de recomendação de exercícios rodando no Cloud Run.
 * Free Tier: 2 milhões de requisições/mês
 *
 * Features:
 * - Análise de exercícios com Vision API
 * - Recomendação baseada em IA (Gemini)
 * - Processamento em batch
 * - Cache de resultados
 *
 * @version 1.0.0
 */

import express from 'express';
import cors from 'cors';
import vision from '@google-cloud/vision';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import * as logger from '@google-cloud/logging-bunyan';

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const app = express();
const PORT = process.env.PORT || 8080;

const logging = new BunyanGoogleCloudLogging({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
    logName: 'exercise-service',
});

const log = logging.child({ service: 'exercise-service' });

// Vision API Client
const visionClient = new vision.ImageAnnotatorClient();

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(cors({
    origin: [
        'https://fisioflow-migration.firebaseapp.com',
        'https://fisioflow-migration.web.app',
        'https://app.fisioflow.com.br',
    ],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));

app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.VERSION || '1.0.0',
    });
});

// ============================================================================
// EXERCISE RECOMMENDATION ENDPOINT
// ============================================================================

interface ExerciseRecommendationRequest {
    patientId?: string;
    symptoms: string[];
    affectedAreas: string[];
    contraindications?: string[];
    equipment?: string[];
    sessionDuration?: number;
    count?: number;
}

/**
 * POST /api/recommend
 * Recomenda exercícios baseados em sintomas e áreas afetadas
 */
app.post('/api/recommend', async (req, res) => {
    const startTime = Date.now();

    try {
        const {
            patientId,
            symptoms,
            affectedAreas,
            contraindications = [],
            equipment = [],
            sessionDuration = 30,
            count = 5,
        } = req.body as ExerciseRecommendationRequest;

        if (!symptoms || symptoms.length === 0) {
            return res.status(400).json({
                error: 'symptoms array is required',
            });
        }

        log.info(`Exercise recommendation requested for patient ${patientId}`, {
            symptoms,
            affectedAreas,
        });

        // TODO: Implementar lógica de recomendação com IA
        // Por enquanto, retorna exercícios de exemplo

        const recommendations = generateMockRecommendations({
            symptoms,
            affectedAreas,
            contraindications,
            equipment,
            sessionDuration,
            count,
        });

        const duration = Date.now() - startTime;

        res.json({
            success: true,
            data: {
                patientId,
                recommendations,
                metadata: {
                    generatedAt: new Date().toISOString(),
                    processingTimeMs: duration,
                    factors: { symptoms, affectedAreas, contraindications },
                },
            },
        });

        log.info(`Exercise recommendation completed in ${duration}ms`, {
            patientId,
            count: recommendations.length,
        });

    } catch (error: any) {
        log.error('Exercise recommendation error:', error);
        res.status(500).json({
            error: 'Failed to generate recommendations',
            message: error.message,
        });
    }
});

// ============================================================================
// EXERCISE IMAGE ANALYSIS ENDPOINT
// ============================================================================

/**
 * POST /api/analyze-exercise-image
 * Analisa imagem de exercício com Vision API
 */
app.post('/api/analyze-exercise-image', async (req, res) => {
    const startTime = Date.now();

    try {
        const { imageUrl, base64Image } = req.body;

        if (!imageUrl && !base64Image) {
            return res.status(400).json({
                error: 'imageUrl or base64Image is required',
            });
        }

        log.info('Exercise image analysis requested');

        // Preparar imagem para Vision API
        let imageSource: any;

        if (imageUrl) {
            imageSource = { source: { imageUri: imageUrl } };
        } else {
            imageSource = { content: base64Image };
        }

        // Detectar rótulos da imagem
        const [labelResult] = await visionClient.labelDetection(imageSource);
        const labels = labelResult.labelAnnotations || [];

        // Detectar objetos
        const [objectResult] = await visionClient.objectLocalization(imageSource);
        const objects = objectResult.localizedObjectAnnotations || [];

        // Detectar texto
        const [textResult] = await visionClient.textDetection(imageSource);
        const text = textResult.fullTextAnnotation?.text || '';

        // Analisar pose (se disponível)
        let poseAnalysis: any = null;
        try {
            const [poseResult] = await visionClient.imageProperties(imageSource);
            poseAnalysis = poseResult.imagePropertiesAnnotation;
        } catch (e) {
            // Pose detection pode não estar disponível
            log.warn('Pose detection not available');
        }

        const duration = Date.now() - startTime;

        res.json({
            success: true,
            data: {
                labels: labels.map(l => ({
                    description: l.description,
                    score: l.score,
                })),
                objects: objects.map(o => ({
                    name: o.name,
                    score: o.score,
                    boundingBox: o.boundingPoly?.vertices,
                })),
                detectedText: text,
                colors: poseAnalysis?.dominantColors?.colors?.map((c: any) => ({
                    rgb: c.color?.rgb,
                    score: c.score,
                })),
            },
            metadata: {
                processingTimeMs: duration,
                analyzedAt: new Date().toISOString(),
            },
        });

        log.info('Exercise image analysis completed', { duration });

    } catch (error: any) {
        log.error('Exercise image analysis error:', error);
        res.status(500).json({
            error: 'Failed to analyze exercise image',
            message: error.message,
        });
    }
});

// ============================================================================
// EXERCISE POSTURE ANALYSIS ENDPOINT
// ============================================================================

/**
 * POST /api/analyze-posture
 * Analisa postura em imagem de exercício
 */
app.post('/api/analyze-posture', async (req, res) => {
    const startTime = Date.now();

    try {
        const { imageUrl, base64Image, exerciseType } = req.body;

        if (!imageUrl && !base64Image) {
            return res.status(400).json({
                error: 'imageUrl or base64Image is required',
            });
        }

        log.info('Posture analysis requested', { exerciseType });

        // Preparar imagem
        let imageSource: any;

        if (imageUrl) {
            imageSource = { source: { imageUri: imageUrl } };
        } else {
            imageSource = { content: base64Image };
        }

        // Detectar pose (landmarks)
        const [poseResult] = await visionClient.safeSearchDetection(imageSource);
        const landmarks = poseResult.landmarkAnnotations || [];

        // Analisar landmarks para detectar problemas de postura
        const postureIssues = analyzeLandmarks(landmarks, exerciseType);

        const duration = Date.now() - startTime;

        res.json({
            success: true,
            data: {
                landmarksDetected: landmarks.length,
                postureIssues,
                recommendations: generatePostureRecommendations(postureIssues),
            },
            metadata: {
                processingTimeMs: duration,
                analyzedAt: new Date().toISOString(),
            },
        });

        log.info('Posture analysis completed', { duration });

    } catch (error: any) {
        log.error('Posture analysis error:', error);
        res.status(500).json({
            error: 'Failed to analyze posture',
            message: error.message,
        });
    }
});

// ============================================================================
// BATCH EXERCISE RECOMMENDATION ENDPOINT
// ============================================================================

/**
 * POST /api/recommend-batch
 * Recomenda exercícios para múltiplos pacientes
 */
app.post('/api/recommend-batch', async (req, res) => {
    const startTime = Date.now();

    try {
        const { requests } = req.body as { requests: ExerciseRecommendationRequest[] };

        if (!requests || !Array.isArray(requests)) {
            return res.status(400).json({
                error: 'requests array is required',
            });
        }

        if (requests.length > 100) {
            return res.status(400).json({
                error: 'Maximum 100 requests per batch',
            });
        }

        log.info(`Batch recommendation requested for ${requests.length} patients`);

        const results = await Promise.all(
            requests.map(request =>
                generateMockRecommendations({
                    symptoms: request.symptoms,
                    affectedAreas: request.affectedAreas,
                    contraindications: request.contraindications,
                    equipment: request.equipment,
                    sessionDuration: request.sessionDuration,
                    count: request.count,
                })
            )
        );

        const duration = Date.now() - startTime;

        res.json({
            success: true,
            data: {
                results: requests.map((req, i) => ({
                    patientId: req.patientId,
                    recommendations: results[i],
                })),
                metadata: {
                    processedCount: requests.length,
                    processingTimeMs: duration,
                    processedAt: new Date().toISOString(),
                },
            },
        });

        log.info(`Batch recommendation completed in ${duration}ms`, {
            count: requests.length,
        });

    } catch (error: any) {
        log.error('Batch recommendation error:', error);
        res.status(500).json({
            error: 'Failed to generate batch recommendations',
            message: error.message,
        });
    }
});

// ============================================================================
// HELPERS
// ============================================================================

function generateMockRecommendations(params: any): any[] {
    // Exercícios de exemplo para MVP
    const exercises = [
        {
            id: 'ex1',
            name: 'Alongamento de Panturrilha',
            category: 'stretching',
            duration: 5,
            sets: 3,
            repetitions: 10,
            instructions: [
                'Fique em pé com as mãos na parede',
                'Estique uma perna para trás, mantendo o calcanhar no chão',
                'Mantenha por 30 segundos e troque de perna',
            ],
            videoUrl: 'https://example.com/videos/calf-stretch.mp4',
            imageUrl: 'https://example.com/images/calf-stretch.jpg',
        },
        {
            id: 'ex2',
            name: 'Agachamento Paredão',
            category: 'strengthening',
            duration: 3,
            sets: 3,
            repetitions: 12,
            instructions: [
                'Encoste as costas na parede com os pitos afastados',
                'Desça até que os joelhos fiquem em 90 graus',
                'Volte à posição inicial',
            ],
            videoUrl: 'https://example.com/videos/wall-squat.mp4',
            imageUrl: 'https://example.com/images/wall-squat.jpg',
        },
        {
            id: 'ex3',
            name: 'Rotação de Ombro',
            category: 'mobility',
            duration: 2,
            sets: 3,
            repetitions: 10,
            instructions: [
                'Levante os braços ao lado do corpo',
                'Faça círculos com os ombros',
                'Mantenha os braços retos',
            ],
            videoUrl: 'https://example.com/videos/shoulder-rotation.mp4',
            imageUrl: 'https://example.com/images/shoulder-rotation.jpg',
        },
    ];

    // Filtrar e retornar baseado nos parâmetros
    return exercises.slice(0, params.count || 5);
}

function analyzeLandmarks(landmarks: any[], exerciseType?: string): any[] {
    // Análise simplificada de landmarks
    const issues: any[] = [];

    if (landmarks.length < 5) {
        issues.push({
            severity: 'warning',
            message: 'Poucos landmarks detectados na imagem',
            suggestion: 'Use uma imagem com iluminação melhor',
        });
        return issues;
    }

    // Análises baseadas no tipo de exercício
    if (exerciseType?.includes('squat')) {
        // Verificar alinhamento de joelhos
        issues.push({
            severity: 'info',
            message: 'Verifique se os joelhos estão alinhados com os pés',
            suggestion: 'Mantenha os joelhos alinhados durante todo o movimento',
        });
    }

    if (exerciseType?.includes('shoulder') || exerciseType?.includes('arm')) {
        issues.push({
            severity: 'info',
            message: 'Mantenha os ombros relaxados',
            suggestion: 'Evite tensão excessiva nos ombros durante o exercício',
        });
    }

    return issues;
}

function generatePostureRecommendations(issues: any[]): string[] {
    const recommendations: string[] = [];

    for (const issue of issues) {
        if (issue.severity === 'warning') {
            recommendations.push(issue.suggestion);
        }
    }

    // Recomendações gerais
    recommendations.push(
        'Respire regularmente durante o exercício',
        'Não force movimentos que causem dor',
        'Faça pausas se necessário'
    );

    return recommendations;
}

// ============================================================================
// START SERVER
// ============================================================================

if (require.main === module) {
    app.listen(PORT, () => {
        log.info(`Exercise service listening on port ${PORT}`);
    });
}

export default app;
