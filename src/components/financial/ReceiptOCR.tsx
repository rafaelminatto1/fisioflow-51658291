import React, { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Loader2, Sparkles, Check, Info, X } from "lucide-react";
import { toast } from "sonner";
import { getNeonAccessToken } from "@/lib/auth/neon-token";
import { getWorkersApiUrl } from "@/lib/api/config";

const WORKERS_BASE = getWorkersApiUrl();

interface ReceiptOCRProps {
  onDataExtracted: (data: {
    valor: number;
    nome?: string;
    cardLastDigits?: string;
    isFirstPayment?: boolean;
    patientId?: string;
  }) => void;
}

export function ReceiptOCR({ onDataExtracted }: ReceiptOCRProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Arquivo deve ser uma imagem (JPG, PNG, WEBP, etc.)");
      return;
    }

    // Preview local
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    setIsAnalyzing(true);
    try {
      const token = await getNeonAccessToken();

      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch(`${WORKERS_BASE}/api/ai/receipt-ocr`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as any;
        throw new Error(errBody?.error ?? `Erro HTTP ${res.status}`);
      }

      const result = (await res.json()) as {
        success: boolean;
        data?: {
          valor: number;
          nome: string | null;
          cardLastDigits: string | null;
          isFirstPayment: boolean;
          pixKey: string | null;
          dataTransacao: string | null;
        };
        error?: string;
      };

      if (!result.success || !result.data) {
        throw new Error(result.error ?? "IA não conseguiu extrair os dados");
      }

      const extracted = result.data;

      // Tentar associar cartão→paciente se detectou dígitos
      let patientId: string | undefined;
      if (extracted.cardLastDigits) {
        try {
          const mappingRes = await fetch(
            `${WORKERS_BASE}/api/financial/card-mapping/${extracted.cardLastDigits}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          const mapping = (await mappingRes.json()) as any;
          if (mapping?.data?.patient_id) {
            patientId = mapping.data.patient_id;
            toast.success(`Paciente ${mapping.data.patient_name ?? ""} reconhecido pelo cartão!`);
          }
        } catch {
          // Non-fatal — continue without mapping
        }
      }

      onDataExtracted({
        valor: extracted.valor,
        nome: extracted.nome ?? undefined,
        cardLastDigits: extracted.cardLastDigits ?? undefined,
        isFirstPayment: extracted.isFirstPayment,
        patientId,
      });

      toast.success("Comprovante processado com sucesso!");
    } catch (error: any) {
      console.error("[ReceiptOCR] Error:", error);
      toast.error(error.message ?? "Erro ao processar comprovante. Digite os dados manualmente.");
      setPreview(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processFile(file);
    // Reset input so the same file can be re-selected
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await processFile(file);
  };

  const clearPreview = () => {
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      <Card
        className={`border-dashed border-2 bg-slate-50/50 dark:bg-slate-900/50 overflow-hidden relative group transition-all ${
          isDragOver ? "border-primary bg-primary/5" : "hover:bg-slate-100"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        <CardContent className="p-0">
          <Label
            htmlFor="receipt-upload"
            className="flex flex-col items-center justify-center py-10 cursor-pointer w-full h-full"
          >
            {preview ? (
              <div className="relative w-full h-40">
                <img
                  src={preview}
                  alt="Preview comprovante"
                  className="w-full h-full object-contain opacity-50 blur-[1px]"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/20 backdrop-blur-sm">
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary animate-pulse">
                        IA Analisando Comprovante...
                      </p>
                    </>
                  ) : (
                    <>
                      <Check className="h-8 w-8 text-emerald-500 mb-2" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                        Comprovante Processado
                      </p>
                    </>
                  )}
                </div>
                {!isAnalyzing && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      clearPreview();
                    }}
                    className="absolute top-2 right-2 p-1 rounded-full bg-white/80 hover:bg-white shadow"
                  >
                    <X className="h-3.5 w-3.5 text-slate-500" />
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-premium-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500">
                  <Camera className="h-6 w-6 text-slate-400 group-hover:text-primary transition-colors" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-black tracking-tightest">
                    Anexar Comprovante (PIX/Foto)
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center justify-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Preenchimento Automático via IA
                  </p>
                  <p className="text-[10px] text-slate-300 font-medium">
                    Clique ou arraste a imagem aqui
                  </p>
                </div>
              </>
            )}
            <Input
              id="receipt-upload"
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
              disabled={isAnalyzing}
            />
          </Label>
        </CardContent>
      </Card>

      {!preview && !isAnalyzing && (
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 flex gap-3 items-start animate-in fade-in duration-700">
          <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-[10px] font-bold text-blue-700 leading-tight">
            Dica: Tire um print do PIX ou uma foto do recibo físico. Nossa IA identificará o valor e
            o paciente automaticamente.
          </p>
        </div>
      )}
    </div>
  );
}
