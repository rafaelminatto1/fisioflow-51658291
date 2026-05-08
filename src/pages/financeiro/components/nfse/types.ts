import { CheckCircle2, Clock, AlertCircle, ShieldCheck } from "lucide-react";
import { type NFSeRecord } from "@/api/v2";

export interface NFSe extends NFSeRecord {
  destinatario: {
    nome: string;
    cnpj_cpf: string;
    endereco?: string;
  };
  prestador: {
    nome: string;
    cnpj: string;
    inscricao_municipal?: string;
  };
  servico: {
    descricao: string;
    codigo_cnae: string;
    codigo_tributario: string;
    aliquota: number;
    valor_iss: number;
  };
  tentativas_envio?: number;
  ultimo_erro?: string;
  workflow_id?: string;
}

export function normalizeNFSe(row: any): NFSe {
  return {
    ...row,
    id: row.id,
    numero: row.numero_nfse || row.numero_rps || "---",
    data_emissao: row.data_emissao || row.created_at,
    valor: Number(row.valor_servico || row.valor || 0),
    status: row.status || "rascunho",
    destinatario: {
      nome: String(row.tomador_nome || row.destinatario?.nome || ""),
      cnpj_cpf: String(row.tomador_cpf_cnpj || row.destinatario?.cnpj_cpf || ""),
      endereco: row.tomador_endereco || row.destinatario?.endereco,
    },
    prestador: {
      nome: String(row.razao_social || row.prestador?.nome || ""),
      cnpj: String(row.cnpj || row.prestador?.cnpj || ""),
      inscricao_municipal: row.inscricao_municipal || row.prestador?.inscricao_municipal,
    },
    servico: {
      descricao: String(row.discriminacao || row.servico?.descricao || ""),
      codigo_cnae: String(row.cnae || row.servico?.codigo_cnae || ""),
      codigo_tributario: String(row.codigo_servico || row.servico?.codigo_tributario || ""),
      aliquota: Number(row.aliquota_iss || row.servico?.aliquota || 0),
      valor_iss: Number(row.valor_iss || row.servico?.valor_iss || 0),
    },
    link_nfse: row.link_nfse,
    link_danfse: row.link_danfse,
  };
}

export const statusConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  autorizado: { 
    label: "Autorizada", 
    icon: CheckCircle2, 
    color: "text-emerald-600", 
    bg: "bg-emerald-50 dark:bg-emerald-500/10" 
  },
  emitida: { 
    label: "Emitida", 
    icon: CheckCircle2, 
    color: "text-emerald-600", 
    bg: "bg-emerald-50 dark:bg-emerald-500/10" 
  },
  rascunho: { 
    label: "Rascunho", 
    icon: Clock, 
    color: "text-amber-600", 
    bg: "bg-amber-50 dark:bg-amber-500/10" 
  },
  aguardando_prefeitura: { 
    label: "Aguardando Prefeitura", 
    icon: Clock, 
    color: "text-blue-600", 
    bg: "bg-blue-50 dark:bg-blue-500/10" 
  },
  aguardando_internet: { 
    label: "Aguardando Internet", 
    icon: ShieldCheck, 
    color: "text-slate-600", 
    bg: "bg-slate-50 dark:bg-slate-500/10" 
  },
  falhou: { 
    label: "Falhou", 
    icon: AlertCircle, 
    color: "text-red-600", 
    bg: "bg-red-50 dark:bg-red-500/10" 
  },
  cancelada: { 
    label: "Cancelada", 
    icon: AlertCircle, 
    color: "text-slate-600", 
    bg: "bg-slate-50 dark:bg-slate-500/10" 
  },
};
