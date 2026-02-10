/**
 * Hook: useReceiptGenerator
 * Wrapper para geração de recibos em PDF
 */

import { useState, useCallback } from 'react';
import {
  ReceiptGenerator,
  saveReceiptPDF,
  type ReceiptData,
} from '../lib/skills/fase2-documentos/receipt-generator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface UseReceiptGeneratorOptions {
  onError?: (error: Error) => void;
  onSuccess?: () => void;
}

export function useReceiptGenerator(options?: UseReceiptGeneratorOptions) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generateReceipt = useCallback(
    async (
      paymentData: {
        amount: number;
        payerName: string;
        payerCPF?: string;
        description: string;
        paymentMethod: ReceiptData['paymentMethod'];
      },
      filename?: string
    ) => {
      setIsGenerating(true);
      setError(null);

      try {
        // Receber os dados do usuário (clínica)
        const response = await fetch('/api/receipt/number', {
          method: 'POST',
        });
        const { receiptNumber } = await response.json();

        const receiptData: ReceiptData = {
          clinicName: 'FisioFlow Clínica',
          clinicAddress: 'Endereço da Clínica',
          receiptNumber: receiptNumber || format(new Date(), 'yyyyMMddHHmm'),
          date: new Date(),
          amount: paymentData.amount,
          payerName: paymentData.payerName,
          payerCPF: paymentData.payerCPF,
          paymentMethod: paymentData.paymentMethod,
          description: paymentData.description,
          city: 'São Paulo',
          state: 'SP',
        };

        saveReceiptPDF(receiptData, filename);

        if (options?.onSuccess) {
          options.onSuccess();
        }

        return receiptData;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Erro ao gerar recibo');
        setError(error);
        if (options?.onError) {
          options.onError(error);
        }
        throw error;
      } finally {
        setIsGenerating(false);
      }
    },
    [options]
  );

  const generateReceiptFromTransaction = useCallback(
    async (
      transaction: {
        id: string;
        valor: number | string;
        patient_name?: string;
        patient_cpf?: string;
        descricao?: string;
        payment_method?: string;
        created_at?: string | Date;
      },
      clinicData?: {
        name?: string;
        address?: string;
        cnpj?: string;
        phone?: string;
        city?: string;
        state?: string;
      },
      filename?: string
    ) => {
      setIsGenerating(true);
      setError(null);

      try {
        const amount = typeof transaction.valor === 'string' ? parseFloat(transaction.valor) : transaction.valor;

        const receiptData: ReceiptData = {
          clinicName: clinicData?.name || 'FisioFlow Clínica',
          clinicAddress: clinicData?.address,
          clinicCNPJ: clinicData?.cnpj,
          clinicPhone: clinicData?.phone,
          receiptNumber: transaction.id || format(new Date(), 'yyyyMMddHHmm'),
          date: transaction.created_at ? new Date(transaction.created_at) : new Date(),
          amount,
          payerName: transaction.patient_name || 'Paciente',
          payerCPF: transaction.patient_cpf,
          description: transaction.descricao || 'Pagamento de sessão de fisioterapia',
          paymentMethod: (transaction.payment_method as ReceiptData['paymentMethod']) || 'dinheiro',
          city: clinicData?.city || 'São Paulo',
          state: clinicData?.state || 'SP',
        };

        saveReceiptPDF(receiptData, filename);

        if (options?.onSuccess) {
          options.onSuccess();
        }

        toast({
          title: 'Recibo gerado',
          description: 'O recibo foi baixado com sucesso.',
        });

        return receiptData;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Erro ao gerar recibo');
        setError(error);
        if (options?.onError) {
          options.onError(error);
        }

        toast({
          title: 'Erro ao gerar recibo',
          description: error.message,
          variant: 'destructive',
        });

        throw error;
      } finally {
        setIsGenerating(false);
      }
    },
    [options, toast]
  );

  return {
    isGenerating,
    error,
    generateReceipt,
    generateReceiptFromTransaction,
  };
}

export default useReceiptGenerator;
