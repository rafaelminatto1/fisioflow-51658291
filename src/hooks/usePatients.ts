import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Patient } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/errors/logger';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export const useActivePatients = () => {
  const { profile } = useAuth();
  const organizationId = profile?.organization_id;
  const queryClient = useQueryClient();

  // Setup realtime subscription
  useEffect(() => {
    if (!organizationId) return;

    const channel = supabase
      .channel('patients-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patients',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['patients', organizationId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, queryClient]);

  return useQuery({
    queryKey: ['patients', organizationId],
    queryFn: async () => {
      try {
        let query = supabase
          .from('patients')
          .select('*')
          .in('status', ['active', 'Em Tratamento', 'Inicial']);

        if (organizationId) {
          query = query.eq('organization_id', organizationId);
        }

        const { data: supabasePatients, error: supabaseError } = await query
          .order('created_at', { ascending: false });

        if (supabaseError) throw supabaseError;

        if (supabasePatients && supabasePatients.length > 0) {
          return supabasePatients.map(p => ({
            id: p.id,
            name: p.name,
            email: p.email || undefined,
            phone: p.phone || undefined,
            cpf: p.cpf || undefined,
            birthDate: p.birth_date || new Date().toISOString(),
            gender: 'outro',
            mainCondition: p.observations || '',
            status: (p.status === 'active' ? 'Em Tratamento' : 'Inicial') as any,
            progress: 0,
            incomplete_registration: p.incomplete_registration || false,
            createdAt: p.created_at || new Date().toISOString(),
            updatedAt: p.updated_at || new Date().toISOString(),
          })) as Patient[];
        }

        // Fallback to mock data if no patients found
        const { mockPatients } = await import('@/lib/mockData');
        return mockPatients.filter(p => p.status === 'Em Tratamento' || p.status === 'Inicial');
      } catch (err) {
        logger.error('Erro ao carregar pacientes', err, 'usePatients');
        // Fallback to mock data on error
        try {
          const { mockPatients } = await import('@/lib/mockData');
          return mockPatients.filter(p => p.status === 'Em Tratamento' || p.status === 'Inicial');
        } catch {
          throw err;
        }
      }
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const usePatients = () => {
  return useActivePatients();
};