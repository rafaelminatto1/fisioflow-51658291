import React from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ChevronRight } from 'lucide-react';

interface ComparisonProps {
    records: any[];
    onClose: () => void;
}

export const AssessmentComparison: React.FC<ComparisonProps> = ({ records, onClose }) => {
    // Sort records by date ascending
    const sortedRecords = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return (
        <Card className="h-full border-none shadow-none">
            <CardHeader className="px-0 pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle>Comparativo de Avaliações</CardTitle>
                    <button
                        onClick={onClose}
                        className="text-sm text-primary hover:underline"
                    >
                        Voltar para lista
                    </button>
                </div>
                <p className="text-sm text-muted-foreground">
                    Comparando {records.length} avaliações
                </p>
            </CardHeader>

            <ScrollArea className="w-full whitespace-nowrap pb-4">
                <div className="flex w-max space-x-4">
                    {/* Labels Column */}
                    <div className="w-[200px] shrink-0 space-y-4 pt-14">
                        <div className="h-8 font-semibold text-sm flex items-center">Data</div>
                        <div className="h-8 font-semibold text-sm flex items-center">Terapeuta</div>
                        <Separator />
                        <div className="font-semibold text-primary pt-2">Sinais Vitais</div>
                        <div className="h-24 text-sm whitespace-normal text-muted-foreground">
                            Pressão Arterial, FC, Temp, Freq. Resp.
                        </div>
                        <Separator />
                        <div className="font-semibold text-primary pt-2">Exame Físico</div>
                        <div className="h-40 text-sm whitespace-normal text-muted-foreground">
                            Detalhes do exame físico
                        </div>
                        <Separator />
                        <div className="font-semibold text-primary pt-2">Diagnóstico</div>
                        <div className="h-20 text-sm whitespace-normal text-muted-foreground">
                            Diagnóstico Cinético-Funcional
                        </div>
                        <Separator />
                        <div className="font-semibold text-primary pt-2">Plano de Tratamento</div>
                        <div className="h-40 text-sm whitespace-normal text-muted-foreground">
                            Objetivos e Condutas
                        </div>
                    </div>

                    {/* Records Columns */}
                    {sortedRecords.map((record, index) => {
                        const isLatest = index === sortedRecords.length - 1;
                        const content = record.raw || {};
                        const vitalSigns = content.vital_signs || {};
                        const physicalExam = content.physical_exam || {}; // Expecting object
                        const treatmentPlan = content.treatment_plan?.plan || '';

                        return (
                            <div key={record.id} className={`w-[350px] shrink-0 border rounded-lg p-4 space-y-4 ${isLatest ? 'bg-primary/5 border-primary/20' : 'bg-card'}`}>
                                <div className="space-y-1 h-14">
                                    <div className="font-bold flex items-center gap-2">
                                        {format(new Date(record.date), 'dd/MM/yyyy')}
                                        {isLatest && <Badge variant="default" className="text-[10px] h-5">Mais Recente</Badge>}
                                    </div>
                                    <div className="text-sm text-muted-foreground">{record.therapist}</div>
                                </div>
                                <Separator />
                                <div className="pt-2"></div>
                                <div className="h-24 space-y-1 text-sm bg-muted/30 p-2 rounded">
                                    <div className="grid grid-cols-2 gap-1">
                                        <span className="text-muted-foreground">PA:</span> <span>{vitalSigns.bloodPressure || '-'}</span>
                                        <span className="text-muted-foreground">FC:</span> <span>{vitalSigns.heartRate || '-'}</span>
                                        <span className="text-muted-foreground">Temp:</span> <span>{vitalSigns.temperature || '-'}</span>
                                        <span className="text-muted-foreground">FR:</span> <span>{vitalSigns.respiratoryRate || '-'}</span>
                                    </div>
                                </div>
                                <Separator />
                                <div className="pt-2"></div>
                                <ScrollArea className="h-40 w-full rounded border p-2 bg-muted/30">
                                    <div className="text-sm space-y-2">
                                        {physicalExam.inspection && (
                                            <div>
                                                <span className="font-semibold text-xs text-muted-foreground block">Inspeção:</span>
                                                {physicalExam.inspection}
                                            </div>
                                        )}
                                        {physicalExam.palpation && (
                                            <div>
                                                <span className="font-semibold text-xs text-muted-foreground block">Palpação:</span>
                                                {physicalExam.palpation}
                                            </div>
                                        )}
                                        {(!physicalExam.inspection && !physicalExam.palpation) && (
                                            <span className="text-muted-foreground italic">Sem dados estruturados.</span>
                                        )}
                                    </div>
                                </ScrollArea>
                                <Separator />
                                <div className="pt-2"></div>
                                <ScrollArea className="h-20 w-full rounded border p-2 bg-muted/30">
                                    <p className="text-sm whitespace-pre-wrap">{content.diagnosis || 'Não informado'}</p>
                                </ScrollArea>
                                <Separator />
                                <div className="pt-2"></div>
                                <ScrollArea className="h-40 w-full rounded border p-2 bg-muted/30">
                                    <p className="text-sm whitespace-pre-wrap">{treatmentPlan || 'Não informado'}</p>
                                </ScrollArea>
                            </div>
                        );
                    })}
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </Card>
    );
};
