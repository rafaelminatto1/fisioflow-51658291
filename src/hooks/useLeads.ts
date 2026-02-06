/**
 * useLeads - Migrated to Firebase
 *
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query as firestoreQuery, where, orderBy, serverTimestamp, db } from '@/integrations/firebase/app';
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

// Helper
const convertDoc = <T>(doc: { id: string; data: () => Record<string, unknown> }): T => ({ id: doc.id, ...doc.data() } as T);

export function useLeads(estagio?: string) {
  return useQuery({
    queryKey: ['leads', estagio],
    queryFn: async () => {
      let q = firestoreQuery(collection(db, 'leads'), orderBy('created_at', 'desc'));

      if (estagio) {
        q = firestoreQuery(
          collection(db, 'leads'),
          where('estagio', '==', estagio),
          orderBy('created_at', 'desc')
        );
      }

      const snapshot = await getDocs(q);

      // Select fields manually (client-side filtering of fields not possible in standard query, but we get full doc)
      return snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          nome: data.nome,
          estagio: data.estagio,
          origem: data.origem,
          responsavel_id: data.responsavel_id,
          data_ultimo_contato: data.data_ultimo_contato,
          // We return full object or partial based on interface? The original code returned partial.
          // Typescript will check, but we are casting to Lead[]
          ...data
        } as Lead;
      });
    },
  });
}

export function useLeadHistorico(leadId: string | undefined) {
  return useQuery({
    queryKey: ['lead-historico', leadId],
    queryFn: async () => {
      if (!leadId) return [];

      const q = firestoreQuery(
        collection(db, 'lead_historico'),
        where('lead_id', '==', leadId),
        orderBy('created_at', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(convertDoc) as LeadHistorico[];
    },
    enabled: !!leadId,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (lead: Omit<Lead, 'id' | 'created_at'>) => {
      const docRef = await addDoc(collection(db, 'leads'), {
        ...lead,
        created_at: new Date().toISOString()
      });
      const newDoc = await getDoc(docRef);
      return convertDoc(newDoc);
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
      const docRef = doc(db, 'leads', id);
      await updateDoc(docRef, lead);
      const updatedDoc = await getDoc(docRef);
      return convertDoc(updatedDoc);
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
      await deleteDoc(doc(db, 'leads', id));
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
      // Add history
      const histRef = await addDoc(collection(db, 'lead_historico'), {
        ...historico,
        created_at: new Date().toISOString()
      });

      // Update lead
      if (historico.lead_id) {
        const leadRef = doc(db, 'leads', historico.lead_id);
        await updateDoc(leadRef, {
          data_ultimo_contato: new Date().toISOString().split('T')[0]
        });
      }

      const newDoc = await getDoc(histRef);
      return convertDoc(newDoc);
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
      const q = firestoreQuery(collection(db, 'leads'));
      const snapshot = await getDocs(q);
      const leads = snapshot.docs.map(convertDoc) as Lead[];

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

