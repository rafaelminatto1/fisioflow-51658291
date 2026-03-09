// App móvel para pacientes - Versão simplificada

// Define interface for appointment data

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar, MessageSquare, Activity, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { appointmentsApi, patientsApi } from '@/lib/api/workers-client';
import { fisioLogger as logger } from '@/lib/errors/logger';

interface Appointment {
  id: string;
  start_time: string;
  status: string;
  therapists?: { name: string } | null;
}

export default function PatientApp() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadAppointments();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadAppointments() {
    try {
      setLoading(true);

      if (!user) return;
      const patientResponse = await patientsApi.getByProfile(user.uid);
      const patientId = patientResponse?.data?.id;

      if (!patientId) {
        setAppointments([]);
        return;
      }

      const appointmentsResponse = await appointmentsApi.list({
        patientId,
        dateFrom: new Date().toISOString(),
        limit: 50,
      });

      const nextAppointments = (appointmentsResponse?.data ?? [])
        .map((appointment) => ({
          id: appointment.id,
          start_time: appointment.start_time,
          status: appointment.status,
          therapists: { name: 'Fisioterapeuta' },
        } as Appointment))
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

      setAppointments(nextAppointments);
    } catch (error) {
      logger.error('Erro ao carregar agendamentos', error, 'PatientApp');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-md">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">FisioFlow</h1>
        <p className="text-muted-foreground">Portal do Paciente</p>
      </div>

      <Tabs defaultValue="appointments" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="appointments">
            <Calendar className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="exercises">
            <Activity className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="chat">
            <MessageSquare className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="profile">
            <User className="h-4 w-4" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Próximos Agendamentos</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : appointments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum agendamento agendado</p>
              ) : (
                <div className="space-y-3">
                  {appointments.map((apt) => (
                    <div key={apt.id} className="p-3 border rounded-lg">
                      <p className="font-medium">
                        {format(new Date(apt.start_time), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {apt.therapists?.name || 'Fisioterapeuta'}
                      </p>
                      <Badge variant={apt.status === 'confirmed' ? 'default' : 'secondary'}>
                        {apt.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exercises" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Meus Exercícios</CardTitle>
              <CardDescription>Exercícios prescritos pelo fisioterapeuta</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Funcionalidade em desenvolvimento
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chat" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Chat com Fisioterapeuta</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Funcionalidade em desenvolvimento
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Meu Perfil</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Funcionalidade em desenvolvimento
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
