import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  FileText, 
  Eye, 
  Brain, 
  Target, 
  Save, 
  PenTool,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  User
} from 'lucide-react';

import { PainScale } from './PainScale';
import { RangeOfMotion } from './RangeOfMotion';
import { FunctionalAssessment } from './FunctionalAssessment';
import { 
  useSOAPRecords, 
  SubjectiveData, 
  ObjectiveData, 
  AssessmentData, 
  PlanData,
  FunctionalTest 
} from '@/hooks/useSOAPRecords';
import { useToast } from '@/hooks/use-toast';

interface SOAPWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId?: string;
  appointmentId?: string;
  existingRecordId?: string;
  onSave?: () => void;
}

interface WizardData {
  // Basic Info
  patient_id: string;
  appointment_id?: string;
  session_number?: number;
  
  // Subjective Data
  subjective: string;
  subjective_data: Partial<SubjectiveData>;
  
  // Objective Data
  objective: string;
  objective_data: Partial<ObjectiveData>;
  vital_signs: Record<string, unknown>;
  rom_data: Record<string, unknown>[];
  functional_tests: FunctionalTest[];
  
  // Assessment Data
  assessment: string;
  assessment_data: Partial<AssessmentData>;
  
  // Plan Data
  plan: string;
  plan_data: Partial<PlanData>;
}

const steps = [
  { id: 'subjective', label: 'Subjetivo', icon: User, description: 'Queixas e sintomas do paciente' },
  { id: 'objective', label: 'Objetivo', icon: Eye, description: 'Exame físico e testes' },
  { id: 'assessment', label: 'Avaliação', icon: Brain, description: 'Análise e diagnóstico' },
  { id: 'plan', label: 'Plano', icon: Target, description: 'Tratamento e objetivos' },
  { id: 'review', label: 'Revisão', icon: CheckCircle, description: 'Revisão e assinatura' }
];

const soapTemplates = {
  initial_evaluation: {
    name: 'Avaliação Inicial',
    subjective: 'Queixa Principal:\\n\\nHistória da Doença Atual:\\n\\nHistória Médica Pregressa:\\n\\nMedicamentos em uso:\\n\\nAtividades de vida diária:\\n\\nObjetivos do paciente:',
    objective: 'Inspeção:\\n\\nPalpação:\\n\\nTestes especiais:\\n\\nAmplitude de movimento:\\n\\nForça muscular:\\n\\nMarcha e postura:',
    assessment: 'Diagnóstico fisioterapêutico:\\n\\nProblemas identificados:\\n\\nLimitações funcionais:\\n\\nPrognóstico:',
    plan: 'Frequência do tratamento:\\n\\nTécnicas e modalidades:\\n\\nExercícios domiciliares:\\n\\nEducação do paciente:\\n\\nCritérios de alta:'
  },
  followup: {
    name: 'Sessão de Seguimento',
    subjective: 'Evolução desde a última sessão:\\n\\nDor atual (0-10):\\n\\nMelhoras percebidas:\\n\\nDificuldades encontradas:\\n\\nAderência ao tratamento:',
    objective: 'Observações da sessão:\\n\\nTestes de reavaliação:\\n\\nProgresso observado:\\n\\nNovos achados:',
    assessment: 'Progresso em relação aos objetivos:\\n\\nNecessidade de ajustes:\\n\\nBarreiras identificadas:',
    plan: 'Ajustes no tratamento:\\n\\nNovos exercícios:\\n\\nOrientações para casa:\\n\\nPróximos objetivos:'
  },
  discharge: {
    name: 'Alta Fisioterapêutica',
    subjective: 'Estado funcional atual:\\n\\nSatisfação com resultados:\\n\\nPreocupações remanescentes:\\n\\nCapacidade para atividades:',
    objective: 'Testes finais:\\n\\nComparação com avaliação inicial:\\n\\nCapacidades funcionais:\\n\\nRisco de recidiva:',
    assessment: 'Objetivos alcançados:\\n\\nCapacidade de autogestão:\\n\\nNecessidade de acompanhamento:\\n\\nPrognóstico a longo prazo:',
    plan: 'Programa de manutenção:\\n\\nOrientações para prevenção:\\n\\nSinais de alerta:\\n\\nReavaliação se necessário:'
  }
};

export function SOAPWizard({ 
  open, 
  onOpenChange, 
  patientId = '', 
  appointmentId, 
  existingRecordId,
  onSave 
}: SOAPWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<WizardData>({
    patient_id: patientId,
    appointment_id: appointmentId,
    subjective: '',
    subjective_data: {},
    objective: '',
    objective_data: { 
      vital_signs: {},
      observation: {},
      palpation: {},
      range_of_motion: [],
      muscle_testing: [],
      special_tests: [],
      measurements: {},
      photos: []
    },
    vital_signs: {},
    rom_data: [],
    functional_tests: [],
    assessment: '',
    assessment_data: {
      primary_diagnosis: '',
      secondary_diagnoses: [],
      impairments: [],
      functional_limitations: [],
      participation_restrictions: [],
      precautions: [],
      contraindications: [],
      goals: { short_term: [], long_term: [] }
    },
    plan: '',
    plan_data: {
      treatment_frequency: '',
      treatment_duration: '',
      interventions: [],
      home_exercise_program: [],
      patient_education: [],
      discharge_criteria: [],
      next_visit: {
        scheduled_date: '',
        focus_areas: [],
        expected_progress: ''
      },
      referrals: []
    }
  });

  const [painLevel, setPainLevel] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [isReadyToSign, setIsReadyToSign] = useState(false);

  const { addRecord, updateRecord, signRecord, loading } = useSOAPRecords();
  const { toast } = useToast();

  const updateData = useCallback((updates: Partial<WizardData>) => {
    setData(prev => ({ ...prev, ...updates }));
  }, []);

  const applyTemplate = (templateKey: string) => {
    const template = soapTemplates[templateKey as keyof typeof soapTemplates];
    if (!template) return;

    updateData({
      subjective: template.subjective,
      objective: template.objective,
      assessment: template.assessment,
      plan: template.plan
    });
    
    setSelectedTemplate('');
    toast({
      title: 'Template aplicado',
      description: `Template "${template.name}" foi aplicado com sucesso.`
    });
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = async (shouldSign = false) => {
    try {
      const recordData = {
        patient_id: data.patient_id,
        appointment_id: data.appointment_id,
        subjective: data.subjective,
        objective: JSON.stringify(data.objective_data),
        assessment: data.assessment,
        plan: JSON.stringify(data.plan_data),
        vital_signs: data.vital_signs,
        functional_tests: data.functional_tests
      };

      let recordId = existingRecordId;

      if (existingRecordId) {
        await updateRecord(existingRecordId, recordData);
      } else {
        const newRecord = await addRecord(recordData);
        recordId = newRecord?.id;
      }

      if (shouldSign && recordId) {
        await signRecord(recordId);
      }

      toast({
        title: 'Sucesso',
        description: shouldSign 
          ? 'Registro SOAP salvo e assinado digitalmente!'
          : 'Registro SOAP salvo com sucesso!'
      });

      onSave?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving SOAP record:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar registro SOAP.',
        variant: 'destructive'
      });
    }
  };

  const isStepComplete = (stepIndex: number) => {
    switch (stepIndex) {
      case 0: return data.subjective.length > 10;
      case 1: return data.objective_data && Object.keys(data.objective_data).length > 0;
      case 2: return data.assessment.length > 10;
      case 3: return data.plan.length > 10;
      default: return true;
    }
  };

  const getStepProgress = () => {
    const completedSteps = steps.filter((_, index) => isStepComplete(index)).length;
    return (completedSteps / steps.length) * 100;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {existingRecordId ? 'Editar Registro SOAP' : 'Novo Registro SOAP'}
          </DialogTitle>
          <div className="flex items-center justify-between">
            <Progress value={getStepProgress()} className="flex-1 mr-4" />
            <Badge variant="outline">
              {currentStep + 1} de {steps.length}
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Step Navigation */}
          <div className="w-64 border-r bg-muted/30 p-4 space-y-2 overflow-y-auto">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = isStepComplete(index);
              
              return (
                <Button
                  key={step.id}
                  variant={isActive ? 'default' : 'ghost'}
                  className={`w-full justify-start h-auto p-3 ${
                    isCompleted && !isActive ? 'bg-green-50 border-green-200' : ''
                  }`}
                  onClick={() => setCurrentStep(index)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${isCompleted ? 'text-green-600' : ''}`}>
                      {isCompleted ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <StepIcon className="w-4 h-4" />
                      )}
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-sm">{step.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {step.description}
                      </div>
                    </div>
                  </div>
                </Button>
              );
            })}

            {/* Template Selector */}
            <div className="pt-4 border-t">
              <label className="text-sm font-medium">Templates</label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Aplicar template" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(soapTemplates).map(([key, template]) => (
                    <SelectItem key={key} value={key}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTemplate && (
                <Button 
                  onClick={() => applyTemplate(selectedTemplate)}
                  className="w-full mt-2"
                  size="sm"
                >
                  Aplicar Template
                </Button>
              )}
            </div>
          </div>

          {/* Step Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Subjective Step */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-2">Subjetivo (S)</h3>
                  <p className="text-muted-foreground mb-4">
                    Informações fornecidas pelo paciente sobre sintomas, queixas e histórico.
                  </p>
                </div>

                <PainScale 
                  value={painLevel}
                  onChange={setPainLevel}
                  onNotesChange={(notes) => updateData({ 
                    subjective_data: { ...data.subjective_data, pain_notes: notes }
                  })}
                />

                <Card>
                  <CardHeader>
                    <CardTitle>Relato do Paciente</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={data.subjective}
                      onChange={(e) => updateData({ subjective: e.target.value })}
                      placeholder="Descreva as queixas, sintomas, história da condição atual, medicamentos, atividades afetadas, etc."
                      rows={8}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Objective Step */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-2">Objetivo (O)</h3>
                  <p className="text-muted-foreground mb-4">
                    Achados do exame físico, testes e medições objetivas.
                  </p>
                </div>

                <Tabs defaultValue="exam" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="exam">Exame Físico</TabsTrigger>
                    <TabsTrigger value="rom">ADM</TabsTrigger>
                    <TabsTrigger value="tests">Testes Funcionais</TabsTrigger>
                    <TabsTrigger value="vitals">Sinais Vitais</TabsTrigger>
                  </TabsList>

                  <TabsContent value="exam" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Exame Físico</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Textarea
                          value={data.objective}
                          onChange={(e) => updateData({ objective: e.target.value })}
                          placeholder="Descreva inspeção, palpação, testes especiais, observações posturais, etc."
                          rows={8}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="rom" className="mt-6">
                    <RangeOfMotion 
                      data={data.rom_data}
                      onChange={(rom_data) => updateData({ rom_data })}
                    />
                  </TabsContent>

                  <TabsContent value="tests" className="mt-6">
                    <FunctionalAssessment
                      tests={data.functional_tests}
                      onChange={(functional_tests) => updateData({ functional_tests })}
                    />
                  </TabsContent>

                  <TabsContent value="vitals" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Sinais Vitais</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="text-sm font-medium">PA (mmHg)</label>
                          <Input 
                            placeholder="120/80"
                            value={data.vital_signs?.blood_pressure || ''}
                            onChange={(e) => updateData({ 
                              vital_signs: { ...data.vital_signs, blood_pressure: e.target.value }
                            })}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">FC (bpm)</label>
                          <Input 
                            type="number"
                            placeholder="72"
                            value={data.vital_signs?.heart_rate || ''}
                            onChange={(e) => updateData({ 
                              vital_signs: { ...data.vital_signs, heart_rate: parseInt(e.target.value) }
                            })}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Temp (°C)</label>
                          <Input 
                            type="number"
                            step="0.1"
                            placeholder="36.5"
                            value={data.vital_signs?.temperature || ''}
                            onChange={(e) => updateData({ 
                              vital_signs: { ...data.vital_signs, temperature: parseFloat(e.target.value) }
                            })}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">FR (irpm)</label>
                          <Input 
                            type="number"
                            placeholder="16"
                            value={data.vital_signs?.respiratory_rate || ''}
                            onChange={(e) => updateData({ 
                              vital_signs: { ...data.vital_signs, respiratory_rate: parseInt(e.target.value) }
                            })}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* Assessment Step */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-2">Avaliação (A)</h3>
                  <p className="text-muted-foreground mb-4">
                    Análise clínica, diagnóstico fisioterapêutico e prognóstico.
                  </p>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Análise e Diagnóstico</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={data.assessment}
                      onChange={(e) => updateData({ assessment: e.target.value })}
                      placeholder="Diagnóstico fisioterapêutico, problemas identificados, limitações funcionais, prognóstico, etc."
                      rows={8}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Plan Step */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-2">Plano (P)</h3>
                  <p className="text-muted-foreground mb-4">
                    Plano de tratamento, intervenções e objetivos terapêuticos.
                  </p>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Plano de Tratamento</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={data.plan}
                      onChange={(e) => updateData({ plan: e.target.value })}
                      placeholder="Frequência, técnicas, exercícios, educação do paciente, objetivos, critérios de alta, etc."
                      rows={8}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Review Step */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-2">Revisão e Assinatura</h3>
                  <p className="text-muted-foreground mb-4">
                    Revise todas as informações antes de salvar o registro.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Subjetivo
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {data.subjective || 'Nenhuma informação subjetiva registrada.'}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        Objetivo
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {data.objective || 'Nenhuma informação objetiva registrada.'}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Brain className="w-4 h-4" />
                        Avaliação
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {data.assessment || 'Nenhuma avaliação registrada.'}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Plano
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {data.plan || 'Nenhum plano registrado.'}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="ready-to-sign"
                        checked={isReadyToSign}
                        onCheckedChange={(checked) => setIsReadyToSign(!!checked)}
                      />
                      <label htmlFor="ready-to-sign" className="text-sm font-medium">
                        Confirmo que revisei todas as informações e estão corretas
                      </label>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="flex items-center justify-between p-6 border-t">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Anterior
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={loading}
            >
              <Save className="w-4 h-4 mr-2" />
              Salvar Rascunho
            </Button>

            {currentStep === steps.length - 1 ? (
              <Button
                onClick={() => handleSave(true)}
                disabled={!isReadyToSign || loading}
              >
                <PenTool className="w-4 h-4 mr-2" />
                Salvar e Assinar
              </Button>
            ) : (
              <Button onClick={nextStep}>
                Próximo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}