import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGamification } from '@/hooks/useGamification';
import * as Icons, { Loader2, Package, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserInventoryProps {
  patientId: string;
}

export function UserInventory({ patientId }: UserInventoryProps) {
  const { userInventory, isLoading } = useGamification(patientId);

  // Helper to dynamically get icon component
  const getIcon = (iconName: string | undefined, defaultIcon: React.ComponentType) => {
    if (!iconName) return defaultIcon;
    // @ts-expect-error - dynamic icon access from Icons
    const IconComponent = Icons[iconName] || defaultIcon;
    return IconComponent;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (userInventory.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-xl border-muted-foreground/20">
        <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-muted-foreground">Inventário Vazio</h3>
        <p className="text-sm text-muted-foreground/70">Visite a loja para adquirir itens.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
      {userInventory.map((inventoryItem) => {
        const item = inventoryItem.item;
        if (!item) return null;
        
        const Icon = getIcon(item.icon, Zap);

        return (
          <Card key={inventoryItem.id} className="flex flex-row items-center p-4 gap-4 hover:bg-muted/50 transition-colors">
            <div className={cn(
              "p-3 rounded-xl shrink-0",
              item.type === 'consumable' ? "bg-blue-100 text-blue-600 dark:bg-blue-900/20" :
              item.type === 'cosmetic' ? "bg-purple-100 text-purple-600 dark:bg-purple-900/20" :
              "bg-gray-100 text-gray-600 dark:bg-gray-900/20"
            )}>
              <Icon className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1">
                <h4 className="font-semibold text-sm truncate">{item.name}</h4>
                <Badge variant="outline" className="bg-background">
                  x{inventoryItem.quantity}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {item.description}
              </p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export default UserInventory;
