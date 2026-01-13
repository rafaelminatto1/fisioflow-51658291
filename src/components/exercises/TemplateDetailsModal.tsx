import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X, Search } from 'lucide-react';
import { useTemplateItems, type ExerciseTemplate } from '@/hooks/useExerciseTemplates';
import { useExercises } from '@/hooks/useExercises';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TemplateDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: ExerciseTemplate;
}

export function TemplateDetailsModal({
  open,
  onOpenChange,
  template,
}: TemplateDetailsModalProps) {
  const { items, loading, addItem, removeItem, updateItem: _updateItem } = useTemplateItems(template.id);
  const { exercises } = useExercises();
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [searchExercise, setSearchExercise] = useState('');
  const [selectedExercise, setSelectedExercise] = useState('');
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('10');
  const [weekStart, setWeekStart] = useState('');
  const [weekEnd, setWeekEnd] = useState('');

  const filteredExercises = exercises.filter(e => 
    !items.some(i => i.exercise_id === e.id) &&
    e.name?.toLowerCase().includes(searchExercise.toLowerCase())
  );

  const handleAddExercise = () => {
    if (!selectedExercise) return;

    addItem({
      template_id: template.id,
      exercise_id: selectedExercise,
      order_index: items.length,
      sets: sets ? parseInt(sets) : undefined,
      repetitions: reps ? parseInt(reps) : undefined,
      week_start: weekStart ? parseInt(weekStart) : undefined,
      week_end: weekEnd ? parseInt(weekEnd) : undefined,
    });

    setSelectedExercise('');
    setSets('3');
    setReps('10');
    setWeekStart('');
    setWeekEnd('');
    setShowAddExercise(false);
  };

  const isPosOperatorio = template.category === 'pos_operatorio';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {template.name}
            <Badge variant="outline">{template.condition_name}</Badge>
            {template.template_variant && (
              <Badge>{template.template_variant}</Badge>
            )}
          </DialogTitle>
          {template.description && (
            <p className="text-sm text-muted-foreground">{template.description}</p>
          )}
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Exercícios ({items.length})</h3>
            <Button size="sm" onClick={() => setShowAddExercise(!showAddExercise)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Exercício
            </Button>
          </div>

          {showAddExercise && (
            <Card className="p-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar exercício..."
                  value={searchExercise}
                  onChange={(e) => setSearchExercise(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={selectedExercise} onValueChange={setSelectedExercise}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um exercício" />
                </SelectTrigger>
                <SelectContent>
                  {filteredExercises.map((ex) => (
                    <SelectItem key={ex.id} value={ex.id}>
                      {ex.name} {ex.category && `(${ex.category})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Séries</Label>
                  <Input
                    type="number"
                    value={sets}
                    onChange={(e) => setSets(e.target.value)}
                    min="1"
                  />
                </div>
                <div>
                  <Label>Repetições</Label>
                  <Input
                    type="number"
                    value={reps}
                    onChange={(e) => setReps(e.target.value)}
                    min="1"
                  />
                </div>
              </div>

              {isPosOperatorio && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Semana Início</Label>
                    <Input
                      type="number"
                      value={weekStart}
                      onChange={(e) => setWeekStart(e.target.value)}
                      min="0"
                      placeholder="Ex: 1"
                    />
                  </div>
                  <div>
                    <Label>Semana Fim</Label>
                    <Input
                      type="number"
                      value={weekEnd}
                      onChange={(e) => setWeekEnd(e.target.value)}
                      min="0"
                      placeholder="Ex: 4"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleAddExercise} disabled={!selectedExercise}>
                  Adicionar
                </Button>
                <Button variant="outline" onClick={() => setShowAddExercise(false)}>
                  Cancelar
                </Button>
              </div>
            </Card>
          )}

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : items.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              Nenhum exercício adicionado ainda
            </Card>
          ) : (
            <div className="space-y-2">
              {items.map((item, index) => (
                <Card key={item.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{index + 1}</Badge>
                        <h4 className="font-medium">
                          {item.exercise?.name || 'Exercício'}
                        </h4>
                      </div>
                      
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        {item.sets && <span>{item.sets} séries</span>}
                        {item.repetitions && <span>{item.repetitions} reps</span>}
                        {item.duration && <span>{item.duration}s</span>}
                        {item.week_start !== null && item.week_start !== undefined && (
                          <span>
                            Semanas {item.week_start}
                            {item.week_end ? ` - ${item.week_end}` : '+'}
                          </span>
                        )}
                      </div>

                      {item.exercise?.category && (
                        <Badge variant="secondary" className="mt-2">
                          {item.exercise.category}
                        </Badge>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
