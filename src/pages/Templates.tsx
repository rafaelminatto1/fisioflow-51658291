import {
  Activity,
  ClipboardList,
  History,
  LayoutGrid,
  Search,
  Zap,
  Stethoscope,
  Brain,
  Wind,
  ArrowRight,
  Info,
  Star,
  Pencil,
  Trash2,
  Archive,
  MoreVertical,
  Eye,
  Play,
  Copy,
  CalendarClock,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  useEvaluationForms,
  useDeleteEvaluationForm,
  useUpdateEvaluationForm,
  useDuplicateEvaluationForm,
  useCreatePatientEvaluationResponse,
} from "@/hooks/useEvaluationForms";
import { usePatientsPageData } from "@/hooks/usePatientsPage";
import { evaluationFormsApi } from "@/api/v2";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PatientCombobox } from "@/components/ui/patient-combobox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { builtinEvaluationTemplates } from "@/data/defaultEvaluationTemplates";
import { toast } from "sonner";
import { accentIncludes } from "@/lib/utils/bilingualSearch";

const CATEGORY_CONFIG: Record<
  string,
  { label: string; icon: LucideIcon; color: string; bg: string }
> = {
  ortopedica: {
    label: "Ortopédica",
    icon: Activity,
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950/30",
  },
  esportiva: {
    label: "Esportiva",
    icon: Zap,
    color: "text-orange-600",
    bg: "bg-orange-50 dark:bg-orange-950/30",
  },
  "pos-operatorio": {
    label: "Pós-Op",
    icon: History,
    color: "text-purple-600",
    bg: "bg-purple-50 dark:bg-purple-950/30",
  },
  geral: {
    label: "Geral",
    icon: ClipboardList,
    color: "text-slate-600",
    bg: "bg-slate-50 dark:bg-slate-950/30",
  },
  pilates: {
    label: "Pilates",
    icon: Star,
    color: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  "dor-cronica": {
    label: "Dor Crônica",
    icon: Stethoscope,
    color: "text-red-600",
    bg: "bg-red-50 dark:bg-red-950/30",
  },
  neurologica: {
    label: "Neurológica",
    icon: Brain,
    color: "text-indigo-600",
    bg: "bg-indigo-50 dark:bg-indigo-950/30",
  },
  respiratoria: {
    label: "Respiratória",
    icon: Wind,
    color: "text-cyan-600",
    bg: "bg-cyan-50 dark:bg-cyan-950/30",
  },
};

export default function Templates() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const { data: userTemplates } = useEvaluationForms();
  const { data: patientsData } = usePatientsPageData();
  const patients = patientsData?.patients || [];

  const deleteForm = useDeleteEvaluationForm();
  const updateForm = useUpdateEvaluationForm();
  const duplicateForm = useDuplicateEvaluationForm();
  const createEvaluationResponse = useCreatePatientEvaluationResponse();

  // Use Template State
  const [selectedTemplateForUse, setSelectedTemplateForUse] = useState<{
    id: string;
    nome: string;
  } | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [evaluationTiming, setEvaluationTiming] = useState<"now" | "scheduled">("now");
  const [scheduledFor, setScheduledFor] = useState("");
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
  const persistedBuiltinTemplates = useRef<Record<string, string>>({});

  // Preview State
  const [previewTemplate, setPreviewTemplate] = useState<any | null>(null);

  const allTemplates = useMemo(() => {
    const customMapped = (userTemplates || []).map((t) => ({
      ...t,
      isCustom: true,
      category: t.categoria || "personalizado",
      fieldsCount: t.fields?.length || 0,
    }));

    const builtinMapped = (builtinEvaluationTemplates || []).map((t) => ({
      ...t,
      isCustom: false,
      category: t.category,
      fieldsCount: t.fields.length,
    }));

    return [...customMapped, ...builtinMapped];
  }, [userTemplates]);

  const filteredTemplates = useMemo(() => {
    return allTemplates.filter((t) => {
      const matchesSearch =
        accentIncludes(t.nome, search) || accentIncludes(t.descricao || "", search);
      const matchesCategory = activeCategory ? t.category === activeCategory : true;
      const isAtivo = t.isCustom ? t.ativo !== false : true;
      return matchesSearch && matchesCategory && isAtivo;
    });
  }, [search, activeCategory, allTemplates]);

  const categories = useMemo(() => {
    const cats = new Set(allTemplates.map((t) => t.category));
    return Array.from(cats) as string[];
  }, [allTemplates]);

  const handleDelete = async (id: string) => {
    try {
      await deleteForm.mutateAsync(id);
      toast.success("Template excluído com sucesso");
    } catch (error) {
      console.error("Erro ao excluir template:", error);
      toast.error("Erro ao excluir template");
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await updateForm.mutateAsync({ id, ativo: false });
      toast.success("Template arquivado com sucesso");
    } catch (error) {
      console.error("Erro ao arquivar template:", error);
      toast.error("Erro ao arquivar template");
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      let duplicatedTemplate;
      if (id.startsWith("builtin-")) {
        // Para templates embutidos, primeiro garantimos que ele existe no banco
        const persistedId = await ensurePersistedTemplate(id);
        // Agora que temos um ID real do banco, duplicamos ele para criar a versão editável do usuário
        duplicatedTemplate = await duplicateForm.mutateAsync(persistedId);
      } else {
        duplicatedTemplate = await duplicateForm.mutateAsync(id);
      }

      toast.success("Cópia editável criada com sucesso");
      if (duplicatedTemplate?.id) {
        navigate(`/templates/${duplicatedTemplate.id}/edit`);
      }
    } catch (error) {
      console.error("Erro ao duplicar template:", error);
      toast.error("Erro ao duplicar template");
    }
  };

  const resetUseTemplateModal = () => {
    setSelectedTemplateForUse(null);
    setSelectedPatientId("");
    setEvaluationTiming("now");
    setScheduledFor("");
  };

  const ensurePersistedTemplate = async (templateId: string) => {
    if (!templateId.startsWith("builtin-")) return templateId;
    if (persistedBuiltinTemplates.current[templateId]) {
      return persistedBuiltinTemplates.current[templateId];
    }

    const template = allTemplates.find((item) => item.id === templateId);
    if (!template) throw new Error("Template não encontrado");

    const existing = (userTemplates || []).find(
      (item) =>
        item.nome === template.nome &&
        item.tipo === template.tipo &&
        item.referencias === template.referencias,
    );
    if (existing?.id) {
      persistedBuiltinTemplates.current[templateId] = existing.id;
      return existing.id;
    }

    const formResponse = await evaluationFormsApi.create({
      nome: template.nome,
      descricao: template.descricao,
      referencias: template.referencias,
      tipo: template.tipo || template.category || "geral",
      ativo: true,
    });
    const form = formResponse?.data ?? formResponse;
    const formId = String(form.id);

    await Promise.all(
      (template.fields || []).map((field: any, index: number) =>
        evaluationFormsApi.addField(formId, {
          tipo_campo: field.tipo_campo || "texto_curto",
          label: field.label,
          placeholder: field.placeholder ?? null,
          opcoes: field.opcoes ?? null,
          ordem: field.ordem ?? index,
          obrigatorio: Boolean(field.obrigatorio),
          grupo: field.grupo ?? field.section ?? null,
          descricao: field.descricao ?? field.description ?? null,
          minimo: field.minimo ?? field.min ?? null,
          maximo: field.maximo ?? field.max ?? null,
        }),
      ),
    );

    persistedBuiltinTemplates.current[templateId] = formId;
    return formId;
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplateForUse || !selectedPatientId) return;

    if (evaluationTiming === "scheduled" && !scheduledFor) {
      toast.error("Informe a data e hora da avaliação");
      return;
    }

    const scheduledDate = evaluationTiming === "scheduled" ? new Date(scheduledFor) : null;

    if (scheduledDate && Number.isNaN(scheduledDate.getTime())) {
      toast.error("Data da avaliação inválida");
      return;
    }

    if (scheduledDate && scheduledDate.getTime() < Date.now() - 60_000) {
      toast.error("A data da avaliação não pode estar no passado");
      return;
    }

    setIsApplyingTemplate(true);
    try {
      const timing = evaluationTiming;
      const formId = await ensurePersistedTemplate(selectedTemplateForUse.id);
      const now = new Date().toISOString();
      const evaluation = await createEvaluationResponse.mutateAsync({
        formId,
        patient_id: selectedPatientId,
        responses: {},
        status: timing === "now" ? "in_progress" : "scheduled",
        started_at: timing === "now" ? now : null,
        scheduled_for: timing === "scheduled" && scheduledDate ? scheduledDate.toISOString() : null,
      });

      const patientId = selectedPatientId;
      resetUseTemplateModal();

      if (timing === "now") {
        navigate(`/patients/${patientId}/evaluations/new/${formId}?evaluationId=${evaluation.id}`);
        return;
      }

      toast.success("Avaliação agendada no perfil do paciente");
      navigate(`/patients/${patientId}?tab=clinical`);
    } catch (error) {
      console.error("Erro ao criar avaliação:", error);
      toast.error("Não foi possível criar a avaliação");
    } finally {
      setIsApplyingTemplate(false);
    }
  };

  // Main render
  return (
    <MainLayout>
      <div className="container mx-auto p-6 max-w-7xl space-y-10 pb-24 md:pb-12 animate-in fade-in duration-700">
        {/* Header Section */}
        <Card className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-8 md:p-12 text-white border-0 shadow-premium-xl">
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px]" />

          <div className="relative z-10 max-w-3xl space-y-4 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-2">
              <ClipboardList className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                Protocolos de Avaliação
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight">
              Biblioteca de <span className="text-primary">Templates</span>
            </h1>
            <p className="text-white/60 text-lg md:text-xl font-medium max-w-2xl leading-relaxed">
              Economize tempo e padronize seus atendimentos com fichas de avaliação baseadas em
              evidência clínica e modelos padrão ouro.
            </p>
          </div>
        </Card>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <div className="relative flex-1 w-full group text-left">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Buscar templates por patologia, nome ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-14 pl-12 pr-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border-border/40 shadow-premium-sm focus:shadow-premium-md transition-all text-base font-medium"
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            <Button
              variant={activeCategory === null ? "default" : "outline"}
              onClick={() => setActiveCategory(null)}
              className={cn(
                "rounded-xl h-11 px-6 font-bold uppercase tracking-widest text-[10px] transition-all",
                activeCategory === null ? "shadow-premium-md" : "border-border/40 text-slate-500",
              )}
            >
              Todos
            </Button>
            {categories.map((cat) => {
              if (cat === "personalizado") {
                return (
                  <Button
                    key={cat}
                    variant={activeCategory === cat ? "default" : "outline"}
                    onClick={() => setActiveCategory(cat || null)}
                    className={cn(
                      "rounded-xl h-11 px-6 font-bold uppercase tracking-widest text-[10px] transition-all gap-2",
                      activeCategory === cat
                        ? "shadow-premium-md"
                        : "border-border/40 text-slate-500",
                    )}
                  >
                    <Star className="w-3.5 h-3.5" />
                    Meus Modelos
                  </Button>
                );
              }
              const config = (cat && CATEGORY_CONFIG[cat]) || CATEGORY_CONFIG.geral;
              return (
                <Button
                  key={cat}
                  variant={activeCategory === cat ? "default" : "outline"}
                  onClick={() => setActiveCategory(cat || null)}
                  className={cn(
                    "rounded-xl h-11 px-6 font-bold uppercase tracking-widest text-[10px] transition-all gap-2",
                    activeCategory === cat
                      ? "shadow-premium-md"
                      : "border-border/40 text-slate-500",
                  )}
                >
                  <config.icon className="w-3.5 h-3.5" />
                  {config.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => {
            const categoryKey = template.category || "geral";
            const config =
              CATEGORY_CONFIG[categoryKey] ||
              (categoryKey === "personalizado"
                ? {
                    label: "Personalizado",
                    icon: Star,
                    color: "text-amber-500",
                    bg: "bg-amber-50",
                  }
                : CATEGORY_CONFIG.geral);

            return (
              <Card
                key={template.id}
                className={cn(
                  "group relative overflow-hidden rounded-[2rem] border-border/40 bg-white dark:bg-slate-900 p-6 shadow-premium-sm hover:shadow-premium-xl transition-all duration-500 hover:-translate-y-2 border-t-4 text-left",
                  template.isCustom ? "border-t-amber-500" : "",
                )}
                style={!template.isCustom ? { borderTopColor: "var(--primary)" } : {}}
              >
                {/* Category Badge */}
                <div className="flex items-center justify-between mb-6">
                  <div
                    className={cn("px-4 py-1.5 rounded-full flex items-center gap-2", config.bg)}
                  >
                    <config.icon className={cn("w-3.5 h-3.5", config.color)} />
                    <span
                      className={cn(
                        "text-[10px] font-black uppercase tracking-widest",
                        config.color,
                      )}
                    >
                      {config.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <LayoutGrid className="w-4 h-4" />
                    <span className="text-[11px] font-black">{template.fieldsCount} campos</span>
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <h3 className="text-xl font-black tracking-tight group-hover:text-primary transition-colors flex-1">
                      {template.nome}
                    </h3>
                    {template.isCustom && (
                      <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg hover:bg-amber-50 hover:text-amber-600"
                          onClick={() => navigate(`/templates/${template.id}/edit`)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir Template?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. O template "{template.nome}" será
                                removido permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(template.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed line-clamp-3">
                    {template.descricao}
                  </p>
                </div>

                {/* Footer Actions */}
                <div className="mt-8 flex items-center justify-between">
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 gap-2 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/5 px-2 transition-all"
                      onClick={() => {
                        const fullTemplate = allTemplates.find((t) => t.id === template.id);
                        setPreviewTemplate(fullTemplate);
                      }}
                      title="Visualizar Detalhes"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>

                    {template.isCustom ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 gap-2 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/5 px-2 transition-all"
                        onClick={() => navigate(`/templates/${template.id}/edit`)}
                        title="Editar Template"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 gap-2 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/5 px-2 transition-all"
                        onClick={() => handleDuplicate(template.id)}
                        title="Editar cópia nos meus modelos"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-xl text-slate-400 hover:text-slate-600 px-2"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-48 rounded-xl p-2 shadow-premium-lg border-border/40"
                      >
                        <DropdownMenuItem
                          onClick={() =>
                            setPreviewTemplate(allTemplates.find((t) => t.id === template.id))
                          }
                          className="rounded-lg gap-2 cursor-pointer font-medium"
                        >
                          <Eye className="w-4 h-4 text-slate-400" />
                          Visualizar Detalhes
                        </DropdownMenuItem>

                        {template.isCustom ? (
                          <>
                            <DropdownMenuItem
                              onClick={() => navigate(`/templates/${template.id}/edit`)}
                              className="rounded-lg gap-2 cursor-pointer font-medium"
                            >
                              <Pencil className="w-4 h-4 text-slate-400" />
                              Editar Modelo
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDuplicate(template.id)}
                              className="rounded-lg gap-2 cursor-pointer font-medium"
                            >
                              <Copy className="w-4 h-4 text-slate-400" />
                              Duplicar Modelo
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
                            <DropdownMenuItem
                              onClick={() => handleArchive(template.id)}
                              className="rounded-lg gap-2 cursor-pointer font-medium text-amber-600 hover:!text-amber-700 hover:!bg-amber-50"
                            >
                              <Archive className="w-4 h-4" />
                              Arquivar
                            </DropdownMenuItem>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  onSelect={(e) => e.preventDefault()}
                                  className="rounded-lg gap-2 cursor-pointer font-medium text-red-600 hover:!text-red-700 hover:!bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Excluir Permanente
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="rounded-[2rem] border-0 shadow-premium-2xl">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-xl font-black tracking-tight">
                                    Excluir Template?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription className="text-slate-500 font-medium">
                                    Esta ação não pode ser desfeita. O template{" "}
                                    <span className="text-slate-900 font-bold">
                                      "{template.nome}"
                                    </span>{" "}
                                    será removido permanentemente.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="mt-4">
                                  <AlertDialogCancel className="rounded-xl border-border/40">
                                    Cancelar
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(template.id)}
                                    className="bg-red-600 hover:bg-red-700 rounded-xl"
                                  >
                                    Sim, Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => handleDuplicate(template.id)}
                            className="rounded-lg gap-2 cursor-pointer font-medium"
                          >
                            <Pencil className="w-4 h-4 text-slate-400" />
                            Editar cópia
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <Button
                    size="sm"
                    className="h-10 rounded-xl px-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:scale-105 transition-all shadow-premium-sm group-hover:bg-primary group-hover:text-white"
                    onClick={() =>
                      setSelectedTemplateForUse({
                        id: template.id,
                        nome: template.nome,
                      })
                    }
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest mr-2">
                      Usar Template
                    </span>
                    <Play className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform fill-current" />
                  </Button>
                </div>

                {/* Subtle Decoration */}
                <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all duration-500" />
              </Card>
            );
          })}

          {/* Add Custom Suggestion Card */}
          <Card
            onClick={() => navigate("/templates/new")}
            className="flex flex-col items-center justify-center p-8 rounded-[2rem] border-2 border-dashed border-border/60 bg-transparent hover:border-primary/40 transition-all group cursor-pointer space-y-4"
          >
            <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
              <PlusCircle className="w-8 h-8 text-slate-400 group-hover:text-primary" />
            </div>
            <div className="text-center">
              <h4 className="text-lg font-black tracking-tight">Criar Personalizado</h4>
              <p className="text-sm text-slate-400 font-medium mt-1">
                Monte sua ficha do zero com campos personalizados.
              </p>
            </div>
            <Button
              variant="secondary"
              className="rounded-xl font-black text-[10px] uppercase tracking-widest"
            >
              Começar agora
            </Button>
          </Card>
        </div>
      </div>

      {/* Use Template Modal */}
      <Dialog
        open={!!selectedTemplateForUse}
        onOpenChange={(open) => !open && resetUseTemplateModal()}
      >
        <DialogContent className="max-w-md rounded-[2.5rem] border-0 shadow-premium-2xl p-8">
          <DialogHeader className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Play className="w-6 h-6 text-primary fill-current" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black tracking-tight">
                Nova Avaliação
              </DialogTitle>
              <DialogDescription className="text-slate-500 font-medium text-base mt-2">
                Selecione um paciente e quando a avaliação será realizada usando o template{" "}
                <span className="text-slate-900 font-bold">"{selectedTemplateForUse?.nome}"</span>.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="py-6">
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                Buscar Paciente
              </p>
              <PatientCombobox
                patients={patients}
                value={selectedPatientId}
                onValueChange={setSelectedPatientId}
                placeholder="Digite o nome do paciente..."
                className="h-14 rounded-2xl text-base font-medium"
                disabled={isApplyingTemplate}
              />
            </div>

            <div className="space-y-3 pt-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                Quando realizar
              </p>
              <RadioGroup
                value={evaluationTiming}
                onValueChange={(value) => setEvaluationTiming(value as "now" | "scheduled")}
                className="grid grid-cols-1 gap-2"
                disabled={isApplyingTemplate}
              >
                <Label
                  htmlFor="evaluation-now"
                  className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border/50 p-4 hover:bg-slate-50"
                >
                  <RadioGroupItem value="now" id="evaluation-now" />
                  <div>
                    <p className="text-sm font-bold">Realizar agora</p>
                    <p className="text-xs text-slate-500">
                      A ficha será aberta para preenchimento.
                    </p>
                  </div>
                </Label>
                <Label
                  htmlFor="evaluation-scheduled"
                  className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border/50 p-4 hover:bg-slate-50"
                >
                  <RadioGroupItem value="scheduled" id="evaluation-scheduled" />
                  <div>
                    <p className="text-sm font-bold">Agendar para depois</p>
                    <p className="text-xs text-slate-500">
                      A avaliação ficará visível no perfil do paciente.
                    </p>
                  </div>
                </Label>
              </RadioGroup>
            </div>

            {evaluationTiming === "scheduled" && (
              <div className="space-y-3 pt-2">
                <Label
                  htmlFor="scheduled-for"
                  className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1"
                >
                  Data e hora da avaliação
                </Label>
                <div className="relative">
                  <CalendarClock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="scheduled-for"
                    type="datetime-local"
                    value={scheduledFor}
                    onChange={(event) => setScheduledFor(event.target.value)}
                    className="h-12 rounded-xl pl-11 font-medium"
                    disabled={isApplyingTemplate}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="rounded-xl flex-1 font-bold h-12"
              onClick={resetUseTemplateModal}
              disabled={isApplyingTemplate}
            >
              Cancelar
            </Button>
            <Button
              className="rounded-xl flex-1 font-bold h-12 gap-2"
              disabled={
                isApplyingTemplate ||
                !selectedPatientId ||
                (evaluationTiming === "scheduled" && !scheduledFor)
              }
              onClick={handleApplyTemplate}
            >
              {isApplyingTemplate ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Criando...
                </>
              ) : evaluationTiming === "now" ? (
                <>
                  Criar e Preencher
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  Agendar Avaliação
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Template Modal */}
      <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] border-0 shadow-premium-2xl p-8 pb-10">
          {previewTemplate && (
            <div className="space-y-6">
              <DialogHeader className="space-y-4 text-left">
                <div className="flex items-center justify-between">
                  <div
                    className={cn(
                      "px-4 py-1.5 rounded-full flex items-center gap-2",
                      (CATEGORY_CONFIG[previewTemplate.category] || CATEGORY_CONFIG.geral).bg,
                    )}
                  >
                    <span
                      className={cn(
                        "text-[10px] font-black uppercase tracking-widest",
                        (CATEGORY_CONFIG[previewTemplate.category] || CATEGORY_CONFIG.geral).color,
                      )}
                    >
                      {previewTemplate.category
                        ? (CATEGORY_CONFIG[previewTemplate.category] || CATEGORY_CONFIG.geral).label
                        : "Geral"}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className="rounded-lg py-1 px-3 border-border/40 font-bold text-[10px] uppercase tracking-widest"
                  >
                    {previewTemplate.isCustom ? "Modelo Personalizado" : "Protocolo Padrão Ouro"}
                  </Badge>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <DialogTitle className="text-3xl font-black tracking-tight">
                      {previewTemplate.nome}
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 font-medium text-lg leading-relaxed">
                      {previewTemplate.descricao}
                    </DialogDescription>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/5 transition-all shrink-0"
                    onClick={() => {
                      if (previewTemplate.isCustom) {
                        navigate(`/templates/${previewTemplate.id}/edit`);
                      } else {
                        handleDuplicate(previewTemplate.id);
                      }
                    }}
                    title={previewTemplate.isCustom ? "Editar Modelo" : "Personalizar Cópia"}
                  >
                    <Pencil className="w-5 h-5" />
                  </Button>
                </div>
              </DialogHeader>

              {previewTemplate.referencias && (
                <div className="p-3 px-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center gap-4">
                  <div className="flex items-center gap-2 shrink-0">
                    <Info className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                      Referências
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic line-clamp-2">
                    {previewTemplate.referencias}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur pb-2 z-10">
                  <h4 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">
                    Estrutura do Protocolo
                  </h4>
                  <Badge className="bg-primary/10 text-primary border-primary/20">
                    {previewTemplate.fieldsCount || previewTemplate.fields?.length || 0} Campos
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {(previewTemplate.fields || []).map((field: any, fidx: number) => (
                    <div
                      key={fidx}
                      className="flex items-center justify-between p-3 rounded-xl border border-border/30 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400">
                          {fidx + 1}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                            {field.label}
                          </p>
                          <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">
                            {field.tipo_campo?.replace(/_/g, " ")}
                          </p>
                        </div>
                      </div>
                      {field.obrigatorio && (
                        <div
                          className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-sm"
                          title="Obrigatório"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-border/40">
                <Button
                  variant="outline"
                  className="rounded-2xl px-6 font-bold h-12"
                  onClick={() => setPreviewTemplate(null)}
                >
                  Fechar
                </Button>

                {previewTemplate.isCustom ? (
                  <Button
                    variant="outline"
                    className="rounded-2xl px-6 font-bold h-12 gap-2 text-slate-600 border-border/40 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 transition-all"
                    onClick={() => navigate(`/templates/${previewTemplate.id}/edit`)}
                  >
                    <Pencil className="w-4 h-4" />
                    Editar Modelo
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="rounded-2xl px-6 font-bold h-12 gap-2 text-slate-600 border-border/40 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all"
                    onClick={() => handleDuplicate(previewTemplate.id)}
                  >
                    <Pencil className="w-4 h-4" />
                    Personalizar Cópia
                  </Button>
                )}

                <Button
                  className="rounded-2xl flex-1 font-bold h-12 gap-2 shadow-premium-md"
                  onClick={() => {
                    setPreviewTemplate(null);
                    setSelectedTemplateForUse({
                      id: previewTemplate.id,
                      nome: previewTemplate.nome,
                    });
                  }}
                >
                  <Play className="w-4 h-4 fill-current" />
                  Usar Template
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

// Helper icons/btns if needed
function PlusCircle({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </svg>
  );
}
