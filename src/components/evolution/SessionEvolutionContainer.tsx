import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, X, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { getFirebaseAuth, db, doc, getDoc, getDocs, collection, query, where, setDoc, updateDoc, addDoc } from '@/integrations/firebase/app';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { useOrganizations } from '@/hooks/useOrganizations';
import { SOAPFormPanel } from './SOAPFormPanel';
import { SessionHistoryPanel } from './SessionHistoryPanel';
import { TestEvolutionPanel } from './TestEvolutionPanel';
import { PatientSummaryPanel } from './PatientSummaryPanel';
import { MandatoryTestAlert } from './MandatoryTestAlert';
import { SurgeryTimeline } from './SurgeryTimeline';
import { PathologyStatus } from './PathologyStatus';
import { GoalsTracker } from './GoalsTracker';
import { ConductReplication } from './ConductReplication';
import { MedicalReportSuggestions } from './MedicalReportSuggestions';
import { MandatoryTestAlertService, type AlertCheckResult } from '@/lib/services/mandatoryTestAlertService';
import { SessionExercisesPanel, type SessionExercise } from './SessionExercisesPanel';
import { PatientHelpers } from '@/types';
import { GamificationTriggerService } from '@/lib/services/gamificationTriggers';
import { GamificationNotificationService } from '@/lib/services/gamificationNotifications';

interface SessionEvolutionContainerProps {
  appointmentId?: string;
  patientId?: string;
  onClose?: () => void;
  mode?: 'page' | 'modal' | 'embedded';
}

export const SessionEvolutionContainer: React.FC<SessionEvolutionContainerProps> = ({
  appointmentId: propAppointmentId,
  patientId: propPatientId,
  onClose,
  mode = 'page'
}) => {
  const params = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentOrganization } = useOrganizations();
  const auth = getFirebaseAuth();

  const appointmentId = propAppointmentId || params.appointmentId;
  const [patientId, setPatientId] = useState(propPatientId || '');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [patient, setPatient] = useState<Record<string, unknown> | null>(null);

  const [, setAppointment] = useState<Record<string, unknown> | null>(null);
  const [activeTab, setActiveTab] = useState('evolution');

  // Patient data
  // Using any[] to avoid strict type conflicts with child components that expect specific interfaces
  const [surgeries, setSurgeries] = useState<Record<string, unknown>[]>([]);
  const [pathologies, setPathologies] = useState<Record<string, unknown>[]>([]);
  const [goals, setGoals] = useState<Record<string, unknown>[]>([]);

  // SOAP Form State
  const [soapData, setSoapData] = useState({
    subjective: '',
    objective: '',
    assessment: '',
    plan: ''
  });

  // Exercises State
  const [sessionExercises, setSessionExercises] = useState<SessionExercise[]>([]);

  // Mandatory Tests State
  const [mandatoryTestsResult, setMandatoryTestsResult] = useState<AlertCheckResult | null>(null);
  const [testsCompleted, setTestsCompleted] = useState<string[]>([]);
  const [showMandatoryAlert, setShowMandatoryAlert] = useState(false);

  // Session number for test frequency
  const [sessionNumber, setSessionNumber] = useState(1);



  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      let currentPatientId = propPatientId || '';

      // Load appointment data
      if (appointmentId) {
        const appointmentRef = doc(db, 'appointments', appointmentId);
        const appointmentSnap = await getDoc(appointmentRef);

        if (!appointmentSnap.exists()) {
          throw new Error('Appointment not found');
        }

        const appointmentData = appointmentSnap.data();

        // Load patient
        if (appointmentData.patient_id) {
          const patientRef = doc(db, 'patients', appointmentData.patient_id);
          const patientSnap = await getDoc(patientRef);
          if (patientSnap.exists()) {
            setPatient({ id: patientSnap.id, ...patientSnap.data() });
            currentPatientId = appointmentData.patient_id;
            setPatientId(currentPatientId);
          }
        }

        setAppointment({ id: appointmentSnap.id, ...appointmentData });

        // Load existing SOAP if any
        if (appointmentData.notes) {
          try {
            const notes = JSON.parse(appointmentData.notes);
            if (notes.soap) {
              setSoapData(notes.soap);
            }
            if (notes.exercises) {
              setSessionExercises(notes.exercises);
            }
          } catch {
            // Notes is plain text
          }
        }
      } else if (propPatientId) {
        // Load patient directly
        const patientRef = doc(db, 'patients', propPatientId);
        const patientSnap = await getDoc(patientRef);

        if (!patientSnap.exists()) {
          throw new Error('Patient not found');
        }

        setPatient({ id: patientSnap.id, ...patientSnap.data() });
        currentPatientId = propPatientId;
      }

      // Load patient related data
      if (currentPatientId) {
        // Calculate session number
        const appointmentsQuery = query(
          collection(db, 'appointments'),
          where('patient_id', '==', currentPatientId),
          where('status', '==', 'atendido')
        );
        const appointmentsSnap = await getDocs(appointmentsQuery);
        const calculatedSessionNumber = appointmentsSnap.size + 1;
        setSessionNumber(calculatedSessionNumber);

        // Load surgeries
        const surgeriesQuery = query(
          collection(db, 'patient_surgeries'),
          where('patient_id', '==', currentPatientId)
        );
        const surgeriesSnap = await getDocs(surgeriesQuery);
        setSurgeries(surgeriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Load pathologies
        const pathologiesQuery = query(
          collection(db, 'patient_pathologies'),
          where('patient_id', '==', currentPatientId)
        );
        const pathologiesSnap = await getDocs(pathologiesQuery);
        setPathologies(pathologiesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Load goals
        const goalsQuery = query(
          collection(db, 'patient_goals'),
          where('patient_id', '==', currentPatientId)
        );
        const goalsSnap = await getDocs(goalsQuery);
        setGoals(goalsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Check mandatory tests
        const result = await MandatoryTestAlertService.checkMandatoryTests(
          currentPatientId,
          calculatedSessionNumber,
          testsCompleted
        );
        setMandatoryTestsResult(result);
        setShowMandatoryAlert(!result.canSave);
      }
    } catch (error) {
      logger.error('Erro ao carregar dados da sessão', error, 'SessionEvolutionContainer');
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar os dados da sessão.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [appointmentId, propPatientId, testsCompleted, toast, db]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSoapChange = (data: typeof soapData) => {
    setSoapData(data);
  };

  const handleSelectConduct = (conduct: string) => {
    setSoapData(prev => ({ ...prev, plan: conduct }));
    toast({
      title: 'Conduta aplicada',
      description: 'O plano foi atualizado com a conduta selecionada.'
    });
  };

  const handleReplicateConduct = (conduct: { plan?: string; subjective?: string; objective?: string; assessment?: string }) => {
    if (conduct.plan) {
      setSoapData(prev => ({
        ...prev,
        plan: conduct.plan,
        ...(conduct.subjective && { subjective: conduct.subjective }),
        ...(conduct.objective && { objective: conduct.objective }),
        ...(conduct.assessment && { assessment: conduct.assessment }),
      }));
      toast({
        title: 'Conduta replicada',
        description: 'Os dados da sessão anterior foram aplicados.'
      });
    }
  };

  const handleTestCompleted = (testName: string) => {
    setTestsCompleted(prev => [...prev, testName]);
    // Recheck mandatory tests
    if (patientId) {
      MandatoryTestAlertService.checkMandatoryTests(patientId, sessionNumber, [...testsCompleted, testName])
        .then(result => {
          setMandatoryTestsResult(result);
          setShowMandatoryAlert(!result.canSave);
        });
    }
  };

  const handleRegisterException = async (testName: string, reason: string) => {
    if (!patientId || !appointmentId) return;

    await MandatoryTestAlertService.registerException(patientId, appointmentId, testName, reason);
    handleTestCompleted(testName);
  };

  const handleSave = async () => {
    // Validar organização
    if (!currentOrganization?.id) {
      toast({
        title: 'Organização não encontrada',
        description: 'Você precisa estar vinculado a uma organização para salvar evoluções.',
        variant: 'destructive'
      });
      return;
    }

    // Validar dados SOAP (verificar após trim para considerar apenas espaços como vazio)
    const trimmedSubjective = soapData.subjective?.trim() || '';
    const trimmedObjective = soapData.objective?.trim() || '';
    const trimmedAssessment = soapData.assessment?.trim() || '';
    const trimmedPlan = soapData.plan?.trim() || '';

    if (!trimmedSubjective || !trimmedObjective || !trimmedAssessment || !trimmedPlan) {
      toast({
        title: 'Dados incompletos',
        description: 'Preencha todos os campos do SOAP (Subjetivo, Objetivo, Avaliação e Plano).',
        variant: 'destructive'
      });
      return;
    }

    // Check for critical mandatory tests
    if (mandatoryTestsResult && !mandatoryTestsResult.canSave) {
      setShowMandatoryAlert(true);
      toast({
        title: 'Testes obrigatórios pendentes',
        description: 'Realize os testes críticos antes de salvar ou registre uma exceção.',
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Usuário não autenticado');

      // Save SOAP record
      const soapRecordRef = docRef(collection(db, 'soap_records'));
      const soapRecordData = {
        patient_id: patientId,
        appointment_id: appointmentId || null,
        subjective: trimmedSubjective,
        objective: trimmedObjective,
        assessment: trimmedAssessment,
        plan: trimmedPlan,
        created_by: user.uid,
        record_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString()
      };
      await setDoc(soapRecordRef, soapRecordData);
      const soapRecordId = soapRecordRef.id;

      if (soapData && soapRecordId) {
        // Also update the note created in treatment_session if needed or just rely on appointment linkage
      }

      // Save to treatment_sessions (Exercises Performed)
      // First, check if a session already exists for this appointment to avoid duplicates
      let existingSessionId = null;
      if (appointmentId) {
        const sessionsQuery = query(
          collection(db, 'treatment_sessions'),
          where('appointment_id', '==', appointmentId)
        );
        const sessionsSnap = await getDocs(sessionsQuery);
        if (!sessionsSnap.empty) {
          existingSessionId = sessionsSnap.docs[0].id;
        }
      }

      const sessionData = {
        patient_id: patientId,
        therapist_id: user.uid,
        appointment_id: appointmentId || null,
        session_date: new Date().toISOString(),
        session_type: 'treatment',
        // pain_level_before/after could be gathered from a form, keeping default 0 for now
        pain_level_before: 0,
        pain_level_after: 0,
        functional_score_before: 0,
        functional_score_after: 0,
        exercises_performed: sessionExercises,
        observations: soapData.assessment,
        status: 'completed',
        created_by: user.uid,
        created_at: new Date().toISOString()
      };

      if (existingSessionId) {
        await updateDoc(doc(db, 'treatment_sessions', existingSessionId), sessionData);
      } else {
        await addDoc(collection(db, 'treatment_sessions'), sessionData);
      }

      // Update appointment status
      if (appointmentId) {
        await updateDoc(doc(db, 'appointments', appointmentId), {
          status: 'Realizado',
          notes: JSON.stringify({ soap: soapData, soapRecordId: soapRecordId, exercises: sessionExercises })
        });
      }

      logger.info('Evolução salva com sucesso', { soapRecordId: soapRecordId, patientId }, 'SessionEvolutionContainer');

      // Award XP for session completion
      if (patientId) {
        try {
          const xpResult = await GamificationTriggerService.awardSessionCompletion(patientId, {
            sessionNumber,
            exercisesCount: sessionExercises.length,
            completionTime: new Date(),
          });

          if (xpResult.success && xpResult.xpAwarded > 0) {
            const description = `Sessão ${sessionNumber} concluída${sessionExercises.length > 0 ? ` com ${sessionExercises.length} exercício(s)` : ''}`;

            if (xpResult.newLevel && xpResult.newLevel > 1) {
              GamificationNotificationService.levelUp(xpResult.newLevel);
            }

            GamificationNotificationService.xpAwarded(xpResult.xpAwarded, description, !!xpResult.newLevel);
          }
        } catch (xpError) {
          logger.warn('Failed to award XP', xpError, 'SessionEvolutionContainer');
          // Don't fail the save if XP award fails
        }
      }

      toast({
        title: 'Evolução salva',
        description: 'Os dados da sessão foram salvos com sucesso.'
      });

      if (onClose) {
        onClose();
      } else if (mode === 'page') {
        navigate('/agenda');
      }
    } catch (error: unknown) {
      logger.error('Erro ao salvar sessão', error, 'SessionEvolutionContainer');

      let errorMessage = 'Não foi possível salvar a evolução.';

      const err = error as { code?: string; message?: string };
      if (err?.code === '42501') {
        errorMessage = 'Você não tem permissão para salvar evoluções.';
      } else if (err?.code === '23503') {
        errorMessage = 'Erro de referência: verifique se o paciente e agendamento existem.';
      } else if (err?.code === '23505') {
        errorMessage = 'Já existe uma evolução para este agendamento.';
      } else if (err?.message) {
        errorMessage = err.message || errorMessage;
      }

      toast({
        title: 'Erro ao salvar',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigate('/agenda');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const containerClass = mode === 'modal'
    ? 'fixed inset-0 z-50 bg-background'
    : mode === 'embedded'
      ? 'w-full h-full'
      : 'min-h-screen bg-background';

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">
                Evolução de Sessão
              </h1>
              {patient && (
                <p className="text-sm text-muted-foreground">
                  {PatientHelpers.getName(patient)} • Sessão #{sessionNumber}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {mandatoryTestsResult && !mandatoryTestsResult.canSave && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span>Testes pendentes</span>
              </div>
            )}
            <Button variant="outline" onClick={handleClose}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar Evolução
            </Button>
          </div>
        </div>
      </div>

      {/* Mandatory Tests Alert */}
      {showMandatoryAlert && mandatoryTestsResult && (
        <MandatoryTestAlert
          alerts={[...mandatoryTestsResult.criticalAlerts, ...mandatoryTestsResult.importantAlerts]}
          onRegisterException={handleRegisterException}
        />
      )}

      {/* Main Content - 4 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 h-[calc(100vh-80px)]">
        {/* Column 1: SOAP Form (30%) */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="h-full">
            <CardContent className="p-4">
              {patientId && (
                <SOAPFormPanel
                  patientId={patientId}
                  data={soapData}
                  onChange={handleSoapChange}
                  onSave={handleSave}
                  isSaving={isSaving}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Column 2: History & Surgeries (25%) */}
        <div className="lg:col-span-3 space-y-4">
          <ScrollArea className="h-[calc(100vh-120px)]">
            <div className="space-y-4 pr-4">
              {/* Conduct Replication */}
              {patientId && (
                <ConductReplication
                  patientId={patientId}
                  onSelectConduct={handleSelectConduct}
                />
              )}

              {/* Session History */}
              {patientId && (
                <SessionHistoryPanel
                  patientId={patientId}
                  onReplicateConduct={handleReplicateConduct}
                />
              )}

              {/* Surgery Timeline */}
              {surgeries.length > 0 && (
                <SurgeryTimeline surgeries={surgeries} />
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Column 3: Tests & Evolution (25%) */}
        <div className="lg:col-span-3 space-y-4">
          <ScrollArea className="h-[calc(100vh-120px)]">
            <div className="space-y-4 pr-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full">
                  <TabsTrigger value="evolution" className="flex-1">Evolução</TabsTrigger>
                  <TabsTrigger value="exercises" className="flex-1">Exercícios</TabsTrigger>
                  <TabsTrigger value="pathologies" className="flex-1">Patologias</TabsTrigger>
                  <TabsTrigger value="insights" className="flex-1">Insights</TabsTrigger>
                </TabsList>

                <TabsContent value="exercises" className="mt-4">
                  <SessionExercisesPanel
                    exercises={sessionExercises}
                    onChange={setSessionExercises}
                  />
                </TabsContent>

                <TabsContent value="evolution" className="mt-4">
                  {patientId && (
                    <TestEvolutionPanel
                      patientId={patientId}
                      sessionNumber={sessionNumber}
                    />
                  )}
                </TabsContent>

                <TabsContent value="pathologies" className="mt-4">
                  {pathologies.length > 0 ? (
                    <PathologyStatus pathologies={pathologies} />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhuma patologia registrada.
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="insights" className="mt-4">
                  {patientId && (
                    <MedicalReportSuggestions patientId={patientId} />
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        </div>

        {/* Column 4: Patient Summary (20%) */}
        <div className="lg:col-span-2">
          <ScrollArea className="h-[calc(100vh-120px)]">
            <div className="space-y-4 pr-4">
              {patient && (
                <PatientSummaryPanel
                  patient={patient}
                  goals={goals}
                  totalSessions={sessionNumber}
                />
              )}
              {goals.length > 0 && (
                <GoalsTracker goals={goals} />
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default SessionEvolutionContainer;
