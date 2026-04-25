import { useState } from "react";
import type { ComponentProps, ComponentType, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadReactPdfDocument } from "@/lib/export/reactPdfDownload";

interface LazyPdfDownloadButtonProps<TDocumentProps> {
  loadDocument: () => Promise<{ default: ComponentType<TDocumentProps> }>;
  documentProps: TDocumentProps;
  fileName: string;
  label: string;
  loadingLabel?: string;
  icon?: ReactNode;
  buttonProps?: Omit<ComponentProps<typeof Button>, "children" | "disabled">;
}

export function LazyPdfDownloadButton<TDocumentProps>({
  loadDocument,
  documentProps,
  fileName,
  label,
  loadingLabel = "Gerando...",
  icon,
  buttonProps,
}: LazyPdfDownloadButtonProps<TDocumentProps>) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      await downloadReactPdfDocument({
        fileName,
        loadDocument: async () => (await loadDocument()).default,
        props: documentProps,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button disabled={isGenerating} onClick={() => void handleDownload()} {...buttonProps}>
      {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : icon}
      {isGenerating ? loadingLabel : label}
    </Button>
  );
}
