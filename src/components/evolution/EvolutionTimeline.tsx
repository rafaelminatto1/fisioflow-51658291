/**
 * EvolutionTimeline - Linha do tempo completa de eventos do paciente
 * RF01.5 - Visualização cronológica e interativa de todas as evoluções
 *
 * Features:
 * - Timeline visual com todos os tipos de eventos
 * - Filtro por tipo de evento (sessão, avaliação, anexo, cirurgia, meta)
 * - Busca por texto
 * - Expansão/colapso de detalhes
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
  Clock
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

export const EvolutionTimeline: React.FC<EvolutionTimelineProps> = ({
  patientId,
  limit = 50,
  showFilters = true
}) => {
  const [filterType, setFilterType] = useState<TimelineEventType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

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
      events.push({
        id: `soap-${record.id}`,
        type: 'session',
        date: new Date(record.created_at),
        title: `Sessão ${record.session_number || '?'} - ${format(new Date(record.created_at), 'dd/MM/yyyy', { locale: ptBR })}`,
        description: record.subjective || record.assessment || 'Sem descrição',
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

  return (
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

                        return (
                          <div
                            key={event.id}
                            className={cn(
                              "border rounded-lg p-3 transition-all cursor-pointer hover:shadow-md",
                              config.bgColor
                            )}
                            onClick={() => toggleExpand(event.id)}
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

                                                              <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 shrink-0"
                                                              >
                                                                {isExpanded ? (
                                                                  <ChevronUp className="h-4 w-4" />
                                                                ) : (
                                                                  <ChevronDown className="h-4 w-4" />
                                                                )}
                                                              </Button>
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
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </ScrollArea>
                                        )}
                                      </CardContent>
                                    </Card>
                                  );
                                };

                                export default EvolutionTimeline;
