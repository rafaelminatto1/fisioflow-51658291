import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface LoginAttempt {
  id: string;
  email: string;
  success: boolean;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface SuspiciousActivity {
  email: string;
  failed_attempts: number;
  last_attempt: string;
  ip_addresses: string[];
}

export function useSecurityMonitoring() {
  const { data: recentAttempts = [], isLoading: attemptsLoading } = useQuery({
    queryKey: ['login-attempts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('login_attempts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as LoginAttempt[];
    },
    staleTime: 30 * 1000,
  });

  const { data: suspiciousActivity = [], isLoading: suspiciousLoading } = useQuery({
    queryKey: ['suspicious-activity'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suspicious_login_activity')
        .select('*');

      if (error) throw error;
      return data as SuspiciousActivity[];
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
