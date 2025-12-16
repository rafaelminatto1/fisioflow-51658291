import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Calendar, 
  FileText, 
  Activity, 
  Trophy, 
  Clock, 
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  Play,
  Star,
  TrendingUp,
  Heart,
  Dumbbell,
  MessageCircle,
  Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PatientGamification } from '@/components/gamification/PatientGamification';

const PatientPortal = () => {
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data - seria substituído por dados reais do paciente logado
  const patientData = {
    name: 'Maria Silva',
    avatar: '',
    nextAppointment: {
      date: '18/12/2024',
      time: '14:00',
      therapist: 'Dr. João Santos',
      type: 'Fisioterapia'
    },
    sessionsRemaining: 5,
    totalSessions: 10,
    treatmentProgress: 65,
    exercises: [
      { id: 1, name: 'Alongamento Cervical', completed: true, videoUrl: '#' },
      { id: 2, name: 'Fortalecimento Lombar', completed: true, videoUrl: '#' },
      { id: 3, name: 'Mobilidade de Ombro', completed: false, videoUrl: '#' },
      { id: 4, name: 'Exercício Respiratório', completed: false, videoUrl: '#' },
    ],
    documents: [
      { id: 1, name: 'Avaliação Inicial', date: '01/12/2024', type: 'avaliacao' },
      { id: 2, name: 'Atestado Médico', date: '10/12/2024', type: 'atestado' },
      { id: 3, name: 'Plano de Tratamento', date: '05/12/2024', type: 'plano' },
    ],
    notifications: [
      { id: 1, title: 'Lembrete de Consulta', message: 'Sua consulta é amanhã às 14:00', time: '2h atrás', read: false },
      { id: 2, title: 'Exercícios Pendentes', message: 'Complete seus exercícios diários', time: '5h atrás', read: true },
    ]
  };

  const completedExercises = patientData.exercises.filter(e => e.completed).length;
  const exerciseProgress = (completedExercises / patientData.exercises.length) * 100;

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
        {/* Header do Portal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-4 border-primary/30">
              <AvatarImage src={patientData.avatar} />
              <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold">
                {patientData.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                Olá, {patientData.name.split(' ')[0]}! 👋
              </h1>
              <p className="text-muted-foreground">
                Bem-vindo ao seu portal de saúde
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="relative">
              <Bell className="h-4 w-4" />
              {patientData.notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                  {patientData.notifications.filter(n => !n.read).length}
                </span>
              )}
            </Button>
            <Button variant="outline" size="sm">
              <MessageCircle className="h-4 w-4 mr-2" />
              Chat
            </Button>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Próxima Consulta</p>
                  <p className="text-lg font-bold">{patientData.nextAppointment.date}</p>
                  <p className="text-xs text-muted-foreground">{patientData.nextAppointment.time}</p>
                </div>
                <Calendar className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sessões Restantes</p>
                  <p className="text-lg font-bold">{patientData.sessionsRemaining}/{patientData.totalSessions}</p>
                  <Progress value={(patientData.sessionsRemaining / patientData.totalSessions) * 100} className="h-1 mt-1" />
                </div>
                <Heart className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Progresso Tratamento</p>
                  <p className="text-lg font-bold">{patientData.treatmentProgress}%</p>
                  <Progress value={patientData.treatmentProgress} className="h-1 mt-1" />
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Exercícios Hoje</p>
                  <p className="text-lg font-bold">{completedExercises}/{patientData.exercises.length}</p>
                  <Progress value={exerciseProgress} className="h-1 mt-1" />
                </div>
                <Dumbbell className="h-8 w-8 text-orange-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs de Conteúdo */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full max-w-lg">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Visão Geral</span>
            </TabsTrigger>
            <TabsTrigger value="exercises" className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4" />
              <span className="hidden sm:inline">Exercícios</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Documentos</span>
            </TabsTrigger>
            <TabsTrigger value="gamification" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              <span className="hidden sm:inline">Conquistas</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab Visão Geral */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Próxima Consulta */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Próxima Consulta
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                      <div className="flex items-center justify-between mb-3">
                        <Badge className="bg-primary">{patientData.nextAppointment.type}</Badge>
                        <span className="text-sm font-medium">{patientData.nextAppointment.date}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">{patientData.nextAppointment.time}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">JS</AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-muted-foreground">{patientData.nextAppointment.therapist}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        Reagendar
                      </Button>
                      <Button size="sm" className="flex-1">
                        Confirmar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notificações */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    Notificações
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {patientData.notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={cn(
                          "p-3 rounded-lg border transition-colors",
                          notification.read ? "bg-muted/30" : "bg-primary/5 border-primary/20"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">{notification.title}</p>
                            <p className="text-xs text-muted-foreground">{notification.message}</p>
                          </div>
                          {!notification.read && (
                            <span className="h-2 w-2 bg-primary rounded-full" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{notification.time}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab Exercícios */}
          <TabsContent value="exercises" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Dumbbell className="h-5 w-5 text-primary" />
                  Exercícios do Dia
                </CardTitle>
                <CardDescription>
                  Complete seus exercícios para ganhar pontos e manter sua sequência
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {patientData.exercises.map((exercise) => (
                    <div
                      key={exercise.id}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-lg border transition-all",
                        exercise.completed 
                          ? "bg-green-500/10 border-green-500/30" 
                          : "bg-muted/30 hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {exercise.completed ? (
                          <CheckCircle2 className="h-6 w-6 text-green-500" />
                        ) : (
                          <div className="h-6 w-6 rounded-full border-2 border-muted-foreground" />
                        )}
                        <div>
                          <p className={cn(
                            "font-medium",
                            exercise.completed && "line-through text-muted-foreground"
                          )}>
                            {exercise.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {exercise.completed ? 'Concluído! +50 XP' : '50 XP ao completar'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Play className="h-4 w-4 mr-1" />
                          Vídeo
                        </Button>
                        {!exercise.completed && (
                          <Button size="sm">
                            Concluir
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Documentos */}
          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Meus Documentos
                </CardTitle>
                <CardDescription>
                  Acesse seus documentos, atestados e relatórios
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {patientData.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">{doc.date}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        Baixar
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Gamificação */}
          <TabsContent value="gamification">
            <PatientGamification patientId="mock-patient-id" />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default PatientPortal;
