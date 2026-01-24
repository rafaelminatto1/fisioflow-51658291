import { useState } from 'react';
import { useScheduleCapacity } from '@/hooks/useScheduleCapacity';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Trash2, Plus, Clock, Loader2, Users, CheckCircle2, Info, Calendar, Copy, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Segunda', valueNum: 1 },
  { value: 'tuesday', label: 'Terça', valueNum: 2 },
  { value: 'wednesday', label: 'Quarta', valueNum: 3 },
  { value: 'thursday', label: 'Quinta', valueNum: 4 },
  { value: 'friday', label: 'Sexta', valueNum: 5 },
  { value: 'saturday', label: 'Sábado', valueNum: 6 },
  { value: 'sunday', label: 'Domingo', valueNum: 0 },
];

const TIME_PRESETS = [
  { label: 'Manhã', start: '07:00', end: '12:00', icon: '☀️' },
  { label: 'Tarde', start: '13:00', end: '18:00', icon: '🌤️' },
  { label: 'Integral', start: '07:00', end: '19:00', icon: '📅' },
];

// Quick capacity presets for common scenarios
const CAPACITY_PRESETS = [
  { label: 'Baixa', value: 1, description: '1 por horário', color: 'bg-green-500' },
  { label: 'Normal', value: 3, description: '3 por horário', color: 'bg-yellow-500' },
  { label: 'Alta', value: 5, description: '5 por horário', color: 'bg-orange-500' },
  { label: 'Máxima', value: 8, description: '8 por horário', color: 'bg-red-500' },
];

export function ScheduleCapacityManager() {
  const { capacities, isLoading, createMultipleCapacities, updateCapacity, deleteCapacity, organizationId, isCreating, checkConflicts, authError } = useScheduleCapacity();
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newCapacity, setNewCapacity] = useState({
    selectedDays: [] as string[],
    start_time: '07:00',
    end_time: '13:00',
    max_patients: 3,
  });

  const handleAdd = async () => {
    if (!organizationId) {
      toast({ title: 'Erro', description: 'Organização não carregada. Aguarde.', variant: 'destructive' });
      return;
    }

    // Validações
    if (newCapacity.selectedDays.length === 0) {
      toast({ title: 'Erro', description: 'Selecione pelo menos um dia da semana', variant: 'destructive' });
      return;
    }

    if (!newCapacity.start_time || !newCapacity.end_time) {
      toast({ title: 'Erro', description: 'Preencha horário de início e fim', variant: 'destructive' });
      return;
    }

    // Verificar se horário de início é anterior ao fim
    const startMinutes = newCapacity.start_time.split(':').map(Number);
    const endMinutes = newCapacity.end_time.split(':').map(Number);
    const startTime = startMinutes[0] * 60 + startMinutes[1];
    const endTime = endMinutes[0] * 60 + endMinutes[1];

    if (startTime >= endTime) {
      toast({ title: 'Erro', description: 'Horário de início deve ser anterior ao horário de fim', variant: 'destructive' });
      return;
    }

    // Converter dias selecionados para números
    const dayMap: Record<string, number> = {
      'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
      'thursday': 4, 'friday': 5, 'saturday': 6
    };
    const selectedDaysNumbers = newCapacity.selectedDays.map(day => dayMap[day]);

    // Verificar conflitos
    const conflictCheck = checkConflicts(
      selectedDaysNumbers,
      newCapacity.start_time,
      newCapacity.end_time
    );

    if (conflictCheck.hasConflict) {
      const conflictMessages = conflictCheck.conflicts.map(
        conflict => `${conflict.dayLabel} (${conflict.start}-${conflict.end})`
      ).join(', ');
      toast({
        title: 'Conflito detectado',
        description: `Já existe uma configuração que se sobrepõe: ${conflictMessages}. Por favor, ajuste os horários.`,
        variant: 'destructive',
      });
      return;
    }

    // Criar configurações para cada dia selecionado
    const formDataArray = selectedDaysNumbers.map(day => ({
      day_of_week: day,
      start_time: newCapacity.start_time,
      end_time: newCapacity.end_time,
      max_patients: newCapacity.max_patients,
    }));

    createMultipleCapacities(formDataArray);

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setIsAdding(false);
    setNewCapacity({ selectedDays: [], start_time: '07:00', end_time: '13:00', max_patients: 3 });
  };

  const handleUpdate = async (id: string, max_patients: number) => {
    updateCapacity({ id, max_patients });
    setSaved(false);
  };

  const handleDelete = async (id: string) => {
    deleteCapacity(id);
  };

  const applyTimePreset = (preset: typeof TIME_PRESETS[0]) => {
    setNewCapacity({ ...newCapacity, start_time: preset.start, end_time: preset.end });
  };

  const getCapacityLevel = (maxPatients: number) => {
    if (maxPatients <= 2) return { label: 'Baixa', color: 'bg-green-500', bg: 'bg-green-100 dark:bg-green-900/30' };
    if (maxPatients <= 4) return { label: 'Média', color: 'bg-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30' };
    return { label: 'Alta', color: 'bg-red-500', bg: 'bg-red-100 dark:bg-red-900/30' };
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Carregando configurações...</p>
        </CardContent>
      </Card>
    );
  }

  const totalSlots = capacities.reduce((sum, cap) => sum + cap.max_patients, 0);

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-t-xl">
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 bg-green-500 rounded-lg">
            <Users className="h-5 w-5 text-white" />
          </div>
          Capacidade da Agenda
        </CardTitle>
        <CardDescription>
          Configure quantos pacientes podem ser atendidos por horário
        </CardDescription>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="secondary" className="text-xs">
            {totalSlots} vagas/dia
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        {authError && (
          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertTitle>Erro de Autenticação</AlertTitle>
            <AlertDescription>
              {authError}. Por favor, faça logout e login novamente para corrigir sua sessão.
            </AlertDescription>
          </Alert>
        )}

        {/* Info Banner */}
        <Alert className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <Calendar className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700 dark:text-blue-300 text-sm">
            Configure diferentes capacidades para cada período do dia. Por exemplo, 3 pacientes pela manhã e 2 à tarde.
          </AlertDescription>
        </Alert>

        {/* Lista de capacidades existentes */}
        <div className="space-y-4">
          {/* Days with configuration */}
          <div className="space-y-3">
            {DAYS_OF_WEEK.filter(day => capacities.some(c => c.day_of_week === day.valueNum)).map((day) => {
              const dayCapacities = capacities.filter((c) => c.day_of_week === day.valueNum);
              const dayTotal = dayCapacities.reduce((sum, c) => sum + c.max_patients, 0);

              return (
                <div key={day.value} className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <h4 className="font-semibold text-sm">{day.label}</h4>
                    <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400">
                      {dayCapacities.length} período{dayCapacities.length > 1 ? 's' : ''}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {dayTotal} vagas
                    </Badge>
                  </div>
                  {dayCapacities.map((capacity) => {
                    const level = getCapacityLevel(capacity.max_patients);
                    return (
                      <div
                        key={capacity.id}
                        className={cn(
                          "group flex items-center gap-3 p-4 rounded-xl border-2 transition-all hover:shadow-md",
                          level.bg,
                          "hover:scale-[1.01] active:scale-[0.99]"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-fit">
                          <div className={cn(
                            "w-3 h-3 rounded-full shadow-sm",
                            level.color
                          )} />
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium tabular-nums">{capacity.start_time}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="text-sm font-medium tabular-nums">{capacity.end_time}</span>
                        </div>

                        <div className="flex items-center gap-3 flex-1">
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`capacity-${capacity.id}`} className="text-sm cursor-pointer">
                              Capacidade:
                            </Label>
                            <Badge variant="outline" className="font-bold min-w-[60px] justify-center">
                              {capacity.max_patients}
                            </Badge>
                            <span className="text-xs text-muted-foreground">paciente{capacity.max_patients > 1 ? 's' : ''}</span>
                          </div>
                          <div className="flex-1 max-w-[150px]">
                            <Slider
                              id={`capacity-${capacity.id}`}
                              value={[capacity.max_patients]}
                              onValueChange={([value]) => handleUpdate(capacity.id, value)}
                              min={1}
                              max={10}
                              step={1}
                              className="cursor-pointer"
                            />
                          </div>
                        </div>

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(capacity.id)}
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600"
                          aria-label="Remover configuração"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Days without configuration - Improved empty state */}
          {DAYS_OF_WEEK.filter(day => !capacities.some(c => c.day_of_week === day.valueNum)).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground px-1">Dias sem configuração:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {DAYS_OF_WEEK.filter(day => !capacities.some(c => c.day_of_week === day.valueNum)).map((day) => (
                  <div
                    key={day.value}
                    className="flex items-center gap-2 p-3 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                    <span className="text-sm text-muted-foreground">{day.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Formulário de adicionar */}
        {isAdding ? (
          <div className="p-4 rounded-xl border bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 space-y-4 animate-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base">Nova Configuração</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsAdding(false);
                  setNewCapacity({ selectedDays: [], start_time: '07:00', end_time: '13:00', max_patients: 3 });
                }}
              >
                Cancelar
              </Button>
            </div>

            {/* Presets de horário */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Presets de Horário</Label>
              <div className="grid grid-cols-3 gap-2">
                {TIME_PRESETS.map((preset) => (
                  <Button
                    key={preset.label}
                    size="sm"
                    variant={newCapacity.start_time === preset.start && newCapacity.end_time === preset.end ? "default" : "outline"}
                    onClick={() => applyTimePreset(preset)}
                    className={cn(
                      "h-auto flex-col gap-1 py-3 transition-all hover:scale-[1.02]",
                      newCapacity.start_time === preset.start && newCapacity.end_time === preset.end && "ring-2 ring-primary/50"
                    )}
                  >
                    <span className="text-lg">{preset.icon}</span>
                    <span className="text-xs font-medium">{preset.label}</span>
                    <span className="text-[10px] text-muted-foreground">{preset.start} - {preset.end}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Quick capacity presets */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Capacidade Rápida</Label>
              <div className="grid grid-cols-4 gap-2">
                {CAPACITY_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => setNewCapacity({ ...newCapacity, max_patients: preset.value })}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all hover:scale-[1.02]",
                      newCapacity.max_patients === preset.value
                        ? "border-current bg-current/10"
                        : "border-border hover:border-current/50"
                    )}
                    style={newCapacity.max_patients === preset.value ? { color: preset.value === 1 ? '#16a34a' : preset.value === 3 ? '#ca8a04' : preset.value === 5 ? '#ea580c' : '#dc2626' } : {}}
                  >
                    <span className="text-2xl font-bold">{preset.value}</span>
                    <span className="text-xs text-muted-foreground">{preset.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Dias da semana */}
            <div>
              <Label className="mb-3 block text-sm font-medium">Dias da Semana</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`day-${day.value}`}
                      checked={newCapacity.selectedDays.includes(day.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setNewCapacity({
                            ...newCapacity,
                            selectedDays: [...newCapacity.selectedDays, day.value],
                          });
                        } else {
                          setNewCapacity({
                            ...newCapacity,
                            selectedDays: newCapacity.selectedDays.filter(d => d !== day.value),
                          });
                        }
                      }}
                    />
                    <Label
                      htmlFor={`day-${day.value}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {day.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Horários */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-2 block text-sm font-medium">Horário Início</Label>
                <Input
                  type="time"
                  value={newCapacity.start_time}
                  onChange={(e) => setNewCapacity({ ...newCapacity, start_time: e.target.value })}
                  className="font-medium"
                />
              </div>
              <div>
                <Label className="mb-2 block text-sm font-medium">Horário Fim</Label>
                <Input
                  type="time"
                  value={newCapacity.end_time}
                  onChange={(e) => setNewCapacity({ ...newCapacity, end_time: e.target.value })}
                  className="font-medium"
                />
              </div>
            </div>

            {/* Capacidade */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Pacientes por Horário
                </Label>
                <Badge variant="outline" className="font-bold">
                  {newCapacity.max_patients}
                </Badge>
              </div>
              <Slider
                value={[newCapacity.max_patients]}
                onValueChange={([value]) => setNewCapacity({ ...newCapacity, max_patients: value })}
                min={1}
                max={10}
                step={1}
                className="cursor-pointer"
              />
              <div className="flex justify-between text-xs text-muted-foreground px-1">
                <span>1</span>
                <span>3</span>
                <span>5</span>
                <span>8</span>
                <span>10</span>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleAdd}
                disabled={
                  isCreating ||
                  newCapacity.selectedDays.length === 0 ||
                  !newCapacity.start_time ||
                  !newCapacity.end_time
                }
                className="flex-1 h-11"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Adicionando...
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5 mr-2" />
                    Adicionar Configuração
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            onClick={() => setIsAdding(true)}
            className={cn(
              "w-full h-12 text-base font-semibold transition-all",
              saved && "bg-green-600 hover:bg-green-700"
            )}
          >
            {saved ? (
              <>
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Configuração adicionada!
              </>
            ) : (
              <>
                <Plus className="h-5 w-5 mr-2" />
                Adicionar Configuração
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
