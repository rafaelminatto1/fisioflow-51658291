import React from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, Copy } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EvolutionTimeline } from '@/components/evolution/EvolutionTimeline';
import { SurgeryTimeline } from '@/components/evolution/SurgeryTimeline';
import { MedicalReportSuggestions } from '@/components/evolution/MedicalReportSuggestions';

interface Surgery {
  id: string;
  name: string;
  date: string;
  description?: string;
}

interface Evolution {
  id: string;
  patient_id: string;
  date: string;
  created_at: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

interface EvolutionHistoryTabProps {
    patientId: string;
    surgeries: Surgery[];
    previousEvolutions: Evolution[];
    onCopyEvolution: (evolution: Evolution) => void;
    showComparison: boolean;
    onToggleComparison: () => void;
}

export const EvolutionHistoryTab = React.memo(function EvolutionHistoryTab({
    patientId,
    surgeries,
    previousEvolutions,
    onCopyEvolution,
    showComparison,
    onToggleComparison
}: EvolutionHistoryTabProps) {
    return (
        <div className="mt-4 space-y-4">
            {/* Evolution Timeline */}
            {patientId && (
                <EvolutionTimeline
                    patientId={patientId}
                    showFilters
                    onCopyEvolution={onCopyEvolution}
                />
            )}

            {/* Surgery Timeline */}
            <SurgeryTimeline surgeries={surgeries} />

            {/* Medical Report Suggestions */}
            <MedicalReportSuggestions patientId={patientId || ''} />

            {/* Previous Evolutions */}
            {previousEvolutions.length > 0 && (
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="bg-muted/20">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                Evoluções Anteriores
                            </CardTitle>
                            <Badge variant="secondary" className="text-xs">
                                {previousEvolutions.length} registros
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <ScrollArea className="h-[320px] pr-4">
                            <div className="space-y-3">
                                {previousEvolutions.map((evolution, index) => (
                                    <div
                                        key={evolution.id}
                                        className="group border rounded-xl p-4 space-y-3 hover:bg-muted/50 hover:shadow-md transition-all cursor-pointer bg-card"
                                        onClick={onToggleComparison}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">
                                                    {previousEvolutions.length - index}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold">
                                                        {format(new Date(evolution.record_date), 'dd/MM/yyyy', { locale: ptBR })}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatDistanceToNow(new Date(evolution.record_date), { locale: ptBR, addSuffix: true })}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onCopyEvolution(evolution);
                                                }}
                                                className="hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            {evolution.subjective && (
                                                <div className="p-2 rounded-lg bg-blue-500/5 border border-blue-500/10">
                                                    <p className="font-semibold text-blue-600 dark:text-blue-400 mb-1">S:</p>
                                                    <p className="text-muted-foreground line-clamp-2">{evolution.subjective}</p>
                                                </div>
                                            )}
                                            {evolution.objective && (
                                                <div className="p-2 rounded-lg bg-green-500/5 border border-green-500/10">
                                                    <p className="font-semibold text-green-600 dark:text-green-400 mb-1">O:</p>
                                                    <p className="text-muted-foreground line-clamp-2">{evolution.objective}</p>
                                                </div>
                                            )}
                                            {evolution.assessment && (
                                                <div className="p-2 rounded-lg bg-purple-500/5 border border-purple-500/10">
                                                    <p className="font-semibold text-purple-600 dark:text-purple-400 mb-1">A:</p>
                                                    <p className="text-muted-foreground line-clamp-2">{evolution.assessment}</p>
                                                </div>
                                            )}
                                            {evolution.plan && (
                                                <div className="p-2 rounded-lg bg-orange-500/5 border border-orange-500/10">
                                                    <p className="font-semibold text-orange-600 dark:text-orange-400 mb-1">P:</p>
                                                    <p className="text-muted-foreground line-clamp-2">{evolution.plan}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            )}
        </div>
    );
});
