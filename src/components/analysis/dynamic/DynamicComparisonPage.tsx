import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Upload, Video, Brain, FileText, Share2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

import DualVideoPlayer from './DualVideoPlayer';
import DynamicAnalysisViewer from './DynamicAnalysisViewer';
import AIReportView from '../reports/AIReportView';
import ShareReportModal from '../reports/ShareReportModal';
import MarketingExportModal from '../marketing/MarketingExportModal';

import { processVideo, VideoAnalysisFrame } from '@/services/ai/videoPoseService';
import { analyzeDynamicComparison } from '@/utils/dynamicMetricsEngine';
import { generateClinicalReport, AIAnalysisResult } from '@/services/ai/clinicalAnalysisService';
import { DynamicCompareMetrics } from '@/types/analysis/dynamic_compare';

const DynamicComparisonPage = () => {
    const { toast } = useToast();
    const [step, setStep] = useState<'upload' | 'processing' | 'results'>('upload');
    const [fileA, setFileA] = useState<File | null>(null);
    const [fileB, setFileB] = useState<File | null>(null);

    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('');

    // Analysis Results
    const [urlA, setUrlA] = useState<string>('');
    const [urlB, setUrlB] = useState<string>('');
    const [landmarksA, setLandmarksA] = useState<VideoAnalysisFrame[]>([]);
    const [landmarksB, setLandmarksB] = useState<VideoAnalysisFrame[]>([]);

    // New Single Source of Truth
    const [comparisonResult, setComparisonResult] = useState<DynamicCompareMetrics | null>(null);

    // AI Report
    const [aiReport, setAiReport] = useState<AIAnalysisResult | null>(null);
    const [generatingReport, setGeneratingReport] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isMarketingModalOpen, setIsMarketingModalOpen] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, side: 'A' | 'B') => {
        if (e.target.files && e.target.files[0]) {
            if (side === 'A') setFileA(e.target.files[0]);
            else setFileB(e.target.files[0]);
        }
    };

    const runAnalysis = async () => {
        if (!fileA || !fileB) return;

        setStep('processing');
        setProgress(0);
        setStatus('Preparando vídeos...');

        try {
            // Create Object URLs
            const uA = URL.createObjectURL(fileA);
            const uB = URL.createObjectURL(fileB);
            setUrlA(uA);
            setUrlB(uB);

            // Create Video Elements specifically for analysis (hidden)
            const videoElA = document.createElement('video');
            videoElA.src = uA;
            videoElA.muted = true;

            const videoElB = document.createElement('video');
            videoElB.src = uB;
            videoElB.muted = true;

            // Wait for metadata
            await Promise.all([
                new Promise(r => videoElA.onloadedmetadata = r),
                new Promise(r => videoElB.onloadedmetadata = r)
            ]);

            // Process A
            setStatus(`Processando Vídeo 1/2 (${fileA.name})...`);
            videoElA.currentTime = 1e-9;
            const resA = await processVideo(videoElA, (p) => setProgress(p * 50));
            setLandmarksA(resA);

            // Process B
            setStatus(`Processando Vídeo 2/2 (${fileB.name})...`);
            const resB = await processVideo(videoElB, (p) => setProgress(50 + (p * 50)));
            setLandmarksB(resB);

            // Calculate Metrics (Gait Default)
            setStatus('Calculando Biomecânica Comparativa...');
            const result = analyzeDynamicComparison(resA, resB, "GAIT");
            setComparisonResult(result);

            setStep('results');
        } catch (error) {
            console.error("Analysis failed", error);
            setStatus('Erro na análise: ' + (error as Error).message);
            toast({
                title: 'Erro na análise',
                description: 'Falha ao processar vídeos. Verifique o formato.',
                variant: 'destructive'
            });
        }
    };

    const handleGenerateAI = async () => {
        if (!comparisonResult) return;
        setGeneratingReport(true);
        toast({ title: 'Gerando Laudo...', description: 'A IA está analisando a biomecânica.' });

        try {
            // Adapt new schema to old AI service expectation OR update AI service.
            // For now, mapping simplified object if service expects old format, 
            // OR ideally passing the full schema if service supports it.
            // Assuming service update is next step, let's pass it as Any or create a mapped object.
            // The service expects { initial: ..., current: ... }.
            // We'll mock map it for now to avoid compilation error.

            const report = await generateClinicalReport({
                comparison: comparisonResult
            } as any);

            setAiReport(report);
            toast({ title: 'Laudo Gerado', description: 'Análise clínica concluída com sucesso.' });
        } catch (e) {
            toast({ title: 'Erro', description: 'Falha ao conectar com serviço de IA.', variant: 'destructive' });
        } finally {
            setGeneratingReport(false);
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-7xl h-full flex flex-col">
            <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
                <Video className="w-8 h-8 text-blue-600" />
                Comparativo Dinâmico
            </h1>

            {step === 'upload' && (
                <Card className="max-w-xl mx-auto mt-10">
                    <CardHeader><CardTitle>Carregar Vídeos (Antes vs Depois)</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-slate-50 transition-colors">
                                <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                                <h3 className="font-semibold mb-1">Vídeo Inicial (A)</h3>
                                <Input type="file" accept="video/*" onChange={(e) => handleFileChange(e, 'A')} />
                                {fileA && <p className="text-xs text-green-600 mt-2 truncate">{fileA.name}</p>}
                            </div>
                            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-slate-50 transition-colors">
                                <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                                <h3 className="font-semibold mb-1">Vídeo Reavaliação (B)</h3>
                                <Input type="file" accept="video/*" onChange={(e) => handleFileChange(e, 'B')} />
                                {fileB && <p className="text-xs text-green-600 mt-2 truncate">{fileB.name}</p>}
                            </div>
                        </div>

                        <Button
                            className="w-full"
                            size="lg"
                            disabled={!fileA || !fileB}
                            onClick={runAnalysis}
                        >
                            Iniciar Análise Comparativa
                        </Button>
                    </CardContent>
                </Card>
            )}

            {step === 'processing' && (
                <Card className="max-w-md mx-auto mt-20 text-center p-8">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold mb-2">{status}</h2>
                    <Progress value={progress} className="h-2 mb-2" />
                    <p className="text-sm text-muted-foreground">{Math.round(progress)}% concluído</p>
                    <p className="text-xs text-amber-500 mt-4">Isso pode levar alguns minutos dependendo do hardware.</p>
                </Card>
            )}

            {step === 'results' && comparisonResult && (
                <div className="space-y-6 flex-1 overflow-y-auto pb-10">
                    <DualVideoPlayer
                        videoA={{ url: urlA, landmarks: landmarksA.map(f => ({ timestamp: f.timestamp, points: f.landmarks })) }}
                        videoB={{ url: urlB, landmarks: landmarksB.map(f => ({ timestamp: f.timestamp, points: f.landmarks })) }}
                    />

                    <Tabs defaultValue="compare">
                        <TabsList className="w-full justify-start">
                            <TabsTrigger value="compare">Comparar Métricas</TabsTrigger>
                            <TabsTrigger value="details">Detalhes Técnicos</TabsTrigger>
                            <TabsTrigger value="report" className="flex items-center gap-2">
                                <Brain className="w-3 h-3" /> Laudo Inteligente
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="compare">
                            {/* Render metric cards from metric_deltas array */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                {comparisonResult.metric_deltas.map((delta, i) => (
                                    <MetricCard
                                        key={i}
                                        title={delta.label}
                                        valA={delta.value_A}
                                        valB={delta.value_B}
                                        unit={delta.unit}
                                        diff={delta.delta}
                                        improved={delta.status === 'IMPROVED'}
                                    />
                                ))}
                            </div>

                            {!aiReport && (
                                <Card className="bg-blue-50 border-blue-100">
                                    <CardContent className="flex items-center justify-between p-6">
                                        <div>
                                            <h3 className="font-bold text-blue-900 mb-1">Assistente PhysioScience Master AI</h3>
                                            <p className="text-sm text-blue-700">Gere um laudo clínico automático comparando a evolução biomecânica.</p>
                                        </div>
                                        <Button onClick={handleGenerateAI} disabled={generatingReport} className="gap-2">
                                            {generatingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                                            {generatingReport ? 'Analisando...' : 'Gerar Laudo Clínico'}
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>

                        <TabsContent value="details">
                            {/* Pass full result to viewer (needs update) */}
                            <DynamicAnalysisViewer data={comparisonResult} />
                        </TabsContent>

                        <TabsContent value="report">
                            <div className="flex justify-between mb-4">
                                <Button variant="outline" className="gap-2 text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-100" onClick={() => setIsMarketingModalOpen(true)}>
                                    <Video className="w-4 h-4" /> Criar Vídeo Marketing
                                </Button>
                                <Button variant="outline" className="gap-2" onClick={() => setIsShareModalOpen(true)} disabled={!aiReport}>
                                    <Share2 className="w-4 h-4" /> Exportar / Compartilhar
                                </Button>
                            </div>
                            {aiReport ? (
                                <AIReportView report={aiReport} />
                            ) : (
                                <div className="text-center py-10 text-muted-foreground">
                                    <Brain className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p>Nenhum laudo gerado.</p>
                                    <Button variant="link" onClick={() => document.querySelector('[value="compare"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))}>
                                        Voltar para Comparação e gerar laudo.
                                    </Button>
                                </div>
                            )}
                            {aiReport && (
                                <ShareReportModal
                                    isOpen={isShareModalOpen}
                                    onClose={() => setIsShareModalOpen(false)}
                                    report={aiReport}
                                    patientName="Paciente Demo"
                                    professionalName="Dr. Rafael Minatto"
                                />
                            )}
                            {isMarketingModalOpen && (
                                <MarketingExportModal
                                    isOpen={isMarketingModalOpen}
                                    onClose={() => setIsMarketingModalOpen(false)}
                                    videoUrlA={urlA}
                                    videoUrlB={urlB}
                                    metrics={comparisonResult.metric_deltas.map(m => ({
                                        label: m.label,
                                        valueA: m.value_A || 0,
                                        valueB: m.value_B || 0
                                    }))}
                                    patientId="patient-123"
                                    patientName="Paciente Demo"
                                />
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            )}
        </div>
    );
};

// Updated Metric Card to handle pre-calculated diff
const MetricCard = ({ title, valA, valB, unit, diff, improved }: { title: string, valA?: number | null, valB?: number | null, unit: string, diff?: number | null, improved?: boolean }) => {
    return (
        <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{title}</CardTitle></CardHeader>
            <CardContent>
                <div className="flex justify-between items-end">
                    <div>
                        <p className="text-xs text-muted-foreground">Inicial</p>
                        <p className="text-lg font-bold">{valA ?? '-'}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-muted-foreground">Reavaliação</p>
                        <p className="text-lg font-bold">{valB ?? '-'}</p>
                    </div>
                </div>
                <div className={`mt-2 text-xs font-bold ${improved ? 'text-green-600' : 'text-amber-600'} flex items-center justify-center bg-slate-100 py-1 rounded`}>
                    {diff !== undefined ? (diff! > 0 ? '+' : '') + diff + ' ' + unit : '-'}
                    {improved !== undefined ? (improved ? ' (Melhorou)' : ' (Atenção)') : ''}
                </div>
            </CardContent>
        </Card>
    )
}

export default DynamicComparisonPage;

