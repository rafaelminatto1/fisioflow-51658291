import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, X, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/errors/logger';
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
  
  const appointmentId = propAppointmentId || params.appointmentId;
  const [patientId, setPatientId] = useState(propPatientId || '');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [patient, setPatient] = useState<any>(null);
  const [appointment, setAppointment] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('evolution');
  
  // Patient data
  const [surgeries, setSurgeries] = useState<any[]>([]);
  const [pathologies, setPathologies] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  
  // SOAP Form State
  const [soapData, setSoapData] = useState({
    subjective: '',
    objective: '',
    assessment: '',
    plan: ''
  });
  
  // Mandatory Tests State
  const [mandatoryTestsResult, setMandatoryTestsResult] = useState<AlertCheckResult | null>(null);
  const [testsCompleted, setTestsCompleted] = useState<string[]>([]);
  const [showMandatoryAlert, setShowMandatoryAlert] = useState(false);
  
  // Session number for test frequency
  const [sessionNumber, setSessionNumber] = useState(1);

  useEffect(() => {
    loadData();
  }, [appointmentId, propPatientId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      let currentPatientId = propPatientId || '';
      
      // Load appointment data
      if (appointmentId) {
        const { data: appointmentData, error: appointmentError } = await supabase
          .from('appointments')
          .select(`
            *,
            patients:patient_id (*)
          `)
          .eq('id', appointmentId)
          .single();

        if (appointmentError) throw appointmentError;
        
        setAppointment(appointmentData);
        setPatient(appointmentData.patients);
        currentPatientId = appointmentData.patient_id;
        setPatientId(currentPatientId);
        
        // Load existing SOAP if any
        if (appointmentData.notes) {
          try {
            const notes = JSON.parse(appointmentData.notes);
            if (notes.soap) {
              setSoapData(notes.soap);
            }
          } catch {
            // Notes is plain text
          }
        }
      } else if (propPatientId) {
        // Load patient directly
        const { data: patientData, error: patientError } = await supabase
          .from('patients')
          .select('*')
          .eq('id', propPatientId)
          .single();

        if (patientError) throw patientError;
        setPatient(patientData);
        currentPatientId = propPatientId;
      }

      // Load patient related data
      if (currentPatientId) {
        // Calculate session number
        const { count } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('patient_id', currentPatientId)
          .eq('status', 'Realizado');
        
        setSessionNumber((count || 0) + 1);

        // Load surgeries
        const { data: surgeryData } = await supabase
          .from('patient_surgeries')
          .select('*')
          .eq('patient_id', currentPatientId)
          .order('surgery_date', { ascending: false });
        
        setSurgeries(surgeryData || []);

        // Load pathologies
        const { data: pathologyData } = await supabase
          .from('patient_pathologies')
          .select('*')
          .eq('patient_id', currentPatientId);
        
        setPathologies(pathologyData || []);

        // Load goals
        const { data: goalsData } = await supabase
          .from('patient_goals')
          .select('*')
          .eq('patient_id', currentPatientId);
        
        setGoals(goalsData || []);

        // Check mandatory tests
        const result = await MandatoryTestAlertService.checkMandatoryTests(
          currentPatientId,
          sessionNumber,
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
  };

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

  const handleReplicateConduct = (conduct: any) => {
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
      // Save SOAP record
      const { data: soapRecord, error: soapError } = await supabase
        .from('soap_records')
        .insert({
          patient_id: patientId,
          appointment_id: appointmentId,
          subjective: soapData.subjective,
          objective: soapData.objective,
          assessment: soapData.assessment,
          plan: soapData.plan,
          session_number: sessionNumber,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (soapError) throw soapError;

      // Update appointment status
      if (appointmentId) {
        const { error: appointmentError } = await supabase
          .from('appointments')
          .update({
            status: 'Realizado',
            notes: JSON.stringify({ soap: soapData, soapRecordId: soapRecord.id })
          })
          .eq('id', appointmentId);

        if (appointmentError) throw appointmentError;
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
    } catch (error) {
      logger.error('Erro ao salvar sessão', error, 'SessionEvolutionContainer');
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar a evolução.',
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
                  {patient.name} • Sessão #{sessionNumber}
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
                  <TabsTrigger value="pathologies" className="flex-1">Patologias</TabsTrigger>
                  <TabsTrigger value="insights" className="flex-1">Insights</TabsTrigger>
                </TabsList>
                
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
