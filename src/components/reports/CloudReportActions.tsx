import { useState } from "react";
import { Cloud, Share2, Copy, Check, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reportsApi } from "@/api/v2";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CloudReportActionsProps {
  reportData: any;
  patientId: string;
  patientName: string;
  type: string;
}

export function CloudReportActions({
  reportData,
  patientId,
  patientName,
  type,
}: CloudReportActionsProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [cloudInfo, setCloudInfo] = useState<{
    pdfKey: string;
    htmlKey?: string;
    pdfUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerateCloud = async () => {
    setIsGenerating(true);
    try {
      const res = await reportsApi.pdf.generate({
        type,
        patientId,
        patientName,
        data: reportData,
        saveToR2: true,
        includeHtml: true,
      });

      setCloudInfo({
        pdfKey: res.pdfKey,
        htmlKey: res.htmlKey,
        pdfUrl: res.pdfUrl,
      });
      toast.success("Relatório salvo na nuvem com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar na nuvem:", error);
      toast.error("Erro ao salvar relatório na nuvem.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!cloudInfo?.pdfKey) return;

    setIsSharing(true);
    try {
      // Gera um link temporário de 48 horas (172800 segundos)
      const res = await reportsApi.pdf.share({
        key: cloudInfo.pdfKey,
        expiresIn: 172800,
      });

      await navigator.clipboard.writeText(res.url);
      setCopied(true);
      toast.success("Link temporário copiado para a área de transferência!");
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      console.error("Erro ao gerar link de compartilhamento:", error);
      toast.error("Erro ao gerar link de compartilhamento.");
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 border-t pt-4 mt-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Cloud className="h-4 w-4 text-primary" />
          Acesso em Nuvem e Compartilhamento
        </h4>
      </div>

      <div className="flex flex-wrap gap-2">
        {!cloudInfo ? (
          <Button
            size="sm"
            onClick={handleGenerateCloud}
            disabled={isGenerating}
            className="flex-1 sm:flex-none"
          >
            {isGenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Cloud className="mr-2 h-4 w-4" />
            )}
            Gerar Link na Nuvem (PDF/HTML)
          </Button>
        ) : (
          <>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShare}
                    disabled={isSharing}
                    className="flex-1 sm:flex-none"
                  >
                    {isSharing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : copied ? (
                      <Check className="mr-2 h-4 w-4 text-green-500" />
                    ) : (
                      <Share2 className="mr-2 h-4 w-4" />
                    )}
                    {copied ? "Link Copiado!" : "Gerar Link para Médico"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Gera um link temporário (48h) que não exige login</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {cloudInfo.pdfUrl && (
              <Button variant="ghost" size="sm" asChild>
                <a href={cloudInfo.pdfUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Ver PDF Online
                </a>
              </Button>
            )}
          </>
        )}
      </div>

      {cloudInfo && (
        <p className="text-[10px] text-muted-foreground italic">
          * O link para o médico é temporário e expira em 48 horas por segurança.
        </p>
      )}
    </div>
  );
}
