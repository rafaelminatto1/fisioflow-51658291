import React, { useEffect, memo } from "react";
import {
  CustomModal,
  CustomModalHeader,
  CustomModalTitle,
  CustomModalBody,
  CustomModalFooter,
} from "@/components/ui/custom-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useExercises } from "@/hooks/useExercises";
import { CATEGORIES, DIFFICULTY_LEVELS } from "@/lib/constants/exerciseConstants";
import { toast } from "sonner";
import { Dumbbell, Loader2, BadgeCheck } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { exercisesApi } from "@/api/v2";
import { useQueryClient } from "@tanstack/react-query";
import { QueryKeys } from "@/lib/queryKeys";

const quickExerciseSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  category: z.string().optional(),
  difficulty: z.string().optional(),
  sets: z.coerce.number().min(1).max(20).default(3),
  repetitions: z.coerce.number().min(1).max(100).default(10),
  description: z.string().optional(),
});

type QuickExerciseFormData = z.infer<typeof quickExerciseSchema>;

interface QuickExerciseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestedName?: string;
  onSuccess?: (exercise: { id: string; name: string; category?: string; sets?: number; repetitions?: number }) => void;
}

const QuickExerciseModalComponent: React.FC<QuickExerciseModalProps> = ({
  open,
  onOpenChange,
  suggestedName = "",
  onSuccess,
}) => {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  useExercises(); // mantém cache quente para invalidação

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<QuickExerciseFormData>({
    resolver: zodResolver(quickExerciseSchema),
    defaultValues: {
      name: suggestedName,
      category: "",
      difficulty: "",
      sets: 3,
      repetitions: 10,
      description: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: suggestedName,
        category: "",
        difficulty: "",
        sets: 3,
        repetitions: 10,
        description: "",
      });
    }
  }, [open, suggestedName, reset]);

  const onSubmit = async (data: QuickExerciseFormData) => {
    try {
      const payload: Record<string, unknown> = {
        name: data.name,
        sets: data.sets,
        repetitions: data.repetitions,
      };
      if (data.category) payload.category = data.category;
      if (data.difficulty) payload.difficulty = data.difficulty;
      if (data.description) payload.description = data.description;

      const res = await exercisesApi.create(payload as any);
      const created = res.data;
      queryClient.invalidateQueries({ queryKey: QueryKeys.exercises.all() });
      toast.success("Exercício cadastrado com sucesso!");
      onSuccess?.({
        id: created.id,
        name: created.name,
        category: created.category,
        sets: data.sets,
        repetitions: data.repetitions,
      });
      onOpenChange(false);
    } catch (err) {
      console.error("[QuickExerciseModal] Erro ao criar:", err);
      toast.error("Erro ao cadastrar exercício. Tente novamente.");
    }
  };

  const isLoading = isSubmitting;

  return (
    <CustomModal
      open={open}
      onOpenChange={onOpenChange}
      isMobile={isMobile}
      contentClassName="max-w-md"
    >
      <CustomModalHeader onClose={() => onOpenChange(false)}>
        <CustomModalTitle className="flex items-center gap-2">
          <Dumbbell className="h-5 w-5 text-primary" />
          Cadastro Rápido de Exercício
        </CustomModalTitle>
      </CustomModalHeader>

      <CustomModalBody className="p-0 sm:p-0">
        <div className="px-6 py-4 space-y-5">
          <p className="text-sm text-muted-foreground">
            Cadastre as informações essenciais. Você pode completar os detalhes depois na biblioteca de exercícios.
          </p>

          <form id="quick-exercise-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="exercise-name"
                className="font-bold text-xs uppercase tracking-wider text-slate-500"
              >
                Nome do Exercício *
              </Label>
              <Input
                id="exercise-name"
                placeholder="Ex: Agachamento Livre"
                className={cn(
                  "rounded-xl border-slate-200 h-11 font-medium",
                  errors.name && "border-destructive",
                )}
                {...register("name")}
                autoFocus
              />
              {errors.name && (
                <p className="text-[10px] text-destructive font-bold uppercase">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="font-bold text-xs uppercase tracking-wider text-slate-500">
                  Categoria
                </Label>
                <Controller
                  name="category"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-11 rounded-xl border-slate-200">
                        <SelectValue placeholder="Selecionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-xs uppercase tracking-wider text-slate-500">
                  Dificuldade
                </Label>
                <Controller
                  name="difficulty"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-11 rounded-xl border-slate-200">
                        <SelectValue placeholder="Selecionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {DIFFICULTY_LEVELS.map((d) => (
                          <SelectItem key={d.value} value={d.value}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label
                  htmlFor="exercise-sets"
                  className="font-bold text-xs uppercase tracking-wider text-slate-500"
                >
                  Séries padrão
                </Label>
                <Input
                  id="exercise-sets"
                  type="number"
                  min={1}
                  max={20}
                  className="h-11 rounded-xl border-slate-200 text-center font-bold"
                  {...register("sets")}
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="exercise-reps"
                  className="font-bold text-xs uppercase tracking-wider text-slate-500"
                >
                  Repetições padrão
                </Label>
                <Input
                  id="exercise-reps"
                  type="number"
                  min={1}
                  max={100}
                  className="h-11 rounded-xl border-slate-200 text-center font-bold"
                  {...register("repetitions")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="exercise-desc"
                className="font-bold text-xs uppercase tracking-wider text-slate-500"
              >
                Descrição (opcional)
              </Label>
              <Input
                id="exercise-desc"
                placeholder="Breve descrição do exercício..."
                className="h-11 rounded-xl border-slate-200"
                {...register("description")}
              />
            </div>
          </form>
        </div>
      </CustomModalBody>

      <CustomModalFooter isMobile={isMobile}>
        <Button
          type="button"
          variant="ghost"
          className="rounded-xl h-11 px-6 font-bold text-slate-500"
          onClick={() => onOpenChange(false)}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          form="quick-exercise-form"
          className="rounded-xl h-11 px-8 gap-2 bg-slate-900 text-white shadow-xl shadow-slate-900/10 font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <BadgeCheck className="h-4 w-4" />
          )}
          Cadastrar e Usar
        </Button>
      </CustomModalFooter>
    </CustomModal>
  );
};

export const QuickExerciseModal = memo(QuickExerciseModalComponent, (prev, next) => {
  return prev.open === next.open && prev.suggestedName === next.suggestedName;
});

QuickExerciseModal.displayName = "QuickExerciseModal";
