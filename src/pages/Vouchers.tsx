import { useState, useEffect } from 'react';
import { Plus, Ticket, Calendar, DollarSign, Edit, Trash2, MoreVertical, Search } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { useVouchers, useUserVouchers, useAllVouchers, useDeleteVoucher, useUpdateVoucher, type Voucher } from '@/hooks/useVouchers';
import { usePurchaseVoucher, useVerifyVoucherPayment } from '@/hooks/usePurchaseVoucher';
import { usePermissions } from '@/hooks/usePermissions';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { VoucherModal } from '@/components/vouchers/VoucherModal';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function Vouchers() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [deleteVoucherId, setDeleteVoucherId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('available');
  
  const { data: vouchers, isLoading: vouchersLoading } = useVouchers();
  const { data: allVouchers, isLoading: allVouchersLoading } = useAllVouchers();
  const { data: userVouchers, isLoading: userVouchersLoading } = useUserVouchers();
  const { isAdmin } = usePermissions();
  const purchaseVoucher = usePurchaseVoucher();
  const verifyPayment = useVerifyVoucherPayment();
  const deleteVoucher = useDeleteVoucher();
  const updateVoucher = useUpdateVoucher();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    
    if (sessionId) {
      verifyPayment.mutate(sessionId);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const activeVouchers = userVouchers?.filter(v => v.ativo && new Date(v.data_expiracao) > new Date()) || [];
  
  const filteredAllVouchers = (allVouchers || []).filter(v =>
    v.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (voucher: Voucher) => {
    setEditingVoucher(voucher);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (deleteVoucherId) {
      await deleteVoucher.mutateAsync(deleteVoucherId);
      setDeleteVoucherId(null);
    }
  };

  const handleToggleActive = async (voucher: Voucher) => {
    await updateVoucher.mutateAsync({
      id: voucher.id,
      ativo: !voucher.ativo,
    });
  };

  const stats = {
    totalPlanos: allVouchers?.length || 0,
    planosAtivos: allVouchers?.filter(v => v.ativo).length || 0,
    meusVouchers: activeVouchers.length,
    sessoesDisponiveis: activeVouchers.reduce((acc, v) => acc + v.sessoes_restantes, 0),
  };

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6 pb-20 md:pb-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Ticket className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              Vouchers & Pacotes
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Gerencie seus pacotes e planos de sessões
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => { setEditingVoucher(null); setIsModalOpen(true); }} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Novo Voucher</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="hover:shadow-md transition-all">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Ticket className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Total Planos</p>
                  <p className="text-lg sm:text-2xl font-bold">{stats.totalPlanos}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-all">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Ticket className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Planos Ativos</p>
                  <p className="text-lg sm:text-2xl font-bold">{stats.planosAtivos}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-all">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Meus Vouchers</p>
                  <p className="text-lg sm:text-2xl font-bold">{stats.meusVouchers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-all">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Sessões Disp.</p>
                  <p className="text-lg sm:text-2xl font-bold">{stats.sessoesDisponiveis}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
            <TabsTrigger value="available">Disponíveis</TabsTrigger>
            <TabsTrigger value="my-vouchers">Meus Vouchers</TabsTrigger>
            {isAdmin && <TabsTrigger value="manage">Gerenciar</TabsTrigger>}
          </TabsList>

          {/* Planos Disponíveis */}
          <TabsContent value="available" className="mt-4 sm:mt-6">
            {vouchersLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                    <CardContent><Skeleton className="h-24 w-full" /></CardContent>
                  </Card>
                ))}
              </div>
            ) : !vouchers || vouchers.length === 0 ? (
              <EmptyState icon={Ticket} title="Nenhum plano disponível" description="Não há planos disponíveis no momento." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {vouchers.map((voucher) => (
                  <Card key={voucher.id} className="hover:shadow-lg transition-all group">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{voucher.nome}</CardTitle>
                          <CardDescription className="line-clamp-2">{voucher.descricao}</CardDescription>
                        </div>
                        <Badge variant="secondary">{voucher.tipo}</Badge>
                      </div>
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
                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-2xl font-bold text-primary">
                            R$ {Number(voucher.preco).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <Button 
                        className="w-full"
                        onClick={() => purchaseVoucher.mutate(voucher.id)}
                        disabled={purchaseVoucher.isPending}
                      >
                        {purchaseVoucher.isPending ? 'Processando...' : 'Adquirir Plano'}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Meus Vouchers */}
          <TabsContent value="my-vouchers" className="mt-4 sm:mt-6">
            {userVouchersLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i}><CardContent className="p-4"><Skeleton className="h-32 w-full" /></CardContent></Card>
                ))}
              </div>
            ) : activeVouchers.length === 0 ? (
              <EmptyState icon={Ticket} title="Nenhum voucher ativo" description="Você ainda não possui vouchers ativos." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {activeVouchers.map((userVoucher) => (
                  <Card key={userVoucher.id} className="hover:shadow-md transition-all">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{userVoucher.voucher?.nome}</CardTitle>
                        <Badge variant="default">Ativo</Badge>
                      </div>
                      <CardDescription>
                        {userVoucher.voucher?.tipo === 'pacote' 
                          ? `${userVoucher.sessoes_restantes} de ${userVoucher.sessoes_totais} sessões`
                          : 'Acesso ilimitado'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${(userVoucher.sessoes_restantes / userVoucher.sessoes_totais) * 100}%` }}
                        />
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 mr-2" />
                        Expira em {format(new Date(userVoucher.data_expiracao), "dd 'de' MMMM", { locale: ptBR })}
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <DollarSign className="h-4 w-4 mr-2" />
                        Pago: R$ {Number(userVoucher.valor_pago).toFixed(2)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Gerenciar (Admin) */}
          {isAdmin && (
            <TabsContent value="manage" className="mt-4 sm:mt-6 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar vouchers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {allVouchersLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (<Skeleton key={i} className="h-20 w-full" />))}
                </div>
              ) : filteredAllVouchers.length === 0 ? (
                <EmptyState icon={Ticket} title="Nenhum voucher encontrado" description="Crie seu primeiro voucher" />
              ) : (
                <div className="space-y-3">
                  {filteredAllVouchers.map((voucher) => (
                    <Card key={voucher.id} className="hover:shadow-md transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold truncate">{voucher.nome}</h3>
                              <Badge variant={voucher.ativo ? 'default' : 'secondary'}>
                                {voucher.ativo ? 'Ativo' : 'Inativo'}
                              </Badge>
                              <Badge variant="outline">{voucher.tipo}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-1">{voucher.descricao}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm">
                              {voucher.sessoes && <span>{voucher.sessoes} sessões</span>}
                              <span>{voucher.validade_dias} dias</span>
                              <span className="font-semibold text-primary">R$ {Number(voucher.preco).toFixed(2)}</span>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(voucher)}>
                                <Edit className="h-4 w-4 mr-2" />Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleActive(voucher)}>
                                {voucher.ativo ? 'Desativar' : 'Ativar'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteVoucherId(voucher.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>

      <VoucherModal
        open={isModalOpen}
        onOpenChange={(open) => { setIsModalOpen(open); if (!open) setEditingVoucher(null); }}
        voucher={editingVoucher || undefined}
      />

      <AlertDialog open={!!deleteVoucherId} onOpenChange={() => setDeleteVoucherId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Voucher</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este voucher? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              {deleteVoucher.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
