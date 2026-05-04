import { AlertCircle, MessageCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { request } from "@/api/v2";

interface OverduePatient {
  patient_id: string;
  full_name: string;
  phone: string | null;
  whatsapp: string | null;
  overdue_count: number;
  overdue_total: number;
  oldest_overdue_date: string;
}

interface OverdueData {
  patients: OverduePatient[];
  summary: { total_appointments: number; total_overdue: number };
}

function useOverduePayments() {
  return useQuery<OverdueData>({
    queryKey: ["overdue-payments"],
    queryFn: async () => {
      const res = await request<{ data: OverdueData }>("/api/clinic-metrics/overdue-payments");
      return (res as { data: OverdueData }).data;
    },
    staleTime: 10 * 60 * 1000,
  });
}

const fmtBRL = (n: number) =>
  Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function buildWhatsAppUrl(patient: OverduePatient): string | null {
  const raw = patient.whatsapp || patient.phone;
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  const number = digits.startsWith("55") ? digits : `55${digits}`;
  const text = encodeURIComponent(
    `Olá ${patient.full_name.split(" ")[0]}! Passando para lembrar sobre o pagamento de ${patient.overdue_count} sessão(ões) em aberto. Podemos ajudar a regularizar? 😊`,
  );
  return `https://wa.me/${number}?text=${text}`;
}

export function OverduePaymentsAlert() {
  const { data, isLoading } = useOverduePayments();
  const [expanded, setExpanded] = useState(false);

  if (isLoading) {
    return (
      <Card className="border border-border/50 shadow-sm bg-card/80">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-56" />
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

  if (!data || data.patients.length === 0) return null;

  const { patients, summary } = data;
  const visible = expanded ? patients : patients.slice(0, 3);

  return (
    <Card className="border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-black uppercase tracking-widest text-red-700 dark:text-red-400 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Valores em Aberto
            <Badge className="bg-red-500 text-white text-[10px] px-1.5 py-0 border-0">
              {patients.length}
            </Badge>
          </CardTitle>
          <span className="text-sm font-black text-red-600 dark:text-red-400">
            {fmtBRL(Number(summary.total_overdue))}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {visible.map((p) => {
          const waUrl = buildWhatsAppUrl(p);
          return (
            <div
              key={p.patient_id}
              className="flex items-center justify-between gap-3 rounded-xl bg-white dark:bg-zinc-900 border border-red-100 dark:border-red-900 px-4 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{p.full_name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {p.overdue_count} sessão(ões) •{" "}
                  <span className="text-red-600 dark:text-red-400 font-semibold">
                    {fmtBRL(Number(p.overdue_total))}
                  </span>
                  {" · desde "}
                  {new Date(p.oldest_overdue_date + "T12:00:00").toLocaleDateString("pt-BR")}
                </p>
              </div>
              {waUrl ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 h-8 gap-1.5 text-[11px] border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950/30"
                  asChild
                >
                  <a href={waUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-3.5 w-3.5" />
                    Cobrar
                  </a>
                </Button>
              ) : (
                <span className="text-[11px] text-muted-foreground shrink-0">Sem telefone</span>
              )}
            </div>
          );
        })}

        {patients.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-[11px] text-muted-foreground gap-1 h-7"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                Ver menos
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                Ver mais {patients.length - 3} pacientes
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
