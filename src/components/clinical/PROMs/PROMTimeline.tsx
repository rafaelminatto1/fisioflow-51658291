import { useQuery } from '@tanstack/react-query';
import { request } from '@/lib/api/workers-client';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingDown, TrendingUp, Minus, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StandardizedTestResult {
  id: string;
  scale_name: string;
  score: number;
  interpretation?: string;
  applied_at: string;
}

interface PROMTimelineProps {
  patientId: string;
  scaleName: string;
}

interface ChartDataPoint {
  date: string;
  dateLabel: string;
  score: number;
  interpretation?: string;
}

const SCALE_CONFIG: Record<
  string,
  {
    label: string;
    max: number;
    mcid: number | null;
    mcidLabel: string;
    unit: string;
    invertedTrend: boolean;
  }
> = {
  VAS: {
    label: 'EVA/VAS',
    max: 10,
    mcid: 1.5,
    mcidLabel: 'MCID (1,5)',
    unit: 'pts',
    invertedTrend: true,
  },
  PSFS: {
    label: 'PSFS',
    max: 10,
    mcid: 2,
    mcidLabel: 'MCID (2,0)',
    unit: 'pts',
    invertedTrend: false,
  },
  DASH: {
    label: 'DASH',
    max: 100,
    mcid: 10.2,
    mcidLabel: 'MCID (10,2)',
    unit: '%',
    invertedTrend: true,
  },
  OSWESTRY: {
    label: 'Oswestry',
    max: 100,
    mcid: 10,
    mcidLabel: 'MCID (10%)',
    unit: '%',
    invertedTrend: true,
  },
  NDI: {
    label: 'NDI',
    max: 100,
    mcid: 7.5,
    mcidLabel: 'MCID (7,5%)',
    unit: '%',
    invertedTrend: true,
  },
  LEFS: {
    label: 'LEFS',
    max: 80,
    mcid: 9,
    mcidLabel: 'MCID (9)',
    unit: 'pts',
    invertedTrend: false,
  },
  BERG: {
    label: 'Berg',
    max: 56,
    mcid: 4,
    mcidLabel: 'MCID (4)',
    unit: 'pts',
    invertedTrend: false,
  },
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: ChartDataPoint }>;
  label?: string;
  unit?: string;
}

function CustomTooltip({ active, payload, unit }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-md border bg-background p-2.5 shadow-lg text-sm space-y-1">
      <p className="font-medium">{point.dateLabel}</p>
      <p className="text-foreground font-bold">
        Score: {payload[0].value.toFixed(1)} {unit}
      </p>
      {point.interpretation && (
        <p className="text-muted-foreground text-xs">{point.interpretation}</p>
      )}
    </div>
  );
}

export function PROMTimeline({ patientId, scaleName }: PROMTimelineProps) {
  const scale = scaleName.toUpperCase();
  const config = SCALE_CONFIG[scale] ?? {
    label: scaleName,
    max: 100,
    mcid: null,
    mcidLabel: '',
    unit: 'pts',
    invertedTrend: false,
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['standardized-tests-timeline', patientId, scale],
    queryFn: async () => {
      const res = await request<{ data: StandardizedTestResult[] }>(
        `/api/standardized-tests?patientId=${encodeURIComponent(patientId)}&scale=${encodeURIComponent(scale)}&limit=50`,
      );
      return (res?.data ?? []) as StandardizedTestResult[];
    },
    enabled: !!patientId && !!scaleName,
  });

  const chartData: ChartDataPoint[] = (data ?? [])
    .slice()
    .sort((a, b) => new Date(a.applied_at).getTime() - new Date(b.applied_at).getTime())
    .map((r) => ({
      date: r.applied_at,
      dateLabel: (() => {
        try {
          return format(parseISO(r.applied_at), "dd/MM/yyyy", { locale: ptBR });
        } catch {
          return r.applied_at;
        }
      })(),
      score: Number(r.score),
      interpretation: r.interpretation,
    }));

  const firstScore = chartData[0]?.score ?? null;
  const lastScore = chartData[chartData.length - 1]?.score ?? null;
  const delta = firstScore !== null && lastScore !== null ? lastScore - firstScore : null;

  const improved =
    delta !== null &&
    config.mcid !== null &&
    (config.invertedTrend ? delta <= -config.mcid : delta >= config.mcid);

  const worsened =
    delta !== null &&
    config.mcid !== null &&
    (config.invertedTrend ? delta >= config.mcid : delta <= -config.mcid);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-40">
          <p className="text-sm text-muted-foreground">Carregando dados...</p>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-40 gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <p className="text-sm">Erro ao carregar histórico</p>
        </CardContent>
      </Card>
    );
  }

  if (!chartData.length) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-40">
          <p className="text-sm text-muted-foreground">
            Nenhuma avaliação de {config.label} registrada.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{config.label} — Evolução</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {chartData.length} avaliação{chartData.length !== 1 ? 'ões' : ''} registrada
              {chartData.length !== 1 ? 's' : ''}
            </p>
          </div>
          {delta !== null && (
            <div className="flex items-center gap-1.5 shrink-0">
              {improved ? (
                <Badge className="bg-green-100 text-green-800 gap-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Melhora significativa
                </Badge>
              ) : worsened ? (
                <Badge className="bg-red-100 text-red-800 gap-1">
                  <TrendingDown className="h-3.5 w-3.5" />
                  Piora significativa
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-muted-foreground">
                  <Minus className="h-3.5 w-3.5" />
                  Sem mudança sig.
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
              />
              <YAxis
                domain={[0, config.max]}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}${config.unit === '%' ? '%' : ''}`}
              />
              <Tooltip content={<CustomTooltip unit={config.unit} />} />
              {config.mcid !== null && lastScore !== null && (
                <ReferenceLine
                  y={lastScore + (config.invertedTrend ? -config.mcid : config.mcid)}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="4 4"
                  label={{
                    value: config.mcidLabel,
                    position: 'insideTopRight',
                    fontSize: 10,
                    fill: 'hsl(var(--muted-foreground))',
                  }}
                />
              )}
              <Line
                type="monotone"
                dataKey="score"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {delta !== null && (
          <div className="mt-3 flex items-center justify-between text-sm border-t pt-3">
            <span className="text-muted-foreground">
              Variação total ({chartData[0]?.dateLabel} → {chartData[chartData.length - 1]?.dateLabel}):
            </span>
            <span
              className={`font-semibold ${
                improved ? 'text-green-600' : worsened ? 'text-red-600' : 'text-muted-foreground'
              }`}
            >
              {delta > 0 ? '+' : ''}
              {delta.toFixed(1)} {config.unit}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
