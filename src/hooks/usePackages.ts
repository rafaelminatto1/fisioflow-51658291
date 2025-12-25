import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
        .eq('is_active', true)
        .order('sessions_count', { ascending: true });

      if (error) throw error;
      return data as SessionPackage[];
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
          package:session_packages(id, name, sessions_count, price)
        `)
        .eq('patient_id', patientId)
        .order('purchased_at', { ascending: false });

      if (error) throw error;

      // Calcular campos adicionais
      const enrichedData = (data || []).map(pp => {
        const remaining = pp.sessions_purchased - pp.sessions_used;
        const isExpired = pp.expires_at && new Date(pp.expires_at) < new Date();
        
        return {
          ...pp,
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
          ...input,
          is_active: true,
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
      console.error('Erro ao criar pacote:', error);
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
        .eq('is_active', true)
        .single();

      if (packageError) throw new Error('Pacote não encontrado');
      if (!packageTemplate) throw new Error('Pacote não disponível');

      // Calcular data de expiração
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + packageTemplate.validity_days);

      // Criar pacote do paciente
      const { data, error } = await supabase
        .from('patient_packages')
        .insert({
          patient_id,
          package_id,
          sessions_purchased: packageTemplate.sessions_count,
          sessions_used: 0,
          price_paid: packageTemplate.price,
          purchased_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        })
        .select(`
          *,
          package:session_packages(id, name, sessions_count)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient-packages', variables.patient_id] });
      toast.success(`Pacote "${data.package?.name}" adquirido com sucesso!`);
    },
    onError: (error: any) => {
      console.error('Erro ao comprar pacote:', error);
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
      console.error('Erro ao usar sessão:', error);
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
      ...data 
    }: Partial<SessionPackage> & { id: string }) => {
      const { data: updated, error } = await supabase
        .from('session_packages')
        .update(data)
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
      console.error('Erro ao atualizar pacote:', error);
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
        .update({ is_active: false })
        .eq('id', packageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-packages'] });
      toast.success('Pacote desativado');
    },
    onError: (error) => {
      console.error('Erro ao desativar pacote:', error);
      toast.error('Erro ao desativar pacote');
    },
  });
}

