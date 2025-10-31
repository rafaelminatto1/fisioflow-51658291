import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useIntelligentReports(patientId?: string) {
  const generateReport = useMutation({
    mutationFn: async ({ 
      patientId, 
      reportType, 
      dateRange 
    }: { 
      patientId: string; 
      reportType: string; 
      dateRange: { start: string; end: string } 
    }) => {
      const { data, error } = await supabase.functions.invoke('intelligent-reports', {
        body: { patientId, reportType, dateRange }
      });

      if (error) throw error;
      return data;
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao gerar relatório',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const { data: recentReports, isLoading } = useQuery({
    queryKey: ['recent-reports', patientId],
    queryFn: async () => {
      if (!patientId) return [];
      
      const { data, error } = await supabase
        .from('generated_reports')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: !!patientId,
  });

  return {
    generateReport,
    recentReports,
    isLoading,
  };
}
