import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Lead {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  origem: string | null;
  estagio: 'aguardando' | 'em_contato' | 'avaliacao_agendada' | 'avaliacao_realizada' | 'efetivado' | 'nao_efetivado';
  responsavel_id: string | null;
  data_primeiro_contato: string | null;
  data_ultimo_contato: string | null;
  interesse: string | null;
  observacoes: string | null;
  motivo_nao_efetivacao: string | null;
  created_at: string;
}

export interface LeadHistorico {
  id: string;
  lead_id: string;
  tipo_contato: string;
  descricao: string | null;
  resultado: string | null;
  proximo_contato: string | null;
  created_at: string;
}

export function useLeads(estagio?: string) {
  return useQuery({
    queryKey: ['leads', estagio],
    queryFn: async () => {
      let query = supabase.from('leads').select('*').order('created_at', { ascending: false });
      if (estagio) query = query.eq('estagio', estagio);
      const { data, error } = await query;
      if (error) throw error;
      return data as Lead[];
    },
  });
}

export function useLeadHistorico(leadId: string | undefined) {
  return useQuery({
    queryKey: ['lead-historico', leadId],
    queryFn: async () => {
      if (!leadId) return [];
      const { data, error } = await supabase
        .from('lead_historico')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as LeadHistorico[];
    },
    enabled: !!leadId,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (lead: Omit<Lead, 'id' | 'created_at'>) => {
      const { data, error } = await supabase.from('leads').insert(lead).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead cadastrado com sucesso.');
    },
    onError: () => toast.error('Erro ao cadastrar lead.'),
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...lead }: Partial<Lead> & { id: string }) => {
      const { data, error } = await supabase.from('leads').update(lead).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead atualizado.');
    },
    onError: () => toast.error('Erro ao atualizar lead.'),
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead excluído.');
    },
    onError: () => toast.error('Erro ao excluir lead.'),
  });
}

export function useAddLeadHistorico() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (historico: Omit<LeadHistorico, 'id' | 'created_at'>) => {
      const { data, error } = await supabase.from('lead_historico').insert(historico).select().single();
      if (error) throw error;
      // Atualizar data do último contato
      await supabase.from('leads').update({ data_ultimo_contato: new Date().toISOString().split('T')[0] }).eq('id', historico.lead_id);
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['lead-historico', vars.lead_id] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Histórico adicionado.');
    },
    onError: () => toast.error('Erro ao adicionar histórico.'),
  });
}

// Métricas do funil
export function useLeadMetrics() {
  return useQuery({
    queryKey: ['lead-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase.from('leads').select('estagio, origem');
      if (error) throw error;
      
      const leads = data as Pick<Lead, 'estagio' | 'origem'>[];
      const total = leads.length;
      const porEstagio = {
        aguardando: leads.filter(l => l.estagio === 'aguardando').length,
        em_contato: leads.filter(l => l.estagio === 'em_contato').length,
        avaliacao_agendada: leads.filter(l => l.estagio === 'avaliacao_agendada').length,
        avaliacao_realizada: leads.filter(l => l.estagio === 'avaliacao_realizada').length,
        efetivado: leads.filter(l => l.estagio === 'efetivado').length,
        nao_efetivado: leads.filter(l => l.estagio === 'nao_efetivado').length,
      };
      const taxaConversao = total > 0 ? (porEstagio.efetivado / total * 100).toFixed(1) : '0';
      
      return { total, porEstagio, taxaConversao };
    },
  });
}
