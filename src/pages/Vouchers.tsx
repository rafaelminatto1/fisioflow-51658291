import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Clock, Users, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
}

interface VoucherCardProps {
  voucher: Voucher;
  onPurchase: (voucherId: string) => void;
  loading: boolean;
}

function VoucherCard({ voucher, onPurchase, loading }: VoucherCardProps) {
  const getIcon = () => {
    if (voucher.is_unlimited) return <Zap className="w-8 h-8 text-primary" />;
    if (voucher.sessions_included === 1) return <Clock className="w-8 h-8 text-secondary" />;
    return <Users className="w-8 h-8 text-accent" />;
  };

  const getDiscount = () => {
    if (voucher.sessions_included === 4) {
      const singlePrice = 100; // Preço da sessão avulsa
      const totalSingle = singlePrice * 4;
      const discount = ((totalSingle - voucher.price) / totalSingle) * 100;
      return Math.round(discount);
    }
    return null;
  };

  const discount = getDiscount();

  return (
    <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-105">
      {discount && (
        <Badge className="absolute top-3 right-3 bg-secondary text-secondary-foreground">
          {discount}% OFF
        </Badge>
      )}
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          {getIcon()}
        </div>
        <CardTitle className="text-xl">{voucher.name}</CardTitle>
        <div className="text-3xl font-bold text-primary">
          R$ {voucher.price.toFixed(2)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-center">{voucher.description}</p>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Sessões:</span>
            <span className="font-medium">
              {voucher.is_unlimited ? 'Ilimitadas' : voucher.sessions_included}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Validade:</span>
            <span className="font-medium">{voucher.validity_days} dias</span>
          </div>
          {voucher.sessions_included && voucher.sessions_included > 1 && (
            <div className="flex justify-between text-sm">
              <span>Valor por sessão:</span>
              <span className="font-medium text-secondary">
                R$ {(voucher.price / voucher.sessions_included).toFixed(2)}
              </span>
            </div>
          )}
        </div>

        <div className="pt-4 border-t">
          <ul className="text-sm space-y-1 text-muted-foreground mb-4">
            <li>✓ Treino personalizado</li>
            <li>✓ Acompanhamento profissional</li>
            <li>✓ Complemento ao tratamento</li>
            {voucher.is_unlimited && <li>✓ Flexibilidade total</li>}
          </ul>
        </div>

        <Button 
          className="w-full" 
          onClick={() => onPurchase(voucher.id)}
          disabled={loading}
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          Comprar Voucher
        </Button>
      </CardContent>
    </Card>
  );
}

export default function Vouchers() {
  const { user } = useAuth();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    loadVouchers();
  }, []);

  const loadVouchers = async () => {
    try {
      // Mock data - tabela vouchers ainda não existe
      const mockVouchers: Voucher[] = [
        {
          id: '1',
          name: 'Sessão Avulsa',
          description: 'Ideal para experimentar ou treinos pontuais',
          price: 100,
          sessions_included: 1,
          validity_days: 30,
          is_unlimited: false,
          is_active: true
        },
        {
          id: '2',
          name: 'Pacote 4 Sessões',
          description: 'Melhor custo-benefício para treinos semanais',
          price: 320,
          sessions_included: 4,
          validity_days: 60,
          is_unlimited: false,
          is_active: true
        },
        {
          id: '3',
          name: 'Plano Mensal',
          description: 'Acesso ilimitado durante 30 dias',
          price: 450,
          sessions_included: null,
          validity_days: 30,
          is_unlimited: true,
          is_active: true
        }
      ];
      setVouchers(mockVouchers);
    } catch (error) {
      console.error('Error loading vouchers:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os vouchers.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (voucherId: string) => {
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Faça login para comprar vouchers.",
        variant: "destructive"
      });
      return;
    }

    setPurchasing(true);
    try {
      console.log('Purchasing voucher:', voucherId);
      // Por enquanto, apenas mostra mensagem de sucesso
      // A integração com Stripe será implementada posteriormente
      toast({
        title: "Funcionalidade em desenvolvimento",
        description: "A compra de vouchers será implementada em breve com integração ao Stripe.",
      });
    } catch (error) {
      console.error('Error purchasing voucher:', error);
      toast({
        title: "Erro",
        description: "Não foi possível processar a compra.",
        variant: "destructive"
      });
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Treinos Complementares</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Potencialize seu tratamento fisioterápico com treinos personalizados 
            conduzidos por nossa educadora física parceira.
          </p>
        </div>

        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-6 text-center">
          <h2 className="text-2xl font-bold mb-2">Por que treinar conosco?</h2>
          <p className="text-muted-foreground">
            Nossos treinos são especialmente desenvolvidos para complementar seu tratamento fisioterápico,
            com comunicação direta entre profissionais para garantir os melhores resultados.
          </p>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="w-16 h-16 bg-muted rounded-full mx-auto"></div>
                  <div className="h-6 bg-muted rounded w-3/4 mx-auto"></div>
                  <div className="h-8 bg-muted rounded w-1/2 mx-auto"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded"></div>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {vouchers.map((voucher) => (
              <VoucherCard
                key={voucher.id}
                voucher={voucher}
                onPurchase={handlePurchase}
                loading={purchasing}
              />
            ))}
          </div>
        )}

        <div className="mt-12 bg-muted/50 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4 text-center">Como funciona?</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                1
              </div>
              <h4 className="font-medium">Escolha seu voucher</h4>
              <p className="text-sm text-muted-foreground">
                Selecione o pacote que melhor atende suas necessidades
              </p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-secondary text-secondary-foreground rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                2
              </div>
              <h4 className="font-medium">Agende sua sessão</h4>
              <p className="text-sm text-muted-foreground">
                Entre em contato para agendar seus treinos
              </p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-accent text-accent-foreground rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                3
              </div>
              <h4 className="font-medium">Treine e evolua</h4>
              <p className="text-sm text-muted-foreground">
                Participe dos treinos e acompanhe sua evolução
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}