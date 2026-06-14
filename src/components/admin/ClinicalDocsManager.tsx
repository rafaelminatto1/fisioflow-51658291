import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api/v2/client";
import { getWorkersApiUrl } from "@/lib/api/config";
import { getNeonAccessToken } from "@/lib/auth/neon-token";
import { toast } from "sonner";

interface ClinicalDoc {
  id: string;
  title: string;
  status: string;
}

const API_BASE = getWorkersApiUrl();

export function ClinicalDocsManager() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["clinical-docs"],
    queryFn: () => apiClient.get<{ data: ClinicalDoc[] }>(`${API_BASE}/api/clinical-docs`),
    staleTime: 60_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["clinical-docs"] });

  const upload = async () => {
    if (!file || !title.trim()) return;
    setUploading(true);
    try {
      const token = await getNeonAccessToken();
      const fd = new FormData();
      fd.set("file", file);
      fd.set("title", title.trim());
      const res = await fetch(`${API_BASE}/api/clinical-docs`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || "Falha no upload");
      }
      toast.success("Documento indexado");
      setTitle("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      invalidate();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao enviar o documento");
    } finally {
      setUploading(false);
    }
  };

  const remove = useMutation({
    mutationFn: (id: string) => apiClient.delete(`${API_BASE}/api/clinical-docs/${id}`),
    onSuccess: () => {
      toast.success("Documento removido");
      invalidate();
    },
    onError: () => toast.error("Falha ao remover"),
  });

  const docs = data?.data ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="w-4 h-4 text-blue-600" />
          Documentos de referência (RAG)
        </CardTitle>
        <CardDescription>
          PDFs de diretrizes/protocolos que o assistente da equipe poderá consultar. Use apenas
          material de referência — <strong>não</strong> envie documentos de pacientes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Título</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Diretriz de reabilitação de LCA"
            />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
          <Button onClick={upload} disabled={uploading || !file || !title.trim()}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
            Enviar
          </Button>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {!isLoading && docs.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum documento de referência ainda.</p>
        )}
        {docs.length > 0 && (
          <ul className="space-y-1.5">
            {docs.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-sm truncate">{doc.title}</span>
                  {doc.status !== "indexed" && (
                    <span className="text-[10px] font-bold uppercase text-amber-600">{doc.status}</span>
                  )}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => remove.mutate(doc.id)}
                  disabled={remove.isPending}
                  aria-label="Remover documento"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
