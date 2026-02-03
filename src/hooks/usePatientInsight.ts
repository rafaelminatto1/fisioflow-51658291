import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { chatWithClinicalAssistant } from '@/services/ai/firebaseAIService';

interface PatientInsightResponse {
    insight: string;
}

export function usePatientInsight() {
    return useMutation({
        mutationFn: async (patientData: Record<string, unknown>) => {
            // Dados sensíveis removidos: apenas ID e informações não-identificáveis são enviados (LGPD)
            const sanitizedData = {
                id: patientData.patientId ?? patientData.id,
                age: patientData.age,
                condition: patientData.condition,
            };
            const prompt = `Analise os dados do paciente e forneça insights clínicos relevantes para fisioterapia: ${JSON.stringify(sanitizedData)}`;
            const response = await chatWithClinicalAssistant({
                message: prompt,
                context: { patientId: String(patientData.patientId ?? patientData.id ?? ''), sessionCount: 0 },
            });
            return { insight: response } as PatientInsightResponse;
        },
        onError: (error) => {
            logger.error('AI Insight Error', error, 'usePatientInsight');
            toast.error('Erro ao gerar análise inteligente. Tente novamente.');
        },
    });
}
