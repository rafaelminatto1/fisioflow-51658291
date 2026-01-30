import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGamification } from '@/hooks/useGamification';
import { useAuth } from '@/contexts/AuthContext';
import { ShoppingBag, Coins, Sparkles, Shield, Clock, Ticket } from 'lucide-react';
import { motion } from 'framer-motion';
import GamificationHeader from '@/components/gamification/GamificationHeader';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'streak_freeze' | 'avatar' | 'title' | 'boost' | 'special';
  icon: string;
  stock?: number;
  limited?: boolean;
}

// Mock shop items - in production these would come from database
const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'streak_freeze_1',
    name: 'Congelar Sequência',
    description: 'Proteja sua sequência por um dia caso você esqueça de treinar',
    price: 100,
    category: 'streak_freeze',
    icon: 'Shield',
  },
  {
    id: 'xp_boost_small',
    name: 'Boost de XP (Pequeno)',
    description: 'Ganhe 50% mais XP na próxima sessão',
    price: 150,
    category: 'boost',
    icon: 'Sparkles',
  },
  {
    id: 'xp_boost_large',
    name: 'Boost de XP (Grande)',
    description: 'Ganhe 100% mais XP nas próximas 3 sessões',
    price: 400,
    category: 'boost',
    icon: 'Sparkles',
  },
  {
    id: 'title_warrior',
    name: 'Título: Guerreiro',
    description: 'Desbloqueie o título exclusivo "Guerreiro" para seu perfil',
    price: 500,
    category: 'title',
    icon: 'Ticket',
  },
  {
    id: 'title_champion',
    name: 'Título: Campeão',
    description: 'Desbloqueie o título exclusivo "Campeão" para seu perfil',
    price: 1000,
    category: 'title',
    icon: 'Ticket',
  },
  {
    id: 'avatar_gold',
    name: 'Avatar Dourado',
    description: 'Desbloqueie o frame dourado para seu avatar',
    price: 2000,
    category: 'avatar',
    icon: 'Sparkles',
    limited: true,
    stock: 10,
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

const ICON_MAP: Record<string, React.ElementType> = {
  Shield,
  Sparkles,
  Ticket,
  Clock,
  ShoppingBag,
};

export default function GamificationShopPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    profile,
    xpPerLevel,
    patientInventory
  } = useGamification(user?.id || '');

  const [selectedCategory, setSelectedCategory] = useState<'all' | 'streak_freeze' | 'avatar' | 'title' | 'boost' | 'special'>('all');
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const currentPoints = profile?.total_points || 0;

  // Filter items by category
  const filteredItems = SHOP_ITEMS.filter(item => {
    if (selectedCategory === 'all') return true;
    return item.category === selectedCategory;
  });

  // Check if item is already owned
  const isOwned = (itemId: string) => {
    return patientInventory?.some(inv => inv.item_id === itemId);
  };

  const handlePurchase = async (item: ShopItem) => {
    if (currentPoints < item.price) {
      toast({
        title: 'Pontos insuficientes',
        description: `Você precisa de ${item.price - currentPoints} pontos a mais para comprar este item.`,
        variant: 'destructive',
      });
      return;
    }

    setPurchasing(item.id);

    try {
      // In production, this would call an API to purchase the item
      // For now, just show a success message
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: 'Compra realizada!',
        description: `Você adquiriu ${item.name} por ${item.price} pontos.`,
      });

      // Refresh the gamification data
      // The actual implementation would update the database
    } catch (error) {
      toast({
        title: 'Erro na compra',
        description: 'Não foi possível completar a compra. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setPurchasing(null);
    }
  };

  const categoryLabels: Record<string, string> = {
    all: 'Todos',
    streak_freeze: 'Proteção',
    avatar: 'Avatares',
    title: 'Títulos',
    boost: 'Boosts',
    special: 'Especiais',
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50/50 pb-20">
        <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <ShoppingBag className="w-8 h-8 text-primary" />
                Loja de Recompensas
              </h1>
              <p className="text-muted-foreground mt-1">
                Troque seus pontos por recompensas exclusivas
              </p>
            </div>
            <Card className="px-4 py-2 bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-yellow-500" />
                <span className="font-bold text-lg text-yellow-700">{currentPoints}</span>
                <span className="text-sm text-yellow-600">pontos</span>
              </div>
            </Card>
          </div>

          {/* Quick Stats */}
          <GamificationHeader
            level={profile?.level || 1}
            currentXp={profile?.current_xp || 0}
            xpPerLevel={xpPerLevel}
            streak={profile?.current_streak || 0}
          />

          {/* Category Tabs */}
          <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as 'all' | 'streak_freeze' | 'avatar' | 'title' | 'boost' | 'special')}>
            <ScrollArea className="w-full">
              <TabsList className="w-full justify-start">
                {(Object.keys(categoryLabels) as Array<keyof typeof categoryLabels>).map((cat) => (
                  <TabsTrigger key={cat} value={cat} className="gap-2">
                    {categoryLabels[cat]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </ScrollArea>
          </Tabs>

          {/* Shop Items Grid */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredItems.map((item) => {
              const Icon = ICON_MAP[item.icon] || Sparkles;
              const owned = isOwned(item.id);
              const canAfford = currentPoints >= item.price;
              const outOfStock = item.limited && item.stock !== undefined && item.stock <= 0;

              return (
                <motion.div
                  key={item.id}
                  variants={item}
                  whileHover={{ scale: 1.02, y: -4 }}
                  className={`
                    relative overflow-hidden rounded-xl border-2 transition-all
                    ${owned
                      ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
                      : outOfStock
                        ? 'bg-gray-50 border-gray-200 opacity-60'
                        : 'bg-white hover:border-primary/50 shadow-sm hover:shadow-md'
                    }
                  `}
                >
                  {item.limited && item.stock !== undefined && item.stock <= 5 && (
                    <div className="absolute top-3 right-3 z-10">
                      <Badge variant="destructive" className="text-xs">
                        Últimas {item.stock} unidades!
                      </Badge>
                    </div>
                  )}

                  {owned && (
                    <div className="absolute top-3 left-3 z-10">
                      <Badge variant="default" className="text-xs bg-green-500">
                        Adquirido
                      </Badge>
                    </div>
                  )}

                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`
                        w-16 h-16 rounded-xl flex items-center justify-center text-2xl shrink-0
                        ${owned ? 'bg-green-100 text-green-600' : 'bg-primary/10 text-primary'}
                      `}>
                        <Icon className="w-8 h-8" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-bold mb-1 ${owned ? 'text-green-900' : 'text-gray-900'}`}>
                          {item.name}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {item.description}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Coins className="w-4 h-4 text-yellow-500" />
                            <span className={`font-bold ${canAfford ? 'text-yellow-600' : 'text-red-500'}`}>
                              {item.price}
                            </span>
                          </div>

                          {!owned && !outOfStock && (
                            <Button
                              size="sm"
                              disabled={!canAfford || purchasing === item.id}
                              onClick={() => handlePurchase(item)}
                              className={canAfford ? '' : 'opacity-50'}
                            >
                              {purchasing === item.id ? '...' : 'Comprar'}
                            </Button>
                          )}

                          {outOfStock && (
                            <Badge variant="secondary" className="text-xs">
                              Esgotado
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Shine effect */}
                  {!owned && canAfford && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                  )}
                </motion.div>
              );
            })}
          </motion.div>

          {filteredItems.length === 0 && (
            <Card className="p-8">
              <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
                <ShoppingBag className="w-12 h-12 mb-4" />
                <p className="text-lg font-medium">Nenhum item nesta categoria</p>
              </div>
            </Card>
          )}

          {/* Info Card */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <div className="p-6">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                Sobre a Loja
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Use seus pontos acumulados para adquirir itens exclusivos</li>
                <li>• Itens limitados podem esgotar - garanta o seu!</li>
                <li>• Títulos e avatares ficam permanentemente no seu perfil</li>
                <li>• Boosts e proteções de sequência são consumíveis</li>
              </ul>
            </div>
          </Card>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </MainLayout>
  );
}
