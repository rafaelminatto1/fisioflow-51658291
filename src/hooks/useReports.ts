import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Define types for reports
interface Report {
  id: string;
  name: string;
  description: string | null;
  template_type: string;
  query_config: Record<string, unknown>;
  schedule_config: Record<string, unknown> | null;
  is_public: boolean | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateReportData {
  name: string;
  description?: string;
  template_type: string;
  query_config: Record<string, unknown>;
  schedule_config?: Record<string, unknown>;
  is_public?: boolean;
}

interface ExecuteReportParams {
  id: string;
  params?: Record<string, unknown>;
}

interface ReportExecution {
  id: string;
  report_id: string | null;
  status: string;
  executed_by: string | null;
  execution_params: Record<string, unknown> | null;
  file_url: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

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

export function useReportTemplates() {
  return REPORT_TEMPLATES;
}

export function useReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data as Report[]);
    } catch (err) {
      console.error('Error fetching reports:', err);
      toast.error('Erro ao buscar relatórios');
    } finally {
      setLoading(false);
    }
  };

  const createReport = async (reportData: CreateReportData) => {
    console.log('Creating report:', reportData);
    return { id: 'mock-id', ...reportData } as Report;
  };

  return {
    reports,
    loading,
    fetchReports,
    createReport,
    getReportById: async (_id: string) => ({ id: _id }),
    updateReport: async (_id: string, _data: Partial<CreateReportData>) => ({ id: _id, ..._data } as Report),
    deleteReport: async (_id: string) => {},
    executeReport: async (_id: string, _params: Record<string, unknown>) => ({ id: _id, params: _params } as ReportExecution),
  };
}

export function useCreateReport() {
  return {
    mutateAsync: async (data: CreateReportData) => {
      console.log('Creating report:', data);
      return { id: 'mock-id', ...data } as Report;
    }
  };
}

export function useDeleteReport() {
  return {
    mutateAsync: async (_id: string) => {
      console.log('Deleting report:', _id);
      return true;
    }
  };
}

export function useExecuteReport() {
  return {
    mutateAsync: async (params: ExecuteReportParams) => {
      console.log('Executing report:', params);
      return { id: 'execution-id', ...params } as ReportExecution;
    }
  };
}

export function useReportExecutions() {
  return {
    data: [] as ReportExecution[]
  };
}