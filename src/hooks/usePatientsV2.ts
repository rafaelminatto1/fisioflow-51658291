
// Pagination types

import { useEffect, useState, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { getAblyClient, ABLY_CHANNELS, ABLY_EVENTS } from '@/integrations/ably/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PatientServiceV2, type PatientV2 } from '@/services/patientServiceV2';
import { ErrorHandler } from '@/lib/errors/ErrorHandler';
import { fisioLogger } from '@/lib/errors/logger';
import { isOnline } from '@/lib/utils/query-helpers';
import { type Patient } from '@/schemas/patient';

export interface PaginatedPatientsResult {
  data: Patient[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface UsePaginatedPatientsOptions {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  orderBy?: string;
  order?: 'asc' | 'desc';
}

// Mapper to convert V2 (snake_case) to Frontend (camelCase)
const mapPatientV2ToFrontend = (p: PatientV2): Patient => ({
  id: p.id,
  name: p.name,
  email: p.email || null,
  phone: p.phone || null,
  cpf: p.cpf || null,
  birthDate: p.birth_date || null,
  gender: p.gender || null,
  // Normalize status to match schema if needed, though schema has generous enums
  status: p.status as any,
  mainCondition: p.main_condition || null,
  organization_id: p.organization_id,
  createdAt: p.created_at,
  updatedAt: p.updated_at,
  // Default values for missing fields
  progress: 0,
  incomplete_registration: false,
});

export const useActivePatientsV2 = () => {
  const { profile } = useAuth();
  const organizationId = profile?.organization_id;
  const queryClient = useQueryClient();
  const [retryCount, setRetryCount] = useState(0);

  // Setup realtime subscription via Ably (Compatible with Backend V2 events)
  useEffect(() => {
    if (!organizationId) return;

    const ably = getAblyClient();
    const channel = ably.channels.get(ABLY_CHANNELS.patients(organizationId));

    const handleUpdate = () => {
      fisioLogger.debug('Realtime (Ably): Pacientes atualizados via V2', undefined, 'usePatientsV2');
      queryClient.invalidateQueries({ queryKey: ['patients-v2', organizationId] });
    };

    channel.subscribe(ABLY_EVENTS.update, handleUpdate);
    channel.subscribe(ABLY_EVENTS.create, handleUpdate); // V2 might send different event names
    channel.subscribe('INSERT', handleUpdate); // Raw DB event
    channel.subscribe('UPDATE', handleUpdate); // Raw DB event
    channel.subscribe('DELETE', handleUpdate); // Raw DB event

    return () => {
      channel.unsubscribe();
    };
  }, [organizationId, queryClient, retryCount]);

  return useQuery({
    queryKey: ['patients-v2', organizationId],
    queryFn: async () => {
      if (!isOnline()) {
        // TODO: Implement V2 compatible cache
        fisioLogger.debug('Offline: V2 cache not implemented yet', undefined, 'usePatientsV2');
        return [];
      }

      fisioLogger.debug('useActivePatientsV2: fetching from API V2', undefined, 'usePatientsV2');
      const response = await PatientServiceV2.list({ status: 'active' }); // Or whatever status needed
      return response.data.map(mapPatientV2ToFrontend);
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useCreatePatientV2 = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (patient: Partial<Patient>) => {
      // Map back to snake_case if needed, but ServiceV2 handles partials.
      // We might need to map keys manually if they differ significantly.
      const payload: Partial<PatientV2> = {
        name: patient.name,
        email: patient.email || undefined,
        phone: patient.phone || undefined,
        cpf: patient.cpf || undefined,
        birth_date: patient.birthDate || undefined,
        gender: patient.gender || undefined,
        main_condition: patient.mainCondition || undefined,
        status: patient.status as any,
      };
      
      const { data } = await PatientServiceV2.create(payload);
      return mapPatientV2ToFrontend(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients-v2'] });
      toast({
        title: 'Paciente cadastrado (V2)',
        description: 'O paciente foi cadastrado com sucesso no Postgres.',
      });
    },
    onError: (error: Error) => {
      ErrorHandler.handle(error, 'useCreatePatientV2');
    },
  });
};

export const useUpdatePatientV2 = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Patient>) => {
      const payload: Partial<PatientV2> = {
        name: updates.name,
        email: updates.email || undefined,
        phone: updates.phone || undefined,
        cpf: updates.cpf || undefined,
        birth_date: updates.birthDate || undefined,
        gender: updates.gender || undefined,
        main_condition: updates.mainCondition || undefined,
        status: updates.status as any,
      };

      const { data } = await PatientServiceV2.update(id, payload);
      return mapPatientV2ToFrontend(data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patients-v2'] });
      queryClient.invalidateQueries({ queryKey: ['patient-v2', variables.id] });
      toast({
        title: 'Paciente atualizado (V2)',
        description: 'As informações foram atualizadas com sucesso.',
      });
    },
    onError: (error: Error) => {
      ErrorHandler.handle(error, 'useUpdatePatientV2');
    },
  });
};

export const useDeletePatientV2 = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (patientId: string) => {
      await PatientServiceV2.delete(patientId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients-v2'] });
      toast({
        title: 'Paciente excluído (V2)',
        description: 'O paciente foi removido com sucesso.',
      });
    },
    onError: (error: Error) => {
      ErrorHandler.handle(error, 'useDeletePatientV2');
    },
  });
};

/**
 * Paginated patients hook with cursor-based pagination
 * Use this for large patient lists to avoid loading all data at once
 */
export const usePaginatedPatients = (options: UsePaginatedPatientsOptions = {}) => {
  const {
    page = 1,
    pageSize = 25,
    status,
    search,
    orderBy = 'created_at',
    order = 'desc',
  } = options;

  const { profile } = useAuth();
  const organizationId = profile?.organization_id;
  const queryClient = useQueryClient();

  // Build query key based on options
  const queryKey = useMemo(
    () => [
      'patients-v2',
      'paginated',
      organizationId,
      page,
      pageSize,
      status,
      search,
      orderBy,
      order,
    ],
    [page, pageSize, status, search, orderBy, order, organizationId]
  );

  return useQuery({
    queryKey,
    queryFn: async (): Promise<PaginatedPatientsResult> => {
      if (!organizationId) {
        return {
          data: [],
          pagination: {
            page: 1,
            pageSize,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
        };
      }

      // Calculate offset
      const offset = (page - 1) * pageSize;

      // Build query params
      const params: Record<string, any> = {
        limit: pageSize,
        offset,
        order_by: orderBy,
        order_direction: order,
      };

      if (status) {
        params.status = status;
      }

      if (search) {
        params.search = search;
      }

      const response = await PatientServiceV2.list(params);
      const patients = response.data.map(mapPatientV2ToFrontend);

      // Get total count for pagination (this would need a separate endpoint or header)
      const total = response.total || patients.length;
      const totalPages = Math.ceil(total / pageSize);

      return {
        data: patients,
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 2, // 2 minutes - shorter for paginated data
    gcTime: 1000 * 60 * 5,
  });
};

/**
 * Hook to prefetch next page for smooth pagination
 */
export function usePrefetchPatients() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return (options: UsePaginatedPatientsOptions) => {
    const {
      page = 1,
      pageSize = 25,
      status,
      search,
      orderBy = 'created_at',
      order = 'desc',
    } = options;

    const nextPage = page + 1;

    queryClient.prefetchQuery({
      queryKey: [
        'patients-v2',
        'paginated',
        profile?.organization_id,
        nextPage,
        pageSize,
        status,
        search,
        orderBy,
        order,
      ],
      queryFn: async () => {
        const offset = (nextPage - 1) * pageSize;
        const params: Record<string, any> = {
          limit: pageSize,
          offset,
          order_by: orderBy,
          order_direction: order,
        };

        if (status) params.status = status;
        if (search) params.search = search;

        const response = await PatientServiceV2.list(params);
        const patients = response.data.map(mapPatientV2ToFrontend);

        return {
          data: patients,
          pagination: {
            page: nextPage,
            pageSize,
            total: response.total || patients.length,
            totalPages: Math.ceil((response.total || patients.length) / pageSize),
            hasNext: nextPage < Math.ceil((response.total || patients.length) / pageSize),
            hasPrev: nextPage > 1,
          },
        };
      },
    });
  };
}
