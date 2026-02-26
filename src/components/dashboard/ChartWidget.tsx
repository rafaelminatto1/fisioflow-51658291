import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { TrendingUp, Filter } from 'lucide-react';
import { useState } from 'react';

type ChartType = 'line' | 'bar' | 'pie';
type TimePeriod = 'week' | 'month' | '3months' | '6months' | 'year';

interface ChartDataPoint {
  name: string;
  value: number;
  label?: string;
  color?: string;
}

interface ChartWidgetProps {
  title: string;
  data: ChartDataPoint[];
  type?: ChartType;
  loading?: boolean;
  showFilters?: boolean;
  defaultPeriod?: TimePeriod;
  onPeriodChange?: (period: TimePeriod) => void;
  height?: number;
  colors?: string[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#8884d8', '#82ca9d', '#ffc658'];

const PERIOD_OPTIONS: { value: TimePeriod; label: string }[] = [
  { value: 'week', label: '7 dias' },
  { value: 'month', label: '30 dias' },
  { value: '3months', label: '3 meses' },
  { value: '6months', label: '6 meses' },
  { value: 'year', label: '1 ano' },
];

export function ChartWidget({
  title,
  data,
  type = 'line',
  loading = false,
  showFilters = false,
  defaultPeriod = 'month',
  onPeriodChange,
  height = 300,
  colors = COLORS
}: ChartWidgetProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>(defaultPeriod);

  const handlePeriodChange = (period: TimePeriod) => {
    setSelectedPeriod(period);
    onPeriodChange?.(period);
  };

  interface TooltipPayload {
    name: string;
    value: number;
    color: string;
  }

  interface CustomTooltipProps {
    active?: boolean;
    payload?: TooltipPayload[];
    label?: string;
  }

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground">{label}</p>
          {payload.map((entry: TooltipPayload, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <div className="text-center">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum dado disponível</p>
          </div>
        </div>
      );
    }

    switch (type) {
      case 'bar':
        return (
          <div className="w-full bg-white dark:bg-gray-800 rounded-lg" style={{ height: `${height}px` }}>
            <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="value"
                fill={colors[0]}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </div>
        );

      case 'pie':
        return (
          <div className="w-full bg-white dark:bg-gray-800 rounded-lg" style={{ height: `${height}px` }}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </div>
        );

      case 'line':
      default:
        return (
          <div className="w-full bg-white dark:bg-gray-800 rounded-lg" style={{ height: `${height}px` }}>
            <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} />
            </LineChart>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-muted rounded">
            <div className="animate-pulse">
              <div className="h-[300px] bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-2xl overflow-hidden p-6 shadow-premium-md border-none group">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-gray-900 dark:text-white font-black tracking-tight text-xl">{title}</h3>
        <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Visão Geral de Desempenho</p>
        {showFilters && (
          <div className="flex items-center gap-3">
            <div className="flex bg-gray-100 dark:bg-gray-700/50 p-1 rounded-xl inner-border">
              {PERIOD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-tighter rounded-lg transition-all ${selectedPeriod === option.value
                    ? "bg-white dark:bg-gray-600 text-blue-600 shadow-premium-sm"
                    : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => handlePeriodChange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <Filter className="w-4 h-4" />
          </div>
        )}
      </div>
      <div className="mt-4">
        {renderChart()}
      </div>
    </div>
  );
}
