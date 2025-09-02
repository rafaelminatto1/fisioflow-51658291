import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingDown, TrendingUp } from 'lucide-react';

interface ProgressChartProps {
  data: Array<{
    date: string;
    painLevel: number;
    functionalScore: number;
    exerciseCompliance: number;
  }>;
  patientName?: string;
}

export function ProgressChart({ data, patientName }: ProgressChartProps) {
  const latestData = data[data.length - 1];
  const previousData = data[data.length - 2];
  
  const painTrend = latestData && previousData ? 
    latestData.painLevel - previousData.painLevel : 0;
  
  const functionalTrend = latestData && previousData ? 
    latestData.functionalScore - previousData.functionalScore : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Evolução do Progresso
          {patientName && (
            <span className="text-sm font-normal text-muted-foreground">
              {patientName}
            </span>
          )}
        </CardTitle>
        <CardDescription>
          Acompanhamento da evolução do paciente ao longo do tempo
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Nenhum dado de progresso disponível
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <span className="text-sm font-medium">Nível de Dor</span>
                  {painTrend !== 0 && (
                    painTrend < 0 ? 
                      <TrendingDown className="w-4 h-4 text-green-600" /> :
                      <TrendingUp className="w-4 h-4 text-red-600" />
                  )}
                </div>
                <p className="text-2xl font-bold text-red-600">
                  {latestData?.painLevel || 0}/10
                </p>
                {painTrend !== 0 && (
                  <p className="text-xs text-muted-foreground">
                    {painTrend > 0 ? '+' : ''}{painTrend} vs anterior
                  </p>
                )}
              </div>
              
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <span className="text-sm font-medium">Score Funcional</span>
                  {functionalTrend !== 0 && (
                    functionalTrend > 0 ? 
                      <TrendingUp className="w-4 h-4 text-green-600" /> :
                      <TrendingDown className="w-4 h-4 text-red-600" />
                  )}
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {latestData?.functionalScore || 0}%
                </p>
                {functionalTrend !== 0 && (
                  <p className="text-xs text-muted-foreground">
                    {functionalTrend > 0 ? '+' : ''}{functionalTrend}% vs anterior
                  </p>
                )}
              </div>
              
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <span className="text-sm font-medium block mb-1">Aderência</span>
                <p className="text-2xl font-bold text-green-600">
                  {latestData?.exerciseCompliance || 0}%
                </p>
              </div>
            </div>

            {/* Chart */}
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  className="text-muted-foreground"
                />
                <YAxis 
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
                />
                <Line 
                  type="monotone" 
                  dataKey="painLevel" 
                  stroke="hsl(var(--destructive))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--destructive))', strokeWidth: 2 }}
                  name="Nível de Dor"
                />
                <Line 
                  type="monotone" 
                  dataKey="functionalScore" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                  name="Score Funcional"
                />
                <Line 
                  type="monotone" 
                  dataKey="exerciseCompliance" 
                  stroke="hsl(var(--secondary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--secondary))', strokeWidth: 2 }}
                  name="Aderência aos Exercícios"
                />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
}