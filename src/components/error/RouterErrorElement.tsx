import { AlertTriangle, Home, RefreshCw, Stethoscope } from "lucide-react";
import { useEffect } from "react";
import { isRouteErrorResponse, Link, useLocation, useRouteError } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { fisioLogger as logger } from "@/lib/errors/logger";

function getRouteErrorMessage(error: unknown) {
  if (isRouteErrorResponse(error)) {
    return `${error.status} ${error.statusText}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Falha inesperada ao renderizar esta rota.";
}

export function RouterErrorElement() {
  const error = useRouteError();
  const location = useLocation();
  const message = getRouteErrorMessage(error);

  useEffect(() => {
    logger.error(
      "React Router route render error",
      {
        error: message,
        pathname: location.pathname,
        search: location.search,
        stack: error instanceof Error ? error.stack : undefined,
      },
      "RouterErrorElement",
    );
  }, [error, location.pathname, location.search, message]);

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.14),transparent_32rem),linear-gradient(135deg,hsl(var(--background)),hsl(var(--muted)/0.65))] p-4">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center">
        <section className="relative w-full overflow-hidden rounded-[2rem] border bg-background/90 p-6 shadow-2xl shadow-slate-950/10 backdrop-blur md:p-10">
          <div className="absolute right-0 top-0 h-44 w-44 translate-x-12 -translate-y-12 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-40 w-40 -translate-x-10 translate-y-10 rounded-full bg-amber-400/10 blur-3xl" />

          <div className="relative grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                Rota em recuperação
              </div>

              <div className="space-y-3">
                <h1 className="max-w-xl text-3xl font-black tracking-tight text-foreground md:text-5xl">
                  A tela travou, mas o sistema isolou a falha.
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                  Esta rota encontrou um erro durante a renderização. Você pode recarregar a tela,
                  voltar ao painel inicial ou enviar os detalhes abaixo para análise técnica.
                </p>
              </div>

              <div className="rounded-2xl border bg-muted/40 p-4 text-left">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Detalhe técnico
                </p>
                <code className="block break-words rounded-xl bg-background p-3 text-xs text-foreground">
                  {message}
                </code>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="button" className="gap-2" onClick={() => window.location.reload()}>
                  <RefreshCw className="h-4 w-4" />
                  Recarregar tela
                </Button>
                <Button asChild variant="outline" className="gap-2">
                  <Link to="/dashboard">
                    <Home className="h-4 w-4" />
                    Ir para o painel
                  </Link>
                </Button>
              </div>
            </div>

            <div className="relative hidden md:block">
              <div className="rounded-[2rem] border bg-muted/30 p-6">
                <div className="rounded-[1.5rem] bg-background p-5 shadow-sm">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        FisioFlow Guard
                      </p>
                      <p className="text-lg font-bold">Boundary ativo</p>
                    </div>
                    <div className="rounded-2xl bg-primary/10 p-3">
                      <Stethoscope className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-3 w-3/4 rounded-full bg-primary/20" />
                    <div className="h-3 w-full rounded-full bg-muted" />
                    <div className="h-3 w-2/3 rounded-full bg-muted" />
                  </div>
                  <div className="mt-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-700">
                    O restante da aplicação permanece acessível.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default RouterErrorElement;
