import React, { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

import { useData } from '@/hooks/useData';
import { useSOAPRecords } from '@/hooks/useSOAPRecords';
import { useToast } from '@/hooks/use-toast';
import { SOAPWizard } from '@/components/soap/SOAPWizard';
import { 
  FileText, 
  Upload, 
  Search, 
  Plus, 
  Calendar,
  User,
  Activity,
  Stethoscope,
  AlertCircle,
  Download,
  Eye,
  Edit2,
  PenTool,
  Shield,
  BarChart3
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TreatmentSessionModal } from '@/components/modals/TreatmentSessionModal';

export function MedicalRecord() {
  const { patients, medicalRecords, addMedicalRecord, treatmentSessions } = useData();
  const { getRecordsByPatient, exportToPDF } = useSOAPRecords();
  const { toast } = useToast();
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [recordType, setRecordType] = useState<string>('all');
  const [isNewRecordOpen, setIsNewRecordOpen] = useState(false);
  const [isSOAPWizardOpen, setIsSOAPWizardOpen] = useState(false);
  const [editingSOAPRecord, setEditingSOAPRecord] = useState<string | undefined>();
  const [patientSOAPRecords, setPatientSOAPRecords] = useState<{
    id: string;
    date: string;
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    professional_id: string;
    session_type?: string;
  }[]>([]);

  const [newRecord, setNewRecord] = useState({
    type: 'Evolução' as const,
    title: '',
    content: '',
    patient_id: ''
  });

  const loadPatientSOAPRecords = useCallback(async () => {
    if (!selectedPatient || selectedPatient === 'all') return;
    
    try {
      const records = await getRecordsByPatient(selectedPatient);
      setPatientSOAPRecords(records);
    } catch (error) {
      console.error('Error loading SOAP records:', error);
    }
  }, [selectedPatient, getRecordsByPatient]);

  // Load SOAP records for selected patient
  useEffect(() => {
    if (selectedPatient && selectedPatient !== 'all') {
      loadPatientSOAPRecords();
    } else {
      setPatientSOAPRecords([]);
    }
  }, [selectedPatient, loadPatientSOAPRecords]);

  const filteredRecords = medicalRecords.filter(record => {
    const matchesPatient = !selectedPatient || selectedPatient === 'all' || record.patient_id === selectedPatient;
    const matchesSearch = !searchTerm || 
      record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = recordType === 'all' || record.type === recordType;
    
    return matchesPatient && matchesSearch && matchesType;
  });

  const handleCreateRecord = async () => {
    if (!selectedPatient || !newRecord.title || !newRecord.content) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    try {
      await addMedicalRecord({
        patient_id: selectedPatient,
        type: newRecord.type,
        title: newRecord.title,
        content: newRecord.content
      });

      toast({
        title: "Sucesso",
        description: "Registro médico criado com sucesso!",
      });

      setNewRecord({ type: 'Evolução', title: '', content: '', patient_id: '' });
      setIsNewRecordOpen(false);
    } catch (error) {
      console.error('Error creating medical record:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar registro médico.",
        variant: "destructive",
      });
    }
  };

  const getTypeColor = (type: string) => {
    const colors = {
      'Anamnese': 'bg-blue-100 text-blue-800',
      'Evolução': 'bg-green-100 text-green-800',
      'Avaliação': 'bg-purple-100 text-purple-800',
      'Exame': 'bg-orange-100 text-orange-800',
      'Receituário': 'bg-red-100 text-red-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Prontuário Eletrônico</h1>
            <p className="text-muted-foreground">Histórico médico e evolução dos pacientes</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setIsSOAPWizardOpen(true)}
              className="bg-primary hover:bg-primary/90"
              disabled={!selectedPatient || selectedPatient === 'all'}
            >
              <Stethoscope className="w-4 h-4 mr-2" />
              Novo SOAP
            </Button>
            
            <Dialog open={isNewRecordOpen} onOpenChange={setIsNewRecordOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Registro Geral
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Novo Registro Médico</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Paciente</label>
                      <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o paciente" />
                        </SelectTrigger>
                        <SelectContent>
                          {patients.map((patient) => (
                            <SelectItem key={patient.id} value={patient.id}>
                              {patient.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Tipo</label>
                      <Select value={newRecord.type} onValueChange={(value: string) => setNewRecord(prev => ({ ...prev, type: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Anamnese">Anamnese</SelectItem>
                          <SelectItem value="Evolução">Evolução</SelectItem>
                          <SelectItem value="Avaliação">Avaliação</SelectItem>
                          <SelectItem value="Exame">Exame</SelectItem>
                          <SelectItem value="Receituário">Receituário</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Título</label>
                    <Input 
                      value={newRecord.title}
                      onChange={(e) => setNewRecord(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Ex: Avaliação inicial - Lombalgia"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Conteúdo</label>
                    <Textarea 
                      value={newRecord.content}
                      onChange={(e) => setNewRecord(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="Descreva os achados, observações e condutas..."
                      rows={6}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsNewRecordOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateRecord}>
                      Salvar Registro
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <TreatmentSessionModal
              trigger={
                <Button variant="outline">
                  <Activity className="w-4 h-4 mr-2" />
                  Nova Sessão
                </Button>
              }
              patientId={selectedPatient}
            />
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Buscar registros..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Todos os pacientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os pacientes</SelectItem>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={recordType} onValueChange={setRecordType}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="Anamnese">Anamnese</SelectItem>
                  <SelectItem value="Evolução">Evolução</SelectItem>
                  <SelectItem value="Avaliação">Avaliação</SelectItem>
                  <SelectItem value="Exame">Exame</SelectItem>
                  <SelectItem value="Receituário">Receituário</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="soap" className="space-y-4">
          <TabsList>
            <TabsTrigger value="soap">Registros SOAP</TabsTrigger>
            <TabsTrigger value="records">Registros Médicos</TabsTrigger>
            <TabsTrigger value="sessions">Sessões de Tratamento</TabsTrigger>
            <TabsTrigger value="attachments">Anexos</TabsTrigger>
          </TabsList>

          {/* SOAP Records Tab */}
          <TabsContent value="soap" className="space-y-4">
            {patientSOAPRecords.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Stethoscope className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Nenhum registro SOAP encontrado</h3>
                  <p className="text-muted-foreground mb-4">
                    {selectedPatient && selectedPatient !== 'all'
                      ? 'Este paciente ainda não possui registros SOAP. Crie um novo registro para começar.'
                      : 'Selecione um paciente para visualizar os registros SOAP.'
                    }
                  </p>
                  {selectedPatient && selectedPatient !== 'all' && (
                    <Button onClick={() => setIsSOAPWizardOpen(true)}>
                      <Stethoscope className="w-4 h-4 mr-2" />
                      Criar Primeiro Registro SOAP
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {patientSOAPRecords.map((record) => (
                  <Card key={record.id} className="hover:shadow-md transition-shadow border-l-4 border-l-primary">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-primary/10 text-primary">
                              SOAP #{record.session_number}
                            </Badge>
                            {record.signature_hash && (
                              <Badge className="bg-green-100 text-green-800">
                                <Shield className="w-3 h-3 mr-1" />
                                Assinado
                              </Badge>
                            )}
                          </div>
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Stethoscope className="w-4 h-4" />
                              Registro SOAP - Sessão {record.session_number}
                            </CardTitle>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                {record.patient?.name}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {format(new Date(record.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                              </span>
                              {record.signed_at && (
                                <span className="flex items-center gap-1 text-green-600">
                                  <PenTool className="w-4 h-4" />
                                  Assinado em {format(new Date(record.signed_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setEditingSOAPRecord(record.id);
                              setIsSOAPWizardOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setEditingSOAPRecord(record.id);
                              setIsSOAPWizardOpen(true);
                            }}
                            disabled={!!record.signature_hash}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => exportToPDF(record.id)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <h5 className="font-medium text-sm text-muted-foreground mb-1">Subjetivo</h5>
                          <p className="text-sm">
                            {record.subjective ? 
                              (record.subjective.length > 100 ? `${record.subjective.substring(0, 100)}...` : record.subjective)
                              : 'Não preenchido'
                            }
                          </p>
                        </div>
                        <div>
                          <h5 className="font-medium text-sm text-muted-foreground mb-1">Objetivo</h5>
                          <p className="text-sm">
                            {record.objective ? 
                              'Exame físico registrado'
                              : 'Não preenchido'
                            }
                          </p>
                        </div>
                        <div>
                          <h5 className="font-medium text-sm text-muted-foreground mb-1">Avaliação</h5>
                          <p className="text-sm">
                            {record.assessment ? 
                              (record.assessment.length > 100 ? `${record.assessment.substring(0, 100)}...` : record.assessment)
                              : 'Não preenchido'
                            }
                          </p>
                        </div>
                        <div>
                          <h5 className="font-medium text-sm text-muted-foreground mb-1">Plano</h5>
                          <p className="text-sm">
                            {record.plan ? 
                              'Plano terapêutico definido'
                              : 'Não preenchido'
                            }
                          </p>
                        </div>
                      </div>
                      
                      {/* Progress Indicator */}
                      {record.session_number > 1 && (
                        <div className="mt-4 pt-4 border-t">
                          <div className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              Sessão {record.session_number} - Evolução do tratamento
                            </span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="records" className="space-y-4">
            {filteredRecords.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Nenhum registro encontrado</h3>
                  <p className="text-muted-foreground mb-4">
                    {selectedPatient ? 'Nenhum registro médico encontrado para este paciente.' : 'Selecione um paciente para ver seus registros médicos.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredRecords.map((record) => {
                  const patient = patients.find(p => p.id === record.patient_id);
                  return (
                    <Card key={record.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge className={getTypeColor(record.type)}>
                              {record.type}
                            </Badge>
                            <div>
                              <CardTitle className="text-lg">{record.title}</CardTitle>
                              <CardDescription className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                {patient?.name}
                                <Calendar className="w-4 h-4 ml-2" />
                                {format(new Date(record.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                                <span className="text-xs text-muted-foreground ml-2">
                                  por {record.created_by}
                                </span>
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          {record.content.length > 200 
                            ? `${record.content.substring(0, 200)}...` 
                            : record.content}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sessions" className="space-y-4">
            {treatmentSessions.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma sessão registrada</h3>
                  <p className="text-muted-foreground">
                    As sessões de tratamento aparecerão aqui conforme forem registradas.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {treatmentSessions.map((session) => {
                  const patient = patients.find(p => p.id === session.patient_id);
                  return (
                    <Card key={session.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">Sessão de Tratamento</CardTitle>
                            <CardDescription className="flex items-center gap-4">
                              <span className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                {patient?.name}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {format(new Date(session.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                              </span>
                              <span className="flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" />
                                Dor: {session.pain_level}/10
                              </span>
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">Observações</h4>
                          <p className="text-sm text-muted-foreground">{session.observations}</p>
                        </div>
                        {session.evolution_notes && (
                          <div>
                            <h4 className="font-medium mb-2">Evolução</h4>
                            <p className="text-sm text-muted-foreground">{session.evolution_notes}</p>
                          </div>
                        )}
                        {session.next_session_goals && (
                          <div>
                            <h4 className="font-medium mb-2">Objetivos Próxima Sessão</h4>
                            <p className="text-sm text-muted-foreground">{session.next_session_goals}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="attachments" className="space-y-4">
            <Card>
              <CardContent className="p-8 text-center">
                <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Anexos</h3>
                <p className="text-muted-foreground mb-4">
                  Faça upload de exames, imagens e documentos relacionados aos pacientes.
                </p>
                <Button variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  Fazer Upload
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* SOAP Wizard Modal */}
        <SOAPWizard
          open={isSOAPWizardOpen}
          onOpenChange={(open) => {
            setIsSOAPWizardOpen(open);
            if (!open) {
              setEditingSOAPRecord(undefined);
            }
          }}
          patientId={selectedPatient}
          existingRecordId={editingSOAPRecord}
          onSave={() => {
            loadPatientSOAPRecords();
            setIsSOAPWizardOpen(false);
            setEditingSOAPRecord(undefined);
          }}
        />
      </div>
    </MainLayout>
  );
}