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
 * - Indicadores visuais de progresso
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Maximize2
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';

// Tipos de eventos na timeline
type TimelineEventType = 'session' | 'surgery' | 'goal' | 'pathology' | 'measurement' | 'attachment';

interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  date: Date;
  title: string;
  description?: string;
  data?: Record<string, unknown>;
  expanded?: boolean;
}

interface EvolutionTimelineProps {
  patientId: string;
  limit?: number;
  showFilters?: boolean;
  onCopyEvolution?: (evolution: SoapRecord) => void;
}

const EVENT_TYPE_CONFIG: Record<TimelineEventType, {
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}> = {
  session: {
    label: 'Sessões',
    icon: <FileText className="h-4 w-4" />,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/20'
  },
  surgery: {
    label: 'Cirurgias',
    icon: <Bone className="h-4 w-4" />,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-500/10 border-purple-500/20'
  },
  goal: {
    label: 'Metas',
    icon: <Target className="h-4 w-4" />,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-500/10 border-green-500/20'
  },
  pathology: {
    label: 'Patologias',
    icon: <AlertCircle className="h-4 w-4" />,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-500/10 border-orange-500/20'
  },
  measurement: {
    label: 'Medições',
    icon: <Activity className="h-4 w-4" />,
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-500/10 border-cyan-500/20'
  },
  attachment: {
    label: 'Anexos',
    icon: <ImageIcon className="h-4 w-4" />,
    color: 'text-pink-600 dark:text-pink-400',
    bgColor: 'bg-pink-500/10 border-pink-500/20'
  }
};

// Componente para visualização detalhada da sessão
const SessionDetailsModal: React.FC<{
  session: SoapRecord;
  measurements: any[];
  attachments: any[];
  isOpen: boolean;
  onClose: () => void;
}> = ({ session, measurements, attachments, isOpen, onClose }) => {
  // Buscar exercícios da sessão
  const [sessionExercises, setSessionExercises] = React.useState<any[]>([]);

  React.useEffect(() => {
    const fetchSessionExercises = async () => {
      if (!session.appointment_id) return;

      const { data } = await supabase
        .from('treatment_sessions')
        .select('exercises_performed')
        .eq('appointment_id', session.appointment_id)
        .maybeSingle();

      if (data?.exercises_performed) {
        setSessionExercises(data.exercises_performed);
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-lg font-semibold">
                Sessão {session.session_number || '?'} - {format(new Date(session.created_at), 'dd/MM/yyyy', { locale: ptBR })}
              </div>
              <div className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(session.created_at), { locale: ptBR, addSuffix: true })}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-140px)]">
          <div className="space-y-6 pr-4">
            {/* Escala de Dor */}
            {session.pain_level !== undefined && (
              <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-rose-600" />
                    <span className="font-semibold text-sm">Escala Visual Analógica (EVA)</span>
                  </div>
                  <Badge variant="outline" className={cn(
                    session.pain_level >= 7 ? 'bg-red-100 text-red-700 border-red-300' :
                    session.pain_level >= 4 ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                    'bg-green-100 text-green-700 border-green-300'
                  )}>
                    {session.pain_level}/10
                  </Badge>
                </div>
                {session.pain_location && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Localização:</span>{' '}
                    <span className="font-medium">{session.pain_location}</span>
                  </div>
                )}
                {session.pain_character && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Característica:</span>{' '}
                    <span className="font-medium">{session.pain_character}</span>
                  </div>
                )}
              </div>
            )}

            {/* SOAP */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Registro SOAP
              </h3>

              {session.subjective && (
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-blue-600">S</span>
                    </div>
                    <span className="font-semibold text-sm text-blue-700 dark:text-blue-300">Subjetivo</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{session.subjective}</p>
                </div>
              )}

              {session.objective && (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-green-600">O</span>
                    </div>
                    <span className="font-semibold text-sm text-green-700 dark:text-green-300">Objetivo</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{session.objective}</p>
                </div>
              )}

              {session.assessment && (
                <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-purple-500/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-purple-600">A</span>
                    </div>
                    <span className="font-semibold text-sm text-purple-700 dark:text-purple-300">Avaliação</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{session.assessment}</p>
                </div>
              )}

              {session.plan && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-amber-600">P</span>
                    </div>
                    <span className="font-semibold text-sm text-amber-700 dark:text-amber-300">Plano</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{session.plan}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Exercícios */}
            {sessionExercises.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Dumbbell className="h-4 w-4 text-purple-600" />
                  Exercícios da Sessão ({sessionExercises.length})
                </h3>
                <div className="grid gap-3">
                  {sessionExercises.map((exercise, index) => (
                    <div key={index} className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm">{exercise.name}</h4>
                          {exercise.notes && (
                            <p className="text-xs text-muted-foreground mt-1">{exercise.notes}</p>
                          )}
                        </div>
                        <div className="flex gap-2 text-xs">
                          {exercise.sets && (
                            <Badge variant="outline" className="bg-white/50">
                              {exercise.sets} séries
                            </Badge>
                          )}
                          {exercise.repetitions && (
                            <Badge variant="outline" className="bg-white/50">
                              {exercise.repetitions} reps
                            </Badge>
                          )}
                          {exercise.load && exercise.load !== '0 kg' && (
                            <Badge variant="outline" className="bg-white/50">
                              {exercise.load}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Medições */}
            {sessionMeasurements.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-teal-600" />
                  Medições ({sessionMeasurements.length})
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {sessionMeasurements.map((measurement) => (
                    <div key={measurement.id} className="bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 rounded-xl p-4">
                      <div className="text-xs text-muted-foreground">{measurement.measurement_name}</div>
                      <div className="text-lg font-bold text-teal-700 dark:text-teal-300">
                        {measurement.value}{measurement.unit || ''}
                      </div>
                      {measurement.notes && (
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {measurement.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Anexos */}
            {sessionAttachments.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Camera className="h-4 w-4 text-pink-600" />
                  Anexos ({sessionAttachments.length})
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {sessionAttachments.map((attachment) => (
                    <div key={attachment.id} className="group relative rounded-lg overflow-hidden border border-border">
                      {attachment.file_type === 'pdf' ? (
                        <div className="aspect-square bg-muted flex items-center justify-center">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                        </div>
                      ) : attachment.thumbnail_url ? (
                        <img
                          src={attachment.thumbnail_url}
                          alt={attachment.original_name || attachment.file_name}
                          className="w-full aspect-square object-cover"
                        />
                      ) : (
                        <div className="aspect-square bg-muted flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => window.open(attachment.file_url, '_blank')}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metadados */}
            <div className="bg-muted/30 rounded-xl p-4 space-y-2 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Status:</span>
                <Badge variant="outline" className="text-[10px]">{session.status}</Badge>
              </div>
              {session.duration_minutes && (
                <div className="flex justify-between">
                  <span>Duração:</span>
                  <span>{session.duration_minutes} minutos</span>
                </div>
              )}
              {session.last_auto_save_at && (
                <div className="flex justify-between">
                  <span>Último auto-save:</span>
                  <span>{format(new Date(session.last_auto_save_at), 'HH:mm:ss')}</span>
                </div>
              )}
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
  onCopyEvolution
}) => {
  const [filterType, setFilterType] = useState<TimelineEventType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [selectedSession, setSelectedSession] = useState<SoapRecord | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);

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

      events.push({
        id: `soap-${record.id}`,
        type: 'session',
        date: new Date(record.created_at),
        title: `Sessão ${record.session_number || '?'} - ${format(new Date(record.created_at), 'dd/MM/yyyy', { locale: ptBR })}`,
        description: soapParts.length > 0
          ? `SOAP: ${soapParts.join(' - ')}${record.pain_level !== undefined ? ` | EVA: ${record.pain_level}/10` : ''}`
          : 'Sem descrição',
        data: record
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
          title: `Meta Concluída: ${goal.goal_title}`,
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
        description: `Categoria: ${attachment.category}`,
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

  const toggleExpand = (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  const handleViewSessionDetails = (session: SoapRecord) => {
    setSelectedSession(session);
    setShowSessionModal(true);
  };

  const handleCopySession = (session: SoapRecord) => {
    if (onCopyEvolution) {
      onCopyEvolution(session);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Linha do Tempo
            </CardTitle>

            {showFilters && (
              <div className="flex items-center gap-2 flex-wrap">
                {/* Filtro por tipo */}
                <Select value={filterType} onValueChange={(v) => setFilterType(v as TimelineEventType | 'all')}>
                  <SelectTrigger className="w-[140px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filtrar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os eventos</SelectItem>
                    {Object.entries(EVENT_TYPE_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Busca */}
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-[200px] pl-8"
                  />
                </div>

                {/* Toggle view mode */}
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'timeline' | 'list')}>
                  <TabsList className="h-8">
                    <TabsTrigger value="timeline" className="text-xs">
                      Timeline
                    </TabsTrigger>
                    <TabsTrigger value="list" className="text-xs">
                      Lista
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            )}
          </div>

          {/* Stats badges */}
          <div className="flex flex-wrap gap-2 mt-4">
            <Badge variant="outline" className="gap-1">
              <FileText className="h-3 w-3" />
              {stats.sessions} sessões
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Bone className="h-3 w-3" />
              {stats.surgeries} cirurgias
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Target className="h-3 w-3" />
              {stats.goals}/{stats.totalGoals} metas
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Activity className="h-3 w-3" />
              {stats.measurements} medições
            </Badge>
            <Badge variant="outline" className="gap-1">
              <ImageIcon className="h-3 w-3" />
              {stats.attachments} anexos
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Nenhum evento encontrado</p>
              {searchQuery && (
                <Button
                  variant="link"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterType('all');
                  }}
                  className="mt-2"
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          ) : viewMode === 'timeline' ? (
            <ScrollArea className="h-[600px] pr-4">
              <div className="relative">
                {/* Linha central */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

                {/* Eventos */}
                <div className="space-y-6">
                  {Object.entries(groupedEvents).map(([period, events]) => (
                    <div key={period}>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                          <span className="text-xs font-bold text-primary-foreground">
                            {events.length}
                          </span>
                        </div>
                        <h3 className="font-semibold text-sm">{period}</h3>
                      </div>

                      <div className="ml-12 space-y-3">
                        {events.map((event) => {
                          const config = EVENT_TYPE_CONFIG[event.type];
                          const isExpanded = expandedEvents.has(event.id);
                          const isSession = event.type === 'session';

                          return (
                            <div
                              key={event.id}
                              className={cn(
                                "border rounded-lg p-3 transition-all hover:shadow-md",
                                config.bgColor
                              )}
                            >
                              <div className="flex items-start gap-3">
                                <div className={cn("mt-0.5", config.color)}>
                                  {config.icon}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="font-medium text-sm truncate">
                                      {event.title}
                                    </p>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                      {formatDistanceToNow(event.date, {
                                        locale: ptBR,
                                        addSuffix: true
                                      })}
                                    </span>
                                  </div>

                                  {event.description && (
                                    <p className={cn(
                                      "text-sm text-muted-foreground mt-1",
                                      !isExpanded && "line-clamp-1"
                                    )}>
                                      {event.description}
                                    </p>
                                  )}

                                  {/* Detalhes expandidos */}
                                  {isExpanded && event.data && (
                                    <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                                      {event.type === 'session' && (
                                                                        <>
                                                                          <div className="grid grid-cols-2 gap-2 text-xs">
                                                                            <div>
                                                                              <span className="text-muted-foreground">Sessão:</span>{' '}
                                                                              #{(event.data as SoapRecord).session_number}
                                                                            </div>
                                                                            <div>
                                                                              <span className="text-muted-foreground">Status:</span>{' '}
                                                                              <Badge variant="outline" className="text-[10px]">
                                                                                {(event.data as SoapRecord).status}
                                                                              </Badge>
                                                                            </div>
                                                                          </div>
                                                                          {(event.data as SoapRecord).pain_level !== undefined && (
                                                                            <div className="text-xs">
                                                                              <span className="text-muted-foreground">EVA:</span>{' '}
                                                                              {(event.data as SoapRecord).pain_level}/10
                                                                            </div>
                                                                          )}

                                                                          {/* Resumo SOAP */}
                                                                          {((event.data as SoapRecord).subjective ||
                                                                            (event.data as SoapRecord).objective ||
                                                                            (event.data as SoapRecord).assessment ||
                                                                            (event.data as SoapRecord).plan) && (
                                                                            <div className="mt-2 space-y-1">
                                                                              {(event.data as SoapRecord).subjective && (
                                                                                <div className="text-xs bg-blue-50 dark:bg-blue-950/20 p-2 rounded">
                                                                                  <span className="font-semibold text-blue-600">S:</span>{' '}
                                                                                  <span className="line-clamp-2">{(event.data as SoapRecord).subjective}</span>
                                                                                </div>
                                                                              )}
                                                                              {(event.data as SoapRecord).objective && (
                                                                                <div className="text-xs bg-green-50 dark:bg-green-950/20 p-2 rounded">
                                                                                  <span className="font-semibold text-green-600">O:</span>{' '}
                                                                                  <span className="line-clamp-2">{(event.data as SoapRecord).objective}</span>
                                                                                </div>
                                                                              )}
                                                                              {(event.data as SoapRecord).assessment && (
                                                                                <div className="text-xs bg-purple-50 dark:bg-purple-950/20 p-2 rounded">
                                                                                  <span className="font-semibold text-purple-600">A:</span>{' '}
                                                                                  <span className="line-clamp-2">{(event.data as SoapRecord).assessment}</span>
                                                                                </div>
                                                                              )}
                                                                              {(event.data as SoapRecord).plan && (
                                                                                <div className="text-xs bg-amber-50 dark:bg-amber-950/20 p-2 rounded">
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
                                                                      className="h-7 w-7"
                                                                      onClick={() => handleCopySession(event.data as SoapRecord)}
                                                                      title="Copiar evolução"
                                                                    >
                                                                      <Copy className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                  )}
                                                                  {isSession && (
                                                                    <Button
                                                                      variant="ghost"
                                                                      size="icon"
                                                                      className="h-7 w-7"
                                                                      onClick={() => handleViewSessionDetails(event.data as SoapRecord)}
                                                                      title="Ver detalhes completos"
                                                                    >
                                                                      <Maximize2 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                  )}
                                                                  <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7"
                                                                    onClick={() => toggleExpand(event.id)}
                                                                  >
                                                                    {isExpanded ? (
                                                                      <ChevronUp className="h-4 w-4" />
                                                                    ) : (
                                                                      <ChevronDown className="h-4 w-4" />
                                                                    )}
                                                                  </Button>
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
                                            <ScrollArea className="h-[600px]">
                                              <div className="divide-y">
                                                {filteredEvents.map((event) => {
                                                  const config = EVENT_TYPE_CONFIG[event.type];
                                                  const isSession = event.type === 'session';
                                                  return (
                                                    <div
                                                      key={event.id}
                                                      className={cn(
                                                        "flex items-center gap-3 p-3 hover:bg-muted/50",
                                                        config.bgColor
                                                      )}
                                                    >
                                                      <div className={config.color}>
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
                                                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                        {format(event.date, 'dd/MM/yyyy')}
                                                      </span>
                                                      {isSession && (
                                                        <Button
                                                          variant="ghost"
                                                          size="icon"
                                                          className="h-7 w-7 shrink-0"
                                                          onClick={() => handleViewSessionDetails(event.data as SoapRecord)}
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
