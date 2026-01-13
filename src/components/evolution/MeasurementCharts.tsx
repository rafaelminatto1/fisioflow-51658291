import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, BarChart3, LineChart as LineChartIcon } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

interface MeasurementChartsProps {
  measurementsByType: Record<string, Array<{
    date: string;
    value: number;
    fullDate: string;
  }>>;
}

export const MeasurementCharts: React.FC<MeasurementChartsProps> = ({ measurementsByType }) => {
  const measurementTypes = Object.keys(measurementsByType);
  const [selectedMeasurement, setSelectedMeasurement] = useState(measurementTypes[0] || '');
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area'>('line');

  if (measurementTypes.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhuma medição registrada ainda</p>
            <p className="text-sm mt-1">Adicione medições para visualizar gráficos</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentData = measurementsByType[selectedMeasurement] || [];

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { date: string; value: number }; value: number }> }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="text-sm font-semibold">{payload[0].payload.date}</p>
          <p className="text-sm text-primary">
            Valor: <strong>{payload[0].value}</strong>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-gradient-to-r from-purple-50/50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/20">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            Evolução das Medições
          </CardTitle>
          <div className="flex items-center gap-3">
            <Select value={selectedMeasurement} onValueChange={setSelectedMeasurement}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Selecione a medição" />
              </SelectTrigger>
              <SelectContent>
                {measurementTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <Tabs value={chartType} onValueChange={(v) => setChartType(v as 'line' | 'bar' | 'area')}>
          <TabsList className="mb-4">
            <TabsTrigger value="line" className="flex items-center gap-2">
              <LineChartIcon className="h-4 w-4" />
              Linha
            </TabsTrigger>
            <TabsTrigger value="bar" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Barras
            </TabsTrigger>
            <TabsTrigger value="area" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Área
            </TabsTrigger>
          </TabsList>

          <TabsContent value="line" className="mt-0">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={currentData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="value"
                  name="Valor"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--primary))', r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="bar" className="mt-0">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={currentData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="value"
                  name="Valor"
                  fill="hsl(var(--primary))"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="area" className="mt-0">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={currentData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="value"
                  name="Valor"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary) / 0.2)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>

        {/* Statistics Summary */}
        {currentData.length > 0 && (
          <div className="mt-6 pt-4 border-t grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {currentData[currentData.length - 1]?.value || 0}
              </div>
              <div className="text-xs text-muted-foreground">Último valor</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {Math.max(...currentData.map(d => d.value))}
              </div>
              <div className="text-xs text-muted-foreground">Máximo</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {(currentData.reduce((sum, d) => sum + d.value, 0) / currentData.length).toFixed(1)}
              </div>
              <div className="text-xs text-muted-foreground">Média</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
