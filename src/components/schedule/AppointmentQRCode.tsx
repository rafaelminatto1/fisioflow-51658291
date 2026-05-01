import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { QrCode, Loader2, Copy, Check } from "lucide-react";
import { appointmentsApi } from "@/api/v2";
import { toast } from "sonner";

interface AppointmentQRCodeProps {
  appointmentId: string;
  patientName?: string;
  date?: string;
  time?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AppointmentQRCode({
  appointmentId,
  patientName,
  date,
  time,
  open: controlledOpen,
  onOpenChange,
}: AppointmentQRCodeProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (v: boolean) => {
    setInternalOpen(v);
    onOpenChange?.(v);
  };
  const [loading, setLoading] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (controlledOpen && !qrUrl && !loading) {
      handleOpen();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlledOpen]);

  const handleOpen = async () => {
    setOpen(true);
    if (qrUrl) return; // already generated
    setLoading(true);
    try {
      const res = await appointmentsApi.generateQrToken(appointmentId);
      setQrUrl(res.data?.url ?? null);
    } catch {
      toast.error("Erro ao gerar QR Code");
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!qrUrl) return;
    await navigator.clipboard.writeText(qrUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {controlledOpen === undefined && (
        <Button variant="outline" size="sm" onClick={handleOpen} className="gap-1.5">
          <QrCode className="h-4 w-4" />
          Check-in QR
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>QR Code de Check-in</DialogTitle>
            <DialogDescription>
              {patientName && <span className="font-medium">{patientName}</span>}
              {date && time && (
                <span className="text-muted-foreground">
                  {" "}— {date} às {time}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-4">
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                Gerando QR Code...
              </div>
            ) : qrUrl ? (
              <>
                <div className="border-4 border-gray-900 rounded-xl p-3 bg-white">
                  <QRCodeSVG value={qrUrl} size={200} level="M" />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Paciente escaneia com a câmera do celular para fazer check-in.
                  <br />
                  Válido por 2 horas.
                </p>
                <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-green-600" />
                      Link copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copiar link
                    </>
                  )}
                </Button>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
