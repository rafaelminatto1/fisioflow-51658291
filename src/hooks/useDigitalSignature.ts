import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DocumentSignature {
  id: string;
  document_id: string;
  document_type: string;
  document_title: string;
  signer_name: string;
  signer_id?: string;
  signature_image: string;
  signature_hash: string;
  ip_address?: string;
  user_agent?: string;
  signed_at: string;
  created_at: string;
}

export function useDocumentSignatures(documentId?: string) {
  return useQuery({
    queryKey: ['document-signatures', documentId],
    queryFn: async () => {
      let query = supabase
        .from('document_signatures' as any)
        .select('*')
        .order('signed_at', { ascending: false });

      if (documentId) {
        query = query.eq('document_id', documentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as unknown) as DocumentSignature[];
    },
    enabled: true
  });
}

export function useCreateSignature() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      document_id: string;
      document_type: string;
      document_title: string;
      signer_name: string;
      signer_id?: string;
      signature_image: string;
      signature_hash: string;
    }) => {
      const { data: signature, error } = await supabase
        .from('document_signatures' as any)
        .insert({
          ...data,
          signed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return (signature as unknown) as DocumentSignature;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-signatures'] });
      toast({
        title: 'Documento assinado',
        description: 'Assinatura registrada com sucesso'
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível registrar a assinatura',
        variant: 'destructive'
      });
    }
  });
}

export function useVerifySignature() {
  return useMutation({
    mutationFn: async ({ documentId, hash }: { documentId: string; hash: string }) => {
      const { data, error } = await supabase
        .from('document_signatures' as any)
        .select('*')
        .eq('document_id', documentId)
        .eq('signature_hash', hash)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return { valid: !!data, signature: (data as unknown) as DocumentSignature | null };
    }
  });
}
