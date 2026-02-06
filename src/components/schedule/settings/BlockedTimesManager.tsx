import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { CalendarOff, Plus, Trash2, Loader2, Calendar, Clock, Info, CheckCircle2, Umbrella, PartyPopper, GraduationCap, Wrench } from 'lucide-react';
import { useScheduleSettings, BlockedTime } from '@/hooks/useScheduleSettings';
import { format, parseISO, isToday, isThisWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

const QUICK_TEMPLATES = [
  {
    title: 'Férias',
    icon: Umbrella,
    days: 7,
    reason: 'Período de férias',
    color: 'from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-200 dark:border-blue-800',
  },
  {
    title: 'Feriado',
    icon: PartyPopper,
    days: 1,
    reason: 'Feriado nacional',
    color: 'from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800',
  },
  {
    title: 'Curso',
    icon: GraduationCap,
    days: 3,
    reason: 'Participação em curso/evento',
    color: 'from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 border-purple-200 dark:border-purple-800',
  },
  {
    title: 'Manutenção',
    icon: Wrench,
    days: 1,
    reason: 'Manutenção da clínica',
    color: 'from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800',
  },
];

export function BlockedTimesManager() {
  const { blockedTimes, createBlockedTime, deleteBlockedTime, isLoadingBlocked } = useScheduleSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [saved, setSaved] = useState(false);
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
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setIsOpen(false);
    resetForm();
  };

  const resetForm = () => {
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

  const applyTemplate = (template: typeof QUICK_TEMPLATES[0]) => {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + template.days);

    setNewBlocked({
      ...newBlocked,
      title: template.title,
      reason: template.reason,
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: format(endDate, 'yyyy-MM-dd'),
    });
  };

  const formatDateRange = (blocked: BlockedTime) => {
    const start = format(parseISO(blocked.start_date), "dd/MM", { locale: ptBR });
    const end = format(parseISO(blocked.end_date), "dd/MM", { locale: ptBR });

    if (start === end) {
      const date = parseISO(blocked.start_date);
      const isTodayDate = isToday(date);
      const isThisWeekDate = isThisWeek(date);

      return (
        <span className="flex items-center gap-2">
          {isTodayDate && <Badge variant="secondary" className="text-xs">Hoje</Badge>}
          {isThisWeekDate && !isTodayDate && <Badge variant="outline" className="text-xs">Esta semana</Badge>}
          <span>{start}</span>
          {blocked.is_all_day && (
            <Badge variant="secondary" className="text-xs">Dia inteiro</Badge>
          )}
          {!blocked.is_all_day && (
            <span className="text-muted-foreground">
              {blocked.start_time?.slice(0, 5)} - {blocked.end_time?.slice(0, 5)}
            </span>
          )}
        </span>
      );
    }

    return <span>{start} até {end}</span>;
  };

  if (isLoadingBlocked) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Carregando bloqueios...</p>
        </CardContent>
      </Card>
    );
  }

  const activeBlockCount = blockedTimes.filter(b => {
    const now = new Date();
    const endDate = parseISO(b.end_date);
    return endDate >= now;
  }).length;

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 rounded-t-xl">
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 bg-red-500 rounded-lg">
            <CalendarOff className="h-5 w-5 text-white" />
          </div>
          Bloqueio de Horários
        </CardTitle>
        <CardDescription>
          Bloqueie períodos para férias, feriados ou indisponibilidades
        </CardDescription>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="secondary" className="text-xs">
            {activeBlockCount} ativo{activeBlockCount !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        {/* Info Banner */}
        <Alert className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700 dark:text-blue-300 text-sm">
            Bloqueios impedem que novos agendamentos sejam criados no período especificado.
          </AlertDescription>
        </Alert>

        {/* Quick Templates */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Modelos Rápidos</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {QUICK_TEMPLATES.map((template) => {
              const Icon = template.icon;
              return (
                <button
                  key={template.title}
                  onClick={() => applyTemplate(template)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all hover:scale-[1.02] hover:shadow-md",
                    template.color
                  )}
                >
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-xs">{template.title}</p>
                    <p className="text-[10px] text-muted-foreground">{template.days} dia{template.days > 1 ? 's' : ''}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Lista de bloqueios */}
        <div className="space-y-2">
          {blockedTimes.length > 0 ? (
            <div className="space-y-2">
              {blockedTimes.map((blocked) => {
                const isActive = new Date(blocked.end_date) >= new Date();
                return (
                  <div
                    key={blocked.id}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-xl border transition-all",
                      isActive
                        ? "bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                        : "bg-muted/30 border-muted opacity-60"
                    )}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{blocked.title}</p>
                        {isActive && (
                          <Badge variant="destructive" className="text-xs">Ativo</Badge>
                        )}
                      </div>
                      <p className="text-sm mt-1">{formatDateRange(blocked)}</p>
                      {blocked.reason && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Info className="h-3 w-3" />
                          {blocked.reason}
                        </p>
                      )}
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className={cn(
                            "h-9 w-9 transition-colors",
                            "hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600"
                          )}
                        >
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
                          <AlertDialogAction
                            onClick={() => deleteBlockedTime(blocked.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 px-4 rounded-xl border-2 border-dashed border-muted-foreground/25 bg-gradient-to-br from-muted/20 to-muted/5">
              <div className="inline-flex p-4 rounded-full bg-muted/30 mb-4">
                <CalendarOff className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <p className="text-base font-medium text-muted-foreground mb-1">
                Nenhum bloqueio configurado
              </p>
              <p className="text-sm text-muted-foreground/70 max-w-xs mx-auto">
                Clique em "Adicionar Bloqueio" ou use um dos modelos rápidos acima
              </p>
            </div>
          )}
        </div>

        {/* Botão adicionar */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className={cn(
              "w-full h-12 text-base font-semibold transition-all",
              saved && "bg-green-600 hover:bg-green-700"
            )}>
              {saved ? (
                <>
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Bloqueio adicionado!
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 mr-2" />
                  Adicionar Bloqueio
                </>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <CalendarOff className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                Novo Bloqueio de Horário
              </DialogTitle>
              <DialogDescription>
                Bloqueie um período para impedir novos agendamentos
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              {/* Título */}
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  placeholder="Ex: Férias, Feriado, Reunião..."
                  value={newBlocked.title}
                  onChange={(e) => setNewBlocked({ ...newBlocked, title: e.target.value })}
                  className="font-medium"
                />
              </div>

              {/* Datas */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    Data Início
                  </Label>
                  <Input
                    type="date"
                    value={newBlocked.start_date}
                    onChange={(e) => setNewBlocked({ ...newBlocked, start_date: e.target.value })}
                    className="font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    Data Fim
                  </Label>
                  <Input
                    type="date"
                    value={newBlocked.end_date}
                    onChange={(e) => setNewBlocked({ ...newBlocked, end_date: e.target.value })}
                    className="font-medium"
                  />
                </div>
              </div>

              {/* Dia Inteiro */}
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div>
                  <Label className="font-medium">Dia Inteiro</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Bloquear o período todo dia
                  </p>
                </div>
                <Switch
                  checked={newBlocked.is_all_day}
                  onCheckedChange={(checked) => setNewBlocked({ ...newBlocked, is_all_day: checked })}
                />
              </div>

              {/* Horários (quando não for dia inteiro) */}
              {!newBlocked.is_all_day && (
                <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-300">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-amber-500" />
                      Hora Início
                    </Label>
                    <Input
                      type="time"
                      value={newBlocked.start_time}
                      onChange={(e) => setNewBlocked({ ...newBlocked, start_time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-amber-500" />
                      Hora Fim
                    </Label>
                    <Input
                      type="time"
                      value={newBlocked.end_time}
                      onChange={(e) => setNewBlocked({ ...newBlocked, end_time: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Motivo */}
              <div className="space-y-2">
                <Label>Motivo (opcional)</Label>
                <Textarea
                  placeholder="Descreva o motivo do bloqueio..."
                  value={newBlocked.reason}
                  onChange={(e) => setNewBlocked({ ...newBlocked, reason: e.target.value })}
                  rows={2}
                  className="resize-none"
                />
              </div>

              {/* Botão criar */}
              <Button
                onClick={handleCreate}
                disabled={!newBlocked.title || !newBlocked.start_date || !newBlocked.end_date}
                className="w-full h-11 text-base font-semibold"
              >
                <Plus className="h-5 w-5 mr-2" />
                Criar Bloqueio
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
