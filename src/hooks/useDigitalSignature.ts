/**
 * useDigitalSignature - Migrated to Neon/Workers
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { documentSignaturesApi } from '@/lib/api/workers-client';

export interface DocumentSignature {
  id: string;
  document_id: string;
  document_type: string;
  document_title: string;
  signer_name: string;
  signer_id?: string;
  signature_image?: string;
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
      const result = await documentSignaturesApi.list(documentId);
      return (result.data ?? []) as DocumentSignature[];
    },
    enabled: true,
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
      const result = await documentSignaturesApi.create(data);
      return result.data as DocumentSignature;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-signatures'] });
      toast({ title: 'Documento assinado', description: 'Assinatura registrada com sucesso' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível registrar a assinatura', variant: 'destructive' });
    },
  });
}

export function useVerifySignature() {
  return useMutation({
    mutationFn: async ({ documentId, hash }: { documentId: string; hash: string }) => {
      const result = await documentSignaturesApi.verify(documentId, hash);
      return result.data as { valid: boolean; signature: DocumentSignature | null };
    },
  });
}
