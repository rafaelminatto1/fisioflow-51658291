/**
 * usePurchaseVoucher - Migrated to Firebase
 *
 * Migration from Supabase to Firebase:
 * - supabase.functions.invoke() → Firebase Functions (httpsCallable)
 * - Voucher payment processing via Firebase Functions
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();

export function usePurchaseVoucher() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (voucherId: string) => {
      const createCheckout = httpsCallable(functions, 'create-voucher-checkout');

      try {
        const result = await createCheckout({ voucherId });
        const data = result.data as any;

        if (data.error) {
          throw new Error(data.error);
        }

        return data;
      } catch (error: any) {
        throw error;
      }
    },
    onSuccess: (data: any) => {
      if (data.url) {
        // Abrir checkout em nova aba
        window.open(data.url, '_blank');

        toast({
          title: 'Redirecionando para pagamento',
          description: 'Aguarde enquanto você é redirecionado para o Stripe.',
        });
      }
    },
    onError: (error: Error | unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao processar pagamento';
      toast({
        title: 'Erro ao processar pagamento',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });
}

export function useVerifyVoucherPayment() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const verifyPayment = httpsCallable(functions, 'verify-voucher-payment');

      try {
        const result = await verifyPayment({ sessionId });
        const data = result.data as any;

        if (data.error) {
          throw new Error(data.error);
        }

        return data;
      } catch (error: any) {
        throw error;
      }
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['user-vouchers'] });

      if (data.success) {
        toast({
          title: 'Voucher ativado!',
          description: 'Seu voucher foi ativado com sucesso.',
        });
      }
    },
    onError: (error: Error | unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao verificar pagamento';
      toast({
        title: 'Erro ao verificar pagamento',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });
}
