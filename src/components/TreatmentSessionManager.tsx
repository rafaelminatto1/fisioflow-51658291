import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  Clock, 
  User, 
  FileText, 
  Plus, 
  Edit, 
  Trash2,
  CheckCircle,
  AlertCircle,
  Activity,
  Target,
  TrendingUp,
  Stethoscope,
  ClipboardList
} from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TreatmentSessionManagerProps {
  patientId: string;
}

interface TreatmentSession {
  id: string;
  patient_id: string;
  session_date: string;
  session_type: 'evaluation' | 'treatment' | 'reevaluation' | 'discharge';
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  pain_level_before: number;
  pain_level_after: number;
  exercises_performed: string[];
  notes: string;
  next_session_date?: string;
  created_at: string;
}

const TreatmentSessionManager: React.FC<TreatmentSessionManagerProps> = ({ patientId }) => {
  const { patients } = useData();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<TreatmentSession[]>([]);
  const [isNewSessionOpen, setIsNewSessionOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<TreatmentSession | null>(null);
  const [isEditSessionOpen, setIsEditSessionOpen] = useState(false);
  
  const [newSession, setNewSession] = useState({
    session_date: new Date().toISOString().split('T')[0],
    session_type: 'treatment' as const,
    duration: 60,
    status: 'scheduled' as const,
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    pain_level_before: 5,
    pain_level_after: 5,
    exercises_performed: [] as string[],
    notes: '',
    next_session_date: ''
  });

  const patient = patients.find(p => p.id === patientId);

  const handleCreateSession = () => {
    const session: TreatmentSession = {
      id: Date.now().toString(),
      patient_id: patientId,
      ...newSession,
      created_at: new Date().toISOString()
    };

    setSessions(prev => [session, ...prev]);
    setNewSession({
      session_date: new Date().toISOString().split('T')[0],
      session_type: 'treatment',
      duration: 60,
      status: 'scheduled',
      subjective: '',
      objective: '',
      assessment: '',
      plan: '',
      pain_level_before: 5,
      pain_level_after: 5,
      exercises_performed: [],
      notes: '',
      next_session_date: ''
    });
    setIsNewSessionOpen(false);
    
    toast({
      title: "Sucesso",
      description: "Sessão criada com sucesso!",
    });
  };

  const handleUpdateSession = () => {
    if (!selectedSession) return;

    setSessions(prev => prev.map(session => 
      session.id === selectedSession.id ? selectedSession : session
    ));
    setIsEditSessionOpen(false);
    setSelectedSession(null);
    
    toast({
      title: "Sucesso",
      description: "Sessão atualizada com sucesso!",
    });
  };

  const handleDeleteSession = (sessionId: string) => {
    setSessions(prev => prev.filter(session => session.id !== sessionId));
    toast({
      title: "Sucesso",
      description: "Sessão removida com sucesso!",
    });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'scheduled': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800',
      'no_show': 'bg-yellow-100 text-yellow-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      'scheduled': 'Agendada',
      'completed': 'Concluída',
      'cancelled': 'Cancelada',
      'no_show': 'Faltou'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getSessionTypeLabel = (type: string) => {
    const labels = {
      'evaluation': 'Avaliação',
      'treatment': 'Tratamento',
      'reevaluation': 'Reavaliação',
      'discharge': 'Alta'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const completedSessions = sessions.filter(s => s.status === 'completed');
  const averagePainReduction = completedSessions.length > 0 
    ? completedSessions.reduce((acc, s) => acc + (s.pain_level_before - s.pain_level_after), 0) / completedSessions.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Sessões de Tratamento</h2>
          <p className="text-muted-foreground">
            Gerenciamento de sessões para {patient?.name}
          </p>
        </div>
        <Dialog open={isNewSessionOpen} onOpenChange={setIsNewSessionOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Nova Sessão
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Sessão de Tratamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Data da Sessão</label>
                  <Input 
                    type="date"
                    value={newSession.session_date}
                    onChange={(e) => setNewSession(prev => ({ ...prev, session_date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Tipo de Sessão</label>
                  <Select 
                    value={newSession.session_type} 
                    onValueChange={(value: any) => setNewSession(prev => ({ ...prev, session_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="evaluation">Avaliação</SelectItem>
                      <SelectItem value="treatment">Tratamento</SelectItem>
                      <SelectItem value="reevaluation">Reavaliação</SelectItem>
                      <SelectItem value="discharge">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Duração (min)</label>
                  <Input 
                    type="number"
                    value={newSession.duration}
                    onChange={(e) => setNewSession(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                  />
                </div>
              </div>

              {/* SOAP Notes */}
              <Tabs defaultValue="soap" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="soap">SOAP</TabsTrigger>
                  <TabsTrigger value="pain">Dor</TabsTrigger>
                  <TabsTrigger value="exercises">Exercícios</TabsTrigger>
                </TabsList>
                
                <TabsContent value="soap" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Subjetivo (S)</label>
                      <Textarea 
                        value={newSession.subjective}
                        onChange={(e) => setNewSession(prev => ({ ...prev, subjective: e.target.value }))}
                        placeholder="Queixas e relatos do paciente..."
                        rows={4}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Objetivo (O)</label>
                      <Textarea 
                        value={newSession.objective}
                        onChange={(e) => setNewSession(prev => ({ ...prev, objective: e.target.value }))}
                        placeholder="Observações clínicas, testes, medidas..."
                        rows={4}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Avaliação (A)</label>
                      <Textarea 
                        value={newSession.assessment}
                        onChange={(e) => setNewSession(prev => ({ ...prev, assessment: e.target.value }))}
                        placeholder="Análise e interpretação dos dados..."
                        rows={4}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Plano (P)</label>
                      <Textarea 
                        value={newSession.plan}
                        onChange={(e) => setNewSession(prev => ({ ...prev, plan: e.target.value }))}
                        placeholder="Intervenções e plano de tratamento..."
                        rows={4}
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="pain" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Dor Antes (0-10)</label>
                      <Input 
                        type="number"
                        min="0"
                        max="10"
                        value={newSession.pain_level_before}
                        onChange={(e) => setNewSession(prev => ({ ...prev, pain_level_before: parseInt(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Dor Depois (0-10)</label>
                      <Input 
                        type="number"
                        min="0"
                        max="10"
                        value={newSession.pain_level_after}
                        onChange={(e) => setNewSession(prev => ({ ...prev, pain_level_after: parseInt(e.target.value) }))}
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="exercises" className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Exercícios Realizados</label>
                    <Textarea 
                      placeholder="Liste os exercícios realizados na sessão..."
                      rows={6}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              {/* Notes and Next Session */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Observações Gerais</label>
                  <Textarea 
                    value={newSession.notes}
                    onChange={(e) => setNewSession(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Observações adicionais..."
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Próxima Sessão</label>
                  <Input 
                    type="date"
                    value={newSession.next_session_date}
                    onChange={(e) => setNewSession(prev => ({ ...prev, next_session_date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsNewSessionOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateSession}>
                  Criar Sessão
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Sessões</p>
                <p className="text-2xl font-bold">{sessions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Concluídas</p>
                <p className="text-2xl font-bold">{completedSessions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Redução Média da Dor</p>
                <p className="text-2xl font-bold">{averagePainReduction.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tempo Total</p>
                <p className="text-2xl font-bold">
                  {Math.round(completedSessions.reduce((acc, s) => acc + s.duration, 0) / 60)}h
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Histórico de Sessões
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center p-8">
              <Stethoscope className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma sessão registrada</h3>
              <p className="text-muted-foreground mb-4">
                Comece criando a primeira sessão de tratamento para este paciente.
              </p>
              <Button onClick={() => setIsNewSessionOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira Sessão
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div key={session.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-lg">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-medium">
                          {format(new Date(session.session_date), 'dd/MM/yyyy', { locale: ptBR })}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {getSessionTypeLabel(session.session_type)} • {session.duration} min
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(session.status)}>
                        {getStatusLabel(session.status)}
                      </Badge>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedSession(session);
                          setIsEditSessionOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteSession(session.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {session.status === 'completed' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p><span className="font-medium">Dor antes:</span> {session.pain_level_before}/10</p>
                        <p><span className="font-medium">Dor depois:</span> {session.pain_level_after}/10</p>
                      </div>
                      <div>
                        <p><span className="font-medium">Melhora:</span> 
                          <span className={session.pain_level_before > session.pain_level_after ? 'text-green-600' : 'text-red-600'}>
                            {session.pain_level_before - session.pain_level_after > 0 ? '-' : '+'}
                            {Math.abs(session.pain_level_before - session.pain_level_after)}
                          </span>
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {session.notes && (
                    <div className="mt-3 p-3 bg-muted/50 rounded">
                      <p className="text-sm">{session.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TreatmentSessionManager;