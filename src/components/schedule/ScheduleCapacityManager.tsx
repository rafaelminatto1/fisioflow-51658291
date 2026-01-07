import { useState } from 'react';
import { useScheduleCapacity } from '@/hooks/useScheduleCapacity';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Plus, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Segunda-feira' },
  { value: 'tuesday', label: 'Terça-feira' },
  { value: 'wednesday', label: 'Quarta-feira' },
  { value: 'thursday', label: 'Quinta-feira' },
  { value: 'friday', label: 'Sexta-feira' },
  { value: 'saturday', label: 'Sábado' },
  { value: 'sunday', label: 'Domingo' },
];

export function ScheduleCapacityManager() {
  const { capacities, isLoading, createMultipleCapacities, updateCapacity, deleteCapacity, organizationId, isCreating, checkConflicts, authError } = useScheduleCapacity();
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
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

    setIsAdding(false);
    setNewCapacity({ selectedDays: [], start_time: '07:00', end_time: '13:00', max_patients: 3 });
  };

  const handleUpdate = async (id: string, max_patients: number) => {
    updateCapacity({ id, max_patients });
  };

  const handleDelete = async (id: string) => {
    deleteCapacity(id);
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando configurações...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Capacidade da Agenda
        </CardTitle>
        <CardDescription>
          Configure quantos pacientes podem ser atendidos por horário
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {authError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro de Autenticação</AlertTitle>
            <AlertDescription>
              {authError}. Por favor, faça logout e login novamente para corrigir sua sessão.
            </AlertDescription>
          </Alert>
        )}

        {/* Lista de capacidades existentes */}
        <div className="space-y-3">
          {DAYS_OF_WEEK.map((day) => {
            const dayMap: Record<string, number> = {
              'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
              'thursday': 4, 'friday': 5, 'saturday': 6
            };
            const dayCapacities = capacities.filter((c) => c.day_of_week === dayMap[day.value]);

            if (dayCapacities.length === 0) return null;

            return (
              <div key={day.value} className="space-y-2">
                <h4 className="font-medium text-sm">{day.label}</h4>
                {dayCapacities.map((capacity) => (
                  <div key={capacity.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <div className="flex-1 grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Início:</span> {capacity.start_time}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Fim:</span> {capacity.end_time}
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`capacity-${capacity.id}`} className="text-muted-foreground">
                          Pacientes:
                        </Label>
                        <Input
                          id={`capacity-${capacity.id}`}
                          type="number"
                          min={1}
                          max={10}
                          defaultValue={capacity.max_patients}
                          onBlur={(e) => {
                            const value = parseInt(e.target.value);
                            if (value !== capacity.max_patients) {
                              handleUpdate(capacity.id, value);
                            }
                          }}
                          className="w-16 h-8"
                        />
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(capacity.id)}
                      className="h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Formulário de adicionar */}
        {isAdding ? (
          <div className="p-4 border rounded-lg space-y-3">
            <div>
              <Label className="mb-2 block">Dias da Semana</Label>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Pacientes por Horário</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={newCapacity.max_patients}
                  onChange={(e) => setNewCapacity({ ...newCapacity, max_patients: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Horário Início</Label>
                <Input
                  type="time"
                  value={newCapacity.start_time}
                  onChange={(e) => setNewCapacity({ ...newCapacity, start_time: e.target.value })}
                />
              </div>
              <div>
                <Label>Horário Fim</Label>
                <Input
                  type="time"
                  value={newCapacity.end_time}
                  onChange={(e) => setNewCapacity({ ...newCapacity, end_time: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleAdd}
                disabled={
                  isCreating ||
                  !organizationId ||
                  newCapacity.selectedDays.length === 0 ||
                  !newCapacity.start_time ||
                  !newCapacity.end_time
                }
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : 'Adicionar'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAdding(false);
                  setNewCapacity({ selectedDays: [], start_time: '07:00', end_time: '13:00', max_patients: 3 });
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => setIsAdding(true)} variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Configuração
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
