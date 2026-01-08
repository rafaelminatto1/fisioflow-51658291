import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  FileText,
  Plus,
  Search,
  Filter,
  User,
  Calendar,
  Stethoscope,
  ClipboardList,
  Heart,
  Activity,
  Save,
  Edit,
  Eye,
  Download,
  X,
  Watch,
  Share2,
  FileStack,
  Microscope
} from 'lucide-react';
import { MedicalRequestsTab } from '@/components/patient/MedicalRequestsTab';
import { PatientExamsTab } from '@/components/patient/PatientExamsTab';
import { WearablesData } from '@/components/patient/WearablesData';
import { NewPrescriptionModal } from '@/components/prescriptions/NewPrescriptionModal';
import { usePrescriptions } from '@/hooks/usePrescriptions';
import { generatePrescriptionPDF } from '@/utils/pdfGenerator';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  FileText,
  Plus,
  Search,
  Filter,
  User,
  Calendar,
  Stethoscope,
  ClipboardList,
  Heart,
  Activity,
  Save,
  Edit,
  Eye,
  Download,
  X,
  Watch,
  Share2,
  FileStack,
  Microscope
} from 'lucide-react';
import { MedicalRequestsTab } from '@/components/patient/MedicalRequestsTab';
import { PatientExamsTab } from '@/components/patient/PatientExamsTab';
import { WearablesData } from '@/components/patient/WearablesData';
import { NewPrescriptionModal } from '@/components/prescriptions/NewPrescriptionModal';
import { usePrescriptions } from '@/hooks/usePrescriptions';
import { generatePrescriptionPDF } from '@/utils/pdfGenerator';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';

const MedicalRecord = () => {
  const [searchParams] = useSearchParams();
  const initialPatientId = searchParams.get('patientId');
  const initialAction = searchParams.get('action');

  const [selectedPatient, setSelectedPatient] = useState<string | null>(initialPatientId);
  const [activeTab, setActiveTab] = useState('anamnesis');
  const [isEditing, setIsEditing] = useState(initialAction === 'new');
  const [viewingRecord, setViewingRecord] = useState<any | null>(null);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (initialPatientId) {
      setSelectedPatient(initialPatientId);
    }
    if (initialAction === 'new') {
      setIsEditing(true);
      // Determine tab based on some logic if needed, or default to anamnesis
    }
  }, [initialPatientId, initialAction]);

  // Load prescriptions for selected patient
  const { prescriptions, deletePrescription } = usePrescriptions(selectedPatient || undefined);

  // Load patients from Supabase
  const { data: patients = [], isLoading: patientsLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('id, name, observations')
        .order('name');

      if (error) throw error;
      return data.map(p => ({
        id: p.id,
        name: p.name,
        condition: p.observations || 'Sem observações'
      }));
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
                  profiles:created_by (full_name)
              `)
        .eq('patient_id', selectedPatient)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(record => ({
        id: record.id,
        type: record.record_type || 'anamnesis',
        title: record.title || 'Registro Sem Título',
        content: record.chief_complaint || record.medical_history || record.diagnosis || '', // Fallback content content
        date: new Date(record.created_at),
        therapist: record.profiles?.full_name || 'Desconhecido',
        raw: record // Keep raw data for editing
      }));
    },
    enabled: !!selectedPatient
  });

  const saveRecordMutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario não autenticado');

      const recordData = {
        patient_id: selectedPatient,
        created_by: user.id,
        record_type: data.type,
        title: data.title,
        // Map form fields to DB columns
        chief_complaint: data.chiefComplaint,
        current_history: data.currentHistory,
        vital_signs: data.vitalSigns,

        // Evolution fields
        treatment_plan: data.type === 'evolution' ? { evolution: data.content, next_goals: data.nextGoals } : null,

        // Assessment fields
        physical_exam: data.type === 'assessment' ? { exam: data.physicalExam } : null,
        diagnosis: data.diagnosis,

      };

      if (editingRecord?.id && !isEditingNew) { // Updating existing
        const { error } = await supabase
          .from('medical_records')
          .update(recordData)
          .eq('id', editingRecord.id);
        if (error) throw error;
      } else { // Creating new
        const { error } = await supabase
          .from('medical_records')
          .insert(recordData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-records', selectedPatient] });
      toast.success('Registro salvo com sucesso!');
      setIsEditing(false);
      setEditingRecord(null);
      setRecordForm(initialFormState);
    },
    onError: (error) => {
      console.error(error);
      toast.error('Erro ao salvar registro.');
    }
  });

  const recordTypes = [
    { value: 'anamnesis', label: 'Anamnese', icon: ClipboardList },
    { value: 'evolution', label: 'Evolução', icon: Activity },
    { value: 'assessment', label: 'Avaliação', icon: Stethoscope },
    { value: 'exam', label: 'Exame', icon: Microscope },
    { value: 'prescription', label: 'Prescrição', icon: FileText },
    { value: 'medical-requests', label: 'Pedidos Médicos', icon: FileStack },
    { value: 'wearables', label: 'Wearables', icon: Watch },
  ];

  const initialFormState = {
    type: 'anamnesis',
    title: '',
    content: '',
    patientId: '',
    chiefComplaint: '',
    currentHistory: '',
    physicalExam: '',
    diagnosis: '',
    treatmentPlan: '',
    nextGoals: '',
    vitalSigns: {
      bloodPressure: '',
      heartRate: '',
      temperature: '',
      respiratoryRate: ''
    }
  };

  const [recordForm, setRecordForm] = useState(initialFormState);

  // Flag to know if we are editing an existing record or creating a new one while "isEditing" is true.
  // We can infer this by checking if editingRecord is null. 
  const isEditingNew = !editingRecord;

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

  const handleViewRecord = (record: any) => {
    setViewingRecord(record);
  };

  const handleEditRecord = (record: any) => {
    setEditingRecord(record);
    setIsEditing(true);

    // Populate form
    const raw = record.raw;
    setRecordForm({
      ...initialFormState,
      type: raw.record_type || 'anamnesis',
      title: raw.title || record.title,
      chiefComplaint: raw.chief_complaint || '',
      currentHistory: raw.current_history || '',
      diagnosis: raw.diagnosis || '',
      vitalSigns: raw.vital_signs || initialFormState.vitalSigns,

      // Map specific content back
      content: raw.treatment_plan?.evolution || '',
      nextGoals: raw.treatment_plan?.next_goals || '',
      physicalExam: raw.physical_exam?.exam || '',
    });
    setActiveTab(raw.record_type || 'anamnesis');
  };

  const handleNewRecord = () => {
    setEditingRecord(null);
    setRecordForm(initialFormState);
    setIsEditing(true);
  }

  const handleExportPDF = (record: any) => {
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

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Prontuário Médico
            </h1>
            <p className="text-muted-foreground">
              Registros médicos e evolução dos pacientes
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="hover:bg-accent/80 border-border/50">
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
            <Button
              className="bg-gradient-primary hover:bg-gradient-primary/90 shadow-medical"
              onClick={handleNewRecord}
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Registro
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Patient Selection Sidebar */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Pacientes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar paciente..."
                  className="pl-10"
                />
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {patients.map((patient) => (
                  <div
                    key={patient.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedPatient === patient.id
                      ? 'bg-primary/10 border-primary/20'
                      : 'hover:bg-muted/50'
                      }`}
                    onClick={() => {
                      setSelectedPatient(patient.id);
                      setIsEditing(false); // Close editor when switching patient
                    }}
                  >
                    <p className="font-medium">{patient.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{patient.condition}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {selectedPatient ? (
              <>
                {/* Patient Header */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold">
                            {patients.find(p => p.id === selectedPatient)?.name}
                          </h2>
                          <p className="text-muted-foreground">
                            {patients.find(p => p.id === selectedPatient)?.condition}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-800">
                        Em Tratamento
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {isEditing ? (
                  /* New/Edit Record Form */
                  <Card>
                    <CardHeader>
                      <CardTitle>{editingRecord ? 'Editar Registro' : 'Novo Registro Médico'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4">
                        <Label>Título do Registro</Label>
                        <Input
                          placeholder="Ex: Evolução Semanal"
                          value={recordForm.title}
                          onChange={(e) => setRecordForm({ ...recordForm, title: e.target.value })}
                        />
                      </div>
                      <Tabs value={activeTab} onValueChange={(val) => {
                        setActiveTab(val);
                        setRecordForm({ ...recordForm, type: val });
                      }} className="space-y-6">
                        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7 h-auto">
                          {recordTypes.map((type) => {
                            const IconComponent = type.icon;
                            return (
                              <TabsTrigger key={type.value} value={type.value} className="flex flex-col items-center gap-1 py-2 h-auto">
                                <IconComponent className="w-4 h-4" />
                                <span className="hidden sm:inline text-xs">{type.label}</span>
                              </TabsTrigger>
                            );
                          })}
                        </TabsList>

                        <TabsContent value="anamnesis" className="space-y-6">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Queixa Principal</Label>
                              <Textarea
                                placeholder="Descreva a queixa principal do paciente..."
                                value={recordForm.chiefComplaint}
                                onChange={(e) => setRecordForm({ ...recordForm, chiefComplaint: e.target.value })}
                                rows={3}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>História da Doença Atual</Label>
                              <Textarea
                                placeholder="História detalhada da condição atual..."
                                value={recordForm.currentHistory}
                                onChange={(e) => setRecordForm({ ...recordForm, currentHistory: e.target.value })}
                                rows={4}
                              />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Pressão Arterial</Label>
                                <Input
                                  placeholder="120/80 mmHg"
                                  value={recordForm.vitalSigns.bloodPressure}
                                  onChange={(e) => setRecordForm({
                                    ...recordForm,
                                    vitalSigns: { ...recordForm.vitalSigns, bloodPressure: e.target.value }
                                  })}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Frequência Cardíaca</Label>
                                <Input
                                  placeholder="72 bpm"
                                  value={recordForm.vitalSigns.heartRate}
                                  onChange={(e) => setRecordForm({
                                    ...recordForm,
                                    vitalSigns: { ...recordForm.vitalSigns, heartRate: e.target.value }
                                  })}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Temperatura</Label>
                                <Input
                                  placeholder="36.5°C"
                                  value={recordForm.vitalSigns.temperature}
                                  onChange={(e) => setRecordForm({
                                    ...recordForm,
                                    vitalSigns: { ...recordForm.vitalSigns, temperature: e.target.value }
                                  })}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Freq. Respiratória</Label>
                                <Input
                                  placeholder="16 ipm"
                                  value={recordForm.vitalSigns.respiratoryRate}
                                  onChange={(e) => setRecordForm({
                                    ...recordForm,
                                    vitalSigns: { ...recordForm.vitalSigns, respiratoryRate: e.target.value }
                                  })}
                                />
                              </div>
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent value="evolution" className="space-y-6">
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

                        <TabsContent value="assessment" className="space-y-6">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Exame Físico</Label>
                              <Textarea
                                placeholder="Achados do exame físico..."
                                value={recordForm.physicalExam}
                                onChange={(e) => setRecordForm({ ...recordForm, physicalExam: e.target.value })}
                                rows={5}
                              />
                            </div>

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
                          </div>
                        </TabsContent>

                        <TabsContent value="exam" className="space-y-6">
                          <PatientExamsTab patientId={selectedPatient} />
                        </TabsContent>

                        <TabsContent value="prescription" className="space-y-6">
                          {/* Simplified prescription view for editing context if needed, or keeping standalone */}
                          <div className="text-muted-foreground text-sm">Gerencie prescrições na aba principal ou use o botão Nova Prescrição.</div>
                        </TabsContent>

                        <TabsContent value="wearables" className="space-y-6">
                          <WearablesData patientId={selectedPatient} />
                        </TabsContent>

                        <TabsContent value="medical-requests" className="space-y-6">
                          <MedicalRequestsTab patientId={selectedPatient} />
                        </TabsContent>
                      </Tabs>

                      <div className="flex justify-end gap-3 pt-6">
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
                  /* Medical Records List */
                  <Card>
                    <CardHeader>
                      <CardTitle>Histórico Clínico</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {recordsLoading ? (
                        <div className="text-center py-4">Carregando registros...</div>
                      ) : medicalRecords.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">Nenhum registro encontrado.</div>
                      ) : (
                        <div className="space-y-4">
                          {medicalRecords.map((record: any) => (
                            <div
                              key={record.id}
                              className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
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
                                  <Button variant="outline" size="sm" onClick={() => handleViewRecord(record)}>
                                    <Eye className="w-4 h-4 mr-2" />
                                    Ver
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => handleEditRecord(record)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Editar
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => handleExportPDF(record)}>
                                    <Download className="w-4 h-4 mr-2" />
                                    PDF
                                  </Button>
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                {record.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              /* No Patient Selected */
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Selecione um Paciente</h3>
                  <p className="text-muted-foreground">
                    Escolha um paciente na lista ao lado para visualizar ou criar registros médicos
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* View Record Dialog */}
      <Dialog open={!!viewingRecord} onOpenChange={() => setViewingRecord(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewingRecord && getRecordIcon(viewingRecord.type)}
              {viewingRecord?.title}
            </DialogTitle>
            <DialogDescription>
              {viewingRecord && (
                <span className="flex items-center gap-2 mt-2">
                  <Badge variant="outline">{getRecordTypeLabel(viewingRecord.type)}</Badge>
                  <span>•</span>
                  <span>{viewingRecord.therapist}</span>
                  <span>•</span>
                  <span>{format(viewingRecord.date, 'dd/MM/yyyy', { locale: ptBR })}</span>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm whitespace-pre-wrap">{viewingRecord?.content}</p>
          </div>
          {viewingRecord?.raw?.treatment_plan?.next_goals && (
            <div className="mt-2 text-sm">
              <strong>Próximos Objetivos:</strong>
              <p>{viewingRecord.raw.treatment_plan.next_goals}</p>
            </div>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => viewingRecord && handleExportPDF(viewingRecord)}>
              <Download className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
            <Button onClick={() => {
              if (viewingRecord) {
                handleEditRecord(viewingRecord);
                setViewingRecord(null);
              }
            }}>
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {selectedPatient && (
        <NewPrescriptionModal
          open={isPrescriptionModalOpen}
          onOpenChange={setIsPrescriptionModalOpen}
          patientId={selectedPatient}
          patientName={patients.find(p => p.id === selectedPatient)?.name || ''}
        />
      )}
    </MainLayout>
  );
};

export default MedicalRecord;