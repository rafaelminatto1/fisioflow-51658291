/**
 * Hook: useExcelExport
 * Wrapper para exportação de dados para Excel usando skills integration
 */

import { useState, useCallback } from 'react';
import {
  exportPatientsToExcel,
  exportFinancialReport,
  generatePatientImportTemplate,
  downloadExcelFile,
  importPatientsFromExcel,
} from '../lib/skills/fase2-documentos/xlsx-integration';

interface UseExcelExportOptions {
  onError?: (error: Error) => void;
  onSuccess?: () => void;
}

export function useExcelExport(options?: UseExcelExportOptions) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const exportPatients = useCallback(
    async (
      patients: Array<{
        id: string;
        name: string;
        cpf?: string;
        birthDate?: Date;
        phone?: string;
        email?: string;
        status: 'active' | 'inactive';
        firstAppointment?: Date;
        lastAppointment?: Date;
        totalSessions?: number;
        city?: string;
      }>,
      clinicName: string,
      filename?: string
    ) => {
      setIsExporting(true);
      setError(null);

      try {
        const buffer = await exportPatientsToExcel(patients, clinicName);
        downloadExcelFile(
          buffer,
          filename || `pacientes-${new Date().toISOString().split('T')[0]}.xlsx`
        );

        if (options?.onSuccess) {
          options.onSuccess();
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Erro ao exportar pacientes');
        setError(error);
        if (options?.onError) {
          options.onError(error);
        }
      } finally {
        setIsExporting(false);
      }
    },
    [options]
  );

  const exportFinancials = useCallback(
    async (
      data: {
        period: { start: Date; end: Date };
        appointments: Array<{
          date: Date;
          patient: string;
          professional: string;
          type: string;
          value: number;
          status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
          paymentMethod?: string;
        }>;
        expenses?: Array<{
          date: Date;
          description: string;
          category: string;
          value: number;
        }>;
      },
      clinicName: string,
      filename?: string
    ) => {
      setIsExporting(true);
      setError(null);

      try {
        const buffer = await exportFinancialReport(data, clinicName);
        downloadExcelFile(
          buffer,
          filename || `relatorio-financeiro-${new Date().toISOString().split('T')[0]}.xlsx`
        );

        if (options?.onSuccess) {
          options.onSuccess();
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Erro ao exportar relatório financeiro');
        setError(error);
        if (options?.onError) {
          options.onError(error);
        }
      } finally {
        setIsExporting(false);
      }
    },
    [options]
  );

  const exportAttendanceStats = useCallback(
    async (
      data: {
        period: { start: Date; end: Date };
        byProfessional: Array<{
          name: string;
          totalSessions: number;
          completedSessions: number;
          noShows: number;
          revenue: number;
        }>;
      },
      clinicName: string,
      filename?: string
    ) => {
      setIsExporting(true);
      setError(null);

      try {
        const buffer = await exportAttendanceStats(data, clinicName);
        downloadExcelFile(
          buffer,
          filename || `estatisticas-atendimento-${new Date().toISOString().split('T')[0]}.xlsx`
        );

        if (options?.onSuccess) {
          options.onSuccess();
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Erro ao exportar estatísticas');
        setError(error);
        if (options?.onError) {
          options.onError(error);
        }
      } finally {
        setIsExporting(false);
      }
    },
    [options]
  );

  const downloadTemplate = useCallback(async () => {
    setIsExporting(true);
    setError(null);

    try {
      const buffer = await generatePatientImportTemplate();
      downloadExcelFile(buffer, 'template-importacao-pacientes.xlsx');

      if (options?.onSuccess) {
        options.onSuccess();
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao baixar template');
      setError(error);
      if (options?.onError) {
        options.onError(error);
      }
    } finally {
      setIsExporting(false);
    }
  }, [options]);

  const importPatients = useCallback(async (file: File): Promise<any[]> => {
    setIsExporting(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const patients = await importPatientsFromExcel(Buffer.from(arrayBuffer));

      if (options?.onSuccess) {
        options.onSuccess();
      }

      return patients;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao importar pacientes');
      setError(error);
      if (options?.onError) {
        options.onError(error);
      }
      return [];
    } finally {
      setIsExporting(false);
    }
  }, [options]);

  return {
    isExporting,
    error,
    exportPatients,
    exportFinancials,
    exportAttendanceStats,
    downloadTemplate,
    importPatients,
  };
}
