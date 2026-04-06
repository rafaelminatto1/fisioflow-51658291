import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPatientStandardizedTests,
  createStandardizedTestResult,
  type ApiStandardizedTestResult,
} from '@/lib/api';

export type { ApiStandardizedTestResult };

export const PROM_SCALES = [
  {
    id: 'VAS',
    name: 'Escala Visual Analógica (EVA)',
    shortName: 'EVA',
    description: 'Avalia a intensidade da dor de 0 a 10',
    maxScore: 10,
    unit: 'pontos',
    interpretation: (score: number) => {
      if (score === 0) return 'Sem dor';
      if (score <= 3) return 'Dor leve';
      if (score <= 6) return 'Dor moderada';
      return 'Dor intensa';
    },
  },
  {
    id: 'PSFS',
    name: 'Escala Funcional Específica do Paciente',
    shortName: 'PSFS',
    description: 'Avalia dificuldade em atividades funcionais específicas',
    maxScore: 10,
    unit: 'pontos',
    interpretation: (score: number) => {
      if (score >= 7) return 'Boa funcionalidade';
      if (score >= 4) return 'Funcionalidade moderada';
      return 'Funcionalidade limitada';
    },
  },
  {
    id: 'DASH',
    name: 'Disabilities of Arm, Shoulder and Hand',
    shortName: 'DASH',
    description: 'Avalia incapacidade de membros superiores',
    maxScore: 100,
    unit: '%',
    interpretation: (score: number) => {
      if (score <= 20) return 'Incapacidade leve';
      if (score <= 50) return 'Incapacidade moderada';
      return 'Incapacidade grave';
    },
  },
  {
    id: 'OSWESTRY',
    name: 'Índice de Incapacidade de Oswestry',
    shortName: 'Oswestry',
    description: 'Avalia incapacidade funcional por lombalgia',
    maxScore: 100,
    unit: '%',
    interpretation: (score: number) => {
      if (score <= 20) return 'Incapacidade mínima';
      if (score <= 40) return 'Incapacidade moderada';
      if (score <= 60) return 'Incapacidade intensa';
      if (score <= 80) return 'Incapacidade severa';
      return 'Incapacidade total';
    },
  },
  {
    id: 'NDI',
    name: 'Índice de Incapacidade do Pescoço',
    shortName: 'NDI',
    description: 'Avalia incapacidade cervical',
    maxScore: 100,
    unit: '%',
    interpretation: (score: number) => {
      if (score <= 8) return 'Sem incapacidade';
      if (score <= 28) return 'Incapacidade leve';
      if (score <= 48) return 'Incapacidade moderada';
      if (score <= 64) return 'Incapacidade grave';
      return 'Incapacidade completa';
    },
  },
  {
    id: 'LEFS',
    name: 'Escala Funcional de Membros Inferiores',
    shortName: 'LEFS',
    description: 'Avalia funcionalidade de membros inferiores',
    maxScore: 80,
    unit: 'pontos',
    interpretation: (score: number) => {
      if (score >= 60) return 'Boa funcionalidade';
      if (score >= 40) return 'Funcionalidade moderada';
      return 'Funcionalidade limitada';
    },
  },
  {
    id: 'BERG',
    name: 'Escala de Equilíbrio de Berg',
    shortName: 'Berg',
    description: 'Avalia equilíbrio e risco de queda',
    maxScore: 56,
    unit: 'pontos',
    interpretation: (score: number) => {
      if (score >= 45) return 'Baixo risco de queda';
      if (score >= 21) return 'Risco moderado de queda';
      return 'Alto risco de queda';
    },
  },
] as const;

export type PromScaleId = (typeof PROM_SCALES)[number]['id'];

export function getScaleInfo(scaleId: string) {
  return PROM_SCALES.find((s) => s.id === scaleId) ?? null;
}

export function usePROMs(patientId: string, scale?: string) {
  return useQuery({
    queryKey: ['proms', patientId, scale],
    queryFn: () => getPatientStandardizedTests(patientId, { scale }),
    enabled: !!patientId,
  });
}

export function useCreatePROM() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<ApiStandardizedTestResult, 'id' | 'created_at' | 'updated_at'>) =>
      createStandardizedTestResult(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['proms', variables.patient_id] });
    },
  });
}
