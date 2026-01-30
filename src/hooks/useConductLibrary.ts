/**
 * useConductLibrary - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('conduct_library') → Firestore collection 'conduct_library'
 * - supabase.auth.getUser() → Firebase Auth (imported from contexts/AuthContext)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/integrations/firebase/app';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy
} from 'firebase/firestore';


export interface ConductTemplate {
  id: string;
  title: string;
  description?: string;
  conduct_text: string;
  category: string;
  organization_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateConductData {
  title: string;
  description?: string;
  conduct_text: string;
  category: string;
  organization_id?: string;
}

// Helper to convert Firestore doc to ConductTemplate
const convertDocToConductTemplate = (doc: { id: string; data: () => Record<string, unknown> }): ConductTemplate => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
  } as ConductTemplate;
};

export const useConductLibrary = (category?: string) => {
  return useQuery({
    queryKey: ['conduct-library', category],
    queryFn: async () => {
      const q = query(
        collection(db, 'conduct_library'),
        orderBy('title')
      );

      const snapshot = await getDocs(q);
      let data = snapshot.docs.map(convertDocToConductTemplate);

      // Filter by category if provided
      if (category) {
        data = data.filter(c => c.category === category);
      }

      return data;
    }
  });
};

export const useCreateConduct = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateConductData) => {
      if (!user) throw new Error('Usuário não autenticado');

      const conductData = {
        ...data,
        created_by: user.uid,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'conduct_library'), conductData);
      const docSnap = await getDoc(docRef);

      return convertDocToConductTemplate(docSnap);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conduct-library'] });
      toast({
        title: 'Conduta salva',
        description: 'A conduta foi adicionada à biblioteca.'
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao salvar conduta',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    }
  });
};

export const useDeleteConduct = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (conductId: string) => {
      await deleteDoc(doc(db, 'conduct_library', conductId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conduct-library'] });
      toast({
        title: 'Conduta removida',
        description: 'A conduta foi removida da biblioteca.'
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao remover conduta',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    }
  });
};
