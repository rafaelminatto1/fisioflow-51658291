import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  Plus,
  User,
  Stethoscope,
  ClipboardList,
  Activity,
  Save,
  Edit,
  Eye,
  Download,
  Watch,
  FileStack,
  Microscope,
  LayoutDashboard,
  Settings,
  Search
} from 'lucide-react';
import { MedicalRequestsTab } from '@/components/patient/MedicalRequestsTab';
import { PatientExamsTab } from '@/components/patient/PatientExamsTab';
import { WearablesData } from '@/components/patient/WearablesData';
import { usePrescriptions } from '@/hooks/usePrescriptions';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { AssessmentComparison } from '@/components/patient/AssessmentComparison';
import { PatientDashboard360 } from '@/components/patient/dashboard/PatientDashboard360';
import { AnamnesisForm } from '@/components/patient/forms/AnamnesisForm';
import { PhysicalExamForm } from '@/components/patient/forms/PhysicalExamForm';
import { EvaluationTemplateManager } from '@/components/admin/EvaluationTemplateManager';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { PatientHelpers } from '@/types';
import { saveSurgeries, saveGoals, savePathologies } from '@/utils/medicalRecordHelpers';

interface VitalSigns {
  bloodPressure: string;
  heartRate: string;
  temperature: string;
  respiratoryRate: string;
}

interface RecordFormData {
  type: string;
  title: string;
  content: string;
  patientId: string;
  chiefComplaint: string;
  currentHistory: string;
  pastHistory: string;
  familyHistory: string;
  physicalActivity: string;
  lifestyle: Record<string, unknown>;
  physicalExam: Record<string, unknown>;
  diagnosis: string;
  treatmentPlan: string;
  nextGoals: string;
  vitalSigns: VitalSigns;
  specialTests: Array<{ name: string; result?: string; side?: string }>;
  rangeOfMotion: Record<string, unknown>;
  muscleStrength: Record<string, unknown>;
  medications?: string;
  allergies?: string;
  newSurgeries?: Array<{ name: string; date: string; surgeon: string; hospital: string; notes?: string }>;
  newGoals?: Array<{ description: string; targetDate: string }>;
  newPathologies?: Array<{ name: string; status: 'active' | 'treated'; diagnosedAt: string }>;
}

interface MedicalRecordItem {
  id: string;
  type: string;
  title: string;
  content: string;
  date: Date;
  therapist: string;
  raw: Record<string, unknown>;
}

const initialFormState: RecordFormData = {
  type: 'anamnesis',
  title: '',
  content: '',
  patientId: '',
  chiefComplaint: '',
  currentHistory: '',
  pastHistory: '',
  familyHistory: '',
  physicalActivity: '',
  lifestyle: {},
  physicalExam: {},
  diagnosis: '',
  treatmentPlan: '',
  nextGoals: '',
  vitalSigns: {
    bloodPressure: '',
    heartRate: '',
    temperature: '',
    respiratoryRate: ''
  },
  specialTests: [],
  rangeOfMotion: {},
  muscleStrength: {},
  medications: '',
  allergies: '',
  newSurgeries: [],
  newGoals: [],
  newPathologies: []
};

const recordTypes = [
  { value: 'dashboard', label: 'Dashboard 360°', icon: LayoutDashboard },
  { value: 'anamnesis', label: 'Anamnese', icon: ClipboardList },
  { value: 'evolution', label: 'Evolução', icon: Activity },
  { value: 'assessment', label: 'Avaliação', icon: Stethoscope },
  { value: 'exam', label: 'Exame', icon: Microscope },
  { value: 'prescription', label: 'Prescrição', icon: FileText },
  { value: 'medical-requests', label: 'Pedidos Médicos', icon: FileStack },
  { value: 'wearables', label: 'Wearables', icon: Watch },
];

const MedicalRecord = () => {
  const [searchParams] = useSearchParams();
  const initialPatientId = searchParams.get('patientId');
  const initialAction = searchParams.get('action');
  // appointmentId captured but not used yet - reserved for future use
  // const _appointmentId = searchParams.get('appointmentId');
  const initialType = searchParams.get('type');

  const [selectedPatient, setSelectedPatient] = useState<string | null>(initialPatientId);
  const [patientSearch, setPatientSearch] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isEditing, setIsEditing] = useState(initialAction === 'new');
  // viewingRecord captured but not used yet - reserved for future use
  // const [_viewingRecord, _setViewingRecord] = useState<MedicalRecordItem | null>(null);
  const [editingRecord, setEditingRecord] = useState<MedicalRecordItem | null>(null);
  const [recordForm, setRecordForm] = useState<RecordFormData>(initialFormState);
  // showTemplateSelector captured but not used yet - reserved for future use
  // const [_showTemplateSelector, _setShowTemplateSelector] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);

  const queryClient = useQueryClient();

  const toggleComparisonSelection = (id: string) => {
    setSelectedForComparison(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Effect to handle URL parameters
  useEffect(() => {
    if (initialPatientId) {
      setSelectedPatient(initialPatientId);
    }
    if (initialAction === 'new') {
      setIsEditing(true);
      setEditingRecord(null);
      setRecordForm(initialFormState);
      setActiveTab('anamnesis'); // Default to anamnesis for new records usually
      if (initialType) {
        setActiveTab(initialType);
        setRecordForm(prev => ({ ...prev, type: initialType }));
      }
    }
  }, [initialPatientId, initialAction, initialType]);

  // Load prescriptions for selected patient
  const { prescriptions: _prescriptions, deletePrescription: _deletePrescription } = usePrescriptions(selectedPatient || undefined);

  // Load patients from Supabase
  const { data: patients = [], isLoading: patientsLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select(`
          id, 
          name:full_name, 
          observations, 
          photo_url, 
          phone, 
          email, 
          address, 
          alerts,
          is_active,
          birth_date,
          profession
        `)
        .order('full_name');

      if (error) throw error;
      return data.map(p => ({
        id: p.id,
        name: p.name,
        condition: p.observations || 'Sem observações',
        photoUrl: p.photo_url,
        phone: p.phone,
        email: p.email,
        address: p.address,
        alerts: p.alerts,
        isActive: p.is_active,
        birthDate: p.birth_date,
        profession: p.profession,
        // Calc age
        age: p.birth_date ? new Date().getFullYear() - new Date(p.birth_date).getFullYear() : 'N/A'
      }));
    }
  });

  // Load appointments for dashboard
  const { data: appointments = [] } = useQuery({
    queryKey: ['patient-appointments', selectedPatient],
    enabled: !!selectedPatient,
    queryFn: async () => {
      const { data } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', selectedPatient)
        .gte('date', new Date().toISOString())
        .order('date', { ascending: true })
        .limit(5);
      return data || [];
    }
  });

  // Load medical records for selected patient
  const { data: medicalRecords = [], isLoading: recordsLoading } = useQuery({
    queryKey: ['medical-records', selectedPatient],
    queryFn: async () => {
      if (!selectedPatient) return [];
      const { data, error } = await supabase
        .from('medical_records')
        .select(`
                  *,
                  profiles:created_by (full_name),
                  surgeries(*),
                  goals(*),
                   pathologies(*)
              `)
        .eq('patient_id', selectedPatient)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return ((data as any[]) || []).map((record: {
        id: string;
        record_type?: string;
        title?: string;
        chief_complaint?: string;
        medical_history?: string;
        diagnosis?: string;
        created_at: string;
        profiles?: { full_name?: string };
        surgeries?: unknown[];
        goals?: unknown[];
        pathologies?: unknown[];
      }) => ({
        id: record.id,
        type: record.record_type || 'anamnesis',
        title: record.title || 'Registro Sem Título',
        content: record.chief_complaint || record.medical_history || record.diagnosis || '',
        date: new Date(record.created_at),
        therapist: record.profiles?.full_name || 'Desconhecido',
        raw: record,
        surgeries: record.surgeries,
        goals: record.goals,
        pathologies: record.pathologies
      }));
    },
    enabled: !!selectedPatient
  });

  // Aggregate Data for Dashboard
  const { aggregatedSurgeries, aggregatedGoals, aggregatedPathologies } = useMemo(() => {
    const surgeries = medicalRecords.flatMap(r => r.surgeries || []);
    // Filter pending goals
    const goals = medicalRecords
      .flatMap(r => r.goals || [])
      .filter((g: any) => g.status !== 'achieved' && g.status !== 'abandoned');

    const pathologies = medicalRecords
      .flatMap(r => r.pathologies || [])
      .filter((p: any) => p.status === 'active');

    return {
      aggregatedSurgeries: surgeries,
      aggregatedGoals: goals,
      aggregatedPathologies: pathologies
    };
  }, [medicalRecords]);

  // Load evaluation templates
  const { data: _templates = [], isLoading: _templatesLoading } = useQuery({
    queryKey: ['evaluation-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evaluation_templates')
        .select('*')
        .eq('is_active', true)
        .order('title');

      if (error) throw error;
      return data;
    }
  });

  // handleSelectTemplate captured but not used yet - reserved for future use
  // const _handleSelectTemplate = (template: {
  //   id: string;
  //   title: string;
  //   content: {
  //     physical_exam?: Record<string, unknown>;
  //     diagnosis?: string;
  //     treatment_plan?: {
  //       evolution?: string;
  //       plan?: string;
  //     };
  //     vital_signs?: Record<string, unknown>;
  //   };
  // }) => {
  //   const content = template.content;
  //   setRecordForm(prev => ({
  //     ...prev,
  //     type: 'assessment',
  //     title: `${template.title} - ${format(new Date(), 'dd/MM/yyyy')}`,
  //     // Map template fields to form
  //     content: content.treatment_plan?.evolution || '',
  //     physicalExam: content.physical_exam || {},
  //     diagnosis: content.diagnosis || '',
  //     treatmentPlan: content.treatment_plan?.plan || '',
  //     vitalSigns: {
  //       ...prev.vitalSigns,
  //       ...content.vital_signs
  //     }
  //   }));
  //   setShowTemplateSelector(false);
  // };

  const saveRecordMutation = useMutation({
    mutationFn: async (data: RecordFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Build treatment_plan based on record type
      let treatmentPlanData = null;
      if (data.type === 'evolution') {
        treatmentPlanData = { evolution: data.content, next_goals: data.nextGoals };
      } else if (data.type === 'assessment') {
        treatmentPlanData = { plan: data.treatmentPlan };
      }

      // Build physical_exam based on record type
      // Ensure physicalExam is an object for JSONB
      let physicalExamData = data.physicalExam;
      if (data.type === 'assessment') {
        // Merge separate fields into physicalExam object if not already done by form
        physicalExamData = {
          ...physicalExamData,
          inspection: data.physicalExam?.inspection || null, // Ensure these exist on data.physicalExam if form updates them directly
          palpation: data.physicalExam?.palpation || null,
          specialTests: data.specialTests,
          rangeOfMotion: data.rangeOfMotion,
          muscleStrength: data.muscleStrength
        };
      }

      // Only include vital signs if at least one is filled
      const hasVitalSigns = Object.values(data.vitalSigns).some(v => v && v.trim() !== '');

      const recordData = {
        patient_id: selectedPatient,
        created_by: user.id,
        record_type: data.type,
        title: data.title,
        chief_complaint: data.chiefComplaint || null,
        current_history: data.currentHistory || null,
        past_history: data.pastHistory || null,
        family_history: data.familyHistory || null,
        physical_activity: data.physicalActivity || null,
        lifestyle: data.lifestyle || null,
        vital_signs: hasVitalSigns ? data.vitalSigns : null,
        treatment_plan: treatmentPlanData,
        physical_exam: physicalExamData,
        diagnosis: data.diagnosis || null,
        medications: data.medications || null,
        allergies: data.allergies || null,
      };

      let recordId = editingRecord?.id;

      if (editingRecord?.id) {
        // Updating existing record
        const { error } = await supabase
          .from('medical_records')
          .update(recordData)
          .eq('id', editingRecord.id);
        if (error) throw error;
      } else {
        // Creating new record
        const { data: newRecord, error } = await supabase
          .from('medical_records')
          .insert(recordData)
          .select()
          .single();
        if (error) throw error;
        recordId = newRecord.id;
      }

      // Handle Surgeries, Goals, and Pathologies using helpers
      if (recordId) {
        if (data.newSurgeries && data.newSurgeries.length > 0) {
          await saveSurgeries(supabase, recordId, data.newSurgeries);
        }
        if (data.newGoals && data.newGoals.length > 0) {
          await saveGoals(supabase, recordId, data.newGoals);
        }
        if (data.newPathologies && data.newPathologies.length > 0) {
          await savePathologies(supabase, recordId, data.newPathologies);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-records', selectedPatient] });
      toast.success('Registro salvo com sucesso!');
      setIsEditing(false);
      setEditingRecord(null);
      setRecordForm(initialFormState);
      setActiveTab('dashboard');
    },
    onError: (error: Error) => {
      console.error('Erro ao salvar registro:', error);
      toast.error(`Erro ao salvar registro: ${error.message}`);
    }
  });

  // Filter patients by search term
  const filteredPatients = useMemo(() => {
    if (!patientSearch.trim()) return patients;
    const searchLower = patientSearch.toLowerCase();
    return patients.filter(p =>
      p.name.toLowerCase().includes(searchLower)
    );
  }, [patients, patientSearch]);

  const handleSaveRecord = () => {
    if (!selectedPatient) {
      toast.error('Selecione um paciente.');
      return;
    }
    // Set default title if empty
    let titleToSave = recordForm.title;
    if (!titleToSave) {
      const typeLabel = recordTypes.find(t => t.value === recordForm.type)?.label;
      titleToSave = `${typeLabel} - ${format(new Date(), 'dd/MM/yyyy')}`;
    }

    saveRecordMutation.mutate({
      ...recordForm,
      title: titleToSave
    });
  };

  const handleViewRecord = (record: MedicalRecordItem) => {
    setViewingRecord(record);
  };

  const handleDashboardAction = (action: string) => {
    if (action === 'anamnesis') setActiveTab('anamnesis');
    if (action === 'goals') setActiveTab('assessment'); // Assuming goals management is here or separate
    // Add logic for other actions
  };

  const handleEditRecord = (record: MedicalRecordItem) => {
    setEditingRecord(record);
    setIsEditing(true);

    // Populate form
    const raw = record.raw;
    const physExam = raw.physical_exam || {};

    setRecordForm({
      ...initialFormState,
      type: raw.record_type || 'anamnesis',
      title: raw.title || record.title,
      chiefComplaint: raw.chief_complaint || '',
      currentHistory: raw.current_history || '',
      pastHistory: raw.past_history || '',
      familyHistory: raw.family_history || '',
      physicalActivity: raw.physical_activity || '',
      lifestyle: raw.lifestyle || {},

      diagnosis: raw.diagnosis || '',
      vitalSigns: raw.vital_signs || initialFormState.vitalSigns,

      // Map specific content back
      content: raw.treatment_plan?.evolution || '',
      nextGoals: raw.treatment_plan?.next_goals || '',
      physicalExam: physExam,

      // Extract specific physical exam parts if they exist flattened in DB or just keep in object
      specialTests: physExam.specialTests || [],
      rangeOfMotion: physExam.rangeOfMotion || {},
      muscleStrength: physExam.muscleStrength || {},
      medications: raw.medications || '',
      allergies: raw.allergies || '',
      // Map existing surgeries/goals to form if needed/possible
      newSurgeries: record.surgeries?.map((s: any) => ({
        name: s.name,
        date: s.surgery_date,
        surgeon: s.surgeon,
        hospital: s.hospital,
        notes: s.notes
      })) || [],
      // For goals, we might want to show active ones?
      newGoals: record.goals?.map((g: any) => ({
        description: g.description,
        targetDate: g.target_date
      })) || [],
      newPathologies: record.pathologies?.map((p: any) => ({
        name: p.name,
        status: p.status,
        diagnosedAt: p.diagnosed_at
      })) || []
    });
    setActiveTab(raw.record_type || 'anamnesis');
  };

  const handleNewRecord = () => {
    setEditingRecord(null);
    setRecordForm(initialFormState);
    setIsEditing(true);
    // Determine logical default tab based on what user probably wants
    setActiveTab('anamnesis');
  }

  const handleExportPDF = (record: MedicalRecordItem) => {
    import('jspdf').then(({ jsPDF }) => {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text(record.title, 20, 20);
      doc.setFontSize(12);
      doc.text(`Tipo: ${getRecordTypeLabel(record.type)}`, 20, 35);
      doc.text(`Data: ${format(record.date, 'dd/MM/yyyy', { locale: ptBR })}`, 20, 45);
      doc.text(`Profissional: ${record.therapist}`, 20, 55);
      doc.setFontSize(10);
      const contentLines = doc.splitTextToSize(record.content || 'Sem conteúdo', 170);
      doc.text(contentLines, 20, 70);
      doc.save(`registro-${record.id}.pdf`);
      toast.success('PDF exportado com sucesso!');
    }).catch(() => {
      toast.error('Erro ao exportar PDF');
    });
  };

  const getRecordIcon = (type: string) => {
    const recordType = recordTypes.find(t => t.value === type);
    if (recordType) {
      const IconComponent = recordType.icon;
      return <IconComponent className="w-4 h-4" />;
    }
    return <FileText className="w-4 h-4" />;
  };

  const getRecordTypeLabel = (type: string) => {
    const recordType = recordTypes.find(t => t.value === type);
    return recordType?.label || type;
  };

  const currentPatientData = patients.find(p => p.id === selectedPatient);

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Prontuário Eletrônico (PEP)
            </h1>
            <p className="text-muted-foreground">
              Dashboard 360°, histórico clínico e evoluções
            </p>
          </div>
          <div className="flex gap-3">
            <Dialog open={showTemplateManager} onOpenChange={setShowTemplateManager}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="hidden sm:flex">
                  <Settings className="w-4 h-4 mr-2" />
                  Templates
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <EvaluationTemplateManager />
              </DialogContent>
            </Dialog>
            <Button
              className="bg-gradient-primary hover:bg-gradient-primary/90 shadow-medical"
              onClick={handleNewRecord}
              disabled={!selectedPatient}
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Registro
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Patient Selection Sidebar */}
          <Card className="lg:col-span-1 border-primary/10 h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="w-4 h-4" />
                Selecione o Paciente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar..."
                  className="pl-9 h-9"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                />
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {patientsLoading ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">Carregando...</div>
                ) : filteredPatients.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    {patientSearch ? 'Nenhum encontrado' : 'Lista vazia'}
                  </div>
                ) : (
                  filteredPatients.map((patient) => (
                    <div
                      key={patient.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${selectedPatient === patient.id
                        ? 'bg-primary/10 border-primary/20 ring-1 ring-primary/20'
                        : 'hover:bg-muted/50 border-transparent bg-card shadow-sm'
                        }`}
                      onClick={() => {
                        setSelectedPatient(patient.id);
                        setIsEditing(false);
                        setEditingRecord(null);
                        setRecordForm(initialFormState);
                        setActiveTab('dashboard'); // Switch to dashboard on select
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                          {PatientHelpers.getName(patient).substring(0, 2).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-medium text-sm truncate">{PatientHelpers.getName(patient)}</p>
                          <p className="text-xs text-muted-foreground truncate">{patient.condition}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {selectedPatient && currentPatientData ? (

              isEditing ? (
                /* New/Edit Record Form */
                <Card className="border-primary/10 shadow-md">
                  <CardHeader>
                    <CardTitle>{editingRecord ? 'Editar Registro' : 'Novo Registro Médico'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-6">
                      <Label>Título do Registro</Label>
                      <Input
                        placeholder="Ex: Evolução Semanal"
                        value={recordForm.title}
                        onChange={(e) => setRecordForm({ ...recordForm, title: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <Tabs value={activeTab} onValueChange={(val) => {
                      setActiveTab(val);
                      setRecordForm({ ...recordForm, type: val });
                    }} className="space-y-6">
                      <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7 h-auto p-1 bg-muted/50">
                        {recordTypes.filter(t => t.value !== 'dashboard').map((type) => {
                          const IconComponent = type.icon;
                          return (
                            <TabsTrigger key={type.value} value={type.value} className="flex flex-col items-center gap-1 py-2 h-auto text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                              <IconComponent className="w-4 h-4" />
                              <span className="hidden sm:inline">{type.label}</span>
                            </TabsTrigger>
                          );
                        })}
                      </TabsList>

                      <TabsContent value="anamnesis" className="space-y-6 animate-in fade-in cursor-default">
                        <AnamnesisForm
                          data={recordForm}
                          onChange={(newData) => setRecordForm({ ...recordForm, ...newData })}
                        />

                        {/* Keep Vital Signs here or move to common Sidebar? keeping here for now as part of anamnesis/exam flow */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Sinais Vitais</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div className="space-y-2">
                                <Label>PA (mmHg)</Label>
                                <Input value={recordForm.vitalSigns.bloodPressure} onChange={e => setRecordForm({ ...recordForm, vitalSigns: { ...recordForm.vitalSigns, bloodPressure: e.target.value } })} placeholder="120/80" />
                              </div>
                              <div className="space-y-2">
                                <Label>FC (bpm)</Label>
                                <Input value={recordForm.vitalSigns.heartRate} onChange={e => setRecordForm({ ...recordForm, vitalSigns: { ...recordForm.vitalSigns, heartRate: e.target.value } })} placeholder="75" />
                              </div>
                              <div className="space-y-2">
                                <Label>Temp (°C)</Label>
                                <Input value={recordForm.vitalSigns.temperature} onChange={e => setRecordForm({ ...recordForm, vitalSigns: { ...recordForm.vitalSigns, temperature: e.target.value } })} placeholder="36.5" />
                              </div>
                              <div className="space-y-2">
                                <Label>FR (ipm)</Label>
                                <Input value={recordForm.vitalSigns.respiratoryRate} onChange={e => setRecordForm({ ...recordForm, vitalSigns: { ...recordForm.vitalSigns, respiratoryRate: e.target.value } })} placeholder="16" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      <TabsContent value="evolution" className="space-y-6 animate-in fade-in">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Evolução do Tratamento</Label>
                            <Textarea
                              placeholder="Descreva a evolução do paciente..."
                              value={recordForm.content}
                              onChange={(e) => setRecordForm({ ...recordForm, content: e.target.value })}
                              rows={6}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Próximos Objetivos</Label>
                            <Textarea
                              placeholder="Objetivos para as próximas sessões..."
                              value={recordForm.nextGoals}
                              onChange={(e) => setRecordForm({ ...recordForm, nextGoals: e.target.value })}
                              rows={3}
                            />
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="assessment" className="space-y-6 animate-in fade-in">
                        <PhysicalExamForm
                          data={recordForm}
                          onChange={(newData) => setRecordForm({ ...recordForm, ...newData })}
                        />
                        <div className="space-y-2">
                          <Label>Diagnóstico Fisioterapêutico</Label>
                          <Input
                            placeholder="Diagnóstico principal"
                            value={recordForm.diagnosis}
                            onChange={(e) => setRecordForm({ ...recordForm, diagnosis: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Plano de Tratamento</Label>
                          <Textarea
                            placeholder="Plano de tratamento proposto..."
                            value={recordForm.treatmentPlan}
                            onChange={(e) => setRecordForm({ ...recordForm, treatmentPlan: e.target.value })}
                            rows={4}
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="exam" className="space-y-6">
                        <PatientExamsTab patientId={selectedPatient} />
                      </TabsContent>

                      <TabsContent value="prescription" className="space-y-6">
                        <div className="p-8 text-center border rounded-lg border-dashed">
                          <p className="text-muted-foreground">Utilize o módulo de Prescrições para gerenciar receitas e exames.</p>
                        </div>
                      </TabsContent>

                      <TabsContent value="wearables" className="space-y-6">
                        <WearablesData patientId={selectedPatient} />
                      </TabsContent>

                      <TabsContent value="medical-requests" className="space-y-6">
                        <MedicalRequestsTab patientId={selectedPatient} />
                      </TabsContent>
                    </Tabs>

                    <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                      <Button
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleSaveRecord}
                        className="bg-primary hover:bg-primary/90"
                        disabled={saveRecordMutation.isPending}
                      >
                        {saveRecordMutation.isPending ? 'Salvando...' : 'Salvar Registro'}
                        <Save className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                /* Dashboard & Records View */
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                  <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                    <TabsTrigger value="dashboard">Dashboard 360°</TabsTrigger>
                    <TabsTrigger value="history">Histórico Clínico</TabsTrigger>
                  </TabsList>

                  <TabsContent value="dashboard" className="animate-in slide-in-from-left-2 duration-300">
                    <PatientDashboard360
                      patient={currentPatientData}
                      appointments={appointments}
                      activeGoals={aggregatedGoals}
                      activePathologies={aggregatedPathologies}
                      surgeries={aggregatedSurgeries}
                      onAction={handleDashboardAction}
                    />
                  </TabsContent>

                  <TabsContent value="history" className="animate-in slide-in-from-right-2 duration-300">
                    <Card className="border-primary/10">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Histórico de Registros</CardTitle>
                        {selectedForComparison.length >= 2 && !isComparing && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setIsComparing(true)}
                            className="bg-primary/10 text-primary hover:bg-primary/20"
                          >
                            Comparar ({selectedForComparison.length})
                          </Button>
                        )}
                      </CardHeader>
                      <CardContent>
                        {isComparing ? (
                          <AssessmentComparison
                            records={medicalRecords.filter((r: MedicalRecordItem) => selectedForComparison.includes(r.id))}
                            onClose={() => {
                              setIsComparing(false);
                              setSelectedForComparison([]);
                            }}
                          />
                        ) : recordsLoading ? (
                          <div className="text-center py-4">Carregando registros...</div>
                        ) : medicalRecords.length === 0 ? (
                          <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
                            <ClipboardList className="w-12 h-12 mb-3 text-muted-foreground/50" />
                            <p>Nenhum registro encontrado.</p>
                            <Button variant="link" onClick={handleNewRecord}>Criar primeiro registro</Button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {medicalRecords.map((record: MedicalRecordItem) => (
                              <div
                                key={record.id}
                                className="p-4 border rounded-lg hover:bg-muted/50 transition-colors bg-card"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    {record.type === 'assessment' && (
                                      <div className="flex items-center h-full">
                                        <input
                                          type="checkbox"
                                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                          checked={selectedForComparison.includes(record.id)}
                                          onChange={() => toggleComparisonSelection(record.id)}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </div>
                                    )}
                                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                                      {getRecordIcon(record.type)}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h3 className="font-medium">{record.title}</h3>
                                        <Badge variant="outline" className="text-xs">
                                          {getRecordTypeLabel(record.type)}
                                        </Badge>
                                      </div>
                                      <p className="text-sm text-muted-foreground">
                                        {record.therapist} • {format(record.date, 'dd/MM/yyyy', { locale: ptBR })}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => handleViewRecord(record)}>
                                      <Eye className="w-4 h-4 mr-2" />
                                      Ver
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleEditRecord(record)}>
                                      <Edit className="w-4 h-4 mr-2" />
                                      Editar
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleExportPDF(record)}>
                                      <Download className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                                <p className="text-sm text-muted-foreground mt-2 line-clamp-2 pl-[52px]">
                                  {record.content || 'Sem conteúdo descritivo.'}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              )
            ) : (
              /* No Patient Selected */
              <Card className="h-[400px] flex items-center justify-center border-dashed border-2">
                <CardContent className="text-center">
                  <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-6">
                    <User className="w-10 h-10 text-primary/40" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-foreground">Selecione um Paciente</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto">
                    Escolha um paciente na lista ao lado para acessar o Prontuário Eletrônico, Dashboard 360° e histórico clínico.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default MedicalRecord;