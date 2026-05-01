import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, FileSignature, AlertTriangle } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "https://fisioflow-api.rafalegollas.workers.dev";

interface DocumentInfo {
  id: string;
  documentTitle: string;
  documentType: string;
  signerName: string;
}

type State = "loading" | "ready" | "signing" | "signed" | "already_signed" | "expired" | "error";

export function DocumentSigning() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<State>("loading");
  const [docInfo, setDocInfo] = useState<DocumentInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [signedAt, setSignedAt] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (!token) {
      setState("error");
      setErrorMessage("Link de assinatura inválido.");
      return;
    }
    fetch(`${API_BASE}/api/document-signatures/sign/${encodeURIComponent(token)}`)
      .then((res) => res.json().then((data) => ({ status: res.status, data })))
      .then(({ status, data }) => {
        if (status === 200) {
          setDocInfo(data.data);
          setState("ready");
        } else if (status === 409) {
          setState("already_signed");
          setSignedAt(data.signedAt ?? null);
        } else if (status === 410) {
          setState("expired");
        } else {
          setState("error");
          setErrorMessage(data.error || "Link inválido ou expirado.");
        }
      })
      .catch(() => {
        setState("error");
        setErrorMessage("Erro de conexão. Verifique sua internet e tente novamente.");
      });
  }, [token]);

  const handleSign = async () => {
    if (!token || !agreed) return;
    setState("signing");
    try {
      const res = await fetch(
        `${API_BASE}/api/document-signatures/sign/${encodeURIComponent(token)}/confirm`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
      );
      const data = await res.json();
      if (res.ok) {
        setState("signed");
        setSignedAt(data.data?.signedAt ?? new Date().toISOString());
      } else if (res.status === 409) {
        setState("already_signed");
        setSignedAt(data.signedAt ?? null);
      } else {
        setState("error");
        setErrorMessage(data.error || "Erro ao registrar assinatura.");
      }
    } catch {
      setState("error");
      setErrorMessage("Erro de conexão. Verifique sua internet e tente novamente.");
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardContent className="pt-8 pb-8 flex flex-col items-center text-center gap-6">
          {/* Header */}
          <div className="flex flex-col items-center gap-2">
            <div className="bg-blue-600 rounded-full p-4">
              <FileSignature className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">FisioFlow</h1>
            <p className="text-sm text-muted-foreground">Assinatura Eletrônica de Documento</p>
          </div>

          {/* Loading */}
          {state === "loading" && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
              <p className="text-muted-foreground">Carregando documento...</p>
            </div>
          )}

          {/* Ready to sign */}
          {state === "ready" && docInfo && (
            <>
              <div className="w-full bg-blue-50 rounded-lg p-4 text-left space-y-2 border border-blue-100">
                <div>
                  <span className="text-xs text-muted-foreground uppercase font-medium">Documento</span>
                  <p className="font-semibold text-gray-900">{docInfo.documentTitle}</p>
                </div>
                {docInfo.documentType && (
                  <div>
                    <span className="text-xs text-muted-foreground uppercase font-medium">Tipo</span>
                    <p className="text-sm text-gray-700">{docInfo.documentType}</p>
                  </div>
                )}
                <div>
                  <span className="text-xs text-muted-foreground uppercase font-medium">Signatário</span>
                  <p className="text-sm text-gray-700">{docInfo.signerName}</p>
                </div>
              </div>

              <label className="flex items-start gap-3 text-left cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 accent-blue-600"
                />
                <span className="text-sm text-gray-600">
                  Li e concordo com o conteúdo do documento acima. Entendo que esta assinatura
                  eletrônica tem validade legal conforme a MP 2.200-2/2001 e a Lei 14.063/2020.
                </span>
              </label>

              <Button
                onClick={handleSign}
                disabled={!agreed}
                size="lg"
                className="w-full"
              >
                Assinar Documento
              </Button>

              <p className="text-xs text-muted-foreground">
                Sua assinatura será registrada com data, hora e IP de origem.
              </p>
            </>
          )}

          {/* Signing in progress */}
          {state === "signing" && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
              <p className="text-muted-foreground">Registrando assinatura...</p>
            </div>
          )}

          {/* Success */}
          {state === "signed" && (
            <div className="flex flex-col items-center gap-3">
              <div className="bg-green-100 rounded-full p-4">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-green-700">Documento Assinado!</h2>
              <p className="text-sm text-gray-600">
                Sua assinatura eletrônica foi registrada com sucesso.
              </p>
              {signedAt && (
                <p className="text-sm text-muted-foreground">
                  Assinado em {formatDate(signedAt)}
                </p>
              )}
              <p className="text-xs text-muted-foreground text-center mt-2">
                Guarde esta confirmação. O fisioterapeuta responsável já foi notificado.
              </p>
            </div>
          )}

          {/* Already signed */}
          {state === "already_signed" && (
            <div className="flex flex-col items-center gap-3">
              <div className="bg-blue-100 rounded-full p-4">
                <CheckCircle2 className="h-10 w-10 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-blue-700">Já Assinado</h2>
              <p className="text-sm text-gray-600">Este documento já foi assinado anteriormente.</p>
              {signedAt && (
                <p className="text-sm text-muted-foreground">Assinado em {formatDate(signedAt)}</p>
              )}
            </div>
          )}

          {/* Expired */}
          {state === "expired" && (
            <div className="flex flex-col items-center gap-3">
              <div className="bg-amber-100 rounded-full p-4">
                <AlertTriangle className="h-10 w-10 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-amber-700">Link Expirado</h2>
              <p className="text-sm text-gray-600">
                Este link de assinatura expirou (válido por 48 horas).
              </p>
              <p className="text-sm text-muted-foreground">
                Solicite ao seu fisioterapeuta um novo link de assinatura.
              </p>
            </div>
          )}

          {/* Error */}
          {state === "error" && (
            <div className="flex flex-col items-center gap-3">
              <div className="bg-red-100 rounded-full p-4">
                <XCircle className="h-10 w-10 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-red-700">Erro</h2>
              <p className="text-sm text-muted-foreground">
                {errorMessage || "Não foi possível carregar o documento."}
              </p>
              <p className="text-xs text-muted-foreground">Por favor, contate o fisioterapeuta.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default DocumentSigning;
