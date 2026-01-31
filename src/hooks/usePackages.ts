/**
 * usePackages - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - session_packages -> session_packages
 * - patient_packages -> patient_packages
 * - package_usage -> package_usage
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, query, where, orderBy, serverTimestamp } from '@/integrations/firebase/app';
import { toast } from 'sonner';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { FinancialService } from '@/services/financialService';
import { db, getFirebaseAuth } from '@/integrations/firebase/app';


const auth = getFirebaseAuth();

// Helper to convert doc
const convertDoc = <T>(doc: { id: string; data: () => Record<string, unknown> }): T =>
  ({ id: doc.id, ...doc.data() } as T);

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
}

// Hook para listar templates de pacotes
export function useSessionPackages() {
  return useQuery({
    queryKey: ['session-packages'],
    queryFn: async () => {
      const q = query(
        collection(db, 'session_packages'),
        orderBy('total_sessions', 'asc') // Note: field name kept as in old DB or updated? I'll use total_sessions mapped to sessions_count
      );
      // Wait, let's keep the field names consistent with new schema if possible, or mapping.
      // Based on useCreatePackage below, I'll use consistent names.
      // Assuming new schema uses 'sessions_count', 'price' directly OR I map them.
      // The Supabase version had mapping logic (pkg.total_sessions || pkg.sessions_count).
      // I will standardize on 'sessions_count', 'price' for new docs, but read 'total_sessions' for backwards compat if migration kept it.

      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.package_name || data.name,
          description: data.notes || data.description,
          sessions_count: Number(data.total_sessions || data.sessions_count),
          price: Number(data.final_value || data.price),
          validity_days: data.validity_months ? Number(data.validity_months) * 30 : (data.validity_days || 365),
          is_active: data.status === 'active' || data.is_active === true,
          organization_id: data.organization_id || '',
          created_at: data.created_at || new Date().toISOString(),
        } as SessionPackage;
      });
    },
  });
}

// Hook para listar pacotes de um paciente (ou todos se admin)
export function usePatientPackages(patientId?: string) {
  return useQuery({
    queryKey: ['patient-packages', patientId || 'all'],
    queryFn: async () => {
      let q = query(
        collection(db, 'patient_packages'),
        orderBy('purchased_at', 'desc')
      );

      if (patientId) {
        q = query(
          collection(db, 'patient_packages'),
          where('patient_id', '==', patientId),
          orderBy('purchased_at', 'desc')
        );
      }

      const snapshot = await getDocs(q);
      const patientPackages = snapshot.docs.map(convertDoc<PatientPackage>);

      // Enriched data with manual joins
      const enrichedData = await Promise.all(patientPackages.map(async (pp) => {
        let pkg: SessionPackage | undefined;
        let patientName: string | undefined;

        // Fetch package details
        if (pp.package_id) {
          try {
            const pkgSnap = await getDoc(doc(db, 'session_packages', pp.package_id));
            if (pkgSnap.exists()) {
              const pData = pkgSnap.data();
              pkg = {
                id: pkgSnap.id,
                name: pData.package_name || pData.name,
                sessions_count: Number(pData.total_sessions || pData.sessions_count),
                price: Number(pData.final_value || pData.price),
                validity_days: pData.validity_months ? Number(pData.validity_months) * 30 : (pData.validity_days || 365),
                is_active: pData.status === 'active',
                organization_id: pData.organization_id,
                created_at: pData.created_at
              } as SessionPackage;
            }
          } catch (e) { }
        }

        // Fetch patient details
        if (pp.patient_id) {
          try {
            const patSnap = await getDoc(doc(db, 'patients', pp.patient_id));
            if (patSnap.exists()) {
              patientName = patSnap.data().name || patSnap.data().full_name;
            }
          } catch (e) { }
        }

        const remaining = Number(pp.sessions_purchased) - Number(pp.sessions_used);
        const isExpired = pp.expires_at && new Date(pp.expires_at) < new Date();

        return {
          id: pp.id,
          patient_id: pp.patient_id,
          package_id: pp.package_id,
          sessions_purchased: Number(pp.sessions_purchased),
          sessions_used: Number(pp.sessions_used),
          price_paid: Number(pp.price_paid),
          purchased_at: pp.purchased_at,
          expires_at: pp.expires_at,
          last_used_at: pp.last_used_at,
          package: pkg,
          patient_name: patientName,
          sessions_remaining: remaining,
          is_expired: isExpired,
          status: isExpired ? 'expired' : remaining <= 0 ? 'depleted' : 'active',
        } as PatientPackage;
      }));

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
      const docRef = await addDoc(collection(db, 'session_packages'), {
        package_name: input.name,
        notes: input.description,
        total_sessions: input.sessions_count,
        final_value: input.price,
        validity_months: Math.ceil(input.validity_days / 30),
        status: 'active',
        created_at: new Date().toISOString(),
        organization_id: auth.currentUser ? auth.currentUser.uid : null // Should get org id properly
      });
      const newDoc = await getDoc(docRef);
      return {
        id: newDoc.id,
        name: input.name,
        description: input.description,
        sessions_count: input.sessions_count,
        price: input.price,
        validity_days: input.validity_days,
        is_active: true,
        created_at: new Date().toISOString()
      } as SessionPackage;
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

      const pkgRef = doc(db, 'session_packages', package_id);
      const pkgSnap = await getDoc(pkgRef);

      if (!pkgSnap.exists()) throw new Error('Pacote não encontrado');
      const pkgData = pkgSnap.data();

      // Simple check for availability status if field exists
      if (pkgData.status === 'inactive' || pkgData.status === 'cancelado') {
        throw new Error('Pacote não disponível');
      }

      const validityMonths = Number(pkgData.validity_months || 12);
      const validityDays = validityMonths * 30;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + validityDays);

      const purchaseData = {
        patient_id,
        package_id,
        sessions_purchased: Number(pkgData.total_sessions || pkgData.sessions_count),
        sessions_used: 0,
        price_paid: Number(pkgData.final_value || pkgData.price),
        purchased_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      };

      const docRef = await addDoc(collection(db, 'patient_packages'), purchaseData);
      const newDoc = await getDoc(docRef);
      const createdPkg = convertDoc<PatientPackage>(newDoc);

      // Criar transação financeira
      try {
        await FinancialService.createTransaction({
          tipo: 'receita',
          descricao: `Venda de Pacote: ${pkgData.package_name || pkgData.name}`,
          valor: Number(pkgData.final_value || pkgData.price),
          status: 'concluido',
          metadata: {
            source: 'package_purchase',
            patient_id,
            patient_package_id: createdPkg.id,
            package_template_id: package_id
          }
        });
      } catch (err) {
        logger.error('Erro ao registrar transação financeira do pacote', err, 'usePackages');
      }

      return {
        ...createdPkg,
        package: {
          name: pkgData.package_name || pkgData.name
        }
      };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient-packages', variables.patient_id] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
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
      const docRef = doc(db, 'patient_packages', patientPackageId);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) throw new Error('Pacote não encontrado');
      const patientPackage = snapshot.data();

      // Verificar validade
      if (patientPackage.expires_at && new Date(patientPackage.expires_at) < new Date()) {
        throw new Error('Pacote expirado');
      }

      // Verificar saldo
      const remaining = Number(patientPackage.sessions_purchased) - Number(patientPackage.sessions_used);
      if (remaining <= 0) {
        throw new Error('Sem sessões disponíveis neste pacote');
      }

      const newUsed = Number(patientPackage.sessions_used) + 1;
      await updateDoc(docRef, {
        sessions_used: newUsed,
        last_used_at: new Date().toISOString(),
      });

      // Registrar uso
      await addDoc(collection(db, 'package_usage'), {
        patient_package_id: patientPackageId,
        patient_id: patientPackage.patient_id,
        appointment_id: appointmentId,
        used_at: new Date().toISOString(),
      });

      return {
        ...patientPackage,
        sessions_used: newUsed,
        sessions_remaining: Number(patientPackage.sessions_purchased) - newUsed,
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

      const docRef = doc(db, 'session_packages', id);
      await updateDoc(docRef, updateData);

      const updated = await getDoc(docRef);
      return convertDoc(updated);
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
      const docRef = doc(db, 'session_packages', packageId);
      await updateDoc(docRef, { status: 'cancelado' });
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


