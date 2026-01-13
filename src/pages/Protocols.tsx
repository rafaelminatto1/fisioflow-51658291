import { useState, useMemo } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search, Calendar, SortAsc, Grid3X3, List, Filter,
} from 'lucide-react';
import { useExerciseProtocols, type ExerciseProtocol } from '@/hooks/useExerciseProtocols';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { NewProtocolModal } from '@/components/modals/NewProtocolModal';
import { PROTOCOL_CATEGORIES, QUICK_TEMPLATES, getProtocolCategory } from '@/data/protocols';
import { ProtocolCardEnhanced } from '@/components/protocols/ProtocolCardEnhanced';
import { ProtocolDetailView } from '@/components/protocols/ProtocolDetailView';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function Protocols() {
  const [activeTab, setActiveTab] = useState<'patologia' | 'pos_operatorio'>('pos_operatorio');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedProtocol, setSelectedProtocol] = useState<ExerciseProtocol | null>(null);
  const [showNewProtocolModal, setShowNewProtocolModal] = useState(false);
  const [editingProtocol, setEditingProtocol] = useState<ExerciseProtocol | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);

  const { protocols, loading, createProtocol, updateProtocol, deleteProtocol, isCreating, isUpdating, isDeleting } = useExerciseProtocols();
  const { toast } = useToast();

  const filteredProtocols = useMemo(() => {
    return protocols.filter(p => {
      // Filter by type (tab)
      if (p.protocol_type !== activeTab) return false;

      // Filter by search term
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.condition_name.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      // Filter by category
      if (categoryFilter !== 'all') {
        const category = getProtocolCategory(p.condition_name);
        if (category !== categoryFilter) return false;
      }
      return true;
    });
  }, [protocols, search, activeTab, categoryFilter]);

  const handleFavorite = (id: string) => {
    setFavorites(prev =>
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    );
    toast({
      title: favorites.includes(id) ? "Removido dos favoritos" : "Adicionado aos favoritos",
      description: "Sua lista de protocolos foi atualizada."
    });
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteProtocol(deleteId);
      setDeleteId(null);
      if (selectedProtocol?.id === deleteId) {
        setSelectedProtocol(null);
      }
    }
  };

  const handleSubmitProtocol = (data: Omit<ExerciseProtocol, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingProtocol) {
      updateProtocol({ id: editingProtocol.id, ...data });
    } else {
      createProtocol(data);
    }
    setShowNewProtocolModal(false);
    setEditingProtocol(null);
  };

  const handleDuplicate = (protocol: ExerciseProtocol) => {
    const { id: _id, created_at: _created_at, updated_at: _updated_at, ...data } = protocol;
    createProtocol({
      ...data,
      name: `${data.name} (Cópia)`,
    });
    toast({
      title: "Protocolo duplicado",
      description: "Uma cópia do protocolo foi criada com sucesso."
    });
  };

  if (selectedProtocol) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6 max-w-7xl space-y-8 pb-24 md:pb-12">
          <ProtocolDetailView
            protocol={selectedProtocol}
            onBack={() => setSelectedProtocol(null)}
            onEdit={() => {
              setEditingProtocol(selectedProtocol);
              setShowNewProtocolModal(true);
            }}
            onDelete={() => setDeleteId(selectedProtocol.id)}
          />
        </div>

        <NewProtocolModal
          open={showNewProtocolModal}
          onOpenChange={setShowNewProtocolModal}
          onSubmit={handleSubmitProtocol}
          protocol={editingProtocol}
          isLoading={isCreating || isUpdating}
        />

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Protocolo</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este protocolo? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6 max-w-7xl space-y-8 pb-24 md:pb-12 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Protocolos Clínicos</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie e aplique protocolos de reabilitação baseados em evidência
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
            <Button onClick={() => {
              setEditingProtocol(null);
              setShowNewProtocolModal(true);
            }} className="gap-2">
              <PlusCircle className="h-4 w-4" />
              Novo Protocolo
            </Button>
          </div>
        </div>

        {/* Quick Templates */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {QUICK_TEMPLATES.map((template, i) => (
            <Card
              key={i}
              className="p-4 hover:shadow-md transition-all cursor-pointer group border-l-4 overflow-hidden relative"
              style={{ borderLeftColor: 'transparent' }}
              onClick={() => {
                if (template.name === 'Pós-Cirúrgico Ortopédico') setActiveTab('pos_operatorio');
                if (template.name === 'Tratamento Conservador') setActiveTab('patologia');
                if (template.name === 'Reabilitação Esportiva') {
                  setActiveTab('patologia');
                  setSearch('esportiva'); // Assuming search helps here, or add logic
                }
                if (template.name === 'Idosos e Geriatria') {
                  setActiveTab('patologia');
                  setSearch('idoso');
                }
              }}
            >
              <div className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${template.color}`} />
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm group-hover:text-primary transition-colors">{template.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{template.count} protocolos</p>
                </div>
                <template.icon className={`h-5 w-5 text-muted-foreground/50 group-hover:scale-110 transition-transform`} />
              </div>
            </Card>
          ))}
        </div>

        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-card p-4 rounded-xl border shadow-sm">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, patologia ou região..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background/50"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
              <div className="flex items-center gap-1 bg-muted p-1 rounded-lg mr-2">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <SortAsc className="h-4 w-4" />
                    Ordenar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Mais Recentes</DropdownMenuItem>
                  <DropdownMenuItem>Nome (A-Z)</DropdownMenuItem>
                  <DropdownMenuItem>Mais Utilizados</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                Filtros
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'patologia' | 'pos_operatorio' | 'preventivo')} className="space-y-6">
            <ScrollArea className="w-full">
              <TabsList className="w-full justify-start h-auto p-1 bg-transparent border-b rounded-none mb-1 gap-6">
                <TabsTrigger
                  value="pos_operatorio"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 py-3 font-medium text-muted-foreground data-[state=active]:text-foreground transition-all"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Pós-Operatórios
                  </div>
                </TabsTrigger>
                <TabsTrigger
                  value="patologia"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 py-3 font-medium text-muted-foreground data-[state=active]:text-foreground transition-all"
                >
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Tratamento Conservador
                  </div>
                </TabsTrigger>
                <TabsTrigger
                  value="preventivo"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 py-3 font-medium text-muted-foreground data-[state=active]:text-foreground transition-all"
                >
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Preventivos
                  </div>
                </TabsTrigger>
              </TabsList>
            </ScrollArea>

            {/* Categories Pills */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {PROTOCOL_CATEGORIES.map(cat => (
                <Button
                  key={cat.id}
                  variant={categoryFilter === cat.id ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    "rounded-full whitespace-nowrap gap-2",
                    categoryFilter === cat.id ? "" : "hover:border-primary/50 text-muted-foreground"
                  )}
                  onClick={() => setCategoryFilter(cat.id)}
                >
                  <cat.icon className="h-3.5 w-3.5" />
                  {cat.label}
                </Button>
              ))}
            </div>

            <TabsContent value={activeTab} className="mt-0">
              {loading ? (
                <div className={cn(
                  "grid gap-4",
                  viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
                )}>
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Card key={i} className="p-4 h-[200px] flex flex-col justify-between">
                      <div className="space-y-3">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                      <div className="flex gap-2">
                        <Skeleton className="h-8 w-20" />
                        <Skeleton className="h-8 w-20" />
                      </div>
                    </Card>
                  ))}
                </div>
              ) : filteredProtocols.length === 0 ? (
                <div className="text-center py-16 bg-muted/20 rounded-xl border border-dashed animate-fade-in">
                  <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Target className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Nenhum protocolo encontrado</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                    Não encontramos protocolos com os filtros atuais.
                    <br />Tente buscar por outro termo ou limpe os filtros.
                  </p>
                  <Button onClick={() => { setSearch(''); setCategoryFilter('all'); }}>
                    Limpar Filtros
                  </Button>
                </div>
              ) : (
                <div className={cn(
                  "grid gap-4",
                  viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
                )}>
                  {filteredProtocols.map(protocol => (
                    <ProtocolCardEnhanced
                      key={protocol.id}
                      protocol={protocol}
                      onClick={() => setSelectedProtocol(protocol)}
                      onEdit={(p) => {
                        setEditingProtocol(p);
                        setShowNewProtocolModal(true);
                      }}
                      onDelete={(id) => setDeleteId(id)}
                      onDuplicate={handleDuplicate}
                      onFavorite={handleFavorite}
                      isFavorite={favorites.includes(protocol.id)}
                      viewMode={viewMode}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <NewProtocolModal
          open={showNewProtocolModal}
          onOpenChange={setShowNewProtocolModal}
          onSubmit={handleSubmitProtocol}
          protocol={editingProtocol || undefined}
          isLoading={isCreating || isUpdating}
        />

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este protocolo? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
