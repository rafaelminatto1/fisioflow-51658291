import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  Search, 
  Clock, 
  AlertCircle, 
  Calendar,
  X,
  Edit,
  MoreVertical,
  Phone,
  Mail
} from 'lucide-react';
import { useWaitlist, type WaitlistEntry } from '@/hooks/useWaitlist';
import { WaitlistEntryModal } from './WaitlistEntryModal';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export function WaitlistManager() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WaitlistEntry | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  
  const { waitlist, loading, removeFromWaitlist, updateWaitlist, isRemoving } = useWaitlist();

  const filteredWaitlist = useMemo(() => {
    return waitlist.filter(entry => {
      const matchesSearch = !searchQuery || 
        entry.patient?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.patient?.phone?.includes(searchQuery) ||
        entry.patient?.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPriority = priorityFilter === 'all' || entry.priority === priorityFilter;
      return matchesSearch && matchesPriority;
    });
  }, [waitlist, searchQuery, priorityFilter]);

  const getPriorityColor = useCallback((priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30';
      case 'high': return 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30';
      default: return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30';
    }
  }, []);

  const getPriorityLabel = useCallback((priority: string) => {
    switch (priority) {
      case 'urgent': return 'Urgente';
      case 'high': return 'Alta';
      default: return 'Normal';
    }
  }, []);

  const handleChangePriority = useCallback((id: string, priority: 'normal' | 'high' | 'urgent') => {
    updateWaitlist({ id, priority });
  }, [updateWaitlist]);

  const handleDelete = useCallback(() => {
    if (deleteId) {
      removeFromWaitlist(deleteId);
      setDeleteId(null);
    }
  }, [deleteId, removeFromWaitlist]);

  const stats = useMemo(() => ({
    total: waitlist.length,
    urgent: waitlist.filter(w => w.priority === 'urgent').length,
    high: waitlist.filter(w => w.priority === 'high').length,
    avgWaitTime: waitlist.length > 0 
      ? Math.round(
          waitlist.reduce((acc, entry) => {
            const days = Math.floor(
              (new Date().getTime() - new Date(entry.added_at).getTime()) / (1000 * 60 * 60 * 24)
            );
            return acc + days;
          }, 0) / waitlist.length
        )
      : 0,
  }), [waitlist]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="hover:shadow-md transition-all">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Na Lista</p>
                <p className="text-lg sm:text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Urgentes</p>
                <p className="text-lg sm:text-2xl font-bold">{stats.urgent}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Alta Prioridade</p>
                <p className="text-lg sm:text-2xl font-bold">{stats.high}</p>
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
                <p className="text-[10px] sm:text-xs text-muted-foreground">Espera Média</p>
                <p className="text-lg sm:text-2xl font-bold">{stats.avgWaitTime} dias</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Lista de Espera</CardTitle>
              <CardDescription>
                Pacientes aguardando vagas disponíveis
              </CardDescription>
            </div>
            <Button onClick={() => { setEditingEntry(null); setShowAddModal(true); }} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar paciente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas prioridades</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Lista */}
            <ScrollArea className="h-[500px]">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando lista de espera...
                </div>
              ) : filteredWaitlist.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery || priorityFilter !== 'all' ? 'Nenhum paciente encontrado' : 'Lista de espera vazia'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredWaitlist.map((entry, index) => (
                    <Card key={entry.id} className="hover:shadow-md transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-sm">
                              {index + 1}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <h4 className="font-semibold truncate">
                                  {entry.patient?.name}
                                </h4>
                                <Badge variant="outline" className={cn(getPriorityColor(entry.priority))}>
                                  {getPriorityLabel(entry.priority)}
                                </Badge>
                              </div>

                              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDistanceToNow(new Date(entry.added_at), {
                                    addSuffix: true,
                                    locale: ptBR,
                                  })}
                                </span>

                                {entry.patient?.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {entry.patient.phone}
                                  </span>
                                )}

                                {entry.patient?.email && (
                                  <span className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {entry.patient.email}
                                  </span>
                                )}

                                {entry.preferred_days && entry.preferred_days.length > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {entry.preferred_days.length} dias preferidos
                                  </span>
                                )}

                                {entry.notification_count > 0 && (
                                  <span className="flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    {entry.notification_count} notificações
                                  </span>
                                )}
                              </div>

                              {entry.priority_reason && (
                                <p className="text-sm text-muted-foreground mt-2 italic">
                                  {entry.priority_reason}
                                </p>
                              )}

                              {entry.notes && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  {entry.notes}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2 flex-shrink-0">
                            <Button size="sm" variant="outline" className="hidden sm:flex">
                              <Calendar className="h-4 w-4 mr-2" />
                              Agendar
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="ghost">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem className="sm:hidden">
                                  <Calendar className="h-4 w-4 mr-2" />
                                  Agendar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setEditingEntry(entry); setShowAddModal(true); }}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleChangePriority(entry.id, 'urgent')}>
                                  Definir como Urgente
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleChangePriority(entry.id, 'high')}>
                                  Definir como Alta
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleChangePriority(entry.id, 'normal')}>
                                  Definir como Normal
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setDeleteId(entry.id)}
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Remover
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      <WaitlistEntryModal
        open={showAddModal}
        onOpenChange={(open) => { setShowAddModal(open); if (!open) setEditingEntry(null); }}
        entry={editingEntry || undefined}
      />

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover da Lista</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este paciente da lista de espera?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              {isRemoving ? 'Removendo...' : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
