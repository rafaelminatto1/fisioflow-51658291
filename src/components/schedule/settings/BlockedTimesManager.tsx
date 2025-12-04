import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { CalendarOff, Plus, Trash2, Loader2 } from 'lucide-react';
import { useScheduleSettings, BlockedTime } from '@/hooks/useScheduleSettings';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function BlockedTimesManager() {
  const { blockedTimes, createBlockedTime, deleteBlockedTime, isLoadingBlocked } = useScheduleSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [newBlocked, setNewBlocked] = useState({
    title: '',
    reason: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '',
    end_time: '',
    is_all_day: true,
    is_recurring: false,
    recurring_days: [] as number[],
  });

  const handleCreate = () => {
    createBlockedTime({
      ...newBlocked,
      start_time: newBlocked.is_all_day ? undefined : newBlocked.start_time,
      end_time: newBlocked.is_all_day ? undefined : newBlocked.end_time,
    });
    setIsOpen(false);
    setNewBlocked({
      title: '',
      reason: '',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: format(new Date(), 'yyyy-MM-dd'),
      start_time: '',
      end_time: '',
      is_all_day: true,
      is_recurring: false,
      recurring_days: [],
    });
  };

  const formatDateRange = (blocked: BlockedTime) => {
    const start = format(parseISO(blocked.start_date), "dd/MM/yyyy", { locale: ptBR });
    const end = format(parseISO(blocked.end_date), "dd/MM/yyyy", { locale: ptBR });
    if (start === end) {
      if (blocked.is_all_day) return `${start} (dia inteiro)`;
      return `${start} ${blocked.start_time?.slice(0, 5)} - ${blocked.end_time?.slice(0, 5)}`;
    }
    return `${start} até ${end}`;
  };

  if (isLoadingBlocked) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarOff className="h-5 w-5" />
          Bloqueio de Horários
        </CardTitle>
        <CardDescription>
          Bloqueie períodos para férias, feriados ou indisponibilidades
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lista de bloqueios */}
        {blockedTimes.length > 0 ? (
          <div className="space-y-2">
            {blockedTimes.map((blocked) => (
              <div key={blocked.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">{blocked.title}</p>
                  <p className="text-xs text-muted-foreground">{formatDateRange(blocked)}</p>
                  {blocked.reason && (
                    <p className="text-xs text-muted-foreground mt-1">{blocked.reason}</p>
                  )}
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-8 w-8">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover bloqueio?</AlertDialogTitle>
                      <AlertDialogDescription>
                        O período "{blocked.title}" será liberado para agendamentos.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteBlockedTime(blocked.id)}>
                        Remover
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum bloqueio configurado
          </p>
        )}

        {/* Botão adicionar */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Bloqueio
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Bloqueio de Horário</DialogTitle>
              <DialogDescription>
                Bloqueie um período para impedir novos agendamentos
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  placeholder="Ex: Férias, Feriado, Reunião..."
                  value={newBlocked.title}
                  onChange={(e) => setNewBlocked({ ...newBlocked, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Data Início</Label>
                  <Input
                    type="date"
                    value={newBlocked.start_date}
                    onChange={(e) => setNewBlocked({ ...newBlocked, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Fim</Label>
                  <Input
                    type="date"
                    value={newBlocked.end_date}
                    onChange={(e) => setNewBlocked({ ...newBlocked, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label>Dia Inteiro</Label>
                <Switch
                  checked={newBlocked.is_all_day}
                  onCheckedChange={(checked) => setNewBlocked({ ...newBlocked, is_all_day: checked })}
                />
              </div>

              {!newBlocked.is_all_day && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Hora Início</Label>
                    <Input
                      type="time"
                      value={newBlocked.start_time}
                      onChange={(e) => setNewBlocked({ ...newBlocked, start_time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora Fim</Label>
                    <Input
                      type="time"
                      value={newBlocked.end_time}
                      onChange={(e) => setNewBlocked({ ...newBlocked, end_time: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Motivo (opcional)</Label>
                <Textarea
                  placeholder="Descreva o motivo do bloqueio..."
                  value={newBlocked.reason}
                  onChange={(e) => setNewBlocked({ ...newBlocked, reason: e.target.value })}
                  rows={2}
                />
              </div>

              <Button 
                onClick={handleCreate} 
                disabled={!newBlocked.title || !newBlocked.start_date || !newBlocked.end_date}
                className="w-full"
              >
                Criar Bloqueio
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}