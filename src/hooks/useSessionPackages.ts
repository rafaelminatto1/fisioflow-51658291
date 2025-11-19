import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SessionPackage {
  id: string;
  organization_id: string;
  patient_id: string;
  package_name: string;
  total_sessions: number;
  used_sessions: number;
  remaining_sessions: number;
  total_value: number;
  discount_value: number;
  final_value: number;
  value_per_session: number;
  payment_status: string;
  payment_method?: string;
  paid_at?: string;
  status: 'ativo' | 'consumido' | 'expirado' | 'cancelado';
  valid_until?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const useSessionPackages = (patientId?: string) => {
  return useQuery({
    queryKey: ['session-packages', patientId],
    queryFn: async () => {
      let query = supabase
        .from('session_packages')
        .select('*')
        .order('created_at', { ascending: false });

      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SessionPackage[];
    },
  });
};

export const useCreatePackage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (packageData: Omit<SessionPackage, 'id' | 'created_at' | 'updated_at' | 'remaining_sessions' | 'value_per_session' | 'used_sessions'>) => {
      const { data, error } = await supabase
        .from('session_packages')
        .insert(packageData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-packages'] });
      toast({ title: 'Pacote criado com sucesso' });
    },
    onError: () => {
      toast({ title: 'Erro ao criar pacote', variant: 'destructive' });
    },
  });
};

export const useUsePackageSession = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (packageId: string) => {
      const { data, error } = await supabase.rpc('use_package_session', {
        _package_id: packageId,
      });

      if (error) throw error;
      if (!data) throw new Error('Não foi possível usar sessão do pacote');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-packages'] });
      toast({ title: 'Sessão debitada do pacote' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao debitar sessão',
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
};
