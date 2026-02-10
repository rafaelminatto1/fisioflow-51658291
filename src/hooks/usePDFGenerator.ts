/**
 * Hook: usePDFGenerator
 * Wrapper para geração de documentos PDF usando skills integration
 */

import { useState, useCallback } from 'react';
import { PDFGeneratorFactory } from '../lib/skills/fase2-documentos';
import type {
  PatientData,
  ProfessionalData,
  ClinicData
} from '../lib/skills/fase2-documentos/pdf-generator';

interface UsePDFGeneratorOptions {
  onGenerate?: (blob: Blob) => void;
  onError?: (error: Error) => void;
}

export function usePDFGenerator(options?: UsePDFGeneratorOptions) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generateAtestado = useCallback(async (
    patient: PatientData,
    professional: ProfessionalData,
    clinic: ClinicData,
    data: {
      days: number;
      reason: string;
      cid?: string;
      city: string;
    }
  ): Promise<Blob | null> => {
    setIsGenerating(true);
    setError(null);

    try {
      const generator = PDFGeneratorFactory.createAtestado();
      const blob = generator.generate(patient, professional, clinic, data) as Blob;

      if (options?.onGenerate) {
        options.onGenerate(blob);
      }

      return blob;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao gerar atestado');
      setError(error);
      if (options?.onError) {
        options.onError(error);
      }
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [options]);

  const generateDeclaracao = useCallback(async (
    patient: PatientData,
    professional: ProfessionalData,
    clinic: ClinicData,
    data: {
      date: Date;
      startTime: string;
      endTime: string;
      type: string;
      city: string;
    }
  ): Promise<Blob | null> => {
    setIsGenerating(true);
    setError(null);

    try {
      const generator = PDFGeneratorFactory.createDeclaracao();
      const blob = generator.generate(patient, professional, clinic, data) as Blob;

      if (options?.onGenerate) {
        options.onGenerate(blob);
      }

      return blob;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao gerar declaração');
      setError(error);
      if (options?.onError) {
        options.onError(error);
      }
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [options]);

  const generateReceituario = useCallback(async (
    patient: PatientData,
    professional: ProfessionalData,
    clinic: ClinicData,
    prescriptions: Array<{
      type: 'exercicio' | 'medicamento' | 'orientacao';
      description: string;
      frequency?: string;
      duration?: string;
    }>,
    city: string
  ): Promise<Blob | null> => {
    setIsGenerating(true);
    setError(null);

    try {
      const generator = PDFGeneratorFactory.createReceituario();
      const blob = generator.generate(patient, professional, clinic, { prescriptions, city }) as Blob;

      if (options?.onGenerate) {
        options.onGenerate(blob);
      }

      return blob;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao gerar receituário');
      setError(error);
      if (options?.onError) {
        options.onError(error);
      }
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [options]);

  const generateEvolucao = useCallback(async (
    patient: PatientData,
    professional: ProfessionalData,
    clinic: ClinicData,
    evaluations: Array<{
      date: Date;
      subjective: string;
      objective: string;
      assessment: string;
      plan: string;
    }>,
    summary?: string,
    city: string
  ): Promise<Blob | null> => {
    setIsGenerating(true);
    setError(null);

    try {
      const generator = PDFGeneratorFactory.createEvolucao();
      const blob = generator.generate(patient, professional, clinic, { evaluations, summary, city }) as Blob;

      if (options?.onGenerate) {
        options.onGenerate(blob);
      }

      return blob;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao gerar evolução');
      setError(error);
      if (options?.onError) {
        options.onError(error);
      }
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [options]);

  const generatePlanoTratamento = useCallback(async (
    patient: PatientData,
    professional: ProfessionalData,
    clinic: ClinicData,
    data: {
      diagnosis: string;
      objectives: string[];
      procedures: Array<{
        name: string;
        sessions: number;
        frequency: string;
      }>;
      estimatedDuration: string;
      city: string;
    }
  ): Promise<Blob | null> => {
    setIsGenerating(true);
    setError(null);

    try {
      const generator = PDFGeneratorFactory.createPlanoTratamento();
      const blob = generator.generate(patient, professional, clinic, data) as Blob;

      if (options?.onGenerate) {
        options.onGenerate(blob);
      }

      return blob;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao gerar plano de tratamento');
      setError(error);
      if (options?.onError) {
        options.onError(error);
      }
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [options]);

  const downloadPDF = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  return {
    isGenerating,
    error,
    generateAtestado,
    generateDeclaracao,
    generateReceituario,
    generateEvolucao,
    generatePlanoTratamento,
    downloadPDF,
  };
}
