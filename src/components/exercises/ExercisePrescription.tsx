import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  DragDropContext, 
  Droppable, 
  Draggable,
  DropResult 
} from '@hello-pangea/dnd';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  X, 
  GripVertical, 
  Plus, 
  Clock, 
  Dumbbell,
  Calendar,
  Save,
  Printer,
  Share
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Exercise {
  id: string;
  name: string;
  description?: string;
  category?: string;
  muscle_groups?: string[];
  equipment?: string;
  difficulty_level?: string;
  instructions?: string;
}

interface PrescribedExercise {
  id: string;
  exercise: Exercise;
  sets: number;
  reps: number;
  weight?: number;
  restTime: number;
  frequency: number;
  duration?: number;
  notes?: string;
  order: number;
}

interface ExercisePrescriptionProps {
  patientId: string;
  patientName: string;
  onSave?: (prescription: PrescribedExercise[]) => void;
  initialExercises?: PrescribedExercise[];
  className?: string;
}

const frequencyOptions = [
  { value: 1, label: '1x por semana' },
  { value: 2, label: '2x por semana' },
  { value: 3, label: '3x por semana' },
  { value: 4, label: '4x por semana' },
  { value: 5, label: '5x por semana' },
  { value: 6, label: '6x por semana' },
  { value: 7, label: 'Diariamente' }
];

export function ExercisePrescription({ 
  patientId, 
  patientName,
  onSave,
  initialExercises = [],
  className = '' 
}: ExercisePrescriptionProps) {
  const [prescribedExercises, setPrescribedExercises] = useState<PrescribedExercise[]>(initialExercises);
  const [programName, setProgramName] = useState('');
  const [programDescription, setProgramDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { toast } = useToast();

  const addExercise = useCallback((exercise: Exercise) => {
    const newPrescribedExercise: PrescribedExercise = {
      id: `${exercise.id}-${Date.now()}`,
      exercise,
      sets: 3,
      reps: 10,
      restTime: 60,
      frequency: 3,
      order: prescribedExercises.length,
      notes: ''
    };

    setPrescribedExercises(prev => [...prev, newPrescribedExercise]);
    toast({
      title: 'Exercício adicionado',
      description: `${exercise.name} foi adicionado ao programa`
    });
  }, [prescribedExercises.length, toast]);

  const removeExercise = (id: string) => {
    setPrescribedExercises(prev => prev.filter(ex => ex.id !== id));
  };

  const updateExercise = (id: string, updates: Partial<PrescribedExercise>) => {
    setPrescribedExercises(prev => 
      prev.map(ex => ex.id === id ? { ...ex, ...updates } : ex)
    );
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(prescribedExercises);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Atualizar ordem
    const reorderedItems = items.map((item, index) => ({
      ...item,
      order: index
    }));

    setPrescribedExercises(reorderedItems);
  };

  const calculateTotalTime = () => {
    return prescribedExercises.reduce((total, exercise) => {
      const exerciseTime = exercise.sets * (
        (exercise.duration || 30) + exercise.restTime
      );
      return total + exerciseTime;
    }, 0);
  };

  const handleSave = () => {
    if (!programName.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, defina um nome para o programa',
        variant: 'destructive'
      });
      return;
    }

    if (prescribedExercises.length === 0) {
      toast({
        title: 'Exercícios obrigatórios',
        description: 'Adicione pelo menos um exercício ao programa',
        variant: 'destructive'
      });
      return;
    }

    onSave?.(prescribedExercises);
  };

  const handlePrint = () => {
    // Implementar impressão
    toast({
      title: 'Funcionalidade em desenvolvimento',
      description: 'A impressão será implementada em breve'
    });
  };

  const handleShare = () => {
    // Implementar compartilhamento
    toast({
      title: 'Funcionalidade em desenvolvimento',
      description: 'O compartilhamento será implementado em breve'
    });
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Prescrição de Exercícios</CardTitle>
            <p className="text-muted-foreground">Paciente: {patientName}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-1" />
              Imprimir
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share className="w-4 h-4 mr-1" />
              Compartilhar
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="w-4 h-4 mr-1" />
              Salvar
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Informações do programa */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="program-name">Nome do Programa</Label>
            <Input
              id="program-name"
              placeholder="Ex: Fortalecimento de Core"
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="start-date">Data de Início</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="program-description">Descrição</Label>
            <Textarea
              id="program-description"
              placeholder="Descrição do programa e objetivos..."
              value={programDescription}
              onChange={(e) => setProgramDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end-date">Data de Término</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {/* Resumo do programa */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {prescribedExercises.length}
            </div>
            <div className="text-sm text-muted-foreground">Exercícios</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {Math.round(calculateTotalTime() / 60)}min
            </div>
            <div className="text-sm text-muted-foreground">Tempo Total</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {prescribedExercises.reduce((total, ex) => total + ex.frequency, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Freq./Semana</div>
          </div>
        </div>

        {/* Lista de exercícios prescritos */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Exercícios Prescritos</h3>
            {prescribedExercises.length > 0 && (
              <Badge variant="outline">
                Arraste para reordenar
              </Badge>
            )}
          </div>

          {prescribedExercises.length === 0 ? (
            <div className="text-center py-8 bg-muted/30 rounded-lg">
              <Dumbbell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nenhum exercício adicionado ainda
              </p>
              <p className="text-sm text-muted-foreground">
                Adicione exercícios da biblioteca ao lado
              </p>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="prescribed-exercises">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-3"
                  >
                    {prescribedExercises.map((prescribedEx, index) => (
                      <Draggable 
                        key={prescribedEx.id} 
                        draggableId={prescribedEx.id} 
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`${
                              snapshot.isDragging ? 'shadow-lg' : ''
                            } transition-shadow`}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start gap-4">
                                {/* Drag handle */}
                                <div
                                  {...provided.dragHandleProps}
                                  className="mt-2 text-muted-foreground hover:text-foreground cursor-grab"
                                >
                                  <GripVertical className="w-5 h-5" />
                                </div>

                                {/* Informações do exercício */}
                                <div className="flex-1 space-y-4">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <h4 className="font-semibold">
                                        {prescribedEx.exercise.name}
                                      </h4>
                                      <p className="text-sm text-muted-foreground">
                                        {prescribedEx.exercise.description}
                                      </p>
                                      <div className="flex gap-2 mt-2">
                                        <Badge variant="outline" className="text-xs">
                                          {prescribedEx.exercise.category}
                                        </Badge>
                                        <Badge variant="secondary" className="text-xs">
                                          {prescribedEx.exercise.difficulty}
                                        </Badge>
                                      </div>
                                    </div>
                                    
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeExercise(prescribedEx.id)}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>

                                  {/* Parâmetros de prescrição */}
                                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                    <div className="space-y-1">
                                      <Label className="text-xs">Séries</Label>
                                      <Input
                                        type="number"
                                        value={prescribedEx.sets}
                                        onChange={(e) => updateExercise(prescribedEx.id, {
                                          sets: parseInt(e.target.value) || 1
                                        })}
                                        min={1}
                                        max={10}
                                        className="h-8"
                                      />
                                    </div>

                                    <div className="space-y-1">
                                      <Label className="text-xs">Repetições</Label>
                                      <Input
                                        type="number"
                                        value={prescribedEx.reps}
                                        onChange={(e) => updateExercise(prescribedEx.id, {
                                          reps: parseInt(e.target.value) || 1
                                        })}
                                        min={1}
                                        max={100}
                                        className="h-8"
                                      />
                                    </div>

                                    <div className="space-y-1">
                                      <Label className="text-xs">Peso (kg)</Label>
                                      <Input
                                        type="number"
                                        value={prescribedEx.weight || ''}
                                        onChange={(e) => updateExercise(prescribedEx.id, {
                                          weight: parseFloat(e.target.value) || undefined
                                        })}
                                        min={0}
                                        step={0.5}
                                        className="h-8"
                                        placeholder="N/A"
                                      />
                                    </div>

                                    <div className="space-y-1">
                                      <Label className="text-xs">Descanso (s)</Label>
                                      <Input
                                        type="number"
                                        value={prescribedEx.restTime}
                                        onChange={(e) => updateExercise(prescribedEx.id, {
                                          restTime: parseInt(e.target.value) || 30
                                        })}
                                        min={15}
                                        max={300}
                                        step={15}
                                        className="h-8"
                                      />
                                    </div>

                                    <div className="space-y-1">
                                      <Label className="text-xs">Frequência</Label>
                                      <Select
                                        value={prescribedEx.frequency.toString()}
                                        onValueChange={(value) => updateExercise(prescribedEx.id, {
                                          frequency: parseInt(value)
                                        })}
                                      >
                                        <SelectTrigger className="h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {frequencyOptions.map(option => (
                                            <SelectItem 
                                              key={option.value} 
                                              value={option.value.toString()}
                                            >
                                              {option.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div className="space-y-1">
                                      <Label className="text-xs">Duração (s)</Label>
                                      <Input
                                        type="number"
                                        value={prescribedEx.duration || ''}
                                        onChange={(e) => updateExercise(prescribedEx.id, {
                                          duration: parseInt(e.target.value) || undefined
                                        })}
                                        min={10}
                                        max={300}
                                        step={5}
                                        className="h-8"
                                        placeholder="N/A"
                                      />
                                    </div>
                                  </div>

                                  {/* Observações */}
                                  <div className="space-y-1">
                                    <Label className="text-xs">Observações específicas</Label>
                                    <Textarea
                                      value={prescribedEx.notes || ''}
                                      onChange={(e) => updateExercise(prescribedEx.id, {
                                        notes: e.target.value
                                      })}
                                      placeholder="Instruções específicas para este exercício..."
                                      rows={2}
                                      className="text-sm"
                                    />
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>
      </CardContent>
    </Card>
  );
}