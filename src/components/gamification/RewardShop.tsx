import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Star, Zap, Gift, Clock, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useGamification } from '@/hooks/useGamification';
import { getFirebaseFunctions } from '@/integrations/firebase/app';
import { httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RewardItem {
  id: string;
  title: string;
  description: string;
  cost: number;
  category: 'bonus' | 'discount' | 'digital';
  icon: React.ReactNode;
}

const rewards: RewardItem[] = [
  {
    id: 'bonus_session',
    title: 'Sessão Bônus (15min)',
    description: 'Adicione 15 minutos extras de terapia manual ou ventosaterapia na sua próxima sessão.',
    cost: 1500,
    category: 'bonus',
    icon: <Zap className="w-6 h-6 text-blue-500" />
  },
  {
    id: 'discount_partner',
    title: 'Voucher Parceiro (10%)',
    description: 'Desconto em lojas de suplementos e equipamentos esportivos parceiros.',
    cost: 800,
    category: 'discount',
    icon: <Gift className="w-6 h-6 text-purple-500" />
  },
  {
    id: 'streak_freeze',
    title: 'Congelar Sequência',
    description: 'Proteja seu streak se você não conseguir treinar hoje. (Automático)',
    cost: 500,
    category: 'digital',
    icon: <Clock className="w-6 h-6 text-amber-500" />
  }
];

export function RewardShop() {
  const { totalPoints, awardXp } = useGamification(useAuth().profile?.id || '');
  const [buyingId, setBuyingId] = useState<string | null>(null);

  const handlePurchase = async (item: RewardItem) => {
    if (totalPoints < item.cost) {
      toast.error('Pontos insuficientes!');
      return;
    }

    setBuyingId(item.id);
    try {
      const functions = getFirebaseFunctions();
      const processPurchaseFn = httpsCallable(functions, 'processPurchase');
      const result = await processPurchaseFn({ itemId: item.id, cost: item.cost });
      
      const data = result.data as { success: boolean, voucherCode: string };
      
      if (data.success) {
        toast.success(`Compra realizada! Código: ${data.voucherCode}`, {
          description: `Você adquiriu: ${item.title}`,
          duration: 6000
        });
      }
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Erro ao processar compra.');
    } finally {
      setBuyingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-slate-900 text-white p-6 rounded-3xl shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12">
          <ShoppingBag className="w-32 h-32" />
        </div>
        
        <div className="relative z-10">
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-1">Seu Saldo Atual</p>
          <div className="flex items-center gap-3">
            <span className="text-4xl font-black text-yellow-400">{totalPoints.toLocaleString()}</span>
            <div className="flex flex-col">
              <span className="text-xl font-bold">Pontos</span>
              <span className="text-xs text-slate-400">Troque por vantagens reais</span>
            </div>
          </div>
        </div>

        <Button variant="outline" className="bg-white/10 border-white/20 hover:bg-white/20 text-white gap-2">
          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          Ver Histórico
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {rewards.map((item) => (
          <Card key={item.id} className="group overflow-hidden border-2 hover:border-primary/50 transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                {item.icon}
              </div>
              <CardTitle className="text-lg">{item.title}</CardTitle>
              <CardDescription className="line-clamp-2">{item.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 p-3 rounded-xl">
                <span className="text-xs font-bold text-slate-500 uppercase">Custo</span>
                <span className="text-lg font-black text-primary">{item.cost} pts</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => handlePurchase(item)}
                disabled={buyingId !== null || totalPoints < item.cost}
                className="w-full rounded-xl gap-2 h-11"
              >
                {buyingId === item.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : totalPoints < item.cost ? (
                  'Pontos Insuficientes'
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    Resgatar Agora
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center gap-3 text-slate-500">
        <CheckCircle2 className="w-5 h-5" />
        <span className="text-sm font-medium italic">Novas recompensas são adicionadas mensalmente com base na sua performance.</span>
      </div>
    </div>
  );
}
