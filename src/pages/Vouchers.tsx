import { useState } from 'react';
import { Plus, Ticket, Calendar, DollarSign } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { useVouchers, useUserVouchers } from '@/hooks/useVouchers';
import { usePermissions } from '@/hooks/usePermissions';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { VoucherModal } from '@/components/vouchers/VoucherModal';
import { Skeleton } from '@/components/ui/skeleton';

export default function Vouchers() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: vouchers, isLoading: vouchersLoading } = useVouchers();
  const { data: userVouchers, isLoading: userVouchersLoading } = useUserVouchers();
  const { isAdmin } = usePermissions();

  const activeVouchers = userVouchers?.filter(v => v.ativo && new Date(v.data_expiracao) > new Date()) || [];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Vouchers</h1>
            <p className="text-muted-foreground">
              Gerencie seus pacotes e planos de sessões
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Voucher
            </Button>
          )}
        </div>

        {/* Meus Vouchers Ativos */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Meus Vouchers Ativos</h2>
          {userVouchersLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : activeVouchers.length === 0 ? (
            <EmptyState
              icon={Ticket}
              title="Nenhum voucher ativo"
              description="Você ainda não possui vouchers ativos. Adquira um plano abaixo."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeVouchers.map((userVoucher) => (
                <Card key={userVoucher.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {userVoucher.voucher?.nome}
                      <Badge variant="default">Ativo</Badge>
                    </CardTitle>
                    <CardDescription>
                      {userVoucher.voucher?.tipo === 'pacote' 
                        ? `${userVoucher.sessoes_restantes} de ${userVoucher.sessoes_totais} sessões`
                        : 'Acesso ilimitado'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center text-sm">
                      <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>
                        Expira em {format(new Date(userVoucher.data_expiracao), "dd 'de' MMMM", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex items-center text-sm">
                      <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>
                        Pago: R$ {Number(userVoucher.valor_pago).toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Vouchers Disponíveis */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Planos Disponíveis</h2>
          {vouchersLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-24 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !vouchers || vouchers.length === 0 ? (
            <EmptyState
              icon={Ticket}
              title="Nenhum plano disponível"
              description="Não há planos disponíveis no momento."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {vouchers.map((voucher) => (
                <Card key={voucher.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle>{voucher.nome}</CardTitle>
                    <CardDescription>{voucher.descricao}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      {voucher.tipo === 'pacote' && voucher.sessoes && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Sessões:</span>
                          <span className="font-medium">{voucher.sessoes}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Validade:</span>
                        <span className="font-medium">{voucher.validade_dias} dias</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold">
                          R$ {Number(voucher.preco).toFixed(2)}
                        </span>
                        <Badge variant="secondary">
                          {voucher.tipo.charAt(0).toUpperCase() + voucher.tipo.slice(1)}
                        </Badge>
                      </div>
                    </div>
                    <Button className="w-full" disabled>
                      Adquirir Plano
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {isAdmin && (
        <VoucherModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
        />
      )}
    </MainLayout>
  );
}
