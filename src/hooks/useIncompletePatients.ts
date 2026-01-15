import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/errors/logger';

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
    const fetchIncompletePatients = async () => {
      setIsLoading(true);
      try {
        const { data: patients, error } = await supabase
          .from('patients')
          .select('id, full_name, phone')
          .eq('incomplete_registration', true)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Map full_name to name for the frontend
        const mappedPatients = (patients || []).map(p => ({
          ...p,
          name: p.full_name
        }));

        setData(mappedPatients);
        setError(null);
      } catch (err) {
        logger.error('Erro ao buscar pacientes incompletos', err, 'useIncompletePatients');
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchIncompletePatients();

    // FIX: Track subscription state to avoid WebSocket errors
    let isSubscribed = false;
    const channel = supabase.channel('incomplete-patients-updates');

    (channel as any)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patients',
          filter: 'incomplete_registration=eq.true',
        },
        () => {
          fetchIncompletePatients();
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          isSubscribed = true;
        }
      });

    return () => {
      if (isSubscribed) {
        supabase.removeChannel(channel).catch(() => {
          // Ignore cleanup errors
        });
      }
    };
  }, []);

  return { data, isLoading, error, count: data.length };
};
