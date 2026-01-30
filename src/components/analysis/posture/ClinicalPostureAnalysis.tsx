import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Upload, Play, ChevronRight } from 'lucide-react';
import { detectPoseInImage } from '@/services/ai/poseDetectionService';
import { UnifiedLandmark } from '@/utils/geometry';
import { calculatePostureMetrics, PostureReport } from '@/utils/postureMetrics';
import LandmarkEditor from './LandmarkEditor';
import { logger } from '@/lib/errors/logger';

type Step = 'upload' | 'analysis' | 'report';
type ViewType = 'front' | 'side' | 'back';

const ClinicalPostureAnalysis = () => {
    const [step, setStep] = useState<Step>('upload');
    const [selectedView, setSelectedView] = useState<ViewType>('front');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [landmarks, setLandmarks] = useState<UnifiedLandmark[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [report, setReport] = useState<PostureReport | null>(null);
    const { toast } = useToast();

    // 1. Upload Handler
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setStep('upload'); // Stay or auto-advance?
        }
    };

    // 2. Run Analysis
    const handleRunAnalysis = async () => {
        if (!imageFile || !previewUrl) return;

        setIsProcessing(true);
        try {
            // Need DOM element for MediaPipe
            const img = document.createElement('img');
            img.src = previewUrl;
            await img.decode();

            const detected = await detectPoseInImage(img);
            if (detected.length === 0) {
                toast({ variant: 'destructive', title: 'Nenhuma pessoa detectada.' });
            } else {
                setLandmarks(detected);
                // Auto calculate
                const rep = calculatePostureMetrics(detected, selectedView);
                setReport(rep);
                setStep('analysis');
                toast({ title: 'Análise concluída', description: 'Verifique os pontos e métricas.' });
            }
        } catch (error) {
            logger.error('Error in posture analysis', error, 'ClinicalPostureAnalysis');
            toast({ variant: 'destructive', title: 'Erro na análise AI', description: String(error) });
        } finally {
            setIsProcessing(false);
        }
    };

    // 3. Update Report when Landmarks change manually
    const handleLandmarkUpdate = (newLms: UnifiedLandmark[]) => {
        setLandmarks(newLms);
        const rep = calculatePostureMetrics(newLms, selectedView);
        setReport(rep);
    };

    // 4. Save
    // const handleSave = async () => {
    //     // Here we would call supabase to save 'analysis_runs'
    //     toast({ title: 'Salvo com sucesso!', description: 'Relatório registrado no prontuário.' });
    // };

    return (
        <div className="flex flex-col h-full gap-4 p-4">
            {/* Header / Stepper */}
            <div className="flex items-center justify-between border-b pb-4">
                <div>
                    <h2 className="text-2xl font-bold">Análise Postural Clínica</h2>
                    <p className="text-muted-foreground text-sm">Avaliação biomecânica assistida por IA</p>
                </div>
                <div className="flex bg-slate-100 rounded-lg p-1">
                    <Button variant={step === 'upload' ? 'default' : 'ghost'} size="sm" onClick={() => setStep('upload')}>1. Imagem</Button>
                    <ChevronRight className="w-4 h-4 self-center text-slate-400" />
                    <Button variant={step === 'analysis' ? 'default' : 'ghost'} size="sm" disabled={!landmarks.length} onClick={() => setStep('analysis')}>2. Ajustes</Button>
                    <ChevronRight className="w-4 h-4 self-center text-slate-400" />
                    <Button variant={step === 'report' ? 'default' : 'ghost'} size="sm" disabled={!report} onClick={() => setStep('report')}>3. Relatório</Button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex gap-6 overflow-hidden">

                {/* Left: Input / Controls */}
                <Card className="w-1/3 p-4 flex flex-col gap-4 overflow-y-auto">
                    {/* View Selector */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Vista</label>
                        <Tabs value={selectedView} onValueChange={(v) => setSelectedView(v as ViewType)}>
                            <TabsList className="w-full">
                                <TabsTrigger value="front" className="flex-1">Frontal</TabsTrigger>
                                <TabsTrigger value="side" className="flex-1">Lateral</TabsTrigger>
                                <TabsTrigger value="back" className="flex-1">Posterior</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    {/* Upload */}
                    <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition-colors relative">
                        <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                        {previewUrl ? (
                            <OptimizedImage src={previewUrl} alt="Preview" className="max-h-40 rounded" aspectRatio="auto" />
                        ) : (
                            <>
                                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                                <span className="text-sm text-slate-500">Clique para enviar foto</span>
                            </>
                        )}
                    </div>

                    <Button onClick={handleRunAnalysis} disabled={!imageFile || isProcessing} className="w-full">
                        {isProcessing ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                        {landmarks.length > 0 ? "Re-analisar" : "Detectar Landmarks (AI)"}
                    </Button>

                    {/* Metrics Preview (Mini) */}
                    {report && (
                        <div className="space-y-2 mt-4">
                            <h3 className="font-semibold border-b pb-1">Métricas em Tempo Real</h3>
                            {report.metrics.map((m, i) => (
                                <div key={i} className="flex justify-between items-center text-sm">
                                    <span>{m.label}</span>
                                    <span className={`font-mono font-bold ${m.status === 'normal' ? 'text-green-600' :
                                        m.status === 'warning' ? 'text-orange-500' : 'text-red-600'
                                        }`}>
                                        {m.value}{m.unit}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                {/* Right: Visualization */}
                <Card className="flex-1 bg-slate-50 flex items-center justify-center overflow-auto p-4 border aspect-[3/4] relative">
                    {previewUrl ? (
                        <div className="relative shadow-lg border-2 border-slate-200 bg-white" style={{ minHeight: '400px' }}>
                            {/* Landmark Editor Component */}
                            <LandmarkEditor
                                imageUrl={previewUrl}
                                landmarks={landmarks}
                                onLandmarksChange={handleLandmarkUpdate}
                                editable={true}
                            />
                        </div>
                    ) : (
                        <div className="text-slate-400 flex flex-col items-center">
                            <Upload className="w-12 h-12 mb-2 opacity-50" />
                            <p>Carregue uma imagem para começar</p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default ClinicalPostureAnalysis;
