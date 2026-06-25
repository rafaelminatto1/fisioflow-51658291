import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Loader2,
  Upload,
  X,
  Plus,
  Film,
  Video as VideoIcon,
  Image as ImageIcon,
  BookOpen,
  MoreVertical,
  Share2 as Youtube,
  Search,
  Download,
  Link as LinkIcon,
} from "lucide-react";
import { exercisesApi } from "@/api/v2";
import { uploadToR2 } from "@/lib/storage/r2-storage";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  getBodyPartsOptions,
  getEquipmentOptions,
  getPathologyOptions,
  getPrecautionOptions,
  getEvidenceLevelOptions,
} from "@/lib/constants/exerciseConstants";
import type { Exercise } from "@/hooks/useExercises";

interface MediaItem {
  id: string;
  url: string;
  type: "image" | "video" | "youtube";
  caption?: string | null;
  orderIndex?: number;
}

interface ScientificReference {
  citation: string;
  url?: string;
  evidenceLevel?: string;
}

type ExerciseExtended = Exercise & {
  name_en?: string;
  aliases_pt?: string[];
  aliases_en?: string[];
  alternativeEquipment?: string[];
  precaution_level?: string;
  precaution_notes?: string;
  scientific_references?: ScientificReference[] | string | null;
  media?: MediaItem[];
};
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { knowledgeBase } from "@/data/knowledgeBase";
import { exerciseDictionary, ExerciseEntry } from "@/data/exerciseDictionary";
import { MediaGalleryModal } from "../media/MediaGalleryModal";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const WgerImportModal = React.lazy(() =>
  import("./WgerImportModal").then((m) => ({ default: m.WgerImportModal })),
);

const exerciseSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  name_en: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  difficulty: z.enum(["Iniciante", "Intermediário", "Avançado"]).optional(),
  video_url: z.string().optional().or(z.literal("")),
  image_url: z.string().optional().or(z.literal("")),
  aliases_pt: z.array(z.string()).optional(),
  aliases_en: z.array(z.string()).optional(),
  instructions: z.string().optional(),
  sets: z.number().int().positive().optional().nullable(),
  repetitions: z.number().int().positive().optional().nullable(),
  duration: z.number().int().positive().optional().nullable(),
  indicated_pathologies: z.array(z.string()).optional(),
  contraindicated_pathologies: z.array(z.string()).optional(),
  equipment: z.array(z.string()).optional(),
  alternativeEquipment: z.array(z.string()).optional(),
  precaution_level: z.enum(["safe", "supervised", "restricted"]).optional(),
  precaution_notes: z.string().optional(),
  scientific_references: z.union([z.array(z.any()), z.string()]).optional(),
  media: z
    .array(
      z.object({
        id: z.string().optional(),
        url: z.string(),
        type: z.enum(["image", "video", "youtube"]),
        caption: z.string().optional().nullable(),
        orderIndex: z.number().int(),
      }),
    )
    .optional(),
});

type ExerciseFormData = z.infer<typeof exerciseSchema>;

interface ExerciseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<Exercise, "id" | "created_at" | "updated_at">) => void;
  exercise?: Exercise;
  isLoading?: boolean;
}

// --- Componente de Item Ordenável ---
interface SortableItemProps {
  id: string;
  url: string;
  type: "image" | "video" | "youtube";
  caption: string | null;
  onRemove: () => void;
  onCaptionChange: (val: string) => void;
  onUrlChange?: (val: string) => void;
}

function SortableMediaItem({
  id,
  url,
  type,
  caption,
  onRemove,
  onCaptionChange,
  onUrlChange,
}: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex flex-col gap-2 rounded-xl border bg-white p-3 shadow-sm transition-all dark:bg-slate-900",
        isDragging ? "opacity-50 ring-2 ring-primary" : "hover:border-primary/30",
      )}
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
        {/* Handle de Arrasto */}
        <div
          {...attributes}
          {...listeners}
          className="absolute left-2 top-2 z-10 cursor-grab rounded-md bg-white/90 p-1.5 shadow-sm active:cursor-grabbing dark:bg-slate-800/90"
        >
          <MoreVertical className="h-4 w-4 text-slate-400" />
        </div>

        {/* Botão de Remover */}
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-2 top-2 z-10 rounded-md bg-white/90 p-1.5 text-slate-400 shadow-sm hover:text-red-500 dark:bg-slate-800/90"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Preview */}
        {type === "image" ? (
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : type === "youtube" ? (
          <div className="flex h-full w-full flex-col items-center justify-center bg-red-50 dark:bg-red-900/10">
            <Youtube className="h-8 w-8 text-red-500" />
            <span className="mt-2 text-[10px] font-bold text-red-600">YOUTUBE</span>
          </div>
        ) : (
       <div className="flex h-full w-full items-center justify-center bg-slate-900">
         <Film className="h-8 w-8 text-white/40" />
       </div>
     )}
   </div>

   <div className="mt-2">
     <label className="block text-[10px] font-medium text-slate-700 mb-1">
       URL da Mídia
     </label>
     <input
       type="text"
       value={url}
       onChange={(e) => onUrlChange(e.target.value)}
       className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-[11px]"
       placeholder="Cole a nova URL aqui..."
     />
   </div>

   <Input
     placeholder="Adicione uma observação..."
     className="h-8 border-none bg-slate-50 text-[11px] focus-visible:ring-1 dark:bg-slate-800"
     value={caption || ""}
     onChange={(e) => onCaptionChange(e.target.value)}
   />
    </div>
  );
}

export function NewExerciseModal({
  open,
  onOpenChange,
  onSubmit,
  exercise,
  isLoading: isSaving,
}: ExerciseModalProps) {
  const [_isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [videoFile, setVideoFile] = React.useState<File | null>(null);
  const [_imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [_videoPreview, setVideoPreview] = React.useState<string | null>(null);

  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const _videoInputRef = React.useRef<HTMLInputElement>(null);

  const [isGalleryOpen, setIsGalleryOpen] = React.useState(false);
  const [isWgerOpen, setIsWgerOpen] = React.useState(false);
  const [_activeMediaTab, _setActiveMediaTab] = React.useState<"view" | "edit">("view");

  // Busca o exercício completo (com mídia da galeria) ao abrir para edição —
  // a lista não traz exercise_media_attachments, então sem este fetch o painel
  // de mídia abre vazio mesmo quando há fotos/vídeos cadastrados.
  const { data: detailData } = useQuery({
    queryKey: ["exercise-detail", exercise?.id],
    queryFn: () => exercisesApi.get(exercise!.id),
    enabled: Boolean(open && exercise?.id),
    staleTime: 0,
  });
  const currentExercise = React.useMemo<ExerciseExtended | undefined>(() => {
    if (!exercise) return undefined;
    const fetched = (detailData?.data as Partial<ExerciseExtended> | undefined) ?? {};
    return { ...(exercise as ExerciseExtended), ...fetched } as ExerciseExtended;
  }, [exercise, detailData]);

  const handleApplyDictionaryEntry = (entry: ExerciseEntry) => {
    form.setValue("name", entry.pt);
    form.setValue("name_en", entry.en);
    form.setValue("description", entry.description_pt);
    form.setValue("category", entry.subcategory || entry.category);

    // Mapear aliases se existirem no dicionário
    if (entry.aliases_pt) {
      form.setValue("aliases_pt", entry.aliases_pt);
    }
    if (entry.aliases_en) {
      form.setValue("aliases_en", entry.aliases_en);
    }

    if (entry.image_url) {
      const currentMedia = form.getValues("media") || [];
      const alreadyHas = currentMedia.some((m) => m.url === entry.image_url);
      if (!alreadyHas) {
        form.setValue("media", [
          {
            url: entry.image_url,
            type: "image",
            caption: entry.pt,
            orderIndex: currentMedia.length,
          },
          ...currentMedia,
        ]);
      }
    }

    // Preencher instruções e metadados clínicos se disponíveis
    if (entry.instruction_pt) {
      form.setValue("instructions", entry.instruction_pt);
    }
    if (entry.intensity_level) {
      // Mapear nível de dificuldade numérico para o enum do formulário
      const diffMap: Record<number, "Iniciante" | "Intermediário" | "Avançado"> = {
        1: "Iniciante",
        2: "Iniciante",
        3: "Intermediário",
        4: "Avançado",
        5: "Avançado",
      };
      form.setValue("difficulty", diffMap[entry.intensity_level] || "Iniciante");
    }

    toast({
      title: "Dados Aplicados",
      description: `O exercício "${entry.pt}" foi carregado com sucesso.`,
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const form = useForm<ExerciseFormData>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      difficulty: undefined,
      video_url: "",
      image_url: "",
      instructions: "",
      sets: undefined,
      repetitions: undefined,
      duration: undefined,
      indicated_pathologies: [],
      contraindicated_pathologies: [],
      body_parts: [],
      equipment: [],
      alternativeEquipment: [],
      precaution_level: "safe",
      precaution_notes: "",
      scientific_references: [],
      media: [],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "scientific_references" as any,
  });

  const {
    fields: mediaFields,
    append: appendMedia,
    remove: removeMedia,
    update: updateMedia,
    replace: replaceMedia,
  } = useFieldArray({
    control: form.control,
    name: "media",
  });

  // Sincronizar mídia quando o formulário reseta (ex: ao abrir para editar)
  useEffect(() => {
    if (currentExercise && currentExercise.media) {
      replaceMedia(currentExercise.media);
    }
  }, [currentExercise, replaceMedia]);

  useEffect(() => {
    // Clear files and previews when switching exercises or opening/closing
    setImageFile(null);
    setVideoFile(null);
    setImagePreview(null);
    setVideoPreview(null);
    setUploadProgress(0);
    setIsUploading(false);

    if (currentExercise) {
      const ext = currentExercise;
      const exercise = currentExercise as Exercise;

      // --- Lógica de Mídia Legada (Fallback) ---
      let initialMedia = ext.media || [];
      if (initialMedia.length === 0) {
        if (exercise.image_url) {
          initialMedia.push({
            id: "legacy-image-" + Math.random().toString(36).substr(2, 9),
            url: exercise.image_url,
            type: "image",
            orderIndex: 0,
          });
        }
        if (exercise.video_url) {
          const isYoutube =
            exercise.video_url.includes("youtube.com") || exercise.video_url.includes("youtu.be");
          initialMedia.push({
            id: "legacy-video-" + Math.random().toString(36).substr(2, 9),
            url: exercise.video_url,
            type: isYoutube ? "youtube" : "video",
            orderIndex: initialMedia.length,
          });
        }
      }

      form.reset({
        name: exercise.name || "",
        name_en: ext.name_en || "",
        description: exercise.description || "",
        category: exercise.category || "",
        difficulty:
          (exercise.difficulty as "Iniciante" | "Intermediário" | "Avançado") || undefined,
        video_url: exercise.video_url || "",
        image_url: exercise.image_url || "",
        aliases_pt: ext.aliases_pt || [],
        aliases_en: ext.aliases_en || [],
        instructions: exercise.instructions || "",
        sets: exercise.sets || undefined,
        repetitions: exercise.repetitions || undefined,
        duration: exercise.duration || undefined,
        indicated_pathologies: Array.isArray(exercise.indicated_pathologies)
          ? exercise.indicated_pathologies
          : [],
        contraindicated_pathologies: Array.isArray(exercise.contraindicated_pathologies)
          ? exercise.contraindicated_pathologies
          : [],
        body_parts: Array.isArray(exercise.body_parts) ? exercise.body_parts : [],
        equipment: Array.isArray(exercise.equipment) ? exercise.equipment : [],
        alternativeEquipment: Array.isArray(ext.alternativeEquipment)
          ? ext.alternativeEquipment
          : [],
        precaution_level: ext.precaution_level || "safe",
        precaution_notes: ext.precaution_notes || "",
        scientific_references: Array.isArray(ext.scientific_references)
          ? ext.scientific_references
          : [],
        media: initialMedia,
      });
      if (Array.isArray(ext.scientific_references)) {
        replace(ext.scientific_references);
      }
    } else {
      form.reset({
        name: "",
        name_en: "",
        description: "",
        category: "",
        difficulty: undefined,
        video_url: "",
        image_url: "",
        aliases_pt: [],
        aliases_en: [],
        instructions: "",
        sets: undefined,
        repetitions: undefined,
        duration: undefined,
        indicated_pathologies: [],
        contraindicated_pathologies: [],
        body_parts: [],
        equipment: [],
        alternativeEquipment: [],
        precaution_level: "safe",
        precaution_notes: "",
        scientific_references: [],
        media: [],
      });
      replace([]);
    }
  }, [currentExercise, form, replace]);

  const _handleAnalyzeImage = async () => {
    const imageUrl = form.getValues("image_url");
    if (!imageUrl) {
      toast({
        title: "URL da imagem necessária",
        description: "Insira a URL de uma imagem para analisar",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await exercisesApi.analyzeImage(imageUrl);
      if (result.success && result.analysis) {
        // Preencher campos automaticamente baseados na análise
        if (result.analysis.labels?.length > 0) {
          const currentDesc = form.getValues("description") || "";
          const aiTags = `Tags IA: ${result.analysis.labels.join(", ")}`;
          form.setValue("description", currentDesc ? `${currentDesc}\n\n${aiTags}` : aiTags);
        }

        toast({
          title: "Análise concluída",
          description: "A imagem foi analisada e as informações foram extraídas.",
        });
      }
    } catch (error) {
      console.error("Erro na análise:", error);
      toast({
        title: "Erro na análise",
        description: "Não foi possível analisar a imagem no momento.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const _handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    type: "image" | "video",
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (type === "image") {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Erro",
          description: "Por favor selecione uma imagem",
          variant: "destructive",
        });
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    } else {
      if (!file.type.startsWith("video/")) {
        toast({
          title: "Erro",
          description: "Por favor selecione um vídeo",
          variant: "destructive",
        });
        return;
      }
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const { publicUrl } = await uploadToR2(file, path);
    return publicUrl;
  };

  const handleSubmit = async (data: ExerciseFormData) => {
    setIsUploading(true);
    setUploadProgress(10);

    try {
      let _finalImageUrl = data.image_url;
      let _finalVideoUrl = data.video_url;

      if (imageFile) {
        setUploadProgress(20);
        _finalImageUrl = await uploadFile(imageFile, "exercise-images");
      }

      if (videoFile) {
        setUploadProgress(imageFile ? 50 : 30);
        _finalVideoUrl = await uploadFile(videoFile, "exercise-videos");
      }

      setUploadProgress(90);

      // Determinar as URLs principais para compatibilidade
      const firstImage = data.media?.find((m) => m.type === "image")?.url || "";
      const firstVideo = data.media?.find((m) => m.type !== "image")?.url || "";

      onSubmit({
        ...data,
        image_url: firstImage,
        video_url: firstVideo,
        media: data.media || [],
      } as Omit<Exercise, "id" | "created_at" | "updated_at">);

      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao salvar exercício:", error);
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao fazer upload dos arquivos. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] lg:max-w-5xl xl:max-w-6xl max-h-[92vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="text-lg sm:text-xl">
            {exercise ? "Editar Exercício" : "Novo Exercício"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <Form {...form}>
            <form
              id="exercise-form"
              onSubmit={form.handleSubmit(handleSubmit)}
              className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-0"
            >
              {/* ===== COLUNA ESQUERDA: campos textuais e clínicos ===== */}
              <div className="p-5 sm:p-6 space-y-5 min-w-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex justify-between items-center">
                          <span>Nome (PT)*</span>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px] gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              onClick={() => setIsWgerOpen(true)}
                            >
                              <Download className="h-3 w-3" />
                              Importar do wger
                            </Button>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-[10px] gap-1 text-primary hover:text-primary hover:bg-primary/5"
                                >
                                  <Search className="h-3 w-3" />
                                  Dicionário Clínico
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80 p-0" align="end">
                                <div className="p-2 border-b">
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2">
                                    Sugestões do Dicionário
                                  </p>
                                </div>
                                <div className="max-h-60 overflow-y-auto">
                                  {exerciseDictionary
                                    .filter((e) => {
                                      const q = (field.value || "").toLowerCase();
                                      const pt = (e?.pt || "").toLowerCase();
                                      const aliases = Array.isArray(e?.aliases_pt)
                                        ? e.aliases_pt
                                        : [];
                                      return (
                                        pt.includes(q) ||
                                        aliases.some((a) => (a || "").toLowerCase().includes(q))
                                      );
                                    })
                                    .map((entry) => (
                                      <button
                                        key={entry.pt}
                                        type="button"
                                        onClick={() => handleApplyDictionaryEntry(entry)}
                                        className="w-full flex flex-col items-start gap-0.5 p-3 text-left hover:bg-slate-50 border-b last:border-0 transition-colors"
                                      >
                                        <span className="text-sm font-medium text-slate-900">
                                          {entry.pt}
                                        </span>
                                        <span className="text-[10px] text-slate-500 italic">
                                          {entry.en}
                                        </span>
                                      </button>
                                    ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ex: Agachamento Livre" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="name_en"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome (EN)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ex: Squat" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="aliases_pt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Apelidos / Variações (PT)</FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={[]}
                            selected={field.value || []}
                            onChange={field.onChange}
                            allowCustom={true}
                            placeholder="Adicionar apelidos (ex: 4 apoios)..."
                          />
                        </FormControl>
                        <FormDescription className="text-[10px]">
                          Pressione Enter para adicionar cada variação.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="aliases_en"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Aliases / Variations (EN)</FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={[]}
                            selected={field.value || []}
                            onChange={field.onChange}
                            allowCustom={true}
                            placeholder="Add aliases (ex: quadruped)..."
                          />
                        </FormControl>
                        <FormDescription className="text-[10px]">
                          Press Enter to add each variation.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Descrição do exercício" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ex: Fortalecimento" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="difficulty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dificuldade</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Iniciante">Iniciante</SelectItem>
                            <SelectItem value="Intermediário">Intermediário</SelectItem>
                            <SelectItem value="Avançado">Avançado</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="instructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instruções</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Instruções detalhadas" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <p className="text-[11px] text-muted-foreground italic mb-1">
                  📊 Valores médios recomendados — o profissional ajusta na prescrição individual
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="sets"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Séries (Recomendado)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) =>
                              field.onChange(e.target.value ? parseInt(e.target.value) : undefined)
                            }
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="repetitions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Repetições (Recomendado)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) =>
                              field.onChange(e.target.value ? parseInt(e.target.value) : undefined)
                            }
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duração Recomendada (seg)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) =>
                              field.onChange(e.target.value ? parseInt(e.target.value) : undefined)
                            }
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Bloco de mídia movido para a coluna direita (sticky) — ver final do <form>. */}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="indicated_pathologies"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>✅ Indicações Clínicas</FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={getPathologyOptions()}
                            selected={Array.isArray(field.value) ? field.value : []}
                            onChange={field.onChange}
                            allowCustom={true}
                            placeholder="Selecionar patologias indicadas..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contraindicated_pathologies"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>⚠️ Contraindicações</FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={getPathologyOptions()}
                            selected={Array.isArray(field.value) ? field.value : []}
                            onChange={field.onChange}
                            allowCustom={true}
                            placeholder="Selecionar contraindicações..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="body_parts"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Partes do Corpo</FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={getBodyPartsOptions()}
                            selected={Array.isArray(field.value) ? field.value : []}
                            onChange={field.onChange}
                            allowCustom={true}
                            placeholder="Selecionar ou digitar..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="equipment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Equipamentos</FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={getEquipmentOptions()}
                            selected={Array.isArray(field.value) ? field.value : []}
                            onChange={field.onChange}
                            allowCustom={true}
                            placeholder="Selecionar ou digitar..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="alternativeEquipment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Equipamentos Alternativos</FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={getEquipmentOptions()}
                            selected={Array.isArray(field.value) ? field.value : []}
                            onChange={field.onChange}
                            allowCustom={true}
                            placeholder="Selecionar ou digitar..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4 pt-4 border-t mt-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Inteligência Clínica & Segurança
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="precaution_level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nível de Precaução</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o nível" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {getPrecautionOptions().map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="precaution_notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notas de Segurança</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: Evitar valgo dinâmico" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-sm font-semibold">
                        Referências Científicas (Wiki)
                      </FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-[10px] gap-1"
                        onClick={() => {
                          append({
                            title: "",
                            year: new Date().getFullYear(),
                            evidence_level: "ExpertOpinion",
                          });
                        }}
                      >
                        <Plus className="h-3 w-3" /> Adicionar Ref.
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {fields.map((fieldItem, index) => (
                        <div
                          key={fieldItem.id}
                          className="flex gap-2 items-start border p-3 rounded-xl bg-slate-50/50 dark:bg-slate-900/50"
                        >
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">
                                Título do Artigo
                              </label>
                              <Input
                                placeholder="Ex: Efeito do agachamento na dor lombar"
                                className="h-9 text-xs"
                                {...form.register(`scientific_references.${index}.title` as any)}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">
                                ID Wiki (Opcional)
                              </label>
                              <div className="flex gap-2 relative">
                                <Input
                                  placeholder="ID do Artigo Wiki"
                                  className="h-9 text-xs font-mono pr-8"
                                  {...form.register(
                                    `scientific_references.${index}.wiki_artifact_id` as any,
                                  )}
                                />
                                {form.watch(
                                  `scientific_references.${index}.wiki_artifact_id` as any,
                                ) &&
                                  knowledgeBase.find(
                                    (a) =>
                                      a.id ===
                                      form.getValues(
                                        `scientific_references.${index}.wiki_artifact_id` as any,
                                      ),
                                  ) && (
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 absolute right-1 top-1 text-sky-600 hover:bg-sky-50"
                                        >
                                          <BookOpen className="h-4 w-4" />
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent
                                        className="w-80 p-3 shadow-xl border-sky-100"
                                        side="top"
                                      >
                                        {(() => {
                                          const article = knowledgeBase.find(
                                            (a) =>
                                              a.id ===
                                              form.getValues(
                                                `scientific_references.${index}.wiki_artifact_id` as any,
                                              ),
                                          );
                                          if (!article) return null;
                                          return (
                                            <div className="space-y-2">
                                              <h4 className="font-bold text-sm text-slate-800 leading-tight">
                                                {article.title}
                                              </h4>
                                              <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                  {article.group}
                                                </span>
                                                <span className="text-[10px] bg-slate-100 px-1.5 rounded text-slate-500">
                                                  {article.year}
                                                </span>
                                              </div>
                                              {article.highlights &&
                                                article.highlights.length > 0 && (
                                                  <div className="mt-2 space-y-1">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                                                      Key Findings:
                                                    </p>
                                                    <ul className="text-xs text-slate-600 space-y-1">
{article.highlights.map((h, i) => (
                                                         <li key={`${i}-${h}`} className="flex gap-1.5">
                                                           <span className="text-sky-500 mt-0.5">
                                                             •
                                                           </span>{" "}
                                                           <span>{h}</span>
                                                         </li>
                                                       ))}
                                                    </ul>
                                                  </div>
                                                )}
                                            </div>
                                          );
                                        })()}
                                      </PopoverContent>
                                    </Popover>
                                  )}
                              </div>
                            </div>
                            <div className="flex gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">
                                  Ano
                                </label>
                                <Input
                                  type="number"
                                  className="h-9 text-xs w-24"
                                  {...form.register(`scientific_references.${index}.year` as any, {
                                    valueAsNumber: true,
                                  })}
                                />
                              </div>
                              <div className="flex-1 space-y-1">
                                <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">
                                  Nível de Evidência
                                </label>
                                <Select
                                  value={form.watch(
                                    `scientific_references.${index}.evidence_level` as any,
                                  )}
                                  onValueChange={(val) => {
                                    form.setValue(
                                      `scientific_references.${index}.evidence_level` as any,
                                      val,
                                    );
                                  }}
                                >
                                  <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {getEvidenceLevelOptions().map((opt) => (
                                      <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 mt-6 text-destructive hover:bg-red-50"
                            onClick={() => remove(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}

                      {fields.length === 0 && (
                        <div className="flex h-20 flex-col items-center justify-center rounded-xl border border-dashed bg-slate-50/50 dark:bg-slate-900/50">
                          <p className="text-[11px] text-slate-400">
                            Nenhuma referência adicionada
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {/* ===== COLUNA DIREITA: Mídia (sticky) ===== */}
              <aside className="border-t lg:border-t-0 lg:border-l bg-slate-50/40 dark:bg-slate-900/40 lg:sticky lg:top-0 lg:self-start lg:max-h-[calc(92vh-130px)] overflow-y-auto">
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-primary" />
                      Mídia
                    </h3>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-[11px]"
                      onClick={() => setIsGalleryOpen(true)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Galeria
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-[11px]"
                      onClick={() => imageInputRef.current?.click()}
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      Upload
                    </Button>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 text-[11px]"
                        >
                          <LinkIcon className="h-3 w-3 mr-1" />
                          Link Direto
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-3" align="end">
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold uppercase">Adicionar via URL</h4>
                          <Input
                            placeholder="https://..."
                            className="text-xs h-8"
onKeyDown={(e) => {
                               if (e.key === "Enter") {
                                 e.preventDefault();
                                 const url = e.currentTarget.value;
                                 if (!url) return;
                                 const type =
                                   url.includes("youtube.com") || url.includes("youtu.be")
                                     ? "youtube"
                                     : url.match(/\.(mp4|webm|mov)$/i)
                                       ? "video"
                                       : "image";
                                 appendMedia({ url, type, caption: "", orderIndex: mediaFields.length });
                                 e.currentTarget.value = "";
                               }
                             }}
                          />
                          <p className="text-[10px] text-muted-foreground">
                            Cole a URL e pressione Enter.
                          </p>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <input
                    type="file"
                    ref={imageInputRef}
                    className="hidden"
                    accept="image/*,video/*"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length > 0) {
                        toast({
                          title: "Dica",
                          description:
                            "Use a Galeria para gerenciar seus arquivos permanentemente.",
                        });
                      }
                    }}
                  />

<DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(e) => {
                const { active, over } = e;
                if (over && active.id !== over.id) {
                  const oldIdx = mediaFields.findIndex((i) => i.id === active.id);
                  const newIdx = mediaFields.findIndex((i) => i.id === over.id);
                  if (oldIdx !== -1 && newIdx !== -1) {
                    const sorted = arrayMove(mediaFields, oldIdx, newIdx);
                    // Reorder with update to maintain field array integrity
                    sorted.forEach((item, idx) => {
                      updateMedia(idx, { ...item, orderIndex: idx });
                    });
                  }
                }
              }}
            >
              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <ImageIcon className="h-3 w-3" />
                      Fotos ({mediaFields.filter((m) => m.type === "image").length})
                    </div>
                    {mediaFields.some((m) => m.type === "image") && (
                      <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">
                        1ª = Capa
                      </span>
                    )}
                  </div>
                  {mediaFields.some((m) => m.type === "image") ? (
                    <SortableContext
                      items={mediaFields.filter((m) => m.type === "image").map((i) => i.id)}
                      strategy={horizontalListSortingStrategy}
                    >
                      <div className="grid grid-cols-2 gap-2">
{mediaFields
  .filter((m) => m.type === "image")
  .map((item, index) => (
    <SortableMediaItem
      key={item.id}
      id={item.id}
      url={item.url}
      type={item.type}
      caption={item.caption || null}
      onRemove={() => removeMedia(index)}
      onCaptionChange={(val) => updateMedia(index, { ...item, caption: val })}
      onUrlChange={(val) => updateMedia(index, { ...item, url: val })}
    />
  ))}
                      </div>
                    </SortableContext>
                  ) : (
                    <div className="flex h-20 flex-col items-center justify-center rounded-xl border-2 border-dashed bg-white/50 dark:bg-slate-900/50">
                      <p className="text-[10px] text-slate-400 italic">
                        Nenhuma foto adicionada
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <VideoIcon className="h-3 w-3" />
                    Vídeos / YouTube ({mediaFields.filter((m) => m.type !== "image").length})
                  </div>
                  {mediaFields.some((m) => m.type !== "image") ? (
                    <SortableContext
                      items={mediaFields.filter((m) => m.type !== "image").map((i) => i.id)}
                      strategy={horizontalListSortingStrategy}
                    >
                      <div className="grid grid-cols-2 gap-2">
{mediaFields
  .filter((m) => m.type !== "image")
  .map((item, index) => (
    <SortableMediaItem
      key={item.id}
      id={item.id}
      url={item.url}
      type={item.type}
      caption={item.caption || null}
      onRemove={() => removeMedia(index)}
      onCaptionChange={(val) => updateMedia(index, { ...item, caption: val })}
      onUrlChange={(val) => updateMedia(index, { ...item, url: val })}
    />
  ))}
                      </div>
                    </SortableContext>
                  ) : (
                    <div className="flex h-20 flex-col items-center justify-center rounded-xl border-2 border-dashed bg-white/50 dark:bg-slate-900/50">
                      <p className="text-[10px] text-slate-400 italic">
                        Nenhum vídeo adicionado
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </DndContext>
                </div>
              </aside>
            </form>
          </Form>
        </div>

        {isUploading && (
          <div className="px-4 sm:px-6 py-2 border-t">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">Fazendo upload...</span>
              <span className="text-xs font-medium text-muted-foreground">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-1" />
          </div>
        )}

        <div className="p-4 sm:p-6 border-t bg-gray-50 flex items-center justify-end gap-3 shrink-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="exercise-form" disabled={isSaving || isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando... {uploadProgress}%
              </>
            ) : exercise ? (
              "Salvar Alterações"
            ) : (
              "Criar Exercício"
            )}
          </Button>
        </div>

<MediaGalleryModal
  open={isGalleryOpen}
  onOpenChange={setIsGalleryOpen}
  onSelect={(item) => {
    appendMedia({
      url: item.url,
      type: item.type,
      caption: "",
      orderIndex: mediaFields.length,
    });
    setIsGalleryOpen(false);
    toast({
      title: "Mídia adicionada",
      description: `${item.name} foi anexado ao exercício.`,
    });
  }}
/>

        <React.Suspense fallback={null}>
          <WgerImportModal
            open={isWgerOpen}
            onOpenChange={setIsWgerOpen}
            onImport={(enrichedData) => {
              const diffMap: any = {
                Iniciante: "Iniciante",
                Intermediário: "Intermediário",
                Avançado: "Avançado",
              };

              form.setValue("name", enrichedData.name || "");
              form.setValue("description", enrichedData.description || "");
              form.setValue("category", enrichedData.category || "");
              form.setValue("difficulty", diffMap[enrichedData.difficulty] || "Iniciante");
              form.setValue("instructions", enrichedData.instructions || "");

              if (enrichedData.aliases_pt) form.setValue("aliases_pt", enrichedData.aliases_pt);
              if (enrichedData.body_parts) form.setValue("body_parts", enrichedData.body_parts);
              if (enrichedData.equipment) form.setValue("equipment", enrichedData.equipment);
              if (enrichedData.precaution_level) {
                form.setValue("precaution_level", enrichedData.precaution_level);
              }
              if (enrichedData.precaution_notes) {
                form.setValue("precaution_notes", enrichedData.precaution_notes);
              }
              if (enrichedData.scientific_references) {
                replace(enrichedData.scientific_references);
              }
              if (enrichedData.media) {
                enrichedData.media.forEach((m: any, i: number) => {
                  appendMedia({
                    ...m,
                    orderIndex: mediaFields.length + i,
                  });
                });
              }
            }}
          />
        </React.Suspense>
      </DialogContent>
    </Dialog>
  );
}
