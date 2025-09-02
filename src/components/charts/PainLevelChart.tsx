import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface PainLevelChartProps {
  data: Array<{
    date: string;
    painLevel: number;
  }>;
  patientName?: string;
}

export function PainLevelChart({ data, patientName }: PainLevelChartProps) {
  const latestPain = data[data.length - 1]?.painLevel || 0;
  const averagePain = data.length > 0 ? 
    Math.round(data.reduce((sum, item) => sum + item.painLevel, 0) / data.length) : 0;

  const getPainLevelColor = (level: number) => {
    if (level <= 3) return 'text-green-600 bg-green-100';
    if (level <= 6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getPainDescription = (level: number) => {
    if (level <= 3) return 'Dor Leve';
    if (level <= 6) return 'Dor Moderada';
    return 'Dor Intensa';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Evolução da Dor
          {patientName && (
            <span className="text-sm font-normal text-muted-foreground">
              {patientName}
            </span>
          )}
        </CardTitle>
        <CardDescription>
          Monitoramento do nível de dor do paciente (escala 0-10)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Nenhum registro de dor disponível
          </div>
        ) : (
          <>
            {/* Pain Level Summary */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-4 border rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {latestPain <= 6 ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  )}
                  <span className="text-sm font-medium">Nível Atual</span>
                </div>
                <div className={`inline-flex items-center px-3 py-1 rounded-full ${getPainLevelColor(latestPain)}`}>
                  <span className="text-lg font-bold">{latestPain}/10</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {getPainDescription(latestPain)}
                </p>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-sm font-medium">Média do Período</span>
                </div>
                <div className={`inline-flex items-center px-3 py-1 rounded-full ${getPainLevelColor(averagePain)}`}>
                  <span className="text-lg font-bold">{averagePain}/10</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.length} registros
                </p>
              </div>
            </div>

            {/* Pain Level Chart */}
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="painGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  className="text-muted-foreground"
                />
                <YAxis 
                  domain={[0, 10]}
                  axisLine={false}
                  tickLine={false}
                  className="text-muted-foreground"
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }}
                  formatter={(value: number) => [`${value}/10`, 'Nível de Dor']}
                />
                <Area 
                  type="monotone" 
                  dataKey="painLevel" 
                  stroke="hsl(var(--destructive))" 
                  strokeWidth={2}
                  fill="url(#painGradient)"
                  dot={{ fill: 'hsl(var(--destructive))', strokeWidth: 2, r: 4 }}
                />
                {/* Reference lines */}
                <Area 
                  type="monotone" 
                  dataKey={() => 3} 
                  stroke="hsl(var(--green-500))" 
                  strokeWidth={1}
                  strokeDasharray="5,5"
                  fill="none"
                  dot={false}
                />
                <Area 
                  type="monotone" 
                  dataKey={() => 6} 
                  stroke="hsl(var(--yellow-500))" 
                  strokeWidth={1}
                  strokeDasharray="5,5"
                  fill="none"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>

            {/* Pain Scale Reference */}
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Escala de Dor:</h4>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>0-3: Leve</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span>4-6: Moderada</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>7-10: Intensa</span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}