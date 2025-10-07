import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { NewEventoModal } from '@/components/eventos/NewEventoModal';
import { EditEventoModal } from '@/components/eventos/EditEventoModal';
import { useEventos, useDeleteEvento } from '@/hooks/useEventos';
import { useRealtimeEventos } from '@/hooks/useRealtimeEventos';
import { usePermissions } from '@/hooks/usePermissions';
import { 
  Calendar, 
  MapPin, 
  DollarSign, 
  Users, 
  Plus, 
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Eventos() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todos');
  const [newEventoOpen, setNewEventoOpen] = useState(false);
  const [editEventoOpen, setEditEventoOpen] = useState(false);
  const [selectedEvento, setSelectedEvento] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventoToDelete, setEventoToDelete] = useState<string | null>(null);

  // Permissões e segurança
  const { canWrite, canDelete } = usePermissions();

  // Habilitar atualizações em tempo real
  useRealtimeEventos();

  const { data: eventos = [], isLoading } = useEventos({
    status: filtroStatus,
    categoria: filtroCategoria,
    busca,
  });

  const deleteEvento = useDeleteEvento();

  const handleDelete = async () => {
    if (eventoToDelete) {
      await deleteEvento.mutateAsync(eventoToDelete);
      setDeleteDialogOpen(false);
      setEventoToDelete(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AGENDADO':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'EM_ANDAMENTO':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'CONCLUIDO':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'CANCELADO':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getCategoriaLabel = (categoria: string) => {
    const labels: Record<string, string> = {
      corrida: 'Corrida',
      corporativo: 'Corporativo',
      ativacao: 'Ativação',
      workshop: 'Workshop',
      outro: 'Outro',
    };
    return labels[categoria] || categoria;
  };

  const eventosFiltrados = eventos;

  return (
    <MainLayout>
      <NewEventoModal open={newEventoOpen} onOpenChange={setNewEventoOpen} />
      {selectedEvento && (
        <EditEventoModal
          open={editEventoOpen}
          onOpenChange={setEditEventoOpen}
          evento={selectedEvento}
        />
      )}
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita e todos os dados relacionados (prestadores, participantes, checklist) serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Eventos</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie todos os eventos da clínica
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/eventos/analytics')}>
              📊 Analytics
            </Button>
            {canWrite('eventos') && (
              <Button className="gap-2" onClick={() => setNewEventoOpen(true)}>
                <Plus className="w-4 h-4" />
                Novo Evento
              </Button>
            )}
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou local..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="AGENDADO">Agendado</SelectItem>
                  <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                  <SelectItem value="CONCLUIDO">Concluído</SelectItem>
                  <SelectItem value="CANCELADO">Cancelado</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="corrida">Corrida</SelectItem>
                  <SelectItem value="corporativo">Corporativo</SelectItem>
                  <SelectItem value="ativacao">Ativação</SelectItem>
                  <SelectItem value="workshop">Workshop</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Eventos */}
        {isLoading ? (
          <LoadingSkeleton type="card" rows={3} />
        ) : eventosFiltrados.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="Nenhum evento encontrado"
            description={
              busca || filtroStatus !== 'todos' || filtroCategoria !== 'todos'
                ? 'Tente ajustar os filtros de busca'
                : 'Comece criando seu primeiro evento'
            }
            action={
              !busca && filtroStatus === 'todos' && filtroCategoria === 'todos' && canWrite('eventos')
                ? {
                    label: 'Criar Primeiro Evento',
                    onClick: () => setNewEventoOpen(true)
                  }
                : undefined
            }
          />
          ) : (
            <div className="grid gap-4">
              {eventosFiltrados.map((evento) => (
                <Card key={evento.id} className="hover:shadow-lg transition-all duration-300 animate-fade-in">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-xl">{evento.nome}</CardTitle>
                        <Badge variant="outline" className={getStatusColor(evento.status)}>
                          {evento.status.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline">
                          {getCategoriaLabel(evento.categoria)}
                        </Badge>
                      </div>
                      {evento.descricao && (
                        <p className="text-muted-foreground text-sm">{evento.descricao}</p>
                      )}
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/eventos/${evento.id}`)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Visualizar
                        </DropdownMenuItem>
                        {canWrite('eventos') && (
                          <DropdownMenuItem onClick={() => {
                            setSelectedEvento(evento);
                            setEditEventoOpen(true);
                          }}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                        )}
                        {canDelete('eventos') && (
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => {
                              setEventoToDelete(evento.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground text-xs">Data</p>
                          <p className="font-medium">
                            {format(new Date(evento.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground text-xs">Local</p>
                        <p className="font-medium">{evento.local}</p>
                      </div>
                    </div>
                    
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground text-xs">Participantes</p>
                          <p className="font-medium">0</p>
                        </div>
                      </div>
                    
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground text-xs">Custo Total</p>
                          <p className="font-medium">R$ 0,00</p>
                        </div>
                      </div>
                  </div>
                  
                    <div className="mt-4 pt-4 border-t flex justify-between items-center">
                      <div className="flex gap-2">
                        <Badge variant="secondary" className="text-xs">
                          0 prestadores
                        </Badge>
                      {evento.gratuito && (
                        <Badge variant="outline" className="text-xs">
                          Gratuito
                        </Badge>
                      )}
                    </div>
                    
                    <Button variant="outline" size="sm" onClick={() => navigate(`/eventos/${evento.id}`)}>
                      <Eye className="w-3 h-3 mr-2" />
                      Ver Detalhes
                    </Button>
                  </div>
                </CardContent>
              </Card>
              ))}
            </div>
          )
        }
      </div>
    </MainLayout>
  );
}
