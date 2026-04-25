import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Info,
  Timer,
  AlertTriangle,
  Plus,
  Trash2,
  CheckCircle2,
  Activity,
  Loader2,
  Search,
  BookOpen,
  ExternalLink,
  Link2,
  FileText,
  ChevronDown,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { knowledgeService } from "@/features/wiki/services/knowledgeService";
import { useAuth } from "@/contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { type ExerciseProtocol } from "@/hooks/useExerciseProtocols";

interface Milestone {
  week: number;
  description: string;
}

interface Restriction {
  week_start: number;
  week_end?: number;
  description: string;
}

interface ReferenceArticle {
  name: string;
  link: string;
  description: string;
}

interface ProtocolFormData {
  name: string;
  protocol_type: "pos_operatorio" | "patologia" | "esportivo" | "conservador" | "geriatria";
  condition_name: string;
  weeks_total: number;
  milestones: Milestone[];
  restrictions: Restriction[];
  evidence_level?: string;
  wiki_page_id?: string;
  reference_articles: ReferenceArticle[];
}

interface NewProtocolModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (protocol: ProtocolFormData) => void;
  protocol?: ExerciseProtocol;
  isLoading?: boolean;
}

export const NewProtocolModal: React.FC<NewProtocolModalProps> = ({
  open,
  onOpenChange,
  onSubmit,
  protocol,
  isLoading,
}) => {
  const [step, setStep] = useState(1);
  const [wikiSearch, setWikiSearch] = useState("");
  const [wikiSubgroupFilter, setWikiSubgroupFilter] = useState("all");
  const [wikiDropdownOpen, setWikiDropdownOpen] = useState(false);
  const wikiDropdownRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<ProtocolFormData>({
    name: "",
    protocol_type: "pos_operatorio",
    condition_name: "",
    weeks_total: 12,
    milestones: [],
    restrictions: [],
    evidence_level: "B",
    wiki_page_id: "",
    reference_articles: [],
  });

  const { organizationId } = useAuth();
  const { data: wikiArticles = [] } = useQuery({
    queryKey: ["knowledge-artifacts", organizationId],
    queryFn: () =>
      organizationId ? knowledgeService.listArtifacts(organizationId) : Promise.resolve([]),
    enabled: !!organizationId,
  });

  // Sync with protocol prop when editing
  useEffect(() => {
    if (protocol && open) {
      const extProtocol = protocol as ExerciseProtocol & {
        reference_articles?: ReferenceArticle[];
      };
      setFormData({
        name: protocol.name || "",
        protocol_type:
          (protocol.protocol_type as ProtocolFormData["protocol_type"]) || "pos_operatorio",
        condition_name: protocol.condition_name || "",
        weeks_total: protocol.weeks_total || 12,
        milestones: Array.isArray(protocol.milestones)
          ? (protocol.milestones as Milestone[])
          : [],
        restrictions: Array.isArray(protocol.restrictions)
          ? (protocol.restrictions as Restriction[])
          : [],
        evidence_level: protocol.evidence_level || "B",
        wiki_page_id: protocol.wiki_page_id || "",
        reference_articles: Array.isArray(extProtocol.reference_articles)
          ? extProtocol.reference_articles
          : [],
      });
      setWikiSearch("");
      setWikiSubgroupFilter("all");
      setStep(1);
    } else if (!protocol && open) {
      setFormData({
        name: "",
        protocol_type: "pos_operatorio",
        condition_name: "",
        weeks_total: 12,
        milestones: [],
        restrictions: [],
        evidence_level: "B",
        wiki_page_id: "",
        reference_articles: [],
      });
      setWikiSearch("");
      setWikiSubgroupFilter("all");
      setStep(1);
    }
  }, [protocol, open]);

  // Close wiki dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wikiDropdownRef.current && !wikiDropdownRef.current.contains(e.target as Node)) {
        setWikiDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const nextStep = () => setStep((s) => Math.min(s + 1, 3));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const handleSave = () => {
    onSubmit(formData);
  };

  const addMilestone = () => {
    setFormData((prev) => ({
      ...prev,
      milestones: [...prev.milestones, { week: prev.milestones.length + 1, description: "" }],
    }));
  };

  const removeMilestone = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      milestones: prev.milestones.filter((_, i) => i !== index),
    }));
  };

  const updateMilestone = (index: number, field: keyof Milestone, value: Milestone[keyof Milestone]) => {
    const newMilestones = [...formData.milestones];
    newMilestones[index] = { ...newMilestones[index], [field]: value };
    setFormData((prev) => ({ ...prev, milestones: newMilestones }));
  };

  const addRestriction = () => {
    setFormData((prev) => ({
      ...prev,
      restrictions: [...prev.restrictions, { week_start: 1, week_end: 4, description: "" }],
    }));
  };

  const removeRestriction = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      restrictions: prev.restrictions.filter((_, i) => i !== index),
    }));
  };

  const updateRestriction = (index: number, field: keyof Restriction, value: Restriction[keyof Restriction]) => {
    const newRestrictions = [...formData.restrictions];
    newRestrictions[index] = { ...newRestrictions[index], [field]: value };
    setFormData((prev) => ({ ...prev, restrictions: newRestrictions }));
  };

  // Reference articles helpers
  const addReferenceArticle = () => {
    setFormData((prev) => ({
      ...prev,
      reference_articles: [...prev.reference_articles, { name: "", link: "", description: "" }],
    }));
  };

  const removeReferenceArticle = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      reference_articles: prev.reference_articles.filter((_, i) => i !== index),
    }));
  };

  const updateReferenceArticle = (index: number, field: keyof ReferenceArticle, value: string) => {
    const updated = [...formData.reference_articles];
    updated[index] = { ...updated[index], [field]: value };
    setFormData((prev) => ({ ...prev, reference_articles: updated }));
  };

  // Wiki autocomplete derived data
  const wikiSubgroups = Array.from(
    new Set(wikiArticles.map((a) => a.subgroup).filter(Boolean)),
  ).sort();

  const filteredWikiArticles = wikiArticles.filter((art) => {
    const matchesSearch =
      wikiSearch.trim() === "" ||
      art.title.toLowerCase().includes(wikiSearch.toLowerCase()) ||
      art.subgroup.toLowerCase().includes(wikiSearch.toLowerCase());
    const matchesSubgroup = wikiSubgroupFilter === "all" || art.subgroup === wikiSubgroupFilter;
    return matchesSearch && matchesSubgroup;
  });

  const selectedWikiArticle = wikiArticles.find((a) => a.id === formData.wiki_page_id);

  const steps = [
    { id: 1, name: "Informações", icon: Info },
    { id: 2, name: "Marcos", icon: Timer },
    { id: 3, name: "Restrições", icon: AlertTriangle },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full p-0 overflow-hidden rounded-2xl border-border bg-background shadow-xl">
        <DialogTitle className="sr-only">
          {protocol ? "Editar Protocolo" : "Criar Novo Protocolo"}
        </DialogTitle>
        <div className="relative w-full h-full flex flex-col">
          {/* Header with Stepper */}
          <div className="relative px-8 pt-6 pb-5 border-b bg-muted/30">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold leading-tight">
                    {protocol ? "Editar Protocolo" : "Criar Novo Protocolo"}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Personalize a jornada de recuperação do paciente
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="text-muted-foreground hover:text-foreground rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex items-center justify-between px-8">
              {steps.map((s, idx) => (
                <React.Fragment key={s.id}>
                  <button
                    type="button"
                    className="flex flex-col items-center gap-2 group cursor-pointer focus:outline-none"
                    onClick={() => setStep(s.id)}
                  >
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                        step === s.id
                          ? "bg-primary border-primary text-primary-foreground shadow-md scale-110"
                          : step > s.id
                            ? "bg-primary/10 border-primary text-primary"
                            : "bg-muted border-border text-muted-foreground hover:border-primary/40 hover:text-primary/60",
                      )}
                    >
                      <s.icon className="w-5 h-5" />
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-semibold transition-colors uppercase tracking-wider",
                        step === s.id
                          ? "text-primary"
                          : step > s.id
                            ? "text-foreground"
                            : "text-muted-foreground/60 group-hover:text-muted-foreground",
                      )}
                    >
                      {s.name}
                    </span>
                  </button>
                  {idx < steps.length - 1 && (
                    <div
                      className={cn(
                        "flex-1 h-0.5 mx-4 transition-all duration-300",
                        step > s.id ? "bg-primary" : "bg-border",
                      )}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="relative p-8 min-h-[480px] max-h-[68vh] overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                {step === 1 && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-3 gap-4">
                      {/* Row 1: Nome + Condição side by side */}
                      <div className="col-span-2 space-y-2">
                        <Label>Nome do Protocolo</Label>
                        <Input
                          placeholder="Ex: Reabilitação LCA - Fase Pós-Op"
                          className="h-11 focus-visible:ring-primary"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="col-span-1 space-y-2">
                        <Label>Condição / Patologia</Label>
                        <Input
                          placeholder="Ex: LCA, Menisco..."
                          className="h-11 focus-visible:ring-primary"
                          value={formData.condition_name}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              condition_name: e.target.value,
                            }))
                          }
                        />
                      </div>
                      {/* Row 2: Tipo | Duração | Evidência */}
                      <div className="col-span-1 space-y-2">
                        <Label>Tipo</Label>
                        <Select
                          value={formData.protocol_type}
                          onValueChange={(v) =>
                            setFormData((prev) => ({
                              ...prev,
                              protocol_type: v as ProtocolFormData["protocol_type"],
                            }))
                          }
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pos_operatorio">Pós-Operatório</SelectItem>
                            <SelectItem value="esportivo">Reabilitação Esportiva</SelectItem>
                            <SelectItem value="conservador">Conservador</SelectItem>
                            <SelectItem value="geriatria">Geriatria</SelectItem>
                            <SelectItem value="patologia">Patologia</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-1 space-y-2">
                        <Label>Duração (Semanas)</Label>
                        <Input
                          type="number"
                          className="h-11"
                          value={formData.weeks_total}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              weeks_total: parseInt(e.target.value) || 0,
                            }))
                          }
                        />
                      </div>
                      <div className="col-span-1 space-y-2">
                        <Label>Nível de Evidência</Label>
                        <Select
                          value={formData.evidence_level}
                          onValueChange={(v) =>
                            setFormData((prev) => ({
                              ...prev,
                              evidence_level: v,
                            }))
                          }
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Selecione o nível" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A">Nível A (Ouro)</SelectItem>
                            <SelectItem value="B">Nível B (Prata)</SelectItem>
                            <SelectItem value="C">Nível C (Bronze)</SelectItem>
                            <SelectItem value="D">Nível D (Consenso)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Wiki autocomplete — full width */}
                      <div className="col-span-3 space-y-2">
                        <Label className="flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-primary" />
                          Vincular Página da Wiki
                        </Label>

                        {/* Subgroup filters */}
                        {wikiSubgroups.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            <Badge
                              variant={wikiSubgroupFilter === "all" ? "default" : "outline"}
                              className="cursor-pointer select-none text-xs"
                              onClick={() => setWikiSubgroupFilter("all")}
                            >
                              Todos
                            </Badge>
                            {wikiSubgroups.map((sg) => (
                              <Badge
                                key={sg}
                                variant={wikiSubgroupFilter === sg ? "default" : "outline"}
                                className="cursor-pointer select-none text-xs"
                                onClick={() =>
                                  setWikiSubgroupFilter(sg === wikiSubgroupFilter ? "all" : sg)
                                }
                              >
                                {sg}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Autocomplete input + dropdown */}
                        <div className="relative" ref={wikiDropdownRef}>
                          <div
                            className={cn(
                              "flex items-center h-12 border rounded-md bg-background px-3 gap-2 cursor-text transition-colors",
                              wikiDropdownOpen
                                ? "border-primary ring-1 ring-primary/30"
                                : "border-input hover:border-muted-foreground/50",
                            )}
                            onClick={() => setWikiDropdownOpen(true)}
                          >
                            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                            <input
                              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                              placeholder={
                                selectedWikiArticle
                                  ? selectedWikiArticle.title
                                  : "Pesquisar artigo ou consenso..."
                              }
                              value={wikiDropdownOpen ? wikiSearch : ""}
                              onChange={(e) => setWikiSearch(e.target.value)}
                              onFocus={() => setWikiDropdownOpen(true)}
                            />
                            {selectedWikiArticle && !wikiDropdownOpen && (
                              <Badge
                                variant="secondary"
                                className="text-xs shrink-0 max-w-[180px] truncate"
                              >
                                {selectedWikiArticle.subgroup}
                              </Badge>
                            )}
                            {formData.wiki_page_id && (
                              <button
                                type="button"
                                className="text-muted-foreground hover:text-destructive transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFormData((prev) => ({ ...prev, wiki_page_id: "" }));
                                  setWikiSearch("");
                                }}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <ChevronDown
                              className={cn(
                                "w-4 h-4 text-muted-foreground transition-transform shrink-0",
                                wikiDropdownOpen && "rotate-180",
                              )}
                            />
                          </div>

                          {/* Dropdown */}
                          {wikiDropdownOpen && (
                            <div className="absolute z-50 top-[calc(100%+4px)] left-0 right-0 bg-popover border border-border rounded-md shadow-lg overflow-hidden">
                              <div className="max-h-[220px] overflow-y-auto">
                                <div
                                  className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted cursor-pointer transition-colors"
                                  onClick={() => {
                                    setFormData((prev) => ({ ...prev, wiki_page_id: "" }));
                                    setWikiSearch("");
                                    setWikiDropdownOpen(false);
                                  }}
                                >
                                  <X className="w-3.5 h-3.5" />
                                  Nenhum vínculo
                                </div>

                                {filteredWikiArticles.length === 0 ? (
                                  <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                                    Nenhum artigo encontrado
                                  </div>
                                ) : (
                                  filteredWikiArticles.map((art) => (
                                    <div
                                      key={art.id}
                                      className={cn(
                                        "flex items-start gap-2 px-3 py-2.5 cursor-pointer transition-colors hover:bg-muted",
                                        formData.wiki_page_id === art.id && "bg-primary/10",
                                      )}
                                      onClick={() => {
                                        setFormData((prev) => ({ ...prev, wiki_page_id: art.id }));
                                        setWikiSearch("");
                                        setWikiDropdownOpen(false);
                                      }}
                                    >
                                      <BookOpen className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium leading-tight truncate">
                                          {art.title}
                                        </p>
                                        {art.subgroup && (
                                          <p className="text-xs text-muted-foreground">
                                            {art.subgroup}
                                          </p>
                                        )}
                                      </div>
                                      {formData.wiki_page_id === art.id && (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Reference Articles */}
                      <div className="col-span-3 space-y-3 pt-1">
                        <div className="flex items-center justify-between">
                          <Label className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-primary" />
                            Artigos de Referência
                          </Label>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={addReferenceArticle}
                            className="h-7 text-xs gap-1"
                          >
                            <Plus className="w-3 h-3" /> Adicionar Artigo
                          </Button>
                        </div>

                        {formData.reference_articles.length === 0 ? (
                          <div className="text-center py-4 border border-dashed border-border rounded-lg text-xs text-muted-foreground">
                            Nenhum artigo adicionado. Adicione referências científicas para embasar
                            o protocolo.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {formData.reference_articles.map((article, idx) => (
                              <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-3 border border-border rounded-xl bg-muted/20 space-y-2"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    Artigo {idx + 1}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => removeReferenceArticle(idx)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                                <Input
                                  placeholder="Nome / Título do artigo"
                                  className="h-9 text-sm"
                                  value={article.name}
                                  onChange={(e) =>
                                    updateReferenceArticle(idx, "name", e.target.value)
                                  }
                                />
                                <div className="flex items-center gap-1.5">
                                  <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                  <Input
                                    placeholder="https://doi.org/..."
                                    className="h-9 text-sm"
                                    value={article.link}
                                    onChange={(e) =>
                                      updateReferenceArticle(idx, "link", e.target.value)
                                    }
                                  />
                                </div>
                                <Textarea
                                  placeholder="Descrição resumida do artigo (opcional)"
                                  className="text-sm min-h-[60px] resize-none"
                                  value={article.description}
                                  onChange={(e) =>
                                    updateReferenceArticle(idx, "description", e.target.value)
                                  }
                                />
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <Label>Marcos de Evolução</Label>
                      <Button
                        size="sm"
                        onClick={addMilestone}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-8"
                      >
                        <Plus className="w-4 h-4 mr-1" /> Add Marco
                      </Button>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-muted">
                      {formData.milestones.length === 0 && (
                        <div className="text-center py-8 border-2 border-dashed border-border rounded-xl text-muted-foreground/30">
                          Nenhum marco adicionado ainda.
                        </div>
                      )}
                      {formData.milestones.map((m, idx) => (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          key={idx}
                          className="flex gap-2 p-3 bg-muted/30 border border-border rounded-xl items-start"
                        >
                          <div className="w-16">
                            <Input
                              type="number"
                              placeholder="Sem"
                              className="p-2 h-9 text-xs"
                              value={m.week}
                              onChange={(e) =>
                                updateMilestone(idx, "week", parseInt(e.target.value) || 0)
                              }
                            />
                          </div>
                          <div className="flex-1">
                            <Input
                              placeholder="Descrição do marco..."
                              className="p-2 h-9 text-xs"
                              value={m.description}
                              onChange={(e) => updateMilestone(idx, "description", e.target.value)}
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removeMilestone(idx)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <Label>Restrições Clínicas</Label>
                      <Button
                        size="sm"
                        onClick={addRestriction}
                        variant="destructive"
                        className="font-bold h-8"
                      >
                        <Plus className="w-4 h-4 mr-1" /> Add Restrição
                      </Button>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-muted">
                      {formData.restrictions.length === 0 && (
                        <div className="text-center py-8 border-2 border-dashed border-border rounded-xl text-muted-foreground/30">
                          Nenhuma restrição clínica definida.
                        </div>
                      )}
                      {formData.restrictions.map((r, idx) => (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          key={idx}
                          className="flex gap-2 p-3 bg-destructive/5 border border-destructive/20 rounded-xl items-start"
                        >
                          <div className="flex gap-1 w-32">
                            <Input
                              type="number"
                              className="p-2 h-9 text-xs font-mono"
                              value={r.week_start}
                              onChange={(e) =>
                                updateRestriction(idx, "week_start", parseInt(e.target.value) || 0)
                              }
                            />
                            <span className="text-muted-foreground/30 self-center">/</span>
                            <Input
                              type="number"
                              className="p-2 h-9 text-xs font-mono"
                              value={r.week_end}
                              onChange={(e) =>
                                updateRestriction(idx, "week_end", parseInt(e.target.value) || 0)
                              }
                            />
                          </div>
                          <div className="flex-1">
                            <Input
                              placeholder="Descreva a restrição..."
                              className="p-2 h-9 text-xs"
                              value={r.description}
                              onChange={(e) =>
                                updateRestriction(idx, "description", e.target.value)
                              }
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removeRestriction(idx)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer Navigation */}
          <div className="p-6 border-t flex items-center justify-between bg-muted/30">
            <Button
              variant="ghost"
              onClick={prevStep}
              disabled={step === 1 || isLoading}
              className={cn(step === 1 && "opacity-0 pointer-events-none")}
            >
              <ChevronLeft className="w-4 h-4 mr-2" /> Anterior
            </Button>

            <div className="flex gap-3">
              {step < 3 ? (
                <Button
                  onClick={nextStep}
                  disabled={step === 1 && (!formData.name || !formData.condition_name)}
                  className="px-8 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continuar <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleSave} disabled={isLoading} className="px-8 group">
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      {protocol ? "Salvar Alterações" : "Confirmar"}
                      <CheckCircle2 className="w-4 h-4 ml-2 group-hover:scale-110 transition-transform" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
