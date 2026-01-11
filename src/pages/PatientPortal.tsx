import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Calendar,
  Activity,
  Clock,
  AlertCircle,
  Play,
  TrendingUp,
  Heart,
  Dumbbell,
  MessageCircle,
  Bell,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PatientGamification } from '@/components/gamification/PatientGamification';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PatientService } from '@/lib/services/PatientService';
import { useAppointments } from '@/hooks/useAppointments';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PainMapRegistration } from '@/components/patient/PainMapRegistration';
import { PatientHelpers } from '@/types';
import { ExercisePlayer } from '@/components/patient/ExercisePlayer';

const PatientPortal = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [showPainReg, setShowPainReg] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);

  // Fetch patient data linked to the profile
  const { data: patient, isLoading: isLoadingPatient } = useQuery({
    queryKey: ['patient-profile', user?.id],
    queryFn: () => PatientService.getPatientByProfileId(user!.id),
    enabled: !!user?.id
  });

  // Fetch prescriptions
  const { data: prescriptions, isLoading: isLoadingPrescriptions } = useQuery({
    queryKey: ['prescribed-exercises', patient?.id],
    queryFn: () => PatientService.getPrescribedExercises(patient!.id),
    enabled: !!patient?.id
  });

  // Fetch appointments (using existing hook)
  const { data: allAppointments } = useAppointments();

  // Filter appointments for this patient
  const patientAppointments = useMemo(() => {
    if (!patient?.id || !allAppointments) return [];
    return allAppointments
      .filter(apt => apt.patientId === patient.id)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [patient?.id, allAppointments]);

  const nextAppointment = patientAppointments.find(apt => apt.date >= new Date());

  // Fetch pain records
  const { data: painRecords } = useQuery({
    queryKey: ['pain-records', patient?.id],
    queryFn: () => PatientService.getPainRecords(patient!.id),
    enabled: !!patient?.id
  });

  if (isLoadingPatient) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center space-y-4">
            <Activity className="h-12 w-12 text-primary animate-pulse mx-auto" />
            <p className="text-muted-foreground animate-pulse">Carregando seu portal...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!patient) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Card className="max-w-md text-center">
            <CardHeader>
              <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
              <CardTitle>Portal não disponível</CardTitle>
              <CardDescription>
                Seu perfil ainda não está vinculado a um registro de paciente.
                Entre em contato com sua clínica.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => window.location.reload()}>Tentar Novamente</Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const completedTodayCount = prescriptions?.filter(() => false).length || 0; // Mock until exercise_logs check is added
  const exerciseProgress = prescriptions?.length ? (completedTodayCount / prescriptions.length) * 100 : 0;

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
        {/* Header do Portal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-4 border-primary/30">
              <AvatarImage src={profile?.avatar_url || ''} />
              <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold">
                {(() => {
                  const name = PatientHelpers.getName(patient);
                  return name.split(' ').map(n => n[0]).join('').substring(0, 2);
                })()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold italic tracking-tight text-primary">
                Olá, {PatientHelpers.getName(patient).split(' ')[0]}! 👋
              </h1>
              <p className="text-muted-foreground">
                Que bom ver você de novo. Como estamos hoje?
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">0</span>
            </Button>
            <Button variant="outline" size="sm" className="hidden sm:flex">
              <MessageCircle className="h-4 w-4 mr-2" />
              Chat
            </Button>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-primary bg-gradient-to-br from-white to-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Próxima Consulta</p>
                  <p className="text-lg font-bold">
                    {nextAppointment ? format(nextAppointment.date, "dd/MM", { locale: ptBR }) : '---'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {nextAppointment ? nextAppointment.time : 'Nenhum agendamento'}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-white to-green-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Status do Plano</p>
                  <p className="text-lg font-bold">{patient.status}</p>
                  <Progress value={patient.progress || 0} className="h-1 mt-1" />
                </div>
                <Heart className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-white to-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sua Intensidade</p>
                  <p className="text-lg font-bold">
                    {painRecords?.[0]?.pain_level ?? '---'}/10
                  </p>
                  <p className="text-xs text-muted-foreground">Último registro</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500 bg-gradient-to-br from-white to-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Exercícios Hoje</p>
                  <p className="text-lg font-bold">{completedTodayCount}/{prescriptions?.length || 0}</p>
                  <Progress value={exerciseProgress} className="h-1 mt-1" />
                </div>
                <Dumbbell className="h-8 w-8 text-orange-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs de Conteúdo */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="exercises">Exercícios</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
            <TabsTrigger value="gamification">Conquistas</TabsTrigger>
          </TabsList>

          {/* Tab Visão Geral */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Próxima Consulta */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Próxima Consulta
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {nextAppointment ? (
                      <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                        <div className="flex items-center justify-between mb-3">
                          <Badge className="bg-primary">{nextAppointment.type}</Badge>
                          <span className="text-sm font-medium">{format(nextAppointment.date, "dd 'de' MMMM", { locale: ptBR })}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Clock className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium">{nextAppointment.time}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-muted/20 rounded-lg border-2 border-dashed">
                        <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                        <p className="text-sm text-muted-foreground">Nenhuma consulta agendada</p>
                        <Button variant="link" size="sm" className="mt-2">Agendar agora</Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Registro de Dor Rápido */}
              <Card className="shadow-lg border-primary/20 bg-primary/5">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-primary" />
                      Como está hoje?
                    </CardTitle>
                    <CardDescription>Registre seu nível de conforto</CardDescription>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => setShowPainReg(!showPainReg)}>
                    <Plus className={cn("h-5 w-5 transition-transform", showPainReg && "rotate-45")} />
                  </Button>
                </CardHeader>
                <CardContent>
                  {showPainReg ? (
                    <PainMapRegistration
                      patientId={patient.id}
                      onSuccess={() => {
                        setShowPainReg(false);
                        queryClient.invalidateQueries({ queryKey: ['pain-records'] });
                      }}
                    />
                  ) : (
                    <div className="space-y-4">
                      {painRecords?.[0] ? (
                        <div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm">
                          <div className={cn(
                            "h-12 w-12 rounded-full flex items-center justify-center font-bold text-xl text-white",
                            painRecords[0].pain_level < 3 ? "bg-green-500" :
                              painRecords[0].pain_level < 7 ? "bg-orange-500" : "bg-red-500"
                          )}>
                            {painRecords[0].pain_level}
                          </div>
                          <div>
                            <p className="font-bold text-sm">Última dor sentida: {painRecords[0].body_part}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(painRecords[0].created_at!), "dd/MM 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-center text-muted-foreground py-4">Nenhum registro de dor ainda.</p>
                      )}
                      <Button className="w-full" variant="outline" onClick={() => setShowPainReg(true)}>
                        Novo Registro
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab Exercícios */}
          <TabsContent value="exercises" className="space-y-4">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Dumbbell className="h-5 w-5 text-primary" />
                  Prescrição Ativa
                </CardTitle>
                <CardDescription>
                  Exercícios selecionados especialmente para o seu caso
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingPrescriptions ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />)}
                  </div>
                ) : prescriptions?.length ? (
                  <div className="space-y-3">
                    {prescriptions.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover:shadow-md transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-primary/10 rounded-full text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                            <Play className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-bold">{p.exercise.name}</p>
                            <div className="flex gap-2 text-xs text-muted-foreground">
                              <span>{p.sets} séries</span>
                              <span>•</span>
                              <span>{p.reps} reps</span>
                            </div>
                          </div>
                        </div>
                        <Button size="sm" onClick={() => setSelectedPrescription(p)}>
                          Iniciar
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-10 text-center border-2 border-dashed rounded-lg bg-muted/10">
                    <Dumbbell className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-30" />
                    <p className="font-medium text-muted-foreground">Nenhum exercício prescrito</p>
                    <p className="text-sm text-muted-foreground">Aguarde a próxima consulta com seu fisioterapeuta.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Histórico (Pain Records + Exercises Logs) */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Dor</CardTitle>
              </CardHeader>
              <CardContent>
                {painRecords?.length ? (
                  <div className="space-y-2">
                    {painRecords.slice(0, 10).map((record) => (
                      <div key={record.id} className="flex items-center justify-between p-3 border-b last:border-0">
                        <div className="flex items-center gap-3">
                          <Badge variant={record.pain_level > 6 ? "destructive" : "secondary"}>
                            Nota {record.pain_level}
                          </Badge>
                          <div>
                            <p className="text-sm font-medium">{record.body_part}</p>
                            <p className="text-xs text-muted-foreground">{record.pain_type}</p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(record.created_at!), "dd/MM", { locale: ptBR })}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhum histórico disponível.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Gamificação */}
          <TabsContent value="gamification">
            <PatientGamification patientId={patient.id} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals/Overlays */}
      {selectedPrescription && (
        <ExercisePlayer
          prescription={selectedPrescription}
          patientId={patient.id}
          onClose={() => setSelectedPrescription(null)}
          onComplete={() => {
            queryClient.invalidateQueries({ queryKey: ['prescribed-exercises'] });
          }}
        />
      )}
    </MainLayout>
  );
};

export default PatientPortal;
