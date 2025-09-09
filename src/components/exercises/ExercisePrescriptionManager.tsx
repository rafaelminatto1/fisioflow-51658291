import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
} from '@/components/ui/alert-dialog';
import { 
  Plus, 
  Minus, 
  Save, 
  Copy, 
  Trash2, 
  GripVertical,
  Clock,
  Dumbbell,
  Target,
  AlertTriangle,
  FileText,
  Calculator,
  TrendingUp,
  Settings
} from 'lucide-react';
import { useExercises, ExerciseFilters } from '@/hooks/useExercises';
import { useExercisePlans } from '@/hooks/useExercisePlans';
import { usePatients } from '@/hooks/usePatients';
import { ExerciseLibrary } from './ExerciseLibrary';
import { useToast } from '@/hooks/use-toast';

interface PrescriptionItem {
  exercise_id: string;
  exercise_name: string;
  exercise_category: string;
  exercise_description: string;
  sets: number;
  reps: number;
  weight_kg?: number;
  rest_time: number;
  duration_seconds?: number;
  notes?: string;
  progression_criteria?: string;
  modifications?: string[];
  order_index: number;
  is_bilateral?: boolean;
  tempo?: string; // e.g., "2-1-2-1" (eccentric-pause-concentric-pause)
  intensity_percentage?: number; // % of 1RM or max effort
}

interface ExercisePrescriptionData {
  patient_id: string;
  plan_name: string;
  description: string;
  phase: 'acute' | 'subacute' | 'chronic' | 'maintenance';
  frequency_per_week: number;
  estimated_duration_weeks: number;
  exercises: PrescriptionItem[];
  objectives: string[];
  precautions: string[];
  progression_strategy: string;
  assessment_criteria: string;
}

interface ExercisePrescriptionManagerProps {
  patientId?: string;
  onSave?: (prescription: ExercisePrescriptionData) => void;
  existingPlan?: ExercisePrescriptionData;
  isEditing?: boolean;
}

export function ExercisePrescriptionManager({
  patientId,
  onSave,
  existingPlan,
  isEditing = false
}: ExercisePrescriptionManagerProps) {
  const [prescription, setPrescription] = useState<ExercisePrescriptionData>({
    patient_id: patientId || '',
    plan_name: '',
    description: '',
    phase: 'acute',
    frequency_per_week: 3,
    estimated_duration_weeks: 4,
    exercises: [],
    objectives: [],
    precautions: [],
    progression_strategy: '',
    assessment_criteria: '',
  });

  const [selectedPatientId, setSelectedPatientId] = useState(patientId || '');
  const [showExerciseLibrary, setShowExerciseLibrary] = useState(false);
  const [editingExercise, setEditingExercise] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const { patients } = usePatients();
  const { exercises } = useExercises();
  const { addExercisePlan, addExerciseToPlan } = useExercisePlans();
  const { toast } = useToast();

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  useEffect(() => {
    if (existingPlan && isEditing) {
      // Load existing plan data
      setPrescription(prev => ({
        ...prev,
        plan_name: existingPlan.name,
        description: existingPlan.description,
        phase: existingPlan.phase || 'chronic',
        frequency_per_week: existingPlan.frequency_per_week || 3,
        estimated_duration_weeks: existingPlan.estimated_duration_weeks || 4,
      }));
    }
  }, [existingPlan, isEditing]);

  const handleAddExercise = (exercise: Exercise) => {
    const newExercise: PrescriptionItem = {
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      exercise_category: exercise.category,
      exercise_description: exercise.description,
      sets: 3,
      reps: 10,
      rest_time: 60,
      order_index: prescription.exercises.length,
      notes: '',
      progression_criteria: 'Aumentar carga quando conseguir completar todas as séries com facilidade',
      modifications: [],
    };

    setPrescription(prev => ({
      ...prev,
      exercises: [...prev.exercises, newExercise]
    }));
    setShowExerciseLibrary(false);
  };

  const handleUpdateExercise = (index: number, updates: Partial<PrescriptionItem>) => {
    setPrescription(prev => ({
      ...prev,
      exercises: prev.exercises.map((exercise, i) => 
        i === index ? { ...exercise, ...updates } : exercise
      )
    }));
  };

  const handleRemoveExercise = (index: number) => {
    setPrescription(prev => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== index)
        .map((exercise, i) => ({ ...exercise, order_index: i }))
    }));
    setDeleteConfirm(null);
  };

  const handleDuplicateExercise = (index: number) => {
    const exercise = prescription.exercises[index];
    const duplicated: PrescriptionItem = {
      ...exercise,
      exercise_name: `${exercise.exercise_name} (Cópia)`,
      order_index: prescription.exercises.length,
    };

    setPrescription(prev => ({
      ...prev,
      exercises: [...prev.exercises, duplicated]
    }));
  };

  const handleMoveExercise = (index: number, direction: 'up' | 'down') => {
    const newExercises = [...prescription.exercises];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newExercises.length) {
      [newExercises[index], newExercises[targetIndex]] = [newExercises[targetIndex], newExercises[index]];
      // Update order indices
      newExercises.forEach((exercise, i) => {
        exercise.order_index = i;
      });

      setPrescription(prev => ({
        ...prev,
        exercises: newExercises
      }));
    }
  };

  const calculateTotalVolume = () => {
    return prescription.exercises.reduce((total, exercise) => {
      return total + (exercise.sets * exercise.reps);
    }, 0);
  };

  const calculateEstimatedDuration = () => {
    const exerciseTime = prescription.exercises.reduce((total, exercise) => {
      const setDuration = exercise.duration_seconds || 30; // Default 30 seconds per set
      const restTime = exercise.rest_time;
      return total + (exercise.sets * (setDuration + restTime));
    }, 0);
    
    return Math.ceil(exerciseTime / 60); // Convert to minutes
  };

  const getPhaseRecommendations = (phase: string) => {
    const recommendations = {
      acute: {
        frequency: '2-3x/semana',
        intensity: 'Baixa (40-60%)',
        focus: 'Controle da dor e mobilidade',
        precautions: ['Evitar movimentos dolorosos', 'Progressão gradual']
      },
      subacute: {
        frequency: '3-4x/semana', 
        intensity: 'Moderada (60-75%)',
        focus: 'Fortalecimento e função',
        precautions: ['Monitorar sintomas', 'Progressão controlada']
      },
      chronic: {
        frequency: '3-5x/semana',
        intensity: 'Moderada a alta (70-85%)',
        focus: 'Fortalecimento e condicionamento',
        precautions: ['Evitar sobrecarga', 'Variar estímulos']
      },
      maintenance: {
        frequency: '2-3x/semana',
        intensity: 'Moderada (65-80%)',
        focus: 'Manutenção e prevenção',
        precautions: ['Manter consistência', 'Adaptar conforme necessário']
      }
    };
    return recommendations[phase as keyof typeof recommendations];
  };

  const handleSave = async () => {
    if (!selectedPatientId) {
      toast({
        title: 'Erro',
        description: 'Selecione um paciente',
        variant: 'destructive'
      });
      return;
    }

    if (!prescription.plan_name.trim()) {
      toast({
        title: 'Erro', 
        description: 'Digite um nome para o plano',
        variant: 'destructive'
      });
      return;
    }

    if (prescription.exercises.length === 0) {
      toast({
        title: 'Erro',
        description: 'Adicione pelo menos um exercício',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      const planData = {
        name: prescription.plan_name,
        description: prescription.description,
        patient_id: selectedPatientId,
        status: 'Ativo' as const,
        phase: prescription.phase,
        estimated_duration_weeks: prescription.estimated_duration_weeks,
        frequency_per_week: prescription.frequency_per_week,
      };

      const newPlan = await addExercisePlan(planData);

      // Add exercises to plan
      for (const exercise of prescription.exercises) {
        await addExerciseToPlan(newPlan.id, {
          exercise_id: exercise.exercise_id,
          sets: exercise.sets,
          reps: exercise.reps,
          rest_time: exercise.rest_time,
          notes: exercise.notes,
          weight_kg: exercise.weight_kg,
          duration_seconds: exercise.duration_seconds,
          progression_criteria: exercise.progression_criteria,
          modifications: exercise.modifications,
        });
      }

      toast({
        title: 'Sucesso',
        description: 'Plano de exercícios criado com sucesso'
      });

      onSave?.(prescription);
    } catch (error) {
      console.error('Error saving prescription:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao salvar plano de exercícios',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const phaseRecommendations = getPhaseRecommendations(prescription.phase);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Prescrição de Exercícios
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="patient">Paciente</Label>
              <Select 
                value={selectedPatientId} 
                onValueChange={setSelectedPatientId}
                disabled={!!patientId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o paciente" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map(patient => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan_name">Nome do Plano</Label>
              <Input
                id="plan_name"
                value={prescription.plan_name}
                onChange={(e) => setPrescription(prev => ({ ...prev, plan_name: e.target.value }))}
                placeholder="Ex: Programa de Fortalecimento - Fase I"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={prescription.description}
              onChange={(e) => setPrescription(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descreva os objetivos e características do plano..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phase">Fase do Tratamento</Label>
              <Select 
                value={prescription.phase} 
                onValueChange={(value: string) => setPrescription(prev => ({ ...prev, phase: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="acute">Aguda</SelectItem>
                  <SelectItem value="subacute">Subaguda</SelectItem>
                  <SelectItem value="chronic">Crônica</SelectItem>
                  <SelectItem value="maintenance">Manutenção</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">Frequência (por semana)</Label>
              <Input
                id="frequency"
                type="number"
                min="1"
                max="7"
                value={prescription.frequency_per_week}
                onChange={(e) => setPrescription(prev => ({ 
                  ...prev, 
                  frequency_per_week: parseInt(e.target.value) || 1 
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duração (semanas)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                max="52"
                value={prescription.estimated_duration_weeks}
                onChange={(e) => setPrescription(prev => ({ 
                  ...prev, 
                  estimated_duration_weeks: parseInt(e.target.value) || 1 
                }))}
              />
            </div>
          </div>

          {/* Phase Recommendations */}
          {phaseRecommendations && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                Recomendações para Fase {prescription.phase}
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm text-blue-800">
                <div>
                  <span className="font-medium">Frequência:</span> {phaseRecommendations.frequency}
                </div>
                <div>
                  <span className="font-medium">Intensidade:</span> {phaseRecommendations.intensity}
                </div>
                <div className="col-span-2">
                  <span className="font-medium">Foco:</span> {phaseRecommendations.focus}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exercise List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5" />
              Exercícios ({prescription.exercises.length})
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <div className="text-sm text-muted-foreground">
                Volume Total: {calculateTotalVolume()} reps | 
                Duração Est.: {calculateEstimatedDuration()}min
              </div>
              <Dialog open={showExerciseLibrary} onOpenChange={setShowExerciseLibrary}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar Exercício
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Selecionar Exercício</DialogTitle>
                    <DialogDescription>
                      Escolha exercícios da biblioteca para adicionar ao plano
                    </DialogDescription>
                  </DialogHeader>
                  <ExerciseLibrary
                    onExerciseSelect={handleAddExercise}
                    className="border-0 shadow-none"
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {prescription.exercises.length === 0 ? (
            <div className="text-center py-12">
              <Dumbbell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum exercício adicionado</h3>
              <p className="text-muted-foreground mb-4">
                Clique em "Adicionar Exercício" para começar a montar o plano
              </p>
              <Button onClick={() => setShowExerciseLibrary(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Primeiro Exercício
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {prescription.exercises.map((exercise, index) => (
                <Card key={`${exercise.exercise_id}-${index}`} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Order and drag handle */}
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                          {index + 1}
                        </div>
                        <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                      </div>

                      {/* Exercise details */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{exercise.exercise_name}</h4>
                          <Badge variant="outline" className="text-xs">
                            {exercise.exercise_category}
                          </Badge>
                        </div>

                        <p className="text-sm text-muted-foreground mb-4">
                          {exercise.exercise_description}
                        </p>

                        {/* Parameters */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <Label className="text-xs">Séries</Label>
                            <Input
                              type="number"
                              min="1"
                              value={exercise.sets}
                              onChange={(e) => handleUpdateExercise(index, { 
                                sets: parseInt(e.target.value) || 1 
                              })}
                              className="h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Repetições</Label>
                            <Input
                              type="number"
                              min="1"
                              value={exercise.reps}
                              onChange={(e) => handleUpdateExercise(index, { 
                                reps: parseInt(e.target.value) || 1 
                              })}
                              className="h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Peso (kg)</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.5"
                              value={exercise.weight_kg || ''}
                              onChange={(e) => handleUpdateExercise(index, { 
                                weight_kg: e.target.value ? parseFloat(e.target.value) : undefined 
                              })}
                              placeholder="Opcional"
                              className="h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Descanso (s)</Label>
                            <Input
                              type="number"
                              min="0"
                              value={exercise.rest_time}
                              onChange={(e) => handleUpdateExercise(index, { 
                                rest_time: parseInt(e.target.value) || 0 
                              })}
                              className="h-8"
                            />
                          </div>
                        </div>

                        {/* Advanced parameters */}
                        <details className="mb-4">
                          <summary className="text-sm font-medium cursor-pointer hover:text-primary">
                            Parâmetros Avançados
                          </summary>
                          <div className="mt-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label className="text-xs">Duração (segundos)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={exercise.duration_seconds || ''}
                                  onChange={(e) => handleUpdateExercise(index, { 
                                    duration_seconds: e.target.value ? parseInt(e.target.value) : undefined 
                                  })}
                                  placeholder="Opcional"
                                  className="h-8"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Intensidade (%)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={exercise.intensity_percentage || ''}
                                  onChange={(e) => handleUpdateExercise(index, { 
                                    intensity_percentage: e.target.value ? parseInt(e.target.value) : undefined 
                                  })}
                                  placeholder="% 1RM"
                                  className="h-8"
                                />
                              </div>
                            </div>
                            
                            <div>
                              <Label className="text-xs">Critério de Progressão</Label>
                              <Textarea
                                value={exercise.progression_criteria || ''}
                                onChange={(e) => handleUpdateExercise(index, { 
                                  progression_criteria: e.target.value 
                                })}
                                placeholder="Quando e como progredir..."
                                rows={2}
                                className="text-sm"
                              />
                            </div>
                          </div>
                        </details>

                        {/* Notes */}
                        <div>
                          <Label className="text-xs">Observações</Label>
                          <Textarea
                            value={exercise.notes || ''}
                            onChange={(e) => handleUpdateExercise(index, { notes: e.target.value })}
                            placeholder="Instruções especiais, modificações..."
                            rows={2}
                            className="text-sm"
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMoveExercise(index, 'up')}
                          disabled={index === 0}
                          className="h-8 w-8 p-0"
                        >
                          ↑
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMoveExercise(index, 'down')}
                          disabled={index === prescription.exercises.length - 1}
                          className="h-8 w-8 p-0"
                        >
                          ↓
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDuplicateExercise(index)}
                          className="h-8 w-8 p-0"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDeleteConfirm(index)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => window.history.back()}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar Plano
            </>
          )}
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Exercício</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este exercício do plano? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirm(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteConfirm !== null && handleRemoveExercise(deleteConfirm)}
              className="bg-red-600 hover:bg-red-700"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}