/**
 * Google OAuth Callback
 * Handles redirect from Google after user authorizes calendar access.
 * Route: /auth/google/callback
 */

import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { integrationsApi } from "@/api/v2/system";
import { toast } from "sonner";

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      setStatus("error");
      setErrorMsg(error === "access_denied" ? "Acesso negado pelo usuário." : `Erro: ${error}`);
      setTimeout(() => navigate("/configuracoes/calendario"), 3000);
      return;
    }

    if (!code) {
      setStatus("error");
      setErrorMsg("Código de autorização não encontrado.");
      setTimeout(() => navigate("/configuracoes/calendario"), 3000);
      return;
    }

    integrationsApi.google
      .exchangeCode(code)
      .then(() => {
        setStatus("success");
        toast.success("Google Calendar conectado com sucesso!");
        setTimeout(() => navigate("/configuracoes/calendario"), 1500);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Erro ao conectar.";
        setStatus("error");
        setErrorMsg(msg);
        setTimeout(() => navigate("/configuracoes/calendario"), 3000);
      });
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 text-center p-8">
        {status === "loading" && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Conectando ao Google Calendar…</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="h-10 w-10 text-emerald-500" />
            <p className="font-medium">Google Calendar conectado!</p>
            <p className="text-xs text-muted-foreground">Redirecionando…</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="h-10 w-10 text-destructive" />
            <p className="font-medium">Falha ao conectar</p>
            <p className="text-xs text-muted-foreground">{errorMsg}</p>
            <p className="text-xs text-muted-foreground">Redirecionando…</p>
          </>
        )}
      </div>
    </div>
  );
}
