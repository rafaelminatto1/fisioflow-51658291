/**
 * useTemplateStats - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('evaluation_forms') → Firestore collection 'evaluation_forms'
 * - supabase.rpc() → Direct Firestore operations
 * - Client-side aggregation for statistics
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EvaluationForm } from '@/types/clinical-forms';
import { getFirebaseDb } from '@/integrations/firebase/app';
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  getDoc,
  query,
  where,
  orderBy,
  limit as limitFn,
} from 'firebase/firestore';

const db = getFirebaseDb();

/**
 * Hook para obter estatísticas gerais dos templates
 */
export function useTemplateStats() {
  return useQuery({
    queryKey: ['template-stats'],
    queryFn: async () => {
      // Get all active forms
      const q = query(
        collection(db, 'evaluation_forms'),
        where('ativo', '==', true)
      );

      const snapshot = await getDocs(q);
      const forms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Calculate stats
      const total = forms.length;
      const favorites = forms.filter((f: any) => f.is_favorite).length;

      // Get recently used (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentlyUsed = forms
        .filter((f: any) => {
          const lastUsed = f.last_used_at ? new Date(f.last_used_at) : null;
          return lastUsed && lastUsed >= thirtyDaysAgo;
        })
        .reduce((sum, f: any) => sum + (f.usage_count || 0), 0);

      // Get templates by category
      const byCategory: Record<string, number> = {};
      forms.forEach((form) => {
        const tipo = (form as any).tipo;
        byCategory[tipo] = (byCategory[tipo] || 0) + 1;
      });

      return {
        total,
        favorites,
        recentlyUsed,
        byCategory,
      };
    },
  });
}

/**
 * Hook para incrementar o contador de uso de um template
 * Deve ser chamado quando uma avaliação é criada usando o template
 */
export function useIncrementTemplateUsage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const docRef = doc(db, 'evaluation_forms', templateId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Template não encontrado');
      }

      const currentData = docSnap.data();
      const currentUsage = currentData?.usage_count || 0;

      await updateDoc(docRef, {
        usage_count: currentUsage + 1,
        last_used_at: new Date().toISOString(),
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['template-stats'] });
      queryClient.invalidateQueries({ queryKey: ['evaluation-forms', 'most-used'] });
      queryClient.invalidateQueries({ queryKey: ['evaluation-forms', 'recently-used'] });

      return { id: templateId, usage_count: currentUsage + 1 };
    },
  });
}

/**
 * Hook para obter templates mais usados
 */
export function useMostUsedTemplates(limitNum = 10) {
  return useQuery({
    queryKey: ['evaluation-forms', 'most-used', limitNum],
    queryFn: async () => {
      const q = query(
        collection(db, 'evaluation_forms'),
        where('ativo', '==', true)
      );

      const snapshot = await getDocs(q);
      let forms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Filter and sort by usage_count client-side
      forms = forms
        .filter((f: any) => f.usage_count !== null && f.usage_count > 0)
        .sort((a: any, b: any) => b.usage_count - a.usage_count)
        .slice(0, limitNum);

      return forms as EvaluationForm[];
    },
  });
}

/**
 * Hook para obter templates recentemente usados
 */
export function useRecentlyUsedTemplates(limitNum = 6) {
  return useQuery({
    queryKey: ['evaluation-forms', 'recently-used', limitNum],
    queryFn: async () => {
      const q = query(
        collection(db, 'evaluation_forms'),
        where('ativo', '==', true)
      );

      const snapshot = await getDocs(q);
      let forms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Filter and sort by last_used_at client-side
      forms = forms
        .filter((f: any) => f.last_used_at !== null)
        .sort((a: any, b: any) => {
          const aTime = new Date(a.last_used_at).getTime();
          const bTime = new Date(b.last_used_at).getTime();
          return bTime - aTime;
        })
        .slice(0, limitNum);

      return forms as EvaluationForm[];
    },
  });
}

export default useTemplateStats;
