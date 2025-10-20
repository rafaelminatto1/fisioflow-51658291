import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function usePurchaseVoucher() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (voucherId: string) => {
      const { data, error } = await supabase.functions.invoke('create-voucher-checkout', {
        body: { voucherId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.url) {
        // Abrir checkout em nova aba
        window.open(data.url, '_blank');
        
        toast({
          title: 'Redirecionando para pagamento',
          description: 'Aguarde enquanto você é redirecionado para o Stripe.',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao processar pagamento',
        description: error.message,
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
      const { data, error } = await supabase.functions.invoke('verify-voucher-payment', {
        body: { sessionId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-vouchers'] });
      
      if (data.success) {
        toast({
          title: 'Voucher ativado!',
          description: 'Seu voucher foi ativado com sucesso.',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao verificar pagamento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
