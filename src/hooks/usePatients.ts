import { useState, useEffect } from 'react';
import { Patient } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/errors/logger';
import { getUserOrganizationId } from '@/utils/userHelpers';

export const useActivePatients = () => {
  const [data, setData] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPatients = async () => {
      try {
        // Obter organization_id do usuário
        let organizationId: string | null = null;
        try {
          organizationId = await getUserOrganizationId();
        } catch (orgError) {
          logger.warn('Não foi possível obter organization_id, usando RLS', orgError, 'usePatients');
        }

        // Construir query
        let query = supabase
          .from('patients')
          .select('*')
          .in('status', ['active', 'Em Tratamento', 'Inicial']);

        // Filtrar por organização se disponível (melhora performance e segurança)
        if (organizationId) {
          query = query.eq('organization_id', organizationId);
        }

        const { data: supabasePatients, error: supabaseError } = await query
          .order('created_at', { ascending: false });

        if (!supabaseError && supabasePatients && supabasePatients.length > 0) {
          // Map Supabase data to Patient type
          const mappedPatients: Patient[] = supabasePatients.map(p => ({
            id: p.id,
            name: p.name,
            email: p.email || undefined,
            phone: p.phone || undefined,
            cpf: p.cpf || undefined,
            birthDate: p.birth_date || new Date().toISOString(),
            gender: 'outro' as any, // Default value
            mainCondition: p.observations || '', // Using observations as main condition
            status: (p.status === 'active' ? 'Em Tratamento' : 'Inicial') as any,
            progress: 0,
            incomplete_registration: p.incomplete_registration || false,
            createdAt: p.created_at || new Date().toISOString(),
            updatedAt: p.updated_at || new Date().toISOString(),
          }));
          setData(mappedPatients);
        } else {
          // Fallback to mock data
          const { mockPatients } = await import('@/lib/mockData');
          setData(mockPatients.filter(p => p.status === 'Em Tratamento' || p.status === 'Inicial'));
        }
        setIsLoading(false);
      } catch (err) {
        logger.error('Erro ao carregar pacientes', err, 'usePatients');
        // Fallback to mock data on error
        try {
          const { mockPatients } = await import('@/lib/mockData');
          setData(mockPatients.filter(p => p.status === 'Em Tratamento' || p.status === 'Inicial'));
        } catch {
          setError('Erro ao carregar pacientes');
        }
        setIsLoading(false);
      }
    };

    loadPatients();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('patients-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patients',
        },
        () => {
          loadPatients();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { data, isLoading, error };
};

export const usePatients = () => {
  return useActivePatients();
};