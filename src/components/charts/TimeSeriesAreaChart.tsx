import { useId } from "react";
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { SafeResponsiveContainer } from "@/components/charts/SafeResponsiveContainer";

export interface TimeSeriesPoint {
  /** Rótulo do eixo X (ex.: "03/07", "Jul", "Sem 28"). */
  label: string;
  /** Valor medido naquele ponto no tempo. */
  value: number;
}

interface TimeSeriesAreaChartProps {
  data: TimeSeriesPoint[];
  minHeight?: number;
  /** Cor da linha/área. Default: token primário. */
  color?: string;
  /** Nome da métrica exibido no tooltip (ex.: "eventos", "horas", "%"). */
  valueName?: string;
  /** Formata o valor no tooltip e no eixo Y. */
  formatValue?: (value: number) => string;
  emptyMessage?: string;
  className?: string;
}

/**
 * Gráfico de área para SÉRIE TEMPORAL (uma métrica ao longo do tempo).
 *
 * Recebe pontos já agregados `{ label, value }` ordenados no tempo e desenha
 * uma área com linha, grid horizontal e tooltip. Segue o padrão de charts do
 * app (recharts + SafeResponsiveContainer + tokens de cor). Cada instância usa
 * um gradiente com id único (useId) para não colidir quando há vários gráficos
 * na mesma página.
 */
export function TimeSeriesAreaChart({
  data,
  minHeight = 220,
  color = "hsl(var(--primary))",
  valueName = "valor",
  formatValue,
  emptyMessage = "Sem dados no período.",
  className,
}: TimeSeriesAreaChartProps) {
  const gradientId = `ts-area-${useId().replace(/:/g, "")}`;

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <SafeResponsiveContainer minHeight={minHeight} className={className}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11 }}
          stroke="hsl(var(--muted-foreground))"
          interval="preserveStartEnd"
          minTickGap={24}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          stroke="hsl(var(--muted-foreground))"
          allowDecimals={false}
          width={40}
          tickFormatter={formatValue}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelFormatter={(label) => String(label)}
          formatter={(value: number) => [formatValue ? formatValue(value) : value, valueName]}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
        />
      </AreaChart>
    </SafeResponsiveContainer>
  );
}
