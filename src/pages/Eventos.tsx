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
import { EventosStatsWidget } from '@/components/eventos/EventosStatsWidget';
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
  DropdownMenuSeparator,
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
import { EventPlannerAI } from '@/components/eventos/EventPlannerAI';

interface Evento {
  id: string;
  nome: string;
  descricao?: string;
  status: string;
  categoria: string;
  data_inicio: string;
  local: string;
  gratuito: boolean;
}

export default function Eventos() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todos');
  const [newEventoOpen, setNewEventoOpen] = useState(false);
  const [editEventoOpen, setEditEventoOpen] = useState(false);
  const [selectedEvento, setSelectedEvento] = useState<Evento | null>(null);
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
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
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

      <div className="space-y-4 sm:space-y-6 animate-fade-in pb-20 md:pb-0">
        {/* Header com gradiente e melhor hierarquia */}
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Eventos
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Gerencie corridas, ativações e eventos corporativos
              </p>
            </div>
            {canWrite('eventos') && (
              <Button 
                size="sm"
                className="gap-2 shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto"
                onClick={() => setNewEventoOpen(true)}
              >
                <Plus className="w-4 h-4" />
                <span className="sm:hidden">Novo</span>
                <span className="hidden sm:inline">Novo Evento</span>
              </Button>
            )}
          </div>

          <EventPlannerAI />
          
          <EventosStatsWidget />
          
          {/* Stats cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="hover:shadow-lg transition-all duration-300">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-medical shrink-0">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-2xl font-bold">{eventos.length}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-all duration-300">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-2xl font-bold">
                      {eventos.filter(e => e.status === 'AGENDADO').length}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Agendados</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-all duration-300">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-2xl font-bold">
                      {eventos.filter(e => e.status === 'CONCLUIDO').length}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Concluídos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Button 
              variant="outline" 
              className="h-full min-h-[72px] sm:min-h-[84px] hover:bg-accent/80 transition-all"
              onClick={() => navigate('/eventos/analytics')}
            >
              <div className="flex flex-col items-center gap-1 sm:gap-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-accent flex items-center justify-center">
                  <span className="text-lg sm:text-xl">📊</span>
                </div>
                <span className="text-xs sm:text-sm font-medium">Analytics</span>
              </div>
            </Button>
          </div>
        </div>

        {/* Filtros modernos e mobile-friendly */}
        <Card className="shadow-card">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex flex-col gap-3 sm:gap-4">
              {/* Busca principal */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Buscar eventos por nome ou local..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10 h-11 bg-background/50"
                />
              </div>
              
              {/* Filtros em grid responsivo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger className="h-11">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      <SelectValue placeholder="Filtrar por status" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">📋 Todos os status</SelectItem>
                    <SelectItem value="AGENDADO">🕐 Agendado</SelectItem>
                    <SelectItem value="EM_ANDAMENTO">⚡ Em Andamento</SelectItem>
                    <SelectItem value="CONCLUIDO">✅ Concluído</SelectItem>
                    <SelectItem value="CANCELADO">❌ Cancelado</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                  <SelectTrigger className="h-11">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      <SelectValue placeholder="Filtrar por categoria" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">🏷️ Todas as categorias</SelectItem>
                    <SelectItem value="corrida">🏃 Corrida</SelectItem>
                    <SelectItem value="corporativo">🏢 Corporativo</SelectItem>
                    <SelectItem value="ativacao">🎯 Ativação</SelectItem>
                    <SelectItem value="workshop">📚 Workshop</SelectItem>
                    <SelectItem value="outro">📌 Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Indicador de filtros ativos */}
              {(filtroStatus !== 'todos' || filtroCategoria !== 'todos' || busca) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{eventosFiltrados.length} evento(s) encontrado(s)</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={() => {
                      setBusca('');
                      setFiltroStatus('todos');
                      setFiltroCategoria('todos');
                    }}
                  >
                    Limpar filtros
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Grid responsivo de Eventos */}
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
            <div className="grid gap-4 animate-fade-in">
              {eventosFiltrados.map((evento, index) => (
                <Card 
                  key={evento.id} 
                  className="group overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                          <CardTitle className="text-xl md:text-2xl truncate">
                            {evento.nome}
                          </CardTitle>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={getStatusColor(evento.status)}>
                              {evento.status === 'AGENDADO' && '🕐'}
                              {evento.status === 'EM_ANDAMENTO' && '⚡'}
                              {evento.status === 'CONCLUIDO' && '✅'}
                              {evento.status === 'CANCELADO' && '❌'}
                              {' '}{evento.status.replace('_', ' ')}
                            </Badge>
                            <Badge variant="secondary">
                              {evento.categoria === 'corrida' && '🏃'}
                              {evento.categoria === 'corporativo' && '🏢'}
                              {evento.categoria === 'ativacao' && '🎯'}
                              {evento.categoria === 'workshop' && '📚'}
                              {evento.categoria === 'outro' && '📌'}
                              {' '}{getCategoriaLabel(evento.categoria)}
                            </Badge>
                            {evento.gratuito && (
                              <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">
                                Gratuito
                              </Badge>
                            )}
                          </div>
                        </div>
                        {evento.descricao && (
                          <p className="text-muted-foreground text-sm line-clamp-2">
                            {evento.descricao}
                          </p>
                        )}
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => navigate(`/eventos/${evento.id}`)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Visualizar detalhes
                          </DropdownMenuItem>
                          {canWrite('eventos') && (
                            <DropdownMenuItem onClick={() => {
                              setSelectedEvento(evento);
                              setEditEventoOpen(true);
                            }}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar evento
                            </DropdownMenuItem>
                          )}
                          {canDelete('eventos') && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onClick={() => {
                                  setEventoToDelete(evento.id);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir evento
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    {/* Informações principais em grid responsivo */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Calendar className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground mb-1">Data</p>
                          <p className="font-semibold text-sm truncate">
                            {format(new Date(evento.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                          <MapPin className="w-5 h-5 text-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground mb-1">Local</p>
                          <p className="font-semibold text-sm truncate" title={evento.local}>
                            {evento.local}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                          <Users className="w-5 h-5 text-blue-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground mb-1">Participantes</p>
                          <p className="font-semibold text-sm">0</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                          <DollarSign className="w-5 h-5 text-green-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground mb-1">Custo</p>
                          <p className="font-semibold text-sm">R$ 0,00</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Footer com ações */}
                    <div className="pt-4 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs font-normal">
                          <Users className="w-3 h-3 mr-1" />
                          0 prestadores
                        </Badge>
                      </div>
                      
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="w-full sm:w-auto shadow-md hover:shadow-lg transition-all"
                        onClick={() => navigate(`/eventos/${evento.id}`)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
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
