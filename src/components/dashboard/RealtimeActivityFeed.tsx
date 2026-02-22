import { useEffect, useState, useCallback, memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, User, Bell } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { db, collection, query, where, orderBy, limit, onSnapshot, getDocs, doc, getDoc } from '@/integrations/firebase/app';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { normalizeFirestoreData } from '@/utils/firestoreData';

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

const safeFormatDate = (val: unknown): string => {
  const d =
    val && typeof (val as { toDate?: () => Date }).toDate === 'function'
      ? (val as { toDate: () => Date }).toDate()
      : val
        ? new Date(val as string)
        : null;
  if (!d || isNaN(d.getTime())) return '--/--/----';
  return format(d, 'dd/MM/yyyy HH:mm');
};

/**
 * RealtimeActivityFeed otimizado com React.memo
 * Não cria subscriptions duplicadas - usa dados iniciais do Firebase Firestore
 * Implementa cleanup adequado para evitar memory leaks
 */
export const RealtimeActivityFeed = memo(function RealtimeActivityFeed() {
  const { user, profile, loading: authLoading } = useAuth();
  const organizationId = profile?.organization_id;
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Carregar atividades recentes ao montar
   * Cleanup adequado com unsubscribe functions
   */
  useEffect(() => {
    if (authLoading || !user || !organizationId) return;

    const unsubscribers: Array<() => void> = [];

    const loadRecentActivities = async () => {
      try {
        setIsLoading(true);

        // Fetch appointments first
        const appointmentsQuery = query(
          collection(db, 'appointments'),
          where('organization_id', '==', organizationId),
          orderBy('created_at', 'desc'),
          limit(5)
        );

        const appointmentsSnapshot = await getDocs(appointmentsQuery);
        const appointments: AppointmentDocument[] = [];

        // Collect patient IDs to fetch names in bulk
        const patientIds = new Set<string>();
        appointmentsSnapshot.forEach((doc) => {
          const data = normalizeFirestoreData(doc.data());
          appointments.push({ id: doc.id, ...data });
          if (data.patient_id) {
            patientIds.add(data.patient_id);
          }
        });

        const patientMap = new Map<string, string>();

        // Fetch patient data in bulk (simulated here with individual gets but could be optimized further)
        if (patientIds.size > 0) {
          const patientPromises = Array.from(patientIds).map(async (patientId) => {
            try {
              const patientDoc = await getDoc(doc(db, 'patients', patientId));
              if (patientDoc.exists()) {
                const patientData = patientDoc.data();
                return { id: patientId, name: patientData.full_name || patientData.name || 'Paciente' };
              }
            } catch (e) {
              logger.warn(`Could not fetch patient ${patientId}`, e);
            }
            return { id: patientId, name: 'Paciente' };
          });

          const patients = await Promise.all(patientPromises);
          patients.forEach((p) => patientMap.set(p.id, p.name));
        }

        const activityList: ActivityEvent[] = appointments.map((apt) => {
          const timestamp = apt.created_at?.toDate
            ? apt.created_at.toDate()
            : apt.created_at
              ? new Date(apt.created_at)
              : new Date();

          return {
            id: apt.id,
            type: 'appointment',
            title: 'Novo Agendamento',
            description: `${patientMap.get(apt.patient_id || '') || 'Paciente'} - ${safeFormatDate(apt.appointment_date)}`,
            timestamp: isNaN(timestamp.getTime()) ? new Date() : timestamp,
            icon: Calendar,
            variant: 'default',
          };
        });

        setActivities(activityList.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
        setIsLoading(false);
      } catch (error) {
        logger.error('Error loading activities', error, 'RealtimeActivityFeed');
        setActivities([]);
        setIsLoading(false);
      }
    };

    loadRecentActivities();

    // Setup realtime subscriptions with organization filter
    const appointmentsQuery = query(
      collection(db, 'appointments'),
      where('organization_id', '==', organizationId),
      orderBy('created_at', 'desc'),
      limit(10)
    );

    const appointmentsUnsub = onSnapshot(appointmentsQuery, (snapshot) => {
      const addedChanges = snapshot.docChanges().filter(c => c.type === 'added');
      if (addedChanges.length === 0) return;

      const newActivities: ActivityEvent[] = addedChanges.map(change => {
        const apt = normalizeFirestoreData(change.doc.data());
        return {
          id: `activity-${change.doc.id}-${Date.now()}`,
          type: 'appointment',
          title: 'Novo Agendamento',
          description: `${apt.patient_name || 'Paciente'} - ${safeFormatDate(apt.appointment_date)}`,
          timestamp: new Date(),
          icon: Calendar,
          variant: 'success',
        };
      });

      setActivities((prev) => [...newActivities, ...prev].slice(0, MAX_ACTIVITIES));
    });

    unsubscribers.push(appointmentsUnsub);

    const patientsQuery = query(
      collection(db, 'patients'),
      where('organization_id', '==', organizationId),
      orderBy('created_at', 'desc'),
      limit(10)
    );

    const patientsUnsub = onSnapshot(patientsQuery, (snapshot) => {
      const addedChanges = snapshot.docChanges().filter(c => c.type === 'added');
      if (addedChanges.length === 0) return;

      const newActivities: ActivityEvent[] = addedChanges.map(change => {
        const patient = normalizeFirestoreData(change.doc.data());
        return {
          id: `patient-${change.doc.id}-${Date.now()}`,
          type: 'patient',
          title: 'Novo Paciente',
          description: patient.full_name || patient.name || 'Novo paciente cadastrado',
          timestamp: new Date(),
          icon: User,
          variant: 'success',
        };
      });

      setActivities((prev) => [...newActivities, ...prev].slice(0, MAX_ACTIVITIES));
    });

    unsubscribers.push(patientsUnsub);

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [user, organizationId, authLoading]);

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
    <Card className="border-none shadow-premium-lg bg-white dark:bg-slate-900 overflow-hidden">
      <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800/50">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg font-black tracking-tight">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <Bell className="h-4 w-4 text-primary" />
              </div>
              Atividades
            </CardTitle>
            <CardDescription className="text-xs font-medium uppercase tracking-wider text-slate-400">Tempo Real</CardDescription>
          </div>
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sincronizando...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-12 px-6">
            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-slate-700">
              <Bell className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Nenhuma atividade recente</p>
            <p className="text-xs text-slate-400 mt-1">O sistema está pronto para novos dados.</p>
          </div>
        ) : (
          <ScrollArea className="h-[480px]">
            <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {activities.map((activity, idx) => {
                const Icon = activity.icon;
                const isNew = idx === 0;
                return (
                  <div
                    key={activity.id}
                    className={`flex gap-4 p-4 transition-all duration-300 hover:bg-slate-50 dark:hover:bg-slate-800/40 relative group ${isNew ? 'bg-primary/[0.02]' : ''}`}
                  >
                    {isNew && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                    )}
                    
                    <div className={`mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110 ${
                      activity.variant === 'success' ? 'bg-emerald-500/10 text-emerald-600' :
                      activity.variant === 'warning' ? 'bg-amber-500/10 text-amber-600' :
                      activity.variant === 'destructive' ? 'bg-red-500/10 text-red-600' :
                      'bg-primary/10 text-primary'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-slate-900 dark:text-white leading-none mb-1.5">{activity.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                            {activity.description}
                          </p>
                        </div>
                        <time className="text-[10px] font-black text-slate-400 uppercase whitespace-nowrap bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                          {format(activity.timestamp, 'HH:mm', { locale: ptBR })}
                        </time>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
      <div className="p-4 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800/50 flex justify-center">
        <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-primary transition-colors">
          Ver Log Completo
        </Button>
      </div>
    </Card>
  );
});
