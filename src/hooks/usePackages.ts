import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/errors/logger';

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
      return (data || []).map((pkg: any) => ({
        id: pkg.id,
        name: pkg.package_name,
        description: pkg.notes,
        sessions_count: pkg.total_sessions,
        price: pkg.final_value,
        validity_days: pkg.validity_months ? pkg.validity_months * 30 : 365,
        is_active: pkg.status === 'ativo',
        organization_id: pkg.organization_id,
        created_at: pkg.created_at,
      })) as SessionPackage[];
    },
  });
}

// Hook para listar pacotes de um paciente
export function usePatientPackages(patientId: string | undefined) {
  return useQuery({
    queryKey: ['patient-packages', patientId],
    queryFn: async () => {
      if (!patientId) return [];

      const { data, error } = await supabase
        .from('patient_packages')
        .select(`
          *,
          package:session_packages(id, package_name, total_sessions, final_value)
        `)
        .eq('patient_id', patientId)
        .order('purchased_at', { ascending: false });

      if (error) throw error;

      // Calcular campos adicionais e mapear
      const enrichedData = (data || []).map(pp => {
        const remaining = pp.sessions_purchased - pp.sessions_used;
        const isExpired = pp.expires_at && new Date(pp.expires_at) < new Date();
        const pkg = pp.package as any;
        
        return {
          id: pp.id,
          patient_id: pp.patient_id,
          package_id: pp.package_id,
          sessions_purchased: pp.sessions_purchased,
          sessions_used: pp.sessions_used,
          price_paid: pp.price_paid,
          purchased_at: pp.purchased_at,
          expires_at: pp.expires_at,
          last_used_at: pp.last_used_at,
          package: pkg ? {
            id: pkg.id,
            name: pkg.package_name,
            sessions_count: pkg.total_sessions,
            price: pkg.final_value,
          } : undefined,
          sessions_remaining: remaining,
          is_expired: isExpired,
          status: isExpired ? 'expired' : remaining <= 0 ? 'depleted' : 'active',
        } as PatientPackage;
      });

      return enrichedData;
    },
    enabled: !!patientId,
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
        } as any)
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
      const validityDays = ((packageTemplate as any).validity_months || 12) * 30;
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
        } as any)
        .select(`
          *,
          package:session_packages(id, package_name, total_sessions)
        `)
        .single();

      if (error) throw error;
      const pkg = (data as any).package;
      return { ...data, package: pkg ? { name: pkg.package_name } : null };
    },
    onSuccess: (data: any, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient-packages', variables.patient_id] });
      toast.success(`Pacote "${data.package?.name || 'Novo'}" adquirido com sucesso!`);
    },
    onError: (error: any) => {
      logger.error('Erro ao comprar pacote', error, 'usePackages');
      toast.error(error.message || 'Erro ao adquirir pacote');
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
    onError: (error: any) => {
      logger.error('Erro ao usar sessão do pacote', error, 'usePackages');
      toast.error(error.message || 'Erro ao usar sessão do pacote');
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
      const updateData: Record<string, any> = {};
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
        .update({ status: 'cancelado' } as any)
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

