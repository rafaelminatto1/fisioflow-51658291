import { useState, useMemo } from "react";
import { PageLayout, PageContainer, PageHeader } from "@/components/layout/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  ArrowUpCircle,
  ArrowDownCircle,
  Edit,
  History,
  Filter,
  Trash2,
  Brain,
  TrendingDown,
} from "lucide-react";
import {
  useInventory,
  useCreateInventoryItem,
  useUpdateInventoryItem,
  useDeleteInventoryItem,
  useInventoryMovements,
  useCreateMovement,
  InventoryItem,
} from "@/hooks/useInnovations";
import { useQuery } from "@tanstack/react-query";
import { request } from "@/api/v2/base";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { accentIncludes } from "@/lib/utils/bilingualSearch";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "Equipamentos",
  "Consumíveis",
  "Medicamentos",
  "Material de Escritório",
  "Limpeza",
  "Outros",
];

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [activeTab, setActiveTab] = useState("items");

  const [itemForm, setItemForm] = useState({
    item_name: "",
    category: "",
    current_quantity: 0,
    minimum_quantity: 5,
    unit: "unidade",
    cost_per_unit: 0,
    supplier: "",
    location: "",
  });

  const [movementForm, setMovementForm] = useState({
    inventory_id: "",
    movement_type: "entrada" as "entrada" | "saida" | "ajuste" | "perda",
    quantity: 0,
    reason: "",
  });

  const { data: inventory = [], isLoading } = useInventory();
  const { data: movements = [] } = useInventoryMovements();
  const createItem = useCreateInventoryItem();
  const updateItem = useUpdateInventoryItem();
  const deleteItem = useDeleteInventoryItem();
  const createMovement = useCreateMovement();

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const matchesSearch = accentIncludes(item.item_name, searchTerm);
      const matchesCategory = !categoryFilter || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [inventory, searchTerm, categoryFilter]);

  const lowStockItems = useMemo(() => {
    return inventory.filter((i) => i.current_quantity <= i.minimum_quantity);
  }, [inventory]);

  const totalValue = useMemo(() => {
    return inventory.reduce((acc, i) => acc + i.current_quantity * (i.cost_per_unit || 0), 0);
  }, [inventory]);

  const uniqueCategoriesCount = useMemo(() => {
    return new Set(inventory.map((i) => i.category)).size;
  }, [inventory]);

  const { data: forecastsResponse, isLoading: isLoadingForecast } = useQuery({
    queryKey: ["inventory-forecast"],
    queryFn: () => request<{ data: any[] }>("/api/innovations/inventory/forecast"),
    enabled: activeTab === "forecast",
  });
  const forecasts = forecastsResponse?.data || [];

  const handleCreateItem = async () => {
    if (!itemForm.item_name) {
      toast.error("Nome do item é obrigatório");
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
      toast.error("Selecione um item e quantidade válida");
      return;
    }

    await createMovement.mutateAsync(movementForm);
    setIsMovementDialogOpen(false);
    resetMovementForm();
  };

  const resetItemForm = () => {
    setItemForm({
      item_name: "",
      category: "",
      current_quantity: 0,
      minimum_quantity: 5,
      unit: "unidade",
      cost_per_unit: 0,
      supplier: "",
      location: "",
    });
  };

  const resetMovementForm = () => {
    setMovementForm({
      inventory_id: "",
      movement_type: "entrada",
      quantity: 0,
      reason: "",
    });
  };

  const openEditDialog = (item: InventoryItem) => {
    setSelectedItem(item);
    setItemForm({
      item_name: item.item_name,
      category: item.category || "",
      current_quantity: item.current_quantity,
      minimum_quantity: item.minimum_quantity,
      unit: item.unit,
      cost_per_unit: item.cost_per_unit || 0,
      supplier: item.supplier || "",
      location: item.location || "",
    });
    setIsItemDialogOpen(true);
  };

  const handleDeleteItem = async (item: InventoryItem) => {
    if (!confirm(`Tem certeza que deseja remover "${item.item_name}" do estoque?`)) {
      return;
    }

    await deleteItem.mutateAsync(item.id);
  };

  return (
    <PageLayout fullWidth compactHeader>
      <PageHeader
        title="Controle de Estoque"
        description="Gerencie o inventário, suprimentos e equipamentos da clínica."
        icon={Package}
        breadcrumb={[{ label: "Estoque", href: "/estoque" }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-2xl font-bold border-brand-blue/20 text-brand-blue hover:bg-brand-blue/5"
              onClick={() => setIsMovementDialogOpen(true)}
            >
              <History className="h-4 w-4 mr-2" />
              Movimentação
            </Button>
            <Button
              size="sm"
              className="h-10 rounded-2xl px-5 font-bold shadow-sm bg-brand-blue hover:bg-brand-blue/90"
              onClick={() => {
                resetItemForm();
                setSelectedItem(null);
                setIsItemDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Item
            </Button>
          </div>
        }
      />

      <PageContainer maxWidth="full">
        {/* Bento Grid Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-none shadow-sm bg-white overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-xl bg-brand-blue/10 text-brand-blue group-hover:scale-110 transition-transform">
                  <Package className="h-5 w-5" />
                </div>
                <Badge variant="secondary" className="bg-brand-blue/5 text-brand-blue border-none">
                  Total
                </Badge>
              </div>
              <p className="text-3xl font-bold text-slate-900">{inventory.length}</p>
              <p className="text-sm text-slate-500 mt-1">Itens catalogados</p>
            </CardContent>
          </Card>

          <Card
            className={`border-none shadow-sm overflow-hidden group ${lowStockItems.length > 0 ? "bg-amber-50" : "bg-white"}`}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`p-2 rounded-xl ${lowStockItems.length > 0 ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-500"} group-hover:scale-110 transition-transform`}
                >
                  <AlertTriangle className="h-5 w-5" />
                </div>
                {lowStockItems.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="bg-amber-100 text-amber-700 border-none animate-pulse"
                  >
                    Crítico
                  </Badge>
                )}
              </div>
              <p
                className={`text-3xl font-bold ${lowStockItems.length > 0 ? "text-amber-700" : "text-slate-900"}`}
              >
                {lowStockItems.length}
              </p>
              <p className="text-sm text-slate-500 mt-1">Itens em falta</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600 group-hover:scale-110 transition-transform">
                  <ArrowUpCircle className="h-5 w-5" />
                </div>
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-none">
                  Ativos
                </Badge>
              </div>
              <p className="text-3xl font-bold text-slate-900">
                R${" "}
                {totalValue.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </p>
              <p className="text-sm text-slate-500 mt-1">Valor do patrimônio</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-xl bg-slate-100 text-slate-600 group-hover:scale-110 transition-transform">
                  <Filter className="h-5 w-5" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900">{uniqueCategoriesCount}</p>
              <p className="text-sm text-slate-500 mt-1">Categorias ativas</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-100 p-1 rounded-xl mb-4">
            <TabsTrigger
              value="items"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-brand-blue data-[state=active]:shadow-sm"
            >
              Itens
            </TabsTrigger>
            <TabsTrigger
              value="movements"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-brand-blue data-[state=active]:shadow-sm"
            >
              Movimentações
            </TabsTrigger>
            <TabsTrigger
              value="forecast"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-brand-blue data-[state=active]:shadow-sm flex gap-2"
            >
              <Brain className="h-3.5 w-3.5" /> Previsão IA
            </TabsTrigger>
            <TabsTrigger
              value="alerts"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-brand-blue data-[state=active]:shadow-sm"
            >
              Alertas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="forecast" className="space-y-4">
            {isLoadingForecast ? (
              <div className="h-64 flex items-center justify-center text-xs text-muted-foreground animate-pulse">
                Calculando demanda futura baseada na agenda...
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {forecasts.map((f: any) => (
                  <Card
                    key={f.id}
                    className={cn(
                      "border-none shadow-premium transition-all hover:shadow-md",
                      f.risk === "high"
                        ? "bg-red-50 dark:bg-red-950/20"
                        : "bg-white dark:bg-slate-900/50",
                    )}
                  >
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1 pr-2">
                          <p className="font-bold text-slate-900 dark:text-white truncate">
                            {f.name}
                          </p>
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                            {f.currentQuantity} {f.unit} em estoque
                          </p>
                        </div>
                        <div
                          className={cn(
                            "p-2 rounded-xl",
                            f.risk === "high"
                              ? "bg-red-100 text-red-600"
                              : "bg-brand-blue/10 text-brand-blue",
                          )}
                        >
                          {f.risk === "high" ? (
                            <TrendingDown className="h-5 w-5" />
                          ) : (
                            <Brain className="h-5 w-5" />
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500 font-medium">
                            Duração estimada
                          </span>
                          <span
                            className={cn(
                              "text-lg font-black",
                              f.risk === "high" ? "text-red-600" : "text-slate-900 dark:text-white",
                            )}
                          >
                            {f.daysRemaining} dias
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500 font-medium">
                            Demanda próx. 30 dias
                          </span>
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            ~{f.predictedMonthlyNeed} {f.unit}
                          </span>
                        </div>

                        {f.risk === "high" && (
                          <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 text-[10px] font-black uppercase text-center tracking-wider animate-pulse">
                            Risco de Ruptura Crítico
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

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
              <Select
                value={categoryFilter || "all"}
                onValueChange={(v) => setCategoryFilter(v === "all" ? "" : v)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Todas categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas categorias</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
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
                              <Badge variant="outline">{item.category || "Sem categoria"}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={isLow ? "text-amber-500 font-medium" : ""}>
                                {item.current_quantity} {item.unit}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">{item.minimum_quantity}</TableCell>
                            <TableCell className="text-right">
                              {item.cost_per_unit
                                ? `R$ ${Number(item.cost_per_unit).toFixed(2)}`
                                : "-"}
                            </TableCell>
                            <TableCell>{item.location || "-"}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditDialog(item)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive"
                                  disabled={deleteItem.isPending}
                                  onClick={() => handleDeleteItem(item)}
                                >
                                  <Trash2 className="h-4 w-4" />
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
                          <TableCell>
                            {format(new Date(mov.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={mov.movement_type === "entrada" ? "default" : "secondary"}
                            >
                              {mov.movement_type === "entrada" && (
                                <ArrowUpCircle className="h-3 w-3 mr-1" />
                              )}
                              {mov.movement_type === "saida" && (
                                <ArrowDownCircle className="h-3 w-3 mr-1" />
                              )}
                              {mov.movement_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{mov.quantity}</TableCell>
                          <TableCell>{mov.reason || "-"}</TableCell>
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
                  <p className="text-muted-foreground">
                    Todos os itens estão com estoque adequado!
                  </p>
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
                            setMovementForm((prev) => ({
                              ...prev,
                              inventory_id: item.id,
                            }));
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
              <DialogTitle>{selectedItem ? "Editar Item" : "Novo Item"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Item *</Label>
                  <Input
                    value={itemForm.item_name}
                    onChange={(e) =>
                      setItemForm((prev) => ({
                        ...prev,
                        item_name: e.target.value,
                      }))
                    }
                    placeholder="Ex: Gel Condutor"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select
                    value={itemForm.category}
                    onValueChange={(v) => setItemForm((prev) => ({ ...prev, category: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={itemForm.current_quantity}
                    onChange={(e) =>
                      setItemForm((prev) => ({
                        ...prev,
                        current_quantity: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mínimo</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={itemForm.minimum_quantity}
                    onChange={(e) =>
                      setItemForm((prev) => ({
                        ...prev,
                        minimum_quantity: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unidade</Label>
                  <Input
                    value={itemForm.unit}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, unit: e.target.value }))}
                    placeholder="unidade"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Custo Unitário (R$)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={itemForm.cost_per_unit}
                    onChange={(e) =>
                      setItemForm((prev) => ({
                        ...prev,
                        cost_per_unit: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fornecedor</Label>
                  <Input
                    value={itemForm.supplier}
                    onChange={(e) =>
                      setItemForm((prev) => ({
                        ...prev,
                        supplier: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Localização</Label>
                <Input
                  value={itemForm.location}
                  onChange={(e) =>
                    setItemForm((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                  placeholder="Ex: Armário 1, Prateleira A"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsItemDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={selectedItem ? handleUpdateItem : handleCreateItem}>
                {selectedItem ? "Salvar" : "Criar"}
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
                <Select
                  value={movementForm.inventory_id}
                  onValueChange={(v) => setMovementForm((prev) => ({ ...prev, inventory_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o item" />
                  </SelectTrigger>
                  <SelectContent>
                    {inventory.map((item) => (
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
                    onValueChange={(v) =>
                      setMovementForm((prev) => ({
                        ...prev,
                        movement_type: v as "entrada" | "saida" | "ajuste" | "perda",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
                    onChange={(e) =>
                      setMovementForm((prev) => ({
                        ...prev,
                        quantity: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Motivo</Label>
                <Input
                  value={movementForm.reason}
                  onChange={(e) =>
                    setMovementForm((prev) => ({
                      ...prev,
                      reason: e.target.value,
                    }))
                  }
                  placeholder="Ex: Compra mensal, uso em atendimento..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsMovementDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateMovement}>Registrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageContainer>
    </PageLayout>
  );
}
