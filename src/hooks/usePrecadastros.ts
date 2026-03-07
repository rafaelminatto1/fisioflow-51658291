/**
 * usePrecadastros - Migrated to Neon/Workers
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  precadastroApi,
  type Precadastro,
  type PrecadastroToken,
} from '@/lib/api/workers-client';

export type { Precadastro, PrecadastroToken };

export function usePrecadastroTokens() {
  return useQuery({
    queryKey: ['precadastro-tokens'],
    queryFn: async () => {
      const res = await precadastroApi.tokens.list();
      return (res?.data ?? []) as PrecadastroToken[];
    },
  });
}

export function usePrecadastros() {
  return useQuery({
    queryKey: ['precadastros'],
    queryFn: async () => {
      const res = await precadastroApi.submissions.list();
      return (res?.data ?? []) as Precadastro[];
    },
  });
}

export function useCreatePrecadastroToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<PrecadastroToken>) => {
      const token = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
      const res = await precadastroApi.tokens.create({
        ...data,
        token,
      });
      return (res?.data ?? res) as PrecadastroToken;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['precadastro-tokens'] });
      toast.success('Link de pré-cadastro criado!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar link: ' + error.message);
    },
  });
}

export function useUpdatePrecadastroToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<PrecadastroToken> & { id: string }) => {
      const res = await precadastroApi.tokens.update(id, data);
      return (res?.data ?? res) as PrecadastroToken;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['precadastro-tokens'] });
      toast.success('Link atualizado!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });
}

export function useUpdatePrecadastro() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Precadastro> & { id: string }) => {
      const res = await precadastroApi.submissions.update(id, data);
      return (res?.data ?? res) as Precadastro;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['precadastros'] });
      toast.success('Pré-cadastro atualizado!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });
}
