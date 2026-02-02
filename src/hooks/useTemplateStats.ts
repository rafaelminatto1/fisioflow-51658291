/**
 * useTemplateStats - Migrated to Firebase
 *
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, updateDoc, doc, getDoc, query as firestoreQuery, where, orderBy, limit as limitFn,  } from '@/integrations/firebase/app';
import { EvaluationForm } from '@/types/clinical-forms';
import { db } from '@/integrations/firebase/app';



export function useTemplateStats() {
  return useQuery({
    queryKey: ['template-stats'],
    queryFn: async () => {
      // Get all active forms
      const q = firestoreQuery(
        collection(db, 'evaluation_forms'),
        where('ativo', '==', true)
      );

      const snapshot = await getDocs(q);
      const forms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Calculate stats
      const total = forms.length;
      const favorites = forms.filter((f) => f.is_favorite).length;

      // Get recently used (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentlyUsed = forms
        .filter((f) => {
          const lastUsed = f.last_used_at ? new Date(f.last_used_at) : null;
          return lastUsed && lastUsed >= thirtyDaysAgo;
        })
        .reduce((sum, f) => sum + (f.usage_count || 0), 0);

      // Get templates by category
      const byCategory: Record<string, number> = {};
      forms.forEach((form) => {
        const tipo = form.tipo;
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

export function useMostUsedTemplates(limitNum = 10) {
  return useQuery({
    queryKey: ['evaluation-forms', 'most-used', limitNum],
    queryFn: async () => {
      const q = firestoreQuery(
        collection(db, 'evaluation_forms'),
        where('ativo', '==', true)
      );

      const snapshot = await getDocs(q);
      let forms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Filter and sort by usage_count client-side
      interface FormWithUsage {
        usage_count?: number | null;
        [key: string]: unknown;
      }

      forms = forms
        .filter((f: FormWithUsage) => f.usage_count !== null && f.usage_count > 0)
        .sort((a: FormWithUsage, b: FormWithUsage) => (b.usage_count || 0) - (a.usage_count || 0))
        .slice(0, limitNum);

      return forms as EvaluationForm[];
    },
  });
}

export function useRecentlyUsedTemplates(limitNum = 6) {
  return useQuery({
    queryKey: ['evaluation-forms', 'recently-used', limitNum],
    queryFn: async () => {
      const q = firestoreQuery(
        collection(db, 'evaluation_forms'),
        where('ativo', '==', true)
      );

      const snapshot = await getDocs(q);
      let forms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Filter and sort by last_used_at client-side
      interface FormWithLastUsed {
        last_used_at: string | null;
      }

      forms = forms
        .filter((f: FormWithLastUsed) => f.last_used_at !== null)
        .sort((a: FormWithLastUsed, b: FormWithLastUsed) => {
          const aTime = new Date(a.last_used_at || '').getTime();
          const bTime = new Date(b.last_used_at || '').getTime();
          return bTime - aTime;
        })
        .slice(0, limitNum);

      return forms as EvaluationForm[];
    },
  });
}

export default useTemplateStats;
