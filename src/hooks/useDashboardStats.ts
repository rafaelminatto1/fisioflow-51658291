/**
 * useDashboardStats - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('patients') → Firestore collection 'patients'
 * - supabase.from('appointments') → Firestore collection 'appointments'
 * - supabase.from('profiles') → Firestore collection 'profiles'
 * - supabase.realtime → Firestore onSnapshot
 */

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { db } from '@/integrations/firebase/app';
import {
  collection,
  getCountFromServer,
  query,
  where,
  onSnapshot
} from 'firebase/firestore';

interface DashboardStats {
  totalPatients: number;
  todayAppointments: number;
  monthlyRevenue: number;
  activeTherapists: number;
  remainingAppointments: number;
  newPatients: number;
}

export const useDashboardStats = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    todayAppointments: 0,
    monthlyRevenue: 0,
    activeTherapists: 0,
    remainingAppointments: 0,
    newPatients: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Função auxiliar para timeout
      const withTimeout = <T,>(promise: PromiseLike<T>, timeoutMs: number): Promise<T> => {
        return Promise.race([
          Promise.resolve(promise),
          new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout após ${timeoutMs}ms`)), timeoutMs)
          ),
        ]);
      };

      // Função auxiliar para retry
      const retryWithBackoff = async <T,>(
        fn: () => Promise<T>,
        maxRetries: number = 2,
        initialDelay: number = 1000
      ): Promise<T> => {
        let lastError: Error | unknown;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            return await fn();
          } catch (error) {
            lastError = error;
            if (attempt < maxRetries - 1) {
              const delay = initialDelay * Math.pow(2, attempt);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }

        throw lastError;
      };

      const today = format(new Date(), 'yyyy-MM-dd');
      const startOfMonth = new Date();
      startOfMonth.setDate(1);

      // Carregar todos os dados em paralelo com timeout e retry
      const [
        totalPatientsResult,
        newPatientsResult,
        todayAppointmentsResult,
        completedTodayResult,
        activeTherapistsResult,
      ] = await Promise.allSettled([
        retryWithBackoff(() =>
          withTimeout(
            getCountFromServer(collection(db, 'patients')),
            8000
          ).then(result => result.data().count)
        ),
        retryWithBackoff(() =>
          withTimeout(
            getCountFromServer(
              query(collection(db, 'patients'), where('created_at', '>=', startOfMonth.toISOString()))
            ),
            8000
          ).then(result => result.data().count)
        ),
        retryWithBackoff(() =>
          withTimeout(
            getCountFromServer(
              query(collection(db, 'appointments'), where('appointment_date', '==', today))
            ),
            8000
          ).then(result => result.data().count)
        ),
        retryWithBackoff(() =>
          withTimeout(
            getCountFromServer(
              query(
                collection(db, 'appointments'),
                where('appointment_date', '==', today),
                where('status', '==', 'concluido')
              )
            ),
            8000
          ).then(result => result.data().count)
        ),
        retryWithBackoff(() =>
          withTimeout(
            getCountFromServer(collection(db, 'profiles')),
            8000
          ).then(result => result.data().count)
        ),
      ]);

      // Extrair dados com fallback
      const totalPatients = totalPatientsResult.status === 'fulfilled'
        ? totalPatientsResult.value || 0
        : 0;

      const newPatients = newPatientsResult.status === 'fulfilled'
        ? newPatientsResult.value || 0
        : 0;

      const todayAppointments = todayAppointmentsResult.status === 'fulfilled'
        ? todayAppointmentsResult.value || 0
        : 0;

      const completedToday = completedTodayResult.status === 'fulfilled'
        ? completedTodayResult.value || 0
        : 0;

      const activeTherapists = activeTherapistsResult.status === 'fulfilled'
        ? activeTherapistsResult.value || 0
        : 0;

      setStats({
        totalPatients,
        todayAppointments,
        monthlyRevenue: 18500, // Mock - implement when financial table exists
        activeTherapists,
        remainingAppointments: todayAppointments - completedToday,
        newPatients
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      logger.error('Erro ao carregar estatísticas do dashboard', error, 'useDashboardStats');
      // Manter valores padrão em caso de erro
      setStats({
        totalPatients: 0,
        todayAppointments: 0,
        monthlyRevenue: 0,
        activeTherapists: 0,
        remainingAppointments: 0,
        newPatients: 0
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();

    // Set up real-time listeners using Firestore onSnapshot
    const unsubscribes: (() => void)[] = [];

    // Listen for changes in appointments
    const appointmentsUnsubscribe = onSnapshot(
      collection(db, 'appointments'),
      () => {
        loadStats().catch((err) => {
          logger.error('Erro ao recarregar estatísticas após mudança em appointments', err, 'useDashboardStats');
        });
      },
      (error) => {
        logger.error('Real-time appointments error:', error, 'useDashboardStats');
      }
    );
    unsubscribes.push(appointmentsUnsubscribe);

    // Listen for changes in patients
    const patientsUnsubscribe = onSnapshot(
      collection(db, 'patients'),
      () => {
        loadStats().catch((err) => {
          logger.error('Erro ao recarregar estatísticas após mudança em patients', err, 'useDashboardStats');
        });
      },
      (error) => {
        logger.error('Real-time patients error:', error, 'useDashboardStats');
      }
    );
    unsubscribes.push(patientsUnsubscribe);

    return () => {
      // Unsubscribe from all listeners
      unsubscribes.forEach(unsub => unsub());
    };
  }, [loadStats]);

  return { stats, loading, error, refresh: loadStats };
};
