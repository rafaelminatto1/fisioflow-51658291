import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { request } from "@/api/v2/base";
import type { KnowledgeArticleRow } from "@/types/workers";

interface ScientificPaper {
  id: string;
  title: string;
  group: string;
  status: string;
  evidence: string;
  vectorStatus: string;
  year?: number;
  source?: string;
  createdAt: string | null;
}

const AREAS_CLINICAS = [
  "Ortopedia",
  "Neurologia",
  "Respiratória",
  "Cardiorrespiratória",
  "Reumatologia",
  "Esportiva",
  "Geriatria",
  "Pediátrica",
  "Dermato-funcional",
  "Saúde da Mulher",
  "Geral",
];

async function fetchPapers(): Promise<ScientificPaper[]> {
  const json = await request<{ data: KnowledgeArticleRow[] }>(
    "/api/knowledge/articles?limit=50",
  );

  return json.data
    .filter(
      (row) =>
        String((row as unknown as Record<string, unknown>).type ?? "pdf") ===
        "pdf",
    )
    .map((row) => {
      const raw = row as unknown as Record<string, unknown>;
      return {
        id: row.id,
        title: row.title,
        group: row.group,
        status: row.status,
        evidence: String(
          raw.evidenceLevel ?? row.evidence ?? "Não classificada",
        ),
        vectorStatus: String(
          raw.vectorStatus ?? raw.vector_status ?? "pending",
        ),
        year: row.year,
        source: row.source,
        createdAt: raw.createdAt ? String(raw.createdAt) : null,
      };
    });
}

async function uploadPaper(
  data: FormData,
): Promise<{ id: string; indexed: boolean }> {
  return request<{ id: string; indexed: boolean }>(
    "/api/knowledge/upload-paper",
    {
      method: "POST",
      body: data,
    },
  );
}

function getIndexingBadge(vectorStatus: string) {
  if (vectorStatus === "completed" || vectorStatus === "indexed") {
    return {
      label: "Indexado",
      Icon: CheckCircle2,
      className: "bg-emerald-100 text-emerald-700",
    };
  }
  if (vectorStatus === "error") {
    return {
      label: "Falha na indexação",
      Icon: AlertCircle,
      className: "bg-red-100 text-red-700",
    };
  }
  return {
    label: "Processando",
    Icon: Clock3,
    className: "bg-amber-100 text-amber-700",
  };
}

function getCurationLabel(status: string) {
  if (status === "verified") return "Curadoria verificada";
  if (status === "active") return "Ativo";
  if (status === "published") return "Publicado";
  if (status === "archived") return "Arquivado";
  if (status === "draft") return "Rascunho";
  return "Pendente de curadoria";
}

export function ScientificPapersView() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [areaClinica, setAreaClinica] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    data: papers = [],
    error,
    isError,
    isFetching,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["scientific-papers"],
    queryFn: fetchPapers,
    staleTime: 1000 * 60 * 5,
  });

  const uploadMutation = useMutation({
    mutationFn: uploadPaper,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["scientific-papers"] });
      toast.success(
        result.indexed
          ? "Artigo indexado com sucesso no FisioBrain!"
          : "Artigo salvo. Será indexado em breve.",
      );
      setIsModalOpen(false);
      resetForm();
    },
    onError: (err: Error) => {
      toast.error(`Erro ao fazer upload: ${err.message}`);
    },
  });

  function resetForm() {
    setSelectedFile(null);
    setTitle("");
    setAreaClinica("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileSelect(file: File) {
    if (file.type !== "application/pdf") {
      toast.error("Apenas arquivos PDF são aceitos.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error("O PDF deve ter no máximo 4 MB.");
      return;
    }
    setSelectedFile(file);
    if (!title) setTitle(file.name.replace(/\.pdf$/i, "").replace(/_/g, " "));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }

  function handleSubmit() {
    if (!selectedFile || !title.trim()) {
      toast.error("Selecione um PDF e informe o título.");
      return;
    }
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("title", title.trim());
    formData.append("area_clinica", areaClinica);
    uploadMutation.mutate(formData);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-xl">
            <BookOpen className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Artigos Científicos</h2>
            <p className="text-sm text-muted-foreground">
              PDFs indexados no FisioBrain para busca com IA
            </p>
          </div>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Adicionar Artigo
        </Button>
      </div>

      {/* Grid de artigos */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/50 p-12 text-center">
          <AlertCircle className="mb-4 h-10 w-10 text-red-500" />
          <h3 className="text-lg font-semibold text-slate-900">
            Não foi possível carregar os artigos
          </h3>
          <p className="mt-1 max-w-md text-sm text-slate-600">
            {error instanceof Error
              ? error.message
              : "Tente novamente em alguns instantes."}
          </p>
          <Button
            variant="outline"
            className="mt-5 gap-2"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw
              className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
            Tentar novamente
          </Button>
        </div>
      ) : papers.length === 0 ? (
        <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-16 text-center">
          <FileText className="h-12 w-12 mb-4 text-muted-foreground opacity-30" />
          <h3 className="font-semibold text-lg">Nenhum artigo indexado</h3>
          <p className="text-muted-foreground mt-1 max-w-sm">
            Faça upload de artigos científicos em PDF para que o FisioBrain use
            como base de evidência nas buscas clínicas.
          </p>
          <Button className="mt-6 gap-2" onClick={() => setIsModalOpen(true)}>
            <Upload className="h-4 w-4" /> Upload do primeiro artigo
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {papers.map((paper) => (
            <Card
              key={paper.id}
              className="border border-slate-100 transition-shadow hover:shadow-md dark:border-slate-800"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-semibold line-clamp-2 leading-tight">
                    {paper.title}
                  </CardTitle>
                  {(() => {
                    const indexState = getIndexingBadge(paper.vectorStatus);
                    return (
                      <Badge
                        variant="secondary"
                        className={`shrink-0 text-[10px] ${indexState.className}`}
                      >
                        <indexState.Icon className="mr-1 h-3 w-3" />
                        {indexState.label}
                      </Badge>
                    );
                  })()}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {paper.group && (
                    <Badge variant="outline" className="text-[10px]">
                      {paper.group}
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className="text-[10px] text-emerald-600 border-emerald-200"
                  >
                    <FileText className="h-2.5 w-2.5 mr-1" />
                    PDF
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {getCurationLabel(paper.status)}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    Evidência: {paper.evidence}
                  </Badge>
                </div>
                {(paper.source || paper.year || paper.createdAt) && (
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {[
                      paper.source,
                      paper.year,
                      paper.createdAt
                        ? new Date(paper.createdAt).toLocaleDateString("pt-BR")
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de upload */}
      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open && !uploadMutation.isPending) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-emerald-600" />
              Adicionar Artigo Científico
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Dropzone */}
            <div
              role="button"
              tabIndex={0}
              aria-label="Selecionar artigo científico em PDF"
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                dragOver
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
                  : selectedFile
                    ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20"
                    : "border-slate-200 hover:border-emerald-300 hover:bg-slate-50 dark:hover:bg-slate-900"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
              {selectedFile ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  <p className="font-medium text-sm">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <FileText className="h-8 w-8 opacity-40" />
                  <p className="text-sm font-medium">
                    Arraste o PDF aqui ou clique para selecionar
                  </p>
                  <p className="text-xs">Máx. 4 MB</p>
                </div>
              )}
            </div>

            {/* Título */}
            <div className="space-y-1.5">
              <Label>Título do artigo *</Label>
              <Input
                placeholder="Ex: Eficácia do RPG no tratamento de lombalgia crônica"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Área clínica */}
            <div className="space-y-1.5">
              <Label>Área clínica</Label>
              <Select value={areaClinica} onValueChange={setAreaClinica}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a área..." />
                </SelectTrigger>
                <SelectContent>
                  {AREAS_CLINICAS.map((area) => (
                    <SelectItem key={area} value={area}>
                      {area}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                uploadMutation.isPending || !selectedFile || !title.trim()
              }
              className="gap-2"
            >
              {uploadMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploadMutation.isPending
                ? "Indexando..."
                : "Indexar no FisioBrain"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
