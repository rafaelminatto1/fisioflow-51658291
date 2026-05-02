/**
 * NFSe Page Content - Premium UX/UI Experience
 * Built with superior design standards for Mooca Fisio.
 */

import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { TUSS_FISIO_LIST } from "@/constants/tuss-codes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Info, 
  HelpCircle,
  FileText, 
  Plus, 
  Download, 
  Eye, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Search,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  Zap,
  Activity
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizations } from "@/hooks/useOrganizations";
import { type NFSeRecord, request } from "@/api/v2";
import { appointmentsApi } from "@/api/v2/appointments";
import { MainLayout } from "@/components/layout/MainLayout";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { PatientCombobox } from "@/components/ui/patient-combobox";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AppointmentRow } from "@/types/workers";

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

function normalizeNFSe(row: any): NFSe {
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

const statusConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
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

function StatCard({ title, value, icon: Icon, color, trend }: { title: string, value: string, icon: any, color: string, trend?: string }) {
  return (
    <Card className="rounded-[2rem] border-none shadow-sm p-6 bg-white dark:bg-slate-900/50 flex flex-col justify-between hover:shadow-xl hover:shadow-slate-100 transition-all duration-500 group">
      <div className="flex items-center justify-between">
        <div className={cn("p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 transition-colors group-hover:bg-slate-900 group-hover:text-white", color)}>
          <Icon className="h-5 w-5" />
        </div>
        {trend && (
          <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-widest">
            {trend}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{title}</p>
        <h4 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1">{value}</h4>
      </div>
    </Card>
  );
}

export function NFSeContent({ autoOpenCreate = false, onAutoOpenHandled }: { autoOpenCreate?: boolean; onAutoOpenHandled?: () => void } = {}) {
  const { currentOrganization: orgData } = useOrganizations();
  const organizationId = orgData?.id;
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"lista" | "config">("lista");
  const [selectedNFSe, setSelectedNFSe] = useState<NFSe | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [tussCode, setTussCode] = useState("50000144");
  const [pricePerSession, setPricePerSession] = useState("170.00");
  const [useTemplate, setUseTemplate] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const [formData, setFormData] = useState({
    valor: "",
    destinatario_nome: "",
    destinatario_cpf_cnpj: "",
    servico_descricao: "",
  });

  // Fetch patient sessions
  const { data: patientSessions = [], isLoading: isLoadingSessions } = useQuery({
    queryKey: ["patient-sessions", selectedPatientId],
    queryFn: async () => {
      if (!selectedPatientId) return [];
      const res = await appointmentsApi.list({ 
        patientId: selectedPatientId,
        status: "atendido",
        limit: 50 
      });
      return res.data || [];
    },
    enabled: !!selectedPatientId && isDialogOpen,
  });

  useEffect(() => {
    if (autoOpenCreate) {
      setIsDialogOpen(true);
      onAutoOpenHandled?.();
    }
  }, [autoOpenCreate, onAutoOpenHandled]);

  // Update description and value when sessions, patient or TUSS change
  useEffect(() => {
    if (!formData.destinatario_nome || !useTemplate) return;

    const today = new Date().toLocaleDateString("pt-BR");
    const selectedSessions = patientSessions.filter(s => selectedSessionIds.includes(s.id));
    const count = selectedSessions.length;
    
    if (count > 0) {
      // Multiple or Single selected sessions from list
      const dates = selectedSessions
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map(s => {
          const d = new Date(s.date).toLocaleDateString("pt-BR");
          return `${d} (realizou o código TUSS: ${tussCode})`;
        });

      const totalVal = (count * parseFloat(pricePerSession)).toFixed(2);
      
      let desc = `Paciente ${formData.destinatario_nome}, CPF ${formData.destinatario_cpf_cnpj || "[CPF]"}, realizou ${count} sessão${count > 1 ? "es" : ""} de fisioterapia musculoesquelética nos dias `;
      
      if (count === 1) {
        desc += dates[0];
      } else {
        const lastDate = dates.pop();
        desc += dates.join(", ") + " e " + lastDate;
      }
      
      desc += `.\n\nEfetuou o pagamento no valor de R$ ${parseFloat(totalVal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} correspondentes a R$ ${parseFloat(pricePerSession).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} de cada sessão para a empresa Mooca Fisioterapia RA Ltda, CNPJ: 54.836.577/0001-67.\n\n- Conforme Lei 12.741/2012, o percentual total de impostos incidentes neste serviço prestado é de aproximadamente 8,98%`;

      setFormData(prev => ({ 
        ...prev, 
        servico_descricao: desc,
        valor: totalVal
      }));
    } else {
      // Default template for manual entry
      const valParsed = parseFloat(formData.valor || "0");
      const valorStr = valParsed > 0 ? ` no valor de R$ ${valParsed.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "";
      const template = `Paciente ${formData.destinatario_nome || "[NOME]"}, realizou sessão de fisioterapia no dia ${today}${valorStr}.\n\n- Conforme Lei 12.741/2012, o percentual total de impostos incidentes neste serviço prestado é de aproximadamente 8,98%`;
      setFormData(prev => ({ ...prev, servico_descricao: template }));
    }
  }, [formData.destinatario_nome, selectedSessionIds, tussCode, pricePerSession, patientSessions, useTemplate]);

  const { data: nfses = [], isLoading } = useQuery({
    queryKey: ["nfse-list", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const response = await request<any>("/api/nfse");
      return (response.data ?? [])
        .map((row) => normalizeNFSe(row))
        .sort((a, b) => b.data_emissao.localeCompare(a.data_emissao));
    },
    enabled: !!organizationId,
  });

  const stats = useMemo(() => {
    const month = new Date().getMonth();
    const thisMonth = nfses.filter(n => new Date(n.data_emissao).getMonth() === month);
    const authorized = thisMonth.filter(n => n.status === 'autorizado');
    const totalValue = authorized.reduce((acc, n) => acc + n.valor, 0);
    const pending = nfses.filter(n => n.status === 'aguardando_prefeitura' || n.status === 'aguardando_internet').length;
    
    return {
      monthlyValue: totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
      monthlyCount: authorized.length,
      pendingCount: pending,
      successRate: nfses.length > 0 ? Math.round((nfses.filter(n => n.status === 'autorizado').length / nfses.filter(n => n.status !== 'rascunho').length) * 100) : 100
    };
  }, [nfses]);

  const createNFSe = useMutation({
    mutationFn: async (data: typeof formData) => {
      const val = parseFloat(data.valor.replace(",", "."));
      if (isNaN(val)) throw new Error("Valor inválido");

      // 1. Gerar rascunho
      const response = await request<any>("/api/nfse/generate", {
        method: "POST",
        body: JSON.stringify({
          valor_servico: val,
          discriminacao: data.servico_descricao,
          tomador_nome: data.destinatario_nome,
          tomador_cpf_cnpj: data.destinatario_cpf_cnpj,
        }),
      });

      const nfseId = response.data.id;

      if (!isOnline) {
        toast.info("Você está offline. A nota foi salva como rascunho.");
        return normalizeNFSe(response.data);
      }

      // 2. Enviar para PMSP (Workflow)
      await request<any>(`/api/nfse/send/${nfseId}`, { method: "POST" });
      return normalizeNFSe(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nfse-list", organizationId] });
      toast.success("NFS-e gerada!", {
        description: isOnline ? "Transmitindo para a prefeitura..." : "Aguardando conexão."
      });
      setIsDialogOpen(false);
      setFormData({ valor: "", destinatario_nome: "", destinatario_cpf_cnpj: "", servico_descricao: "" });
      setSelectedPatientId(null);
      setSelectedSessionIds([]);
    },
    onError: (err: any) => {
      toast.error("Falha ao gerar rascunho", { description: err.message });
    }
  });

  const cancelNFSe = useMutation({
    mutationFn: async (id: string) => {
      const response = await request<any>(`/api/nfse/cancel/${id}`, {
        method: "POST"
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nfse-list", organizationId] });
      toast.success("Cancelamento solicitado!", {
        description: "A prefeitura foi notificada e processará o pedido."
      });
      setSelectedNFSe(null);
    },
    onError: (err: any) => {
      toast.error("Falha no cancelamento", { description: err.message });
    }
  });

  return (
    <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <motion.div 
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="p-3 rounded-2xl bg-slate-900 text-white shadow-2xl shadow-slate-200 dark:shadow-none"
            >
              <FileText className="h-6 w-6" />
            </motion.div>
            <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white font-display">
              Faturamento <span className="text-slate-400">Premium</span>
            </h2>
          </div>
          <p className="text-slate-500 font-medium max-w-md leading-relaxed">
            Interface de alta performance para emissão e controle de NFS-e integrada à Nota do Milhão.
          </p>
        </div>

        <motion.div whileHover={{ scale: 1.02 }} whileActive={{ scale: 0.98 }}>
          <Button 
            onClick={() => setIsDialogOpen(true)} 
            className="rounded-[1.5rem] h-16 px-10 bg-slate-900 hover:bg-slate-800 text-white shadow-2xl shadow-slate-200 dark:shadow-none transition-all group border-none text-lg"
          >
            <Plus className="mr-2 h-6 w-6 transition-transform group-hover:rotate-90 duration-500" />
            <span className="font-black tracking-tight">Nova Nota Fiscal</span>
          </Button>
        </motion.div>
      </div>

      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Faturamento (Mês)" 
          value={`R$ ${stats.monthlyValue}`} 
          icon={TrendingUp} 
          color="text-emerald-600" 
          trend="+12%"
        />
        <StatCard 
          title="Notas Emitidas" 
          value={String(stats.monthlyCount)} 
          icon={FileText} 
          color="text-blue-600" 
        />
        <StatCard 
          title="Em Processamento" 
          value={String(stats.pendingCount)} 
          icon={Activity} 
          color="text-amber-600" 
        />
        <StatCard 
          title="Taxa de Sucesso" 
          value={`${stats.successRate}%`} 
          icon={Zap} 
          color="text-indigo-600" 
        />
      </div>

      {/* TABS SECTION */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-px overflow-x-auto custom-scrollbar">
          <TabsList className="bg-transparent h-auto p-0 gap-10">
            <TabsTrigger
              value="lista"
              className="px-0 py-6 rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent font-black text-xs text-slate-400 data-[state=active]:text-slate-900 transition-all uppercase tracking-[0.25em]"
            >
              Histórico Digital
            </TabsTrigger>
            <TabsTrigger
              value="config"
              className="px-0 py-6 rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent font-black text-xs text-slate-400 data-[state=active]:text-slate-900 transition-all uppercase tracking-[0.25em]"
            >
              Parâmetros Fiscais
            </TabsTrigger>
          </TabsList>
        </div>

        <AnimatePresence mode="wait">
          <TabsContent value="lista" className="mt-10 outline-none">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-100/50 dark:shadow-none overflow-hidden"
            >
              <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/30">
                 <h3 className="font-black text-xs uppercase tracking-[0.3em] text-slate-400">Fluxo de Documentos</h3>
                 <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="h-8 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400">Filtrar</Button>
                    <Button variant="ghost" size="sm" className="h-8 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400">Exportar</Button>
                 </div>
              </div>
              <ScrollArea className="max-h-[600px]">
                <Table>
                  <TableHeader className="bg-slate-50/50 dark:bg-slate-800/30 sticky top-0 z-10">
                    <TableRow className="border-none hover:bg-transparent">
                      <TableHead className="px-10 py-6 font-black text-[9px] uppercase tracking-[0.3em] text-slate-400">Nº / Emissão</TableHead>
                      <TableHead className="px-8 py-6 font-black text-[9px] uppercase tracking-[0.3em] text-slate-400">Destinatário</TableHead>
                      <TableHead className="px-8 py-6 font-black text-[9px] uppercase tracking-[0.3em] text-slate-400">Valor Bruto</TableHead>
                      <TableHead className="px-8 py-6 font-black text-[9px] uppercase tracking-[0.3em] text-slate-400">Situação PMSP</TableHead>
                      <TableHead className="px-10 py-6 text-right font-black text-[9px] uppercase tracking-[0.3em] text-slate-400">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-32">
                          <div className="flex flex-col items-center gap-4">
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                               <Clock className="h-10 w-10 text-slate-200" />
                            </motion.div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Sincronizando registros...</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : nfses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-32 text-slate-400">
                          <p className="text-sm font-bold opacity-30">Nenhum documento emitido nesta competência.</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      nfses.map((nfse, idx) => {
                        const status = statusConfig[nfse.status] || statusConfig.rascunho;
                        const StatusIcon = status.icon;
                        return (
                          <motion.tr 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            key={nfse.id} 
                            className="group border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all duration-300"
                          >
                            <TableCell className="px-10 py-8">
                              <div className="flex flex-col gap-1">
                                <span className="font-mono font-black text-slate-900 dark:text-white text-lg tracking-tighter leading-none">
                                  {nfse.numero}
                                </span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                  {new Date(nfse.data_emissao).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="px-8 py-8">
                              <div className="flex flex-col">
                                <span className="font-black text-slate-800 dark:text-slate-200 truncate max-w-[280px] tracking-tight">
                                  {nfse.destinatario.nome}
                                </span>
                                <span className="text-[10px] font-mono font-medium text-slate-400 mt-1">
                                  {nfse.destinatario.cnpj_cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4")}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="px-8 py-8">
                              <span className="font-black text-slate-900 dark:text-white text-base">
                                R$ {nfse.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </span>
                            </TableCell>
                            <TableCell className="px-8 py-8">
                              <div className={cn("inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl shadow-sm border border-transparent transition-all group-hover:shadow-md", status.bg, status.color)}>
                                <StatusIcon className={cn("h-3.5 w-3.5", nfse.status === 'aguardando_prefeitura' ? "animate-spin" : "")} />
                                <span className="text-[10px] font-black uppercase tracking-[0.15em]">{status.label}</span>
                              </div>
                            </TableCell>
                            <TableCell className="px-10 py-8 text-right">
                              <div className="flex justify-end gap-2">
                                {nfse.link_nfse && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-10 w-10 rounded-2xl hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl transition-all group/btn border border-transparent hover:border-slate-100"
                                    onClick={() => window.open(nfse.link_nfse, "_blank")}
                                  >
                                    <ExternalLink className="h-4 w-4 text-slate-400 group-hover/btn:text-slate-900 dark:group-hover/btn:text-white" />
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-10 w-10 rounded-2xl hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl transition-all group/btn border border-transparent hover:border-slate-100"
                                  onClick={() => setSelectedNFSe(nfse)}
                                >
                                  <ChevronRight className="h-5 w-5 text-slate-300 group-hover/btn:text-slate-900 dark:group-hover/btn:text-white group-hover/btn:translate-x-0.5 transition-all" />
                                </Button>
                              </div>
                            </TableCell>
                          </motion.tr>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </motion.div>
          </TabsContent>

          <TabsContent value="config" className="mt-10 outline-none">
            <motion.div 
               initial={{ opacity: 0, scale: 0.98 }}
               animate={{ opacity: 1, scale: 1 }}
               className="grid grid-cols-1 md:grid-cols-2 gap-8"
            >
              <Card className="rounded-[3rem] border-none shadow-sm p-12 bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center text-center space-y-8 border border-slate-100">
                <div className="h-20 w-20 rounded-[2rem] bg-white dark:bg-slate-800 shadow-2xl flex items-center justify-center">
                  <ShieldCheck className="h-10 w-10 text-slate-900 dark:text-white" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-black tracking-tight font-display">Identidade Fiscal</h3>
                  <p className="text-slate-500 max-w-sm font-medium leading-relaxed">
                    Sua conta está operando sob as diretrizes tributárias de São Paulo (Simples Nacional).
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-4">
                  <Badge className="rounded-2xl px-5 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-none shadow-sm font-black text-xs uppercase tracking-widest">CNPJ 54.836.577/0001-67</Badge>
                  <Badge className="rounded-2xl px-5 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-none shadow-sm font-black text-xs uppercase tracking-widest">Serviço 04391</Badge>
                </div>
                <Button variant="outline" className="rounded-2xl h-14 px-8 font-black border-slate-200 hover:bg-slate-900 hover:text-white transition-all uppercase tracking-widest text-[10px]">
                  Configurações do Prestador
                </Button>
              </Card>

              <Card className="rounded-[3rem] border-none shadow-sm p-12 bg-emerald-50 dark:bg-emerald-950/20 flex flex-col items-center text-center space-y-8 border border-emerald-100/50">
                <div className="h-20 w-20 rounded-[2rem] bg-white dark:bg-slate-800 shadow-2xl flex items-center justify-center">
                  <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 3 }}>
                    <ExternalLink className="h-10 w-10 text-emerald-600" />
                  </motion.div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-black tracking-tight font-display">Hub Contabilidade</h3>
                  <p className="text-slate-500 max-w-sm font-medium leading-relaxed text-sm">
                    Integração ativa com a <strong>Contabilizei</strong>. Cada nota emitida é enviada instantaneamente.
                  </p>
                </div>
                <div className="space-y-4 w-full max-w-xs">
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 text-left border border-emerald-100 dark:border-emerald-900 shadow-sm">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Canal de Entrega</p>
                    <p className="text-sm font-black text-slate-700 dark:text-slate-200 mt-1">rafael.minatto@yahoo.com.br</p>
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
                    <span className="text-[11px] font-black text-emerald-700 uppercase tracking-[0.25em]">Automação Full-time</span>
                  </div>
                </div>
                <Button className="rounded-2xl h-14 px-8 font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-200 dark:shadow-none transition-all uppercase tracking-widest text-[10px]">
                  Painel de Integração
                </Button>
              </Card>
            </motion.div>
          </TabsContent>
        </AnimatePresence>
      </Tabs>

      {/* EMISSION DIALOG - REDESIGNED FOR 2026 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-[3rem] max-w-5xl p-0 overflow-hidden border-none shadow-[0_40px_100px_rgba(0,0,0,0.15)] flex flex-col md:flex-row h-[90vh] md:h-auto">
          {/* LEFT: FORMS */}
          <div className="flex-[1.5] flex flex-col bg-white dark:bg-slate-900">
            <div className="bg-slate-900 p-10 text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
               <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="relative z-10">
                 <div className="flex items-center gap-3 mb-3">
                   <div className="bg-emerald-500/20 p-2 rounded-xl backdrop-blur-md">
                     <Zap className="h-5 w-5 text-emerald-400 fill-emerald-400" />
                   </div>
                   <h3 className="text-2xl font-black tracking-tight font-display italic">Mestre de Emissão</h3>
                 </div>
                 <p className="text-slate-400 font-medium text-sm max-w-md">
                   Sincronize atendimentos e autorize notas fiscais em segundos com suporte à Reforma Tributária.
                 </p>
               </motion.div>
            </div>

            <ScrollArea className="flex-1 p-10 custom-scrollbar">
              <div className="space-y-10">
                {/* STEP 1 */}
                <section className="space-y-5">
                   <div className="flex items-center gap-3">
                      <span className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400">01</span>
                      <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Tomador do Serviço</h4>
                   </div>
                   <PatientCombobox 
                    onSelect={(patient) => {
                      setSelectedPatientId(patient.id);
                      setFormData(prev => ({
                        ...prev,
                        destinatario_nome: patient.name,
                        destinatario_cpf_cnpj: patient.cpf || "",
                      }));
                      setSelectedSessionIds([]);
                    }}
                  />
                </section>

                <AnimatePresence>
                  {selectedPatientId && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-10"
                    >
                      {/* STEP 2 */}
                      <section className="space-y-5">
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                               <span className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400">02</span>
                               <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Sessões & Procedimento</h4>
                            </div>
                            <div className="flex items-center gap-4">
                               <Select value={tussCode} onValueChange={setTussCode}>
                                 <SelectTrigger className="h-9 w-40 text-[9px] font-black uppercase tracking-widest rounded-xl bg-slate-50 border-none shadow-none ring-0">
                                   <SelectValue />
                                 </SelectTrigger>
                                 <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                                    {TUSS_FISIO_LIST.map((tuss) => (
                                      <SelectItem key={tuss.code} value={tuss.code} className="text-[10px] font-bold py-3 rounded-xl focus:bg-slate-50">
                                        {tuss.code} - {tuss.label}
                                      </SelectItem>
                                    ))}
                                 </SelectContent>
                               </Select>
                            </div>
                         </div>

                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                           {isLoadingSessions ? (
                             Array(4).fill(0).map((_, i) => (
                               <div key={i} className="h-14 rounded-2xl bg-slate-50 animate-pulse" />
                             ))
                           ) : patientSessions.length === 0 ? (
                             <div className="col-span-full py-8 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                <Calendar className="h-6 w-6 text-slate-300 mx-auto mb-2" />
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nenhuma sessão atendida</p>
                             </div>
                           ) : (
                             patientSessions.map((session) => (
                               <motion.div 
                                 whileHover={{ scale: 1.02 }}
                                 key={session.id}
                                 onClick={() => {
                                   setSelectedSessionIds(prev => 
                                     prev.includes(session.id) ? prev.filter(id => id !== session.id) : [...prev, session.id]
                                   );
                                 }}
                                 className={cn(
                                   "p-4 rounded-2xl cursor-pointer border-2 transition-all flex items-center justify-between",
                                   selectedSessionIds.includes(session.id) 
                                     ? "bg-emerald-50 border-emerald-500 shadow-md shadow-emerald-100" 
                                     : "bg-slate-50 border-transparent grayscale opacity-60 hover:grayscale-0 hover:opacity-100"
                                 )}
                               >
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight">
                                      {new Date(session.date).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short' })}
                                    </span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">{session.startTime}</span>
                                  </div>
                                  <div className={cn("h-5 w-5 rounded-full flex items-center justify-center transition-colors", selectedSessionIds.includes(session.id) ? "bg-emerald-500 text-white" : "bg-slate-200")}>
                                     {selectedSessionIds.includes(session.id) && <CheckCircle2 className="h-3 w-3" />}
                                  </div>
                               </motion.div>
                             ))
                           )}
                         </div>
                      </section>

                      {/* STEP 3 */}
                      <section className="space-y-5">
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                               <span className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400">03</span>
                               <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Valores & Revisão</h4>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-500 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => setUseTemplate(!useTemplate)}>
                               <span className="text-[9px] font-black uppercase tracking-widest">{useTemplate ? 'Auto' : 'Manual'}</span>
                            </div>
                         </div>

                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Valor Unitário</Label>
                              <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">R$</span>
                                <Input
                                  type="number"
                                  className="rounded-xl h-12 pl-10 bg-slate-50 border-none font-black text-base focus-visible:ring-emerald-500"
                                  value={pricePerSession}
                                  onChange={(e) => setPricePerSession(e.target.value)}
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Total da Nota</Label>
                              <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">R$</span>
                                <Input
                                  type="number"
                                  className="rounded-xl h-12 pl-10 bg-slate-50 border-none font-black text-base text-slate-900"
                                  value={formData.valor}
                                  onChange={(e) => setFormData(p => ({ ...p, valor: e.target.value }))}
                                />
                              </div>
                            </div>
                         </div>

                         <div className="space-y-2">
                           <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Discriminação detalhada</Label>
                           <Textarea
                             className="rounded-2xl min-h-[140px] bg-slate-50 border-none font-medium text-[11px] leading-relaxed resize-none p-5 custom-scrollbar focus-visible:ring-emerald-500"
                             value={formData.servico_descricao}
                             onChange={(e) => setFormData(p => ({ ...p, servico_descricao: e.target.value }))}
                           />
                         </div>
                      </section>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </ScrollArea>

            <DialogFooter className="p-8 border-t border-slate-50 dark:border-slate-800 bg-slate-50/30 flex items-center justify-between gap-4">
                <Button variant="ghost" className="rounded-2xl h-14 px-8 font-black text-slate-400 uppercase tracking-widest text-[10px]" onClick={() => setIsDialogOpen(false)}>
                  Descartar
                </Button>
                <Button 
                  className="rounded-2xl h-14 px-12 bg-slate-900 hover:bg-slate-800 text-white shadow-2xl shadow-slate-200 dark:shadow-none transition-all font-black uppercase tracking-[0.2em] text-[10px] active:scale-95"
                  onClick={() => createNFSe.mutate(formData)}
                  disabled={createNFSe.isPending || !formData.valor || !formData.destinatario_nome}
                >
                  {createNFSe.isPending ? "Processando..." : "Autorizar Transmissão"}
                </Button>
            </DialogFooter>
          </div>

          {/* RIGHT: PREVIEW (DESKTOP) */}
          <div className="hidden lg:flex flex-1 bg-slate-50 dark:bg-slate-950/50 p-12 border-l border-slate-100 dark:border-slate-800 flex-col items-center justify-center relative overflow-hidden">
             <div className="absolute top-10 left-10 p-2 rounded-xl bg-white/80 backdrop-blur-md shadow-sm border border-slate-100">
               <Eye className="h-4 w-4 text-slate-400" />
             </div>
             
             <motion.div 
               layout
               className="w-full max-w-sm aspect-[3/4] bg-white dark:bg-slate-900 shadow-[0_50px_100px_rgba(0,0,0,0.1)] rounded-sm p-8 flex flex-col gap-6 relative"
             >
                <div className="flex justify-between items-start">
                   <div className="space-y-1">
                      <div className="w-16 h-3 bg-slate-900 dark:bg-slate-100 rounded-full opacity-20" />
                      <div className="w-24 h-2 bg-slate-900 dark:bg-slate-100 rounded-full opacity-10" />
                   </div>
                   <div className="text-right space-y-1">
                      <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">NFS-e Digital</p>
                      <p className="text-xs font-mono font-black italic">PROVISÓRIA</p>
                   </div>
                </div>

                <div className="h-px bg-slate-100 dark:bg-slate-800" />

                <div className="space-y-4 flex-1">
                   <div className="space-y-2">
                      <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Prestador</p>
                      <p className="text-[10px] font-black leading-none">MOOCA FISIOTERAPIA RA LTDA</p>
                   </div>
                   <div className="space-y-2">
                      <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Tomador</p>
                      <p className="text-[10px] font-black leading-none truncate">{formData.destinatario_nome || "Aguardando seleção..."}</p>
                   </div>
                   <div className="space-y-2 pt-4">
                      <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Discriminação</p>
                      <div className="space-y-1">
                         <div className="w-full h-1.5 bg-slate-50 dark:bg-slate-800 rounded-full" />
                         <div className="w-full h-1.5 bg-slate-50 dark:bg-slate-800 rounded-full" />
                         <div className="w-2/3 h-1.5 bg-slate-50 dark:bg-slate-800 rounded-full" />
                      </div>
                   </div>
                </div>

                <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
                   <div className="flex justify-between items-end">
                      <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Valor Total</p>
                      <p className="text-2xl font-black italic tracking-tighter leading-none">R$ {parseFloat(formData.valor || "0").toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                   </div>
                </div>
                
                {/* STAMP */}
                <div className="absolute bottom-10 right-10 w-16 h-16 border-4 border-slate-100 dark:border-slate-800 rounded-full flex items-center justify-center rotate-[-15deg] opacity-20">
                   <p className="text-[8px] font-black uppercase text-center">FisioFlow<br/>Verified</p>
                </div>
             </motion.div>
             
             <p className="mt-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Pré-visualização em tempo real</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* VIEW DETAILS DIALOG */}
      <Dialog open={!!selectedNFSe} onOpenChange={(o) => !o && setSelectedNFSe(null)}>
        <DialogContent className="rounded-[3rem] max-w-lg p-0 overflow-hidden border-none shadow-2xl">
          {selectedNFSe && (
            <div className="flex flex-col h-full bg-white dark:bg-slate-900">
               <div className="bg-slate-50 dark:bg-slate-800/50 p-12 text-center relative">
                  <div className="absolute top-6 left-1/2 -translate-x-1/2">
                    <div className={cn("inline-flex items-center gap-2 px-5 py-1.5 rounded-full shadow-sm font-black uppercase tracking-[0.2em] text-[10px]", statusConfig[selectedNFSe.status]?.bg, statusConfig[selectedNFSe.status]?.color)}>
                        {statusConfig[selectedNFSe.status]?.label}
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Nota Fiscal Eletrônica</p>
                    <h3 className="text-5xl font-black tracking-tighter italic text-slate-900 dark:text-white">Nº {selectedNFSe.numero}</h3>
                  </div>

                  {selectedNFSe.status === 'falhou' && selectedNFSe.ultimo_erro && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mt-6 p-5 rounded-2xl bg-red-50 dark:bg-red-950/20 text-red-600 border border-red-100 dark:border-red-900/50 text-[11px] font-bold leading-relaxed">
                       <p className="uppercase tracking-widest text-[9px] mb-2 opacity-50 flex items-center justify-center gap-1"><AlertCircle className="h-3 w-3" /> Erro na Transmissão</p>
                       {selectedNFSe.ultimo_erro}
                    </motion.div>
                  )}
               </div>

               <div className="p-10 space-y-8 flex-1">
                  <div className="grid grid-cols-2 gap-10">
                     <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Data de Emissão</p>
                        <p className="font-bold text-slate-700 dark:text-slate-200">{new Date(selectedNFSe.data_emissao).toLocaleString("pt-BR")}</p>
                     </div>
                     <div className="space-y-1 text-right">
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Cód. Verificação</p>
                        <p className="font-mono font-bold text-slate-900 dark:text-white uppercase">{selectedNFSe.codigo_verificacao || "Pendente"}</p>
                     </div>
                  </div>

                  <div className="space-y-5">
                    <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">Tomador</p>
                        <p className="font-black text-slate-900 dark:text-white text-lg tracking-tight">{selectedNFSe.destinatario.nome}</p>
                        <p className="text-xs font-mono font-medium text-slate-500 mt-0.5">{selectedNFSe.destinatario.cnpj_cpf}</p>
                    </div>

                    <div className="p-8 rounded-[2rem] bg-slate-900 text-white shadow-2xl relative overflow-hidden">
                       <div className="absolute top-0 right-0 p-4 opacity-10">
                          <Activity className="h-20 w-20" />
                       </div>
                       <div className="space-y-4 relative z-10">
                          <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-slate-400">
                            <span>Valor dos Serviços</span>
                            <span className="text-white">R$ {selectedNFSe.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-slate-400">
                            <span>Impostos Detidos</span>
                            <span className="text-white">Isento / Simples</span>
                          </div>
                          <div className="pt-6 border-t border-white/10 flex justify-between items-end">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">Total Líquido</span>
                            <span className="text-4xl font-black tracking-tighter italic leading-none">R$ {selectedNFSe.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                          </div>
                       </div>
                    </div>
                  </div>
               </div>

               <div className="p-10 pt-0 grid grid-cols-2 gap-4">
                  <Button 
                    variant="outline" 
                    className="rounded-2xl h-16 font-black uppercase tracking-widest text-[10px] border-slate-100 dark:border-slate-800"
                    onClick={() => selectedNFSe.link_nfse && window.open(selectedNFSe.link_nfse, "_blank")}
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir
                  </Button>
                  {selectedNFSe.status !== "cancelado" && selectedNFSe.status !== "rascunho" && selectedNFSe.status !== 'falhou' ? (
                    <Button 
                      variant="destructive"
                      className="rounded-2xl h-16 font-black uppercase tracking-widest text-[10px] bg-red-50 text-red-600 border-none hover:bg-red-100 shadow-none"
                      onClick={() => {
                        if (confirm("Tem certeza que deseja cancelar esta nota fiscal? Esta ação notificará a contabilidade automaticamente.")) {
                          cancelNFSe.mutate(selectedNFSe.id);
                        }
                      }}
                      disabled={cancelNFSe.isPending}
                    >
                      {cancelNFSe.isPending ? "Cancelando..." : "Cancelar Nota"}
                    </Button>
                  ) : (
                    <Button 
                      className="rounded-2xl h-16 font-black uppercase tracking-widest text-[10px] bg-slate-900 text-white"
                      onClick={() => selectedNFSe.link_danfse && window.open(selectedNFSe.link_danfse, "_blank")}
                      disabled={!selectedNFSe.link_danfse}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      PDF Original
                    </Button>
                  )}
               </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function NFSePage() {
  return (
    <MainLayout>
      <div className="p-6 md:p-12 lg:p-20 max-w-screen-2xl mx-auto">
        <NFSeContent />
      </div>
    </MainLayout>
  );
}
