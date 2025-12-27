// App móvel para pacientes - Versão simplificada
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MessageSquare, Activity, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

export default function PatientApp() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadAppointments();
    }
  }, [user]);

  async function loadAppointments() {
    try {
      // Buscar agendamentos do paciente
      const { data: profile } = await supabase
        .from('profiles')
        .select('patient_id')
        .eq('id', user?.id)
        .single();

      if (profile?.patient_id) {
        const { data } = await supabase
          .from('appointments')
          .select('*, therapists:profiles(name)')
          .eq('patient_id', profile.patient_id)
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true });

        setAppointments(data || []);
      }

      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
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

