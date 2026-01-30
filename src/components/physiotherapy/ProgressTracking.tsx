import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Activity, Target, Calendar } from 'lucide-react';

export const ProgressTracking = () => {
  // Mock data para demonstração
  const painData = [
    { date: '01/03', nivel: 8 },
    { date: '08/03', nivel: 7 },
    { date: '15/03', nivel: 5 },
    { date: '22/03', nivel: 4 },
    { date: '29/03', nivel: 3 },
  ];

  const flexibilityData = [
    { exercicio: 'Flexão', inicial: 60, atual: 85 },
    { exercicio: 'Extensão', inicial: 45, atual: 70 },
    { exercicio: 'Rotação', inicial: 50, atual: 75 },
    { exercicio: 'Lateral', inicial: 55, atual: 80 },
  ];

  const sessionStats = [
    { label: 'Total de Sessões', value: '12', icon: Calendar },
    { label: 'Sessões Restantes', value: '8', icon: Target },
    { label: 'Frequência Semanal', value: '2x', icon: Activity },
    { label: 'Progresso Geral', value: '65%', icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {sessionStats.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <IconComponent className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Evolução da Dor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={painData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 10]} />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="nivel" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                name="Nível de Dor"
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-800">Melhora de 62%</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Escala: 0 (sem dor) - 10 (dor máxima)
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Amplitude de Movimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={flexibilityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="exercicio" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="inicial" fill="hsl(var(--muted))" name="Inicial" />
              <Bar dataKey="atual" fill="hsl(var(--primary))" name="Atual" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4">
            <Badge className="bg-blue-100 text-blue-800">Melhora média de 42% na amplitude</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Observações de Progresso</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold">22/03/2024</p>
                <Badge className="bg-green-100 text-green-800">Positivo</Badge>
              </div>
              <p className="text-sm">
                Paciente apresenta melhora significativa na amplitude de movimento. 
                Redução da dor durante exercícios.
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold">15/03/2024</p>
                <Badge className="bg-blue-100 text-blue-800">Progresso</Badge>
              </div>
              <p className="text-sm">
                Boa adesão aos exercícios domiciliares. Força muscular em evolução.
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold">08/03/2024</p>
                <Badge className="bg-yellow-100 text-yellow-800">Atenção</Badge>
              </div>
              <p className="text-sm">
                Paciente relatou dificuldade em realizar alguns exercícios. 
                Ajustada intensidade do treino.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
