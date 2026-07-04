import React from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  User2,
  Phone,
  Mail,
  Building2,
  Stethoscope,
  MapPin,
  Hash,
  Briefcase,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Doctor, DoctorFormData } from "@/types/doctor";
import { useCreateDoctor, useUpdateDoctor } from "@/hooks/useDoctors";

const formSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  specialty: z.string().optional(),
  crm: z.string().optional(),
  crm_state: z.string().max(2, "Use a sigla do estado (ex: SP)").optional(),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  clinic_name: z.string().optional(),
  clinic_address: z.string().optional(),
  clinic_phone: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface DoctorFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctor?: Doctor | null;
  onSuccess?: (doctor: Doctor) => void;
  suggestedName?: string;
}

const fieldLabelClass = "text-[11px] font-bold uppercase text-muted-foreground/80";
const fieldInputClass =
  "pl-9 h-10 border-border/60 bg-muted/5 focus-visible:ring-blue-500/30 focus-visible:border-blue-500 transition-all shadow-sm";
const fieldIconClass =
  "absolute left-3 top-3 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-blue-500";

export function DoctorFormModal({
  open,
  onOpenChange,
  doctor,
  onSuccess,
  suggestedName,
}: DoctorFormModalProps) {
  const isEditing = !!doctor;
  const createMutation = useCreateDoctor();
  const updateMutation = useUpdateDoctor();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: doctor?.name || suggestedName || "",
      specialty: doctor?.specialty || "",
      crm: doctor?.crm || "",
      crm_state: doctor?.crm_state || "",
      phone: doctor?.phone || "",
      email: doctor?.email || "",
      clinic_name: doctor?.clinic_name || "",
      clinic_address: doctor?.clinic_address || "",
      clinic_phone: doctor?.clinic_phone || "",
      notes: doctor?.notes || "",
    },
  });

  React.useEffect(() => {
    if (open && doctor) {
      form.reset({
        name: doctor.name || "",
        specialty: doctor.specialty || "",
        crm: doctor.crm || "",
        crm_state: doctor.crm_state || "",
        phone: doctor.phone || "",
        email: doctor.email || "",
        clinic_name: doctor.clinic_name || "",
        clinic_address: doctor.clinic_address || "",
        clinic_phone: doctor.clinic_phone || "",
        notes: doctor.notes || "",
      });
    } else if (open && !doctor) {
      form.reset({
        name: suggestedName || "",
        specialty: "",
        crm: "",
        crm_state: "",
        phone: "",
        email: "",
        clinic_name: "",
        clinic_address: "",
        clinic_phone: "",
        notes: "",
      });
    }
  }, [open, doctor, form, suggestedName]);

  const onSubmit = async (values: FormValues) => {
    const data: DoctorFormData = {
      name: values.name,
      specialty: values.specialty || undefined,
      crm: values.crm || undefined,
      crm_state: values.crm_state || undefined,
      phone: values.phone || undefined,
      email: values.email || undefined,
      clinic_name: values.clinic_name || undefined,
      clinic_address: values.clinic_address || undefined,
      clinic_phone: values.clinic_phone || undefined,
      notes: values.notes || undefined,
    };

    if (isEditing) {
      updateMutation.mutate(
        { id: doctor.id, data },
        {
          onSuccess: (savedDoctor) => {
            onOpenChange(false);
            onSuccess?.(savedDoctor);
          },
        },
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: (createdDoctor) => {
          onOpenChange(false);
          onSuccess?.(createdDoctor);
        },
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] sm:!max-w-4xl border-none shadow-2xl">
        <DialogHeader className="-mx-6 -mt-6 px-6 py-3.5 bg-gradient-to-br from-blue-600 to-blue-700 text-white dark:from-blue-900 dark:to-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg ring-1 ring-white/30">
              <Stethoscope className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight text-white leading-tight">
                {isEditing ? "Editar Médico" : "Cadastrar Novo Médico"}
              </DialogTitle>
              <DialogDescription className="text-blue-100/90 text-xs font-medium">
                {isEditing
                  ? "Atualize as informações do médico"
                  : "Gerencie sua rede de parceiros e indicações."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="pt-5 space-y-4 bg-background">
            <div className="grid grid-cols-12 gap-x-4 gap-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-12 md:col-span-6">
                    <FormLabel className={fieldLabelClass}>
                      Nome Completo <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <User2 className={fieldIconClass} />
                        <Input
                          placeholder="Dr(a). Nome Completo"
                          className={fieldInputClass}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs font-medium" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="specialty"
                render={({ field }) => (
                  <FormItem className="col-span-12 md:col-span-3">
                    <FormLabel className={fieldLabelClass}>Especialidade</FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <Briefcase className={fieldIconClass} />
                        <Input
                          placeholder="Ex: Ortopedista"
                          className={fieldInputClass}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs font-medium" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="crm"
                render={({ field }) => (
                  <FormItem className="col-span-8 md:col-span-2">
                    <FormLabel className={fieldLabelClass}>CRM</FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <Hash className={fieldIconClass} />
                        <Input placeholder="123456" className={fieldInputClass} {...field} />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs font-medium" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="crm_state"
                render={({ field }) => (
                  <FormItem className="col-span-4 md:col-span-1">
                    <FormLabel className={fieldLabelClass}>UF</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="SP"
                        maxLength={2}
                        className="h-10 text-center font-semibold border-border/60 bg-muted/5 focus-visible:ring-blue-500/30 focus-visible:border-blue-500 transition-all uppercase shadow-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs font-medium" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem className="col-span-12 md:col-span-3">
                    <FormLabel className={fieldLabelClass}>WhatsApp / Telefone</FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <Phone className={fieldIconClass} />
                        <Input
                          placeholder="(11) 99999-9999"
                          className={fieldInputClass}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs font-medium" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="col-span-12 md:col-span-3">
                    <FormLabel className={fieldLabelClass}>E-mail</FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <Mail className={fieldIconClass} />
                        <Input
                          type="email"
                          placeholder="medico@exemplo.com"
                          className={fieldInputClass}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs font-medium" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clinic_name"
                render={({ field }) => (
                  <FormItem className="col-span-12 md:col-span-3">
                    <FormLabel className={fieldLabelClass}>Nome da Clínica</FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <Building2 className={fieldIconClass} />
                        <Input
                          placeholder="Nome da instituição"
                          className={fieldInputClass}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs font-medium" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clinic_phone"
                render={({ field }) => (
                  <FormItem className="col-span-12 md:col-span-3">
                    <FormLabel className={fieldLabelClass}>Telefone Clínica</FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <Phone className={fieldIconClass} />
                        <Input
                          placeholder="(11) 3333-3333"
                          className={fieldInputClass}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs font-medium" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clinic_address"
                render={({ field }) => (
                  <FormItem className="col-span-12 md:col-span-7">
                    <FormLabel className={fieldLabelClass}>Endereço Profissional</FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <MapPin className={fieldIconClass} />
                        <Input
                          placeholder="Rua, número, bairro, cidade"
                          className={fieldInputClass}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs font-medium" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="col-span-12 md:col-span-5 md:row-span-2">
                    <FormLabel className={fieldLabelClass}>
                      Observações Internas
                      <span className="ml-1.5 normal-case font-medium text-muted-foreground/60">
                        · visíveis apenas para sua equipe
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Informações que ajudem na identificação ou parceria com este médico..."
                        rows={2}
                        className="min-h-[60px] border-border/60 bg-muted/5 focus-visible:ring-blue-500/30 focus-visible:border-blue-500 transition-all resize-none shadow-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs font-medium" />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4 border-t border-border/50 flex items-center gap-3 bg-background">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
                className="font-semibold text-muted-foreground hover:bg-muted/50"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-95"
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : isEditing ? (
                  "Salvar Alterações"
                ) : (
                  "Cadastrar Médico"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
