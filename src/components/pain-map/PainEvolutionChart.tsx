import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Dot
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PainEvolutionChartProps {
  evolutionData: Array<{
    id: string;
    date: string;
    view: string;
    averageIntensity: number;
    pointCount: number;
  }>;
  className?: string;
  showStats?: boolean;
}

// Função para obter cor baseada na intensidade
const getIntensityColor = (intensity: number): string => {
  if (intensity <= 2) return '#22c55e';
  if (intensity <= 4) return '#eab308';
  if (intensity <= 6) return '#f97316';
  if (intensity <= 8) return '#ef4444';
  return '#7f1d1d';
};

// Componente customizado para tooltip
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const intensity = data.intensity;
    const color = getIntensityColor(intensity);
    
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium mb-1">
          {data.dateFormatted}
        </p>
        <p className="text-xs text-muted-foreground mb-2">
          {data.pointCount} {data.pointCount === 1 ? 'ponto' : 'pontos'}
        </p>
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: color }}
          />
          <span className="text-sm font-bold" style={{ color }}>
            {intensity.toFixed(1)}/10
          </span>
        </div>
      </div>
    );
  }
  return null;
};

// Componente customizado para dots no gráfico
const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  const color = getIntensityColor(payload.intensity);
  
  return (
    <Dot 
      cx={cx} 
      cy={cy} 
      r={5} 
      fill={color}
      stroke="#fff"
      strokeWidth={2}
    />
  );
};

export function PainEvolutionChart({ 
  evolutionData, 
  className,
  showStats = true 
}: PainEvolutionChartProps) {
  // Processar dados para o gráfico
  const chartData = useMemo(() => {
    if (!evolutionData || evolutionData.length === 0) return [];
    
    return evolutionData.map((item, index) => ({
      date: item.date,
      dateFormatted: format(new Date(item.date), 'dd/MM', { locale: ptBR }),
      monthShort: format(new Date(item.date), 'MMM', { locale: ptBR }),
      intensity: item.averageIntensity,
      pointCount: item.pointCount,
      index,
    }));
  }, [evolutionData]);

  // Calcular estatísticas de evolução
  const stats = useMemo(() => {
    if (chartData.length < 2) return null;
    
    const first = chartData[0];
    const last = chartData[chartData.length - 1];
    
    const improvement = first.intensity - last.intensity;
    const improvementPercent = first.intensity > 0 
      ? Math.round((improvement / first.intensity) * 100)
      : 0;
    
    const trend = improvement > 0 ? 'improving' 
      : improvement < 0 ? 'worsening' 
      : 'stable';
    
    return {
      improvement,
      improvementPercent: Math.abs(improvementPercent),
      trend,
      firstIntensity: first.intensity,
      lastIntensity: last.intensity,
    };
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <Card className={cn('p-6', className)}>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Evolução do Escore</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-24 w-full flex items-center justify-center text-muted-foreground text-sm">
            Sem dados de evolução disponíveis
          </div>
        </CardContent>
      </Card>
    );
  }

  const lastIntensity = chartData[chartData.length - 1]?.intensity || 0;
  const lastColor = getIntensityColor(lastIntensity);

  return (
    <Card className={cn('p-4 sm:p-6 bg-muted/30', className)}>
      <div className="flex justify-between items-center mb-4">
        <CardTitle className="text-xs font-semibold text-muted-foreground">
          Evolução do Escore
        </CardTitle>
        {showStats && stats && (
          <Badge 
            variant="outline" 
            className={cn(
              'text-[10px] flex items-center gap-1',
              stats.trend === 'improving' && 'text-green-500 border-green-500',
              stats.trend === 'worsening' && 'text-red-500 border-red-500',
              stats.trend === 'stable' && 'text-muted-foreground'
            )}
          >
            {stats.trend === 'improving' && <ArrowDown className="w-3 h-3" />}
            {stats.trend === 'worsening' && <ArrowUp className="w-3 h-3" />}
            {stats.trend === 'stable' && <Minus className="w-3 h-3" />}
            {stats.improvementPercent > 0 && `${stats.improvementPercent}%`}
            {stats.trend === 'stable' && 'Estável'}
          </Badge>
        )}
      </div>
      
      <div className="relative h-24 w-full border-l border-b border-border/50">
        {/* Background gradient */}
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            background: `linear-gradient(to bottom, 
              rgba(239, 68, 68, 0.1) 0%, 
              rgba(234, 179, 8, 0.1) 50%, 
              rgba(34, 197, 94, 0.1) 100%)`
          }}
        />
        
        {/* Grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between opacity-20 pointer-events-none">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-full h-px bg-muted-foreground border-t border-dashed" />
          ))}
        </div>
        
        {/* Chart */}
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="0" stroke="transparent" />
            <XAxis 
              dataKey="monthShort"
              tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="intensity"
              stroke={lastColor}
              strokeWidth={2}
              dot={<CustomDot />}
              activeDot={{ r: 6, stroke: lastColor, strokeWidth: 2 }}
              isAnimationActive={true}
              animationDuration={800}
            />
          </LineChart>
        </ResponsiveContainer>
        
        {/* Month labels at bottom */}
        <div className="absolute -bottom-4 left-0 right-0 flex justify-between text-[8px] text-muted-foreground font-mono px-1">
          {chartData
            .filter((_, i) => i === 0 || i === Math.floor(chartData.length / 2) || i === chartData.length - 1)
            .map((item) => (
              <span key={item.index}>{item.monthShort}</span>
            ))}
        </div>
      </div>
    </Card>
  );
}

