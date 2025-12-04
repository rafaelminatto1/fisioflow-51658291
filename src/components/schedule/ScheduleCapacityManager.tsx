import { useState } from 'react';
import { useScheduleCapacity } from '@/hooks/useScheduleCapacity';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const { capacities, isLoading, createCapacity, updateCapacity, deleteCapacity, organizationId, isCreating } = useScheduleCapacity();
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [newCapacity, setNewCapacity] = useState({
    day_of_week: 'monday',
    start_time: '07:00',
    end_time: '13:00',
    max_patients: 3,
  });

  const handleAdd = async () => {
    if (!organizationId) {
      toast({ title: 'Erro', description: 'Organização não carregada. Aguarde.', variant: 'destructive' });
      return;
    }
    
    if (!newCapacity.start_time || !newCapacity.end_time) {
      toast({ title: 'Erro', description: 'Preencha horário de início e fim', variant: 'destructive' });
      return;
    }

    // Converter day_of_week string para número
    const dayMap: Record<string, number> = {
      'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
      'thursday': 4, 'friday': 5, 'saturday': 6
    };

    createCapacity({
      day_of_week: dayMap[newCapacity.day_of_week],
      start_time: newCapacity.start_time,
      end_time: newCapacity.end_time,
      max_patients: newCapacity.max_patients
    });
    
    setIsAdding(false);
    setNewCapacity({ day_of_week: 'monday', start_time: '07:00', end_time: '13:00', max_patients: 3 });
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Dia da Semana</Label>
                <Select
                  value={newCapacity.day_of_week}
                  onValueChange={(value) => setNewCapacity({ ...newCapacity, day_of_week: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((day) => (
                      <SelectItem key={day.value} value={day.value}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Pacientes por Horário</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={newCapacity.max_patients}
                  onChange={(e) => setNewCapacity({ ...newCapacity, max_patients: parseInt(e.target.value) })}
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
              <Button onClick={handleAdd} disabled={isCreating || !organizationId}>
                {isCreating ? 'Salvando...' : 'Adicionar'}
              </Button>
              <Button variant="outline" onClick={() => setIsAdding(false)}>
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
