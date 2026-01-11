import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { FileText, Copy, Calendar, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface SessionData {
    id: string;
    created_at: string;
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    pain_level_after?: number;
}

interface SessionHistoryPanelProps {
    sessions: SessionData[];
    onReplicate: (session: SessionData) => void;
}

export const SessionHistoryPanel = ({ sessions, onReplicate }: SessionHistoryPanelProps) => {
    if (!sessions || sessions.length === 0) {
        return (
            <Card className="h-full">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        Histórico Recente
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm text-center py-8">
                        Nenhuma evolução anterior encontrada.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Histórico Recente
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-[500px] px-4">
                    <Accordion type="single" collapsible className="w-full space-y-2">
                        {sessions.map((session, index) => (
                            <AccordionItem key={session.id} value={session.id} className="border rounded-lg px-2">
                                <AccordionTrigger className="hover:no-underline py-3">
                                    <div className="flex items-center justify-between w-full text-left pr-2">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-primary/10 p-2 rounded-full">
                                                <Calendar className="h-4 w-4 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">
                                                    {format(new Date(session.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {index === 0 ? 'Última Sessão' : 'Sessão Anterior'}
                                                </p>
                                            </div>
                                        </div>
                                        {session.pain_level_after !== undefined && (
                                            <Badge variant="outline" className="ml-2">
                                                Dor: {session.pain_level_after}
                                            </Badge>
                                        )}
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pt-2 pb-4 space-y-4">
                                    <div className="grid gap-2 text-sm">
                                        {session.subjective && (
                                            <div className="bg-muted/30 p-2 rounded">
                                                <span className="font-semibold text-xs text-blue-600">S:</span> {session.subjective}
                                            </div>
                                        )}
                                        {session.objective && (
                                            <div className="bg-muted/30 p-2 rounded">
                                                <span className="font-semibold text-xs text-green-600">O:</span> {session.objective}
                                            </div>
                                        )}
                                        {session.plan && (
                                            <div className="bg-muted/30 p-2 rounded">
                                                <span className="font-semibold text-xs text-orange-600">P:</span> {session.plan}
                                            </div>
                                        )}
                                    </div>
                                    <Button
                                        size="sm"
                                        className="w-full gap-2"
                                        variant="secondary"
                                        onClick={() => onReplicate(session)}
                                    >
                                        <Copy className="h-3 w-3" />
                                        Replicar Conduta
                                    </Button>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};
