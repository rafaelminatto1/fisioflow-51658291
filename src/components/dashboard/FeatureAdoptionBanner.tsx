import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Package, FileText, X, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { request } from "@/api/v2";

interface NudgeItem {
  id: string;
  icon: React.ElementType;
  color: string;
  title: string;
  body: string;
  cta: string;
  route: string;
}

function useAdoptionData() {
  return useQuery({
    queryKey: ["feature-adoption-check"],
    queryFn: async () => {
      const [pkgRes, nfseRes] = await Promise.allSettled([
        request<{ data: unknown[] }>("/api/packages"),
        request<{ data: unknown[] }>("/api/nfse"),
      ]);
      const packageCount =
        pkgRes.status === "fulfilled"
          ? ((pkgRes.value as { data: unknown[] }).data?.length ?? 0)
          : null;
      const nfseCount =
        nfseRes.status === "fulfilled"
          ? ((nfseRes.value as { data: unknown[] }).data?.length ?? 0)
          : null;
      return { packageCount, nfseCount };
    },
    staleTime: 5 * 60 * 1000,
  });
}

function loadDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem("fisioflow_adoption_dismissed") ?? "[]"));
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>) {
  localStorage.setItem("fisioflow_adoption_dismissed", JSON.stringify([...ids]));
}

export function FeatureAdoptionBanner() {
  const navigate = useNavigate();
  const { data } = useAdoptionData();
  const [dismissed, setDismissed] = useState<Set<string>>(loadDismissed);

  if (!data) return null;

  const nudges: NudgeItem[] = [];

  if (data.packageCount === 0) {
    nudges.push({
      id: "packages",
      icon: Package,
      color: "blue",
      title: "Pacotes de sessão não configurados",
      body: "Crie pacotes de sessão para vender tratamentos completos e aumentar o ticket médio.",
      cta: "Criar primeiro pacote",
      route: "/financeiro/contas",
    });
  }

  if (data.nfseCount !== null && data.nfseCount < 5) {
    nudges.push({
      id: "nfse",
      icon: FileText,
      color: "amber",
      title: "Emissor de NFS-e disponível",
      body: "Emita notas fiscais diretamente do sistema. Configure em minutos com o assistente passo a passo.",
      cta: "Configurar NFS-e",
      route: "/financeiro/nfse",
    });
  }

  const visible = nudges.filter((n) => !dismissed.has(n.id));
  if (visible.length === 0) return null;

  const dismiss = (id: string) => {
    const next = new Set(dismissed).add(id);
    setDismissed(next);
    saveDismissed(next);
  };

  return (
    <div className={cn("grid gap-3", visible.length > 1 ? "sm:grid-cols-2" : "")}>
      {visible.map((nudge) => {
        const Icon = nudge.icon;
        return (
          <div
            key={nudge.id}
            className={cn(
              "relative flex items-start gap-3 rounded-2xl border p-4 pr-10",
              nudge.color === "blue" &&
                "border-blue-200 bg-blue-50/60 dark:border-blue-800 dark:bg-blue-950/30",
              nudge.color === "amber" &&
                "border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/30",
            )}
          >
            <div
              className={cn(
                "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                nudge.color === "blue" &&
                  "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400",
                nudge.color === "amber" &&
                  "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400",
              )}
            >
              <Icon className="h-4 w-4" />
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3 w-3 text-muted-foreground" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Feature disponível
                </p>
              </div>
              <p className="text-sm font-semibold leading-snug">{nudge.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{nudge.body}</p>
              <Button
                size="sm"
                variant="secondary"
                className={cn(
                  "h-7 rounded-lg text-xs gap-1.5 font-semibold",
                  nudge.color === "blue" &&
                    "bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/50 dark:hover:bg-blue-900 dark:text-blue-300",
                  nudge.color === "amber" &&
                    "bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-900/50 dark:hover:bg-amber-900 dark:text-amber-300",
                )}
                onClick={() => navigate(nudge.route)}
              >
                {nudge.cta}
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>

            <button
              className="absolute right-2.5 top-2.5 rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              onClick={() => dismiss(nudge.id)}
              aria-label="Fechar"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
