import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data as any);
    } catch (err) {
      console.error('Error fetching reports:', err);
      toast.error('Erro ao buscar relatórios');
    } finally {
      setLoading(false);
    }
  };

  const createReport = async (reportData: any) => {
    console.log('Creating report:', reportData);
    return { id: 'mock-id', ...reportData };
  };

  return {
    reports,
    loading,
    fetchReports,
    createReport,
    getReportById: async (id: string) => ({ id }),
    updateReport: async (id: string, data: any) => ({ id, ...data }),
    deleteReport: async (id: string) => {},
    executeReport: async (id: string, params: any) => ({ id }),
  };
}