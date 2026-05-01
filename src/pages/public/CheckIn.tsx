import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, QrCode } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "https://fisioflow-api.rafalegollas.workers.dev";

export function CheckIn() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [checkedInAt, setCheckedInAt] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("Link de check-in inválido.");
    }
  }, [token]);

  const handleCheckIn = async () => {
    if (!token) return;
    setState("loading");
    try {
      const res = await fetch(`${API_BASE}/api/public-booking/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (res.ok) {
        setState("success");
        setCheckedInAt(data.data?.checkedInAt ?? new Date().toISOString());
      } else if (res.status === 409) {
        setState("success");
        setMessage("Check-in já realizado anteriormente.");
        setCheckedInAt(data.checkedInAt ?? null);
      } else {
        setState("error");
        setMessage(data.error || "Erro ao realizar check-in.");
      }
    } catch {
      setState("error");
      setMessage("Erro de conexão. Verifique sua internet e tente novamente.");
    }
  };

  const formatTime = (iso: string) => {
    try {
      return new Intl.DateTimeFormat("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-sm shadow-xl">
        <CardContent className="pt-8 pb-8 flex flex-col items-center text-center gap-6">
          {/* Header */}
          <div className="flex flex-col items-center gap-2">
            <div className="bg-blue-600 rounded-full p-4">
              <QrCode className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">FisioFlow</h1>
            <p className="text-sm text-muted-foreground">Check-in de Consulta</p>
          </div>

          {/* State: idle */}
          {state === "idle" && token && (
            <>
              <p className="text-gray-600">
                Confirme sua presença na consulta de hoje clicando no botão abaixo.
              </p>
              <Button onClick={handleCheckIn} size="lg" className="w-full">
                Confirmar Check-in
              </Button>
            </>
          )}

          {/* State: loading */}
          {state === "loading" && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
              <p className="text-muted-foreground">Confirmando presença...</p>
            </div>
          )}

          {/* State: success */}
          {state === "success" && (
            <div className="flex flex-col items-center gap-3">
              <div className="bg-green-100 rounded-full p-4">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-green-700">Check-in Realizado!</h2>
              {message && <p className="text-sm text-muted-foreground">{message}</p>}
              {checkedInAt && (
                <p className="text-sm text-muted-foreground">
                  Registrado às {formatTime(checkedInAt)}
                </p>
              )}
              <p className="text-sm text-gray-600 mt-2">
                Sua presença foi confirmada. A recepção já foi notificada.
              </p>
            </div>
          )}

          {/* State: error */}
          {state === "error" && (
            <div className="flex flex-col items-center gap-3">
              <div className="bg-red-100 rounded-full p-4">
                <XCircle className="h-10 w-10 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-red-700">Erro no Check-in</h2>
              <p className="text-sm text-muted-foreground">
                {message || "Não foi possível realizar o check-in."}
              </p>
              <p className="text-xs text-muted-foreground">
                Por favor, informe a recepção.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default CheckIn;
