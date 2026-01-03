import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, User, DollarSign, Clock, Bell } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ActivityEvent {
  id: string;
  type: 'appointment' | 'patient' | 'payment' | 'waitlist';
  title: string;
  description: string;
  timestamp: Date;
  icon: any;
  variant: 'default' | 'success' | 'warning' | 'destructive';
}

export function RealtimeActivityFeed() {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRecentActivities();
    setupRealtimeSubscriptions();
  }, []);

  const loadRecentActivities = async () => {
    try {
      setIsLoading(true);
      
      // Função auxiliar para timeout
      const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
        return Promise.race([
          promise,
          new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout após ${timeoutMs}ms`)), timeoutMs)
          ),
        ]);
      };

      // Tentar carregar com retry
      let appointments = null;
      let retries = 0;
      const maxRetries = 3;

      while (retries < maxRetries && !appointments) {
        try {
          const result = await withTimeout(
            supabase
              .from('appointments')
              .select('*, patients(name)')
              .order('created_at', { ascending: false })
              .limit(5),
            8000
          );
          
          if (result.data) {
            appointments = result.data;
            break;
          }
        } catch (error) {
          retries++;
          if (retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * retries));
          }
        }
      }

      const activityList: ActivityEvent[] = [];

      if (appointments) {
        appointments.forEach(apt => {
          activityList.push({
            id: apt.id,
            type: 'appointment',
            title: 'Novo Agendamento',
            description: `${apt.patients?.name || 'Paciente'} - ${format(new Date(apt.appointment_date), 'dd/MM/yyyy HH:mm')}`,
            timestamp: new Date(apt.created_at),
            icon: Calendar,
            variant: 'default',
          });
        });
      }

      setActivities(activityList.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
    } catch (error) {
      console.error('Error loading activities:', error);
      // Manter lista vazia em caso de erro
      setActivities([]);
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    const appointmentsChannel = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments',
        },
        async (payload) => {
          const { data: patient } = await supabase
            .from('patients')
            .select('name')
            .eq('id', payload.new.patient_id)
            .single();

          const newActivity: ActivityEvent = {
            id: payload.new.id,
            type: 'appointment',
            title: 'Novo Agendamento',
            description: `${patient?.name} - ${format(new Date(payload.new.appointment_date), 'dd/MM/yyyy HH:mm')}`,
            timestamp: new Date(),
            icon: Calendar,
            variant: 'success',
          };

          setActivities(prev => [newActivity, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    const patientsChannel = supabase
      .channel('patients-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'patients',
        },
        (payload) => {
          const newActivity: ActivityEvent = {
            id: payload.new.id,
            type: 'patient',
            title: 'Novo Paciente',
            description: payload.new.name,
            timestamp: new Date(),
            icon: User,
            variant: 'success',
          };

          setActivities(prev => [newActivity, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(appointmentsChannel);
      supabase.removeChannel(patientsChannel);
    };
  };

  const getIconColor = (variant: string) => {
    switch (variant) {
      case 'success':
        return 'text-green-500';
      case 'warning':
        return 'text-yellow-500';
      case 'destructive':
        return 'text-red-500';
      default:
        return 'text-primary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Atividades em Tempo Real
        </CardTitle>
        <CardDescription>Acompanhe as últimas atualizações do sistema</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma atividade recente
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {activities.map(activity => {
                const Icon = activity.icon;
                return (
                  <div
                    key={activity.id}
                    className="flex gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className={`mt-1 ${getIconColor(activity.variant)}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{activity.title}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {activity.description}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs whitespace-nowrap">
                          {format(activity.timestamp, 'HH:mm', { locale: ptBR })}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
