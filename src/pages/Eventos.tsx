import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Eventos() {
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todos');

  // Mock data - será substituído por dados reais do Supabase
  const eventos = [
    {
      id: '1',
      nome: 'Corrida de Rua 5K',
      descricao: 'Corrida beneficente no parque',
      categoria: 'corrida',
      local: 'Parque Ibirapuera',
      data_inicio: new Date('2025-11-15'),
      data_fim: new Date('2025-11-15'),
      status: 'AGENDADO',
      gratuito: false,
      valor_padrao_prestador: 150,
      total_prestadores: 5,
      total_participantes: 120,
      custo_total: 2500,
    },
    {
      id: '2',
      nome: 'Ação Corporativa - Empresa XYZ',
      descricao: 'Ativação em empresa',
      categoria: 'corporativo',
      local: 'Escritório Av. Paulista',
      data_inicio: new Date('2025-11-20'),
      data_fim: new Date('2025-11-20'),
      status: 'AGENDADO',
      gratuito: false,
      valor_padrao_prestador: 200,
      total_prestadores: 3,
      total_participantes: 50,
      custo_total: 1800,
    },
  ];

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
      outro: 'Outro',
    };
    return labels[categoria] || categoria;
  };

  const eventosFiltrados = eventos.filter((evento) => {
    const matchBusca = evento.nome.toLowerCase().includes(busca.toLowerCase()) ||
                       evento.local.toLowerCase().includes(busca.toLowerCase());
    const matchStatus = filtroStatus === 'todos' || evento.status === filtroStatus;
    const matchCategoria = filtroCategoria === 'todos' || evento.categoria === filtroCategoria;
    
    return matchBusca && matchStatus && matchCategoria;
  });

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Eventos</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie todos os eventos da clínica
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Evento
          </Button>
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
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Eventos */}
        <div className="grid gap-4">
          {eventosFiltrados.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum evento encontrado</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {busca || filtroStatus !== 'todos' || filtroCategoria !== 'todos'
                    ? 'Tente ajustar os filtros de busca'
                    : 'Comece criando seu primeiro evento'}
                </p>
                {!busca && filtroStatus === 'todos' && filtroCategoria === 'todos' && (
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Primeiro Evento
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            eventosFiltrados.map((evento) => (
              <Card key={evento.id} className="hover:shadow-lg transition-shadow">
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
                        <DropdownMenuItem>
                          <Eye className="w-4 h-4 mr-2" />
                          Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
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
                          {format(evento.data_inicio, 'dd/MM/yyyy', { locale: ptBR })}
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
                        <p className="font-medium">{evento.total_participantes}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground text-xs">Custo Total</p>
                        <p className="font-medium">R$ {evento.custo_total.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t flex justify-between items-center">
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {evento.total_prestadores} prestadores
                      </Badge>
                      {evento.gratuito && (
                        <Badge variant="outline" className="text-xs">
                          Gratuito
                        </Badge>
                      )}
                    </div>
                    
                    <Button variant="outline" size="sm">
                      <Eye className="w-3 h-3 mr-2" />
                      Ver Detalhes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
}
