import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { PainEvolutionData } from '@/types/painMap';

interface PainEvolutionChartProps {
  data: PainEvolutionData[];
  chartType?: 'line' | 'area' | 'bar';
}

export function PainEvolutionChart({ data, chartType = 'line' }: PainEvolutionChartProps) {
  const chartData = data.map(d => ({
    date: new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    'Nível de Dor': d.globalPainLevel,
    'Regiões Afetadas': d.regionCount
  }));

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 10, right: 30, left: 0, bottom: 0 }
    };

    switch (chartType) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="colorPain" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorRegions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }} 
            />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="Nível de Dor" 
              stroke="hsl(var(--destructive))" 
              fillOpacity={1} 
              fill="url(#colorPain)" 
            />
            <Area 
              type="monotone" 
              dataKey="Regiões Afetadas" 
              stroke="hsl(var(--primary))" 
              fillOpacity={1} 
              fill="url(#colorRegions)" 
            />
          </AreaChart>
        );
      
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }} 
            />
            <Legend />
            <Bar dataKey="Nível de Dor" fill="hsl(var(--destructive))" />
            <Bar dataKey="Regiões Afetadas" fill="hsl(var(--primary))" />
          </BarChart>
        );
      
      default: // line
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }} 
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="Nível de Dor" 
              stroke="hsl(var(--destructive))" 
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--destructive))', r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="Regiões Afetadas" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))', r: 4 }}
            />
          </LineChart>
        );
    }
  };

  return (
    <Card className="p-6">
      <Label className="mb-4 block">Evolução da Dor</Label>
      <ResponsiveContainer width="100%" height={300}>
        {renderChart()}
      </ResponsiveContainer>
    </Card>
  );
}
