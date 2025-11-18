import { useState, useMemo } from 'react';
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
  CheckCircle
} from 'lucide-react';
import { useWaitlist } from '@/hooks/useWaitlist';
import { WaitlistEntryModal } from './WaitlistEntryModal';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function WaitlistManager() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const { waitlist, loading, removeFromWaitlist } = useWaitlist();

  const filteredWaitlist = useMemo(() => {
    return waitlist.filter(entry => 
      entry.patient?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [waitlist, searchQuery]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      default: return 'secondary';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'Urgente';
      case 'high': return 'Alta';
      default: return 'Normal';
    }
  };

  const stats = {
    total: waitlist.length,
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
  };

  return (
    <div className="space-y-6">
      {/* Header com estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total na Lista</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">pacientes aguardando</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.avgWaitTime}</div>
            <p className="text-xs text-muted-foreground mt-1">dias de espera</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Prioridades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Badge variant="destructive">
                {waitlist.filter(w => w.priority === 'urgent').length} Urgente
              </Badge>
              <Badge>
                {waitlist.filter(w => w.priority === 'high').length} Alta
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de espera */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Espera</CardTitle>
              <CardDescription>
                Pacientes aguardando vagas disponíveis
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar paciente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
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
                    {searchQuery ? 'Nenhum paciente encontrado' : 'Lista de espera vazia'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredWaitlist.map((entry, index) => (
                    <Card key={entry.id} className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-sm">
                            {index + 1}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold truncate">
                                {entry.patient?.name}
                              </h4>
                              <Badge variant={getPriorityColor(entry.priority)}>
                                {getPriorityLabel(entry.priority)}
                              </Badge>
                            </div>

                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDistanceToNow(new Date(entry.added_at), {
                                  addSuffix: true,
                                  locale: ptBR,
                                })}
                              </span>

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
                          <Button size="sm" variant="outline">
                            <Calendar className="h-4 w-4 mr-2" />
                            Agendar
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => removeFromWaitlist(entry.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      {/* Modal para adicionar à lista */}
      <WaitlistEntryModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
      />
    </div>
  );
}
