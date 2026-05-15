import { Package, MessageCircle, ChevronDown, ChevronUp, Clock, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { request } from "@/api/v2";

interface ExpiringPackage {
  id: string;
  patient_id: string;
  patient_name: string;
  phone: string | null;
  whatsapp: string | null;
  package_name: string;
  remaining_sessions: number;
  total_sessions: number;
  expires_at: string | null;
  days_until_expiry: number | null;
  alert_type: "zero" | "low" | "expiring_soon" | "ok";
}

function usePackagesExpiring() {
  return useQuery<ExpiringPackage[]>({
    queryKey: ["packages-expiring"],
    queryFn: async () => {
      const res = await request<{ data: ExpiringPackage[] }>(
        "/api/clinic-metrics/packages-expiring",
      );
      return (res as { data: ExpiringPackage[] }).data;
    },
    staleTime: 10 * 60 * 1000,
  });
}

function buildWhatsAppUrl(pkg: ExpiringPackage): string | null {
  const raw = pkg.whatsapp || pkg.phone;
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  const number = digits.startsWith("55") ? digits : `55${digits}`;
  const firstName = pkg.patient_name.split(" ")[0];
  const text =
    pkg.alert_type === "zero"
      ? encodeURIComponent(
          `Olá ${firstName}! Suas sessões do pacote *${pkg.package_name}* foram todas utilizadas. Gostaria de renovar? 😊`,
        )
      : pkg.alert_type === "low"
        ? encodeURIComponent(
            `Olá ${firstName}! Você tem apenas *${pkg.remaining_sessions} sessão(ões)* restante(s) no pacote *${pkg.package_name}*. Vamos renovar? 😊`,
          )
        : encodeURIComponent(
            `Olá ${firstName}! Seu pacote *${pkg.package_name}* vence em ${pkg.days_until_expiry} dia(s). Aproveite as sessões restantes ou renove agora! 😊`,
          );
  return `https://wa.me/${number}?text=${text}`;
}

const alertConfig = {
  zero: {
    label: "Zerado",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-900/30",
  },
  low: {
    label: "Crítico",
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-100 dark:bg-orange-900/30",
  },
  expiring_soon: {
    label: "Vence em breve",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-900/30",
  },
  ok: { label: "", color: "", bg: "" },
};

export function PackagesExpiringAlert() {
  const { data: packages, isLoading } = usePackagesExpiring();
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="border border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-52" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-12 rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!packages || packages.length === 0) return null;

  const visible = expanded ? packages : packages.slice(0, 3);

  return (
    <Card className="border border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-black uppercase tracking-widest text-orange-700 dark:text-orange-400 flex items-center gap-2">
            <Package className="h-4 w-4" />
            Pacotes a Vencer / Zerar
            <Badge className="bg-orange-500 text-white text-[10px] px-1.5 py-0 border-0">
              {packages.length}
            </Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-[11px] h-7 text-muted-foreground"
            onClick={() => navigate("/financeiro/pacotes")}
          >
            Ver todos
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {visible.map((pkg) => {
          const cfg = alertConfig[pkg.alert_type];
          const waUrl = buildWhatsAppUrl(pkg);
          return (
            <div
              key={pkg.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-white dark:bg-zinc-900 border border-orange-100 dark:border-orange-900 px-4 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold truncate">{pkg.patient_name}</p>
                  <Badge
                    className={cn(
                      "text-[10px] px-1.5 py-0 border-0 font-bold shrink-0",
                      cfg.bg,
                      cfg.color,
                    )}
                  >
                    {cfg.label}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {pkg.package_name} ·{" "}
                  <span className={cn("font-semibold", cfg.color)}>
                    {pkg.remaining_sessions} sessão(ões) restante(s)
                  </span>
                  {pkg.expires_at && pkg.days_until_expiry !== null && (
                    <>
                      {" "}
                      · <Clock className="inline h-3 w-3" />{" "}
                      {pkg.days_until_expiry <= 0
                        ? "Vencido"
                        : `vence em ${pkg.days_until_expiry}d`}
                    </>
                  )}
                </p>
              </div>
              {waUrl ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 h-8 gap-1.5 text-[11px] border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400"
                  asChild
                >
                  <a href={waUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-3.5 w-3.5" />
                    Renovar
                  </a>
                </Button>
              ) : (
                <AlertCircle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              )}
            </div>
          );
        })}

        {packages.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-[11px] text-muted-foreground gap-1 h-7"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" /> Ver menos
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" /> Ver mais {packages.length - 3} pacotes
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
