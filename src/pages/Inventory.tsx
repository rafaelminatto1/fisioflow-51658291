import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Badge } from '@/components/shared/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/shared/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shared/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/shared/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shared/ui/tabs';
import {
  Package, Plus, Search, AlertTriangle, ArrowUpCircle, ArrowDownCircle,
  Edit, History, Filter
} from 'lucide-react';
import { useInventory, useCreateInventoryItem, useUpdateInventoryItem, useInventoryMovements, useCreateMovement, InventoryItem } from '@/hooks/useInnovations';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const CATEGORIES = [
  'Equipamentos',
  'Consumíveis',
  'Medicamentos',
  'Material de Escritório',
  'Limpeza',
  'Outros'
];

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [activeTab, setActiveTab] = useState('items');

  const [itemForm, setItemForm] = useState({
    item_name: '',
    category: '',
    current_quantity: 0,
    minimum_quantity: 5,
    unit: 'unidade',
    cost_per_unit: 0,
    supplier: '',
    location: '',
  });

  const [movementForm, setMovementForm] = useState({
    inventory_id: '',
    movement_type: 'entrada' as 'entrada' | 'saida' | 'ajuste' | 'perda',
    quantity: 0,
    reason: '',
  });

  const { data: inventory = [], isLoading } = useInventory();
  const { data: movements = [] } = useInventoryMovements();
  const createItem = useCreateInventoryItem();
  const updateItem = useUpdateInventoryItem();
  const createMovement = useCreateMovement();

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.item_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const lowStockItems = inventory.filter(i => i.current_quantity <= i.minimum_quantity);
  const totalValue = inventory.reduce((acc, i) => acc + (i.current_quantity * (i.cost_per_unit || 0)), 0);

  const handleCreateItem = async () => {
    if (!itemForm.item_name) {
      toast.error('Nome do item é obrigatório');
      return;
    }

    await createItem.mutateAsync(itemForm);
    setIsItemDialogOpen(false);
    resetItemForm();
  };

  const handleUpdateItem = async () => {
    if (!selectedItem) return;

    await updateItem.mutateAsync({
      id: selectedItem.id,
      ...itemForm,
    });
    setIsItemDialogOpen(false);
    setSelectedItem(null);
    resetItemForm();
  };

  const handleCreateMovement = async () => {
    if (!movementForm.inventory_id || movementForm.quantity <= 0) {
      toast.error('Selecione um item e quantidade válida');
      return;
    }

    await createMovement.mutateAsync(movementForm);
    setIsMovementDialogOpen(false);
    resetMovementForm();
  };

  const resetItemForm = () => {
    setItemForm({
      item_name: '',
      category: '',
      current_quantity: 0,
      minimum_quantity: 5,
      unit: 'unidade',
      cost_per_unit: 0,
      supplier: '',
      location: '',
    });
  };

  const resetMovementForm = () => {
    setMovementForm({
      inventory_id: '',
      movement_type: 'entrada',
      quantity: 0,
      reason: '',
    });
  };

  const openEditDialog = (item: InventoryItem) => {
    setSelectedItem(item);
    setItemForm({
      item_name: item.item_name,
      category: item.category || '',
      current_quantity: item.current_quantity,
      minimum_quantity: item.minimum_quantity,
      unit: item.unit,
      cost_per_unit: item.cost_per_unit || 0,
      supplier: item.supplier || '',
      location: item.location || '',
    });
    setIsItemDialogOpen(true);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Package className="h-8 w-8" />
              Controle de Estoque
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie o inventário da clínica
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsMovementDialogOpen(true)}>
              <History className="h-4 w-4 mr-2" />
              Movimentação
            </Button>
            <Button onClick={() => { resetItemForm(); setSelectedItem(null); setIsItemDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Item
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Package className="h-4 w-4" />
                <span className="text-sm">Total de Itens</span>
              </div>
              <p className="text-2xl font-bold mt-1">{inventory.length}</p>
            </CardContent>
          </Card>

          <Card className={lowStockItems.length > 0 ? 'border-amber-500/50' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-amber-500">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">Estoque Baixo</span>
              </div>
              <p className="text-2xl font-bold mt-1">{lowStockItems.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
                <span className="text-sm">Valor Total</span>
              </div>
              <p className="text-2xl font-bold mt-1">
                R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span className="text-sm">Categorias</span>
              </div>
              <p className="text-2xl font-bold mt-1">
                {new Set(inventory.map(i => i.category)).size}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="items">Itens</TabsTrigger>
            <TabsTrigger value="movements">Movimentações</TabsTrigger>
            <TabsTrigger value="alerts">Alertas</TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar item..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={categoryFilter || "all"} onValueChange={(v) => setCategoryFilter(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Todas categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas categorias</SelectItem>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Items Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-center">Quantidade</TableHead>
                      <TableHead className="text-center">Mínimo</TableHead>
                      <TableHead className="text-right">Custo Unit.</TableHead>
                      <TableHead>Local</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : filteredInventory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Nenhum item encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInventory.map((item) => {
                        const isLow = item.current_quantity <= item.minimum_quantity;
                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {isLow && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                                <span className="font-medium">{item.item_name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{item.category || 'Sem categoria'}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={isLow ? 'text-amber-500 font-medium' : ''}>
                                {item.current_quantity} {item.unit}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">{item.minimum_quantity}</TableCell>
                            <TableCell className="text-right">
                              {item.cost_per_unit ? `R$ ${item.cost_per_unit.toFixed(2)}` : '-'}
                            </TableCell>
                            <TableCell>{item.location || '-'}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="sm" onClick={() => openEditDialog(item)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="movements" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-center">Quantidade</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          Nenhuma movimentação registrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      movements.map((mov) => (
                        <TableRow key={mov.id}>
                          <TableCell>{format(new Date(mov.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</TableCell>
                          <TableCell>
                            <Badge variant={mov.movement_type === 'entrada' ? 'default' : 'secondary'}>
                              {mov.movement_type === 'entrada' && <ArrowUpCircle className="h-3 w-3 mr-1" />}
                              {mov.movement_type === 'saida' && <ArrowDownCircle className="h-3 w-3 mr-1" />}
                              {mov.movement_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{mov.quantity}</TableCell>
                          <TableCell>{mov.reason || '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            {lowStockItems.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Todos os itens estão com estoque adequado!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {lowStockItems.map((item) => (
                  <Card key={item.id} className="border-amber-500/50 bg-amber-500/5">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-5 w-5 text-amber-500" />
                          <div>
                            <p className="font-medium">{item.item_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.current_quantity} de {item.minimum_quantity} mínimo
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            setMovementForm(prev => ({ ...prev, inventory_id: item.id }));
                            setIsMovementDialogOpen(true);
                          }}
                        >
                          <ArrowUpCircle className="h-4 w-4 mr-2" />
                          Repor
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Item Dialog */}
        <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedItem ? 'Editar Item' : 'Novo Item'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Item *</Label>
                  <Input
                    value={itemForm.item_name}
                    onChange={(e) => setItemForm(prev => ({ ...prev, item_name: e.target.value }))}
                    placeholder="Ex: Gel Condutor"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={itemForm.category} onValueChange={(v) => setItemForm(prev => ({ ...prev, category: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    value={itemForm.current_quantity}
                    onChange={(e) => setItemForm(prev => ({ ...prev, current_quantity: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mínimo</Label>
                  <Input
                    type="number"
                    value={itemForm.minimum_quantity}
                    onChange={(e) => setItemForm(prev => ({ ...prev, minimum_quantity: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unidade</Label>
                  <Input
                    value={itemForm.unit}
                    onChange={(e) => setItemForm(prev => ({ ...prev, unit: e.target.value }))}
                    placeholder="unidade"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Custo Unitário (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={itemForm.cost_per_unit}
                    onChange={(e) => setItemForm(prev => ({ ...prev, cost_per_unit: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fornecedor</Label>
                  <Input
                    value={itemForm.supplier}
                    onChange={(e) => setItemForm(prev => ({ ...prev, supplier: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Localização</Label>
                <Input
                  value={itemForm.location}
                  onChange={(e) => setItemForm(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Ex: Armário 1, Prateleira A"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsItemDialogOpen(false)}>Cancelar</Button>
              <Button onClick={selectedItem ? handleUpdateItem : handleCreateItem}>
                {selectedItem ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Movement Dialog */}
        <Dialog open={isMovementDialogOpen} onOpenChange={setIsMovementDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Movimentação</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Item *</Label>
                <Select value={movementForm.inventory_id} onValueChange={(v) => setMovementForm(prev => ({ ...prev, inventory_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o item" /></SelectTrigger>
                  <SelectContent>
                    {inventory.map(item => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.item_name} ({item.current_quantity} {item.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={movementForm.movement_type}
                    onValueChange={(v) => setMovementForm(prev => ({ ...prev, movement_type: v as 'entrada' | 'saida' | 'ajuste' | 'perda' }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entrada">Entrada</SelectItem>
                      <SelectItem value="saida">Saída</SelectItem>
                      <SelectItem value="ajuste">Ajuste</SelectItem>
                      <SelectItem value="perda">Perda</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantidade *</Label>
                  <Input
                    type="number"
                    value={movementForm.quantity}
                    onChange={(e) => setMovementForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Motivo</Label>
                <Input
                  value={movementForm.reason}
                  onChange={(e) => setMovementForm(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Ex: Compra mensal, uso em atendimento..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsMovementDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateMovement}>Registrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
