import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const REPORT_TEMPLATES = [
  {
    id: 'patient-progress',
    name: 'Relatório de Progresso do Paciente',
    description: 'Acompanhamento detalhado da evolução do paciente',
    template_type: 'patient_progress',
    query_config: {
      metrics: ['pain_level', 'mobility', 'strength'],
      period: '30_days'
    },
    schedule_config: {
      frequency: 'weekly'
    }
  },
  {
    id: 'treatment-summary',
    name: 'Resumo de Tratamento',
    description: 'Sumário completo das sessões e resultados',
    template_type: 'treatment_summary',
    query_config: {
      include_sessions: true,
      include_exercises: true,
      include_notes: true
    }
  },
  {
    id: 'clinic-analytics',
    name: 'Análise da Clínica',
    description: 'Métricas gerais de performance da clínica',
    template_type: 'clinic_analytics',
    query_config: {
      metrics: ['patient_count', 'session_count', 'revenue'],
      period: '30_days'
    }
  }
];

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