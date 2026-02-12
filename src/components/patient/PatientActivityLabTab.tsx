import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  ClipboardList, 
  Calendar, 
  ChevronRight,
  Activity
} from 'lucide-react';
import { useActivityLabSessions } from '@/hooks/useActivityLab';
import { ActivityLabChart } from '@/components/ai/ActivityLabChart';
import type { ActivityLabSession } from '@/types/activityLab';
import { format } from 'date-fns';

interface PatientActivityLabTabProps {
  patientId: string;
}

export const PatientActivityLabTab: React.FC<PatientActivityLabTabProps> = ({ patientId }) => {
  const [selectedSession, setSelectedSession] = useState<ActivityLabSession | null>(null);
  const { data: sessions = [], isLoading } = useActivityLabSessions(patientId);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Activity className="w-10 h-10 text-primary animate-pulse" />
        <p className="text-muted-foreground font-medium">Carregando dados biomecânicos...</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card className="border-dashed border-2 bg-slate-50/50">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
            <TrendingUp className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Sem Medições Disponíveis</h3>
          <p className="text-slate-500 max-w-xs mx-auto mb-6">
            Este paciente ainda não possui testes de força registrados no Activity Lab.
          </p>
          <Button variant="outline" onClick={() => window.open('/ai/activity-lab', '_blank')}>
            Ir para Activity Lab
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-4">
        <Card className="border-none shadow-md overflow-hidden">
          <CardHeader className="bg-slate-50/50 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-indigo-500" />
              Histórico de Testes
            </CardTitle>
            <CardDescription className="font-medium text-slate-500">
              {sessions.length} medições registradas
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[600px] overflow-y-auto custom-scrollbar">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => setSelectedSession(session)}
                  className={`w-full text-left p-4 hover:bg-indigo-50/30 transition-all flex items-center justify-between group ${
                    selectedSession?.id === session.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : 'border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      selectedSession?.id === session.id ? 'bg-indigo-600 text-white' : 'bg-blue-50 text-blue-600'
                    }`}>
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 leading-tight">{session.protocol_name}</p>
                      <div className="flex items-center text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">
                        <Calendar className="w-3 h-3 mr-1" />
                        {format(new Date(session.created_at), 'dd/MM/yyyy')}
                        <span className="mx-2">•</span>
                        <span className="text-indigo-600">{session.peak_force.toFixed(1)} kg</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-transform ${
                    selectedSession?.id === session.id ? 'translate-x-1 text-indigo-600' : 'text-slate-300 group-hover:text-indigo-400'
                  }`} />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        {selectedSession ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
              <h3 className="text-lg font-bold text-slate-900 mb-2">Selecione uma Medição</h3>
              <p className="text-slate-500 max-w-xs mx-auto">Escolha um teste no histórico ao lado para analisar a curva de força e métricas biomecânicas.</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
