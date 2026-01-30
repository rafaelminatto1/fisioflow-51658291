import { useEffect, useState, useCallback, memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, User, Bell } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/integrations/firebase/app';
import { collection, query, where, orderBy, limit, onSnapshot, getDocs, doc, getDoc } from 'firebase/firestore';

interface ActivityEvent {
  id: string;
  type: 'appointment' | 'patient' | 'payment' | 'waitlist';
  title: string;
  description: string;
  timestamp: Date;
  icon: React.ElementType;
  variant: 'default' | 'success' | 'warning' | 'destructive';
}

interface AppointmentDocument {
  id: string;
  patient_id?: string;
  appointment_date: { toDate: () => Date } | Date | string;
  created_at: { toDate: () => Date } | Date | string;
  patients?: { name: string };
}

const MAX_ACTIVITIES = 20; // Limitar para evitar crescimento infinito

/**
 * RealtimeActivityFeed otimizado com React.memo
 * Não cria subscriptions duplicadas - usa dados iniciais do Firebase Firestore
 * Implementa cleanup adequado para evitar memory leaks
 */
export const RealtimeActivityFeed = memo(function RealtimeActivityFeed() {
  const { user, loading: authLoading } = useAuth();
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Carregar atividades recentes ao montar
   * Cleanup adequado com unsubscribe functions
   */
  useEffect(() => {
    if (authLoading || !user) return;

    const unsubscribers: Array<() => void> = [];

    const loadRecentActivities = async () => {
      try {
        setIsLoading(true);

        // Fetch appointments first
        const appointmentsQuery = query(
          collection(db, 'appointments'),
          orderBy('created_at', 'desc'),
          limit(5)
        );

        const appointmentsSnapshot = await getDocs(appointmentsQuery);
        const appointments: AppointmentDocument[] = [];

        // Manually fetch patient names to avoid relationship errors
        const patientIds = new Set<string>();
        appointmentsSnapshot.forEach((doc) => {
          const data = doc.data();
          appointments.push({ id: doc.id, ...data });
          if (data.patient_id) {
            patientIds.add(data.patient_id);
          }
        });

        const patientMap = new Map<string, string>();

        // Fetch patient data
        if (patientIds.size > 0) {
          const patientPromises = Array.from(patientIds).map(async (patientId) => {
            const patientDoc = await getDoc(doc(db, 'patients', patientId));
            if (patientDoc.exists()) {
              const patientData = patientDoc.data();
              return { id: patientId, name: patientData.full_name || patientData.name || 'Paciente desconhecido' };
            }
            return { id: patientId, name: 'Paciente desconhecido' };
          });

          const patients = await Promise.all(patientPromises);
          patients.forEach((p) => patientMap.set(p.id, p.name));
        }

        // Attach names to appointments
        const appointmentsWithNames = appointments.map((apt) => ({
          ...apt,
          patients: { name: patientMap.get(apt.patient_id) || 'Paciente desconhecido' }
        }));

        const activityList: ActivityEvent[] = [];

        appointmentsWithNames.forEach((apt) => {
          activityList.push({
            id: apt.id,
            type: 'appointment',
            title: 'Novo Agendamento',
            description: `${apt.patients?.name || 'Paciente'} - ${format(apt.appointment_date?.toDate ? apt.appointment_date.toDate() : new Date(apt.appointment_date), 'dd/MM/yyyy HH:mm')}`,
            timestamp: apt.created_at?.toDate ? apt.created_at.toDate() : new Date(apt.created_at),
            icon: Calendar,
            variant: 'default',
          });
        });

        setActivities(activityList.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading activities:', error);
        setActivities([]);
        setIsLoading(false);
      }
    };

    loadRecentActivities();

    // Setup realtime subscriptions
    const appointmentsQuery = query(
      collection(db, 'appointments'),
      orderBy('created_at', 'desc'),
      limit(10)
    );

    const appointmentsUnsub = onSnapshot(appointmentsQuery, async (snapshot) => {
      const newActivities: ActivityEvent[] = [];

      for (const change of snapshot.docChanges()) {
        if (change.type === 'added') {
          const apt = change.doc.data();
          const patientId = apt.patient_id;

          let patientName = 'Paciente';
          if (patientId) {
            try {
              const patientDoc = await getDoc(doc(db, 'patients', patientId));
              if (patientDoc.exists()) {
                const patientData = patientDoc.data();
                patientName = patientData.full_name || patientData.name || 'Paciente';
              }
            } catch (e) {
              console.error('Error fetching patient:', e);
            }
          }

          const newActivity: ActivityEvent = {
            id: `activity-${change.doc.id}-${Date.now()}`,
            type: 'appointment',
            title: 'Novo Agendamento',
            description: `${patientName} - ${format(apt.appointment_date?.toDate ? apt.appointment_date.toDate() : new Date(apt.appointment_date), 'dd/MM/yyyy HH:mm')}`,
            timestamp: new Date(),
            icon: Calendar,
            variant: 'success',
          };

          newActivities.push(newActivity);
        }
      }

      if (newActivities.length > 0) {
        setActivities((prev) => [...newActivities, ...prev].slice(0, MAX_ACTIVITIES));
      }
    }, (error) => {
      console.warn('RealtimeActivityFeed: Appointments subscription error', error);
    });

    unsubscribers.push(appointmentsUnsub);

    const patientsQuery = query(
      collection(db, 'patients'),
      orderBy('created_at', 'desc'),
      limit(10)
    );

    const patientsUnsub = onSnapshot(patientsQuery, (snapshot) => {
      const newActivities: ActivityEvent[] = [];

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const patient = change.doc.data();
          const newActivity: ActivityEvent = {
            id: `patient-${change.doc.id}-${Date.now()}`,
            type: 'patient',
            title: 'Novo Paciente',
            description: patient.full_name || patient.name || 'Novo paciente cadastrado',
            timestamp: new Date(),
            icon: User,
            variant: 'success',
          };
          newActivities.push(newActivity);
        }
      });

      if (newActivities.length > 0) {
        setActivities((prev) => [...newActivities, ...prev].slice(0, MAX_ACTIVITIES));
      }
    }, (error) => {
      console.warn('RealtimeActivityFeed: Patients subscription error', error);
    });

    unsubscribers.push(patientsUnsub);

    // Cleanup function
    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [user, authLoading]);

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
