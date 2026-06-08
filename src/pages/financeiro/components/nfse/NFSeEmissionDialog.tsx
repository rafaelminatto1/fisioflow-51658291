import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Zap, Calendar, CheckCircle2, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PatientCombobox } from "@/components/ui/patient-combobox";
import { TUSS_FISIO_LIST } from "@/constants/tuss-codes";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { appointmentsApi } from "@/api/v2/appointments";

interface NFSeEmissionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

export function NFSeEmissionDialog({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: NFSeEmissionDialogProps) {
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [tussCode, setTussCode] = useState("50000144");
  const [pricePerSession, setPricePerSession] = useState("170.00");
  const [useTemplate, setUseTemplate] = useState(true);

  const [formData, setFormData] = useState({
    valor: "",
    destinatario_nome: "",
    destinatario_cpf_cnpj: "",
    servico_descricao: "",
  });

  const { data: patientSessions = [], isLoading: isLoadingSessions } = useQuery({
    queryKey: ["patient-sessions", selectedPatientId],
    queryFn: async () => {
      if (!selectedPatientId) return [];
      const res = await appointmentsApi.list({
        patientId: selectedPatientId,
        status: "atendido",
        limit: 50,
      });
      return res.data || [];
    },
    enabled: !!selectedPatientId && isOpen,
  });

  useEffect(() => {
    if (!formData.destinatario_nome || !useTemplate) return;

    const today = new Date().toLocaleDateString("pt-BR");
    const selectedSessions = patientSessions.filter((s) => selectedSessionIds.includes(s.id));
    const count = selectedSessions.length;

    if (count > 0) {
      const dates = selectedSessions
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((s) => {
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

      setFormData((prev) => ({
        ...prev,
        servico_descricao: desc,
        valor: totalVal,
      }));
    } else {
      const valParsed = parseFloat(formData.valor || "0");
      const valorStr =
        valParsed > 0
          ? ` no valor de R$ ${valParsed.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
          : "";
      const template = `Paciente ${formData.destinatario_nome || "[NOME]"}, realizou sessão de fisioterapia no dia ${today}${valorStr}.\n\n- Conforme Lei 12.741/2012, o percentual total de impostos incidentes neste serviço prestado é de aproximadamente 8,98%`;
      setFormData((prev) => ({ ...prev, servico_descricao: template }));
    }
  }, [
    formData.destinatario_nome,
    selectedSessionIds,
    tussCode,
    pricePerSession,
    patientSessions,
    useTemplate,
  ]);

  const handleReset = () => {
    setFormData({
      valor: "",
      destinatario_nome: "",
      destinatario_cpf_cnpj: "",
      servico_descricao: "",
    });
    setSelectedPatientId(null);
    setSelectedSessionIds([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && handleReset()}>
      <DialogContent className="rounded-[3rem] max-w-5xl p-0 overflow-hidden border-none shadow-[0_40px_100px_rgba(0,0,0,0.15)] flex flex-col md:flex-row h-[90vh] md:h-auto">
        <div className="flex-[1.5] flex flex-col bg-white dark:bg-slate-900">
          <div className="bg-slate-900 p-10 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative z-10"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-emerald-500/20 p-2 rounded-xl">
                  <Zap className="h-5 w-5 text-emerald-400 fill-emerald-400" />
                </div>
                <h3 className="text-2xl font-black tracking-tight font-display italic">
                  Mestre de Emissão
                </h3>
              </div>
              <p className="text-slate-400 font-medium text-sm max-w-md">
                Sincronize atendimentos e autorize notas fiscais em segundos com suporte à Reforma
                Tributária.
              </p>
            </motion.div>
          </div>

          <ScrollArea className="flex-1 p-10 custom-scrollbar">
            <div className="space-y-10">
              <section className="space-y-5">
                <div className="flex items-center gap-3">
                  <span className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400">
                    01
                  </span>
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                    Tomador do Serviço
                  </h4>
                </div>
                <PatientCombobox
                  onSelect={(patient) => {
                    setSelectedPatientId(patient.id);
                    setFormData((prev) => ({
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
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-10"
                  >
                    <section className="space-y-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400">
                            02
                          </span>
                          <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                            Sessões & Procedimento
                          </h4>
                        </div>
                        <div className="flex items-center gap-4">
                          <Select value={tussCode} onValueChange={setTussCode}>
                            <SelectTrigger className="h-9 w-40 text-[9px] font-black uppercase tracking-widest rounded-xl bg-slate-50 border-none shadow-none ring-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                              {TUSS_FISIO_LIST.map((tuss) => (
                                <SelectItem
                                  key={tuss.code}
                                  value={tuss.code}
                                  className="text-[10px] font-bold py-3 rounded-xl focus:bg-slate-50"
                                >
                                  {tuss.code} - {tuss.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {isLoadingSessions ? (
                          Array(4)
                            .fill(0)
                            .map((_, i) => (
                              <div key={i} className="h-14 rounded-2xl bg-slate-50 animate-pulse" />
                            ))
                        ) : patientSessions.length === 0 ? (
                          <div className="col-span-full py-8 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                            <Calendar className="h-6 w-6 text-slate-300 mx-auto mb-2" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              Nenhuma sessão atendida
                            </p>
                          </div>
                        ) : (
                          patientSessions.map((session) => (
                            <motion.div
                              whileHover={{ scale: 1.02 }}
                              key={session.id}
                              onClick={() => {
                                setSelectedSessionIds((prev) =>
                                  prev.includes(session.id)
                                    ? prev.filter((id) => id !== session.id)
                                    : [...prev, session.id],
                                );
                              }}
                              className={cn(
                                "p-4 rounded-2xl cursor-pointer border-2 transition-all flex items-center justify-between",
                                selectedSessionIds.includes(session.id)
                                  ? "bg-emerald-50 border-emerald-500 shadow-md shadow-emerald-100"
                                  : "bg-slate-50 border-transparent grayscale opacity-60 hover:grayscale-0 hover:opacity-100",
                              )}
                            >
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight">
                                  {new Date(session.date).toLocaleDateString("pt-BR", {
                                    day: "2-digit",
                                    month: "short",
                                  })}
                                </span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase">
                                  {session.startTime}
                                </span>
                              </div>
                              <div
                                className={cn(
                                  "h-5 w-5 rounded-full flex items-center justify-center transition-colors",
                                  selectedSessionIds.includes(session.id)
                                    ? "bg-emerald-500 text-white"
                                    : "bg-slate-200",
                                )}
                              >
                                {selectedSessionIds.includes(session.id) && (
                                  <CheckCircle2 className="h-3 w-3" />
                                )}
                              </div>
                            </motion.div>
                          ))
                        )}
                      </div>
                    </section>

                    <section className="space-y-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400">
                            03
                          </span>
                          <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                            Valores & Revisão
                          </h4>
                        </div>
                        <div
                          className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-500 cursor-pointer hover:bg-slate-200 transition-colors"
                          onClick={() => setUseTemplate(!useTemplate)}
                        >
                          <span className="text-[9px] font-black uppercase tracking-widest">
                            {useTemplate ? "Auto" : "Manual"}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">
                            Valor Unitário
                          </Label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">
                              R$
                            </span>
                            <Input
                              type="number"
                              className="rounded-xl h-12 pl-10 bg-slate-50 border-none font-black text-base focus-visible:ring-emerald-500"
                              value={pricePerSession}
                              onChange={(e) => setPricePerSession(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">
                            Total da Nota
                          </Label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">
                              R$
                            </span>
                            <Input
                              type="number"
                              className="rounded-xl h-12 pl-10 bg-slate-50 border-none font-black text-base text-slate-900"
                              value={formData.valor}
                              onChange={(e) =>
                                setFormData((p) => ({ ...p, valor: e.target.value }))
                              }
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">
                          Discriminação detalhada
                        </Label>
                        <Textarea
                          className="rounded-2xl min-h-[140px] bg-slate-50 border-none font-medium text-[11px] leading-relaxed resize-none p-5 custom-scrollbar focus-visible:ring-emerald-500"
                          value={formData.servico_descricao}
                          onChange={(e) =>
                            setFormData((p) => ({ ...p, servico_descricao: e.target.value }))
                          }
                        />
                      </div>
                    </section>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </ScrollArea>

          <DialogFooter className="p-8 border-t border-slate-50 dark:border-slate-800 bg-muted flex items-center justify-between gap-4">
            <Button
              variant="ghost"
              className="rounded-2xl h-14 px-8 font-black text-slate-400 uppercase tracking-widest text-[10px]"
              onClick={handleReset}
            >
              Descartar
            </Button>
            <Button
              className="rounded-2xl h-14 px-12 bg-slate-900 hover:bg-slate-800 text-white shadow-2xl shadow-slate-200 dark:shadow-none transition-all font-black uppercase tracking-[0.2em] text-[10px] active:scale-95"
              onClick={() => onSubmit(formData)}
              disabled={isSubmitting || !formData.valor || !formData.destinatario_nome}
            >
              {isSubmitting ? "Processando..." : "Autorizar Transmissão"}
            </Button>
          </DialogFooter>
        </div>

        <div className="hidden lg:flex flex-1 bg-slate-50 dark:bg-slate-950/50 p-12 border-l border-slate-100 dark:border-slate-800 flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-10 left-10 p-2 rounded-xl bg-card shadow-sm border border-slate-100">
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
                <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">
                  NFS-e Digital
                </p>
                <p className="text-xs font-mono font-black italic">PROVISÓRIA</p>
              </div>
            </div>

            <div className="h-px bg-slate-100 dark:bg-slate-800" />

            <div className="space-y-4 flex-1">
              <div className="space-y-2">
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">
                  Prestador
                </p>
                <p className="text-[10px] font-black leading-none">MOOCA FISIOTERAPIA RA LTDA</p>
              </div>
              <div className="space-y-2">
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">
                  Tomador
                </p>
                <p className="text-[10px] font-black leading-none truncate">
                  {formData.destinatario_nome || "Aguardando seleção..."}
                </p>
              </div>
              <div className="space-y-2 pt-4">
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">
                  Discriminação
                </p>
                <div className="space-y-1">
                  <div className="w-full h-1.5 bg-slate-50 dark:bg-slate-800 rounded-full" />
                  <div className="w-full h-1.5 bg-slate-50 dark:bg-slate-800 rounded-full" />
                  <div className="w-2/3 h-1.5 bg-slate-50 dark:bg-slate-800 rounded-full" />
                </div>
              </div>
            </div>

            <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex justify-between items-end">
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">
                  Valor Total
                </p>
                <p className="text-2xl font-black italic tracking-tighter leading-none">
                  R${" "}
                  {parseFloat(formData.valor || "0").toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>

            <div className="absolute bottom-10 right-10 w-16 h-16 border-4 border-slate-100 dark:border-slate-800 rounded-full flex items-center justify-center rotate-[-15deg] opacity-20">
              <p className="text-[8px] font-black uppercase text-center">
                FisioFlow
                <br />
                Verified
              </p>
            </div>
          </motion.div>

          <p className="mt-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
            Pré-visualização em tempo real
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
