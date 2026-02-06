import { useState } from 'react';

  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Package, Calendar, DollarSign, Check } from 'lucide-react';
import { useSessionPackages, usePurchasePackage, type SessionPackage } from '@/hooks/usePackages';

interface PackagePurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
  onSuccess?: () => void;
}

export function PackagePurchaseDialog({
  open,
  onOpenChange,
  patientId,
  patientName,
  onSuccess,
}: PackagePurchaseDialogProps) {
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const { data: packages, isLoading } = useSessionPackages();
  const purchaseMutation = usePurchasePackage();

  const selectedPackage = packages?.find(p => p.id === selectedPackageId);

  const handlePurchase = async () => {
    if (!selectedPackageId) return;

    await purchaseMutation.mutateAsync({
      patient_id: patientId,
      package_id: selectedPackageId,
    });

    onSuccess?.();
    onOpenChange(false);
    setSelectedPackageId(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getPricePerSession = (pkg: SessionPackage) => {
    return pkg.price / pkg.sessions_count;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Comprar Pacote de Sessões
          </DialogTitle>
          <DialogDescription>
            Selecione um pacote para {patientName}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            Carregando pacotes...
          </div>
        ) : packages && packages.length > 0 ? (
          <RadioGroup
            value={selectedPackageId || ''}
            onValueChange={setSelectedPackageId}
            className="grid gap-4"
          >
            {packages.map((pkg) => {
              const pricePerSession = getPricePerSession(pkg);
              const isSelected = selectedPackageId === pkg.id;
              const isBestValue = packages.length > 1 && 
                pricePerSession === Math.min(...packages.map(p => getPricePerSession(p)));

              return (
                <Label
                  key={pkg.id}
                  htmlFor={pkg.id}
                  className="cursor-pointer"
                >
                  <Card className={`
                    transition-all
                    ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/50'}
                  `}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <RadioGroupItem value={pkg.id} id={pkg.id} className="mt-1" />
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{pkg.name}</span>
                              {isBestValue && (
                                <Badge className="bg-green-500">Melhor custo</Badge>
                              )}
                            </div>
                            <span className="text-lg font-bold text-primary">
                              {formatCurrency(pkg.price)}
                            </span>
                          </div>

                          {pkg.description && (
                            <p className="text-sm text-muted-foreground">
                              {pkg.description}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Check className="w-4 h-4 text-green-500" />
                              <span>{pkg.sessions_count} sessões</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>Válido por {pkg.validity_days} dias</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              <span>{formatCurrency(pricePerSession)}/sessão</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Label>
              );
            })}
          </RadioGroup>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Nenhum pacote disponível
          </div>
        )}

        {/* Resumo da compra */}
        {selectedPackage && (
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <h4 className="font-medium mb-2">Resumo da Compra</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Paciente:</span>
                  <span>{patientName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pacote:</span>
                  <span>{selectedPackage.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sessões:</span>
                  <span>{selectedPackage.sessions_count}</span>
                </div>
                <div className="flex justify-between font-medium text-base pt-2 border-t">
                  <span>Total:</span>
                  <span className="text-primary">{formatCurrency(selectedPackage.price)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handlePurchase}
            disabled={!selectedPackageId || purchaseMutation.isPending}
          >
            {purchaseMutation.isPending ? 'Processando...' : 'Confirmar Compra'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

