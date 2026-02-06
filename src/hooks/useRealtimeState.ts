
/**
 * Hook para ouvir mudanças em tempo real no Firebase Realtime DB
 * Substitui a necessidade do Ably
 */

import { useState, useEffect } from 'react';
import { getDatabase, ref, onValue, off } from 'firebase/database';
import { app } from '@/integrations/firebase/app';

export const useRealtimeState = <T>(orgId: string | undefined, path: string) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;

    const db = getDatabase(app);
    const dbRef = ref(db, `orgs/${orgId}/${path}`);

    const unsubscribe = onValue(dbRef, (snapshot) => {
      setData(snapshot.val());
      setLoading(false);
    });

    return () => off(dbRef, 'value', unsubscribe);
  }, [orgId, path]);

  return { data, loading };
};
