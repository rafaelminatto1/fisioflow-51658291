/**
 * useCRM - Migrated to Firebase
 *
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query as firestoreQuery, where, orderBy, limit, serverTimestamp } from '@/integrations/firebase/app';
import { toast } from 'sonner';
import { db } from '@/integrations/firebase/app';



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
  lead?: {
    nome: string;
  };
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
  leads?: {
    nome: string;
  };
  patients?: {
    full_name: string;
  };
}

// Helper to convert doc to type with id
const convertDoc = <T>(doc: { id: string; data: () => Record<string, unknown> }): T => ({ id: doc.id, ...doc.data() } as T);

// ========== TAREFAS ==========
export function useCRMTarefas(leadId?: string) {
  return useQuery({
    queryKey: ['crm-tarefas', leadId],
    queryFn: async () => {
      let q = firestoreQuery(
        collection(db, 'crm_tarefas'),
        orderBy('data_vencimento', 'asc')
      );

      if (leadId) {
        q = firestoreQuery(
          collection(db, 'crm_tarefas'),
          where('lead_id', '==', leadId),
          orderBy('data_vencimento', 'asc')
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(convertDoc) as CRMTarefa[];
    },
  });
}

export function useTarefasPendentes() {
  return useQuery({
    queryKey: ['crm-tarefas-pendentes'],
    queryFn: async () => {
      // Firestore IN query limited to 10
      const q = firestoreQuery(
        collection(db, 'crm_tarefas'),
        where('status', 'in', ['pendente', 'em_andamento']),
        orderBy('data_vencimento', 'asc'),
        limit(20)
      );

      const snapshot = await getDocs(q);
      const tarefas = snapshot.docs.map(convertDoc) as CRMTarefa[];

      // Fetch lead names manually since No-SQL doesn't join
      const tarefasWithLeads = await Promise.all(tarefas.map(async (t) => {
        if (t.lead_id) {
          try {
            const leadDoc = await getDoc(doc(db, 'leads', t.lead_id));
            if (leadDoc.exists()) {
              return { ...t, lead: { nome: leadDoc.data().nome } };
            }
          } catch (e) {
            // Ignore error
          }
        }
        return t;
      }));

      return tarefasWithLeads;
    },
  });
}

export function useCreateTarefa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tarefa: Omit<CRMTarefa, 'id' | 'created_at' | 'concluida_em'>) => {
      const docRef = await addDoc(collection(db, 'crm_tarefas'), {
        ...tarefa,
        created_at: new Date().toISOString()
      });
      const newDoc = await getDoc(docRef);
      return convertDoc(newDoc);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-tarefas'] });
      queryClient.invalidateQueries({ queryKey: ['crm-tarefas-pendentes'] });
      toast.success('Tarefa criada com sucesso.');
    },
    onError: () => toast.error('Erro ao criar tarefa.'),
  });
}

export function useUpdateTarefa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...tarefa }: Partial<CRMTarefa> & { id: string }) => {
      const docRef = doc(db, 'crm_tarefas', id);
      await updateDoc(docRef, tarefa);
      const updatedDoc = await getDoc(docRef);
      return convertDoc(updatedDoc);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-tarefas'] });
      queryClient.invalidateQueries({ queryKey: ['crm-tarefas-pendentes'] });
      toast.success('Tarefa atualizada.');
    },
    onError: () => toast.error('Erro ao atualizar tarefa.'),
  });
}

export function useConcluirTarefa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const docRef = doc(db, 'crm_tarefas', id);
      await updateDoc(docRef, {
        status: 'concluida',
        concluida_em: new Date().toISOString()
      });
      const updatedDoc = await getDoc(docRef);
      return convertDoc(updatedDoc);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-tarefas'] });
      queryClient.invalidateQueries({ queryKey: ['crm-tarefas-pendentes'] });
      toast.success('Tarefa concluída!');
    },
    onError: () => toast.error('Erro ao concluir tarefa.'),
  });
}

export function useDeleteTarefa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'crm_tarefas', id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-tarefas'] });
      queryClient.invalidateQueries({ queryKey: ['crm-tarefas-pendentes'] });
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
      const q = firestoreQuery(
        collection(db, 'crm_campanhas'),
        orderBy('created_at', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(convertDoc) as CRMCampanha[];
    },
  });
}

export function useCreateCampanha() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (campanha: Partial<CRMCampanha>) => {
      const docRef = await addDoc(collection(db, 'crm_campanhas'), {
        ...campanha,
        created_at: new Date().toISOString()
      });
      const newDoc = await getDoc(docRef);
      return convertDoc(newDoc);
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
      const docRef = doc(db, 'crm_campanhas', id);
      await updateDoc(docRef, campanha);
      const updatedDoc = await getDoc(docRef);
      return convertDoc(updatedDoc);
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
      await deleteDoc(doc(db, 'crm_campanhas', id));
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
      const q = firestoreQuery(
        collection(db, 'crm_automacoes'),
        orderBy('created_at', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(convertDoc) as CRMAutomacao[];
    },
  });
}

export function useCreateAutomacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (automacao: Partial<CRMAutomacao>) => {
      const docRef = await addDoc(collection(db, 'crm_automacoes'), {
        ...automacao,
        created_at: new Date().toISOString()
      });
      const newDoc = await getDoc(docRef);
      return convertDoc(newDoc);
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
      const docRef = doc(db, 'crm_automacoes', id);
      await updateDoc(docRef, { ativo });
      const updatedDoc = await getDoc(docRef);
      return convertDoc(updatedDoc);
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
      await deleteDoc(doc(db, 'crm_automacoes', id));
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
      const q = firestoreQuery(
        collection(db, 'crm_pesquisas_nps'),
        orderBy('respondido_em', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(convertDoc) as NPSPesquisa[];

      // Join with leads and patients
      const enrichedData = await Promise.all(
        data.map(async (item) => {
          let leadName = 'Desconhecido';
          let patientName = 'Desconhecido';

          if (item.lead_id) {
            try {
              const leadDoc = await getDoc(doc(db, 'leads', item.lead_id));
              if (leadDoc.exists()) leadName = leadDoc.data().nome;
            } catch (e) {
              // Ignore missing lead data
            }
          }
          if (item.patient_id) {
            try {
              const patientDoc = await getDoc(doc(db, 'patients', item.patient_id));
              if (patientDoc.exists()) patientName = patientDoc.data().full_name || patientDoc.data().name;
            } catch (e) {
              // Ignore missing patient data
            }
          }

          return {
            ...item,
            leads: item.lead_id ? { nome: leadName } : undefined,
            patients: item.patient_id ? { full_name: patientName } : undefined,
          };
        })
      );

      return enrichedData;
    },
  });
}

export function useNPSMetrics() {
  return useQuery({
    queryKey: ['crm-nps-metrics'],
    queryFn: async () => {
      const q = firestoreQuery(collection(db, 'crm_pesquisas_nps'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => d.data()) as { nota: number; categoria: string }[];

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
      const docRef = await addDoc(collection(db, 'crm_pesquisas_nps'), {
        ...pesquisa,
        respondido_em: pesquisa.respondido_em || new Date().toISOString()
      });
      const newDoc = await getDoc(docRef);
      return convertDoc(newDoc);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-nps'] });
      queryClient.invalidateQueries({ queryKey: ['crm-nps-metrics'] });
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
      const q = firestoreQuery(collection(db, 'leads'));
      const snapshot = await getDocs(q);
      const leads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Array<{ id: string; origem?: string; estagio?: string }>[];

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
export interface LeadImportData {
  nome?: string;
  name?: string;
  Nome?: string;
  telefone?: string;
  phone?: string;
  Telefone?: string;
  email?: string;
  Email?: string;
  origem?: string;
  Origem?: string;
  interesse?: string;
  Interesse?: string;
  observacoes?: string;
  'Observações'?: string;
}

export function useImportLeads() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (leads: Array<Partial<LeadImportData>>) => {
      const formattedLeads = leads.map(lead => ({
        nome: lead.nome || lead.name || lead.Nome || '',
        telefone: lead.telefone || lead.phone || lead.Telefone || null,
        email: lead.email || lead.Email || null,
        origem: lead.origem || lead.Origem || 'Importação',
        interesse: lead.interesse || lead.Interesse || null,
        observacoes: lead.observacoes || lead.Observações || null,
        estagio: 'aguardando',
        data_primeiro_contato: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString()
      })).filter(l => l.nome);

      // Firestore batch write or individual adds
      // For simplicity, individual adds for now, but batch is better for large imports
      const results = [];
      const batchSize = 500;

      // Since it's potentially many, we should probably do it sequentially or parallel in chunks
      // For now, simple map
      for (const lead of formattedLeads) {
        const docRef = await addDoc(collection(db, 'leads'), lead);
        results.push({ id: docRef.id, ...lead });
      }

      return results;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success(`${data.length} leads importados com sucesso!`);
    },
    onError: () => toast.error('Erro ao importar leads.'),
  });
}
