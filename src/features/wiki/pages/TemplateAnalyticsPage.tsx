import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BarChart3, TrendingUp, CheckCircle2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { wikiService } from "@/lib/services/wikiService";
import { getTriageStatus } from "@/features/wiki/triage/triageUtils";

interface TemplateRow {
  templateId: string;
  total: number;
  done: number;
  completionRate: number;
  avgLeadTimeDays: number;
  movesLast14d: number;
}

function toMillis(value: unknown): number {
  if (!value) return 0;
  const ts = value as { toDate?: () => Date };
  if (typeof ts.toDate === "function") return ts.toDate().getTime();
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export default function TemplateAnalyticsPage() {
  const { user } = useAuth();

  const { data: pages = [] } = useQuery({
    queryKey: ["wiki-pages", user?.organizationId],
    queryFn: () =>
      user?.organizationId ? wikiService.listPages(user.organizationId) : Promise.resolve([]),
    enabled: !!user?.organizationId,
  });

  const { data: events = [] } = useQuery({
    queryKey: ["wiki-triage-events", user?.organizationId],
    queryFn: () =>
      user?.organizationId
        ? wikiService.listTriageEvents(user.organizationId, 500)
        : Promise.resolve([]),
    enabled: !!user?.organizationId,
  });

  const rows = useMemo<TemplateRow[]>(() => {
    const triagePages = pages.filter(
      (page) => page.category === "triage" || page.tags.includes("triage"),
    );
    const byTemplate = new Map<string, typeof triagePages>();

    triagePages.forEach((page) => {
      const templateId = page.template_id || "manual";
      const list = byTemplate.get(templateId) || [];
      list.push(page);
      byTemplate.set(templateId, list);
    });

    const now = Date.now();
    const last14d = now - 14 * 24 * 60 * 60 * 1000;

    return Array.from(byTemplate.entries())
      .map(([templateId, list]) => {
        const donePages = list.filter((page) => getTriageStatus(page) === "done");
        const done = donePages.length;
        const total = list.length;

        const leadTimeTotal = donePages.reduce((acc, page) => {
          const created = toMillis(page.created_at);
          const updated = toMillis(page.updated_at);
          if (!created || !updated || updated < created) return acc;
          return acc + (updated - created) / (1000 * 60 * 60 * 24);
        }, 0);

        const movesLast14d = events.filter(
          (event) =>
            (event.template_id || "manual") === templateId && toMillis(event.created_at) >= last14d,
        ).length;

        return {
          templateId: templateId.replace(/-v\d+$/, "").replace(/-/g, " "),
          total,
          done,
          completionRate: total > 0 ? Number(((done / total) * 100).toFixed(1)) : 0,
          avgLeadTimeDays: done > 0 ? Number((leadTimeTotal / done).toFixed(1)) : 0,
          movesLast14d,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [pages, events]);

  const totals = useMemo(() => {
    const totalPages = rows.reduce((acc, row) => acc + row.total, 0);
    const totalDone = rows.reduce((acc, row) => acc + row.done, 0);
    const avgCompletion = totalPages > 0 ? Number(((totalDone / totalPages) * 100).toFixed(1)) : 0;
    return { totalPages, totalDone, avgCompletion };
  }, [rows]);

  return (
    <div className="container mx-auto p-8 space-y-10 animate-in fade-in duration-700">
      <div className="flex items-center justify-between border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-3xl font-bold font-display flex items-center gap-3 text-slate-900">
            <div className="p-2 bg-blue-100 rounded-xl">
              <BarChart3 className="h-7 w-7 text-blue-600" />
            </div>
            Template Analytics
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Desempenho operacional por tipo de documento na triagem.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-xl font-bold border-slate-200">
          <Link to="/wiki">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Wiki
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-slate-50/50 border-slate-200/60 rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Volume Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-slate-900">{totals.totalPages}</p>
            <p className="text-xs text-slate-500 mt-1 font-medium">Cards criados na triagem</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/5 border-blue-500/20 rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-blue-400">
              Concluídos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-blue-600">{totals.totalDone}</p>
            <p className="text-xs text-blue-500/70 mt-1 font-medium">Total de entregas finalizadas</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-500/5 border-orange-500/20 rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-orange-400">
              Taxa de Eficiência
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-orange-600">{totals.avgCompletion}%</p>
            <p className="text-xs text-orange-500/70 mt-1 font-medium">Média de conclusão global</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-white">
          <CardHeader className="border-b border-slate-50 bg-slate-50/30">
            <CardTitle className="flex items-center gap-2 text-base font-bold font-display text-slate-900">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Volume vs. Conclusão
            </CardTitle>
            <CardDescription className="font-medium">
              Comparativo de cards criados e finalizados por template.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] mt-6 p-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} layout="vertical" margin={{ left: 40, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="templateId"
                  type="category"
                  width={120}
                  fontSize={10}
                  fontWeight={700}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#64748b' }}
                />
                <Tooltip
                  cursor={{ fill: "rgba(59, 130, 246, 0.05)" }}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    fontSize: "12px",
                    fontWeight: 700
                  }}
                />
                <Legend iconType="circle" />
                <Bar
                  dataKey="total"
                  name="Total Criado"
                  fill="#cbd5e1"
                  radius={[0, 4, 4, 0]}
                  barSize={16}
                />
                <Bar
                  dataKey="done"
                  name="Concluído"
                  fill="#3b82f6"
                  radius={[0, 4, 4, 0]}
                  barSize={16}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-white">
          <CardHeader className="border-b border-slate-50 bg-slate-50/30">
            <CardTitle className="flex items-center gap-2 text-base font-bold font-display text-slate-900">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
              Taxa de Conclusão (%)
            </CardTitle>
            <CardDescription className="font-medium">Percentual de sucesso por tipo de template.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] mt-6 p-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="templateId" fontSize={10} fontWeight={700} tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} />
                <YAxis fontSize={10} fontWeight={700} tickLine={false} axisLine={false} unit="%" tick={{ fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    fontSize: "12px",
                    fontWeight: 700
                  }}
                />
                <Bar
                  dataKey="completionRate"
                  name="Taxa %"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  barSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-white">
        <CardHeader className="border-b border-slate-50 bg-slate-50/30">
          <CardTitle className="text-base font-bold font-display text-slate-900">Detalhamento Operacional</CardTitle>
          <CardDescription className="font-medium">
            Métricas granulares para ajuste de processos e templates.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {rows.map((row) => (
              <div
                key={row.templateId}
                className="flex flex-col rounded-2xl border border-slate-100 p-5 bg-slate-50/30 hover:shadow-md hover:border-blue-100 transition-all group"
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-bold text-sm capitalize text-slate-900 group-hover:text-blue-700 transition-colors">{row.templateId}</h3>
                  <Badge 
                    variant={row.completionRate > 50 ? "secondary" : "outline"}
                    className={cn(
                      "rounded-lg font-black uppercase tracking-widest text-[9px] px-2 py-0.5",
                      row.completionRate > 50 ? "bg-blue-100 text-blue-700 border-transparent" : "bg-white text-slate-400 border-slate-200"
                    )}
                  >
                    {row.completionRate}%
                  </Badge>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-y-4 gap-x-2 text-[10px]">
                  <div className="space-y-1">
                    <p className="text-slate-400 font-black uppercase tracking-tighter">Total / Done</p>
                    <p className="font-bold text-slate-700">
                      {row.total} / {row.done}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-400 font-black uppercase tracking-tighter">Lead Time</p>
                    <p className="font-bold text-slate-700">{row.avgLeadTimeDays} dias</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-400 font-black uppercase tracking-tighter">Atividade (14d)</p>
                    <p className="font-bold text-blue-600">{row.movesLast14d} movs</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-400 font-black uppercase tracking-tighter">Status</p>
                    <p
                      className={`font-black uppercase tracking-widest text-[9px] ${row.completionRate > 70 ? "text-blue-600" : "text-orange-600"}`}
                    >
                      {row.completionRate > 70 ? "Saudável" : "Atenção"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 w-full bg-slate-200 rounded-full h-1.5 overflow-hidden shadow-inner">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-1000",
                      row.completionRate > 70 ? "bg-blue-500" : "bg-orange-500"
                    )}
                    style={{ width: `${row.completionRate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
