/**
 * useIncompletePatients - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('patients') → Firestore collection 'patients'
 * - Supabase Realtime → Firestore onSnapshot() for real-time updates
 */

import { useState, useEffect } from 'react';
import { logger } from '@/lib/errors/logger';
import { db } from '@/integrations/firebase/app';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';


interface IncompletePatient {
  id: string;
  name: string;
  phone?: string;
}

export const useIncompletePatients = () => {
  const [data, setData] = useState<IncompletePatient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);

    const q = query(
      collection(db, 'patients'),
      where('incomplete_registration', '==', true),
      orderBy('created_at', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        try {
          // Map full_name to name for the frontend
          const mappedPatients = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.full_name,
              phone: data.phone,
            };
          });

          setData(mappedPatients);
          setError(null);
        } catch (err) {
          logger.error('Erro ao processar pacientes incompletos', err, 'useIncompletePatients');
          setError(err instanceof Error ? err.message : 'Erro desconhecido');
        } finally {
          setIsLoading(false);
        }
      },
      (err) => {
        logger.error('Erro ao buscar pacientes incompletos', err, 'useIncompletePatients');
        setError(err.message);
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  return { data, isLoading, error, count: data.length };
};
