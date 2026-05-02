/**
 * NFSe Page Content - Refined Experience
 * Built with premium design standards for Mooca Fisio.
 */

import { useEffect, useState } from "react";
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
import { Info, HelpCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
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
  Layers
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
        toast.info("Você está offline. A nota foi salva como rascunho e será enviada assim que houver conexão.");
        return normalizeNFSe(response.data);
      }

      // 2. Enviar para PMSP (Workflow)
      const sendResponse = await request<any>(`/api/nfse/send/${nfseId}`, {
        method: "POST"
      });

      return normalizeNFSe(response.data); // Return draft, workflow handles the rest
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nfse-list", organizationId] });
      toast.success("NFS-e gerada!", {
        description: isOnline ? "A nota está sendo processada pela prefeitura em segundo plano." : "Salva localmente (Aguardando Internet)."
      });
      setIsDialogOpen(false);
      setFormData({ valor: "", destinatario_nome: "", destinatario_cpf_cnpj: "", servico_descricao: "" });
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
      toast.success("Nota Fiscal cancelada!", {
        description: "A prefeitura confirmou o cancelamento e a contabilidade foi notificada."
      });
      setSelectedNFSe(null);
    },
    onError: (err: any) => {
      toast.error("Falha no cancelamento", { description: err.message });
    }
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-slate-900 text-white shadow-black/20 shadow-lg">
              <FileText className="h-5 w-5" />
            </div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Gestão Fiscal
            </h2>
          </div>
          <p className="text-slate-500 font-medium max-w-md">
            Emissão de NFS-e simplificada e integrada diretamente com a prefeitura de São Paulo.
          </p>
        </div>

        <Button 
          onClick={() => setIsDialogOpen(true)} 
          className="rounded-2xl h-14 px-8 bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-200 dark:shadow-none transition-all hover:scale-[1.02] active:scale-[0.98] group"
        >
          <Plus className="mr-2 h-5 w-5 transition-transform group-hover:rotate-90" />
          <span className="font-bold tracking-tight">Nova Nota Fiscal</span>
        </Button>
      </div>

      {/* TABS SECTION */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-px">
          <TabsList className="bg-transparent h-auto p-0 gap-8">
            <TabsTrigger
              value="lista"
              className="px-0 py-4 rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent font-bold text-sm text-slate-400 data-[state=active]:text-slate-900 transition-all uppercase tracking-widest"
            >
              Histórico de Emissões
            </TabsTrigger>
            <TabsTrigger
              value="config"
              className="px-0 py-4 rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent font-bold text-sm text-slate-400 data-[state=active]:text-slate-900 transition-all uppercase tracking-widest"
            >
              Configuração Fiscal
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="lista" className="mt-8">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/50 dark:bg-slate-800/30">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="px-8 py-5 font-black text-[10px] uppercase tracking-[0.2em] text-slate-400">Nº / Data</TableHead>
                  <TableHead className="px-6 py-5 font-black text-[10px] uppercase tracking-[0.2em] text-slate-400">Tomador do Serviço</TableHead>
                  <TableHead className="px-6 py-5 font-black text-[10px] uppercase tracking-[0.2em] text-slate-400">Valor Bruto</TableHead>
                  <TableHead className="px-6 py-5 font-black text-[10px] uppercase tracking-[0.2em] text-slate-400">Status Prefeitura</TableHead>
                  <TableHead className="px-8 py-5 text-right font-black text-[10px] uppercase tracking-[0.2em] text-slate-400">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-24">
                      <div className="flex flex-col items-center gap-2">
                        <Clock className="h-8 w-8 text-slate-200 animate-pulse" />
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sincronizando notas...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : nfses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-24 text-slate-400">
                      <p className="text-sm font-medium">Nenhuma nota emitida ainda.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  nfses.map((nfse) => {
                    const status = statusConfig[nfse.status] || statusConfig.rascunho;
                    const StatusIcon = status.icon;
                    return (
                      <TableRow key={nfse.id} className="group border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <TableCell className="px-8 py-6">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-mono font-black text-slate-900 dark:text-white leading-none">
                              {nfse.numero}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              {new Date(nfse.data_emissao).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-6">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[240px]">
                              {nfse.destinatario.nome}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {nfse.destinatario.cnpj_cpf}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-6">
                          <span className="font-black text-slate-900 dark:text-white">
                            R$ {nfse.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        </TableCell>
                        <TableCell className="px-6 py-6">
                          <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full", status.bg, status.color)}>
                            <StatusIcon className="h-3 w-3" />
                            <span className="text-[10px] font-black uppercase tracking-widest">{status.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-8 py-6 text-right">
                          <div className="flex justify-end gap-1">
                            {nfse.link_nfse && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="rounded-xl hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition-all group/btn"
                                onClick={() => window.open(nfse.link_nfse, "_blank")}
                                title="Visualizar Nota"
                              >
                                <ExternalLink className="h-4 w-4 text-slate-400 group-hover/btn:text-slate-900 dark:group-hover/btn:text-white" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="rounded-xl hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition-all group/btn"
                              onClick={() => setSelectedNFSe(nfse)}
                              title="Detalhes"
                            >
                              <ChevronRight className="h-4 w-4 text-slate-400 group-hover/btn:text-slate-900 dark:group-hover/btn:text-white" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="config">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="rounded-[2rem] border-none shadow-sm p-10 bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center text-center space-y-6">
              <div className="h-16 w-16 rounded-3xl bg-white dark:bg-slate-800 shadow-xl flex items-center justify-center">
                <ShieldCheck className="h-8 w-8 text-slate-900 dark:text-white" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black tracking-tight">Configurações Fiscais</h3>
                <p className="text-slate-500 max-w-sm font-medium text-xs">
                  Sua conta está configurada para o município de São Paulo (Simples Nacional).
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <Badge className="rounded-xl px-3 py-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-none shadow-sm font-bold text-[10px]">CNPJ: 54.836.577/0001-67</Badge>
                <Badge className="rounded-xl px-3 py-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-none shadow-sm font-bold text-[10px]">Cod. Serviço: 04391</Badge>
              </div>
              <Button variant="outline" className="rounded-2xl h-12 px-6 font-bold border-slate-200">
                Alterar Dados do Prestador
              </Button>
            </Card>

            <Card className="rounded-[2rem] border-none shadow-sm p-10 bg-emerald-50 dark:bg-emerald-950/20 flex flex-col items-center text-center space-y-6 border border-emerald-100 dark:border-emerald-900/50">
              <div className="h-16 w-16 rounded-3xl bg-white dark:bg-slate-800 shadow-xl flex items-center justify-center">
                <ExternalLink className="h-8 w-8 text-emerald-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black tracking-tight">Automação Contabilidade</h3>
                <p className="text-slate-500 max-w-sm font-medium text-xs">
                  Envio automático de notas emitidas para a Contabilizei.
                </p>
              </div>
              <div className="space-y-3 w-full max-w-xs">
                <div className="p-3 rounded-xl bg-white/50 dark:bg-slate-800/50 text-left border border-emerald-100 dark:border-emerald-900">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Email de Destino</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">rafael.minatto@yahoo.com.br</p>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Automação Ativa</span>
                </div>
              </div>
              <Button className="rounded-2xl h-12 px-6 font-bold bg-emerald-600 hover:bg-emerald-700 text-white border-none">
                Configurar Contabilizei
              </Button>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* EMISSION DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-[2.5rem] max-w-2xl p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-slate-900 p-8 text-white">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm">
                  <FileText className="h-5 w-5 text-emerald-400" />
                </div>
                <DialogTitle className="text-2xl font-black tracking-tight">Emitir Nova NFS-e</DialogTitle>
              </div>
              <DialogDescription className="text-slate-400 font-medium">
                Preencha os dados do paciente para gerar e transmitir a nota à prefeitura.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-8 space-y-8 bg-white dark:bg-slate-900 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {/* 1. SELEÇÃO DE PACIENTE */}
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                1. Selecionar Paciente
              </Label>
              <PatientCombobox 
                onSelect={(patient) => {
                  setSelectedPatientId(patient.id);
                  setFormData(prev => ({
                    ...prev,
                    destinatario_nome: patient.name,
                    destinatario_cpf_cnpj: patient.cpf || "",
                  }));
                  setSelectedSessionIds([]); // Reset sessions
                }}
              />
            </div>

            {selectedPatientId && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* 2. CONFIGURAÇÃO DE SESSÕES */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between ml-1">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                      2. Sessões Realizadas
                    </Label>
                    <div className="flex gap-4">
                       <div className="flex flex-col space-y-1">
                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Código TUSS</span>
                         <TooltipProvider>
                           <Select value={tussCode} onValueChange={setTussCode}>
                             <SelectTrigger className="h-10 w-48 text-[10px] font-bold rounded-xl bg-slate-50 border-none shadow-none ring-0">
                               <SelectValue placeholder="Selecione o TUSS" />
                             </SelectTrigger>
                             <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                               {TUSS_FISIO_LIST.map((tuss) => (
                                 <SelectItem 
                                   key={tuss.code} 
                                   value={tuss.code}
                                   className="text-[10px] font-bold py-3 rounded-xl focus:bg-slate-50"
                                 >
                                   <div className="flex flex-col gap-1">
                                     <div className="flex items-center gap-2">
                                       <span className="text-slate-900">{tuss.code}</span>
                                       <Badge variant="outline" className="text-[8px] font-black border-slate-100 bg-slate-50/50 uppercase">{tuss.category}</Badge>
                                     </div>
                                     <span className="text-slate-400 font-medium text-[9px] leading-tight">{tuss.label}</span>
                                   </div>
                                 </SelectItem>
                               ))}
                             </SelectContent>
                           </Select>
                         </TooltipProvider>
                       </div>

                       <div className="flex flex-col space-y-1">
                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">R$ / Sessão</span>
                         <Input 
                           type="number"
                           value={pricePerSession} 
                           onChange={(e) => setPricePerSession(e.target.value)}
                           className="h-10 w-24 text-[10px] font-black rounded-xl bg-slate-50 border-none shadow-none ring-0"
                         />
                       </div>
                    </div>
                  </div>

                  <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50 flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600 mt-0.5">
                      <Info className="h-3 w-3" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">O que é este código?</p>
                      <p className="text-[10px] font-medium text-emerald-600/80 leading-relaxed">
                        {TUSS_FISIO_LIST.find(t => t.code === tussCode)?.description || "Código não identificado."}
                      </p>
                    </div>
                  </div>

                  <ScrollArea className="h-48 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 bg-slate-50/30">
                    {isLoadingSessions ? (
                      <div className="flex items-center justify-center h-full gap-2 text-slate-400">
                        <Clock className="h-4 w-4 animate-spin" />
                        <span className="text-xs font-bold uppercase tracking-widest">Carregando sessões...</span>
                      </div>
                    ) : patientSessions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400 py-8">
                        <Calendar className="h-8 w-8 mb-2 opacity-20" />
                        <span className="text-xs font-medium">Nenhuma sessão 'Atendida' encontrada.</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2">
                        {patientSessions.map((session) => (
                          <div 
                            key={session.id}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer border border-transparent",
                              selectedSessionIds.includes(session.id) 
                                ? "bg-white dark:bg-slate-800 shadow-sm border-slate-200 dark:border-slate-700" 
                                : "hover:bg-white/50 dark:hover:bg-slate-800/50"
                            )}
                            onClick={() => {
                              setSelectedSessionIds(prev => 
                                prev.includes(session.id) 
                                  ? prev.filter(id => id !== session.id) 
                                  : [...prev, session.id]
                              );
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox 
                                checked={selectedSessionIds.includes(session.id)}
                                onCheckedChange={() => {}} // Handled by div click
                                className="rounded-md border-slate-300"
                              />
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                  {new Date(session.date).toLocaleDateString("pt-BR", { weekday: 'long', day: '2-digit', month: 'long' })}
                                </span>
                                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">
                                  {session.startTime} - {session.endTime}
                                </span>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-[9px] font-black border-slate-200 text-slate-400">
                              {session.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>

                {/* 3. REVISÃO DA NOTA */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between ml-1">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                      3. Revisão e Detalhes
                    </Label>
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => setUseTemplate(!useTemplate)}>
                       <span className={cn("text-[9px] font-black uppercase transition-colors", useTemplate ? "text-emerald-600" : "text-slate-400")}>
                         Template Ativo
                       </span>
                       <div className={cn("w-6 h-3 rounded-full relative transition-colors", useTemplate ? "bg-emerald-500" : "bg-slate-300")}>
                          <div className={cn("absolute top-0.5 w-2 h-2 rounded-full bg-white transition-all", useTemplate ? "left-3.5" : "left-0.5")} />
                       </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[9px] font-bold text-slate-400 ml-1">Valor Total (R$)</Label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">R$</span>
                        <Input
                          type="number"
                          className="rounded-xl h-12 pl-10 bg-slate-50 dark:bg-slate-800 border-none font-black text-lg"
                          value={formData.valor}
                          onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] font-bold text-slate-400 ml-1">Paciente</Label>
                      <Input
                        disabled
                        className="rounded-xl h-12 bg-slate-50 dark:bg-slate-800 border-none font-bold text-slate-500"
                        value={formData.destinatario_nome}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[9px] font-bold text-slate-400 ml-1">Discriminação Final</Label>
                    <Textarea
                      className="rounded-2xl min-h-[140px] bg-slate-50 dark:bg-slate-800 border-none font-medium text-[11px] leading-relaxed resize-none p-4 custom-scrollbar"
                      value={formData.servico_descricao}
                      onChange={(e) => setFormData({ ...formData, servico_descricao: e.target.value })}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          <DialogFooter className="p-8 bg-slate-50 dark:bg-slate-950/50 flex flex-col-reverse sm:flex-row gap-3">
            <Button
              variant="ghost"
              className="rounded-2xl h-14 flex-1 font-bold text-slate-500"
              onClick={() => setIsDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              className="rounded-2xl h-14 flex-[2] bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-200 dark:shadow-none transition-all font-black text-lg"
              onClick={() => createNFSe.mutate(formData)}
              disabled={createNFSe.isPending || !formData.valor || !formData.destinatario_nome}
            >
              {createNFSe.isPending ? (
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 animate-spin" />
                  <span>Transmitindo...</span>
                </div>
              ) : (
                "Autorizar Nota"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* VIEW DETAILS DIALOG */}
      <Dialog open={!!selectedNFSe} onOpenChange={(o) => !o && setSelectedNFSe(null)}>
        <DialogContent className="rounded-[2.5rem] max-w-lg p-10">
          {selectedNFSe && (
            <div className="space-y-8">
              <div className="text-center space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">NFS-e Eletrônica</p>
                <h3 className="text-4xl font-black tracking-tighter italic">Nº {selectedNFSe.numero}</h3>
                <div className="flex justify-center mt-2">
                   <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full", statusConfig[selectedNFSe.status]?.bg, statusConfig[selectedNFSe.status]?.color)}>
                      <span className="text-[10px] font-black uppercase tracking-widest">{statusConfig[selectedNFSe.status]?.label}</span>
                   </div>
                </div>
                {(selectedNFSe as any).ultimo_erro && selectedNFSe.status === "falhou" && (
                  <div className="mt-4 p-4 rounded-2xl bg-red-50 text-red-600 text-xs font-bold leading-relaxed border border-red-100">
                    <p className="uppercase tracking-widest text-[9px] mb-1 opacity-60">Motivo da Rejeição</p>
                    {(selectedNFSe as any).ultimo_erro}
                  </div>
                )}
                {selectedNFSe.status === "aguardando_prefeitura" && (
                  <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest animate-pulse mt-2">
                    Transmitindo para a PMSP...
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-8 border-y border-slate-100 dark:border-slate-800 py-8">
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Data de Emissão</p>
                  <p className="font-bold">{new Date(selectedNFSe.data_emissao).toLocaleString("pt-BR")}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Código Verif.</p>
                  <p className="font-mono font-bold">{selectedNFSe.codigo_verificacao || "---"}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Tomador</p>
                  <p className="font-black text-slate-900 dark:text-white leading-tight">{selectedNFSe.destinatario.nome}</p>
                  <p className="text-xs font-mono text-slate-500">{selectedNFSe.destinatario.cnpj_cpf}</p>
                </div>

                <div className="p-6 rounded-3xl bg-slate-900 text-white space-y-4 shadow-xl">
                  <div className="flex justify-between items-center text-sm font-medium text-slate-400">
                    <span>Valor do Serviço</span>
                    <span className="text-white font-bold">R$ {selectedNFSe.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-medium text-slate-400">
                    <span>ISS Retido</span>
                    <span className="text-white font-bold">Não</span>
                  </div>
                  <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Total Líquido</span>
                    <span className="text-3xl font-black leading-none">R$ {selectedNFSe.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4">
                <Button 
                  variant="outline" 
                  className="rounded-2xl h-14 font-bold border-slate-200 dark:border-slate-800"
                  onClick={() => selectedNFSe.link_nfse && window.open(selectedNFSe.link_nfse, "_blank")}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir
                </Button>
                {selectedNFSe.status !== "cancelado" && selectedNFSe.status !== "rascunho" ? (
                  <Button 
                    variant="destructive"
                    className="rounded-2xl h-14 font-black bg-red-50 text-red-600 border-none hover:bg-red-100 shadow-none transition-all"
                    onClick={() => {
                      if (confirm("Tem certeza que deseja cancelar esta nota fiscal? Esta ação é irreversível e notificará a contabilidade.")) {
                        cancelNFSe.mutate(selectedNFSe.id);
                      }
                    }}
                    disabled={cancelNFSe.isPending}
                  >
                    {cancelNFSe.isPending ? "Cancelando..." : "Cancelar Nota"}
                  </Button>
                ) : (
                  <Button 
                    className="rounded-2xl h-14 font-black bg-slate-900 text-white"
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
      <div className="p-6 md:p-12 max-w-7xl mx-auto">
        <NFSeContent />
      </div>
    </MainLayout>
  );
}
