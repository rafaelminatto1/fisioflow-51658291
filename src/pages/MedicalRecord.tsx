import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const MedicalRecord = () => {
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('anamnesis');
  const [isEditing, setIsEditing] = useState(false);

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

  const recordTypes = [
    { value: 'anamnesis', label: 'Anamnese', icon: ClipboardList },
    { value: 'evolution', label: 'Evolução', icon: Activity },
    { value: 'assessment', label: 'Avaliação', icon: Stethoscope },
    { value: 'exam', label: 'Exame', icon: Heart },
    { value: 'prescription', label: 'Prescrição', icon: FileText },
  ];

  const medicalRecords = [
    {
      id: '1',
      type: 'anamnesis',
      title: 'Avaliação Inicial - Dor Lombar',
      content: 'Paciente relata dor lombar há 3 meses...',
      date: new Date('2024-01-15'),
      therapist: 'Dr. João Silva'
    },
    {
      id: '2',
      type: 'evolution',
      title: 'Evolução - 5ª sessão',
      content: 'Paciente apresenta melhora significativa...',
      date: new Date('2024-01-22'),
      therapist: 'Dr. João Silva'
    },
    {
      id: '3',
      type: 'assessment',
      title: 'Avaliação Funcional',
      content: 'Teste de flexibilidade e força...',
      date: new Date('2024-01-29'),
      therapist: 'Dr. João Silva'
    }
  ];

  const [recordForm, setRecordForm] = useState({
    type: 'anamnesis',
    title: '',
    content: '',
    patientId: '',
    chiefComplaint: '',
    currentHistory: '',
    physicalExam: '',
    diagnosis: '',
    treatmentPlan: '',
    vitalSigns: {
      bloodPressure: '',
      heartRate: '',
      temperature: '',
      respiratoryRate: ''
    }
  });

  const handleSaveRecord = () => {
    console.log('Saving record:', recordForm);
    setIsEditing(false);
    // Implement save logic here
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
              onClick={() => setIsEditing(true)}
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
              
              <div className="space-y-2">
                {patients.map((patient) => (
                  <div
                    key={patient.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedPatient === patient.id 
                        ? 'bg-primary/10 border-primary/20' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedPatient(patient.id)}
                  >
                    <p className="font-medium">{patient.name}</p>
                    <p className="text-sm text-muted-foreground">{patient.condition}</p>
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
                  /* New Record Form */
                  <Card>
                    <CardHeader>
                      <CardTitle>Novo Registro Médico</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                        <TabsList className="grid w-full grid-cols-5">
                          {recordTypes.map((type) => {
                            const IconComponent = type.icon;
                            return (
                              <TabsTrigger key={type.value} value={type.value} className="flex items-center gap-1">
                                <IconComponent className="w-4 h-4" />
                                <span className="hidden sm:inline">{type.label}</span>
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
                                onChange={(e) => setRecordForm({...recordForm, chiefComplaint: e.target.value})}
                                rows={3}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>História da Doença Atual</Label>
                              <Textarea
                                placeholder="História detalhada da condição atual..."
                                value={recordForm.currentHistory}
                                onChange={(e) => setRecordForm({...recordForm, currentHistory: e.target.value})}
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
                                    vitalSigns: {...recordForm.vitalSigns, bloodPressure: e.target.value}
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
                                    vitalSigns: {...recordForm.vitalSigns, heartRate: e.target.value}
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
                                    vitalSigns: {...recordForm.vitalSigns, temperature: e.target.value}
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
                                    vitalSigns: {...recordForm.vitalSigns, respiratoryRate: e.target.value}
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
                                onChange={(e) => setRecordForm({...recordForm, content: e.target.value})}
                                rows={6}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Próximos Objetivos</Label>
                              <Textarea
                                placeholder="Objetivos para as próximas sessões..."
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
                                onChange={(e) => setRecordForm({...recordForm, physicalExam: e.target.value})}
                                rows={5}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Diagnóstico Fisioterapêutico</Label>
                              <Input
                                placeholder="Diagnóstico principal"
                                value={recordForm.diagnosis}
                                onChange={(e) => setRecordForm({...recordForm, diagnosis: e.target.value})}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Plano de Tratamento</Label>
                              <Textarea
                                placeholder="Plano de tratamento proposto..."
                                value={recordForm.treatmentPlan}
                                onChange={(e) => setRecordForm({...recordForm, treatmentPlan: e.target.value})}
                                rows={4}
                              />
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent value="exam" className="space-y-6">
                          <div className="text-center py-12">
                            <Stethoscope className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Exames em desenvolvimento</h3>
                            <p className="text-muted-foreground">
                              O módulo de exames será implementado na próxima atualização
                            </p>
                          </div>
                        </TabsContent>

                        <TabsContent value="prescription" className="space-y-6">
                          <div className="text-center py-12">
                            <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Prescrições em desenvolvimento</h3>
                            <p className="text-muted-foreground">
                              O módulo de prescrições será implementado na próxima atualização
                            </p>
                          </div>
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
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Salvar Registro
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  /* Medical Records List */
                  <Card>
                    <CardHeader>
                      <CardTitle>Registros Médicos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {medicalRecords.map((record) => (
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
                                <Button variant="outline" size="sm">
                                  <Eye className="w-4 h-4 mr-2" />
                                  Ver
                                </Button>
                                <Button variant="outline" size="sm">
                                  <Edit className="w-4 h-4 mr-2" />
                                  Editar
                                </Button>
                                <Button variant="outline" size="sm">
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
    </MainLayout>
  );
};

export default MedicalRecord;