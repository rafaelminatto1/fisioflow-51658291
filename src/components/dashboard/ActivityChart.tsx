import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { day: 'Seg', consultas: 8, exercicios: 15 },
  { day: 'Ter', consultas: 12, exercicios: 22 },
  { day: 'Qua', consultas: 10, exercicios: 18 },
  { day: 'Qui', consultas: 14, exercicios: 25 },
  { day: 'Sex', consultas: 16, exercicios: 28 },
  { day: 'Sáb', consultas: 6, exercicios: 12 },
  { day: 'Dom', consultas: 4, exercicios: 8 },
];

export function ActivityChart() {
  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="text-foreground">Atividades da Semana</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
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
      </CardContent>
    </Card>
  );
}