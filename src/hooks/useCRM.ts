import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types
export interface CRMTarefa {
  id: string;
  lead_id: string | null;
  titulo: string;
  descricao: string | null;
  tipo: 'follow_up' | 'ligacao' | 'email' | 'whatsapp' | 'reuniao';
  prioridade: 'baixa' | 'normal' | 'alta' | 'urgente';
  status: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';
  data_vencimento: string | null;
  hora_vencimento: string | null;
  responsavel_id: string | null;
  concluida_em: string | null;
  created_at: string;
}

export interface CRMCampanha {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: 'email' | 'whatsapp' | 'sms';
  status: 'rascunho' | 'agendada' | 'enviando' | 'concluida' | 'pausada';
  assunto: string | null;
  conteudo: string;
  filtro_estagios: string[];
  filtro_origens: string[];
  filtro_tags: string[];
  agendada_para: string | null;
  total_destinatarios: number;
  total_enviados: number;
  total_abertos: number;
  created_at: string;
}

export interface CRMAutomacao {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: 'aniversario' | 'reengajamento' | 'pos_avaliacao' | 'boas_vindas' | 'follow_up_automatico';
  ativo: boolean;
  gatilho_config: Record<string, unknown>;
  acao_config: Record<string, unknown>;
  canal: 'whatsapp' | 'email' | 'sms';
  template_mensagem: string | null;
  total_executado: number;
  created_at: string;
}

export interface NPSPesquisa {
  id: string;
  lead_id: string | null;
  patient_id: string | null;
  nota: number;
  categoria: 'promotor' | 'neutro' | 'detrator';
  comentario: string | null;
  motivo_nota: string | null;
  sugestoes: string | null;
  origem: string | null;
  respondido_em: string;
}

// ========== TAREFAS ==========
export function useCRMTarefas(leadId?: string) {
  return useQuery({
    queryKey: ['crm-tarefas', leadId],
    queryFn: async () => {
      let query = supabase
        .from('crm_tarefas')
        .select('*')
        .order('data_vencimento', { ascending: true, nullsFirst: false });
      
      if (leadId) query = query.eq('lead_id', leadId);
      
      const { data, error } = await query;
      if (error) throw error;
      return data as CRMTarefa[];
    },
  });
}

export function useTarefasPendentes() {
  return useQuery({
    queryKey: ['crm-tarefas-pendentes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_tarefas')
        .select('*, leads(nome)')
        .in('status', ['pendente', 'em_andamento'])
        .order('data_vencimento', { ascending: true, nullsFirst: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateTarefa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tarefa: Omit<CRMTarefa, 'id' | 'created_at' | 'concluida_em'>) => {
      const { data, error } = await supabase.from('crm_tarefas').insert(tarefa).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-tarefas'] });
      toast.success('Tarefa criada com sucesso.');
    },
    onError: () => toast.error('Erro ao criar tarefa.'),
  });
}

export function useUpdateTarefa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...tarefa }: Partial<CRMTarefa> & { id: string }) => {
      const { data, error } = await supabase.from('crm_tarefas').update(tarefa).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-tarefas'] });
      toast.success('Tarefa atualizada.');
    },
    onError: () => toast.error('Erro ao atualizar tarefa.'),
  });
}

export function useConcluirTarefa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('crm_tarefas')
        .update({ status: 'concluida', concluida_em: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-tarefas'] });
      toast.success('Tarefa concluída!');
    },
    onError: () => toast.error('Erro ao concluir tarefa.'),
  });
}

export function useDeleteTarefa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('crm_tarefas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-tarefas'] });
      toast.success('Tarefa excluída.');
    },
    onError: () => toast.error('Erro ao excluir tarefa.'),
  });
}

// ========== CAMPANHAS ==========
export function useCRMCampanhas() {
  return useQuery({
    queryKey: ['crm-campanhas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_campanhas')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as CRMCampanha[];
    },
  });
}

export function useCreateCampanha() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (campanha: Partial<CRMCampanha>) => {
      const { data, error } = await supabase.from('crm_campanhas').insert(campanha as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-campanhas'] });
      toast.success('Campanha criada com sucesso.');
    },
    onError: () => toast.error('Erro ao criar campanha.'),
  });
}

export function useUpdateCampanha() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...campanha }: Partial<CRMCampanha> & { id: string }) => {
      const { data, error } = await supabase.from('crm_campanhas').update(campanha).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-campanhas'] });
      toast.success('Campanha atualizada.');
    },
    onError: () => toast.error('Erro ao atualizar campanha.'),
  });
}

export function useDeleteCampanha() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('crm_campanhas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-campanhas'] });
      toast.success('Campanha excluída.');
    },
    onError: () => toast.error('Erro ao excluir campanha.'),
  });
}

// ========== AUTOMAÇÕES ==========
export function useCRMAutomacoes() {
  return useQuery({
    queryKey: ['crm-automacoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_automacoes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as CRMAutomacao[];
    },
  });
}

export function useCreateAutomacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (automacao: Partial<CRMAutomacao>) => {
      const { data, error } = await supabase.from('crm_automacoes').insert(automacao as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-automacoes'] });
      toast.success('Automação criada com sucesso.');
    },
    onError: () => toast.error('Erro ao criar automação.'),
  });
}

export function useToggleAutomacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { data, error } = await supabase.from('crm_automacoes').update({ ativo }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['crm-automacoes'] });
      toast.success(vars.ativo ? 'Automação ativada!' : 'Automação desativada.');
    },
    onError: () => toast.error('Erro ao atualizar automação.'),
  });
}

export function useDeleteAutomacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('crm_automacoes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-automacoes'] });
      toast.success('Automação excluída.');
    },
    onError: () => toast.error('Erro ao excluir automação.'),
  });
}

// ========== NPS ==========
export function useNPSPesquisas() {
  return useQuery({
    queryKey: ['crm-nps'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_pesquisas_nps')
        .select('*, leads(nome), patients(name)')
        .order('respondido_em', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useNPSMetrics() {
  return useQuery({
    queryKey: ['crm-nps-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase.from('crm_pesquisas_nps').select('nota, categoria');
      if (error) throw error;
      
      const total = data.length;
      const promotores = data.filter(d => d.nota >= 9).length;
      const neutros = data.filter(d => d.nota >= 7 && d.nota <= 8).length;
      const detratores = data.filter(d => d.nota <= 6).length;
      
      const nps = total > 0 ? Math.round(((promotores - detratores) / total) * 100) : 0;
      
      return { total, promotores, neutros, detratores, nps };
    },
  });
}

export function useCreateNPS() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (pesquisa: Partial<NPSPesquisa>) => {
      const { data, error } = await supabase
        .from('crm_pesquisas_nps')
        .insert(pesquisa as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-nps'] });
      toast.success('Pesquisa registrada com sucesso.');
    },
    onError: () => toast.error('Erro ao registrar pesquisa.'),
  });
}

// ========== ANALYTICS AVANÇADO ==========
export function useCRMAnalytics() {
  return useQuery({
    queryKey: ['crm-analytics'],
    queryFn: async () => {
      // Get all leads
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('estagio, origem, score, temperatura, created_at, updated_at, data_ultimo_contato');
      
      if (leadsError) throw leadsError;
      
      // Conversion by source
      const conversionBySource = Object.entries(
        leads.reduce((acc, lead) => {
          const origem = lead.origem || 'Não informado';
          if (!acc[origem]) acc[origem] = { total: 0, convertidos: 0 };
          acc[origem].total++;
          if (lead.estagio === 'efetivado') acc[origem].convertidos++;
          return acc;
        }, {} as Record<string, { total: number; convertidos: number }>)
      ).map(([origem, data]) => ({
        origem,
        total: data.total,
        convertidos: data.convertidos,
        taxa: data.total > 0 ? Math.round((data.convertidos / data.total) * 100) : 0,
      }));
      
      // Temperature distribution
      const temperatureDistribution = leads.reduce((acc, lead) => {
        const temp = lead.temperatura || 'morno';
        acc[temp] = (acc[temp] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Leads by stage with avg time
      const stageAnalysis = Object.entries(
        leads.reduce((acc, lead) => {
          if (!acc[lead.estagio]) acc[lead.estagio] = { count: 0, scores: [] };
          acc[lead.estagio].count++;
          acc[lead.estagio].scores.push(lead.score || 0);
          return acc;
        }, {} as Record<string, { count: number; scores: number[] }>)
      ).map(([estagio, data]) => ({
        estagio,
        count: data.count,
        avgScore: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
      }));
      
      // Cold leads (no contact in 7+ days)
      const coldLeads = leads.filter(l => {
        if (!l.data_ultimo_contato) return true;
        const lastContact = new Date(l.data_ultimo_contato);
        const daysAgo = (Date.now() - lastContact.getTime()) / (1000 * 60 * 60 * 24);
        return daysAgo > 7;
      }).length;
      
      return {
        conversionBySource,
        temperatureDistribution,
        stageAnalysis,
        coldLeads,
        totalLeads: leads.length,
      };
    },
  });
}

// ========== IMPORT LEADS ==========
export function useImportLeads() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (leads: Array<Partial<any>>) => {
      const formattedLeads = leads.map(lead => ({
        nome: lead.nome || lead.name || lead.Nome || '',
        telefone: lead.telefone || lead.phone || lead.Telefone || null,
        email: lead.email || lead.Email || null,
        origem: lead.origem || lead.Origem || 'Importação',
        interesse: lead.interesse || lead.Interesse || null,
        observacoes: lead.observacoes || lead.Observações || null,
        estagio: 'aguardando',
        data_primeiro_contato: new Date().toISOString().split('T')[0],
      })).filter(l => l.nome);
      
      const { data, error } = await supabase.from('leads').insert(formattedLeads).select();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success(`${data.length} leads importados com sucesso!`);
    },
    onError: () => toast.error('Erro ao importar leads.'),
  });
}
