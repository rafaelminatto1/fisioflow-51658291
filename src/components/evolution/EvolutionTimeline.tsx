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
 *
 * NOTA: SessionDetailsModal + helpers/config foram extraídos para ./timeline/*.
 * As derivações (eventos/filtro/agrupamento/stats) são memoizadas para não
 * recomputar a timeline inteira a cada tecla digitada na busca.
 */

import { isValid } from "date-fns";
import {
  Activity,
  Bone,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Eye,
  FileText,
  Filter,
  Image as ImageIcon,
  Maximize2,
  Search,
  Target,
  Trophy,
} from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGamification } from "@/hooks/useGamification";
import {
  useEvolutionMeasurements,
  usePatientGoals,
  usePatientPathologies,
  usePatientSurgeries,
} from "@/hooks/usePatientEvolution";
import { type SoapRecord, useSessionAttachments, useSoapRecords } from "@/hooks/useSoapRecords";
import { getAffectedSideAbbreviation } from "@/lib/constants/surgery";
import { cn } from "@/lib/utils";
import { stripHtml } from "@/lib/utils/stripHtml";
import type { TimelineEvent, TimelineEventType } from "@/types/evolution";
import { SessionDetailsModal } from "./timeline/SessionDetailsModal";
import { EVENT_TYPE_CONFIG, safeFormat, safeFormatDistance } from "./timeline/timelineUtils";

interface EvolutionTimelineProps {
  patientId: string;
  limit?: number;
  showFilters?: boolean;
  showGamification?: boolean;
  onCopyEvolution?: (evolution: SoapRecord) => void;
}

export const EvolutionTimeline: React.FC<EvolutionTimelineProps> = ({
  patientId,
  limit = 50,
  showFilters = true,
  showGamification = true,
  onCopyEvolution,
}) => {
  const {
    isLoading: isLoadingGamification,
    currentLevel,
    currentXp,
    progressPercentage,
    unlockedAchievements,
  } = useGamification(patientId);
  const [filterType, setFilterType] = useState<TimelineEventType | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"timeline" | "list">("timeline");
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [selectedSession, setSelectedSession] = useState<SoapRecord | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [compactView, setCompactView] = useState(false);

  // Buscar todos os dados do paciente
  const { data: soapRecords = [] } = useSoapRecords(patientId, limit);
  const { data: surgeries = [] } = usePatientSurgeries(patientId);
  const { data: goals = [] } = usePatientGoals(patientId);
  const { data: pathologies = [] } = usePatientPathologies(patientId);
  const { data: measurements = [] } = useEvolutionMeasurements(patientId, {
    limit: 200,
  });
  const { data: attachments = [] } = useSessionAttachments(undefined, patientId);

  // Construir timeline de eventos (memoizado: só recomputa quando os dados mudam)
  const timelineEvents = useMemo<TimelineEvent[]>(() => {
    const events: TimelineEvent[] = [];

    // Adicionar sessões SOAP
    soapRecords.forEach((record) => {
      const obsText = stripHtml(record.observacao || "");
      const hasContent = obsText.length > 0;

      const legacySoap = [
        record.subjective && "S",
        record.objective && "O",
        record.assessment && "A",
        record.plan && "P",
      ].filter(Boolean);

      const hasAttachments = attachments.some((a) => a.soap_record_id === record.id);
      const hasExercises = record.appointment_id; // Indicador que pode ter exercícios
      const painValue = record.pain_scale ?? record.pain_level;

      events.push({
        id: `soap-${record.id}`,
        type: "session",
        date: new Date(record.created_at),
        title: `Sessão ${record.session_number || "?"} - ${safeFormat(record.created_at, "dd/MM/yyyy")}`,
        description: hasContent
          ? `${obsText.slice(0, 80)}${obsText.length > 80 ? "..." : ""}${painValue != null ? ` | EVA: ${painValue}/10` : ""}${hasAttachments ? " | 📎" : ""}`
          : legacySoap.length > 0
            ? `SOAP: ${legacySoap.join(" - ")}${painValue != null ? ` | EVA: ${painValue}/10` : ""}${hasAttachments ? " | 📎" : ""}`
            : "Sessão registrada",
        data: { ...record, hasAttachments, hasExercises },
      });
    });

    // Adicionar cirurgias
    surgeries.forEach((surgery) => {
      events.push({
        id: `surgery-${surgery.id}`,
        type: "surgery",
        date: new Date(surgery.surgery_date),
        title: surgery.surgery_name,
        description: surgery.affected_side ? `Lado: ${surgery.affected_side}` : undefined,
        data: surgery,
      });
    });

    // Adicionar metas (criadas e concluídas)
    goals.forEach((goal) => {
      events.push({
        id: `goal-${goal.id}`,
        type: "goal",
        date: new Date(goal.created_at),
        title: `Meta: ${goal.goal_title}`,
        description: goal.goal_description,
        data: { ...goal, eventSubType: "created" },
      });

      if (goal.status === "concluido" && goal.completed_at) {
        events.push({
          id: `goal-completed-${goal.id}`,
          type: "goal",
          date: new Date(goal.completed_at),
          title: `✓ Meta Concluída: ${goal.goal_title}`,
          description: goal.goal_description,
          data: { ...goal, eventSubType: "completed" },
        });
      }
    });

    // Adicionar patologias
    pathologies.forEach((pathology) => {
      events.push({
        id: `pathology-${pathology.id}`,
        type: "pathology",
        date: new Date(pathology.diagnosis_date || pathology.created_at),
        title: `Patologia: ${pathology.pathology_name}`,
        description: `Status: ${pathology.status}`,
        data: pathology,
      });
    });

    // Adicionar medições
    measurements.forEach((measurement) => {
      events.push({
        id: `measurement-${measurement.id}`,
        type: "measurement",
        date: new Date(measurement.measured_at),
        title: `${measurement.measurement_name}: ${measurement.value}${measurement.unit || ""}`,
        description: measurement.notes,
        data: measurement,
      });
    });

    // Adicionar anexos
    attachments.forEach((attachment) => {
      events.push({
        id: `attachment-${attachment.id}`,
        type: "attachment",
        date: new Date(attachment.uploaded_at),
        title: attachment.original_name || attachment.file_name,
        description: `${attachment.category}${attachment.description ? ` - ${attachment.description}` : ""}`,
        data: attachment,
      });
    });

    // Ordenar por data (mais recente primeiro)
    return events.sort((a, b) => {
      const timeA = a.date.getTime();
      const timeB = b.date.getTime();
      if (isNaN(timeA) && isNaN(timeB)) return 0;
      if (isNaN(timeA)) return 1;
      if (isNaN(timeB)) return -1;
      return timeB - timeA;
    });
  }, [soapRecords, surgeries, goals, pathologies, measurements, attachments]);

  // Filtrar eventos (memoizado por filtros + dados)
  const filteredEvents = useMemo<TimelineEvent[]>(() => {
    let filtered = timelineEvents;

    // Filtro por tipo
    if (filterType !== "all") {
      filtered = filtered.filter((e) => e.type === filterType);
    }

    // Filtro por busca
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.title.toLowerCase().includes(searchLower) ||
          (e.description && e.description.toLowerCase().includes(searchLower)),
      );
    }

    // Limitar resultados
    return filtered.slice(0, limit);
  }, [timelineEvents, filterType, searchQuery, limit]);

  // Verificar se evento é recente (últimas 24 horas)
  const isRecentEvent = (eventDate: Date) => {
    const now = new Date();
    const diffHours = (now.getTime() - eventDate.getTime()) / (1000 * 60 * 60);
    return diffHours <= 24;
  };

  // Agrupar eventos por período (memoizado)
  const groupedEvents = useMemo<Record<string, TimelineEvent[]>>(() => {
    const groups: Record<string, TimelineEvent[]> = {};

    filteredEvents.forEach((event) => {
      const now = new Date();
      const eventDate = event.date;

      // Validar data para evitar RangeError: Invalid time value
      if (!isValid(eventDate)) {
        const period = "Data Inválida";
        if (!groups[period]) groups[period] = [];
        groups[period].push(event);
        return;
      }

      const diffDays = Math.floor((now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24));

      let period = "";
      if (diffDays === 0) period = "Hoje";
      else if (diffDays === 1) period = "Ontem";
      else if (diffDays < 7) period = "Esta semana";
      else if (diffDays < 30) period = "Este mês";
      else if (diffDays < 90) period = "Últimos 3 meses";
      else period = safeFormat(eventDate, "MMMM yyyy");

      if (!groups[period]) {
        groups[period] = [];
      }
      groups[period].push(event);
    });

    return groups;
  }, [filteredEvents]);

  // Estatísticas (memoizado)
  const stats = useMemo(
    () => ({
      sessions: soapRecords.length,
      surgeries: surgeries.length,
      goals: goals.filter((g) => g.status === "concluido").length,
      totalGoals: goals.length,
      measurements: measurements.length,
      attachments: attachments.length,
    }),
    [soapRecords, surgeries, goals, measurements, attachments],
  );

  const toggleExpand = useCallback((eventId: string) => {
    setExpandedEvents((prev) => {
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

  const handleCopySession = useCallback(
    (session: SoapRecord) => {
      if (onCopyEvolution) {
        onCopyEvolution(session);
      }
    },
    [onCopyEvolution],
  );

  // Teclado shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Esc para fechar modal
      if (e.key === "Escape" && showSessionModal) {
        setShowSessionModal(false);
        setSelectedSession(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
                  {compactView ? "Detalhado" : "Compacto"}
                </Button>

                <Select
                  value={filterType}
                  onValueChange={(v) => setFilterType(v as TimelineEventType | "all")}
                >
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

                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "timeline" | "list")}>
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
              <span className="font-medium">
                {stats.goals}/{stats.totalGoals} metas
              </span>
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
                    setSearchQuery("");
                    setFilterType("all");
                  }}
                  className="mt-4"
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          ) : viewMode === "timeline" ? (
            <ScrollArea className={compactView ? "h-[500px] pr-4" : "h-[600px] pr-4"}>
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
                          const isSession = event.type === "session";

                          return (
                            <div
                              key={event.id}
                              className={cn(
                                "border rounded-xl p-4 transition-all cursor-pointer hover:shadow-lg hover:scale-[1.02] duration-200 relative",
                                config.bgColor,
                                config.borderColor,
                                isRecentEvent(event.date) &&
                                  "ring-2 ring-green-400/50 dark:ring-green-400/30",
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
                                    <p className="font-medium text-sm truncate">{event.title}</p>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {safeFormatDistance(event.date)}
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
                                    <p
                                      className={cn(
                                        "text-sm text-muted-foreground mt-1",
                                        !isExpanded && !compactView && "line-clamp-1",
                                      )}
                                    >
                                      {event.description}
                                    </p>
                                  )}

                                  {/* Detalhes expandidos */}
                                  {!compactView && isExpanded && event.data && (
                                    <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                                      {event.type === "session" && (
                                        <>
                                          <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                              <span className="text-muted-foreground">Sessão:</span>{" "}
                                              <span className="font-medium">
                                                #{(event.data as SoapRecord).session_number}
                                              </span>
                                            </div>
                                            <div>
                                              <span className="text-muted-foreground">Status:</span>{" "}
                                              <Badge variant="outline" className="text-[10px]">
                                                {(event.data as SoapRecord).status === "finalized"
                                                  ? "Finalizada"
                                                  : "Rascunho"}
                                              </Badge>
                                            </div>
                                          </div>
                                          {(() => {
                                            const rec = event.data as SoapRecord;
                                            const pain = rec.pain_scale ?? rec.pain_level;
                                            return pain != null ? (
                                              <div className="text-xs">
                                                <span className="text-muted-foreground">EVA:</span>{" "}
                                                <span className="font-medium">{pain}/10</span>
                                              </div>
                                            ) : null;
                                          })()}

                                          {(() => {
                                            const obs = (event.data as SoapRecord).observacao;
                                            if (!obs) return null;
                                            const plain = stripHtml(obs);
                                            if (!plain) return null;
                                            return (
                                              <div className="mt-2 text-xs p-2 rounded-lg bg-[#F7F6F3] dark:bg-zinc-900 line-clamp-3">
                                                {plain}
                                              </div>
                                            );
                                          })()}
                                        </>
                                      )}

                                      {event.type === "surgery" && (
                                        <div className="text-xs space-y-1">
                                          <div>
                                            <span className="text-muted-foreground">Data:</span>{" "}
                                            {safeFormat(event.data.surgery_date, "dd/MM/yyyy")}
                                          </div>
                                          {event.data.affected_side &&
                                            event.data.affected_side !== "nao_aplicavel" && (
                                              <div>
                                                <span className="text-muted-foreground">Lado:</span>{" "}
                                                {getAffectedSideAbbreviation(
                                                  event.data.affected_side,
                                                )}
                                              </div>
                                            )}
                                          {event.data.complications && (
                                            <div className="text-destructive font-medium flex items-center gap-1">
                                              <span>⚠️</span> {event.data.complications}
                                            </div>
                                          )}
                                          {event.data.notes && (
                                            <div>
                                              <span className="text-muted-foreground">Obs:</span>{" "}
                                              {event.data.notes}
                                            </div>
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
            <ScrollArea className={compactView ? "h-[500px]" : "h-[600px]"}>
              <div className="divide-y">
                {filteredEvents.map((event) => {
                  const config = EVENT_TYPE_CONFIG[event.type];
                  const isSession = event.type === "session";
                  return (
                    <div
                      key={event.id}
                      className={cn(
                        "flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors cursor-pointer hover:scale-[1.01] duration-200",
                        config.bgColor,
                      )}
                      onClick={() =>
                        isSession && handleViewSessionDetails(event.data as SoapRecord)
                      }
                    >
                      <div className={cn("shrink-0", config.color)}>{config.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {event.description}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                        {safeFormat(event.date, "dd/MM/yyyy")}
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
