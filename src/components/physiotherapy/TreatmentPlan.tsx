import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Textarea } from '@/components/shared/ui/textarea';
import { Badge } from '@/components/shared/ui/badge';
import { ClipboardList, Plus, Trash2, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface TreatmentGoal {
  id: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
}

interface TreatmentSession {
  id: string;
  techniques: string;
  exercises: string;
  duration: string;
}

export const TreatmentPlan = () => {
  const [goals, setGoals] = useState<TreatmentGoal[]>([
    { id: '1', description: 'Reduzir dor lombar', status: 'in-progress' },
    { id: '2', description: 'Melhorar amplitude de movimento', status: 'pending' },
  ]);
  
  const [sessions, setSessions] = useState<TreatmentSession[]>([
    { id: '1', techniques: 'Mobilização articular, terapia manual', exercises: 'Alongamento, fortalecimento core', duration: '50 min' }
  ]);

  const [newGoal, setNewGoal] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [generalObservations, setGeneralObservations] = useState('');

  const addGoal = () => {
    if (!newGoal.trim()) return;
    setGoals([...goals, { id: Date.now().toString(), description: newGoal, status: 'pending' }]);
    setNewGoal('');
  };

  const removeGoal = (id: string) => {
    setGoals(goals.filter(g => g.id !== id));
  };

  const updateGoalStatus = (id: string, status: TreatmentGoal['status']) => {
    setGoals(goals.map(g => g.id === id ? { ...g, status } : g));
  };

  const addSession = () => {
    setSessions([...sessions, { id: Date.now().toString(), techniques: '', exercises: '', duration: '50 min' }]);
  };

  const removeSession = (id: string) => {
    setSessions(sessions.filter(s => s.id !== id));
  };

  const updateSession = (id: string, field: keyof TreatmentSession, value: string) => {
    setSessions(sessions.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleSave = () => {
    console.log('Salvando plano:', { diagnosis, goals, sessions, generalObservations });
    toast({
      title: "Plano salvo",
      description: "Plano de tratamento registrado com sucesso.",
    });
  };

  const getStatusBadge = (status: TreatmentGoal['status']) => {
    const variants = {
      'pending': { label: 'Pendente', className: 'bg-yellow-100 text-yellow-800' },
      'in-progress': { label: 'Em andamento', className: 'bg-blue-100 text-blue-800' },
      'completed': { label: 'Concluído', className: 'bg-green-100 text-green-800' },
    };
    const variant = variants[status];
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5" />
          Plano de Tratamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Diagnóstico Fisioterapêutico</Label>
          <Textarea
            placeholder="Descreva o diagnóstico principal..."
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            rows={2}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Objetivos do Tratamento</Label>
            <Button variant="outline" size="sm" onClick={addGoal}>
              <Plus className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
          </div>
          
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Novo objetivo..."
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addGoal()}
              />
            </div>
            
            {goals.map((goal) => (
              <div key={goal.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{goal.description}</p>
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateGoalStatus(goal.id, 'pending')}
                      className={goal.status === 'pending' ? 'bg-yellow-100' : ''}
                    >
                      Pendente
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateGoalStatus(goal.id, 'in-progress')}
                      className={goal.status === 'in-progress' ? 'bg-blue-100' : ''}
                    >
                      Em andamento
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateGoalStatus(goal.id, 'completed')}
                      className={goal.status === 'completed' ? 'bg-green-100' : ''}
                    >
                      Concluído
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {getStatusBadge(goal.status)}
                  <Button variant="ghost" size="icon" onClick={() => removeGoal(goal.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Sessões de Tratamento</Label>
            <Button variant="outline" size="sm" onClick={addSession}>
              <Plus className="w-4 h-4 mr-1" />
              Adicionar Sessão
            </Button>
          </div>

          {sessions.map((session, index) => (
            <div key={session.id} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Sessão {index + 1}</h4>
                <Button variant="ghost" size="icon" onClick={() => removeSession(session.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
              
              <div className="space-y-2">
                <Label>Técnicas</Label>
                <Input
                  placeholder="Técnicas utilizadas..."
                  value={session.techniques}
                  onChange={(e) => updateSession(session.id, 'techniques', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Exercícios</Label>
                <Input
                  placeholder="Exercícios prescritos..."
                  value={session.exercises}
                  onChange={(e) => updateSession(session.id, 'exercises', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Duração</Label>
                <Input
                  placeholder="Ex: 50 min"
                  value={session.duration}
                  onChange={(e) => updateSession(session.id, 'duration', e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Label>Observações Gerais</Label>
          <Textarea
            placeholder="Observações sobre o plano de tratamento..."
            value={generalObservations}
            onChange={(e) => setGeneralObservations(e.target.value)}
            rows={3}
          />
        </div>

        <Button onClick={handleSave} className="w-full bg-primary">
          <Save className="w-4 h-4 mr-2" />
          Salvar Plano de Tratamento
        </Button>
      </CardContent>
    </Card>
  );
};
