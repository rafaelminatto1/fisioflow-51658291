/**
 * Hook: useFinancialExport
 * Wrapper para exportação de relatórios financeiros (PDF e Excel)
 */

import { useState, useCallback } from 'react';
import {
  saveFinancialReportPDF,
  type FinancialReportData,
} from '../lib/skills/fase2-documentos/financial-reports';
import {
  exportFinancialReport as exportFinancialExcel,
  downloadExcelFile,
} from '../lib/skills/fase2-documentos/xlsx-integration';
import { useToast } from './use-toast';

interface UseFinancialExportOptions {
  clinicName?: string;
  clinicAddress?: string;
  onError?: (error: Error) => void;
  onSuccess?: () => void;
}

export function useFinancialExport(options?: UseFinancialExportOptions) {
  const { toast } = useToast();
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const exportToPDF = useCallback(
    async (data: FinancialReportData, filename?: string) => {
      setIsExportingPDF(true);
      try {
        saveFinancialReportPDF(
          {
            ...data,
            clinicName: options?.clinicName || data.clinicName,
            clinicAddress: options?.clinicAddress || data.clinicAddress,
          },
          filename || `relatorio-financeiro-${new Date().toISOString().split('T')[0]}.pdf`
        );

        toast({
          title: 'Relatório PDF gerado',
          description: 'O arquivo foi baixado com sucesso.',
        });

        options?.onSuccess?.();
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Erro ao gerar PDF');
        toast({
          title: 'Erro na exportação',
          description: error.message,
          variant: 'destructive',
        });
        options?.onError?.(error);
      } finally {
        setIsExportingPDF(false);
      }
    },
    [options, toast]
  );

  const exportToExcel = useCallback(
    async (data: {
      period: { start: Date; end: Date };
      appointments: Array<{
        date: Date;
        patient: string;
        professional: string;
        type: string;
        value: number;
        status: string;
        paymentMethod?: string;
      }>;
      clinicName?: string;
    },
    filename?: string
  ) => {
    setIsExportingExcel(true);
    try {
      const buffer = await exportFinancialExcel(
        data,
        options?.clinicName || data.clinName || 'Clínica'
      );
      downloadExcelFile(
        buffer,
        filename || `relatorio-financeiro-${new Date().toISOString().split('T')[0]}.xlsx`
      );

      toast({
        title: 'Relatório Excel gerado',
        description: 'O arquivo foi baixado com sucesso.',
      });

      options?.onSuccess?.();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao gerar Excel');
      toast({
        title: 'Erro na exportação',
        description: error.message,
        variant: 'destructive',
      });
      options?.onError?.(error);
    } finally {
      setIsExportingExcel(false);
    }
  },
    [options, toast]
  );

  return {
    isExportingPDF,
    isExportingExcel,
    isExporting: isExportingPDF || isExportingExcel,
    exportToPDF,
    exportToExcel,
  };
}

export default useFinancialExport;
