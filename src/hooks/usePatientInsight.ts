import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fisioLogger as logger } from '@/lib/errors/logger';

interface PatientInsightResponse {
    insight: string;
}

export function usePatientInsight() {
    return useMutation({
        mutationFn: async (patientData: Record<string, unknown>) => {
            const response = await fetch('/api/ai/patient-insight', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ patientData }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to generate insight');
            }

            return (await response.json()) as PatientInsightResponse;
        },
        onError: (error) => {
            logger.error('AI Insight Error', error, 'usePatientInsight');
            toast.error('Erro ao gerar análise inteligente. Tente novamente.');
        },
    });
}
