import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGamification } from '@/hooks/useGamification';
import { Loader2, ShoppingCart, Zap, Shield, Palette, Award, Lock } from 'lucide-react';
import * as Icons from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface RewardsShopProps {
  patientId: string;
}

export function RewardsShop({ patientId }: RewardsShopProps) {
  const { 
    shopItems, 
    userInventory, 
    totalPoints, 
    buyItem,
    isLoading 
  } = useGamification(patientId);

  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Helper to dynamically get icon component
  const getIcon = (iconName: string | undefined, defaultIcon: React.ComponentType) => {
    if (!iconName) return defaultIcon;
    // @ts-expect-error - dynamic icon access from Icons
    const IconComponent = Icons[iconName] || defaultIcon;
    return IconComponent;
  };

  const handleBuyClick = (item: any) => {
    setSelectedItem(item);
    setIsConfirmOpen(true);
  };

  const handleConfirmBuy = async () => {
    if (!selectedItem) return;
    
    try {
      await buyItem.mutateAsync({ 
        itemId: selectedItem.id, 
        cost: selectedItem.cost 
      });
      setIsConfirmOpen(false);
      setSelectedItem(null);
    } catch (error) {
      // Error handled in hook toast
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Loja de Recompensas
          </h3>
          <p className="text-sm text-muted-foreground">Troque seus pontos por itens exclusivos.</p>
        </div>
        <div className="bg-primary/10 px-4 py-2 rounded-full border border-primary/20 flex items-center gap-2">
          <span className="font-bold text-primary">{totalPoints}</span>
          <span className="text-xs uppercase font-bold text-primary/70">Pontos</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {shopItems.map((item) => {
          const Icon = getIcon(item.icon, Zap);
          const canAfford = totalPoints >= item.cost;
          const ownedQuantity = userInventory.find(i => i.item_id === item.id)?.quantity || 0;

          return (
            <Card key={item.id} className={cn(
              "flex flex-col transition-all duration-300 hover:shadow-md border-muted",
              !canAfford && "opacity-80 grayscale-[0.3]"
            )}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className={cn(
                    "p-3 rounded-xl mb-2",
                    item.type === 'consumable' ? "bg-blue-100 text-blue-600 dark:bg-blue-900/20" :
                    item.type === 'cosmetic' ? "bg-purple-100 text-purple-600 dark:bg-purple-900/20" :
                    "bg-orange-100 text-orange-600 dark:bg-orange-900/20"
                  )}>
                    <Icon className="h-6 w-6" />
                  </div>
                  {ownedQuantity > 0 && (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-200">
                      Você tem: {ownedQuantity}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-base">{item.name}</CardTitle>
                <CardDescription className="text-xs line-clamp-2 min-h-[2.5em]">
                  {item.description}
                </CardDescription>
              </CardHeader>
              <CardFooter className="mt-auto pt-2">
                <Button 
                  className={cn("w-full gap-2", !canAfford && "cursor-not-allowed")}
                  variant={canAfford ? "default" : "outline"}
                  disabled={!canAfford || buyItem.isPending}
                  onClick={() => canAfford && handleBuyClick(item)}
                >
                  {buyItem.isPending && selectedItem?.id === item.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : canAfford ? (
                    <>
                      <span>Comprar</span>
                      <span className="font-bold border-l border-primary-foreground/30 pl-2 ml-1">
                        {item.cost}
                      </span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-3 w-3 mr-1" />
                      <span>{item.cost} pts</span>
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Compra</DialogTitle>
            <DialogDescription>
              Você deseja gastar <span className="font-bold text-primary">{selectedItem?.cost} pontos</span> para comprar 
              <span className="font-bold text-foreground"> {selectedItem?.name}</span>?
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-4 py-4">
             <div className="p-4 bg-muted rounded-lg mx-auto">
                {selectedItem && (
                  (() => {
                    const Icon = getIcon(selectedItem.icon, Zap);
                    return <Icon className="h-12 w-12 text-primary" />;
                  })()
                )}
             </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>Cancelar</Button>
            <Button onClick={handleConfirmBuy} disabled={buyItem.isPending}>
              {buyItem.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default RewardsShop;