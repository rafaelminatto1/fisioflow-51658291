import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/errors/logger';
import { FinancialService } from '@/services/financialService';

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
  package_id: string;
  sessions_purchased: number;
  sessions_used: number;
  price_paid: number;
  purchased_at: string;
  expires_at: string;
  last_used_at?: string;
  package?: SessionPackage;
  // Campos calculados
  sessions_remaining?: number;
  is_expired?: boolean;
  status?: 'active' | 'expired' | 'depleted';
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
}

// Hook para listar templates de pacotes
export function useSessionPackages() {
  return useQuery({
    queryKey: ['session-packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_packages')
        .select('*')
        .order('total_sessions', { ascending: true });

      if (error) throw error;
      // Mapear para a interface esperada
      return (data || []).map((pkg: SessionPackage | Record<string, unknown>) => ({
        id: String(pkg.id),
        name: String((pkg as Record<string, unknown>).package_name || pkg.name),
        description: (pkg as Record<string, unknown>).notes as string | undefined,
        sessions_count: Number((pkg as Record<string, unknown>).total_sessions || pkg.sessions_count),
        price: Number((pkg as Record<string, unknown>).final_value || pkg.price),
        validity_days: (pkg as Record<string, unknown>).validity_months ? Number((pkg as Record<string, unknown>).validity_months) * 30 : 365,
        is_active: ((pkg as Record<string, unknown>).status as string) === 'ativo',
        organization_id: String(pkg.organization_id),
        created_at: String(pkg.created_at),
      })) as SessionPackage[];
    },
  });
}

// Hook para listar pacotes de um paciente (ou todos se admin)
export function usePatientPackages(patientId?: string) {
  return useQuery({
    queryKey: ['patient-packages', patientId || 'all'],
    queryFn: async () => {
      let query = supabase
        .from('patient_packages')
        .select(`
          *,
          package:session_packages(id, package_name, total_sessions, final_value),
          patient:patients(id, name)
        `)
        .order('purchased_at', { ascending: false });

      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Calcular campos adicionais e mapear
      const enrichedData = (data || []).map((pp: any) => {
        const remaining = pp.sessions_purchased - pp.sessions_used;
        const isExpired = pp.expires_at && new Date(pp.expires_at) < new Date();
        const pkg = pp.package;

        return {
          id: String(pp.id),
          patient_id: String(pp.patient_id),
          package_id: String(pp.package_id),
          sessions_purchased: Number(pp.sessions_purchased),
          sessions_used: Number(pp.sessions_used),
          price_paid: Number(pp.price_paid),
          purchased_at: String(pp.purchased_at),
          expires_at: String(pp.expires_at),
          last_used_at: pp.last_used_at ? String(pp.last_used_at) : undefined,
          package: pkg ? {
            id: String(pkg.id),
            name: String(pkg.package_name || pkg.name || ''),
            sessions_count: Number(pkg.total_sessions || pkg.sessions_count || 0),
            price: Number(pkg.final_value || pkg.price || 0),
          } : undefined,
          patient_name: pp.patient?.name, // Added for reporting
          sessions_remaining: remaining,
          is_expired: isExpired,
          status: isExpired ? 'expired' : remaining <= 0 ? 'depleted' : 'active',
        } as PatientPackage & { patient_name?: string };
      });

      return enrichedData;
    },
  });
}

// Hook para obter saldo total de pacotes do paciente
export function usePatientPackageBalance(patientId: string | undefined) {
  const { data: packages, isLoading } = usePatientPackages(patientId);

  const activePackages = packages?.filter(p => p.status === 'active') || [];
  const totalRemaining = activePackages.reduce((sum, p) => sum + (p.sessions_remaining || 0), 0);

  const nearExpiration = activePackages.filter(p => {
    if (!p.expires_at) return false;
    const daysUntilExpiration = Math.ceil(
      (new Date(p.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
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

// Hook para criar template de pacote
export function useCreatePackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePackageInput) => {
      const { data, error } = await supabase
        .from('session_packages')
        .insert({
          package_name: input.name,
          notes: input.description,
          total_sessions: input.sessions_count,
          final_value: input.price,
          validity_months: Math.ceil(input.validity_days / 30),
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-packages'] });
      toast.success('Pacote criado com sucesso!');
    },
    onError: (error) => {
      logger.error('Erro ao criar pacote', error, 'usePackages');
      toast.error('Erro ao criar pacote');
    },
  });
}

// Hook para comprar pacote para paciente
export function usePurchasePackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PurchasePackageInput) => {
      const { patient_id, package_id } = input;

      // Buscar detalhes do pacote template
      const { data: packageTemplate, error: packageError } = await supabase
        .from('session_packages')
        .select('*')
        .eq('id', package_id)
        .single();

      if (packageError) throw new Error('Pacote não encontrado');
      if (!packageTemplate) throw new Error('Pacote não disponível');

      // Calcular data de expiração (usar validity_months ou padrão de 12 meses)
      const validityDays = ((packageTemplate as Record<string, unknown>).validity_months as number | undefined) || 12 * 30;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + validityDays);

      // Criar pacote do paciente
      const { data, error } = await supabase
        .from('patient_packages')
        .insert({
          patient_id,
          package_id,
          sessions_purchased: packageTemplate.total_sessions,
          sessions_used: 0,
          price_paid: packageTemplate.final_value,
          purchased_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        })
        .select(`
          *,
          package:session_packages(id, package_name, total_sessions)
        `)
        .single();

      if (error) throw error;
      const pkg = (data as Record<string, unknown>).package as Record<string, unknown> | undefined;
      // Criar transação financeira
      try {
        await FinancialService.createTransaction({
          tipo: 'receita',
          descricao: `Venda de Pacote: ${packageTemplate.package_name}`,
          valor: Number(packageTemplate.final_value),
          status: 'concluido',
          metadata: {
            source: 'package_purchase',
            patient_id,
            patient_package_id: data.id,
            package_template_id: package_id
          }
        });
      } catch (err) {
        logger.error('Erro ao registrar transação financeira do pacote', err, 'usePackages');
        // Não falha a compra do pacote se a transação falhar, apenas loga
      }

      return { ...data, package: pkg ? { name: String(pkg.package_name) } : null };
    },
    onSuccess: (_data: unknown, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient-packages', variables.patient_id] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] }); // Atualiza dashboard financeiro
      toast.success(`Pacote adquirido com sucesso!`);
    },
    onError: (error: unknown) => {
      logger.error('Erro ao comprar pacote', error, 'usePackages');
      toast.error(error instanceof Error ? error.message : 'Erro ao adquirir pacote');
    },
  });
}

// Hook para usar sessão do pacote
export function useUsePackageSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      patientPackageId,
      appointmentId
    }: {
      patientPackageId: string;
      appointmentId?: string;
    }) => {
      // Buscar pacote do paciente
      const { data: patientPackage, error: fetchError } = await supabase
        .from('patient_packages')
        .select('*')
        .eq('id', patientPackageId)
        .single();

      if (fetchError) throw new Error('Pacote não encontrado');

      // Verificar validade
      if (patientPackage.expires_at && new Date(patientPackage.expires_at) < new Date()) {
        throw new Error('Pacote expirado');
      }

      // Verificar saldo
      const remaining = patientPackage.sessions_purchased - patientPackage.sessions_used;
      if (remaining <= 0) {
        throw new Error('Sem sessões disponíveis neste pacote');
      }

      // Usar uma sessão
      const { data, error } = await supabase
        .from('patient_packages')
        .update({
          sessions_used: patientPackage.sessions_used + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', patientPackageId)
        .select()
        .single();

      if (error) throw error;

      // Registrar uso
      await supabase.from('package_usage').insert({
        patient_package_id: patientPackageId,
        patient_id: patientPackage.patient_id,
        appointment_id: appointmentId,
        used_at: new Date().toISOString(),
      });

      return {
        ...data,
        sessions_remaining: data.sessions_purchased - data.sessions_used,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patient-packages'] });
      toast.success(`Sessão utilizada. Restam ${data.sessions_remaining} sessões.`);
    },
    onError: (error: unknown) => {
      logger.error('Erro ao usar sessão do pacote', error, 'usePackages');
      toast.error(error instanceof Error ? error.message : 'Erro ao usar sessão do pacote');
    },
  });
}

// Hook para atualizar template de pacote
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
      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.package_name = name;
      if (description !== undefined) updateData.notes = description;
      if (sessions_count !== undefined) updateData.total_sessions = sessions_count;
      if (price !== undefined) updateData.final_value = price;
      if (validity_days !== undefined) updateData.validity_months = Math.ceil(validity_days / 30);
      if (is_active !== undefined) updateData.status = is_active ? 'active' : 'inactive';

      const { data: updated, error } = await supabase
        .from('session_packages')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-packages'] });
      toast.success('Pacote atualizado!');
    },
    onError: (error) => {
      logger.error('Erro ao atualizar pacote', error, 'usePackages');
      toast.error('Erro ao atualizar pacote');
    },
  });
}

// Hook para desativar template de pacote
export function useDeactivatePackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (packageId: string) => {
      const { error } = await supabase
        .from('session_packages')
        .update({ status: 'cancelado' })
        .eq('id', packageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-packages'] });
      toast.success('Pacote desativado');
    },
    onError: (error) => {
      logger.error('Erro ao desativar pacote', error, 'usePackages');
      toast.error('Erro ao desativar pacote');
    },
  });
}

