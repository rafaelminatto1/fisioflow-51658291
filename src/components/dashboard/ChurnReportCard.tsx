import { useQuery } from "@tanstack/react-query";
import { TrendingDown, UserMinus, Phone } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { request } from "@/api/v2/base";

interface ChurnPatient {
  patient_id: string;
  name: string;
  phone?: string;
}

interface ChurnData {
  activePrevMonth: number;
  churnedCount: number;
  churnRate: number;
  churnedPatients: ChurnPatient[];
  period: {
    current: { start: string; end: string };
    previous: { start: string; end: string };
  };
}

function semaphore(rate: number) {
  if (rate < 10) return "text-green-600";
  if (rate < 20) return "text-yellow-600";
  return "text-red-600";
}

export function ChurnReportCard() {
  const month = format(new Date(), "yyyy-MM");

  const { data, isLoading } = useQuery({
    queryKey: ["churn-report", month],
    queryFn: () =>
      request<{ data: ChurnData }>(`/api/clinic-metrics/churn?month=${month}`).then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading || !data) return null;
  if (data.churnedCount === 0 && data.activePrevMonth === 0) return null;

  const prevLabel = format(new Date(data.period.previous.start), "MMMM", { locale: ptBR });

  return (
    <Card className="border border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
          Churn Mensal
          <Badge variant="outline" className="text-xs ml-auto">
            Base {prevLabel}: {data.activePrevMonth}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Pacientes perdidos</p>
            <p className="text-2xl font-bold">{data.churnedCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Taxa de churn</p>
            <p className={`text-2xl font-bold ${semaphore(data.churnRate)}`}>
              {data.churnRate.toFixed(1)}%
            </p>
          </div>
          <div className="text-xs text-muted-foreground ml-auto text-right">
            <p>Meta: &lt; 10%</p>
            {data.churnRate < 10 && <p className="text-green-600 font-medium">✓ OK</p>}
            {data.churnRate >= 10 && data.churnRate < 20 && (
              <p className="text-yellow-600 font-medium">⚠ Atenção</p>
            )}
            {data.churnRate >= 20 && <p className="text-red-600 font-medium">✗ Alto</p>}
          </div>
        </div>

        {data.churnedPatients.length > 0 && (
          <div className="space-y-1.5 border-t pt-2">
            <p className="text-xs font-medium text-muted-foreground">
              Pacientes sem sessão este mês:
            </p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {data.churnedPatients.slice(0, 8).map((p) => (
                <div
                  key={p.patient_id}
                  className="flex items-center justify-between text-xs py-0.5"
                >
                  <span className="flex items-center gap-1.5">
                    <UserMinus className="h-3 w-3 text-muted-foreground" />
                    {p.name}
                  </span>
                  {p.phone && (
                    <a
                      href={`https://wa.me/55${p.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-green-600 hover:text-green-700"
                    >
                      <Phone className="h-3 w-3" />
                      WA
                    </a>
                  )}
                </div>
              ))}
              {data.churnedPatients.length > 8 && (
                <p className="text-xs text-muted-foreground">
                  +{data.churnedPatients.length - 8} pacientes
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
