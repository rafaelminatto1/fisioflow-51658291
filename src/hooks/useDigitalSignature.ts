/**
 * useDigitalSignature - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('document_signatures') → Firestore collection 'document_signatures'
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/integrations/firebase/app';
import {
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';


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

// Helper to convert Firestore doc to DocumentSignature
const convertDocToDocumentSignature = (doc: { id: string; data: () => Record<string, unknown> }): DocumentSignature => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
  } as DocumentSignature;
};

export function useDocumentSignatures(documentId?: string) {
  return useQuery({
    queryKey: ['document-signatures', documentId],
    queryFn: async () => {
      let q = query(
        collection(db, 'document_signatures'),
        orderBy('signed_at', 'desc')
      );

      const snapshot = await getDocs(q);
      let data = snapshot.docs.map(convertDocToDocumentSignature);

      // Filter by documentId if provided
      if (documentId) {
        data = data.filter(s => s.document_id === documentId);
      }

      return data;
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
      const signatureData = {
        ...data,
        signed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'document_signatures'), signatureData);
      const docSnap = await getDoc(docRef);

      return convertDocToDocumentSignature(docSnap);
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
      const q = query(
        collection(db, 'document_signatures'),
        where('document_id', '==', documentId),
        where('signature_hash', '==', hash),
        limit(1)
      );

      const snapshot = await getDocs(q);
      const valid = !snapshot.empty;

      return {
        valid,
        signature: valid ? convertDocToDocumentSignature(snapshot.docs[0]) : null
      };
    }
  });
}
