import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  FileText,
  Loader2,
  MessageCircle,
  Paperclip,
  Phone,
  Send,
  Stethoscope,
  X,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { DoctorAutocomplete } from "@/components/doctors/DoctorAutocomplete";
import { DoctorFormModal } from "@/components/doctors/DoctorFormModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MedicalReturnService } from "@/lib/services/medicalReturnService";
import { useSearchDoctors } from "@/hooks/useDoctors";
import { patientsApi } from "@/api/v2/patients";
import { uploadToR2 } from "@/lib/storage/r2-storage";
import { useAuth } from "@/contexts/AuthContext";
import type { MedicalReturn, MedicalReturnFormData } from "@/types/evolution";

const formSchema = z.object({
  doctor_name: z.string().min(2, "Nome do médico é obrigatório"),
  doctor_phone: z.string().optional(),
  return_date: z.string().min(1, "Data do retorno é obrigatória"),
  return_period: z.string().nullable().optional(),
  notes: z.string().optional(),
  report_done: z.boolean().default(false),
  report_sent: z.boolean().default(false),
  request_attachment_url: z.string().optional(),
});

function formatDateBr(isoDate: string | undefined): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate ?? "");
  if (!match) return "data a confirmar";
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function normalizeDateInputValue(value: string | null | undefined): string {
  if (!value) return "";

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (dateOnly) return `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

type GenderMF = "M" | "F" | null;

function normalizeGenderValue(value: unknown): GenderMF {
  if (typeof value !== "string") return null;
  const first = value.trim().toLowerCase()[0];
  if (first === "m") return "M";
  if (first === "f") return "F";
  return null;
}

function honorificName(name: string, gender: GenderMF): string {
  const title = gender === "M" ? "Dr." : gender === "F" ? "Dra." : "Dr(a).";
  return `${title} ${name.trim() || "—"}`;
}

function patientReference(name: string, gender: GenderMF): string {
  const article = gender === "M" ? "do paciente" : gender === "F" ? "da paciente" : "do(a) paciente";
  return `${article} ${name.trim() || "—"}`;
}

function toWhatsAppNumber(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.length <= 11 ? `55${digits}` : digits;
}

type FormValues = z.infer<typeof formSchema>;

interface MedicalReturnFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName?: string;
  patientGender?: string | null;
  medicalReturn?: MedicalReturn | null;
  onSuccess?: () => void;
}

export const MedicalReturnFormModal: React.FC<MedicalReturnFormModalProps> = ({
  open,
  onOpenChange,
  patientId,
  patientName,
  patientGender,
  medicalReturn,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  const isEditing = !!medicalReturn;
  const [doctorModalOpen, setDoctorModalOpen] = useState(false);
  const [suggestedDoctorName, setSuggestedDoctorName] = useState("");
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendMessage, setSendMessage] = useState("");
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const therapistName =
    (profile as { full_name?: string } | null)?.full_name ||
    (user as { displayName?: string } | null)?.displayName ||
    "";
  const therapistGender = normalizeGenderValue(
    (profile as { gender?: string | null } | null)?.gender,
  );


  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      doctor_name: "",
      doctor_phone: "",
      return_date: "",
      return_period: null,
      notes: "",
      report_done: false,
      report_sent: false,
      request_attachment_url: "",
    },
  });

  const watchedDoctorName = form.watch("doctor_name");
  const { data: matchedDoctors = [] } = useSearchDoctors(
    watchedDoctorName ?? "",
    (watchedDoctorName ?? "").length >= 2,
  );
  const doctorGender = normalizeGenderValue(
    matchedDoctors.find(
      (d) => d.name?.trim().toLowerCase() === (watchedDoctorName ?? "").trim().toLowerCase(),
    )?.gender,
  );

  useEffect(() => {
    if (medicalReturn) {
      form.reset({
        doctor_name: medicalReturn.doctor_name || "",
        doctor_phone: medicalReturn.doctor_phone || "",
        return_date: normalizeDateInputValue(medicalReturn.return_date),
        return_period: medicalReturn.return_period || null,
        notes: medicalReturn.notes || "",
        report_done: !!medicalReturn.report_done,
        report_sent: !!medicalReturn.report_sent,
        request_attachment_url: medicalReturn.request_attachment_url || "",
      });
    } else {
      form.reset({
        doctor_name: "",
        doctor_phone: "",
        return_date: "",
        return_period: null,
        notes: "",
        report_done: false,
        report_sent: false,
        request_attachment_url: "",
      });
    }
  }, [medicalReturn, form]);

  useEffect(() => {
    if (!open) {
      setDoctorModalOpen(false);
      setSuggestedDoctorName("");
      setSendOpen(false);
      setSendMessage("");
    }
  }, [open]);

  const createMutation = useMutation({
    mutationFn: (data: MedicalReturnFormData) => MedicalReturnService.addMedicalReturn(data),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["patient-medical-returns", patientId] });
      const previous = queryClient.getQueryData(["patient-medical-returns", patientId]);
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["patient-medical-returns", patientId],
      });
      toast.success("Retorno médico registrado com sucesso");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["patient-medical-returns", patientId], context.previous);
      }
      toast.error("Erro ao registrar retorno médico");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MedicalReturnFormData> }) =>
      MedicalReturnService.updateMedicalReturn(id, {
        ...data,
        patient_id: patientId,
      }),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["patient-medical-returns", patientId] });
      const previous = queryClient.getQueryData<any[]>(["patient-medical-returns", patientId]);
      queryClient.setQueryData<any[]>(["patient-medical-returns", patientId], (old) => {
        if (!old) return old;
        return old.map((item) => (item.id === id ? { ...item, ...data } : item));
      });
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["patient-medical-returns", patientId],
      });
      toast.success("Retorno médico atualizado com sucesso");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["patient-medical-returns", patientId], context.previous);
      }
      toast.error("Erro ao atualizar retorno médico");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => MedicalReturnService.deleteMedicalReturn(id, patientId),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["patient-medical-returns", patientId] });
      const previous = queryClient.getQueryData<any[]>(["patient-medical-returns", patientId]);
      queryClient.setQueryData<any[]>(["patient-medical-returns", patientId], (old) => {
        if (!old) return old;
        return old.filter((item) => item.id !== id);
      });
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["patient-medical-returns", patientId],
      });
      toast.success("Retorno médico removido com sucesso");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["patient-medical-returns", patientId], context.previous);
      }
      toast.error("Erro ao remover retorno médico");
    },
  });

  const onSubmit = (values: FormValues) => {
    const returnDate = normalizeDateInputValue(values.return_date);
    if (!returnDate) {
      form.setError("return_date", {
        type: "validate",
        message: "Data do retorno inválida",
      });
      return;
    }

    const data: MedicalReturnFormData = {
      patient_id: patientId,
      doctor_name: values.doctor_name,
      doctor_phone: values.doctor_phone || "",
      return_date: returnDate,
      return_period: values.return_period || undefined,
      notes: values.notes || "",
      report_done: values.report_done,
      report_sent: values.report_sent,
      request_attachment_url: values.request_attachment_url || undefined,
    };

    if (isEditing && medicalReturn) {
      updateMutation.mutate({ id: medicalReturn.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = () => {
    if (medicalReturn && confirm("Tem certeza que deseja remover este retorno médico?")) {
      deleteMutation.mutate(medicalReturn.id);
    }
  };

  const sendReportMutation = useMutation({
    mutationFn: () =>
      patientsApi.sendMedicalReturnReport(patientId, medicalReturn?.id ?? "", therapistName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-medical-returns", patientId] });
      form.setValue("report_sent", true);
      setSendOpen(false);
      toast.success("Relatório enviado ao médico pelo WhatsApp da clínica");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Falha ao enviar pelo WhatsApp da clínica");
    },
  });

  const markSentMutation = useMutation({
    mutationFn: () =>
      MedicalReturnService.updateMedicalReturn(medicalReturn?.id ?? "", {
        patient_id: patientId,
        report_sent: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-medical-returns", patientId] });
      form.setValue("report_sent", true);
      setSendOpen(false);
      toast.success("Retorno marcado como enviado");
    },
  });

  const buildDefaultMessage = () => {
    const v = form.getValues();
    const link = v.request_attachment_url?.trim() || "segue em anexo";
    return (
      `Olá ${honorificName(v.doctor_name || "", doctorGender)}! ` +
      `Sou ${honorificName(therapistName, therapistGender)}, ` +
      `fisioterapeuta ${patientReference(patientName || "", normalizeGenderValue(patientGender))}. ` +
      `Segue o relatório de fisioterapia referente ao retorno de ${formatDateBr(v.return_date)}. ` +
      `Pedido/relatório: ${link}. Fico à disposição!`
    );
  };

  const handleToggleSend = () => {
    if (!sendOpen) setSendMessage(buildDefaultMessage());
    setSendOpen((prev) => !prev);
  };

  const handleOpenWhatsApp = () => {
    const phone = toWhatsAppNumber(form.getValues().doctor_phone ?? "");
    if (!phone) {
      toast.error("Preencha o telefone do médico para enviar pelo WhatsApp");
      return;
    }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(sendMessage)}`, "_blank");
    if (medicalReturn) markSentMutation.mutate();
    else form.setValue("report_sent", true, { shouldDirty: true });
  };

  const handleAttachmentChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx. 15MB)");
      return;
    }
    setUploadingAttachment(true);
    try {
      const result = await uploadToR2(file, `medical-requests/${patientId}`);
      form.setValue("request_attachment_url", result.publicUrl, { shouldDirty: true });
      toast.success("Pedido médico anexado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao anexar o arquivo");
    } finally {
      setUploadingAttachment(false);
    }
  };

  const attachmentUrl = form.watch("request_attachment_url");

  const isPending =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-primary" />
              {isEditing ? "Editar Retorno Médico" : "Novo Retorno Médico"}
            </DialogTitle>
            <DialogDescription>
              Agende ou registre os detalhes do retorno do paciente ao médico assistente.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="doctor_name"
                  render={({ field, fieldState }) => (
                    <FormItem className="col-span-2">
                      <FormLabel className={cn(fieldState.error && "text-destructive")}>
                        Nome do Médico *
                      </FormLabel>
                      <FormControl>
                        <DoctorAutocomplete
                          value={field.value}
                          onSelect={(doctor) => {
                            if (doctor) {
                              field.onChange(doctor.name);
                              // Auto-populate phone if available
                              form.setValue("doctor_phone", doctor.phone || "", {
                                shouldDirty: true,
                              });
                              form.trigger("doctor_name");
                            } else {
                              field.onChange("");
                            }
                          }}
                          onCreateNew={(searchTerm) => {
                            setSuggestedDoctorName(searchTerm);
                            setDoctorModalOpen(true);
                          }}
                          placeholder="Selecione ou digite o nome do médico..."
                          error={!!fieldState.error}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="doctor_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        Telefone
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="(00) 00000-0000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="return_date"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel
                        className={cn(
                          "flex items-center gap-1",
                          fieldState.error && "text-destructive",
                        )}
                      >
                        <Calendar className="h-3 w-3" />
                        Data do Retorno *
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          className={cn(
                            fieldState.error && "border-destructive focus-visible:ring-destructive",
                          )}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="return_period"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Período do Dia (Opcional)</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === "__none" ? null : value)}
                        value={field.value ?? "__none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o período..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none">Não informado</SelectItem>
                          <SelectItem value="manha">Manhã</SelectItem>
                          <SelectItem value="tarde">Tarde</SelectItem>
                          <SelectItem value="noite">Noite</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="col-span-2 flex gap-6 pt-2">
                  <FormField
                    control={form.control}
                    name="report_done"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="flex items-center gap-1 cursor-pointer">
                            <FileText className="h-3 w-3" />
                            Relatório Pronto
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="report_sent"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="flex items-center gap-1 cursor-pointer">
                            <FileText className="h-3 w-3 text-green-500" />
                            Relatório Enviado
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Observações / Condutas p/ Médico</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Detalhes sobre o que informar ao médico no retorno..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Anexo do pedido médico */}
                <div className="col-span-2 space-y-1.5">
                  <span className="text-sm font-medium flex items-center gap-1">
                    <Paperclip className="h-3 w-3" />
                    Pedido Médico (anexo)
                  </span>
                  <input
                    ref={attachmentInputRef}
                    type="file"
                    accept="application/pdf,image/*"
                    className="hidden"
                    onChange={handleAttachmentChange}
                  />
                  {attachmentUrl ? (
                    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm">
                      <FileText className="h-4 w-4 shrink-0 text-blue-600" />
                      <a
                        href={attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 truncate text-blue-600 hover:underline"
                      >
                        {attachmentUrl.split("/").pop()}
                      </a>
                      <button
                        type="button"
                        aria-label="Remover anexo"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          form.setValue("request_attachment_url", "", { shouldDirty: true })
                        }
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start gap-2 text-muted-foreground"
                      disabled={uploadingAttachment}
                      onClick={() => attachmentInputRef.current?.click()}
                    >
                      {uploadingAttachment ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Paperclip className="h-4 w-4" />
                      )}
                      {uploadingAttachment ? "Enviando arquivo..." : "Anexar pedido médico (PDF ou foto)"}
                    </Button>
                  )}
                </div>

                {/* Envio ao médico via WhatsApp */}
                <div className="col-span-2 space-y-2">
                  <Button
                    type="button"
                    variant={sendOpen ? "secondary" : "outline"}
                    className="w-full justify-start gap-2 border-green-500/40 text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                    onClick={handleToggleSend}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Enviar ao médico via WhatsApp
                  </Button>
                  {sendOpen && (
                    <div className="space-y-2 rounded-lg border border-green-500/30 bg-green-50/50 p-3 dark:bg-green-900/10">
                      <p className="text-xs text-muted-foreground">
                        Revise a mensagem antes de enviar — você pode editá-la livremente.
                      </p>
                      <Textarea
                        value={sendMessage}
                        onChange={(e) => setSendMessage(e.target.value)}
                        rows={4}
                        className="bg-background text-sm"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                          onClick={handleOpenWhatsApp}
                          disabled={markSentMutation.isPending}
                        >
                          <MessageCircle className="h-4 w-4" />
                          Abrir WhatsApp com a mensagem
                        </Button>
                        {isEditing && (
                          <Button
                            type="button"
                            variant="outline"
                            className="gap-2"
                            onClick={() => sendReportMutation.mutate()}
                            disabled={sendReportMutation.isPending}
                            title="Usa o template aprovado na Meta (texto fixo — edições acima não se aplicam)"
                          >
                            {sendReportMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                            Enviar automático (nº da clínica)
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="gap-2">
                {isEditing && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isPending}
                  >
                    Excluir
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : isEditing ? (
                    "Salvar Alterações"
                  ) : (
                    "Registrar Retorno"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <DoctorFormModal
        open={doctorModalOpen}
        onOpenChange={(nextOpen) => {
          setDoctorModalOpen(nextOpen);
          if (!nextOpen) {
            setSuggestedDoctorName("");
          }
        }}
        suggestedName={suggestedDoctorName}
        onSuccess={(doctor) => {
          form.setValue("doctor_name", doctor.name, {
            shouldDirty: true,
          });
          form.setValue("doctor_phone", doctor.phone || "", {
            shouldDirty: true,
          });
          form.trigger(["doctor_name", "doctor_phone"]);
          setDoctorModalOpen(false);
          setSuggestedDoctorName("");
        }}
      />
    </>
  );
};
