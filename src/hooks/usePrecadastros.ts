import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface PrecadastroToken {
  id: string;
  organization_id: string;
  nome: string;
  descricao: string | null;
  token: string;
  ativo: boolean;
  max_usos: number | null;
  usos_atuais: number;
  expires_at: string | null;
  campos_obrigatorios: string[];
  campos_opcionais: string[];
  created_at: string;
}

export interface Precadastro {
  id: string;
  token_id: string;
  organization_id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  data_nascimento: string | null;
  endereco: string | null;
  observacoes: string | null;
  status: string;
  converted_at: string | null;
  patient_id: string | null;
  dados_adicionais: Json | null;
  created_at: string;
  updated_at: string;
}

export function usePrecadastroTokens() {
  return useQuery({
    queryKey: ['precadastro-tokens'],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .single();
      
      if (!profile?.organization_id) return [];
      
      const { data, error } = await supabase
        .from('precadastro_tokens')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PrecadastroToken[];
    }
  });
}

export function usePrecadastros() {
  return useQuery({
    queryKey: ['precadastros'],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .single();
      
      if (!profile?.organization_id) return [];
      
      const { data, error } = await supabase
        .from('precadastros')
        .select('*, precadastro_tokens:token_id(nome)')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });
}

export function useCreatePrecadastroToken() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<PrecadastroToken>) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .single();
      
      if (!profile?.organization_id) throw new Error('Organização não encontrada');
      
      // Generate unique token
      const token = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
      
      const { data: result, error } = await supabase
        .from('precadastro_tokens')
        .insert({
          ...data,
          organization_id: profile.organization_id,
          token
        })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['precadastro-tokens'] });
      toast.success('Link de pré-cadastro criado!');
    },
    onError: (error) => {
      toast.error('Erro ao criar link: ' + error.message);
    }
  });
}

export function useUpdatePrecadastroToken() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<PrecadastroToken> & { id: string }) => {
      const { error } = await supabase
        .from('precadastro_tokens')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['precadastro-tokens'] });
      toast.success('Link atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    }
  });
}

export function useUpdatePrecadastro() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Precadastro> & { id: string }) => {
      const { error } = await supabase
        .from('precadastros')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['precadastros'] });
      toast.success('Pré-cadastro atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    }
  });
}
