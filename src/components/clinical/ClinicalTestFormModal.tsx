import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { clinicalTestsApi, type ClinicalTestTemplateRecord } from "@/api/v2";
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
import { MagicTextarea } from "@/components/ai/MagicTextarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Save,
  Loader2,
  BookOpen,
  Settings,
  BarChart3,
  Video,
  Image as ImageIcon,
  Plus,
} from "lucide-react";
import { ClinicalTestMetricsBuilder, MetricField } from "./ClinicalTestMetricsBuilder";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { useIsMobile } from "@/hooks/use-mobile";
import { MediaLibrarySelectorModal } from "./MediaLibrarySelectorModal";
import { ExerciseVideoUpload } from "@/components/exercises/ExerciseVideoUpload";
import { ExerciseMedia } from "@/services/exerciseVideos";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UploadCloud, FolderOpen } from "lucide-react";

interface ClinicalTest extends Omit<ClinicalTestTemplateRecord, "fields_definition"> {
  id?: string;
  purpose: string | null;
  execution: string | null;
  reference?: string | null;
  sensitivity_specificity?: string | null;
  fields_definition?: MetricField[];
  organization_id?: string;
  regularity_sessions?: number | null;
  layout_type?: string | null;
  is_builtin?: boolean;
  is_custom?: boolean;
}

interface ClinicalTestFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  test?: ClinicalTest | null;
  mode: "create" | "edit";
}

const CATEGORIES = ["Ortopedia", "Esportiva", "Pós-Operatório", "Neurológico", "Respiratório"];
const TARGET_JOINTS = [
  "Ombro",
  "Joelho",
  "Quadril",
  "Tornozelo",
  "Coluna",
  "Cervical",
  "Punho",
  "Cotovelo",
];
const TEST_TYPES = [
  { value: "special_test", label: "Teste Especial" },
  { value: "functional_test", label: "Teste Funcional" },
];

export function ClinicalTestFormModal({
  open,
  onOpenChange,
  test,
  mode,
}: ClinicalTestFormModalProps) {
  const isMobile = useIsMobile();
  const { user, organizationId } = useAuth();
  const queryClient = useQueryClient();
  const isLibraryEdit = mode === "create" && !!test?.is_builtin;

  const [formData, setFormData] = useState<ClinicalTest>({
    name: "",
    name_en: "",
    category: "",
    target_joint: "",
    purpose: "",
    execution: "",
    positive_sign: "",
    reference: "",
    sensitivity_specificity: "",
    tags: [],
    type: "special_test",
    fields_definition: [],
    regularity_sessions: null,
    layout_type: undefined,
    image_url: "",
    initial_position_image_url: "",
    final_position_image_url: "",
    media_urls: [],
  });

  const [tagsInput, setTagsInput] = useState("");

  // Media selection states
  const [activeMediaField, setActiveMediaField] = useState<
    "image_url" | "initial_position_image_url" | "final_position_image_url" | "media_urls" | null
  >(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const handleOpenGallery = (
    field: "image_url" | "initial_position_image_url" | "final_position_image_url" | "media_urls",
  ) => {
    setActiveMediaField(field);
    setIsGalleryOpen(true);
  };

  const handleOpenUpload = (
    field: "image_url" | "initial_position_image_url" | "final_position_image_url" | "media_urls",
  ) => {
    setActiveMediaField(field);
    setIsUploadOpen(true);
  };

  const handleMediaSelected = (url: string) => {
    if (!activeMediaField) return;

    if (activeMediaField === "media_urls") {
      const currentUrls = formData.media_urls || [];
      if (!currentUrls.includes(url)) {
        setFormData({ ...formData, media_urls: [...currentUrls, url] });
      }
    } else {
      setFormData({ ...formData, [activeMediaField]: url });
    }
    setIsGalleryOpen(false);
  };

  const handleUploadSuccess = (media: ExerciseMedia) => {
    const url = media.video_url;
    if (!activeMediaField) return;

    if (activeMediaField === "media_urls") {
      const currentUrls = formData.media_urls || [];
      if (!currentUrls.includes(url)) {
        setFormData({ ...formData, media_urls: [...currentUrls, url] });
      }
    } else {
      setFormData({ ...formData, [activeMediaField]: url });
    }
    setIsUploadOpen(false);
  };

  useEffect(() => {
    if (test) {
      setFormData({
        ...test,
        fields_definition: Array.isArray(test.fields_definition) ? test.fields_definition : [],
        layout_type: test.layout_type ?? undefined,
        image_url: test.image_url ?? "",
        initial_position_image_url: test.initial_position_image_url ?? "",
        final_position_image_url: test.final_position_image_url ?? "",
        media_urls: Array.isArray(test.media_urls) ? test.media_urls : [],
      });
      setTagsInput((test.tags || []).join(", "));
    } else if (mode === "create") {
      setFormData({
        name: "",
        name_en: "",
        category: "",
        target_joint: "",
        purpose: "",
        execution: "",
        positive_sign: "",
        reference: "",
        sensitivity_specificity: "",
        tags: [],
        type: "special_test",
        fields_definition: [],
        regularity_sessions: null,
        layout_type: undefined,
        image_url: "",
        initial_position_image_url: "",
        final_position_image_url: "",
        media_urls: [],
      });
      setTagsInput("");
    }
  }, [test, mode, open]);

  const mutation = useMutation({
    mutationFn: async (data: ClinicalTest) => {
      const payload = {
        name: data.name,
        name_en: data.name_en || null,
        category: data.category || null,
        target_joint: data.target_joint || null,
        purpose: data.purpose || null,
        execution: data.execution || null,
        positive_sign: data.positive_sign || null,
        reference: data.reference || null,
        sensitivity_specificity: data.sensitivity_specificity || null,
        tags: data.tags || [],
        type: data.type || "special_test",
        fields_definition: data.fields_definition || [],
        regularity_sessions: data.regularity_sessions || null,
        layout_type: data.layout_type || null,
        image_url: data.image_url || null,
        initial_position_image_url: data.initial_position_image_url || null,
        final_position_image_url: data.final_position_image_url || null,
        media_urls: data.media_urls?.length ? data.media_urls : null,
        organization_id: organizationId,
        created_by: user?.uid,
        is_custom: true,
      };

      if (mode === "edit" && data.id) {
        return await clinicalTestsApi.update(data.id, payload);
      }
      return await clinicalTestsApi.create(payload);
    },
    onSuccess: () => {
      const successMessage = isLibraryEdit
        ? "Teste clínico salvo como versão editável!"
        : mode === "create"
          ? "Teste clínico criado com sucesso!"
          : "Teste clínico atualizado!";

      toast.success(successMessage);
      queryClient.invalidateQueries({ queryKey: ["clinical-tests-library"] });
      onOpenChange(false);
    },
    onError: (error) => {
      logger.error("Error saving test", error, "ClinicalTestFormModal");
      toast.error("Erro ao salvar teste clínico");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    mutation.mutate({ ...formData, tags });
  };

  const isPending = mutation.isPending;
  const modalTitle =
    isLibraryEdit || mode === "edit"
      ? "Editar Teste Clínico"
      : test
        ? "Duplicar Teste Clínico"
        : "Novo Teste Clínico";
  const submitLabel = isLibraryEdit || mode === "edit" ? "Salvar Alterações" : "Criar Teste";

  return (
    <CustomModal
      open={open}
      onOpenChange={onOpenChange}
      isMobile={isMobile}
      contentClassName="max-w-3xl h-[90vh] bg-white/70 backdrop-blur-2xl border-white/20 shadow-2xl overflow-hidden rounded-3xl"
    >
      <CustomModalHeader
        onClose={() => onOpenChange(false)}
        className="border-b border-black/5 pb-4"
      >
        <CustomModalTitle className="text-2xl font-black flex items-center gap-3 text-slate-900 tracking-tight">
          <div className="p-2 bg-teal-500/10 rounded-2xl">
            {mode === "create" ? (
              <Plus className="h-6 w-6 text-teal-600" />
            ) : (
              <Settings className="h-6 w-6 text-teal-600" />
            )}
          </div>
          {modalTitle}
        </CustomModalTitle>
      </CustomModalHeader>

      <Tabs defaultValue="basic" className="flex-1 flex flex-col overflow-hidden bg-transparent">
        <TabsList className="px-6 py-8 bg-transparent border-b border-black/5 justify-start rounded-none shrink-0 overflow-x-auto scrollbar-hide gap-6">
          <TabsTrigger
            value="basic"
            className="gap-2 px-0 pb-3 border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:text-teal-600 rounded-none font-bold transition-all"
          >
            <BookOpen className="h-4 w-4" /> Básico
          </TabsTrigger>
          <TabsTrigger
            value="metrics"
            className="gap-2 px-0 pb-3 border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:text-teal-600 rounded-none font-bold transition-all"
          >
            <BarChart3 className="h-4 w-4" /> Métricas
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="gap-2 px-0 pb-3 border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:text-teal-600 rounded-none font-bold transition-all"
          >
            <Settings className="h-4 w-4" /> Configurações
          </TabsTrigger>
          <TabsTrigger
            value="media"
            className="gap-2 px-0 pb-3 border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:text-teal-600 rounded-none font-bold transition-all"
          >
            <Video className="h-4 w-4" /> Mídia
          </TabsTrigger>
        </TabsList>

        <CustomModalBody className="p-0 sm:p-0">
          <div className="p-6">
            <TabsContent value="basic" className="mt-0 space-y-6 focus-visible:ring-0">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2 md:col-span-1 space-y-2">
                  <Label
                    htmlFor="name"
                    className="text-xs font-black uppercase tracking-wider text-slate-500 ml-1"
                  >
                    Nome do Teste *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Teste de Lachman"
                    required
                    className="h-12 bg-white/50 border-white/40 focus:bg-white focus:border-teal-500/50 rounded-xl transition-all shadow-sm"
                  />
                </div>
                <div className="col-span-2 md:col-span-1 space-y-2">
                  <Label
                    htmlFor="name_en"
                    className="text-xs font-black uppercase tracking-wider text-slate-500 ml-1"
                  >
                    Nome (Inglês)
                  </Label>
                  <Input
                    id="name_en"
                    value={formData.name_en || ""}
                    onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                    placeholder="Ex: Lachman Test"
                    className="h-12 bg-white/50 border-white/40 focus:bg-white focus:border-teal-500/50 rounded-xl transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="category"
                    className="text-xs font-black uppercase tracking-wider text-slate-500 ml-1"
                  >
                    Categoria
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger
                      id="category"
                      className="h-12 bg-white/50 border-white/40 focus:bg-white focus:border-teal-500/50 rounded-xl transition-all shadow-sm"
                    >
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-white/20 backdrop-blur-xl">
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="target_joint"
                    className="text-xs font-black uppercase tracking-wider text-slate-500 ml-1"
                  >
                    Articulação/Região
                  </Label>
                  <Select
                    value={formData.target_joint}
                    onValueChange={(value) => setFormData({ ...formData, target_joint: value })}
                  >
                    <SelectTrigger
                      id="target_joint"
                      className="h-12 bg-white/50 border-white/40 focus:bg-white focus:border-teal-500/50 rounded-xl transition-all shadow-sm"
                    >
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-white/20 backdrop-blur-xl">
                      {TARGET_JOINTS.map((joint) => (
                        <SelectItem key={joint} value={joint}>
                          {joint}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Purpose */}
              <div className="space-y-2">
                <Label
                  htmlFor="purpose"
                  className="text-xs font-black uppercase tracking-wider text-slate-500 ml-1"
                >
                  Propósito
                </Label>
                <MagicTextarea
                  id="purpose"
                  showMic={false}
                  value={formData.purpose || ""}
                  onValueChange={(val) => setFormData({ ...formData, purpose: val })}
                  placeholder="Descreva o objetivo clínico do teste..."
                  rows={2}
                  className="bg-white/50 border-white/40 focus:bg-white focus:border-teal-500/50 rounded-2xl transition-all shadow-sm min-h-[80px]"
                />
              </div>

              {/* Execution */}
              <div className="space-y-2">
                <Label
                  htmlFor="execution"
                  className="text-xs font-black uppercase tracking-wider text-slate-500 ml-1"
                >
                  Execução
                </Label>
                <MagicTextarea
                  id="execution"
                  showMic={false}
                  value={formData.execution || ""}
                  onValueChange={(val) => setFormData({ ...formData, execution: val })}
                  placeholder="Descreva passo a passo como realizar o teste..."
                  rows={3}
                  className="bg-white/50 border-white/40 focus:bg-white focus:border-teal-500/50 rounded-2xl transition-all shadow-sm min-h-[100px]"
                />
              </div>

              {/* Positive Sign */}
              <div className="space-y-2">
                <Label
                  htmlFor="positive_sign"
                  className="text-xs font-black uppercase tracking-wider text-slate-500 ml-1"
                >
                  Interpretação Positiva
                </Label>
                <MagicTextarea
                  id="positive_sign"
                  showMic={false}
                  value={formData.positive_sign || ""}
                  onValueChange={(val) => setFormData({ ...formData, positive_sign: val })}
                  placeholder="O que indica um resultado positivo..."
                  rows={2}
                  className="bg-white/50 border-white/40 focus:bg-white focus:border-teal-500/50 rounded-2xl transition-all shadow-sm min-h-[80px]"
                />
              </div>

              {/* Reference and Sensitivity */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="reference"
                    className="text-xs font-black uppercase tracking-wider text-slate-500 ml-1"
                  >
                    Referência Bibliográfica
                  </Label>
                  <Input
                    id="reference"
                    value={formData.reference || ""}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    placeholder="Ex: Magee, 2014"
                    className="h-12 bg-white/50 border-white/40 focus:bg-white focus:border-teal-500/50 rounded-xl shadow-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="sensitivity"
                    className="text-xs font-black uppercase tracking-wider text-slate-500 ml-1"
                  >
                    Sensibilidade/Especificidade
                  </Label>
                  <Input
                    id="sensitivity"
                    value={formData.sensitivity_specificity || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sensitivity_specificity: e.target.value,
                      })
                    }
                    placeholder="Ex: 85% sens, 94% espec"
                    className="h-12 bg-white/50 border-white/40 focus:bg-white focus:border-teal-500/50 rounded-xl shadow-sm"
                  />
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label
                  htmlFor="tags"
                  className="text-xs font-black uppercase tracking-wider text-slate-500 ml-1"
                >
                  Tags (separadas por vírgula)
                </Label>
                <Input
                  id="tags"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="Ex: Ortopedia, Joelho, LCA"
                  className="h-12 bg-white/50 border-white/40 focus:bg-white focus:border-teal-500/50 rounded-xl shadow-sm"
                />
              </div>
            </TabsContent>

            <TabsContent value="metrics" className="mt-0">
              <ClinicalTestMetricsBuilder
                fields={formData.fields_definition || []}
                onChange={(fields) => setFormData({ ...formData, fields_definition: fields })}
              />
            </TabsContent>

            <TabsContent value="settings" className="mt-0 space-y-6">
              {/* Test Type */}
              <div>
                <Label htmlFor="type">Tipo de Teste</Label>
                <Select
                  value={formData.type || "special_test"}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEST_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-1">
                  Testes Especiais são qualitativos (positivo/negativo). Testes Funcionais são
                  quantitativos (medições).
                </p>
              </div>

              {/* Regularity */}
              <div>
                <Label htmlFor="regularity">Regularidade (a cada X sessões)</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="regularity"
                    type="number"
                    min={1}
                    max={100}
                    value={formData.regularity_sessions || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        regularity_sessions: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    placeholder="Ex: 4"
                    className="w-32"
                  />
                  <span className="text-sm text-slate-500">sessões</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Define a frequência recomendada para reaplicar este teste. Deixe vazio para
                  aplicar apenas quando necessário.
                </p>
              </div>

              {/* Layout no registro de medições */}
              <div>
                <Label htmlFor="layout_type">Layout no Registro de Medições</Label>
                <Select
                  value={formData.layout_type || "single"}
                  onValueChange={(value: "single" | "multi_field" | "y_balance" | "radial") =>
                    setFormData({
                      ...formData,
                      layout_type: value === "single" ? undefined : value,
                    })
                  }
                >
                  <SelectTrigger id="layout_type">
                    <SelectValue placeholder="Padrão (valor único)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Valor único (padrão)</SelectItem>
                    <SelectItem value="multi_field">Vários campos (3+)</SelectItem>
                    <SelectItem value="y_balance">Y Balance (diagrama em Y)</SelectItem>
                    <SelectItem value="radial">Radial (ex.: Estrela de Maigne)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-1">
                  Define como o teste aparece ao registrar medições na evolução (diagrama, vários
                  campos, etc.).
                </p>
              </div>
            </TabsContent>

            <TabsContent value="media" className="mt-0 space-y-6">
              {/* YouTube/Video URL */}
              <div className="space-y-2">
                <Label
                  htmlFor="media_urls"
                  className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 ml-1"
                >
                  <Video className="h-4 w-4" /> Vídeos (URLs)
                </Label>
                <div className="flex gap-2">
                  <MagicTextarea
                    id="media_urls"
                    showMic={false}
                    value={formData.media_urls?.join(", ") || ""}
                    onValueChange={(val) => {
                      const urls = val
                        .split(",")
                        .map((u) => u.trim())
                        .filter(Boolean);
                      setFormData({ ...formData, media_urls: urls });
                    }}
                    placeholder="https://www.youtube.com/watch?v=..., https://vimeo.com/..."
                    rows={2}
                    className="bg-white/50 border-white/40 focus:bg-white focus:border-teal-500/50 rounded-2xl shadow-sm min-h-[80px]"
                  />
                  <div className="flex flex-col gap-2 shrink-0">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 rounded-xl bg-white/50 border-white/40 hover:bg-white hover:border-teal-500/50 transition-all"
                            onClick={() => handleOpenGallery("media_urls")}
                          >
                            <FolderOpen className="h-4 w-4 text-teal-600" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Galeria de Vídeos</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 rounded-xl bg-white/50 border-white/40 hover:bg-white hover:border-teal-500/50 transition-all"
                            onClick={() => handleOpenUpload("media_urls")}
                          >
                            <UploadCloud className="h-4 w-4 text-teal-600" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Upload de Vídeo</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-1 italic pl-1">
                  Adicione links do YouTube/Vimeo ou mídias da galeria.
                </p>
              </div>

              {/* Main Image URL */}
              <div className="space-y-2">
                <Label
                  htmlFor="image_url_media"
                  className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 ml-1"
                >
                  <ImageIcon className="h-4 w-4" /> Imagem de Capa
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="image_url_media"
                    type="url"
                    value={formData.image_url || ""}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://... (imagem de execução)"
                    className="h-12 bg-white/50 border-white/40 focus:bg-white focus:border-teal-500/50 rounded-xl shadow-sm"
                  />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-12 w-12 rounded-xl bg-white/50 border-white/40 hover:bg-white hover:border-teal-500/50 transition-all shrink-0"
                          onClick={() => handleOpenGallery("image_url")}
                        >
                          <FolderOpen className="h-5 w-5 text-teal-600" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Escolher da Galeria</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-12 w-12 rounded-xl bg-white/50 border-white/40 hover:bg-white hover:border-teal-500/50 transition-all shrink-0"
                          onClick={() => handleOpenUpload("image_url")}
                        >
                          <UploadCloud className="h-5 w-5 text-teal-600" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Fazer Upload</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-xs text-slate-500 mt-1 italic pl-1">
                  Imagem exibida como referência visual principal do teste.
                </p>
              </div>

              {/* Initial and Final Positions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="initial_position_image"
                    className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 ml-1"
                  >
                    <ImageIcon className="h-4 w-4" /> Posição Inicial
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="initial_position_image"
                      type="url"
                      value={formData.initial_position_image_url || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          initial_position_image_url: e.target.value,
                        })
                      }
                      placeholder="https://..."
                      className="h-12 bg-white/50 border-white/40 focus:bg-white focus:border-teal-500/50 rounded-xl shadow-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 rounded-xl bg-white/50 border-white/40 shrink-0"
                      onClick={() => handleOpenGallery("initial_position_image_url")}
                    >
                      <FolderOpen className="h-4 w-4 text-teal-600" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 rounded-xl bg-white/50 border-white/40 shrink-0"
                      onClick={() => handleOpenUpload("initial_position_image_url")}
                    >
                      <UploadCloud className="h-4 w-4 text-teal-600" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="final_position_image"
                    className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 ml-1"
                  >
                    <ImageIcon className="h-4 w-4" /> Posição Final
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="final_position_image"
                      type="url"
                      value={formData.final_position_image_url || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          final_position_image_url: e.target.value,
                        })
                      }
                      placeholder="https://..."
                      className="h-12 bg-white/50 border-white/40 focus:bg-white focus:border-teal-500/50 rounded-xl shadow-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 rounded-xl bg-white/50 border-white/40 shrink-0"
                      onClick={() => handleOpenGallery("final_position_image_url")}
                    >
                      <FolderOpen className="h-4 w-4 text-teal-600" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 rounded-xl bg-white/50 border-white/40 shrink-0"
                      onClick={() => handleOpenUpload("final_position_image_url")}
                    >
                      <UploadCloud className="h-4 w-4 text-teal-600" />
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </CustomModalBody>
      </Tabs>

      <CustomModalFooter
        isMobile={isMobile}
        className="bg-transparent border-t border-black/5 py-4"
      >
        <Button
          type="button"
          variant="ghost"
          onClick={() => onOpenChange(false)}
          disabled={isPending}
          className="hover:bg-black/5 text-slate-600 font-bold px-8 rounded-xl transition-all"
        >
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          className="bg-teal-600 hover:bg-teal-700 text-white font-black px-10 rounded-xl gap-2 shadow-lg shadow-teal-500/20 transition-all transform active:scale-95"
          disabled={isPending || !formData.name}
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {submitLabel}
        </Button>
      </CustomModalFooter>

      {/* Media Picker Modals */}
      <MediaLibrarySelectorModal
        open={isGalleryOpen}
        onOpenChange={setIsGalleryOpen}
        onSelect={handleMediaSelected}
        title={
          activeMediaField === "media_urls"
            ? "Selecionar Vídeo da Galeria"
            : "Selecionar Imagem da Galeria"
        }
      />

      <ExerciseVideoUpload
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        onSuccess={handleUploadSuccess}
        defaultValues={{
          title: `Mídia para ${formData.name}`,
          category: formData.category || "mobilidade",
        }}
      />
    </CustomModal>
  );
}
