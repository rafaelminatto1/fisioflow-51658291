import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Voucher {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: 'pacote' | 'mensal' | 'trimestral' | 'semestral';
  sessoes: number | null;
  validade_dias: number;
  preco: number;
  ativo: boolean;
  stripe_price_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserVoucher {
  id: string;
  user_id: string;
  voucher_id: string;
  sessoes_restantes: number;
  sessoes_totais: number;
  data_compra: string;
  data_expiracao: string;
  ativo: boolean;
  valor_pago: number;
  voucher?: Voucher;
}

export function useVouchers() {
  return useQuery({
    queryKey: ['vouchers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vouchers')
        .select('*')
        .eq('ativo', true)
        .order('preco');

      if (error) throw error;
      return data as Voucher[];
    },
  });
}

export function useUserVouchers() {
  return useQuery({
    queryKey: ['user-vouchers'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('user_vouchers')
        .select(`
          *,
          voucher:vouchers(*)
        `)
        .eq('user_id', user.id)
        .order('data_compra', { ascending: false });

      if (error) throw error;
      return data as UserVoucher[];
    },
  });
}

export function useCreateVoucher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (voucher: Omit<Voucher, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('vouchers')
        .insert(voucher)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vouchers'] });
      toast.success('Voucher criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar voucher: ' + error.message);
    },
  });
}

export function useUpdateVoucher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Voucher> & { id: string }) => {
      const { data, error } = await supabase
        .from('vouchers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vouchers'] });
      toast.success('Voucher atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar voucher: ' + error.message);
    },
  });
}

export function useDecrementVoucherSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userVoucherId: string) => {
      const { data, error } = await supabase.rpc('decrementar_sessao_voucher', {
        _user_voucher_id: userVoucherId,
      });

      if (error) throw error;
      if (!data) throw new Error('Voucher inválido ou sem sessões disponíveis');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-vouchers'] });
      toast.success('Sessão descontada do voucher');
    },
    onError: (error: Error) => {
      toast.error('Erro ao descontar sessão: ' + error.message);
    },
  });
}
