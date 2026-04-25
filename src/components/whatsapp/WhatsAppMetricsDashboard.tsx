import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CheckCircle2, MessageSquare, Send, TrendingUp, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useWhatsAppAnalytics } from "@/hooks/useWhatsAppMetrics";

const PERIODS = [
  { value: 7, label: "7 dias" },
  { value: 14, label: "14 dias" },
  { value: 30, label: "30 dias" },
  { value: 90, label: "90 dias" },
] as const;

export function WhatsAppMetricsDashboard() {
  const [days, setDays] = useState<number>(7);
  const { data, isLoading, error } = useWhatsAppAnalytics(days);

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Métricas WhatsApp</h2>
          <p className="text-sm text-muted-foreground">
            Performance de mensagens, templates e conversões nos últimos {days} dias
          </p>
        </div>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map((p) => (
              <SelectItem key={p.value} value={String(p.value)}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-center text-destructive">
            Erro ao carregar métricas. Tente novamente.
          </CardContent>
        </Card>
      ) : !data ? null : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard
              icon={<Send className="h-4 w-4" />}
              label="Enviadas"
              value={data.overview.sent}
              caption={`${data.overview.template_sent} por template`}
            />
            <KpiCard
              icon={<MessageSquare className="h-4 w-4" />}
              label="Recebidas"
              value={data.overview.received}
              caption="mensagens de pacientes"
            />
            <KpiCard
              icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
              label="Entrega"
              value={`${data.overview.delivery_rate}%`}
              caption={`Leitura: ${data.overview.read_rate}%`}
            />
            <KpiCard
              icon={<XCircle className="h-4 w-4 text-red-500" />}
              label="Falha"
              value={`${data.overview.failure_rate}%`}
              caption={`${data.status_breakdown.find((s) => s.status === "failed")?.count ?? 0} mensagens`}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Volume diário</CardTitle>
                <CardDescription>Mensagens enviadas e recebidas por dia</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={data.daily}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="sent"
                      stroke="#10b981"
                      name="Enviadas"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="received"
                      stroke="#3b82f6"
                      name="Recebidas"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Agendamentos
                </CardTitle>
                <CardDescription>Impacto do WhatsApp</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <MetricRow label="Confirmados" value={data.appointments.confirmed} tone="emerald" />
                <MetricRow
                  label="Cancelados via WhatsApp"
                  value={data.appointments.cancelled_via_whatsapp}
                  tone="red"
                />
                <MetricRow
                  label="Agendamentos futuros"
                  value={data.appointments.total_upcoming}
                  tone="neutral"
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Performance por template</CardTitle>
              <CardDescription>Enviadas, entregues, lidas e falhas</CardDescription>
            </CardHeader>
            <CardContent>
              {data.by_template.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum template enviado no período.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.by_template}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={10} angle={-15} height={60} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="sent" fill="#64748b" name="Enviadas" />
                    <Bar dataKey="delivered" fill="#3b82f6" name="Entregues" />
                    <Bar dataKey="read" fill="#10b981" name="Lidas" />
                    <Bar dataKey="failed" fill="#ef4444" name="Falhas" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  caption,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  caption?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <div className="text-2xl font-semibold mt-1">{value}</div>
        {caption ? <div className="text-xs text-muted-foreground mt-1">{caption}</div> : null}
      </CardContent>
    </Card>
  );
}

function MetricRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "red" | "neutral";
}) {
  const color =
    tone === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "red"
        ? "text-red-600 dark:text-red-400"
        : "text-foreground";
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold text-lg ${color}`}>{value}</span>
    </div>
  );
}
