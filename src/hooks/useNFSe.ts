import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { request } from '@/lib/api/workers-client';

export interface NFSeRecord {
  id: string;
  patient_id?: string;
  appointment_id?: string;
  numero_nfse?: string;
  numero_rps: string;
  serie_rps: string;
  data_emissao: string;
  valor_servico: number;
  aliquota_iss: number;
  valor_iss?: number;
  status: 'rascunho' | 'enviado' | 'autorizado' | 'cancelado' | 'erro';
  codigo_verificacao?: string;
  link_nfse?: string;
  tomador_nome?: string;
  created_at: string;
}

export interface NFSeConfig {
  id?: string;
  razao_social: string;
  cnpj: string;
  inscricao_municipal: string;
  codigo_municipio: string;
  regime_tributario: string;
  optante_simples: boolean;
  aliquota_padrao: number;
  codigo_servico_padrao: string;
  discriminacao_padrao: string;
  ambiente: 'homologacao' | 'producao';
}

export function useNFSeRecords(params?: { patientId?: string; month?: string; status?: string }) {
  const qs = new URLSearchParams();
  if (params?.patientId) qs.set('patientId', params.patientId);
  if (params?.month) qs.set('month', params.month);
  if (params?.status) qs.set('status', params.status);
  const query = qs.toString();

  return useQuery<{ data: NFSeRecord[] }>({
    queryKey: ['nfse-records', params],
    queryFn: () => request(`/api/nfse${query ? '?' + query : ''}`),
    staleTime: 5 * 60 * 1000,
  });
}

export function useNFSeConfig() {
  return useQuery<{ data: NFSeConfig | null }>({
    queryKey: ['nfse-config'],
    queryFn: () => request('/api/nfse/config'),
    staleTime: 10 * 60 * 1000,
  });
}

export function useSaveNFSeConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cfg: Partial<NFSeConfig>) =>
      request('/api/nfse/config', { method: 'PUT', body: JSON.stringify(cfg) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nfse-config'] });
      toast.success('Configuração NFS-e salva!');
    },
    onError: (e: Error) => toast.error('Erro: ' + e.message),
  });
}

export function useGenerateNFSe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      patient_id?: string;
      appointment_id?: string;
      valor_servico: number;
      discriminacao: string;
      tomador_nome: string;
      tomador_cpf_cnpj?: string;
      tomador_email?: string;
      aliquota_iss?: number;
    }) => request('/api/nfse/generate', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nfse-records'] });
      toast.success('RPS gerado com sucesso!');
    },
    onError: (e: Error) => toast.error('Erro ao gerar NFS-e: ' + e.message),
  });
}

export function useSendNFSe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      request(`/api/nfse/send/${id}`, { method: 'POST', body: JSON.stringify({}) }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['nfse-records'] });
      const status = res?.data?.status;
      if (status === 'autorizado') {
        toast.success(`NFS-e autorizada! Nº ${res.data.numero_nfse}`);
      } else {
        toast.info('NFS-e enviada para processamento');
      }
    },
    onError: (e: Error) => toast.error('Erro ao enviar NFS-e: ' + e.message),
  });
}

export function useCancelNFSe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request(`/api/nfse/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nfse-records'] });
      toast.success('NFS-e cancelada');
    },
    onError: (e: Error) => toast.error('Erro ao cancelar: ' + e.message),
  });
}
