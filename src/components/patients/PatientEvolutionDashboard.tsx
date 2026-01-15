import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Calendar, TrendingDown, TrendingUp, Clock, Target } from "lucide-react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SessionRecord {
  id: string;
  date: string;
  painLevel: number;
  mobilityScore: number;
  observations: string;
  therapist: string;
  duration: number;
}

interface PatientEvolutionDashboardProps {
  patientId: string;
  patientName: string;
  sessions: SessionRecord[];
  currentPainLevel: number;
  initialPainLevel: number;
  totalSessions: number;
  prescribedSessions?: number;
  averageImprovement: number;
}

export const PatientEvolutionDashboard = ({
  patientName,
  sessions,
  currentPainLevel,
  initialPainLevel,
  totalSessions,
  prescribedSessions,
  averageImprovement,
}: PatientEvolutionDashboardProps) => {
  // Preparar dados para gráficos
  const chartData = sessions.map((session) => ({
    date: format(new Date(session.date), "dd/MM", { locale: ptBR }),
    fullDate: format(new Date(session.date), "dd/MM/yyyy", { locale: ptBR }),
    dor: session.painLevel,
    mobilidade: session.mobilityScore,
  }));

  const painReduction = initialPainLevel - currentPainLevel;
  const improvementPercentage = initialPainLevel > 0
    ? ((painReduction / initialPainLevel) * 100).toFixed(1)
    : 0;

  const stats = [
    {
      label: "Sessões Realizadas",
      value: prescribedSessions && prescribedSessions > 0
        ? `${totalSessions} / ${prescribedSessions}`
        : totalSessions,
      icon: Calendar,
      color: "text-blue-600",
      bg: "bg-blue-500/10",
    },
    {
      label: "Dor Atual",
      value: currentPainLevel,
      subtitle: "de 10",
      icon: Activity,
      color: currentPainLevel > 5 ? "text-red-600" : currentPainLevel > 3 ? "text-yellow-600" : "text-green-600",
      bg: currentPainLevel > 5 ? "bg-red-500/10" : currentPainLevel > 3 ? "bg-yellow-500/10" : "bg-green-500/10",
    },
    {
      label: "Redução da Dor",
      value: `${improvementPercentage}%`,
      icon: painReduction > 0 ? TrendingDown : TrendingUp,
      color: painReduction > 0 ? "text-green-600" : "text-red-600",
      bg: painReduction > 0 ? "bg-green-500/10" : "bg-red-500/10",
    },
    {
      label: "Melhora Média",
      value: `${averageImprovement.toFixed(1)}%`,
      subtitle: "por sessão",
      icon: Target,
      color: "text-purple-600",
      bg: "bg-purple-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Evolução do Paciente</h2>
          <p className="text-muted-foreground">{patientName}</p>
        </div>
        <Badge variant={currentPainLevel <= 3 ? "default" : "destructive"} className="text-sm">
          {currentPainLevel <= 3 ? "Boa Evolução" : currentPainLevel <= 6 ? "Progresso Moderado" : "Necessita Atenção"}
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <div className="flex items-baseline gap-1">
                      <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                      {stat.subtitle && (
                        <span className="text-sm text-muted-foreground">{stat.subtitle}</span>
                      )}
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bg}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <Tabs defaultValue="pain" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pain">Evolução da Dor</TabsTrigger>
          <TabsTrigger value="mobility">Mobilidade</TabsTrigger>
        </TabsList>

        <TabsContent value="pain">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Nível de Dor por Sessão</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorDor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    domain={[0, 10]}
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelFormatter={(label) => {
                      const item = chartData.find(d => d.date === label);
                      return item?.fullDate || label;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="dor"
                    stroke="#ef4444"
                    strokeWidth={2}
                    fill="url(#colorDor)"
                    name="Nível de Dor"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mobility">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Score de Mobilidade</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelFormatter={(label) => {
                      const item = chartData.find(d => d.date === label);
                      return item?.fullDate || label;
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="mobilidade"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 4 }}
                    name="Mobilidade (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Timeline de Sessões */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timeline de Sessões
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sessions.slice(0, 5).reverse().map((session, index) => (
              <div
                key={session.id}
                className="flex gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">
                      {sessions.length - index}
                    </span>
                  </div>
                  {index < 4 && <div className="w-px h-full bg-border mt-2" />}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">
                      {format(new Date(session.date), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                    <div className="flex gap-2">
                      <Badge variant="outline">Dor: {session.painLevel}/10</Badge>
                      <Badge variant="outline">Mobilidade: {session.mobilityScore}%</Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {session.observations || "Sem observações"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Terapeuta: {session.therapist} • Duração: {session.duration}min
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
