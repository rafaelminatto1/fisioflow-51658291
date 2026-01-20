/**
 * Forecast Chart Component
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, Calendar } from 'lucide-react';
import type { ForecastResponse } from '@/lib/analytics/strategic/types';

interface ForecastChartProps {
  forecast: ForecastResponse;
  title?: string;
  description?: string;
  showTable?: boolean;
}

export function ForecastChart({
  forecast,
  title = "Previsão de Agendamentos",
  description = "Projeção baseada em análise de séries temporais",
  showTable = false,
}: ForecastChartProps) {
  // Prepare chart data
  const chartData = forecast.predictions.map(p => ({
    date: format(parseISO(p.date), 'dd/MM', { locale: ptBR }),
    previsto: p.appointments.predicted,
    min: p.appointments.range[0],
    max: p.appointments.range[1],
  }));

  // Calculate total predicted
  const totalPredicted = forecast.predictions.reduce(
    (sum, p) => sum + p.appointments.predicted,
    0
  );
  const avgPredicted = totalPredicted / forecast.predictions.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Previsto</p>
            <p className="text-2xl font-bold">{Math.round(totalPredicted)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Média Diária</p>
            <p className="text-2xl font-bold">{Math.round(avgPredicted)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Confiança</p>
            <p className="text-2xl font-bold">{forecast.insights.trend.confidence}%</p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.05} />
                  <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748B', fontSize: 11 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748B', fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                formatter={(value: number, name: string) => {
                  if (name === 'previsto') return [Math.round(value), 'Previsto'];
                  return null;
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="max"
                stroke="none"
                fill="url(#colorConfidence)"
                name="Intervalo de Confiança"
              />
              <Area
                type="monotone"
                dataKey="min"
                stroke="none"
                fill="hsl(var(--background))"
                name=""
              />
              <Line
                type="monotone"
                dataKey="previsto"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5 }}
                name="Agendamentos Previstos"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Recommendations */}
        {forecast.insights.recommendations.length > 0 && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-2">Recomendações:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {forecast.insights.recommendations.slice(0, 3).map((rec, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Table View */}
        {showTable && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Data</th>
                  <th className="text-left p-2 font-medium">Previsto</th>
                  <th className="text-left p-2 font-medium">Mín</th>
                  <th className="text-left p-2 font-medium">Máx</th>
                  <th className="text-left p-2 font-medium">Confiança</th>
                </tr>
              </thead>
              <tbody>
                {forecast.predictions.map((prediction, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="p-2">{format(parseISO(prediction.date), 'dd/MM/yyyy')}</td>
                    <td className="p-2 font-medium">{prediction.appointments.predicted}</td>
                    <td className="p-2 text-muted-foreground">{prediction.appointments.range[0]}</td>
                    <td className="p-2 text-muted-foreground">{prediction.appointments.range[1]}</td>
                    <td className="p-2">{prediction.appointments.confidence}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
