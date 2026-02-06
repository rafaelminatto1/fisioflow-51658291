import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {

  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Target,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  Trophy,
  Loader2
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  usePatientGoals,
  useCreateGoal,
  useUpdateGoal,
  useCompleteGoal,
  type PatientGoal
} from '@/hooks/usePatientEvolution';

interface GoalsManagerProps {
  patientId: string;
}

export const GoalsManager: React.FC<GoalsManagerProps> = ({ patientId }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<PatientGoal | null>(null);
  
  const [formData, setFormData] = useState({
    goal_title: '',
    goal_description: '',
    target_date: '',
    target_value: ''
  });

  const { data: goals = [], isLoading } = usePatientGoals(patientId);
  const createMutation = useCreateGoal();
  const updateMutation = useUpdateGoal();
  const completeMutation = useCompleteGoal();

  const activeGoals = goals.filter(g => g.status === 'em_andamento');
  const completedGoals = goals.filter(g => g.status === 'concluido');

  const resetForm = () => {
    setFormData({
      goal_title: '',
      goal_description: '',
      target_date: '',
      target_value: ''
    });
    setEditingGoal(null);
  };

  const handleSubmit = async () => {
    if (!formData.goal_title.trim()) return;

    if (editingGoal) {
      await updateMutation.mutateAsync({
        goalId: editingGoal.id,
        data: formData
      });
    } else {
      await createMutation.mutateAsync({
        patient_id: patientId,
        ...formData
      });
    }

    resetForm();
    setIsDialogOpen(false);
  };

  const handleEdit = (goal: PatientGoal) => {
    setEditingGoal(goal);
    setFormData({
      goal_title: goal.goal_title,
      goal_description: goal.goal_description || '',
      target_date: goal.target_date || '',
      target_value: goal.target_value || ''
    });
    setIsDialogOpen(true);
  };

  const calculateProgress = (goal: PatientGoal) => {
    if (!goal.target_date) return 0;
    
    const today = new Date();
    const created = new Date(goal.created_at);
    const target = new Date(goal.target_date);
    
    const totalDays = differenceInDays(target, created);
    const elapsedDays = differenceInDays(today, created);
    
    if (totalDays <= 0) return 100;
    
    const progress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
    return Math.round(progress);
  };

  const getDaysRemaining = (targetDate: string) => {
    const today = new Date();
    const target = new Date(targetDate);
    const days = differenceInDays(target, today);
    
    if (days < 0) return 'Vencido';
    if (days === 0) return 'Hoje';
    if (days === 1) return 'Amanhã';
    return `${days} dias`;
  };

  const getStatusColor = (status: PatientGoal['status']) => {
    switch (status) {
      case 'em_andamento':
        return 'bg-blue-500/10 text-blue-500';
      case 'concluido':
        return 'bg-green-500/10 text-green-500';
      case 'cancelado':
        return 'bg-red-500/10 text-red-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  const getStatusLabel = (status: PatientGoal['status']) => {
    switch (status) {
      case 'em_andamento':
        return 'Em Andamento';
      case 'concluido':
        return 'Concluído';
      case 'cancelado':
        return 'Cancelado';
      default:
        return status;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Objetivos e Metas
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Objetivo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingGoal ? 'Editar Objetivo' : 'Novo Objetivo'}
                </DialogTitle>
                <DialogDescription>
                  Defina um objetivo mensurável para o tratamento do paciente.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Título do Objetivo *</Label>
                  <Input
                    id="title"
                    value={formData.goal_title}
                    onChange={(e) => setFormData({ ...formData, goal_title: e.target.value })}
                    placeholder="Ex: Retornar à corrida sem dor"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.goal_description}
                    onChange={(e) => setFormData({ ...formData, goal_description: e.target.value })}
                    placeholder="Detalhes sobre o objetivo..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="target_date">Data Alvo</Label>
                    <Input
                      id="target_date"
                      type="date"
                      value={formData.target_date}
                      onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="target_value">Métrica Alvo</Label>
                    <Input
                      id="target_value"
                      value={formData.target_value}
                      onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                      placeholder="Ex: 5km, 90° flexão"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => { resetForm(); setIsDialogOpen(false); }}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!formData.goal_title.trim() || createMutation.isPending || updateMutation.isPending}
                  >
                    {(createMutation.isPending || updateMutation.isPending) ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      'Salvar'
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : goals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum objetivo definido ainda</p>
            <p className="text-sm">Defina metas para acompanhar o progresso do paciente</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Objetivos Ativos */}
            {activeGoals.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Objetivos Ativos ({activeGoals.length})
                </h3>
                <div className="space-y-3">
                  {activeGoals.map((goal) => {
                    const progress = calculateProgress(goal);
                    return (
                      <div
                        key={goal.id}
                        className="p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium">{goal.goal_title}</h4>
                            {goal.goal_description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {goal.goal_description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(goal)}
                            >
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => completeMutation.mutate(goal.id)}
                              disabled={completeMutation.isPending}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {goal.target_date && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Progresso</span>
                              <span className="font-medium">{getDaysRemaining(goal.target_date)}</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                          </div>
                        )}

                        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                          {goal.target_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(goal.target_date), 'dd/MM/yyyy')}
                            </span>
                          )}
                          {goal.target_value && (
                            <span className="flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              {goal.target_value}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Objetivos Concluídos */}
            {completedGoals.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-green-500" />
                  Objetivos Concluídos ({completedGoals.length})
                </h3>
                <div className="space-y-2">
                  {completedGoals.map((goal) => (
                    <div
                      key={goal.id}
                      className="p-3 rounded-lg border bg-green-500/5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{goal.goal_title}</h4>
                          {goal.completed_at && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Concluído em {format(new Date(goal.completed_at), 'dd/MM/yyyy', { locale: ptBR })}
                            </p>
                          )}
                        </div>
                        <Badge className={getStatusColor(goal.status)}>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {getStatusLabel(goal.status)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
