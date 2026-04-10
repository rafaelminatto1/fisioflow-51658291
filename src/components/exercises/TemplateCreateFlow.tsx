// Feature: exercise-templates-refactor
import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Search, Plus, Trash2, ChevronRight, ChevronLeft,
  Loader2, GripVertical, BookOpen,
} from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

import { exercisesApi, templatesApi } from "@/api/v2/exercises";
import type { ExerciseTemplate, Exercise, PatientProfileCategory } from "@/types/workers";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TemplateCreateFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceTemplate?: ExerciseTemplate; // customize mode
  editTemplate?: ExerciseTemplate; // edit mode
  onSuccess: () => void;
}

type Step = 1 | 2 | 3;

// ─── Zod Schema ──────────────────────────────────────────────────────────────

const exerciseItemSchema = z.object({
  exerciseId: z.string().min(1),
  exerciseName: z.string(),
  sets: z.coerce.number().int().min(1).optional(),
  reps: z.coerce.number().int().min(1).optional(),
  duration: z.coerce.number().int().min(1).optional(),
  weekStart: z.coerce.number().int().min(1).optional(),
  weekEnd: z.coerce.number().int().min(1).optional(),
  notes: z.string().optional(),
});

const createTemplateSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório"),
  patientProfile: z.enum(
    ["ortopedico", "esportivo", "pos_operatorio", "prevencao", "idosos"],
    { error: "Perfil de paciente é obrigatório" },
  ),
  conditionName: z.string().trim().min(1, "Condição clínica é obrigatória"),
  templateVariant: z.string().optional(),
  items: z.array(exerciseItemSchema).default([]),
  clinicalNotes: z.string().optional(),
  contraindications: z.string().optional(),
  precautions: z.string().optional(),
  progressionNotes: z.string().optional(),
  evidenceLevel: z.enum(["A", "B", "C", "D"]).optional(),
  bibliographicReferences: z.string().optional(),
});

type CreateTemplateFormValues = z.infer<typeof createTemplateSchema>;
type ExerciseItemValues = z.infer<typeof exerciseItemSchema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

const PROFILE_LABELS: Record<PatientProfileCategory, string> = {
  ortopedico: "Ortopédico",
  esportivo: "Esportivo",
  pos_operatorio: "Pós-operatório",
  prevencao: "Prevenção",
  idosos: "Idosos",
};

// ─── Step Indicator ───────────────────────────────────────────────────────────

const STEP_LABELS: Record<number, string> = {
  1: "Informações básicas",
  2: "Exercícios",
  3: "Informações clínicas",
};

function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {([1, 2, 3] as Step[]).map((step) => (
        <div key={step} className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
              step === current
                ? "bg-primary text-primary-foreground"
                : step < current
                ? "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {step}
          </div>
          {step < 3 && (
            <div
              className={`h-px w-8 transition-colors ${
                step < current ? "bg-primary/40" : "bg-muted"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Step 1: Basic Info ───────────────────────────────────────────────────────

interface Step1Props {
  register: ReturnType<typeof useForm<CreateTemplateFormValues>>["register"];
  errors: ReturnType<typeof useForm<CreateTemplateFormValues>>["formState"]["errors"];
  watch: ReturnType<typeof useForm<CreateTemplateFormValues>>["watch"];
  setValue: ReturnType<typeof useForm<CreateTemplateFormValues>>["setValue"];
}

function BasicInfoStep({ register, errors, watch, setValue }: Step1Props) {
  const patientProfile = watch("patientProfile");

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name" className="mb-1.5 block">
          Nome do template <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          placeholder="Ex: Protocolo Lombalgia Crônica"
          {...register("name")}
        />
        {errors.name && (
          <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="patientProfile" className="mb-1.5 block">
          Perfil de paciente <span className="text-destructive">*</span>
        </Label>
        <Select
          value={patientProfile ?? ""}
          onValueChange={(v) =>
            setValue("patientProfile", v as PatientProfileCategory, { shouldValidate: true })
          }
        >
          <SelectTrigger id="patientProfile">
            <SelectValue placeholder="Selecionar perfil..." />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(PROFILE_LABELS) as [PatientProfileCategory, string][]).map(
              ([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
        {errors.patientProfile && (
          <p className="text-xs text-destructive mt-1">{errors.patientProfile.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="conditionName" className="mb-1.5 block">
          Condição clínica <span className="text-destructive">*</span>
        </Label>
        <Input
          id="conditionName"
          placeholder="Ex: Lombalgia crônica inespecífica"
          {...register("conditionName")}
        />
        {errors.conditionName && (
          <p className="text-xs text-destructive mt-1">{errors.conditionName.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="templateVariant" className="mb-1.5 block">
          Variante <span className="text-muted-foreground text-xs">(opcional)</span>
        </Label>
        <Input
          id="templateVariant"
          placeholder="Ex: Conservador, Progressivo, Inicial..."
          {...register("templateVariant")}
        />
      </div>
    </div>
  );
}

// ─── Step 2: Exercises ────────────────────────────────────────────────────────

interface Step2Props {
  fields: ExerciseItemValues[];
  isPosOperatorio: boolean;
  onAdd: (exercise: Exercise) => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: keyof ExerciseItemValues, value: unknown) => void;
}

function ExercisesStep({ fields, isPosOperatorio, onAdd, onRemove, onUpdate }: Step2Props) {
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ["exercises", { q: debouncedSearch }],
    queryFn: () => exercisesApi.list({ q: debouncedSearch, limit: 10 }),
    enabled: debouncedSearch.length >= 2,
    staleTime: 1000 * 60,
  });

  const exercises = searchResults?.data ?? [];
  const addedIds = new Set(fields.map((f) => f.exerciseId));

  return (
    <div className="space-y-4">
      {/* Search */}
      <div>
        <Label htmlFor="exercise-search" className="mb-1.5 block">
          Buscar exercícios da biblioteca
        </Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="exercise-search"
            placeholder="Nome do exercício..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Search results */}
      {debouncedSearch.length >= 2 && !isSearching && exercises.length > 0 && (
        <ul className="border rounded-md divide-y max-h-40 overflow-y-auto">
          {exercises.map((ex) => (
            <li key={ex.id} className="flex items-center justify-between px-3 py-2">
              <span className="text-sm truncate flex-1 mr-2">{ex.name}</span>
              <Button
                type="button"
                size="sm"
                variant={addedIds.has(ex.id) ? "secondary" : "outline"}
                disabled={addedIds.has(ex.id)}
                onClick={() => onAdd(ex)}
                className="shrink-0 h-7 text-xs"
              >
                {addedIds.has(ex.id) ? "Adicionado" : <><Plus className="h-3 w-3 mr-1" />Adicionar</>}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {debouncedSearch.length >= 2 && !isSearching && exercises.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-2">
          Nenhum exercício encontrado para "{debouncedSearch}"
        </p>
      )}

      {/* Added exercises */}
      {fields.length === 0 ? (
        <div className="border border-dashed rounded-md py-8 text-center">
          <BookOpen className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Nenhum exercício adicionado ainda
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Busque e adicione exercícios da biblioteca acima
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
          {fields.map((item, index) => (
            <div key={item.exerciseId} className="border rounded-md p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium truncate">{item.exerciseName}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(index)}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs mb-1 block">Séries</Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="3"
                    value={item.sets ?? ""}
                    onChange={(e) => onUpdate(index, "sets", e.target.value ? Number(e.target.value) : undefined)}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Reps</Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="10"
                    value={item.reps ?? ""}
                    onChange={(e) => onUpdate(index, "reps", e.target.value ? Number(e.target.value) : undefined)}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Duração (s)</Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="30"
                    value={item.duration ?? ""}
                    onChange={(e) => onUpdate(index, "duration", e.target.value ? Number(e.target.value) : undefined)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              {isPosOperatorio && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs mb-1 block">Semana início</Label>
                    <Input
                      type="number"
                      min={1}
                      placeholder="1"
                      value={item.weekStart ?? ""}
                      onChange={(e) => onUpdate(index, "weekStart", e.target.value ? Number(e.target.value) : undefined)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Semana fim</Label>
                    <Input
                      type="number"
                      min={1}
                      placeholder="4"
                      value={item.weekEnd ?? ""}
                      onChange={(e) => onUpdate(index, "weekEnd", e.target.value ? Number(e.target.value) : undefined)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Step 3: Clinical Info ────────────────────────────────────────────────────

interface Step3Props {
  register: ReturnType<typeof useForm<CreateTemplateFormValues>>["register"];
  watch: ReturnType<typeof useForm<CreateTemplateFormValues>>["watch"];
  setValue: ReturnType<typeof useForm<CreateTemplateFormValues>>["setValue"];
}

function ClinicalInfoStep({ register, watch, setValue }: Step3Props) {
  const evidenceLevel = watch("evidenceLevel");

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="clinicalNotes" className="mb-1.5 block">
          Notas clínicas
        </Label>
        <Textarea
          id="clinicalNotes"
          placeholder="Observações clínicas gerais sobre o protocolo..."
          rows={3}
          {...register("clinicalNotes")}
        />
      </div>

      <div>
        <Label htmlFor="contraindications" className="mb-1.5 block">
          Contraindicações
        </Label>
        <Textarea
          id="contraindications"
          placeholder="Liste as contraindicações para este template..."
          rows={2}
          {...register("contraindications")}
        />
      </div>

      <div>
        <Label htmlFor="precautions" className="mb-1.5 block">
          Precauções
        </Label>
        <Textarea
          id="precautions"
          placeholder="Precauções e cuidados especiais..."
          rows={2}
          {...register("precautions")}
        />
      </div>

      <div>
        <Label htmlFor="progressionNotes" className="mb-1.5 block">
          Critérios de progressão
        </Label>
        <Textarea
          id="progressionNotes"
          placeholder="Critérios para avançar nas fases do protocolo..."
          rows={2}
          {...register("progressionNotes")}
        />
      </div>

      <div>
        <Label htmlFor="evidenceLevel" className="mb-1.5 block">
          Nível de evidência
        </Label>
        <Select
          value={evidenceLevel ?? ""}
          onValueChange={(v) =>
            setValue("evidenceLevel", v as "A" | "B" | "C" | "D" | undefined)
          }
        >
          <SelectTrigger id="evidenceLevel">
            <SelectValue placeholder="Selecionar nível..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="A">A — Alta evidência</SelectItem>
            <SelectItem value="B">B — Moderada evidência</SelectItem>
            <SelectItem value="C">C — Baixa evidência</SelectItem>
            <SelectItem value="D">D — Opinião de especialistas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="bibliographicReferences" className="mb-1.5 block">
          Referências bibliográficas{" "}
          <span className="text-muted-foreground text-xs">(uma por linha)</span>
        </Label>
        <Textarea
          id="bibliographicReferences"
          placeholder={"Autor et al. (2023). Título do artigo. Journal, vol(n), pp.\nOutra referência..."}
          rows={3}
          {...register("bibliographicReferences")}
        />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TemplateCreateFlow({
  open,
  onOpenChange,
  sourceTemplate,
  editTemplate,
  onSuccess,
}: TemplateCreateFlowProps) {
  const queryClient = useQueryClient();
  const isCustomizeMode = !!sourceTemplate;
  const isEditMode = !!editTemplate;
  const [step, setStep] = useState<Step>(1);
  const [exerciseItems, setExerciseItems] = useState<ExerciseItemValues[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateTemplateFormValues>({
    resolver: zodResolver(createTemplateSchema),
    defaultValues: {
      name: "",
      patientProfile: undefined,
      conditionName: "",
      templateVariant: "",
      items: [],
      clinicalNotes: "",
      contraindications: "",
      precautions: "",
      progressionNotes: "",
      evidenceLevel: undefined,
      bibliographicReferences: "",
    },
  });

  const patientProfile = watch("patientProfile");
  const isPosOperatorio = patientProfile === "pos_operatorio";

  // Fetch items when in edit mode
  const { data: editTemplateData } = useQuery({
    queryKey: ["templates", editTemplate?.id, "detail"],
    queryFn: () => templatesApi.get(editTemplate!.id),
    enabled: isEditMode && open && !!editTemplate?.id,
    staleTime: 0,
  });

  // Pre-fill from sourceTemplate when in customize mode, or editTemplate when in edit mode
  useEffect(() => {
    if (open && editTemplate) {
      reset({
        name: editTemplate.name,
        patientProfile: editTemplate.patientProfile ?? undefined,
        conditionName: editTemplate.conditionName ?? "",
        templateVariant: editTemplate.templateVariant ?? "",
        clinicalNotes: editTemplate.clinicalNotes ?? "",
        contraindications: editTemplate.contraindications ?? "",
        precautions: editTemplate.precautions ?? "",
        progressionNotes: editTemplate.progressionNotes ?? "",
        evidenceLevel: editTemplate.evidenceLevel ?? undefined,
        bibliographicReferences: (editTemplate.bibliographicReferences ?? []).join("\n"),
        items: [],
      });
      const items = editTemplateData?.data?.items ?? [];
      setExerciseItems(
        items
          .slice()
          .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
          .map((item) => ({
            exerciseId: item.exerciseId,
            exerciseName: item.exerciseId, // will show id until exercise name resolves
            sets: item.sets ?? undefined,
            reps: item.repetitions ?? undefined,
            duration: item.duration ?? undefined,
            weekStart: item.weekStart ?? undefined,
            weekEnd: item.weekEnd ?? undefined,
            notes: item.notes ?? undefined,
          })),
      );
      setStep(1);
    } else if (open && sourceTemplate) {
      reset({
        name: `${sourceTemplate.name} (Personalizado)`,
        patientProfile: sourceTemplate.patientProfile ?? undefined,
        conditionName: sourceTemplate.conditionName ?? "",
        templateVariant: sourceTemplate.templateVariant ?? "",
        clinicalNotes: sourceTemplate.clinicalNotes ?? "",
        contraindications: sourceTemplate.contraindications ?? "",
        precautions: sourceTemplate.precautions ?? "",
        progressionNotes: sourceTemplate.progressionNotes ?? "",
        evidenceLevel: sourceTemplate.evidenceLevel ?? undefined,
        bibliographicReferences: (sourceTemplate.bibliographicReferences ?? []).join("\n"),
        items: [],
      });
      setExerciseItems([]);
      setStep(1);
    } else if (open && !sourceTemplate && !editTemplate) {
      reset({
        name: "",
        patientProfile: undefined,
        conditionName: "",
        templateVariant: "",
        clinicalNotes: "",
        contraindications: "",
        precautions: "",
        progressionNotes: "",
        evidenceLevel: undefined,
        bibliographicReferences: "",
        items: [],
      });
      setExerciseItems([]);
      setStep(1);
    }
  }, [open, sourceTemplate, editTemplate, editTemplateData, reset]);

  // ─── Exercise management ────────────────────────────────────────────────────

  const handleAddExercise = useCallback((exercise: Exercise) => {
    setExerciseItems((prev) => {
      if (prev.some((e) => e.exerciseId === exercise.id)) return prev;
      return [
        ...prev,
        {
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          sets: undefined,
          reps: undefined,
          duration: undefined,
          weekStart: undefined,
          weekEnd: undefined,
          notes: undefined,
        },
      ];
    });
  }, []);

  const handleRemoveExercise = useCallback((index: number) => {
    setExerciseItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpdateExercise = useCallback(
    (index: number, field: keyof ExerciseItemValues, value: unknown) => {
      setExerciseItems((prev) =>
        prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
      );
    },
    [],
  );

  // ─── API mutations ──────────────────────────────────────────────────────────

  const buildPayload = (values: CreateTemplateFormValues, isDraft: boolean) => {
    const refs = values.bibliographicReferences
      ? values.bibliographicReferences
          .split("\n")
          .map((r) => r.trim())
          .filter(Boolean)
      : [];

    return {
      name: values.name,
      patientProfile: values.patientProfile,
      conditionName: values.conditionName,
      templateVariant: values.templateVariant || null,
      clinicalNotes: values.clinicalNotes || null,
      contraindications: values.contraindications || null,
      precautions: values.precautions || null,
      progressionNotes: values.progressionNotes || null,
      evidenceLevel: values.evidenceLevel ?? null,
      bibliographicReferences: refs,
      isDraft,
      templateType: "custom" as const,
      ...(isCustomizeMode && sourceTemplate
        ? { sourceTemplateId: sourceTemplate.id }
        : {}),
      items: exerciseItems.map((item, idx) => ({
        exerciseId: item.exerciseId,
        orderIndex: idx,
        sets: item.sets ?? null,
        repetitions: item.reps ?? null,
        duration: item.duration ?? null,
        weekStart: item.weekStart ?? null,
        weekEnd: item.weekEnd ?? null,
        notes: item.notes ?? null,
      })),
    };
  };

  const createMutation = useMutation({
    mutationFn: (payload: ReturnType<typeof buildPayload>) =>
      templatesApi.create(payload as Parameters<typeof templatesApi.create>[0]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success(
        isCustomizeMode ? "Template personalizado criado!" : "Template criado com sucesso!",
      );
      onOpenChange(false);
      onSuccess();
    },
    onError: (err: Error) => {
      toast.error("Erro ao salvar template", {
        description: err.message ?? "Tente novamente.",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: ReturnType<typeof buildPayload>) =>
      templatesApi.update(editTemplate!.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template atualizado com sucesso!");
      onOpenChange(false);
      onSuccess();
    },
    onError: (err: Error) => {
      toast.error("Erro ao atualizar template", {
        description: err.message ?? "Tente novamente.",
      });
    },
  });

  // ─── Navigation ─────────────────────────────────────────────────────────────

  function handleNext() {
    if (step < 3) setStep((s) => (s + 1) as Step);
  }

  function handleBack() {
    if (step > 1) setStep((s) => (s - 1) as Step);
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const onSubmit = handleSubmit((values) => {
    if (isEditMode) {
      updateMutation.mutate(buildPayload(values, false));
    } else {
      createMutation.mutate(buildPayload(values, false));
    }
  });

  const onSaveDraft = handleSubmit((values) => {
    if (isEditMode) {
      updateMutation.mutate(buildPayload(values, true));
    } else {
      createMutation.mutate(buildPayload(values, true));
    }
  });

  // Step 1 is valid when name, patientProfile, conditionName are filled
  const name = watch("name");
  const conditionName = watch("conditionName");
  const step1Valid =
    name.trim().length > 0 &&
    !!patientProfile &&
    conditionName.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Editar template" : isCustomizeMode ? "Personalizar template" : "Criar template"}
          </DialogTitle>
          <DialogDescription>
            {isCustomizeMode && sourceTemplate ? (
              <span className="flex items-center gap-2 flex-wrap">
                Baseado em{" "}
                <Badge variant="secondary" className="text-xs">
                  {sourceTemplate.name}
                </Badge>
              </span>
            ) : isEditMode ? (
              "Edite as informações do template."
            ) : (
              "Preencha as informações do novo template de exercícios."
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0 mt-2">
          <StepIndicator current={step} />

          <p className="text-sm font-medium text-muted-foreground mb-4">
            Etapa {step}: {STEP_LABELS[step]}
          </p>

          <div className="flex-1 overflow-y-auto pr-1">
            {step === 1 && (
              <BasicInfoStep
                register={register}
                errors={errors}
                watch={watch}
                setValue={setValue}
              />
            )}

            {step === 2 && (
              <ExercisesStep
                fields={exerciseItems}
                isPosOperatorio={isPosOperatorio}
                onAdd={handleAddExercise}
                onRemove={handleRemoveExercise}
                onUpdate={handleUpdateExercise}
              />
            )}

            {step === 3 && (
              <ClinicalInfoStep
                register={register}
                watch={watch}
                setValue={setValue}
              />
            )}
          </div>

          <DialogFooter className="flex-row gap-2 mt-4 pt-4 border-t flex-wrap">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isSaving}
                className="flex-1 min-w-[80px]"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
            )}

            {step < 3 ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={step === 1 && !step1Valid}
                className="flex-1 min-w-[80px]"
              >
                Próximo
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onSaveDraft}
                  disabled={isSaving}
                  className="flex-1 min-w-[100px]"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Salvar rascunho"
                  )}
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 min-w-[100px]"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : isEditMode ? (
                    "Salvar alterações"
                  ) : (
                    "Salvar template"
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
