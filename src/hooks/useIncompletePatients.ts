import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
          .select('id, name, phone')
          .eq('incomplete_registration', true)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setData(patients || []);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching incomplete patients:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchIncompletePatients();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('incomplete-patients-updates')
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { data, isLoading, error, count: data.length };
};
