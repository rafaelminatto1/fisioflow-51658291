import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, X, Loader2, AlertTriangle, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {

  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useTherapists,
  THERAPIST_SELECT_NONE,
  THERAPIST_PLACEHOLDER,
  getTherapistById,
} from '@/hooks/useTherapists';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { getFirebaseAuth, db, doc, getDoc, getDocs, collection, query, where, limit, updateDoc, addDoc } from '@/integrations/firebase/app';
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
import { appointmentsApi } from '@/integrations/firebase/functions';
import { PatientService } from '@/lib/services/PatientService';
import { useQueryClient } from '@tanstack/react-query';
import { soapKeys } from '@/hooks/useSoapRecords';
import { normalizeFirestoreData } from '@/utils/firestoreData';
import { AgendaAutomationService } from '@/lib/services/AgendaAutomationService';
import { NotionEvolutionPanel } from './v2-improved/NotionEvolutionPanel';
import type { EvolutionV2Data } from './v2-improved/types';

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
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganizations();
  const auth = getFirebaseAuth();

  const appointmentId = propAppointmentId || params.appointmentId;
  const [patientId, setPatientId] = useState(propPatientId || '');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [patient, setPatient] = useState<Record<string, unknown> | null>(null);

  const [, setAppointment] = useState<Record<string, unknown> | null>(null);
  const [appointmentLoadedFromApi, setAppointmentLoadedFromApi] = useState(false);
  const [activeTab, setActiveTab] = useState('evolution');
  const [viewVersion, setViewVersion] = useState<'classic' | 'improved'>('improved');

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

  // Fisioterapeuta responsável (dropdown + CREFITO)
  const [selectedTherapistId, setSelectedTherapistId] = useState('');
  const { therapists } = useTherapists();

  const loadData = React.useCallback(async () => {
    if (!auth.currentUser) {
      setIsLoading(false);
      setLoadError('Faça login para acessar esta página.');
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      let currentPatientId = propPatientId || '';

      // Load appointment data (Firestore primeiro; se não existir, tenta API usada pela agenda)
      if (appointmentId) {
        const appointmentRef = doc(db, 'appointments', appointmentId);
        const appointmentSnap = await getDoc(appointmentRef);

        let appointmentData: Record<string, unknown> & { patient_id?: string; patientId?: string; notes?: string } = {};
        let loadedFromApi = false;

        if (appointmentSnap.exists()) {
          setAppointmentLoadedFromApi(false);
          appointmentData = { ...appointmentSnap.data(), patient_id: appointmentSnap.data().patient_id };
          setAppointment({ id: appointmentSnap.id, ...appointmentData });
        } else {
          // Agenda pode vir da API (Cloud Function); buscar por id
          try {
            const apiAppointment = await appointmentsApi.get(appointmentId);
            loadedFromApi = true;
            setAppointmentLoadedFromApi(true);
            const pid = (apiAppointment as { patientId?: string; patient_id?: string }).patientId ?? (apiAppointment as { patient_id?: string }).patient_id;
            appointmentData = {
              id: apiAppointment.id,
              patient_id: pid,
              patientId: pid,
              therapist_id: (apiAppointment as { therapist_id?: string }).therapist_id,
              date: (apiAppointment as { date?: string }).date,
              start_time: (apiAppointment as { startTime?: string }).startTime,
              notes: (apiAppointment as { notes?: string }).notes,
            };
            setAppointment({ id: apiAppointment.id, ...appointmentData });
            currentPatientId = pid || currentPatientId;
            if (pid) setPatientId(pid);
          } catch (apiErr) {
            logger.warn('Appointment not in Firestore nor API', { appointmentId, err: apiErr }, 'SessionEvolutionContainer');
            throw new Error('Appointment not found');
          }
        }

        const patientIdFromApp = appointmentData.patient_id ?? appointmentData.patientId;
        if (patientIdFromApp) {
          currentPatientId = String(patientIdFromApp);
          setPatientId(currentPatientId);
          const patientRef = doc(db, 'patients', currentPatientId);
          const patientSnap = await getDoc(patientRef);
          if (patientSnap.exists()) {
            setPatient({ id: patientSnap.id, ...patientSnap.data() });
          } else if (loadedFromApi) {
            try {
              const apiPatient = await PatientService.getPatientById(currentPatientId);
              if (apiPatient) {
                // Normalizar para formato esperado pela UI (full_name, etc.)
                setPatient({
                  id: apiPatient.id,
                  ...apiPatient,
                  full_name: apiPatient.name ?? (apiPatient as Record<string, unknown>).full_name,
                  patientName: apiPatient.name ?? (apiPatient as Record<string, unknown>).patientName,
                });
              }
            } catch {
              // Paciente não encontrado na API; seguir sem dados do paciente
            }
          }
        }

        // Load existing SOAP if any (só quando veio do Firestore)
        if (appointmentSnap.exists() && appointmentData.notes) {
          try {
            const notes = JSON.parse(String(appointmentData.notes));
            if (notes.soap) setSoapData(notes.soap);
            if (notes.exercises) setSessionExercises(notes.exercises);
          } catch {
            // Notes is plain text
          }
        }
        const aptTherapistId = (appointmentData as { therapist_id?: string }).therapist_id;
        setSelectedTherapistId(aptTherapistId || auth.currentUser?.uid || '');
      } else if (propPatientId) {
        // Load patient directly
        const patientRef = doc(db, 'patients', propPatientId);
        const patientSnap = await getDoc(patientRef);

        if (!patientSnap.exists()) {
          throw new Error('Patient not found');
        }

        setPatient({ id: patientSnap.id, ...patientSnap.data() });
        currentPatientId = propPatientId;
        setSelectedTherapistId(auth.currentUser?.uid || '');
      }

      // Load patient related data
      if (currentPatientId) {
        // Número da sessão: conta apenas atendimentos no Firestore (quando carregado da API pode ser aproximado)
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
        setSurgeries(surgeriesSnap.docs.map(doc => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) })));

        // Load pathologies
        const pathologiesQuery = query(
          collection(db, 'patient_pathologies'),
          where('patient_id', '==', currentPatientId)
        );
        const pathologiesSnap = await getDocs(pathologiesQuery);
        setPathologies(pathologiesSnap.docs.map(doc => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) })));

        // Load goals
        const goalsQuery = query(
          collection(db, 'patient_goals'),
          where('patient_id', '==', currentPatientId)
        );
        const goalsSnap = await getDocs(goalsQuery);
        setGoals(goalsSnap.docs.map(doc => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) })));

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
      const err = error as { code?: string; message?: string };
      const msg = String(err?.message ?? '');
      const isPermissionDenied = err?.code === 'permission-denied' || msg.includes('permission') || msg.includes('insufficient permissions');
      const isNotFound = err?.code === 'not-found' || msg.includes('not found') || msg.includes('Appointment not found') || msg.includes('Patient not found');
      const description = isPermissionDenied
        ? 'Sem permissão para acessar esta sessão. Verifique se seu perfil tem acesso a este atendimento ou entre em contato com o administrador.'
        : isNotFound
          ? 'Agendamento ou paciente não encontrado. Verifique se o link está correto.'
          : 'Não foi possível carregar os dados da sessão. Tente novamente.';
      setLoadError(description);
      toast({
        title: 'Erro ao carregar dados',
        description: isPermissionDenied ? 'Sem permissão para acessar esta sessão.' : isNotFound ? 'Agendamento não encontrado.' : 'Não foi possível carregar os dados da sessão.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId, propPatientId, testsCompleted, toast, db]);

  useEffect(() => {
  }, []);
  // Só carregar dados quando o usuário estiver autenticado (evita permission-denied por token ainda não disponível)
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let retryCount = 0;
    const maxRetries = 3;

    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const attemptLoad = async () => {
          try {
            // Get token to ensure it's ready
            await user.getIdToken(true);
            await loadData();
          } catch (err) {
            if (retryCount < maxRetries) {
              retryCount++;
              logger.warn(`Retry loading data (${retryCount}/${maxRetries})...`, err, 'SessionEvolutionContainer');
              timeoutId = setTimeout(attemptLoad, 500 * retryCount);
            } else {
              logger.error('Failed to load data after retries', err, 'SessionEvolutionContainer');
              setLoadError('Erro de conexão ou permissão. Tente recarregar a página.');
              setIsLoading(false);
            }
          }
        };

        // Pequeno atraso para o SDK anexar o token às próximas requisições Firestore
        timeoutId = setTimeout(attemptLoad, 200);
      } else if (auth.currentUser === null) {
        setIsLoading(false);
        setLoadError('Faça login para acessar esta página.');
      }
    });
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      unsub();
    };
  }, [loadData, auth]);

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

      // Upsert SOAP record: update existing draft for this appointment or create new (evita duplicação)
      const recordDate = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();
      const soapRecordData = {
        patient_id: patientId,
        appointment_id: appointmentId || null,
        subjective: trimmedSubjective,
        objective: trimmedObjective,
        assessment: trimmedAssessment,
        plan: trimmedPlan,
        created_by: user.uid,
        record_date: recordDate,
        status: 'draft' as const,
        updated_at: now,
      };

      let soapRecordId: string;
      const draftQuery = query(
        collection(db, 'soap_records'),
        where('appointment_id', '==', appointmentId),
        where('status', '==', 'draft'),
        limit(1)
      );
      const draftSnap = await getDocs(draftQuery);
      if (!draftSnap.empty) {
        const existingRef = draftSnap.docs[0].ref;
        soapRecordId = existingRef.id;
        await updateDoc(existingRef, { ...soapRecordData, updated_at: now });
      } else {
        const newRef = await addDoc(collection(db, 'soap_records'), {
          ...soapRecordData,
          created_at: now,
        });
        soapRecordId = newRef.id;
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

      const therapistId = selectedTherapistId || user.uid;
      const sessionData = {
        patient_id: patientId,
        therapist_id: therapistId,
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

      // Update appointment: mesma fonte em que foi carregado (API ou Firestore)
      if (appointmentId) {
        const notesPayload = JSON.stringify({ soap: soapData, soapRecordId: soapRecordId, exercises: sessionExercises });
        const statusRealizado = 'Realizado'; // UI/agenda; API pode normalizar
        if (appointmentLoadedFromApi) {
          await appointmentsApi.update(appointmentId, { status: statusRealizado, notes: notesPayload });
        } else {
          await updateDoc(doc(db, 'appointments', appointmentId), {
            status: statusRealizado,
            notes: notesPayload
          });
        }
      }

      logger.info('Evolução salva com sucesso', { soapRecordId: soapRecordId, patientId }, 'SessionEvolutionContainer');

      // Invalidar cache de SOAP para refletir o novo registro na lista e histórico
      queryClient.invalidateQueries({ queryKey: soapKeys.list(patientId) });
      queryClient.invalidateQueries({ queryKey: soapKeys.drafts(patientId) });

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

      // Agenda Automation: Check for gaps after session completion
      if (therapistId) {
        const today = new Date().toISOString().split('T')[0];
        AgendaAutomationService.detectGaps(therapistId, today).then(gaps => {
          if (gaps.length > 0) {
            // Em produção, pegaríamos o telefone real do admin da config da clínica
            AgendaAutomationService.notifyAdminOfGaps(therapistId, gaps);
          }
        }).catch(err => logger.warn('Erro ao processar automação de agenda', err));
      }

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

  if (loadError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <AlertTriangle className="h-12 w-12 text-destructive" />
              <h2 className="text-lg font-semibold">Não foi possível carregar a evolução</h2>
              <p className="text-sm text-muted-foreground" data-testid="evolution-error">{loadError}</p>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => navigate('/')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar para a Agenda
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const containerClass = mode === 'modal'
    ? 'fixed inset-0 z-50 bg-background'
    : mode === 'embedded'
      ? 'w-full h-full'
      : 'min-h-screen bg-background';
  const selectedTherapistCrefito = getTherapistById(therapists, selectedTherapistId)?.crefito;

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleClose} aria-label="Voltar">
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
              {therapists.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <UserCog className="h-3.5 w-3.5" />
                    Fisioterapeuta
                  </span>
                  <Select
                    value={selectedTherapistId || THERAPIST_SELECT_NONE}
                    onValueChange={(v) => setSelectedTherapistId(v === THERAPIST_SELECT_NONE ? '' : v)}
                    aria-label={THERAPIST_PLACEHOLDER}
                  >
                    <SelectTrigger className="h-8 w-[180px] text-xs">
                      <SelectValue placeholder={THERAPIST_PLACEHOLDER} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={THERAPIST_SELECT_NONE}>
                        {THERAPIST_PLACEHOLDER}
                      </SelectItem>
                      {selectedTherapistId && !getTherapistById(therapists, selectedTherapistId) && (
                        <SelectItem value={selectedTherapistId}>
                          Responsável atual
                        </SelectItem>
                      )}
                      {therapists.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.crefito ? `${t.name} (${t.crefito})` : t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTherapistCrefito && (
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      CREFITO {selectedTherapistCrefito}
                    </Badge>
                  )}
                </div>
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

      {/* Main Content */}
      <div className="p-4 h-[calc(100vh-80px)] overflow-hidden">
        {viewVersion === 'improved' ? (
          <NotionEvolutionPanel
            data={{
              patientReport: soapData.subjective,
              evolutionText: soapData.assessment,
              procedures: [], // Mapear se disponível
              exercises: sessionExercises.map(ex => ({
                id: ex.id || Math.random().toString(),
                name: ex.name,
                sets: ex.sets || '3',
                reps: ex.reps || '10',
                weight: ex.weight || '',
                notes: ex.notes || '',
                feedback: ex.feedback as any || 'good',
              })),
              painLevel: 0,
              painLocation: '',
              homeCareExercises: soapData.plan,
              observations: '',
              sessionNumber,
              totalSessions: sessionNumber,
              sessionDate: new Date().toISOString(),
              therapistName: auth.currentUser?.displayName || 'Fisioterapeuta',
              therapistCrefito: selectedTherapistCrefito || '',
            }}
            onChange={(newData) => {
              setSoapData({
                subjective: newData.patientReport,
                objective: soapData.objective, // Manter o que já tinha
                assessment: newData.evolutionText,
                plan: newData.homeCareExercises || soapData.plan
              });
              setSessionExercises(newData.exercises.map(ex => ({
                id: ex.id,
                name: ex.name,
                sets: ex.sets,
                reps: ex.reps,
                weight: ex.weight,
                notes: ex.notes,
                feedback: ex.feedback as any
              })));
            }}
            onSave={handleSave}
            isSaving={isSaving}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
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
                  <Tabs value={activeTab} onValueChange={setActiveTab} aria-label="Painéis de evolução">
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
        )}
      </div>
    </div>
  );
};

export default SessionEvolutionContainer;