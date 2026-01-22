/**
 * EvolutionTimeline - Linha do tempo completa de eventos do paciente
 * RF01.5 - Visualização cronológica e interativa de todas as evoluções
 *
 * Features:
 * - Timeline visual com todos os tipos de eventos
 * - Filtro por tipo de evento (sessão, avaliação, anexo, cirurgia, meta)
 * - Busca por texto
 * - Expansão/colapso de detalhes
 * - Visualização completa de SOAP, exercícios, medições e anexos
 * - Modo compacto e detalhado
 * - Indicadores visuais de progresso
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { Input } from '@/components/shared/ui/input';
import { ScrollArea } from '@/components/web/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/shared/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/shared/ui/tabs';
import {
  FileText,
  Activity,
  Target,
  AlertCircle,
  Bone,
  Image as ImageIcon,
  Calendar,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Clock,
  Dumbbell,
  Ruler,
  Camera,
  Copy,
  Eye,
  Maximize2,
  Download,
  Trophy
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  useGamification
} from '@/hooks/useGamification';
import {
  useSoapRecords,
  type SoapRecord
} from '@/hooks/useSoapRecords';
import {
  usePatientSurgeries,
  usePatientGoals,
  usePatientPathologies,
  useEvolutionMeasurements
} from '@/hooks/usePatientEvolution';
import { useSessionAttachments } from '@/hooks/useSoapRecords';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/shared/ui/skeleton';

// Tipos de eventos na timeline
type TimelineEventType = 'session' | 'surgery' | 'goal' | 'pathology' | 'measurement' | 'attachment';

interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  date: Date;
  title: string;
  description?: string;
  data?: any;
  expanded?: boolean;
}

interface EvolutionTimelineProps {
  patientId: string;
  limit?: number;
  showFilters?: boolean;
  showGamification?: boolean;
  onCopyEvolution?: (evolution: SoapRecord) => void;
}

const EVENT_TYPE_CONFIG: Record<TimelineEventType, {
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  session: {
    label: 'Sessões',
    icon: <FileText className="h-4 w-4" />,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500/5',
    borderColor: 'border-blue-500/20'
  },
  surgery: {
    label: 'Cirurgias',
    icon: <Bone className="h-4 w-4" />,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-500/5',
    borderColor: 'border-purple-500/20'
  },
  goal: {
    label: 'Metas',
    icon: <Target className="h-4 w-4" />,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-500/5',
    borderColor: 'border-green-500/20'
  },
  pathology: {
    label: 'Patologias',
    icon: <AlertCircle className="h-4 w-4" />,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-500/5',
    borderColor: 'border-orange-500/20'
  },
  measurement: {
    label: 'Medições',
    icon: <Activity className="h-4 w-4" />,
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-500/5',
    borderColor: 'border-cyan-500/20'
  },
  attachment: {
    label: 'Anexos',
    icon: <ImageIcon className="h-4 w-4" />,
    color: 'text-pink-600 dark:text-pink-400',
    bgColor: 'bg-pink-500/5',
    borderColor: 'border-pink-500/20'
  }
};

// Componente de Skeleton para loading
const SessionDetailsSkeleton: React.FC = () => (
  <div className="space-y-4">
    <Skeleton className="h-6 w-48" />
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-24 w-full" />
  </div>
);

// Componente para visualização detalhada da sessão
const SessionDetailsModal: React.FC<{
  session: SoapRecord;
  measurements: any[];
  attachments: any[];
  isOpen: boolean;
  onClose: () => void;
}> = ({ session, measurements, attachments, isOpen, onClose }) => {
  const [sessionExercises, setSessionExercises] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<'overview' | 'soap' | 'exercises' | 'measurements' | 'attachments'>('overview');

  // Reset active tab when session changes
  React.useEffect(() => {
    setActiveTab('overview');
  }, [session.id]);

  React.useEffect(() => {
    const fetchSessionExercises = async () => {
      setIsLoading(true);
      try {
        if (!session.appointment_id) {
          setSessionExercises([]);
          return;
        }

        const { data, error } = await supabase
          .from('treatment_sessions')
          .select('exercises_performed')
          .eq('appointment_id', session.appointment_id)
          .maybeSingle();

        if (error) {
          console.error('Erro ao buscar exercícios:', error);
          setSessionExercises([]);
        } else if (data?.exercises_performed) {
          setSessionExercises(data.exercises_performed);
        } else {
          setSessionExercises([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessionExercises();
  }, [session.appointment_id]);

  // Filtrar medições e anexos desta sessão
  const sessionDate = new Date(session.created_at).toISOString().split('T')[0];
  const sessionMeasurements = measurements.filter(m =>
    new Date(m.measured_at).toISOString().split('T')[0] === sessionDate
  );
  const sessionAttachments = attachments.filter(a =>
    a.soap_record_id === session.id
  );

  // Contar campos SOAP preenchidos
  const soapFieldsCount = [
    session.subjective,
    session.objective,
    session.assessment,
    session.plan
  ].filter(Boolean).length;

  // Função para exportar sessão como texto
  const handleExportSession = useCallback(() => {
    const exportText = `
SESSÃO ${session.session_number || '?'} - ${format(new Date(session.created_at), 'dd/MM/yyyy', { locale: ptBR })}
${'='.repeat(50)}

ESCALA DE DOR (EVA): ${session.pain_level !== undefined ? `${session.pain_level}/10` : 'N/A'}
${session.pain_location ? `Localização: ${session.pain_location}` : ''}
${session.pain_character ? `Característica: ${session.pain_character}` : ''}

REGISTRO SOAP

SUBJETIVO:
${session.subjective || 'Não preenchido'}

OBJETIVO:
${session.objective || 'Não preenchido'}

AVALIAÇÃO:
${session.assessment || 'Não preenchido'}

PLANO:
${session.plan || 'Não preenchido'}

EXERCÍCIOS (${sessionExercises.length}):
${sessionExercises.length > 0 ? sessionExercises.map((ex, i) =>
      `${i + 1}. ${ex.name}${ex.sets ? ` - ${ex.sets} séries` : ''}${ex.repetitions ? ` x ${ex.repetitions} reps` : ''}${ex.load ? ` - ${ex.load}` : ''}`
    ).join('\n') : 'Nenhum exercício registrado'}

MEDIDAS (${sessionMeasurements.length}):
${sessionMeasurements.length > 0 ? sessionMeasurements.map(m =>
      `- ${m.measurement_name}: ${m.value}${m.unit || ''}`
    ).join('\n') : 'Nenhuma medida registrada'}
    `.trim();

    // Criar blob e download
    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sessao-${session.session_number || 'N'}-${format(new Date(session.created_at), 'dd-MM-yyyy')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [session, sessionExercises, sessionMeasurements]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden p-0">
        {/* Header com gradiente */}
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b px-6 py-4">
          <DialogHeader className="space-y-2">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="text-xl font-bold">
                    Sessão {session.session_number || '?'}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(session.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </div>
                </div>
              </DialogTitle>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportSession}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {formatDistanceToNow(new Date(session.created_at), { locale: ptBR, addSuffix: true })}
                </span>
              </div>
              <Badge variant={session.status === 'finalized' ? 'default' : 'secondary'} className="text-xs">
                {session.status === 'finalized' ? 'Finalizada' : 'Rascunho'}
              </Badge>
              <div className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">{soapFieldsCount}/4 campos SOAP</span>
              </div>
            </div>
          </DialogHeader>

          {/* Abas de navegação */}
          <div className="flex gap-1 px-6 pt-4">
            {[
              { value: 'overview', label: 'Visão Geral', icon: Activity },
              { value: 'soap', label: 'SOAP', icon: FileText },
              { value: 'exercises', label: 'Exercícios', icon: Dumbbell, count: sessionExercises.length },
              { value: 'measurements', label: 'Medições', icon: Ruler, count: sessionMeasurements.length },
              { value: 'attachments', label: 'Anexos', icon: Camera, count: sessionAttachments.length },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value as 'overview' | 'soap' | 'exercises' | 'measurements' | 'attachments')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === tab.value
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <Badge
                    variant={activeTab === tab.value ? "secondary" : "outline"}
                    className="ml-1 text-[10px] h-5 px-1"
                  >
                    {tab.count}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>

        <ScrollArea className="h-[calc(92vh-200px)]">
          <div className="px-6 py-6 space-y-6">
            {isLoading && activeTab !== 'overview' ? (
              <SessionDetailsSkeleton />
            ) : (
              <>
                {/* Tab: Visão Geral */}
                {activeTab === 'overview' && (
                  <>
                    {/* Escala de Dor */}
                    {session.pain_level !== undefined && (
                      <div className="bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20 border border-rose-200 dark:border-rose-800 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center">
                              <Activity className="h-5 w-5 text-rose-600" />
                            </div>
                            <div>
                              <span className="font-semibold text-sm">Escala Visual Analógica (EVA)</span>
                              <div className="text-xs text-muted-foreground">Nível de dor reportado</div>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-lg px-3 py-1 font-bold",
                              session.pain_level >= 7 ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300' :
                                session.pain_level >= 4 ? 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                  'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300'
                            )}
                          >
                            {session.pain_level}/10
                          </Badge>
                        </div>
                        {session.pain_location && (
                          <div className="flex items-center gap-2 text-sm mt-2">
                            <span className="text-muted-foreground">Localização:</span>
                            <span className="font-medium">{session.pain_location}</span>
                          </div>
                        )}
                        {session.pain_character && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Característica:</span>
                            <span className="font-medium">{session.pain_character}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Resumo SOAP */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Resumo do Registro SOAP
                      </h3>
                      <div className="grid gap-3">
                        {session.subjective && (
                          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                                <span className="text-[10px] font-bold text-white">S</span>
                              </div>
                              <span className="font-semibold text-sm text-blue-700 dark:text-blue-300">Subjetivo</span>
                            </div>
                            <p className="text-sm line-clamp-3">{session.subjective}</p>
                          </div>
                        )}
                        {session.objective && (
                          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                                <span className="text-[10px] font-bold text-white">O</span>
                              </div>
                              <span className="font-semibold text-sm text-green-700 dark:text-green-300">Objetivo</span>
                            </div>
                            <p className="text-sm line-clamp-3">{session.objective}</p>
                          </div>
                        )}
                        {session.assessment && (
                          <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                                <span className="text-[10px] font-bold text-white">A</span>
                              </div>
                              <span className="font-semibold text-sm text-purple-700 dark:text-purple-300">Avaliação</span>
                            </div>
                            <p className="text-sm line-clamp-3">{session.assessment}</p>
                          </div>
                        )}
                        {session.plan && (
                          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
                                <span className="text-[10px] font-bold text-white">P</span>
                              </div>
                              <span className="font-semibold text-sm text-amber-700 dark:text-amber-300">Plano</span>
                            </div>
                            <p className="text-sm line-clamp-3">{session.plan}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4 text-center">
                        <Dumbbell className="h-5 w-5 text-purple-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{sessionExercises.length}</div>
                        <div className="text-xs text-muted-foreground">Exercícios</div>
                      </div>
                      <div className="bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 rounded-xl p-4 text-center">
                        <Ruler className="h-5 w-5 text-teal-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-teal-700 dark:text-teal-300">{sessionMeasurements.length}</div>
                        <div className="text-xs text-muted-foreground">Medições</div>
                      </div>
                      <div className="bg-pink-50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-800 rounded-xl p-4 text-center">
                        <Camera className="h-5 w-5 text-pink-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-pink-700 dark:text-pink-300">{sessionAttachments.length}</div>
                        <div className="text-xs text-muted-foreground">Anexos</div>
                      </div>
                      <div className="bg-muted/30 border rounded-xl p-4 text-center">
                        <Clock className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
                        <div className="text-2xl font-bold">
                          {session.duration_minutes ? `${session.duration_minutes}m` : '--'}
                        </div>
                        <div className="text-xs text-muted-foreground">Duração</div>
                      </div>
                    </div>
                  </>
                )}

                {/* Tab: SOAP Completo */}
                {activeTab === 'soap' && (
                  <div className="space-y-4">
                    {session.subjective && (
                      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                            <span className="text-sm font-bold text-white">S</span>
                          </div>
                          <span className="font-semibold text-blue-700 dark:text-blue-300">Subjetivo</span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{session.subjective}</p>
                      </div>
                    )}
                    {session.objective && (
                      <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                            <span className="text-sm font-bold text-white">O</span>
                          </div>
                          <span className="font-semibold text-green-700 dark:text-green-300">Objetivo</span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{session.objective}</p>
                      </div>
                    )}
                    {session.assessment && (
                      <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                            <span className="text-sm font-bold text-white">A</span>
                          </div>
                          <span className="font-semibold text-purple-700 dark:text-purple-300">Avaliação</span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{session.assessment}</p>
                      </div>
                    )}
                    {session.plan && (
                      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center">
                            <span className="text-sm font-bold text-white">P</span>
                          </div>
                          <span className="font-semibold text-amber-700 dark:text-amber-300">Plano</span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{session.plan}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Exercícios */}
                {activeTab === 'exercises' && (
                  <div className="space-y-3">
                    {sessionExercises.length > 0 ? (
                      <div className="grid gap-3">
                        {sessionExercises.map((exercise, index) => (
                          <div
                            key={index}
                            className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border border-purple-200 dark:border-purple-800 rounded-2xl p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3 flex-1">
                                <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center shrink-0">
                                  <Dumbbell className="h-5 w-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-sm">{exercise.name}</h4>
                                  {exercise.notes && (
                                    <p className="text-xs text-muted-foreground mt-1">{exercise.notes}</p>
                                  )}
                                  <div className="flex gap-2 mt-2 text-xs">
                                    {exercise.sets && (
                                      <Badge variant="secondary" className="bg-white/50">
                                        {exercise.sets} séries
                                      </Badge>
                                    )}
                                    {exercise.repetitions && (
                                      <Badge variant="secondary" className="bg-white/50">
                                        {exercise.repetitions} reps
                                      </Badge>
                                    )}
                                    {exercise.load && exercise.load !== '0 kg' && (
                                      <Badge variant="secondary" className="bg-white/50">
                                        {exercise.load}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Dumbbell className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>Nenhum exercício registrado nesta sessão</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Medições */}
                {activeTab === 'measurements' && (
                  <div className="space-y-3">
                    {sessionMeasurements.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {sessionMeasurements.map((measurement) => (
                          <div
                            key={measurement.id}
                            className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/20 dark:to-cyan-950/20 border border-teal-200 dark:border-teal-800 rounded-2xl p-5 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <Ruler className="h-4 w-4 text-teal-600" />
                              <span className="text-xs text-muted-foreground">{measurement.measurement_name}</span>
                            </div>
                            <div className="text-2xl font-bold text-teal-700 dark:text-teal-300">
                              {measurement.value}<span className="text-sm font-normal text-muted-foreground ml-1">{measurement.unit || ''}</span>
                            </div>
                            {measurement.notes && (
                              <div className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                {measurement.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Ruler className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>Nenhuma medição registrada nesta sessão</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Anexos */}
                {activeTab === 'attachments' && (
                  <div className="space-y-3">
                    {sessionAttachments.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {sessionAttachments.map((attachment) => (
                          <div
                            key={attachment.id}
                            className="group relative rounded-xl overflow-hidden border border-border hover:shadow-lg transition-all cursor-pointer"
                            onClick={() => window.open(attachment.file_url, '_blank')}
                          >
                            <div className="aspect-square bg-muted">
                              {attachment.file_type === 'pdf' ? (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
                                  <FileText className="h-12 w-12 text-red-400" />
                                </div>
                              ) : attachment.thumbnail_url ? (
                                <img
                                  src={attachment.thumbnail_url}
                                  alt={attachment.original_name || attachment.file_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="h-12 w-12 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <Eye className="h-5 w-5 text-white" />
                              <span className="text-white text-sm font-medium">Ver</span>
                            </div>
                            {attachment.original_name && (
                              <div className="p-2 bg-background border-t text-xs truncate">
                                {attachment.original_name}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Camera className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>Nenhum anexo nesta sessão</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Footer com metadados */}
            <div className="bg-muted/30 rounded-2xl p-4 space-y-2 text-xs text-muted-foreground border">
              <div className="flex justify-between items-center">
                <span>Status:</span>
                <Badge variant="outline" className="text-[10px]">
                  {session.status === 'finalized' ? 'Finalizada' : 'Rascunho'}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>ID do Registro:</span>
                <span className="font-mono">{session.id.slice(0, 8)}...</span>
              </div>
              {session.appointment_id && (
                <div className="flex justify-between items-center">
                  <span>ID do Agendamento:</span>
                  <span className="font-mono">{session.appointment_id.slice(0, 8)}...</span>
                </div>
              )}
              {session.last_auto_save_at && (
                <div className="flex justify-between items-center">
                  <span>Último auto-save:</span>
                  <span>{format(new Date(session.last_auto_save_at), 'HH:mm:ss')}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span>Criado em:</span>
                <span>{format(new Date(session.created_at), 'dd/MM/yyyy \'as\' HH:mm:ss', { locale: ptBR })}</span>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export const EvolutionTimeline: React.FC<EvolutionTimelineProps> = ({
  patientId,
  limit = 50,
  showFilters = true,
  showGamification = true,
  onCopyEvolution
}) => {
  const {
    isLoading: isLoadingGamification,
    currentLevel,
    currentXp,
    progressPercentage,
    unlockedAchievements
  } = useGamification(patientId);
  const [filterType, setFilterType] = useState<TimelineEventType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [selectedSession, setSelectedSession] = useState<SoapRecord | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [compactView, setCompactView] = useState(false);

  // Buscar todos os dados do paciente
  const { data: soapRecords = [] } = useSoapRecords(patientId, limit);
  const { data: surgeries = [] } = usePatientSurgeries(patientId);
  const { data: goals = [] } = usePatientGoals(patientId);
  const { data: pathologies = [] } = usePatientPathologies(patientId);
  const { data: measurements = [] } = useEvolutionMeasurements(patientId);
  const { data: attachments = [] } = useSessionAttachments(undefined, patientId);

  // Construir timeline de eventos
  const timelineEvents = useMemo(() => {
    const events: TimelineEvent[] = [];

    // Adicionar sessões SOAP
    soapRecords.forEach((record) => {
      const soapParts = [
        record.subjective && 'S',
        record.objective && 'O',
        record.assessment && 'A',
        record.plan && 'P'
      ].filter(Boolean);

      const hasAttachments = attachments.some(a => a.soap_record_id === record.id);
      const hasExercises = record.appointment_id; // Indicador que pode ter exercícios

      events.push({
        id: `soap-${record.id}`,
        type: 'session',
        date: new Date(record.created_at),
        title: `Sessão ${record.session_number || '?'} - ${format(new Date(record.created_at), 'dd/MM/yyyy', { locale: ptBR })}`,
        description: soapParts.length > 0
          ? `SOAP: ${soapParts.join(' - ')}${record.pain_level !== undefined ? ` | EVA: ${record.pain_level}/10` : ''}${hasAttachments ? ' | 📎' : ''}${hasExercises ? ' | 💪' : ''}`
          : 'Sem descrição',
        data: { ...record, hasAttachments, hasExercises }
      });
    });

    // Adicionar cirurgias
    surgeries.forEach((surgery) => {
      events.push({
        id: `surgery-${surgery.id}`,
        type: 'surgery',
        date: new Date(surgery.surgery_date),
        title: surgery.surgery_name,
        description: surgery.affected_side ? `Lado: ${surgery.affected_side}` : undefined,
        data: surgery
      });
    });

    // Adicionar metas (criadas e concluídas)
    goals.forEach((goal) => {
      events.push({
        id: `goal-${goal.id}`,
        type: 'goal',
        date: new Date(goal.created_at),
        title: `Meta: ${goal.goal_title}`,
        description: goal.goal_description,
        data: { ...goal, eventSubType: 'created' }
      });

      if (goal.status === 'concluido' && goal.completed_at) {
        events.push({
          id: `goal-completed-${goal.id}`,
          type: 'goal',
          date: new Date(goal.completed_at),
          title: `✓ Meta Concluída: ${goal.goal_title}`,
          description: goal.goal_description,
          data: { ...goal, eventSubType: 'completed' }
        });
      }
    });

    // Adicionar patologias
    pathologies.forEach((pathology) => {
      events.push({
        id: `pathology-${pathology.id}`,
        type: 'pathology',
        date: new Date(pathology.diagnosis_date || pathology.created_at),
        title: `Patologia: ${pathology.pathology_name}`,
        description: `Status: ${pathology.status}`,
        data: pathology
      });
    });

    // Adicionar medições
    measurements.forEach((measurement) => {
      events.push({
        id: `measurement-${measurement.id}`,
        type: 'measurement',
        date: new Date(measurement.measured_at),
        title: `${measurement.measurement_name}: ${measurement.value}${measurement.unit || ''}`,
        description: measurement.notes,
        data: measurement
      });
    });

    // Adicionar anexos
    attachments.forEach((attachment) => {
      events.push({
        id: `attachment-${attachment.id}`,
        type: 'attachment',
        date: new Date(attachment.uploaded_at),
        title: attachment.original_name || attachment.file_name,
        description: `${attachment.category}${attachment.description ? ` - ${attachment.description}` : ''}`,
        data: attachment
      });
    });

    // Ordenar por data (mais recente primeiro)
    return events.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [soapRecords, surgeries, goals, pathologies, measurements, attachments]);

  // Filtrar eventos
  const filteredEvents = useMemo(() => {
    let filtered = timelineEvents;

    // Filtro por tipo
    if (filterType !== 'all') {
      filtered = filtered.filter(e => e.type === filterType);
    }

    // Filtro por busca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.title.toLowerCase().includes(query) ||
        (e.description && e.description.toLowerCase().includes(query))
      );
    }

    // Limitar resultados
    return filtered.slice(0, limit);
  }, [timelineEvents, filterType, searchQuery, limit]);

  // Verificar se evento é recente (últimas 24 horas)
  const isRecentEvent = useCallback((eventDate: Date) => {
    const now = new Date();
    const diffHours = (now.getTime() - eventDate.getTime()) / (1000 * 60 * 60);
    return diffHours <= 24;
  }, []);

  // Agrupar eventos por período
  const groupedEvents = useMemo(() => {
    const groups: Record<string, TimelineEvent[]> = {};

    filteredEvents.forEach((event) => {
      const now = new Date();
      const eventDate = new Date(event.date);
      const diffDays = Math.floor((now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24));

      let period = '';
      if (diffDays === 0) period = 'Hoje';
      else if (diffDays === 1) period = 'Ontem';
      else if (diffDays < 7) period = 'Esta semana';
      else if (diffDays < 30) period = 'Este mês';
      else if (diffDays < 90) period = 'Últimos 3 meses';
      else period = format(eventDate, 'MMMM yyyy', { locale: ptBR });

      if (!groups[period]) {
        groups[period] = [];
      }
      groups[period].push(event);
    });

    return groups;
  }, [filteredEvents]);

  // Estatísticas
  const stats = useMemo(() => {
    return {
      sessions: soapRecords.length,
      surgeries: surgeries.length,
      goals: goals.filter(g => g.status === 'concluido').length,
      totalGoals: goals.length,
      measurements: measurements.length,
      attachments: attachments.length
    };
  }, [soapRecords, surgeries, goals, measurements, attachments]);

  const toggleExpand = useCallback((eventId: string) => {
    setExpandedEvents(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(eventId)) {
        newExpanded.delete(eventId);
      } else {
        newExpanded.add(eventId);
      }
      return newExpanded;
    });
  }, []);

  const handleViewSessionDetails = useCallback((session: SoapRecord) => {
    setSelectedSession(session);
    setShowSessionModal(true);
  }, []);

  const handleCopySession = useCallback((session: SoapRecord) => {
    if (onCopyEvolution) {
      onCopyEvolution(session);
    }
  }, [onCopyEvolution]);

  // Teclado shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Esc para fechar modal
      if (e.key === 'Escape' && showSessionModal) {
        setShowSessionModal(false);
        setSelectedSession(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSessionModal]);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Linha do Tempo
              {showGamification && !isLoadingGamification && (
                <div className="flex items-center gap-2 ml-2">
                  <Badge variant="secondary" className="gap-0.5 px-2 py-0.5">
                    <Trophy className="h-3 w-3 text-amber-500" />
                    Level {currentLevel}
                  </Badge>
                  {unlockedAchievements.length > 0 && (
                    <Badge variant="outline" className="gap-0.5 px-2 py-0.5 text-xs">
                      🏆 {unlockedAchievements.length}
                    </Badge>
                  )}
                </div>
              )}
            </CardTitle>

            {showFilters && (
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant={compactView ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCompactView(!compactView)}
                  className="h-8"
                >
                  {compactView ? 'Detalhado' : 'Compacto'}
                </Button>

                <Select value={filterType} onValueChange={(v) => setFilterType(v as TimelineEventType | 'all')}>
                  <SelectTrigger className="w-[140px] h-8">
                    <Filter className="h-3.5 w-3.5 mr-2" />
                    <SelectValue placeholder="Filtrar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {Object.entries(EVENT_TYPE_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-[180px] pl-8 h-8 text-sm"
                  />
                </div>

                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'timeline' | 'list')}>
                  <TabsList className="h-8">
                    <TabsTrigger value="timeline" className="text-xs h-7">
                      Timeline
                    </TabsTrigger>
                    <TabsTrigger value="list" className="text-xs h-7">
                      Lista
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <Badge variant="outline" className="gap-1.5 px-3 py-1">
              <FileText className="h-3 w-3" />
              <span className="font-medium">{stats.sessions} sessões</span>
            </Badge>
            <Badge variant="outline" className="gap-1.5 px-3 py-1">
              <Bone className="h-3 w-3" />
              <span className="font-medium">{stats.surgeries} cirurgias</span>
            </Badge>
            <Badge variant="outline" className="gap-1.5 px-3 py-1">
              <Target className="h-3 w-3" />
              <span className="font-medium">{stats.goals}/{stats.totalGoals} metas</span>
            </Badge>
            <Badge variant="outline" className="gap-1.5 px-3 py-1">
              <Activity className="h-3 w-3" />
              <span className="font-medium">{stats.measurements} medições</span>
            </Badge>
            <Badge variant="outline" className="gap-1.5 px-3 py-1">
              <ImageIcon className="h-3 w-3" />
              <span className="font-medium">{stats.attachments} anexos</span>
            </Badge>
          </div>

          {/* Gamification Progress Panel */}
          {showGamification && (
            <div className="space-y-4">
              {/* Level Progress */}
              {!isLoadingGamification && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                      <span className="text-sm font-bold text-white">Lvl {currentLevel}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold">Progresso de Nível</span>
                        <span className="text-xs text-muted-foreground">{currentXp} XP</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {Math.round(progressPercentage)}% completo
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Achievements Panel */}
              {!isLoadingGamification && unlockedAchievements.length > 0 && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">🏆</span>
                    <h3 className="font-semibold text-sm">Conquistas Recentes</h3>
                    <Badge variant="outline" className="h-5 px-1.5 text-xs">
                      {unlockedAchievements.length} novas
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {unlockedAchievements.slice(0, 6).map((achievement) => (
                      <div
                        key={achievement.id}
                        className="flex items-center gap-1 px-2 py-1 bg-background rounded-lg border border-amber-200 dark:border-amber-700 cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                      >
                        <span className="text-xs">🎯</span>
                        <span className="text-xs font-medium line-clamp-1 min-w-0">
                          {achievement.achievement_title}
                        </span>
                      </div>
                    ))}
                    {unlockedAchievements.length > 6 && (
                      <div className="flex items-center px-2 py-1 bg-muted rounded-lg text-muted-foreground text-xs">
                        +{unlockedAchievements.length - 6} mais
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Loading skeleton for gamification */}
              {isLoadingGamification && (
                <div className="bg-muted/30 border border-muted rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-2 w-full rounded-full" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent>
          {filteredEvents.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Calendar className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="font-medium">Nenhum evento encontrado</p>
              <p className="text-sm mt-1">Tente ajustar os filtros ou a busca</p>
              {searchQuery && (
                <Button
                  variant="link"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterType('all');
                  }}
                  className="mt-4"
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          ) : viewMode === 'timeline' ? (
            <ScrollArea className={compactView ? 'h-[500px] pr-4' : 'h-[600px] pr-4'}>
              <div className="relative">
                {/* Linha central */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

                {/* Eventos */}
                <div className="space-y-5">
                  {Object.entries(groupedEvents).map(([period, events]) => (
                    <div key={period}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm">
                          <span className="text-xs font-bold text-primary-foreground">
                            {events.length}
                          </span>
                        </div>
                        <h3 className="font-semibold text-sm">{period}</h3>
                      </div>

                      <div className="ml-14 space-y-3">
                        {events.map((event) => {
                          const config = EVENT_TYPE_CONFIG[event.type];
                          const isExpanded = expandedEvents.has(event.id);
                          const isSession = event.type === 'session';

                          return (
                            <div
                              key={event.id}
                              className={cn(
                                "border rounded-xl p-4 transition-all cursor-pointer hover:shadow-lg hover:scale-[1.02] duration-200 relative",
                                config.bgColor,
                                config.borderColor,
                                isRecentEvent(event.date) && "ring-2 ring-green-400/50 dark:ring-green-400/30"
                              )}
                            >
                              {isRecentEvent(event.date) && (
                                <div className="absolute -top-1 -right-1">
                                  <div className="animate-pulse">
                                    <div className="w-2 h-2 bg-green-500 rounded-full shadow-lg shadow-green-500/50" />
                                  </div>
                                </div>
                              )}
                              <div className="flex items-start gap-3">
                                <div className={cn("mt-0.5 shrink-0", config.color)}>
                                  {config.icon}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="font-medium text-sm truncate">
                                      {event.title}
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {formatDistanceToNow(event.date, {
                                          locale: ptBR,
                                          addSuffix: true
                                        })}
                                      </span>
                                      {isSession && (
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] h-5 px-1.5 bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300"
                                        >
                                          Sessão
                                        </Badge>
                                      )}
                                    </div>
                                  </div>

                                  {event.description && (
                                    <p className={cn(
                                      "text-sm text-muted-foreground mt-1",
                                      !isExpanded && !compactView && "line-clamp-1"
                                    )}>
                                      {event.description}
                                    </p>
                                  )}

                                  {/* Detalhes expandidos */}
                                  {!compactView && isExpanded && event.data && (
                                    <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                                      {event.type === 'session' && (
                                        <>
                                          <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                              <span className="text-muted-foreground">Sessão:</span>{' '}
                                              <span className="font-medium">#{(event.data as SoapRecord).session_number}</span>
                                            </div>
                                            <div>
                                              <span className="text-muted-foreground">Status:</span>{' '}
                                              <Badge variant="outline" className="text-[10px]">
                                                {(event.data as SoapRecord).status === 'finalized' ? 'Finalizada' : 'Rascunho'}
                                              </Badge>
                                            </div>
                                          </div>
                                          {(event.data as SoapRecord).pain_level !== undefined && (
                                            <div className="text-xs">
                                              <span className="text-muted-foreground">EVA:</span>{' '}
                                              <span className="font-medium">{(event.data as SoapRecord).pain_level}/10</span>
                                            </div>
                                          )}

                                          {/* Resumo SOAP */}
                                          {((event.data as SoapRecord).subjective ||
                                            (event.data as SoapRecord).objective ||
                                            (event.data as SoapRecord).assessment ||
                                            (event.data as SoapRecord).plan) && (
                                              <div className="mt-2 space-y-1.5">
                                                {(event.data as SoapRecord).subjective && (
                                                  <div className="text-xs bg-blue-50 dark:bg-blue-950/20 p-2 rounded-lg">
                                                    <span className="font-semibold text-blue-600">S:</span>{' '}
                                                    <span className="line-clamp-2">{(event.data as SoapRecord).subjective}</span>
                                                  </div>
                                                )}
                                                {(event.data as SoapRecord).objective && (
                                                  <div className="text-xs bg-green-50 dark:bg-green-950/20 p-2 rounded-lg">
                                                    <span className="font-semibold text-green-600">O:</span>{' '}
                                                    <span className="line-clamp-2">{(event.data as SoapRecord).objective}</span>
                                                  </div>
                                                )}
                                                {(event.data as SoapRecord).assessment && (
                                                  <div className="text-xs bg-purple-50 dark:bg-purple-950/20 p-2 rounded-lg">
                                                    <span className="font-semibold text-purple-600">A:</span>{' '}
                                                    <span className="line-clamp-2">{(event.data as SoapRecord).assessment}</span>
                                                  </div>
                                                )}
                                                {(event.data as SoapRecord).plan && (
                                                  <div className="text-xs bg-amber-50 dark:bg-amber-950/20 p-2 rounded-lg">
                                                    <span className="font-semibold text-amber-600">P:</span>{' '}
                                                    <span className="line-clamp-2">{(event.data as SoapRecord).plan}</span>
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                        </>
                                      )}

                                      {event.type === 'surgery' && (
                                        <div className="text-xs space-y-1">
                                          <div><span className="text-muted-foreground">Data:</span> {format(new Date(event.data.surgery_date), 'dd/MM/yyyy', { locale: ptBR })}</div>
                                          {event.data.affected_side && (
                                            <div><span className="text-muted-foreground">Lado:</span> {event.data.affected_side}</div>
                                          )}
                                          {event.data.notes && (
                                            <div><span className="text-muted-foreground">Obs:</span> {event.data.notes}</div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  {isSession && onCopyEvolution && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopySession(event.data as SoapRecord);
                                      }}
                                      title="Copiar evolução"
                                    >
                                      <Copy className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                  {isSession && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleViewSessionDetails(event.data as SoapRecord);
                                      }}
                                      title="Ver detalhes completos"
                                    >
                                      <Maximize2 className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                  {!compactView && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleExpand(event.id);
                                      }}
                                    >
                                      {isExpanded ? (
                                        <ChevronUp className="h-4 w-4" />
                                      ) : (
                                        <ChevronDown className="h-4 w-4" />
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          ) : (
            <ScrollArea className={compactView ? 'h-[500px]' : 'h-[600px]'}>
              <div className="divide-y">
                {filteredEvents.map((event) => {
                  const config = EVENT_TYPE_CONFIG[event.type];
                  const isSession = event.type === 'session';
                  return (
                    <div
                      key={event.id}
                      className={cn(
                        "flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors cursor-pointer hover:scale-[1.01] duration-200",
                        config.bgColor
                      )}
                      onClick={() => isSession && handleViewSessionDetails(event.data as SoapRecord)}
                    >
                      <div className={cn("shrink-0", config.color)}>
                        {config.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {event.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {event.description}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                        {format(event.date, 'dd/MM/yyyy')}
                      </span>
                      {isSession && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewSessionDetails(event.data as SoapRecord);
                          }}
                          title="Ver detalhes"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes da Sessão */}
      {selectedSession && (
        <SessionDetailsModal
          session={selectedSession}
          measurements={measurements}
          attachments={attachments}
          isOpen={showSessionModal}
          onClose={() => {
            setShowSessionModal(false);
            setSelectedSession(null);
          }}
        />
      )}
    </>
  );
};

export default EvolutionTimeline;
