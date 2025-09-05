import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Voucher {
  id: string;
  name: string;
  description: string;
  price: number;
  sessions_included: number | null;
  validity_days: number;
  is_unlimited: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface VoucherPurchase {
  id: string;
  patient_id: string;
  voucher_id: string;
  purchased_by: string;
  purchase_date: string;
  expiry_date: string;
  sessions_remaining: number | null;
  status: 'active' | 'expired' | 'cancelled';
  payment_method: string | null;
  payment_id: string | null;
  amount_paid: number;
  created_at: string;
  updated_at: string;
}

export function useVouchers() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [purchases, setPurchases] = useState<VoucherPurchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVouchers();
    loadPurchases();
  }, []);

  const loadVouchers = async () => {
    try {
      const { data, error } = await supabase
        .from('vouchers')
        .select('*')
        .eq('is_active', true)
        .order('price');

      if (error) throw error;
      setVouchers(data || []);
    } catch (error) {
      console.error('Error loading vouchers:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os vouchers.",
        variant: "destructive"
      });
    }
  };

  const loadPurchases = async () => {
    try {
      const { data, error } = await supabase
        .from('voucher_purchases')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPurchases((data || []) as VoucherPurchase[]);
    } catch (error) {
      console.error('Error loading purchases:', error);
    } finally {
      setLoading(false);
    }
  };

  const createVoucherPurchase = async (
    patientId: string,
    voucherId: string,
    paymentData: {
      payment_method: string;
      payment_id: string;
      amount_paid: number;
    }
  ) => {
    try {
      const voucher = vouchers.find(v => v.id === voucherId);
      if (!voucher) throw new Error('Voucher não encontrado');

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + voucher.validity_days);

      const { data, error } = await supabase
        .from('voucher_purchases')
        .insert({
          patient_id: patientId,
          voucher_id: voucherId,
          expiry_date: expiryDate.toISOString(),
          sessions_remaining: voucher.sessions_included,
          payment_method: paymentData.payment_method,
          payment_id: paymentData.payment_id,
          amount_paid: paymentData.amount_paid,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      // Create commission record
      const commissionRate = 85; // 85% for partner
      const commissionAmount = (paymentData.amount_paid * commissionRate) / 100;
      const platformFee = paymentData.amount_paid - commissionAmount;

      await supabase
        .from('partner_commissions')
        .insert({
          partner_id: 'partner-user-id', // This should be the actual partner's user ID
          voucher_purchase_id: data.id,
          commission_rate: commissionRate,
          gross_amount: paymentData.amount_paid,
          commission_amount: commissionAmount,
          platform_fee: platformFee,
          status: 'pending'
        });

      await loadPurchases();
      
      toast({
        title: "Voucher adquirido!",
        description: "O voucher foi ativado com sucesso.",
      });

      return { data, error: null };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Não foi possível processar a compra.";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      });
      return { data: null, error };
    }
  };

  const updatePurchaseStatus = async (purchaseId: string, status: 'active' | 'expired' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('voucher_purchases')
        .update({ status })
        .eq('id', purchaseId);

      if (error) throw error;

      await loadPurchases();
      
      toast({
        title: "Status atualizado",
        description: "O status do voucher foi atualizado com sucesso.",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Não foi possível atualizar o status.";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const useSession = async (purchaseId: string) => {
    try {
      const purchase = purchases.find(p => p.id === purchaseId);
      if (!purchase) throw new Error('Compra não encontrada');

      if (purchase.sessions_remaining && purchase.sessions_remaining > 0) {
        const { error } = await supabase
          .from('voucher_purchases')
          .update({ 
            sessions_remaining: purchase.sessions_remaining - 1,
            status: purchase.sessions_remaining === 1 ? 'expired' : 'active'
          })
          .eq('id', purchaseId);

        if (error) throw error;
        await loadPurchases();
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Não foi possível usar a sessão.";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  return {
    vouchers,
    purchases,
    loading,
    createVoucherPurchase,
    updatePurchaseStatus,
    useSession,
    refreshVouchers: loadVouchers,
    refreshPurchases: loadPurchases
  };
}