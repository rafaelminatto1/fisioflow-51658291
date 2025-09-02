import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, 
  Upload, 
  Search, 
  Plus, 
  Calendar,
  User,
  Activity,
  TrendingUp,
  AlertCircle,
  Download,
  Eye,
  Edit2,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Mock data for medical records
const mockMedicalRecords = [
  {
    id: '1',
    patientId: '1',
    type: 'Anamnese' as const,
    title: 'Anamnese Inicial - Lombalgia',
    content: 'Paciente relata dor lombar há 2 anos, intensidade 7/10. Dor piora com movimento, melhora com repouso. Histórico de trabalho em escritório.',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    createdBy: 'Dr. João Silva'
  },
  {
    id: '2',
    patientId: '1',
    type: 'Evolução' as const,
    title: 'Evolução - Sessão 5',
    content: 'Paciente apresenta melhora significativa. Dor reduzida para 4/10. Exercícios sendo executados corretamente.',
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date('2024-02-15'),
    createdBy: 'Dr. João Silva'
  }
];

const mockTreatmentSessions = [
  {
    id: '1',
    patientId: '1',
    appointmentId: '1',
    observations: 'Paciente cooperativo, realizou todos os exercícios propostos',
    painLevel: 4,
    evolutionNotes: 'Melhora significativa na amplitude de movimento',
    exercisesPerformed: [
      {
        exerciseId: '1',
        exerciseName: 'Agachamento Livre',
        setsCompleted: 3,
        repsCompleted: 15,
        difficulty: 'adequado' as const
      }
    ],
    nextSessionGoals: 'Aumentar carga e trabalhar estabilização',
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date('2024-02-15')
  }
];

export function MedicalRecord() {
  const { patients } = useData();
  const { toast } = useToast();
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [recordType, setRecordType] = useState<string>('all');
  const [isNewRecordOpen, setIsNewRecordOpen] = useState(false);
  const [isNewSessionOpen, setIsNewSessionOpen] = useState(false);

  const [newRecord, setNewRecord] = useState({
    type: 'Evolução' as const,
    title: '',
    content: ''
  });

  const [newSession, setNewSession] = useState({
    observations: '',
    painLevel: 5,
    evolutionNotes: '',
    nextSessionGoals: ''
  });

  const filteredRecords = mockMedicalRecords.filter(record => {
    const matchesPatient = !selectedPatient || record.patientId === selectedPatient;
    const matchesSearch = !searchTerm || 
      record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = recordType === 'all' || record.type === recordType;
    
    return matchesPatient && matchesSearch && matchesType;
  });

  const handleCreateRecord = () => {
    if (!selectedPatient || !newRecord.title || !newRecord.content) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sucesso",
      description: "Registro médico criado com sucesso!",
    });

    setNewRecord({ type: 'Evolução', title: '', content: '' });
    setIsNewRecordOpen(false);
  };

  const handleCreateSession = () => {
    if (!selectedPatient || !newSession.observations) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sucesso",
      description: "Registro de sessão criado com sucesso!",
    });

    setNewSession({
      observations: '',
      painLevel: 5,
      evolutionNotes: '',
      nextSessionGoals: ''
    });
    setIsNewSessionOpen(false);
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
            <Dialog open={isNewRecordOpen} onOpenChange={setIsNewRecordOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Registro
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
                      <Select value={newRecord.type} onValueChange={(value: any) => setNewRecord(prev => ({ ...prev, type: value }))}>
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

            <Dialog open={isNewSessionOpen} onOpenChange={setIsNewSessionOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Activity className="w-4 h-4 mr-2" />
                  Nova Sessão
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Registro de Sessão</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
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
                    <label className="text-sm font-medium">Nível de Dor (0-10)</label>
                    <Input 
                      type="number"
                      min="0"
                      max="10"
                      value={newSession.painLevel}
                      onChange={(e) => setNewSession(prev => ({ ...prev, painLevel: parseInt(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Observações da Sessão</label>
                    <Textarea 
                      value={newSession.observations}
                      onChange={(e) => setNewSession(prev => ({ ...prev, observations: e.target.value }))}
                      placeholder="Descreva como foi a sessão, exercícios realizados..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Notas de Evolução</label>
                    <Textarea 
                      value={newSession.evolutionNotes}
                      onChange={(e) => setNewSession(prev => ({ ...prev, evolutionNotes: e.target.value }))}
                      placeholder="Progresso observado, melhorias..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Objetivos para Próxima Sessão</label>
                    <Textarea 
                      value={newSession.nextSessionGoals}
                      onChange={(e) => setNewSession(prev => ({ ...prev, nextSessionGoals: e.target.value }))}
                      placeholder="Metas e focos para a próxima sessão..."
                      rows={2}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsNewSessionOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateSession}>
                      Salvar Sessão
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
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
                  <SelectItem value="">Todos os pacientes</SelectItem>
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

        <Tabs defaultValue="records" className="space-y-4">
          <TabsList>
            <TabsTrigger value="records">Registros Médicos</TabsTrigger>
            <TabsTrigger value="sessions">Sessões de Tratamento</TabsTrigger>
            <TabsTrigger value="attachments">Anexos</TabsTrigger>
          </TabsList>

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
                  const patient = patients.find(p => p.id === record.patientId);
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
                                {format(record.createdAt, 'dd/MM/yyyy', { locale: ptBR })}
                                <span className="text-xs text-muted-foreground ml-2">
                                  por {record.createdBy}
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
            {mockTreatmentSessions.length === 0 ? (
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
                {mockTreatmentSessions.map((session) => {
                  const patient = patients.find(p => p.id === session.patientId);
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
                                {format(session.createdAt, 'dd/MM/yyyy', { locale: ptBR })}
                              </span>
                              <span className="flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" />
                                Dor: {session.painLevel}/10
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
                        {session.evolutionNotes && (
                          <div>
                            <h4 className="font-medium mb-2">Evolução</h4>
                            <p className="text-sm text-muted-foreground">{session.evolutionNotes}</p>
                          </div>
                        )}
                        {session.exercisesPerformed.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2">Exercícios Realizados</h4>
                            <div className="space-y-2">
                              {session.exercisesPerformed.map((exercise, index) => (
                                <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                                  <span className="text-sm">{exercise.exerciseName}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {exercise.setsCompleted}x{exercise.repsCompleted} • {exercise.difficulty}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {session.nextSessionGoals && (
                          <div>
                            <h4 className="font-medium mb-2">Objetivos Próxima Sessão</h4>
                            <p className="text-sm text-muted-foreground">{session.nextSessionGoals}</p>
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
      </div>
    </MainLayout>
  );
}