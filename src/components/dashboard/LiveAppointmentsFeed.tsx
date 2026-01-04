// Feed de agendamentos em tempo real
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Appointment {
  id: string;
  start_time: string;
  patient: {
    name: string;
  };
  status: string;
  type?: string;
}

export function LiveAppointmentsFeed() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAppointments();

    // Subscription para mudanças em tempo real
    const channel = supabase
      .channel('live-appointments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: 'start_time=gte.' + new Date().toISOString(),
        },
        (payload) => {
          console.log('Mudança em appointment:', payload);
          if (payload.eventType === 'INSERT') {
            loadAppointment(payload.new.id);
          } else if (payload.eventType === 'UPDATE') {
            updateAppointment(payload.new);
          } else if (payload.eventType === 'DELETE') {
            removeAppointment(payload.old.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadAppointments() {
    try {
      setLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Função auxiliar para timeout
      const withTimeout = <T,>(promise: PromiseLike<T>, timeoutMs: number): Promise<T> => {
        return Promise.race([
          Promise.resolve(promise),
          new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout após ${timeoutMs}ms`)), timeoutMs)
          ),
        ]);
      };

      // Tentar carregar com retry
      let data = null;
      let retries = 0;
      const maxRetries = 3;

      while (retries < maxRetries && !data) {
        try {
          const result = await withTimeout(
            supabase
              .from('appointments')
              .select('id, start_time, status, type, patients(name)')
              .gte('start_time', today.toISOString())
              .order('start_time', { ascending: true })
              .limit(10),
            8000
          );
          
          if (result.data) {
            data = result.data;
            break;
          }
        } catch (error) {
          retries++;
          if (retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * retries));
          }
        }
      }

      if (data) {
        setAppointments(
          data.map((apt: any) => ({
            id: apt.id,
            start_time: apt.start_time,
            patient: apt.patients || { name: 'Paciente' },
            status: apt.status,
            type: apt.type,
          }))
        );
      } else {
        // Manter lista vazia em caso de erro
        setAppointments([]);
      }
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
      // Manter lista vazia em caso de erro
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadAppointment(id: string) {
    const { data } = await supabase
      .from('appointments')
      .select('id, start_time, status, type, patients(name)')
      .eq('id', id)
      .single();

    if (data) {
      setAppointments((prev) => {
        const exists = prev.find((apt) => apt.id === id);
        if (exists) return prev;
        return [
          ...prev,
          {
            id: data.id,
            start_time: data.start_time,
            patient: data.patients,
            status: data.status,
            type: data.type,
          },
        ].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
      });
    }
  }

  function updateAppointment(updated: any) {
    setAppointments((prev) =>
      prev.map((apt) => (apt.id === updated.id ? { ...apt, ...updated } : apt))
    );
  }

  function removeAppointment(id: string) {
    setAppointments((prev) => prev.filter((apt) => apt.id !== id));
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Agendamentos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusColors: Record<string, string> = {
    scheduled: 'bg-blue-500',
    confirmed: 'bg-green-500',
    cancelled: 'bg-red-500',
    completed: 'bg-gray-500',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agendamentos Recentes</CardTitle>
        <CardDescription>Atualizações em tempo real</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum agendamento hoje
            </p>
          ) : (
            appointments.map((apt) => (
              <div
                key={apt.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{apt.patient?.name || 'Paciente'}</p>
                    <Badge
                      variant="outline"
                      className={`${statusColors[apt.status] || 'bg-gray-500'} text-white border-0`}
                    >
                      {apt.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(apt.start_time), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

