import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  FileText, 
  Plus, 
  Target,
  Activity,
  Clipboard,
  Save,
  Eye,
  Stethoscope,
  PlusCircle,
  Link
} from 'lucide-react';
import { useSOAPRecords } from '@/hooks/useSOAPRecords';
import { useExercisePlans } from '@/hooks/useExercisePlans';
import { useExerciseProtocols } from '@/hooks/useExerciseProtocols';
import { usePatients } from '@/hooks/usePatients';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ExerciseSOAPIntegrationProps {
  patientId: string;
  appointmentId?: string;
}

interface ExerciseRecommendation {
  exercise_name: string;
  rationale: string;
  parameters: {
    sets: number;
    reps: number;
    frequency: string;
    progression: string;
  };
  precautions: string[];
}

export function ExerciseSOAPIntegration({ 
  patientId, 
  appointmentId 
}: ExerciseSOAPIntegrationProps) {
  const [showSOAPDialog, setShowSOAPDialog] = useState(false);
  const [selectedSOAPRecord, setSelectedSOAPRecord] = useState<string>('');
  const [exerciseRecommendations, setExerciseRecommendations] = useState<ExerciseRecommendation[]>([]);
  const [homeExerciseProgram, setHomeExerciseProgram] = useState('');
  const [treatmentObjectives, setTreatmentObjectives] = useState<string[]>(['']);
  const [progressNotes, setProgressNotes] = useState('');

  const {
    soapRecords,
    addSOAPRecord,
    updateSOAPRecord
  } = useSOAPRecords();

  const {
    getPatientPlans,
    getActivePlanForPatient
  } = useExercisePlans();

  const {
    getPatientProgressSummary
  } = useExerciseProtocols();

  const { patients } = usePatients();
  const { toast } = useToast();

  const patient = patients.find(p => p.id === patientId);
  const patientPlans = getPatientPlans(patientId);
  const activePlan = getActivePlanForPatient(patientId);
  const progressSummary = getPatientProgressSummary(patientId);
  const patientSOAPRecords = soapRecords.filter(record => record.patientId === patientId);

  const generateExerciseRecommendations = useCallback(() => {
    if (!patient) return;

    const recommendations: ExerciseRecommendation[] = [];

    // Base recommendations on patient condition
    const condition = patient.mainCondition.toLowerCase();
    
    if (condition.includes('lombalgia') || condition.includes('lombar')) {
      recommendations.push({
        exercise_name: 'Estabilização Core',
        rationale: 'Fortalecimento da musculatura profunda para estabilização lombar',
        parameters: {
          sets: 3,
          reps: 10,
          frequency: '3x/semana',
          progression: 'Aumentar tempo de sustentação gradualmente'
        },
        precautions: ['Evitar compensações', 'Manter respiração controlada']
      });

      recommendations.push({
        exercise_name: 'Alongamento Hip Flexors',
        rationale: 'Reduzir tensão anterior e melhorar mobilidade pélvica',
        parameters: {
          sets: 3,
          reps: 1,
          frequency: '2x/dia',
          progression: 'Aumentar amplitude gradualmente'
        },
        precautions: ['Não forçar amplitude', 'Sustentar por 30-60s']
      });
    }

    if (condition.includes('ombro') || condition.includes('impacto')) {
      recommendations.push({
        exercise_name: 'Fortalecimento Manguito Rotador',
        rationale: 'Estabilização e fortalecimento da musculatura periescapular',
        parameters: {
          sets: 3,
          reps: 15,
          frequency: '3x/semana',
          progression: 'Aumentar resistência progressivamente'
        },
        precautions: ['ROM livre de dor', 'Evitar elevação acima de 90°']
      });
    }

    if (condition.includes('joelho') || condition.includes('gonartrose')) {
      recommendations.push({
        exercise_name: 'Fortalecimento Quadríceps',
        rationale: 'Melhora da estabilidade e função do joelho',
        parameters: {
          sets: 3,
          reps: 12,
          frequency: '3x/semana',
          progression: 'Aumentar carga conforme tolerância'
        },
        precautions: ['Evitar dor durante exercício', 'ROM confortável']
      });
    }

    // Add general recommendations
    recommendations.push({
      exercise_name: 'Caminhada',
      rationale: 'Condicionamento cardiovascular e melhora da função geral',
      parameters: {
        sets: 1,
        reps: 1,
        frequency: '5x/semana',
        progression: 'Aumentar duração de 15 para 30 minutos'
      },
      precautions: ['Iniciar gradualmente', 'Usar calçado adequado']
    });

    setExerciseRecommendations(recommendations);
  }, [patient]);

  useEffect(() => {
    // Generate exercise recommendations based on patient condition and progress
    if (patient && progressSummary) {
      generateExerciseRecommendations();
    }
  }, [patient, progressSummary, generateExerciseRecommendations]);

  const addTreatmentObjective = () => {
    setTreatmentObjectives([...treatmentObjectives, '']);
  };

  const updateTreatmentObjective = (index: number, value: string) => {
    const updated = [...treatmentObjectives];
    updated[index] = value;
    setTreatmentObjectives(updated);
  };

  const removeTreatmentObjective = (index: number) => {
    setTreatmentObjectives(treatmentObjectives.filter((_, i) => i !== index));
  };

  const generateHomeExerciseProgram = () => {
    const program = exerciseRecommendations
      .filter(rec => rec.parameters.frequency.includes('dia') || rec.exercise_name.includes('Alongamento'))
      .map(rec => `• ${rec.exercise_name}: ${rec.parameters.sets}x${rec.parameters.reps} - ${rec.parameters.frequency}`)
      .join('\n');

    setHomeExerciseProgram(program || 'Programa a ser definido conforme evolução do paciente.');
  };

  const createSOAPWithExercises = async () => {
    try {
      const soapData = {
        patientId,
        appointmentId,
        sessionNumber: patientSOAPRecords.length + 1,
        subjective: 'Paciente relata evolução no quadro álgico e melhora da funcionalidade.',
        objective: {
          inspection: 'Postura adequada, sem sinais de compensação',
          palpation: 'Diminuição da tensão muscular',
          movement_tests: {
            'Flexão lombar': 'Sem limitação significativa',
            'Extensão lombar': 'ROM completo'
          },
          special_tests: {
            'Lasègue': false,
            'Patrick': false
          },
          posture_analysis: 'Melhora do alinhamento postural'
        },
        assessment: `Evolução favorável do quadro de ${patient?.mainCondition}. Paciente apresenta boa aderência ao tratamento e progressão adequada.`,
        plan: {
          short_term_goals: treatmentObjectives.filter(obj => obj.trim()),
          long_term_goals: [
            'Retorno às atividades de vida diária sem limitações',
            'Manutenção da melhora funcional'
          ],
          interventions: exerciseRecommendations.map(rec => 
            `${rec.exercise_name} - ${rec.rationale}`
          ),
          frequency: '3x/semana',
          duration: '4 semanas',
          home_exercises: homeExerciseProgram.split('\n').filter(ex => ex.trim())
        },
        vitalSigns: {
          blood_pressure: '120/80',
          heart_rate: 70,
          respiratory_rate: 16
        },
        functionalTests: {
          range_of_motion: {
            'Flexão lombar': 85,
            'Extensão lombar': 25
          },
          muscle_strength: {
            'Flexores quadril': 4,
            'Extensores lombar': 4
          }
        }
      };

      await addSOAPRecord(soapData);

      toast({
        title: 'Sucesso',
        description: 'Registro SOAP criado com integração de exercícios'
      });

      setShowSOAPDialog(false);
    } catch (error) {
      console.error('Error creating SOAP record:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao criar registro SOAP',
        variant: 'destructive'
      });
    }
  };

  const updateSOAPWithExercises = async () => {
    if (!selectedSOAPRecord) return;

    try {
      const existingRecord = patientSOAPRecords.find(r => r.id === selectedSOAPRecord);
      if (!existingRecord) return;

      const updatedPlan = {
        ...existingRecord.plan,
        interventions: exerciseRecommendations.map(rec => 
          `${rec.exercise_name} - ${rec.rationale}`
        ),
        home_exercises: homeExerciseProgram.split('\n').filter(ex => ex.trim())
      };

      await updateSOAPRecord(selectedSOAPRecord, {
        plan: updatedPlan,
        assessment: `${existingRecord.assessment}\n\nAtualização do plano de exercícios: ${progressNotes}`
      });

      toast({
        title: 'Sucesso',
        description: 'Registro SOAP atualizado com novos exercícios'
      });

      setShowSOAPDialog(false);
    } catch (error) {
      console.error('Error updating SOAP record:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar registro SOAP',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Integration Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="w-5 h-5" />
            Integração SOAP - Exercícios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {patientSOAPRecords.length}
              </div>
              <div className="text-sm text-muted-foreground">
                Registros SOAP
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {patientPlans.length}
              </div>
              <div className="text-sm text-muted-foreground">
                Planos de Exercícios
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(progressSummary.averageAdherence)}%
              </div>
              <div className="text-sm text-muted-foreground">
                Adesão Média
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Active Plan */}
      {activePlan && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Plano Ativo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <h4 className="font-semibold">{activePlan.name}</h4>
              <p className="text-sm text-muted-foreground">{activePlan.description}</p>
              <div className="flex gap-2">
                <Badge variant="outline">
                  {activePlan.frequency_per_week}x/semana
                </Badge>
                <Badge variant="outline">
                  {activePlan.phase}
                </Badge>
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  Ativo
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exercise Recommendations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5" />
              Recomendações Clínicas
            </CardTitle>
            <Button onClick={generateExerciseRecommendations} variant="outline" size="sm">
              <Activity className="w-4 h-4 mr-1" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {exerciseRecommendations.map((rec, index) => (
              <Card key={index} className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h4 className="font-semibold">{rec.exercise_name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {rec.parameters.frequency}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      <strong>Justificativa:</strong> {rec.rationale}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="font-medium">Parâmetros:</span><br />
                        {rec.parameters.sets}x{rec.parameters.reps}
                      </div>
                      <div>
                        <span className="font-medium">Progressão:</span><br />
                        {rec.parameters.progression}
                      </div>
                    </div>
                    
                    {rec.precautions.length > 0 && (
                      <div className="text-xs">
                        <span className="font-medium text-orange-600">Precauções:</span>
                        <ul className="list-disc list-inside text-muted-foreground ml-2">
                          {rec.precautions.map((precaution, i) => (
                            <li key={i}>{precaution}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent SOAP Records */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Registros SOAP Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {patientSOAPRecords.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nenhum registro SOAP encontrado
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {patientSOAPRecords.slice(0, 3).map((record) => (
                <Card key={record.id} className="border-dashed">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            Sessão {record.sessionNumber}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {format(record.createdAt, 'dd MMM yyyy', { locale: ptBR })}
                          </span>
                        </div>
                        
                        <p className="text-sm">
                          <strong>A:</strong> {record.assessment?.slice(0, 100)}...
                        </p>
                        
                        {record.plan?.home_exercises && record.plan.home_exercises.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            <strong>Exercícios Domiciliares:</strong> {record.plan.home_exercises.length} exercícios
                          </div>
                        )}
                      </div>
                      
                      <Button size="sm" variant="outline">
                        <Eye className="w-3 h-3 mr-1" />
                        Ver
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Integration Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5" />
            Ações de Integração
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Dialog open={showSOAPDialog} onOpenChange={setShowSOAPDialog}>
              <DialogTrigger asChild>
                <Button className="h-auto p-4">
                  <div className="text-center">
                    <Plus className="w-6 h-6 mx-auto mb-2" />
                    <div className="font-medium">Novo SOAP com Exercícios</div>
                    <div className="text-xs text-muted-foreground">
                      Criar registro SOAP integrado ao plano de exercícios
                    </div>
                  </div>
                </Button>
              </DialogTrigger>
              
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Integração SOAP - Exercícios</DialogTitle>
                  <DialogDescription>
                    Crie ou atualize um registro SOAP com as recomendações de exercícios
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                  {/* SOAP Selection */}
                  <div className="space-y-2">
                    <Label>Registro SOAP</Label>
                    <Select value={selectedSOAPRecord} onValueChange={setSelectedSOAPRecord}>
                      <SelectTrigger>
                        <SelectValue placeholder="Criar novo ou selecionar existente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">Criar Novo Registro SOAP</SelectItem>
                        {patientSOAPRecords.map((record) => (
                          <SelectItem key={record.id} value={record.id}>
                            Sessão {record.sessionNumber} - {format(record.createdAt, 'dd/MM/yyyy', { locale: ptBR })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Treatment Objectives */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Objetivos do Tratamento</Label>
                      <Button 
                        type="button" 
                        size="sm" 
                        variant="outline"
                        onClick={addTreatmentObjective}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Adicionar
                      </Button>
                    </div>
                    {treatmentObjectives.map((objective, index) => (
                      <div key={index} className="flex gap-2">
                        <Textarea
                          value={objective}
                          onChange={(e) => updateTreatmentObjective(index, e.target.value)}
                          placeholder={`Objetivo ${index + 1}`}
                          rows={2}
                        />
                        {treatmentObjectives.length > 1 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => removeTreatmentObjective(index)}
                          >
                            ×
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Home Exercise Program */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Programa de Exercícios Domiciliares</Label>
                      <Button 
                        type="button" 
                        size="sm" 
                        variant="outline"
                        onClick={generateHomeExerciseProgram}
                      >
                        <Clipboard className="w-3 h-3 mr-1" />
                        Gerar Automaticamente
                      </Button>
                    </div>
                    <Textarea
                      value={homeExerciseProgram}
                      onChange={(e) => setHomeExerciseProgram(e.target.value)}
                      placeholder="Descreva o programa de exercícios domiciliares..."
                      rows={6}
                    />
                  </div>

                  {/* Progress Notes */}
                  <div className="space-y-2">
                    <Label>Notas de Evolução</Label>
                    <Textarea
                      value={progressNotes}
                      onChange={(e) => setProgressNotes(e.target.value)}
                      placeholder="Descreva a evolução do paciente e justificativas para mudanças no plano..."
                      rows={4}
                    />
                  </div>

                  {/* Exercise Recommendations Preview */}
                  <div className="space-y-2">
                    <Label>Recomendações que serão incluídas ({exerciseRecommendations.length})</Label>
                    <div className="max-h-40 overflow-y-auto border rounded p-3 bg-muted/50">
                      {exerciseRecommendations.map((rec, index) => (
                        <div key={index} className="text-sm mb-2">
                          <strong>{rec.exercise_name}</strong> - {rec.rationale}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowSOAPDialog(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={selectedSOAPRecord === 'new' ? createSOAPWithExercises : updateSOAPWithExercises}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {selectedSOAPRecord === 'new' ? 'Criar SOAP' : 'Atualizar SOAP'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button variant="outline" className="h-auto p-4">
              <div className="text-center">
                <Target className="w-6 h-6 mx-auto mb-2" />
                <div className="font-medium">Gerar Relatório</div>
                <div className="text-xs text-muted-foreground">
                  Relatório integrado de progresso e exercícios
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}