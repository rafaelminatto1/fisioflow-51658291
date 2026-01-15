import { useEffect, useState, useCallback, memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, User, Bell } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ActivityEvent {
  id: string;
  type: 'appointment' | 'patient' | 'payment' | 'waitlist';
  title: string;
  description: string;
  timestamp: Date;
  icon: React.ElementType;
  variant: 'default' | 'success' | 'warning' | 'destructive';
}

const MAX_ACTIVITIES = 20; // Limitar para evitar crescimento infinito

/**
 * RealtimeActivityFeed otimizado com React.memo
 * Não cria subscriptions duplicadas - usa dados iniciais do RealtimeContext
 * Implementa cleanup adequado para evitar memory leaks
 */
export const RealtimeActivityFeed = memo(function RealtimeActivityFeed() {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Carregar atividades recentes ao montar
   * Cleanup adequado com AbortController
   */
  useEffect(() => {
    const abortController = new AbortController();
    const signal = abortController.signal;

    const loadRecentActivities = async () => {
      try {
        setIsLoading(true);

        // Função auxiliar para timeout com AbortSignal
        const withTimeout = <T,>(promise: PromiseLike<T>, timeoutMs: number): Promise<T> => {
          return Promise.race([
            Promise.resolve(promise),
            new Promise<T>((_, reject) =>
              setTimeout(() => {
                if (!signal.aborted) reject(new Error(`Timeout após ${timeoutMs}ms`));
              }, timeoutMs)
            ),
          ]);
        };

        // Tentar carregar com retry
        let appointments = null;
        let retries = 0;
        const maxRetries = 3;

        while (retries < maxRetries && !appointments && !signal.aborted) {
          try {
            // Fetch appointments first
            const result = await withTimeout(
              supabase
                .from('appointments')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5),
              8000
            );

            if (signal.aborted) return;

            if (result.data) {
              appointments = result.data;

              // Manually fetch patient names to avoid relationship 400 errors
              const patientIds = [...new Set(appointments.map(a => a.patient_id).filter(Boolean))];

              let patientsData: { id: string, name: string }[] | null = null;

              if (patientIds.length > 0 && !signal.aborted) {
                const { data } = await supabase
                  .from('patients')
                  .select('id, name:full_name')
                  .in('id', patientIds);
                patientsData = data;
              }

              if (signal.aborted) return;

              const patientMap = new Map(patientsData?.map(p => [p.id, p.name]) || []);

              // Attach names to appointments
              appointments = appointments.map(apt => ({
                ...apt,
                patients: { name: patientMap.get(apt.patient_id) || 'Paciente desconhecido' }
              }));
            }

            break;
          } catch {
            retries++;
            if (retries < maxRetries && !signal.aborted) {
              await new Promise(resolve => setTimeout(resolve, 1000 * retries));
            }
          }
        }

        if (signal.aborted) return;

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
        if (!signal.aborted) {
          console.error('Error loading activities:', error);
          setActivities([]);
        }
      } finally {
        if (!signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    loadRecentActivities();

    // Cleanup function - cancela operações pendentes
    return () => {
      abortController.abort();
    };
  }, []);

  /**
   * Setup realtime subscriptions com cleanup adequado
   * Usa canais únicos para evitar duplicação com RealtimeContext
   * Com tratamento de erros melhorado para falhas de WebSocket
   */
  useEffect(() => {
    // AbortController para cancelar operações pendentes
    const abortController = new AbortController();
    const signal = abortController.signal;

    // Channel único com nome específico
    const appointmentsChannel = supabase
      .channel('activity-feed-appointments', {
        config: {
          broadcast: { self: false },
          presence: { key: '' }
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments',
        },
        async (payload) => {
          if (signal.aborted) return;

          try {
            const { data: patient } = await supabase
              .from('patients')
              .select('name:full_name')
              .eq('id', payload.new.patient_id)
              .single();

            if (signal.aborted) return;

            const newActivity: ActivityEvent = {
              id: `activity-${payload.new.id}-${Date.now()}`,
              type: 'appointment',
              title: 'Novo Agendamento',
              description: `${patient?.name || 'Paciente'} - ${format(new Date(payload.new.appointment_date), 'dd/MM/yyyy HH:mm')}`,
              timestamp: new Date(),
              icon: Calendar,
              variant: 'success',
            };

            setActivities(prev => [newActivity, ...prev].slice(0, MAX_ACTIVITIES));
          } catch (error) {
            if (!signal.aborted) {
              console.error('Error processing appointment activity:', error);
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('RealtimeActivityFeed: Channel error or timeout, will retry');
        }
      });

    const patientsChannel = supabase
      .channel('activity-feed-patients', {
        config: {
          broadcast: { self: false },
          presence: { key: '' }
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'patients',
        },
        (payload) => {
          if (signal.aborted) return;

          const newActivity: ActivityEvent = {
            id: `patient-${payload.new.id}-${Date.now()}`,
            type: 'patient',
            title: 'Novo Paciente',
            description: payload.new.name || 'Novo paciente cadastrado',
            timestamp: new Date(),
            icon: User,
            variant: 'success',
          };

          setActivities(prev => [newActivity, ...prev].slice(0, MAX_ACTIVITIES));
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('RealtimeActivityFeed: Channel error or timeout, will retry');
        }
      });

    // Cleanup - remove canais e cancela operações pendentes
    return () => {
      abortController.abort();
      supabase.removeChannel(appointmentsChannel);
      supabase.removeChannel(patientsChannel);
    };
  }, []);

  /**
   * Memoizar função de cor para evitar recriações
   */
  const getIconColor = useCallback((variant: string) => {
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
  }, []);

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
});
