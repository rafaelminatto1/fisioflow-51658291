import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EvaluationForm } from '@/types/clinical-forms';

/**
 * Hook para obter estatísticas gerais dos templates
 */
export function useTemplateStats() {
  return useQuery({
    queryKey: ['template-stats'],
    queryFn: async () => {
      // Get total count
      const { count: total, error: totalError } = await supabase
        .from('evaluation_forms')
        .select('*', { count: 'exact', head: true })
        .eq('ativo', true);

      if (totalError) throw totalError;

      // Get favorites count
      const { count: favorites, error: favError } = await supabase
        .from('evaluation_forms')
        .select('*', { count: 'exact', head: true })
        .eq('is_favorite', true)
        .eq('ativo', true);

      if (favError) throw favError;

      // Get recently used (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: recentForms, error: recentError } = await supabase
        .from('evaluation_forms')
        .select('usage_count')
        .eq('ativo', true)
        .gte('last_used_at', thirtyDaysAgo.toISOString())
        .not('last_used_at', 'is', null);

      if (recentError) throw recentError;

      const recentlyUsed = recentForms?.reduce((sum, form) => sum + (form.usage_count || 0), 0) || 0;

      // Get templates by category
      const { data: byCategoryData, error: catError } = await supabase
        .from('evaluation_forms')
        .select('tipo')
        .eq('ativo', true);

      if (catError) throw catError;

      const byCategory: Record<string, number> = {};
      byCategoryData?.forEach((form) => {
        byCategory[form.tipo] = (byCategory[form.tipo] || 0) + 1;
      });

      return {
        total: total || 0,
        favorites: favorites || 0,
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
  return useMutation({
    mutationFn: async (templateId: string) => {
      // Call the database function to increment usage
      const { data, error } = await supabase.rpc('increment_template_usage', {
        template_id: templateId,
      });

      if (error) throw error;
      return data;
    },
  });
}

/**
 * Hook para obter templates mais usados
 */
export function useMostUsedTemplates(limit = 10) {
  return useQuery({
    queryKey: ['evaluation-forms', 'most-used', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evaluation_forms')
        .select('*')
        .eq('ativo', true)
        .not('usage_count', 'is', null)
        .order('usage_count', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as EvaluationForm[];
    },
  });
}

/**
 * Hook para obter templates recentemente usados
 */
export function useRecentlyUsedTemplates(limit = 6) {
  return useQuery({
    queryKey: ['evaluation-forms', 'recently-used', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evaluation_forms')
        .select('*')
        .eq('ativo', true)
        .not('last_used_at', 'is', null)
        .order('last_used_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as EvaluationForm[];
    },
  });
}

export default useTemplateStats;
