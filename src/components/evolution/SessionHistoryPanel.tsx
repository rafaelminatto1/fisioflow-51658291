import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {

  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  History,
  ChevronDown,
  ChevronRight,
  Copy,
  Calendar,
  User,
  Activity,
  FileText,
  Loader2,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSoapRecords } from '@/hooks/useSoapRecords';
import { cn } from '@/lib/utils';

interface SessionHistoryPanelProps {
  patientId: string;
  onReplicateConduct?: (conduct: { plan?: string; subjective?: string; objective?: string; assessment?: string }) => void;
  onSelectSession?: (sessionId: string) => void;
  maxItems?: number;
}

export const SessionHistoryPanel: React.FC<SessionHistoryPanelProps> = ({
  patientId,
  onReplicateConduct,
  onSelectSession: _onSelectSession,
  maxItems = 10,
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const { data: records = [], isLoading } = useSoapRecords(patientId, maxItems);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-5 w-5 text-primary" />
            Histórico de Sessões
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-5 w-5 text-primary" />
            Histórico de Sessões
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {records.length} registros
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-4 pb-4">
          {records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma sessão anterior</p>
              <p className="text-xs text-muted-foreground">
                As evoluções aparecerão aqui
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {records.map((record, index) => {
                const isExpanded = expandedIds.has(record.id);
                const recordDate = new Date(record.record_date);
                const hasContent =
                  record.subjective || record.objective || record.assessment || record.plan;

                return (
                  <Collapsible
                    key={record.id}
                    open={isExpanded}
                    onOpenChange={() => toggleExpanded(record.id)}
                  >
                    <div
                      className={cn(
                        'rounded-lg border transition-all',
                        isExpanded && 'bg-muted/30'
                      )}
                    >
                      <CollapsibleTrigger asChild>
                        <button className="w-full p-3 flex items-start gap-3 text-left hover:bg-muted/50 rounded-lg transition-colors">
                          <div className="flex-shrink-0 mt-0.5">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">
                                Sessão #{records.length - index}
                              </span>
                              {record.signed_at && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0">
                                  Assinado
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {format(recordDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </span>
                              <span className="text-muted-foreground/50">•</span>
                              <span>
                                {formatDistanceToNow(recordDate, {
                                  addSuffix: true,
                                  locale: ptBR,
                                })}
                              </span>
                            </div>

                            {!isExpanded && hasContent && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {truncateText(
                                  record.subjective || record.objective || record.plan || '',
                                  80
                                )}
                              </p>
                            )}
                          </div>
                        </button>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="px-3 pb-3 pt-1 space-y-3">
                          {record.subjective && (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-blue-500 flex items-center gap-1">
                                <User className="h-3 w-3" />
                                Subjetivo
                              </p>
                              <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                                {record.subjective}
                              </p>
                            </div>
                          )}

                          {record.objective && (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-green-500 flex items-center gap-1">
                                <Activity className="h-3 w-3" />
                                Objetivo
                              </p>
                              <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                                {record.objective}
                              </p>
                            </div>
                          )}

                          {record.assessment && (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-purple-500">Avaliação</p>
                              <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                                {record.assessment}
                              </p>
                            </div>
                          )}

                          {record.plan && (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-amber-500">Plano</p>
                              <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                                {record.plan}
                              </p>
                            </div>
                          )}

                          {/* Only Plan button logic changed to callback usage */}
                          {onReplicateConduct && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full h-8 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                onReplicateConduct({
                                  plan: record.plan || undefined,
                                  subjective: record.subjective || undefined,
                                  objective: record.objective || undefined,
                                  assessment: record.assessment || undefined
                                });
                              }}
                            >
                              <Copy className="h-3 w-3 mr-2" />
                              Replicar Esta Evolução
                            </Button>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
