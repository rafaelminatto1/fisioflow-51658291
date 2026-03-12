import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/api/v2/insights';
import { Loader2 } from 'lucide-react';

export function ActivityChart() {
  const { data: activityData, isLoading } = useQuery({
    queryKey: ['weekly-activity'],
    queryFn: async () => {
      const res = await analyticsApi.innovations.getWeeklyActivity();
      return res.data;
    }
  });

  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-foreground">Atividades da Semana</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full bg-white dark:bg-gray-800 rounded-lg" style={{ height: '300px' }}>
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData || []}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="day" 
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
                <Bar 
                  dataKey="consultas" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                  name="Consultas"
                />
                <Bar 
                  dataKey="exercicios" 
                  fill="hsl(var(--secondary))" 
                  radius={[4, 4, 0, 0]}
                  name="Exercícios"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}