import { useState } from "react";
import {
  CustomModal,
  CustomModalHeader,
  CustomModalTitle,
  CustomModalBody,
  CustomModalFooter,
} from "@/components/ui/custom-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Phone,
  Mail,
  Clock,
  Edit,
  Plus,
  User,
  History,
  MessageSquare,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { Lead, useLeadHistorico, useAddLeadHistorico, useUpdateLead } from "@/hooks/useLeads";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const TIPOS_CONTATO = [
  {
    value: "whatsapp",
    label: "WhatsApp",
    icon: <MessageSquare className="h-4 w-4 text-emerald-500" />,
  },
  {
    value: "ligacao",
    label: "Ligação",
    icon: <Phone className="h-4 w-4 text-blue-500" />,
  },
  {
    value: "email",
    label: "Email",
    icon: <Mail className="h-4 w-4 text-purple-500" />,
  },
  {
    value: "presencial",
    label: "Presencial",
    icon: <User className="h-4 w-4 text-orange-500" />,
  },
  {
    value: "instagram",
    label: "Instagram",
    icon: <History className="h-4 w-4 text-pink-500" />,
  },
];

interface LeadDetailSheetProps {
  lead: Lead | null;
  onClose: () => void;
  onEdit: (lead: Lead) => void;
  estagios: { value: string; label: string; color: string }[];
}

export function LeadDetailSheet({ lead, onClose, onEdit, estagios }: LeadDetailSheetProps) {
  const isMobile = useIsMobile();
  const [showAddHistorico, setShowAddHistorico] = useState(false);
  const [historicoForm, setHistoricoForm] = useState({
    tipo_contato: "whatsapp",
    descricao: "",
    resultado: "",
    proximo_contato: "",
  });

  const { data: historico = [] } = useLeadHistorico(lead?.id);
  const addHistoricoMutation = useAddLeadHistorico();
  const updateLeadMutation = useUpdateLead();

  const getEstagioInfo = (estagio: string) =>
    estagios.find((e) => e.value === estagio) || estagios[0];

  const handleAddHistorico = async () => {
    if (!lead || !historicoForm.tipo_contato) return;

    await addHistoricoMutation.mutateAsync({
      lead_id: lead.id,
      tipo_contato: historicoForm.tipo_contato,
      descricao: historicoForm.descricao || null,
      resultado: historicoForm.resultado || null,
      proximo_contato: historicoForm.proximo_contato || null,
    });

    setHistoricoForm({
      tipo_contato: "whatsapp",
      descricao: "",
      resultado: "",
      proximo_contato: "",
    });
    setShowAddHistorico(false);
    toast.success("Registro de contato adicionado");
  };

  const handleMoveEstagio = async (novoEstagio: Lead["estagio"]) => {
    if (!lead || lead.estagio === novoEstagio) return;
    await updateLeadMutation.mutateAsync({ id: lead.id, estagio: novoEstagio });
    toast.success(`Lead movido para ${getEstagioInfo(novoEstagio).label}`);
  };

  const handleWhatsApp = () => {
    if (!lead?.telefone) return;
    const phone = lead.telefone.replace(/\D/g, "");
    window.open(`https://wa.me/55${phone}`, "_blank");
  };

  if (!lead) return null;

  const estagioInfo = getEstagioInfo(lead.estagio);

  return (
    <CustomModal
      open={!!lead}
      onOpenChange={(open) => !open && onClose()}
      isMobile={isMobile}
      contentClassName="max-w-2xl h-[90vh]"
    >
      <CustomModalHeader onClose={onClose}>
        <div className="flex flex-col gap-1">
          <Badge
            className={cn(
              "w-fit rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase",
              estagioInfo.color,
              "text-white",
            )}
          >
            {estagioInfo.label}
          </Badge>
          <CustomModalTitle className="text-2xl font-bold text-slate-800">
            {lead.nome}
          </CustomModalTitle>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(lead)}
          className="ml-auto mr-4 rounded-xl gap-2"
        >
          <Edit className="h-4 w-4" />
          Editar
        </Button>
      </CustomModalHeader>

      <CustomModalBody className="p-0 sm:p-0">
        <div className="p-6 space-y-6">
          {/* Informações Rápidas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border-slate-100 shadow-sm bg-slate-50/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Phone className="h-4 w-4 text-slate-400" />
                    {lead.telefone || "Sem telefone"}
                  </div>
                  {lead.telefone && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleWhatsApp}
                      className="h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                    >
                      <MessageSquare className="h-3.5 w-3.5 mr-1" />
                      WhatsApp
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Mail className="h-4 w-4 text-slate-400" />
                  {lead.email ? (
                    <a href={`mailto:${lead.email}`} className="hover:underline">
                      {lead.email}
                    </a>
                  ) : (
                    "Sem e-mail"
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-100 shadow-sm bg-slate-50/50">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 font-bold uppercase">Origem:</span>
                  <Badge variant="outline" className="rounded-lg bg-white border-slate-200">
                    {lead.origem || "Não informada"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 font-bold uppercase">Interesse:</span>
                  <span className="font-semibold text-slate-700">{lead.interesse || "Geral"}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mover Estágio (Funil) */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <ChevronRight className="h-3.5 w-3.5" />
              Estágio no Funil de Vendas
            </h4>
            <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-2xl">
              {estagios.map((e) => (
                <button
                  key={e.value}
                  onClick={() => handleMoveEstagio(e.value as Lead["estagio"])}
                  disabled={lead.estagio === e.value}
                  className={cn(
                    "px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                    lead.estagio === e.value
                      ? "bg-white shadow-sm text-slate-900"
                      : "text-slate-500 hover:text-slate-700 hover:bg-white/50",
                  )}
                >
                  <div className={cn("w-2 h-2 rounded-full", e.color)} />
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          {/* Histórico de Contatos */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <History className="h-3.5 w-3.5" />
                Linha do Tempo de Contatos
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddHistorico(!showAddHistorico)}
                className="h-8 rounded-xl bg-primary/5 text-primary hover:bg-primary/10 font-bold"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Novo Registro
              </Button>
            </div>

            {showAddHistorico && (
              <Card className="border-primary/20 shadow-md bg-primary/5 animate-in fade-in slide-in-from-top-2 duration-300">
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-slate-500">
                        Canal
                      </Label>
                      <Select
                        value={historicoForm.tipo_contato}
                        onValueChange={(v) =>
                          setHistoricoForm((prev) => ({
                            ...prev,
                            tipo_contato: v,
                          }))
                        }
                      >
                        <SelectTrigger className="rounded-xl bg-white h-9 border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIPOS_CONTATO.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              <div className="flex items-center gap-2">
                                {t.icon}
                                {t.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-slate-500">
                        Próximo Contato
                      </Label>
                      <Input
                        type="date"
                        value={historicoForm.proximo_contato}
                        onChange={(e) =>
                          setHistoricoForm((prev) => ({
                            ...prev,
                            proximo_contato: e.target.value,
                          }))
                        }
                        className="rounded-xl bg-white h-9 border-slate-200"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-slate-500">
                      O que foi conversado?
                    </Label>
                    <Textarea
                      value={historicoForm.descricao}
                      onChange={(e) =>
                        setHistoricoForm((prev) => ({
                          ...prev,
                          descricao: e.target.value,
                        }))
                      }
                      placeholder="Resumo da interação..."
                      rows={2}
                      className="rounded-xl bg-white border-slate-200 resize-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddHistorico(false)}
                      className="rounded-lg h-8"
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleAddHistorico}
                      disabled={addHistoricoMutation.isPending}
                      className="rounded-lg h-8 px-4 bg-slate-900"
                    >
                      Salvar Registro
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              {historico.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-3xl border-slate-100">
                  <MessageSquare className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Nenhum histórico registrado ainda.</p>
                </div>
              ) : (
                historico.map((h, idx) => {
                  const tipoInfo = TIPOS_CONTATO.find((t) => t.value === h.tipo_contato);
                  return (
                    <div key={h.id} className="relative flex gap-4">
                      {/* Timeline line */}
                      {idx !== historico.length - 1 && (
                        <div className="absolute left-4 top-8 w-px h-[calc(100%-16px)] bg-slate-100" />
                      )}

                      <div className="z-10 flex items-center justify-center w-8 h-8 rounded-full bg-white border border-slate-100 shadow-sm shrink-0">
                        {tipoInfo?.icon || <CheckCircle2 className="h-4 w-4 text-slate-400" />}
                      </div>

                      <div className="flex-1 pb-6">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-bold text-slate-800">
                            {tipoInfo?.label || h.tipo_contato}
                          </span>
                          <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                            {format(new Date(h.created_at), "dd MMM, HH:mm", {
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                        {h.descricao && (
                          <p className="text-sm text-slate-600 leading-relaxed">{h.descricao}</p>
                        )}
                        {h.resultado && (
                          <p className="mt-2 text-xs font-medium text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <span className="font-bold text-slate-400 uppercase mr-1">
                              Resultado:
                            </span>{" "}
                            {h.resultado}
                          </p>
                        )}
                        {h.proximo_contato && (
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 font-bold bg-blue-50 w-fit px-2 py-1 rounded-lg border border-blue-100">
                            <Clock className="h-3.5 w-3.5" />
                            Próximo:{" "}
                            {format(new Date(h.proximo_contato), "dd/MM/yyyy", {
                              locale: ptBR,
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </CustomModalBody>

      <CustomModalFooter isMobile={isMobile} className="bg-slate-50 border-t-0">
        <Button
          variant="ghost"
          onClick={onClose}
          className="rounded-xl h-11 px-6 font-bold text-slate-500"
        >
          Fechar Detalhes
        </Button>
      </CustomModalFooter>
    </CustomModal>
  );
}
