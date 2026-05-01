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
import { FileText, Upload, CheckCircle2, Loader2, Plus, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { getWorkersApiUrl } from "@/lib/api/config";

interface ScientificPaper {
  id: string;
  title: string;
  article_type: string;
  group: string;
  status: string;
  created_at: string | null;
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
  const res = await fetch(`${getWorkersApiUrl()}/api/knowledge/articles?type=pdf&limit=50`);
  if (!res.ok) return [];
  const json = await res.json();
  return (json.data ?? json.articles ?? []) as ScientificPaper[];
}

async function uploadPaper(data: FormData): Promise<{ id: string; indexed: boolean }> {
  const res = await fetch(`${getWorkersApiUrl()}/api/knowledge/upload-paper`, {
    method: "POST",
    body: data,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error ?? "Upload failed");
  }
  return res.json();
}

export function ScientificPapersView() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [areaClinica, setAreaClinica] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: papers = [], isLoading } = useQuery({
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
          <div className="p-2 bg-violet-100 rounded-xl">
            <BookOpen className="h-5 w-5 text-violet-600" />
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
      ) : papers.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
          onClick={() => setIsModalOpen(true)}
        >
          <FileText className="h-12 w-12 mb-4 text-muted-foreground opacity-30" />
          <h3 className="font-semibold text-lg">Nenhum artigo indexado</h3>
          <p className="text-muted-foreground mt-1 max-w-sm">
            Faça upload de artigos científicos em PDF para que o FisioBrain use como base de
            evidência nas buscas clínicas.
          </p>
          <Button className="mt-6 gap-2">
            <Upload className="h-4 w-4" /> Upload do primeiro artigo
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {papers.map((paper) => (
            <Card
              key={paper.id}
              className="hover:shadow-md transition-shadow border border-slate-100 dark:border-slate-800"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-semibold line-clamp-2 leading-tight">
                    {paper.title}
                  </CardTitle>
                  <Badge
                    variant="secondary"
                    className="shrink-0 text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Indexado
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {paper.group && (
                    <Badge variant="outline" className="text-[10px]">
                      {paper.group}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[10px] text-violet-600 border-violet-200">
                    <FileText className="h-2.5 w-2.5 mr-1" />
                    PDF
                  </Badge>
                </div>
                {paper.created_at && (
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {new Date(paper.created_at).toLocaleDateString("pt-BR")}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de upload */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-violet-600" />
              Adicionar Artigo Científico
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Dropzone */}
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                dragOver
                  ? "border-violet-500 bg-violet-50 dark:bg-violet-950/20"
                  : selectedFile
                    ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20"
                    : "border-slate-200 hover:border-violet-300 hover:bg-slate-50 dark:hover:bg-slate-900"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
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
                  <p className="text-sm font-medium">Arraste o PDF aqui ou clique para selecionar</p>
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
              disabled={uploadMutation.isPending || !selectedFile || !title.trim()}
              className="gap-2"
            >
              {uploadMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploadMutation.isPending ? "Indexando..." : "Indexar no FisioBrain"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
