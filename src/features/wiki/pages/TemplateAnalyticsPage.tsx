import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, BarChart3, TrendingUp, CheckCircle2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { wikiService } from '@/lib/services/wikiService';
import { getTriageStatus } from '@/features/wiki/triage/triageUtils';

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
  if (typeof ts.toDate === 'function') return ts.toDate().getTime();
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export default function TemplateAnalyticsPage() {
  const { user } = useAuth();

  const { data: pages = [] } = useQuery({
    queryKey: ['wiki-pages', user?.organizationId],
    queryFn: () => (user?.organizationId ? wikiService.listPages(user.organizationId) : Promise.resolve([])),
    enabled: !!user?.organizationId,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['wiki-triage-events', user?.organizationId],
    queryFn: () => (user?.organizationId ? wikiService.listTriageEvents(user.organizationId, 500) : Promise.resolve([])),
    enabled: !!user?.organizationId,
  });

  const rows = useMemo<TemplateRow[]>(() => {
    const triagePages = pages.filter((page) => page.category === 'triage' || page.tags.includes('triage'));
    const byTemplate = new Map<string, typeof triagePages>();

    triagePages.forEach((page) => {
      const templateId = page.template_id || 'manual';
      const list = byTemplate.get(templateId) || [];
      list.push(page);
      byTemplate.set(templateId, list);
    });

    const now = Date.now();
    const last14d = now - 14 * 24 * 60 * 60 * 1000;

    return Array.from(byTemplate.entries()).map(([templateId, list]) => {
      const donePages = list.filter((page) => getTriageStatus(page) === 'done');
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
          (event.template_id || 'manual') === templateId &&
          toMillis(event.created_at) >= last14d
      ).length;

      return {
        templateId: templateId.replace(/-v\d+$/, '').replace(/-/g, ' '),
        total,
        done,
        completionRate: total > 0 ? Number(((done / total) * 100).toFixed(1)) : 0,
        avgLeadTimeDays: done > 0 ? Number((leadTimeTotal / done).toFixed(1)) : 0,
        movesLast14d,
      };
    }).sort((a, b) => b.total - a.total);
  }, [pages, events]);

  const totals = useMemo(() => {
    const totalPages = rows.reduce((acc, row) => acc + row.total, 0);
    const totalDone = rows.reduce((acc, row) => acc + row.done, 0);
    const avgCompletion = totalPages > 0 ? Number(((totalDone / totalPages) * 100).toFixed(1)) : 0;
    return { totalPages, totalDone, avgCompletion };
  }, [rows]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Template Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Desempenho operacional por tipo de documento na triagem.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/wiki">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Wiki
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Volume Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totals.totalPages}</p>
            <p className="text-xs text-muted-foreground mt-1">Cards criados na triagem</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Concluídos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-600">{totals.totalDone}</p>
            <p className="text-xs text-muted-foreground mt-1">Total de entregas finalizadas</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Taxa de Eficiência</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{totals.avgCompletion}%</p>
            <p className="text-xs text-muted-foreground mt-1">Média de conclusão global</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Volume vs. Conclusão
            </CardTitle>
            <CardDescription>Comparativo de cards criados e finalizados por template.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} layout="vertical" margin={{ left: 40, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="templateId" 
                  type="category" 
                  width={100} 
                  fontSize={10} 
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Legend />
                <Bar dataKey="total" name="Total Criado" fill="#94a3b8" radius={[0, 4, 4, 0]} barSize={20} />
                <Bar dataKey="done" name="Concluído" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Taxa de Conclusão (%)
            </CardTitle>
            <CardDescription>Percentual de sucesso por tipo de template.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="templateId" 
                  fontSize={10} 
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis fontSize={10} tickLine={false} axisLine={false} unit="%" />
                <Tooltip 
                   contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="completionRate" name="Taxa %" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalhamento Operacional</CardTitle>
          <CardDescription>Métricas granulares para ajuste de processos e templates.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rows.map((row) => (
              <div key={row.templateId} className="flex flex-col rounded-xl border p-4 bg-card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-sm capitalize">{row.templateId}</h3>
                  <Badge variant={row.completionRate > 50 ? 'secondary' : 'outline'}>
                    {row.completionRate}%
                  </Badge>
                </div>
                
                <div className="mt-4 grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
                  <div className="space-y-1">
                    <p className="text-muted-foreground uppercase text-[10px]">Total / Done</p>
                    <p className="font-medium">{row.total} / {row.done}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground uppercase text-[10px]">Lead Time</p>
                    <p className="font-medium">{row.avgLeadTimeDays} dias</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground uppercase text-[10px]">Atividade (14d)</p>
                    <p className="font-medium text-blue-600">{row.movesLast14d} movs</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground uppercase text-[10px]">Status</p>
                    <p className={`font-medium ${row.completionRate > 70 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {row.completionRate > 70 ? 'Saudável' : 'Atenção'}
                    </p>
                  </div>
                </div>
                
                <div className="mt-4 w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`h-full ${row.completionRate > 70 ? 'bg-emerald-500' : 'bg-blue-500'}`}
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
