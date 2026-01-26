import { useQuery } from '@tanstack/react-query';
import { getFirebaseDb } from '@/integrations/firebase/app';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

interface LoginAttempt {
  id: string;
  email: string;
  success: boolean;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface SuspiciousActivity {
  id: string;
  email: string;
  failed_attempts: number;
  last_attempt: string;
  ip_addresses: string[];
}

export function useSecurityMonitoring() {
  const { data: recentAttempts = [], isLoading: attemptsLoading } = useQuery({
    queryKey: ['login-attempts'],
    queryFn: async () => {
      const db = getFirebaseDb();
      const q = query(
        collection(db, 'login_attempts'),
        orderBy('created_at', 'desc'),
        limit(50)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as LoginAttempt[];
    },
    staleTime: 30 * 1000,
  });

  const { data: suspiciousActivity = [], isLoading: suspiciousLoading } = useQuery({
    queryKey: ['suspicious-activity'],
    queryFn: async () => {
      const db = getFirebaseDb();
      const q = query(collection(db, 'suspicious_login_activity'));

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SuspiciousActivity[];
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // Refresh every minute
  });

  return {
    recentAttempts,
    suspiciousActivity,
    isLoading: attemptsLoading || suspiciousLoading,
  };
}
