import React, { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Activity, 
  Users, 
  Calendar, 
  ChevronRight, 
  TrendingUp,
  ClipboardList,
  Building2,
  User as UserIcon,
  Search,
} from 'lucide-react';
import { useActivityLabPatients, useActivityLabSessions, useActivityLabClinic } from '@/hooks/useActivityLab';
import { ActivityLabChart } from '@/components/ai/ActivityLabChart';
import { ActivityLabComparisonChart } from '@/components/ai/ActivityLabComparisonChart';
import type { 
  ActivityLabPatient, 
  ActivityLabSession, 
} from '@/types/activityLab';
import { format } from 'date-fns';

const normalizeSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export default function ActivityLabPage() {
  const [selectedPatient, setSelectedPatient] = useState<ActivityLabPatient | null>(null);
  const [selectedSession, setSelectedSession] = useState<ActivityLabSession | null>(null);
  const [compareSession, setCompareSession] = useState<ActivityLabSession | null>(null);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [activeTab, setActiveTab] = useState('patients');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  const { data: patients = [], isLoading: loadingPatients, isFetching: fetchingPatients } = useActivityLabPatients(debouncedSearchTerm);
  const { data: sessions = [], isLoading: loadingSessions } = useActivityLabSessions(selectedPatient?.id);
  const { data: clinic } = useActivityLabClinic();
  const isInitialPatientsLoading = loadingPatients && patients.length === 0 && searchTerm.trim().length === 0;

  const filteredPatients = useMemo(() => {
    const trimmedTerm = searchTerm.trim();
    if (!trimmedTerm) return patients;

    const normalizedTerm = normalizeSearch(trimmedTerm);
    const numericSearch = trimmedTerm.replace(/\D/g, '');

    return patients.filter((p) => {
      const patientName = p.full_name || p.name || '';
      const normalizedPatientName = normalizeSearch(patientName);
      const patientCpf = (p.cpf || '').replace(/\D/g, '');

      const nameMatches = normalizedPatientName.includes(normalizedTerm);
      const cpfMatches = numericSearch ? patientCpf.includes(numericSearch) : false;

      return nameMatches || cpfMatches;
    });
  }, [patients, searchTerm]);

  const handleSelectPatient = (patient: ActivityLabPatient) => {
    setSelectedPatient(patient);
    setActiveTab('sessions');
    setSelectedSession(null);
    setCompareSession(null);
    setComparisonMode(false);
  };

  const handleSelectSession = (session: ActivityLabSession) => {
    if (comparisonMode) {
      if (selectedSession?.id === session.id) return;
      setCompareSession(session);
    } else {
      setSelectedSession(session);
    }
  };

  const toggleComparisonMode = () => {
    setComparisonMode(!comparisonMode);
    if (!comparisonMode) {
      setCompareSession(null);
    }
  };

  if (isInitialPatientsLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Activity className="w-12 h-12 text-blue-600 animate-pulse mx-auto mb-4" />
            <p className="text-gray-500">Conectando ao Activity Lab...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <TrendingUp className="w-8 h-8 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Activity Lab</h1>
              <p className="text-gray-500">
                Integração de testes de força e biomecânica
              </p>
            </div>
          </div>
          
          {clinic && (
            <div className="flex items-center space-x-3 bg-white p-3 rounded-xl border border-indigo-100 shadow-sm">
              <Building2 className="w-5 h-5 text-indigo-500" />
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Clínica</p>
                <p className="text-sm font-bold text-gray-900">{clinic.clinic_name || clinic.name}</p>
              </div>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="patients" className="flex items-center gap-2 rounded-lg">
              <Users className="w-4 h-4" />
              Pacientes
            </TabsTrigger>
            <TabsTrigger value="sessions" className="flex items-center gap-2 rounded-lg" disabled={!selectedPatient}>
              <ClipboardList className="w-4 h-4" />
              Sessões
            </TabsTrigger>
          </TabsList>

          {/* Patients Tab */}
          <TabsContent value="patients" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1 space-y-4">
                <Card className="overflow-hidden border-none shadow-md">
                  <CardHeader className="bg-slate-50/50 pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="w-5 h-5 text-indigo-500" />
                      Pacientes
                    </CardTitle>
                    <div className="relative mt-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      {fetchingPatients && (
                        <Activity className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 animate-spin" />
                      )}
                      <Input 
                        placeholder="Buscar por nome ou CPF..." 
                        className="pl-9 pr-9 bg-white border-slate-200"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y max-h-[500px] overflow-y-auto custom-scrollbar">
                      {filteredPatients.map((patient) => (
                        <button
                          key={patient.id}
                          onClick={() => handleSelectPatient(patient)}
                          className={`w-full text-left p-4 hover:bg-indigo-50/30 transition-all flex items-center justify-between group ${
                            selectedPatient?.id === patient.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : 'border-l-4 border-transparent'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              selectedPatient?.id === patient.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                            }`}>
                              <UserIcon className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 leading-tight">{patient.full_name || patient.name}</p>
                              <p className="text-[11px] text-gray-500 mt-1 uppercase font-medium tracking-tighter">CPF: {patient.cpf || '---'}</p>
                            </div>
                          </div>
                          <ChevronRight className={`w-4 h-4 transition-transform ${
                            selectedPatient?.id === patient.id ? 'translate-x-1 text-indigo-600' : 'text-slate-300 group-hover:text-indigo-400'
                          }`} />
                        </button>
                      ))}
                      {filteredPatients.length === 0 && (
                        <div className="p-12 text-center text-gray-400">
                          {fetchingPatients ? (
                            <>
                              <Activity className="w-8 h-8 mx-auto mb-2 opacity-40 animate-spin" />
                              <p className="text-sm">Buscando pacientes...</p>
                            </>
                          ) : (
                            <>
                              <Search className="w-8 h-8 mx-auto mb-2 opacity-20" />
                              <p className="text-sm">Nenhum paciente encontrado.</p>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="md:col-span-2">
                {selectedPatient ? (
                  <Card className="h-full border-none shadow-md overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-2xl font-black text-slate-900">{selectedPatient.full_name || selectedPatient.name}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-widest border-indigo-200 text-indigo-600">
                              Activity Lab Source
                            </Badge>
                          </CardDescription>
                        </div>
                        <Badge className={selectedPatient.is_active ? "bg-green-500" : "bg-slate-400"}>
                          {selectedPatient.is_active ? 'Paciente Ativo' : 'Arquivado'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-8 space-y-8">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nascimento</p>
                          <p className="text-sm font-bold text-slate-700">{selectedPatient.birth_date ? format(new Date(selectedPatient.birth_date), 'dd/MM/yyyy') : '---'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gênero</p>
                          <p className="text-sm font-bold text-slate-700 capitalize">{selectedPatient.gender}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Telefone</p>
                          <p className="text-sm font-bold text-slate-700">{selectedPatient.phone || '---'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sincronizado em</p>
                          <p className="text-sm font-bold text-slate-700">{format(new Date(selectedPatient.created_at), 'dd/MM/yyyy')}</p>
                        </div>
                      </div>

                      {selectedPatient.main_condition && (
                        <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <ClipboardList className="w-3 h-3" />
                            Observações Clínicas
                          </p>
                          <p className="text-sm text-slate-700 leading-relaxed italic">
                            "{selectedPatient.main_condition || selectedPatient.notes}"
                          </p>
                        </div>
                      )}

                      <div className="pt-4">
                        <Button 
                          onClick={() => setActiveTab('sessions')}
                          className="bg-indigo-600 hover:bg-indigo-700 rounded-xl px-8 shadow-lg shadow-indigo-200"
                        >
                          Explorar Sessões de Teste
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="h-full flex items-center justify-center border-dashed border-2 bg-slate-50/30">
                    <div className="text-center p-12">
                      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mx-auto mb-6">
                        <Users className="w-10 h-10 text-indigo-200" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-2">Nenhum Paciente Selecionado</h3>
                      <p className="text-slate-500 max-w-xs mx-auto">Selecione um paciente na lista ao lado para visualizar seu perfil e histórico de força.</p>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1 space-y-4">
                <Card className="border-none shadow-md overflow-hidden">
                  <CardHeader className="bg-slate-50/50 pb-4">
                    <div className="flex items-center gap-2 text-indigo-600 mb-2">
                      <Button variant="ghost" size="sm" onClick={() => setActiveTab('patients')} className="p-0 h-auto hover:bg-transparent font-bold text-xs uppercase tracking-tighter">
                        <ChevronRight className="w-4 h-4 rotate-180" /> Voltar
                      </Button>
                    </div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-indigo-500" />
                      Sessões de Teste
                    </CardTitle>
                    <CardDescription className="font-medium text-slate-500 flex items-center justify-between">
                      <span>{sessions.length} medições registradas</span>
                      <Button 
                        variant={comparisonMode ? "default" : "outline"} 
                        size="sm" 
                        onClick={toggleComparisonMode}
                        className="h-7 text-[10px] uppercase font-bold tracking-widest px-2"
                      >
                        {comparisonMode ? "Sair Comparação" : "Comparar"}
                      </Button>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y max-h-[500px] overflow-y-auto custom-scrollbar">
                      {sessions.map((session) => (
                        <button
                          key={session.id}
                          onClick={() => handleSelectSession(session)}
                          className={`w-full text-left p-4 hover:bg-indigo-50/30 transition-all flex items-center justify-between group ${
                            selectedSession?.id === session.id || compareSession?.id === session.id 
                              ? 'bg-indigo-50 border-l-4 border-indigo-600' 
                              : 'border-l-4 border-transparent'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              selectedSession?.id === session.id 
                                ? 'bg-indigo-600 text-white' 
                                : compareSession?.id === session.id
                                  ? 'bg-red-500 text-white'
                                  : 'bg-blue-50 text-blue-600'
                            }`}>
                              <TrendingUp className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 leading-tight">{session.protocol_name}</p>
                              <div className="flex items-center text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">
                                <Badge variant="outline" className={`mr-2 px-1 py-0 h-4 text-[9px] ${
                                  session.side === 'LEFT' ? 'text-blue-600 border-blue-200' : 'text-red-600 border-red-200'
                                }`}>
                                  {session.side}
                                </Badge>
                                <Calendar className="w-3 h-3 mr-1" />
                                {format(new Date(session.created_at), 'dd/MM/yyyy')}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="font-bold text-slate-900">{session.peak_force.toFixed(1)}kg</span>
                            {comparisonMode && (
                              <Badge className={`h-4 text-[9px] ${
                                selectedSession?.id === session.id ? "bg-indigo-600" : compareSession?.id === session.id ? "bg-red-500" : "bg-slate-300"
                              }`}>
                                {selectedSession?.id === session.id ? "REF" : compareSession?.id === session.id ? "COMP" : "SEL"}
                              </Badge>
                            )}
                          </div>
                        </button>
                      ))}
                      {sessions.length === 0 && (
                        <div className="p-12 text-center text-gray-400">
                          {loadingSessions ? (
                            <Activity className="w-8 h-8 mx-auto animate-spin opacity-20" />
                          ) : (
                            <>
                              <Activity className="w-8 h-8 mx-auto mb-2 opacity-20" />
                              <p className="text-sm">Nenhuma sessão encontrada.</p>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="md:col-span-2">
                {selectedSession && compareSession && comparisonMode ? (
                  <div className="space-y-6 animate-in zoom-in-95 duration-300">
                    <ActivityLabComparisonChart session1={selectedSession} session2={compareSession} />
                  </div>
                ) : selectedSession ? (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {comparisonMode && !compareSession && (
                      <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl text-center text-xs font-bold text-indigo-600 animate-pulse">
                        Selecione a segunda sessão na lista ao lado para comparar
                      </div>
                    )}
                    <ActivityLabChart session={selectedSession} />
                    
                    {selectedSession.notes && (
                      <Card className="border-none shadow-sm bg-amber-50/30 border border-amber-100/50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-700">
                            <ClipboardList className="w-4 h-4" />
                            Notas da Medição
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-slate-700 italic leading-relaxed">"{selectedSession.notes}"</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <Card className="h-full flex items-center justify-center border-dashed border-2 bg-slate-50/30">
                    <div className="text-center p-12">
                      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mx-auto mb-6">
                        <TrendingUp className="w-10 h-10 text-indigo-200" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-2">Selecione uma Sessão</h3>
                      <p className="text-slate-500 max-w-xs mx-auto">Escolha um teste no histórico ao lado para analisar a curva de força e métricas biomecânicas.</p>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
