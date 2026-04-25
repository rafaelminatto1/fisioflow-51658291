import { useState } from "react";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGamification } from "@/hooks/useGamification";
import { Loader2, ShoppingCart, Zap, Lock, ShoppingBag, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CustomModal,
  CustomModalHeader,
  CustomModalTitle,
  CustomModalBody,
  CustomModalFooter,
} from "@/components/ui/custom-modal";
import { useIsMobile } from "@/hooks/use-mobile";
import { getGamificationIcon } from "./iconMap";

interface RewardsShopProps {
  patientId: string;
}

interface ShopItem {
  id: string;
  name: string;
  description?: string;
  cost: number;
  icon?: string;
  category?: string;
  type?: string;
}

export function RewardsShop({ patientId }: RewardsShopProps) {
  const isMobile = useIsMobile();
  const { shopItems, userInventory, totalPoints, buyItem, isLoading } = useGamification(patientId);

  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleBuyClick = (item: ShopItem) => {
    setSelectedItem(item);
    setIsConfirmOpen(true);
  };

  const handleConfirmBuy = async () => {
    if (!selectedItem) return;

    try {
      await buyItem.mutateAsync({
        itemId: selectedItem.id,
        cost: selectedItem.cost,
      });
      setIsConfirmOpen(false);
      setSelectedItem(null);
    } catch {
      // Error handled in hook toast
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
          Acessando estoque...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black flex items-center gap-2 italic uppercase tracking-tighter">
            <ShoppingCart className="h-6 w-6 text-primary" />
            Loja de Recompensas
          </h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Troque seus pontos por itens exclusivos
          </p>
        </div>
        <div className="bg-slate-900 px-4 py-2 rounded-2xl shadow-lg border border-slate-800 flex items-center gap-3 transition-transform hover:scale-105">
          <div className="p-1 bg-primary rounded-lg">
            <Zap className="h-3 w-3 text-primary-foreground fill-primary-foreground" />
          </div>
          <span className="font-black text-white text-lg tracking-tighter">{totalPoints}</span>
          <span className="text-[8px] uppercase font-black text-slate-400 leading-none">
            Pontos
            <br />
            Disponíveis
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {shopItems.map((item) => {
          const Icon = getGamificationIcon(item.icon, Zap);
          const canAfford = totalPoints >= item.cost;
          const ownedQuantity = userInventory.find((i) => i.item_id === item.id)?.quantity || 0;

          return (
            <Card
              key={item.id}
              className={cn(
                "group flex flex-col transition-all duration-300 rounded-[2rem] overflow-hidden border-2",
                canAfford
                  ? "border-slate-100 hover:border-primary/30 hover:shadow-xl hover:-translate-y-1"
                  : "border-slate-50 opacity-70 grayscale-[0.5]",
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div
                    className={cn(
                      "p-4 rounded-2xl mb-2 shadow-sm transition-transform group-hover:scale-110",
                      item.type === "consumable"
                        ? "bg-blue-50 text-blue-600 border border-blue-100"
                        : item.type === "cosmetic"
                          ? "bg-purple-50 text-purple-600 border border-purple-100"
                          : "bg-orange-50 text-orange-600 border border-orange-100",
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  {ownedQuantity > 0 && (
                    <Badge className="bg-emerald-500 hover:bg-emerald-600 rounded-lg text-[10px] font-black h-5 uppercase">
                      Possuído: {ownedQuantity}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg font-black tracking-tight text-slate-800">
                  {item.name}
                </CardTitle>
                <CardDescription className="text-xs font-medium text-slate-500 line-clamp-2 min-h-[3em]">
                  {item.description}
                </CardDescription>
              </CardHeader>
              <CardFooter className="mt-auto pt-4 pb-6 px-6">
                <Button
                  className={cn(
                    "w-full h-12 rounded-2xl font-black uppercase tracking-widest gap-2 transition-all shadow-md",
                    canAfford
                      ? "bg-slate-900 text-white hover:bg-primary hover:text-primary-foreground"
                      : "bg-slate-50 text-slate-400 cursor-not-allowed border-none shadow-none",
                  )}
                  disabled={!canAfford || buyItem.isPending}
                  onClick={() => canAfford && handleBuyClick(item)}
                >
                  {buyItem.isPending && selectedItem?.id === item.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : canAfford ? (
                    <>
                      <span>Resgatar</span>
                      <div className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-lg ml-auto">
                        <Zap className="h-3 w-3 fill-current" />
                        <span className="text-sm">{item.cost}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 opacity-50" />
                      <span>{item.cost} pontos</span>
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Confirmation Modal - Refactored to CustomModal */}
      <CustomModal
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        isMobile={isMobile}
        contentClassName="max-w-md"
      >
        <CustomModalHeader onClose={() => setIsConfirmOpen(false)}>
          <CustomModalTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Confirmar Resgate
          </CustomModalTitle>
        </CustomModalHeader>

        <CustomModalBody className="p-0 sm:p-0">
          <div className="p-8 text-center space-y-6">
            <div className="w-24 h-24 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center mx-auto relative">
              {selectedItem &&
                (() => {
                  const Icon = getGamificationIcon(selectedItem.icon, Zap);
                  return <Icon className="h-12 w-12 text-primary animate-pulse" />;
                })()}
              <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground px-2 py-1 rounded-lg text-[10px] font-black uppercase shadow-lg">
                -{selectedItem?.cost} pts
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                {selectedItem?.name}
              </h3>
              <p className="text-sm font-medium text-slate-500">
                Confirmar a troca de{" "}
                <span className="text-primary font-bold">{selectedItem?.cost} pontos</span> por este
                item?
              </p>
            </div>

            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3 text-left">
              {(() => {
                const InfoIcon = getGamificationIcon("Info", Zap);
                return <InfoIcon className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />;
              })()}
              <p className="text-[10px] text-blue-700 font-bold leading-relaxed uppercase">
                O item será adicionado ao seu inventário imediatamente após a confirmação. Alguns
                itens podem exigir ação do profissional.
              </p>
            </div>
          </div>
        </CustomModalBody>

        <CustomModalFooter isMobile={isMobile}>
          <Button
            variant="ghost"
            onClick={() => setIsConfirmOpen(false)}
            className="rounded-xl h-11 px-6 font-bold text-slate-500"
          >
            Mudei de ideia
          </Button>
          <Button
            onClick={handleConfirmBuy}
            disabled={buyItem.isPending}
            className="rounded-xl h-11 px-8 gap-2 bg-slate-900 text-white shadow-xl shadow-slate-900/10 font-bold uppercase tracking-wider transition-all hover:scale-105"
          >
            {buyItem.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <BadgeCheck className="h-4 w-4" />
            )}
            Confirmar Resgate
          </Button>
        </CustomModalFooter>
      </CustomModal>
    </div>
  );
}

export default RewardsShop;
