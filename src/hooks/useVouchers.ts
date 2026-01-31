/**
 * useVouchers - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('vouchers') → Firestore collection 'vouchers'
 * - supabase.from('user_vouchers') → Firestore collection 'user_vouchers'
 * - supabase.auth.getUser() → Firebase Auth context
 * - supabase.rpc() → Direct Firestore operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, query, where, orderBy,  } from '@/integrations/firebase/app';
import { toast } from 'sonner';
import { db } from '@/integrations/firebase/app';
import { useAuth } from '@/contexts/AuthContext';



export interface Voucher {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: 'pacote' | 'mensal' | 'trimestral' | 'semestral';
  sessoes: number | null;
  validade_dias: number;
  preco: number;
  ativo: boolean;
  stripe_price_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserVoucher {
  id: string;
  user_id: string;
  voucher_id: string;
  sessoes_restantes: number;
  sessoes_totais: number;
  data_compra: string;
  data_expiracao: string;
  ativo: boolean;
  valor_pago: number;
  voucher?: Voucher;
}

export function useVouchers() {
  return useQuery({
    queryKey: ['vouchers'],
    queryFn: async () => {
      const q = query(
        collection(db, 'vouchers'),
        where('ativo', '==', true),
        orderBy('preco', 'asc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Voucher[];
    },
  });
}

export function useUserVouchers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-vouchers'],
    queryFn: async () => {
      if (!user) throw new Error('Usuário não autenticado');

      const q = query(
        collection(db, 'user_vouchers'),
        where('user_id', '==', user.uid),
        orderBy('data_compra', 'desc')
      );

      const snapshot = await getDocs(q);
      const userVouchers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fetch voucher data for each user voucher
      interface UserVoucherRaw {
        id: string;
        voucher_id?: string;
        [key: string]: unknown;
      }

      const voucherIds = userVouchers.map((uv: UserVoucherRaw) => uv.voucher_id).filter((id): id is string => id !== null);
      const voucherMap = new Map<string, Voucher>();

      await Promise.all([...new Set(voucherIds)].map(async (voucherId) => {
        const voucherDoc = await getDoc(doc(db, 'vouchers', voucherId));
        if (voucherDoc.exists()) {
          voucherMap.set(voucherId, { id: voucherId, ...voucherDoc.data() } as Voucher);
        }
      }));

      return userVouchers.map((uv: UserVoucherRaw) => ({
        ...uv,
        voucher: voucherMap.get(uv.voucher_id as string),
      })) as UserVoucher[];
    },
    enabled: !!user,
  });
}

export function useCreateVoucher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (voucher: Omit<Voucher, 'id' | 'created_at' | 'updated_at'>) => {
      const voucherData = {
        ...voucher,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'vouchers'), voucherData);
      const docSnap = await getDoc(docRef);

      return { id: docRef.id, ...docSnap.data() };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vouchers'] });
      toast.success('Voucher criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar voucher: ' + error.message);
    },
  });
}

export function useUpdateVoucher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Voucher> & { id: string }) => {
      const docRef = doc(db, 'vouchers', id);
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      await updateDoc(docRef, updateData);

      const docSnap = await getDoc(docRef);
      return { id, ...docSnap.data() };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vouchers'] });
      toast.success('Voucher atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar voucher: ' + error.message);
    },
  });
}

export function useDecrementVoucherSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userVoucherId: string) => {
      const docRef = doc(db, 'user_vouchers', userVoucherId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Voucher não encontrado');
      }

      const currentData = docSnap.data();
      const sessoesRestantes = currentData?.sessoes_restantes || 0;

      if (sessoesRestantes <= 0) {
        throw new Error('Voucher inválido ou sem sessões disponíveis');
      }

      await updateDoc(docRef, {
        sessoes_restantes: sessoesRestantes - 1,
      });

      // Return updated data
      const updatedSnap = await getDoc(docRef);
      return { id: userVoucherId, ...updatedSnap.data() };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-vouchers'] });
      toast.success('Sessão descontada do voucher');
    },
    onError: (error: Error) => {
      toast.error('Erro ao descontar sessão: ' + error.message);
    },
  });
}

export function useDeleteVoucher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'vouchers', id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vouchers'] });
      toast.success('Voucher excluído com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir voucher: ' + error.message);
    },
  });
}

export function useAllVouchers() {
  return useQuery({
    queryKey: ['all-vouchers'],
    queryFn: async () => {
      const q = query(
        collection(db, 'vouchers'),
        orderBy('created_at', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Voucher[];
    },
  });
}
