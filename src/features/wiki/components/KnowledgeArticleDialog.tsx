import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  X,
  Link as LinkIcon,
  FileText,
  Sparkles,
  AlertCircle,
  Lightbulb,
  Image,
  BookOpen,
  Stethoscope,
  Dumbbell,
} from "lucide-react";

import {
  knowledgeGroups,
  knowledgeEvidenceLabels,
  type KnowledgeArticle,
  type KnowledgeGroup,
  type EvidenceTier,
  type KnowledgeStatus,
} from "@/data/knowledgeBase";

interface KnowledgeArticleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article: KnowledgeArticle | null;
  onSave: (data: Partial<KnowledgeArticle>) => Promise<void>;
}

export function KnowledgeArticleDialog({
  open,
  onOpenChange,
  article,
  onSave,
}: KnowledgeArticleDialogProps) {
  const [isQuickAdd, setIsQuickAdd] = useState(false);
  const [formData, setFormData] = useState<
    Partial<KnowledgeArticle & { summary?: string; metadata?: any }>
  >({
    title: "",
    group: "Ortopedia",
    subgroup: "",
    evidence: "CPG",
    status: "pending",
    year: new Date().getFullYear(),
    source: "",
    url: "",
    summary: "",
    tags: [],
    highlights: [],
    observations: [],
    keyQuestions: [],
    recommended_tests_ids: [],
    suggested_exercise_ids: [],
    metadata: { attachments: [] },
  });

  const [testInput, setTestInput] = useState("");
  const [exerciseInput, setExerciseInput] = useState("");

  const [tagInput, setTagInput] = useState("");
  const [highlightInput, setHighlightInput] = useState("");
  const [observationInput, setObservationInput] = useState("");
  const [questionInput, setQuestionInput] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentType, setAttachmentType] = useState("file");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (article) {
      setFormData({
        ...article,
        summary: (article as any).summary || "",
        metadata: (article as any).metadata || { attachments: [] },
      });
      setIsQuickAdd(false);
    } else {
      setFormData({
        title: "",
        group: "Ortopedia",
        subgroup: "",
        evidence: "CPG",
        status: "pending",
        year: new Date().getFullYear(),
        source: "",
        url: "",
        summary: "",
        tags: [],
        highlights: [],
        observations: [],
        keyQuestions: [],
        recommended_tests_ids: [],
        suggested_exercise_ids: [],
        metadata: { attachments: [] },
      });

      setIsQuickAdd(true);
    }
  }, [article, open]);

  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      // Se for Quick Add, garantimos que o status seja pendente para processamento IA
      const finalData = isQuickAdd
        ? { ...formData, status: "pending" as KnowledgeStatus }
        : formData;
      await onSave(finalData);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save article:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addItem = (
    field:
      | "tags"
      | "highlights"
      | "observations"
      | "keyQuestions"
      | "recommended_tests_ids"
      | "suggested_exercise_ids",
    value: string,
    setter: (v: string) => void,
  ) => {
    if (!value.trim()) return;
    setFormData((prev) => ({
      ...prev,
      [field]: [...(prev[field] || []), value.trim()],
    }));
    setter("");
  };

  const removeItem = (
    field:
      | "tags"
      | "highlights"
      | "observations"
      | "keyQuestions"
      | "recommended_tests_ids"
      | "suggested_exercise_ids",
    index: number,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: (prev[field] || []).filter((_, i) => i !== index),
    }));
  };

  const addAttachment = () => {
    if (!attachmentName.trim() || !attachmentUrl.trim()) return;
    const currentAttachments = formData.metadata?.attachments || [];
    setFormData((prev) => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        attachments: [
          ...currentAttachments,
          {
            name: attachmentName.trim(),
            url: attachmentUrl.trim(),
            type: attachmentType,
          },
        ],
      },
    }));
    setAttachmentName("");
    setAttachmentUrl("");
    setAttachmentType("file");
  };

  const removeAttachment = (index: number) => {
    const currentAttachments = formData.metadata?.attachments || [];
    setFormData((prev) => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        attachments: currentAttachments.filter((_: any, i: number) => i !== index),
      },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between border-b pb-4 mb-4">
          <div>
            <DialogTitle className="text-2xl font-bold">
              {article ? "Editar Diretriz Clínica" : "Adicionar Nova Diretriz"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Configure os detalhes técnicos e evidências do protocolo.
            </p>
          </div>
          {!article && (
            <div className="flex items-center gap-2 bg-primary/5 px-3 py-1.5 rounded-full border border-primary/10">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <Label
                htmlFor="quick-add"
                className="text-xs font-bold uppercase tracking-tight cursor-pointer"
              >
                Modo Inteligente
              </Label>
              <Switch
                id="quick-add"
                checked={isQuickAdd}
                onCheckedChange={setIsQuickAdd}
                className="scale-75"
              />
            </div>
          )}
        </DialogHeader>

        <div className="grid gap-6 py-2">
          {/* Sessão Principal: Título e Link */}
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label
                htmlFor="title"
                className="font-bold text-sm uppercase tracking-wider text-slate-500"
              >
                Título do Artigo / Diretriz
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Low back pain: clinical practice guidelines..."
                className="h-11 text-base font-medium"
              />
            </div>

            <div className="grid gap-2">
              <Label
                htmlFor="url"
                className="font-bold text-sm uppercase tracking-wider text-slate-500"
              >
                URL da Fonte Principal (PubMed / PDF / Journal)
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="url"
                    value={formData.url}
                    onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))}
                    placeholder="https://..."
                    className="pl-10 h-11 text-base"
                  />
                </div>
              </div>
              {isQuickAdd && (
                <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-100 dark:border-blue-900/50">
                  <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                  <p className="text-sm text-blue-700 dark:text-blue-400 leading-relaxed font-medium">
                    <span className="font-bold text-blue-800 dark:text-blue-300">Nota da IA:</span>{" "}
                    No Modo Inteligente, você só precisa do Título e Link. Nossa IA processará o
                    PDF/Site automaticamente para extrair o resumo, destaques e nível de evidência
                    após você salvar.
                  </p>
                </div>
              )}
            </div>
          </div>

          {!isQuickAdd && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-6">
              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label
                    htmlFor="group"
                    className="font-bold text-sm uppercase tracking-wider text-slate-500"
                  >
                    Especialidade
                  </Label>
                  <Select
                    value={formData.group}
                    onValueChange={(v) =>
                      setFormData((prev) => ({
                        ...prev,
                        group: v as KnowledgeGroup,
                      }))
                    }
                  >
                    <SelectTrigger id="group" className="h-11 text-base">
                      <SelectValue placeholder="Selecione o grupo" />
                    </SelectTrigger>
                    <SelectContent>
                      {knowledgeGroups.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label
                    htmlFor="subgroup"
                    className="font-bold text-sm uppercase tracking-wider text-slate-500"
                  >
                    Subgrupo / Patologia
                  </Label>
                  <Input
                    id="subgroup"
                    value={formData.subgroup}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        subgroup: e.target.value,
                      }))
                    }
                    placeholder="Ex: Joelho, Coluna..."
                    className="h-11 text-base"
                  />
                </div>
                <div className="grid gap-2">
                  <Label
                    htmlFor="status"
                    className="font-bold text-sm uppercase tracking-wider text-slate-500"
                  >
                    Status
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) =>
                      setFormData((prev) => ({
                        ...prev,
                        status: v as KnowledgeStatus,
                      }))
                    }
                  >
                    <SelectTrigger id="status" className="h-11 text-base">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendente (IA)</SelectItem>
                      <SelectItem value="review">Em Revisão (Manual)</SelectItem>
                      <SelectItem value="verified">Verificado / Ouro</SelectItem>
                      <SelectItem value="rejected">Rejeitado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label
                    htmlFor="evidence"
                    className="font-bold text-sm uppercase tracking-wider text-slate-500"
                  >
                    Nível de Evidência
                  </Label>
                  <Select
                    value={formData.evidence}
                    onValueChange={(v) =>
                      setFormData((prev) => ({
                        ...prev,
                        evidence: v as EvidenceTier,
                      }))
                    }
                  >
                    <SelectTrigger id="evidence" className="h-11 text-base">
                      <SelectValue placeholder="Selecione a evidência" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(knowledgeEvidenceLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label
                    htmlFor="year"
                    className="font-bold text-sm uppercase tracking-wider text-slate-500"
                  >
                    Ano de Publicação
                  </Label>
                  <Input
                    id="year"
                    type="number"
                    value={formData.year}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        year: parseInt(e.target.value),
                      }))
                    }
                    className="h-11 text-base"
                  />
                </div>
                <div className="grid gap-2">
                  <Label
                    htmlFor="source"
                    className="font-bold text-sm uppercase tracking-wider text-slate-500"
                  >
                    Fonte (Ex: JOSPT, APTA)
                  </Label>
                  <Input
                    id="source"
                    value={formData.source}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        source: e.target.value,
                      }))
                    }
                    placeholder="Fonte principal"
                    className="h-11 text-base"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label
                  htmlFor="summary"
                  className="font-bold text-sm uppercase tracking-wider text-slate-500"
                >
                  Resumo Executivo (Clinical Summary)
                </Label>
                <Textarea
                  id="summary"
                  value={formData.summary}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      summary: e.target.value,
                    }))
                  }
                  placeholder="Escreva um breve resumo clínico para consulta rápida..."
                  rows={4}
                  className="resize-none text-base leading-relaxed"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <Label className="font-bold text-sm uppercase tracking-wider text-slate-500">
                    Destaques (Key Findings)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={highlightInput}
                      onChange={(e) => setHighlightInput(e.target.value)}
                      placeholder="Novo destaque..."
                      className="h-10 text-sm"
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        (e.preventDefault(),
                        addItem("highlights", highlightInput, setHighlightInput))
                      }
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="h-10 w-10 shrink-0"
                      onClick={() => addItem("highlights", highlightInput, setHighlightInput)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.highlights?.map((item, idx) => (
                      <Badge key={idx} variant="secondary" className="pr-1 text-xs h-7">
                        {item}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 ml-1 hover:bg-transparent"
                          onClick={() => removeItem("highlights", idx)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="font-bold text-sm uppercase tracking-wider text-slate-500">
                    Observações Clínicas (Internal)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={observationInput}
                      onChange={(e) => setObservationInput(e.target.value)}
                      placeholder="Nova observação..."
                      className="h-10 text-sm"
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        (e.preventDefault(),
                        addItem("observations", observationInput, setObservationInput))
                      }
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="h-10 w-10 shrink-0"
                      onClick={() => addItem("observations", observationInput, setObservationInput)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.observations?.map((item, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="pr-1 text-xs h-7 bg-slate-100 text-slate-700"
                      >
                        {item}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 ml-1 hover:bg-transparent"
                          onClick={() => removeItem("observations", idx)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="font-bold text-sm uppercase tracking-wider text-slate-500">
                  Perguntas que este artigo responde (Q&A)
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={questionInput}
                    onChange={(e) => setQuestionInput(e.target.value)}
                    placeholder="Ex: Qual o critério de alta para corrida?"
                    className="h-11 text-base"
                    onKeyDown={(e) =>
                      e.key === "Enter" &&
                      (e.preventDefault(), addItem("keyQuestions", questionInput, setQuestionInput))
                    }
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="h-11 w-11 shrink-0"
                    onClick={() => addItem("keyQuestions", questionInput, setQuestionInput)}
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.keyQuestions?.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 p-3 rounded-lg border bg-muted/30 text-sm font-medium italic"
                    >
                      <span className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-amber-500" /> "{item}"
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-slate-400 hover:text-destructive"
                        onClick={() => removeItem("keyQuestions", idx)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <Label className="font-bold text-sm uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <Stethoscope className="h-3.5 w-3.5" /> Testes Clínicos (IDs)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={testInput}
                      onChange={(e) => setTestInput(e.target.value)}
                      placeholder="Ex: lasegue-test"
                      className="h-10 text-sm"
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        (e.preventDefault(),
                        addItem("recommended_tests_ids", testInput, setTestInput))
                      }
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="h-10 w-10 shrink-0"
                      onClick={() => addItem("recommended_tests_ids", testInput, setTestInput)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.recommended_tests_ids?.map((id, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="pr-1 text-xs h-7 border-sky-200 bg-sky-50 text-sky-700 font-bold"
                      >
                        {id}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 ml-1 hover:bg-transparent"
                          onClick={() => removeItem("recommended_tests_ids", idx)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="font-bold text-sm uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <Dumbbell className="h-3.5 w-3.5" /> Exercícios Sugeridos (IDs)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={exerciseInput}
                      onChange={(e) => setExerciseInput(e.target.value)}
                      placeholder="Ex: pelvic-tilt"
                      className="h-10 text-sm"
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        (e.preventDefault(),
                        addItem("suggested_exercise_ids", exerciseInput, setExerciseInput))
                      }
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="h-10 w-10 shrink-0"
                      onClick={() =>
                        addItem("suggested_exercise_ids", exerciseInput, setExerciseInput)
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.suggested_exercise_ids?.map((id, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="pr-1 text-xs h-7 border-emerald-200 bg-emerald-50 text-emerald-700 font-bold"
                      >
                        {id}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 ml-1 hover:bg-transparent"
                          onClick={() => removeItem("suggested_exercise_ids", idx)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="font-bold text-sm uppercase tracking-wider text-slate-500">
                  Anexos e Documentos Suplementares
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr_1.8fr_auto] gap-2">
                  <Select value={attachmentType} onValueChange={setAttachmentType}>
                    <SelectTrigger className="h-10 text-xs">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="file">Arquivo</SelectItem>
                      <SelectItem value="image">Imagem</SelectItem>
                      <SelectItem value="url">URL / Link</SelectItem>
                      <SelectItem value="guideline">Diretriz</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={attachmentName}
                    onChange={(e) => setAttachmentName(e.target.value)}
                    placeholder="Nome"
                    className="h-10 text-sm"
                  />
                  <Input
                    value={attachmentUrl}
                    onChange={(e) => setAttachmentUrl(e.target.value)}
                    placeholder="URL ou Caminho"
                    className="h-10 text-sm"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-10 w-10 shrink-0"
                    onClick={addAttachment}
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(formData.metadata?.attachments || []).map((att: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 p-3 rounded-lg border bg-emerald-50/30 dark:bg-emerald-950/10 text-sm"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        {att.type === "image" ? (
                          <Image className="h-4 w-4 shrink-0 text-emerald-600" />
                        ) : att.type === "url" ? (
                          <LinkIcon className="h-4 w-4 shrink-0 text-emerald-600" />
                        ) : att.type === "guideline" ? (
                          <BookOpen className="h-4 w-4 shrink-0 text-emerald-600" />
                        ) : (
                          <FileText className="h-4 w-4 shrink-0 text-emerald-600" />
                        )}
                        <span className="truncate font-bold text-emerald-800 dark:text-emerald-400">
                          {att.name}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-400 hover:text-destructive"
                        onClick={() => removeAttachment(idx)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="font-bold text-sm uppercase tracking-wider text-slate-500">
                  Tags de Busca
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Adicionar tag..."
                    className="h-10 text-sm"
                    onKeyDown={(e) =>
                      e.key === "Enter" &&
                      (e.preventDefault(), addItem("tags", tagInput, setTagInput))
                    }
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-10 w-10 shrink-0"
                    onClick={() => addItem("tags", tagInput, setTagInput)}
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags?.map((tag, idx) => (
                    <Badge key={idx} variant="outline" className="pr-1 h-7 text-xs font-bold">
                      #{tag}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 ml-1 hover:bg-transparent"
                        onClick={() => removeItem("tags", idx)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4 mt-4">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="font-bold text-sm uppercase tracking-wider"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSubmitting || !formData.title || !formData.url}
            className="font-bold text-sm uppercase tracking-wider min-w-[140px]"
          >
            {isSubmitting
              ? "Salvando..."
              : isQuickAdd
                ? "Processar com IA"
                : article
                  ? "Atualizar Diretriz"
                  : "Salvar Diretriz"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const Separator = () => <div className="h-px w-full bg-slate-100 dark:bg-slate-800" />;

const Badge = ({
  children,
  variant,
  className,
}: {
  children: React.ReactNode;
  variant?: any;
  className?: string;
}) => (
  <div
    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variant === "secondary" ? "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80" : variant === "outline" ? "text-foreground" : "border-transparent bg-primary text-primary-foreground hover:bg-primary/80"} ${className}`}
  >
    {children}
  </div>
);
