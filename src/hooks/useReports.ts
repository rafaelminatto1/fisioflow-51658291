import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Report {
  id: string;
  name: string;
  description?: string;
  query_config: any;
  template_type: string;
  created_by?: string;
  is_public: boolean;
  schedule_config?: any;
  created_at: string;
  updated_at: string;
}

export interface ReportExecution {
  id: string;
  report_id: string;
  executed_by?: string;
  execution_params: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  file_url?: string;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export function useReports() {
  return useQuery({
    queryKey: ['reports'],
    queryFn: async (): Promise<Report[]> => {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}

export function useReport(id: string) {
  return useQuery({
    queryKey: ['report', id],
    queryFn: async (): Promise<Report | null> => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useReportExecutions(reportId?: string) {
  return useQuery({
    queryKey: ['report-executions', reportId],
    queryFn: async (): Promise<ReportExecution[]> => {
      let query = supabase
        .from('report_executions')
        .select('*')
        .order('created_at', { ascending: false });

      if (reportId) {
        query = query.eq('report_id', reportId);
      }

      const { data, error } = await query;

      return data || [];
    },
  });
}

export function useCreateReport() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (report: Omit<Report, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('reports')
        .insert([report])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast({
        title: "Relatório criado com sucesso",
        description: "O relatório foi salvo e está disponível na biblioteca.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar relatório",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateReport() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Report> & { id: string }) => {
      const { data, error } = await supabase
        .from('reports')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['report', data.id] });
      toast({
        title: "Relatório atualizado",
        description: "As alterações foram salvas com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar relatório",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteReport() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast({
        title: "Relatório excluído",
        description: "O relatório foi removido da biblioteca.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir relatório",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useExecuteReport() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      report_id: string;
      execution_params?: any;
      format?: 'pdf' | 'excel' | 'csv';
    }) => {
      const { data, error } = await supabase
        .from('report_executions')
        .insert([{
          report_id: params.report_id,
          execution_params: params.execution_params || {},
          status: 'pending'
        }])
        .select()
        .single();

      if (error) throw error;

      // In a real implementation, this would trigger a background job
      // For now, we'll simulate the execution
      setTimeout(async () => {
        await supabase
          .from('report_executions')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            file_url: `/reports/${data.id}.${params.format || 'pdf'}`
          })
          .eq('id', data.id);
        
        queryClient.invalidateQueries({ queryKey: ['report-executions'] });
      }, 2000);

      return data;
    },
    onSuccess: () => {
      toast({
        title: "Relatório em processamento",
        description: "O relatório está sendo gerado. Você será notificado quando estiver pronto.",
      });
      queryClient.invalidateQueries({ queryKey: ['report-executions'] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao executar relatório",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Report Templates
export const REPORT_TEMPLATES = [
  {
    id: 'monthly-management',
    name: 'Relatório Mensal Gerencial',
    description: 'Visão executiva completa do mês com KPIs e métricas principais',
    template_type: 'management',
    query_config: {
      metrics: ['revenue', 'patients', 'appointments', 'occupancy'],
      charts: ['revenue_trend', 'patient_distribution', 'appointment_status'],
      period: 'monthly'
    },
    schedule_config: {
      frequency: 'monthly',
      day: 1,
      time: '09:00',
      recipients: []
    }
  },
  {
    id: 'financial-statement',
    name: 'Demonstrativo Financeiro',
    description: 'Relatório detalhado de receitas, despesas e indicadores financeiros',
    template_type: 'financial',
    query_config: {
      metrics: ['total_revenue', 'avg_ticket', 'payment_methods', 'outstanding'],
      charts: ['revenue_by_month', 'payment_distribution'],
      period: 'monthly'
    }
  },
  {
    id: 'professional-performance',
    name: 'Performance por Profissional',
    description: 'Análise individual de produtividade e qualidade do atendimento',
    template_type: 'performance',
    query_config: {
      metrics: ['appointments_count', 'revenue_generated', 'patient_satisfaction'],
      charts: ['appointments_by_therapist', 'revenue_by_therapist'],
      period: 'monthly',
      group_by: 'therapist'
    }
  },
  {
    id: 'clinical-analysis',
    name: 'Análise Clínica',
    description: 'Distribuição de diagnósticos e efetividade dos tratamentos',
    template_type: 'clinical',
    query_config: {
      metrics: ['diagnoses_distribution', 'treatment_duration', 'success_rate'],
      charts: ['diagnoses_chart', 'pain_level_evolution'],
      period: 'quarterly'
    }
  },
  {
    id: 'accounting-report',
    name: 'Relatório Contábil',
    description: 'Dados formatados para envio ao contador e obrigações fiscais',
    template_type: 'accounting',
    query_config: {
      metrics: ['gross_revenue', 'taxes', 'expenses', 'net_income'],
      format: 'accounting',
      period: 'monthly'
    }
  }
];

export function useReportTemplates() {
  return {
    data: REPORT_TEMPLATES,
    isLoading: false,
    error: null
  };
}