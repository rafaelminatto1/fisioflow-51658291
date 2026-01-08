import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import { Brain, CheckCircle2, AlertTriangle, ArrowRight, Activity } from 'lucide-react';
import { AIAnalysisResult } from '@/services/ai/clinicalAnalysisService';

interface AIReportViewProps {
    report: AIAnalysisResult;
}

const AIReportView: React.FC<AIReportViewProps> = ({ report }) => {
    return (
        <div className="space-y-6">
            {/* Header / Summary */}
            <Card className="border-blue-100 bg-blue-50/50">
                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                    <div className="p-2 bg-blue-100 rounded-full">
                        <Brain className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <CardTitle className="text-lg text-blue-800">Análise PhysioScience Master AI</CardTitle>
                        <div className="flex gap-2 mt-1">
                            <Badge variant="secondary" className="bg-white text-blue-700">
                                Confiança: {report.confidence_overall_0_100}%
                            </Badge>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-blue-900 leading-relaxed font-medium bg-white p-3 rounded-md border border-blue-100">
                        {report.summary}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-lg border">
                            <h4 className="flex items-center gap-2 font-semibold text-slate-800 mb-2 text-sm">
                                <Activity className="w-4 h-4 text-slate-600" /> Análise Técnica
                            </h4>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                {report.technical_analysis}
                            </p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                            <h4 className="flex items-center gap-2 font-semibold text-green-800 mb-2 text-sm">
                                <CheckCircle2 className="w-4 h-4 text-green-600" /> Resumo para Paciente
                            </h4>
                            <p className="text-sm text-green-700 leading-relaxed">
                                {report.patient_summary}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Key Findings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="w-4 h-4" /> Principais Achados</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        {report.key_findings.map((item, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-sm">
                                {item.confidence === 'HIGH' ?
                                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" /> :
                                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
                                }
                                <span>{item.text}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle className="text-base flex items-center gap-2"><ArrowRight className="w-4 h-4" /> Plano de Ação</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        <div>
                            <h4 className="text-xs font-bold text-green-700 mb-1 uppercase">Melhorias Observadas</h4>
                            <ul className="list-disc list-inside text-sm text-muted-foreground">
                                {report.improvements.map((imp, i) => <li key={i}>{imp}</li>)}
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-amber-700 mb-1 uppercase">Foco de Correção</h4>
                            <ul className="list-disc list-inside text-sm text-muted-foreground">
                                {report.still_to_improve.map((imp, i) => <li key={i}>{imp}</li>)}
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Markdown Table */}
            <Card>
                <CardHeader><CardTitle className="text-base">Métricas Detalhadas</CardTitle></CardHeader>
                <CardContent className="prose prose-sm max-w-none prose-table:border prose-th:bg-muted prose-td:p-2">
                    <ReactMarkdown>{report.metrics_table_markdown}</ReactMarkdown>
                </CardContent>
            </Card>

            {/* Suggested Exercises */}
            <Card>
                <CardHeader><CardTitle className="text-base">Exercícios Sugeridos</CardTitle></CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {report.suggested_exercises.map((ex, idx) => (
                            <div key={idx} className="border rounded-lg p-4 bg-slate-50">
                                <h4 className="font-bold text-sm mb-1">{ex.name}</h4>
                                <div className="text-xs text-muted-foreground mb-2">{ex.sets} séries x {ex.reps}</div>
                                <p className="text-xs italic mb-2">"{ex.goal}"</p>
                                <div className="text-[10px] space-y-1">
                                    <p><span className="font-semibold text-green-600">Prog:</span> {ex.progression}</p>
                                    <p><span className="font-semibold text-amber-600">Reg:</span> {ex.regression}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Disclaimer */}
            <div className="bg-amber-50 border border-amber-200 rounded p-4 text-xs text-amber-800 flex gap-3 items-start">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <div>
                    <span className="font-bold">AVISO LEGAL:</span> {report.disclaimer}
                    <br />
                    {report.red_flags_generic.length > 0 && (
                        <span className="mt-1 block">
                            <strong>Red Flags:</strong> {report.red_flags_generic.join(', ')}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AIReportView;
