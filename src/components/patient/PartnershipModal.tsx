import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Handshake, DollarSign, UserCheck, ShieldAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { usePartnerships, type CreatePartnershipData } from "@/hooks/usePartnerships";
import type { Partnership } from "@/types";
import { toast } from "@/hooks/use-toast";

interface PartnershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  partnershipToEdit?: Partnership | null;
}

export const PartnershipModal: React.FC<PartnershipModalProps> = ({
  isOpen,
  onClose,
  partnershipToEdit,
}) => {
  const { createPartnership, updatePartnership, isCreating, isUpdating } = usePartnerships();
  const isEditing = Boolean(partnershipToEdit);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreatePartnershipData>({
    defaultValues: {
      name: "",
      description: "",
      studentSessionFee: 160.0,
      professorPays: false,
      professorSessionFee: 0.0,
      isActive: true,
    },
  });

  const professorPays = watch("professorPays");

  useEffect(() => {
    if (partnershipToEdit) {
      reset({
        name: partnershipToEdit.name || "",
        description: partnershipToEdit.description || "",
        studentSessionFee: partnershipToEdit.studentSessionFee ?? 160.0,
        professorPays: partnershipToEdit.professorPays ?? false,
        professorSessionFee: partnershipToEdit.professorSessionFee ?? 0.0,
        isActive: partnershipToEdit.isActive ?? true,
      });
    } else {
      reset({
        name: "",
        description: "",
        studentSessionFee: 160.0,
        professorPays: false,
        professorSessionFee: 0.0,
        isActive: true,
      });
    }
  }, [partnershipToEdit, reset, isOpen]);

  const onSubmit = async (data: CreatePartnershipData) => {
    try {
      if (isEditing && partnershipToEdit) {
        await updatePartnership({
          id: partnershipToEdit.id,
          ...data,
          studentSessionFee: Number(data.studentSessionFee),
          professorSessionFee: data.professorPays ? Number(data.professorSessionFee) : 0,
        });
        toast({
          title: "Parceria atualizada!",
          description: `A parceria "${data.name}" foi atualizada com sucesso.`,
        });
      } else {
        await createPartnership({
          ...data,
          studentSessionFee: Number(data.studentSessionFee),
          professorSessionFee: data.professorPays ? Number(data.professorSessionFee) : 0,
        });
        toast({
          title: "Parceria criada!",
          description: `A parceria "${data.name}" foi cadastrada com sucesso.`,
        });
      }
      onClose();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar a parceria.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg rounded-3xl border-slate-200 dark:border-slate-800 p-6 sm:p-8">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary">
              <Handshake className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                {isEditing ? "Editar Parceria" : "Nova Parceria / Convênio"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Configure os valores das sessões para alunos e regras para professores.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Nome da Parceria *
            </Label>
            <Input
              id="name"
              placeholder="Ex: Academia CrossFit Central, Estúdio Pilates, Escola XYZ"
              className="h-11 rounded-xl border-slate-200 dark:border-slate-800"
              {...register("name", { required: "Nome é obrigatório" })}
            />
            {errors.name && (
              <p className="text-xs text-rose-500 font-medium">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Descrição / Detalhes do Acordo
            </Label>
            <Textarea
              id="description"
              placeholder="Ex: Parceria com 20% de desconto para alunos matriculados e isenção para instrutores."
              className="rounded-xl border-slate-200 dark:border-slate-800 resize-none h-20 text-xs"
              {...register("description")}
            />
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Valor da Sessão (Alunos / Clientes)
                </span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                Sessão Avulsa
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="studentSessionFee" className="text-[11px] font-medium text-slate-500">
                Valor por Sessão (R$) *
              </Label>
              <Input
                id="studentSessionFee"
                type="number"
                step="0.01"
                min="0"
                placeholder="160.00"
                className="h-10 rounded-xl font-bold border-slate-200 dark:border-slate-800"
                {...register("studentSessionFee", {
                  required: "Informe o valor da sessão",
                  valueAsNumber: true,
                })}
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Regra para Professores / Colaboradores
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Professores e instrutores desta parceria pagam pela sessão?
                  </p>
                </div>
              </div>
              <Switch
                checked={professorPays}
                onCheckedChange={(checked) => setValue("professorPays", checked)}
              />
            </div>

            {professorPays ? (
              <div className="pt-2 grid grid-cols-1 gap-2 border-t border-blue-200/50 dark:border-blue-900/40">
                <Label htmlFor="professorSessionFee" className="text-[11px] font-bold text-blue-700 dark:text-blue-300">
                  Valor cobrado do Professor (R$)
                </Label>
                <Input
                  id="professorSessionFee"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="h-10 rounded-xl font-bold border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900"
                  {...register("professorSessionFee", { valueAsNumber: true })}
                />
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-[11px] font-bold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                Gratuito (R$ 0,00) - Professores desta parceria não pagam sessão.
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-11 rounded-xl border-slate-200 dark:border-slate-800"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isCreating || isUpdating}
              className="h-11 rounded-xl bg-primary text-primary-foreground font-bold px-6"
            >
              {isCreating || isUpdating
                ? "Salvando..."
                : isEditing
                ? "Atualizar Parceria"
                : "Cadastrar Parceria"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
