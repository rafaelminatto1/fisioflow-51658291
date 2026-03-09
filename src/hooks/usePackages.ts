/**
 * usePackages - Migrated to Neon/Workers
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  financialApi,
  type PatientPackageRow,
  type SessionPackageTemplateRow,
} from '@/lib/api/workers-client';

export interface SessionPackage {
  id: string;
  name: string;
  description?: string;
  sessions_count: number;
  price: number;
  validity_days: number;
  is_active: boolean;
  organization_id: string;
  created_at: string;
}

export interface PatientPackage {
  id: string;
  patient_id: string;
  package_id?: string;
  sessions_purchased: number;
  sessions_used: number;
  price_paid: number;
  purchased_at: string;
  expires_at: string;
  last_used_at?: string;
  package?: SessionPackage;
  sessions_remaining?: number;
  is_expired?: boolean;
  status?: 'active' | 'expired' | 'depleted';
  patient_name?: string;
}

interface CreatePackageInput {
  name: string;
  description?: string;
  sessions_count: number;
  price: number;
  validity_days: number;
}

interface PurchasePackageInput {
  patient_id: string;
  package_id: string;
  custom_sessions?: number;
  custom_price?: number;
  payment_method?: string;
}

const mapTemplate = (row: SessionPackageTemplateRow): SessionPackage => ({
  id: row.id,
  name: row.name,
  description: row.description ?? undefined,
  sessions_count: Number(row.sessions_count),
  price: Number(row.price),
  validity_days: Number(row.validity_days),
  is_active: Boolean(row.is_active),
  organization_id: row.organization_id,
  created_at: row.created_at,
});

const mapPatientPackage = (row: PatientPackageRow): PatientPackage => {
  const remaining = Number(row.remaining_sessions ?? 0);
  const isExpired = !!row.expires_at && new Date(row.expires_at) < new Date();

  return {
    id: row.id,
    patient_id: row.patient_id,
    package_id: row.package_template_id ?? undefined,
    sessions_purchased: Number(row.total_sessions),
    sessions_used: Number(row.used_sessions),
    price_paid: Number(row.price ?? 0),
    purchased_at: row.purchased_at ?? row.created_at,
    expires_at: row.expires_at ?? row.created_at,
    last_used_at: row.last_used_at ?? undefined,
    package: {
      id: row.package_template_id ?? row.id,
      name: row.name,
      sessions_count: Number(row.total_sessions),
      price: Number(row.price ?? 0),
      validity_days: row.expires_at && row.purchased_at
        ? Math.max(
            1,
            Math.round(
              (new Date(row.expires_at).getTime() - new Date(row.purchased_at).getTime()) /
                (1000 * 60 * 60 * 24),
            ),
          )
        : 365,
      is_active: row.status === 'active',
      organization_id: '',
      created_at: row.created_at,
    },
    patient_name: row.patient_name ?? undefined,
    sessions_remaining: remaining,
    is_expired: isExpired,
    status: isExpired ? 'expired' : remaining <= 0 ? 'depleted' : 'active',
  };
};

export function useSessionPackages() {
  return useQuery({
    queryKey: ['session-packages'],
    queryFn: async () => {
      const res = await financialApi.packageTemplates.list();
      return ((res.data ?? []) as SessionPackageTemplateRow[]).map(mapTemplate);
    },
  });
}

export function usePatientPackages(patientId?: string) {
  return useQuery({
    queryKey: ['patient-packages', patientId || 'all'],
    queryFn: async () => {
      const res = await financialApi.patientPackages.list({
        patientId,
        limit: 100,
        offset: 0,
      });
      return ((res.data ?? []) as PatientPackageRow[]).map(mapPatientPackage);
    },
  });
}

export function usePatientPackageBalance(patientId: string | undefined) {
  const { data: packages, isLoading } = usePatientPackages(patientId);

  const activePackages = packages?.filter((p) => p.status === 'active') || [];
  const totalRemaining = activePackages.reduce((sum, p) => sum + (p.sessions_remaining || 0), 0);
  const nearExpiration = activePackages.filter((p) => {
    if (!p.expires_at) return false;
    const daysUntilExpiration = Math.ceil(
      (new Date(p.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    return daysUntilExpiration <= 7;
  });

  return {
    totalRemaining,
    activePackages: activePackages.length,
    nearExpiration: nearExpiration.length,
    packages: activePackages,
    isLoading,
  };
}

export function useCreatePackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePackageInput) => {
      const res = await financialApi.packageTemplates.create(input);
      return mapTemplate(res.data as SessionPackageTemplateRow);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-packages'] });
      toast.success('Pacote criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar pacote: ' + error.message);
    },
  });
}

export function usePurchasePackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PurchasePackageInput) => {
      const res = await financialApi.patientPackages.create(input);
      return mapPatientPackage(res.data as PatientPackageRow);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient-packages', variables.patient_id] });
      queryClient.invalidateQueries({ queryKey: ['patient-packages', 'all'] });
      toast.success('Pacote adquirido com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao adquirir pacote');
    },
  });
}

export function useUsePackageSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      patientPackageId,
      appointmentId,
    }: {
      patientPackageId: string;
      appointmentId?: string;
    }) => {
      const res = await financialApi.patientPackages.consume(patientPackageId, { appointmentId });
      return mapPatientPackage(res.data as PatientPackageRow);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patient-packages'] });
      toast.success(`Sessão utilizada. Restam ${data.sessions_remaining} sessões.`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao usar sessão do pacote');
    },
  });
}

export function useUpdatePackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      name,
      description,
      sessions_count,
      price,
      validity_days,
      is_active,
    }: Partial<SessionPackage> & { id: string }) => {
      const res = await financialApi.packageTemplates.update(id, {
        name,
        description,
        sessions_count,
        price,
        validity_days,
        is_active,
      });
      return mapTemplate(res.data as SessionPackageTemplateRow);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-packages'] });
      toast.success('Pacote atualizado!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar pacote: ' + error.message);
    },
  });
}

export function useDeactivatePackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (packageId: string) => {
      await financialApi.packageTemplates.delete(packageId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-packages'] });
      toast.success('Pacote desativado');
    },
    onError: (error: Error) => {
      toast.error('Erro ao desativar pacote: ' + error.message);
    },
  });
}
