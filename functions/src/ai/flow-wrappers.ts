/**
 * Genkit Flow Wrappers
 * 
 * Compatibility layer between existing Cloud Functions and new Genkit flows
 */

import type { CallableRequest } from 'firebase-functions/v2/https';
import {
    exerciseSuggestionFlow,
    type ExerciseSuggestionInput,
    redFlagCheckFlow,
    comprehensiveClinicalFlow,
    type ClinicalAnalysisInput,
    soapGenerationFlow,
    type SoapGenerationInput,
    analyzePatientProgressFlow,
} from './flows';

import { onCall } from 'firebase-functions/v2/https';
import { logger } from '../lib/logger';

export const analyzeProgress = onCall(
    { cpu: 2, memory: '1GiB' },
    async (request: CallableRequest) => {
        if (!request.auth) {
            throw new Error('Unauthorized');
        }

        try {
            const result = await analyzePatientProgressFlow(request.data);
            return result;
        } catch (e: any) {
            logger.error('Genkit flow failed', e);
            throw new Error('Analysis failed');
        }
    }
);

export async function exerciseSuggestionHandler(request: CallableRequest) {
    const input: ExerciseSuggestionInput = {
        patientId: request.data.patientId,
        goals: request.data.goals || [],
        availableEquipment: request.data.availableEquipment || [],
        treatmentPhase: request.data.treatmentPhase || 'initial',
        painMap: request.data.painMap || {},
        sessionCount: request.data.sessionCount || 0,
    };

    try {
        const result = await exerciseSuggestionFlow(input);

        return {
            success: true,
            data: result,
        };
    } catch (error: any) {
        console.error('[exerciseSuggestionHandler] Error:', error);
        return {
            success: false,
            error: error.message || 'Failed to generate exercise suggestions',
        };
    }
}

export async function clinicalAnalysisHandler(request: CallableRequest) {
    const input: ClinicalAnalysisInput = {
        patientId: request.data.patientId,
        currentSOAP: request.data.currentSOAP || {},
        useGrounding: request.data.useGrounding || false,
        treatmentDurationWeeks: request.data.treatmentDurationWeeks,
        redFlagCheckOnly: request.data.redFlagCheckOnly || false,
    };

    try {
        let result;

        if (input.redFlagCheckOnly) {
            const redFlagResult = await redFlagCheckFlow(input);
            result = {
                redFlags: redFlagResult.redFlags,
                hasRedFlags: redFlagResult.hasRedFlags,
            };
        } else {
            result = await comprehensiveClinicalFlow(input);
        }

        return {
            success: true,
            data: result,
        };
    } catch (error: any) {
        console.error('[clinicalAnalysisHandler] Error:', error);
        return {
            success: false,
            error: error.message || 'Failed to generate clinical analysis',
        };
    }
}

export async function soapGenerationHandler(request: CallableRequest) {
    const input: SoapGenerationInput = {
        patientContext: {
            patientName: request.data.patientContext?.patientName || 'Paciente',
            condition: request.data.patientContext?.condition || 'Não especificado',
            sessionNumber: request.data.patientContext?.sessionNumber || 1,
        },
        subjective: request.data.subjective,
        objective: request.data.objective,
        assistantNeeded: request.data.assistantNeeded || 'both',
    };

    try {
        const result = await soapGenerationFlow(input);

        return {
            success: true,
            soapNote: result,
            timestamp: new Date().toISOString(),
        };
    } catch (error: any) {
        console.error('[soapGenerationHandler] Error:', error);
        return {
            success: false,
            error: error.message || 'Failed to generate SOAP note',
            timestamp: new Date().toISOString(),
        };
    }
}
