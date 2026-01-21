import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { useSessionPackages } from '@/hooks/useSessionPackages';
import { Plus, Package, Clock, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PackageManagerProps {
  patientId: string;
}

export function PackageManager({ patientId }: PackageManagerProps) {
  const { data: packages = [], isLoading } = useSessionPackages(patientId);
  const [, setShowNewModal] = useState(false);

  const getStatusBadge = (status: string) => {
    const variants = {
      ativo: 'default',
      consumido: 'secondary',
      expirado: 'destructive',
      cancelado: 'outline',
    } as const;

    return <Badge variant={variants[status as keyof typeof variants] || 'default'}>{status}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Pacotes de Sessões</h3>
        <Button onClick={() => setShowNewModal(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Novo Pacote
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : packages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum pacote cadastrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {packages.map((pkg) => (
            <Card key={pkg.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{pkg.package_name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      R$ {pkg.final_value.toFixed(2)}
                    </p>
                  </div>
                  {getStatusBadge(pkg.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{pkg.remaining_sessions}/{pkg.total_sessions}</p>
                      <p className="text-xs text-muted-foreground">Sessões</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {pkg.valid_until ? format(new Date(pkg.valid_until), 'dd/MM/yyyy', { locale: ptBR }) : 'Sem validade'}
                      </p>
                      <p className="text-xs text-muted-foreground">Validade</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium capitalize">{pkg.payment_status}</p>
                      <p className="text-xs text-muted-foreground">Pagamento</p>
                    </div>
                  </div>
                </div>

                {pkg.notes && (
                  <p className="mt-3 text-sm text-muted-foreground border-t pt-3">
                    {pkg.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
