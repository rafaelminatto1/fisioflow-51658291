import { useEffect } from 'react';
import { subscribeToAppointments } from '@/lib/firestore';
import { useAuthStore } from '@/store/auth';
import { useAppointmentsStore } from '@/store/appointments';

/**
 * Hook para sincronização em tempo real de agendamentos via Firestore onSnapshot
 * Atualiza o store local automaticamente quando há mudanças no banco de dados
 */
export function useRealtimeAppointments() {
  const { user } = useAuthStore();
  const setAppointments = useAppointmentsStore((state) => state.setAppointments);

  useEffect(() => {
    if (!user) return;

    // Subscribe to Firestore real-time updates
    const unsubscribe = subscribeToAppointments(user.id, (appointments) => {
      setAppointments(appointments);
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [user, setAppointments]);
}
