import React, { Suspense, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const LazyFilerobotImageEditor = React.lazy(() => import("react-filerobot-image-editor"));

interface ImageEditDialogProps {
  open: boolean;
  sourceFile?: File | null;
  sourceUrl?: string | null;
  fileName?: string;
  title?: string;
  onClose: () => void;
  onSaveImage: (file: File) => Promise<void> | void;
}

const getSafeBaseName = (name?: string) => {
  const cleaned = (name || "imagem").replace(/\.[^/.]+$/, "").trim();
  return cleaned || "imagem";
};

export function ImageEditDialog({
  open,
  sourceFile,
  sourceUrl,
  fileName,
  title = "Editar imagem",
  onClose,
  onSaveImage,
}: ImageEditDialogProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open || !sourceFile) {
      setObjectUrl(null);
      return;
    }

    const nextObjectUrl = URL.createObjectURL(sourceFile);
    setObjectUrl(nextObjectUrl);

    return () => URL.revokeObjectURL(nextObjectUrl);
  }, [open, sourceFile]);

  const editorSource = useMemo(() => objectUrl || sourceUrl || null, [objectUrl, sourceUrl]);

  const handleSave = async (editedImageObject: any) => {
    const imageBase64 = editedImageObject?.imageBase64;
    if (!imageBase64) {
      toast.error("Não foi possível gerar a imagem editada.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(imageBase64);
      const blob = await response.blob();
      const mimeType = editedImageObject?.mimeType || blob.type || "image/png";
      const extension =
        editedImageObject?.extension || mimeType.split("/")[1]?.replace("jpeg", "jpg") || "png";
      const nextFile = new File(
        [blob],
        `${getSafeBaseName(fileName || sourceFile?.name)}-editada.${extension}`,
        { type: mimeType },
      );

      await onSaveImage(nextFile);
    } catch (error) {
      console.error("Image editor save error:", error);
      toast.error("Erro ao salvar a imagem editada.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="h-[92vh] w-[96vw] max-w-[1180px] overflow-hidden p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {editorSource ? (
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center bg-slate-950">
                <Loader2 className="h-10 w-10 animate-spin text-white" />
              </div>
            }
          >
            <div className="h-full bg-slate-950">
              <LazyFilerobotImageEditor
                source={editorSource}
                onSave={handleSave}
                onClose={onClose}
                annotationsCommon={{
                  fill: "#ef4444",
                  stroke: "#ef4444",
                }}
                Text={{ text: "Anotação..." }}
                tabsIds={["Adjust", "Annotate", "Filters", "Finetune", "Watermark"]}
                defaultTabId="Adjust"
                defaultToolId="Crop"
                savingPixelRatio={2.5}
                previewPixelRatio={typeof window !== "undefined" ? window.devicePixelRatio : 1}
                translations={{
                  name: "Nome do Arquivo",
                  save: isSaving ? "Salvando..." : "Salvar na Evolução",
                  saveAs: "Salvar como",
                  extension: "Extensão",
                  format: "Formato",
                  quality: "Qualidade",
                  resize: "Redimensionar",
                  crop: "Cortar",
                  adjust: "Cortar / Ajustar",
                  filters: "Filtros",
                  finetune: "Refinar Cores",
                  annotate: "Anotar / Desenhar",
                  watermark: "Marca d'água",
                  pen: "Caneta",
                  arrow: "Seta",
                  line: "Linha",
                  rect: "Retângulo",
                  ellipse: "Elipse",
                  polygon: "Polígono",
                  text: "Texto",
                  image: "Imagem",
                  color: "Cor",
                  fill: "Preenchimento",
                  stroke: "Contorno",
                  brightness: "Brilho",
                  contrast: "Contraste",
                  saturation: "Saturação",
                  exposure: "Exposição",
                  temperature: "Temperatura",
                  undo: "Desfazer",
                  redo: "Refazer",
                  reset: "Zerar Edições",
                  cancel: "Cancelar",
                  original: "Original",
                  custom: "Personalizado",
                  square: "Quadrado",
                  landscape: "Paisagem",
                  portrait: "Retrato",
                }}
              />
            </div>
          </Suspense>
        ) : (
          <div className="flex h-full items-center justify-center bg-slate-950 text-sm text-white">
            Nenhuma imagem selecionada.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
