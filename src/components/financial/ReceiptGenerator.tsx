import { useState } from "react";
import { toast } from "sonner";
import { Download, Loader2, MessageCircle, QrCode, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getWorkersApiUrl } from "@/lib/api/config";
import { getNeonAccessToken } from "@/lib/auth/neon-token";
import type { ReciboData } from "./ReciboPDF";

export interface ReceiptGeneratorProps {
  reciboId: string;
  reciboData: ReciboData;
  patientPhone?: string;
  whatsappSentAt?: string | null;
  onWhatsappSent?: () => void;
}

async function reciboRequest(path: string, method = "GET") {
  const token = await getNeonAccessToken();
  const res = await fetch(`${getWorkersApiUrl()}/api/recibos${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as any).error ?? "Erro na requisição");
  }
  return res.json();
}

export function ReceiptGenerator({
  reciboId,
  reciboData,
  patientPhone,
  whatsappSentAt,
  onWhatsappSent,
}: ReceiptGeneratorProps) {
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pixCode, setPixCode] = useState<string | null>(null);
  const [loadingPix, setLoadingPix] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);

  const handleDownloadPdf = async () => {
    setGeneratingPdf(true);
    try {
      const { exportReceiptPdf } = await import("@/lib/export/receiptPdfExport");
      await exportReceiptPdf(`recibo-${reciboData.numero}.pdf`, reciboData);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao gerar PDF");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleSendWhatsapp = async () => {
    setSendingWhatsapp(true);
    try {
      await reciboRequest(`/${reciboId}/send-whatsapp`, "POST");
      toast.success("Recibo enviado via WhatsApp!");
      onWhatsappSent?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao enviar WhatsApp");
    } finally {
      setSendingWhatsapp(false);
    }
  };

  const handleLoadPix = async () => {
    setLoadingPix(true);
    try {
      const res = await reciboRequest(`/${reciboId}/pix-qr`);
      setPixCode(res.data.pixCopiaECola);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao gerar Pix");
    } finally {
      setLoadingPix(false);
    }
  };

  const handleCopyPix = async () => {
    if (!pixCode) return;
    await navigator.clipboard.writeText(pixCode);
    setPixCopied(true);
    toast.success("Código Pix copiado!");
    setTimeout(() => setPixCopied(false), 3000);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>Recibo nº {reciboData.numero}</span>
          <Badge variant="outline">
            {Number(reciboData.valor).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadPdf}
            disabled={generatingPdf}
          >
            {generatingPdf ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Baixar PDF
          </Button>

          {patientPhone && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSendWhatsapp}
              disabled={sendingWhatsapp}
            >
              {sendingWhatsapp ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <MessageCircle className="mr-2 h-4 w-4" />
              )}
              {whatsappSentAt ? "Reenviar WhatsApp" : "Enviar WhatsApp"}
            </Button>
          )}

          {!pixCode && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleLoadPix}
              disabled={loadingPix}
            >
              {loadingPix ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <QrCode className="mr-2 h-4 w-4" />
              )}
              Gerar Pix
            </Button>
          )}
        </div>

        {whatsappSentAt && (
          <p className="text-xs text-muted-foreground">
            WhatsApp enviado em{" "}
            {new Date(whatsappSentAt).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}

        {pixCode && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-medium">Pix Copia e Cola</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs font-mono">
                  {pixCode}
                </code>
                <Button size="sm" variant="outline" onClick={handleCopyPix}>
                  {pixCopied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <QrCode className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
