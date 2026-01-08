import React, { useState, useCallback, lazy, Suspense } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileUp, Activity, Image as ImageIcon, Video, RotateCcw, Loader2 } from 'lucide-react';
import { GaitMetrics } from '@/types/analysis/schemas';

// Lazy-loaded heavy components for code-splitting
const DicomViewer = lazy(() => import('../dicom/DicomViewer'));
const PoseAnalyzer = lazy(() => import('../posture/PoseAnalyzer'));
const AssetViewer = lazy(() => import('../viewer/AssetViewer'));
const ClinicalPostureAnalysis = lazy(() => import('../posture/ClinicalPostureAnalysis'));
const DynamicAnalysisViewer = lazy(() => import('../dynamic/DynamicAnalysisViewer'));
const DicomBrowser = lazy(() => import('../dicom/DicomBrowser'));
const DynamicComparisonPage = lazy(() => import('../dynamic/DynamicComparisonPage'));

// Loading fallback component
const LoadingFallback = () => (
    <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Carregando módulo de análise...</p>
        </div>
    </div>
);

// MOCK DATA FOR DEMONSTRATION
const MOCK_GAIT_DATA: GaitMetrics = {
    schema_version: "physio-metrics.gait@1.0.0",
    trial_type: "GAIT",
    trial_id: "demo-123",
    clinic_id: "clinic-1",
    patient_id: "pat-1",
    captured_at: new Date().toISOString(),
    source_asset_ids: ["vid-1"],
    calibration: { is_calibrated: true, mm_per_px: 0.5 },
    quality: { landmark_confidence_mean_0_1: 0.95, occlusion_pct: 0, analysis_confidence_0_100: 98 },
    protocol: { view: "FRONTAL", fps: 30 },
    events: { cycles: [] },
    summary: {
        cadence_spm: 112,
        gait_speed_mm_s: 1200,
        double_support_pct: 22,
        symmetry_step_time_pct: 95,
        symmetry_step_length_pct: 98,
        knee_valgus_deg_peak_L: 8,
        knee_valgus_deg_peak_R: 12
    },
    timeseries: {
        downsample_hz: 10,
        samples: Array.from({ length: 20 }, (_, i) => ({
            t_ms: i * 100,
            pelvic_obliquity_deg: Math.sin(i / 2) * 5,
            trunk_lean_frontal_deg: Math.cos(i / 2) * 2
        }))
    }
};

type ViewerMode = 'upload' | 'dicom' | 'pose' | 'image' | 'clinical_posture' | 'dynamic_demo' | 'dynamic_compare';

const ImageAnalysisDashboard = () => {
    const [file, setFile] = useState<File | null>(null);
    const [mode, setMode] = useState<ViewerMode>('upload');

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const selected = acceptedFiles[0];
        if (!selected) return;

        setFile(selected);

        // Determine mode based on file type
        if (selected.name.toLowerCase().endsWith('.dcm') || selected.type === 'application/dicom') {
            setMode('dicom');
        } else if (selected.type.startsWith('video/')) {
            setMode('pose');
        } else if (selected.type.startsWith('image/')) {
            setMode('image');
        } else {
            // Default fallbacks or error
            console.warn("Unknown file type", selected.type);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

    const reset = () => {
        setFile(null);
        setMode('upload');
    };

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] p-6 gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">NeuroPose Analysis</h1>
                    <p className="text-muted-foreground">Plataforma de análise biométrica e imagiologia médica.</p>
                </div>
                {mode !== 'upload' && (
                    <Button variant="outline" onClick={reset}>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Voltar
                    </Button>
                )}
            </div>

            {mode === 'upload' && (
                <div className="flex-1 flex items-center justify-center">
                    <Card
                        {...getRootProps()}
                        className={`w-full max-w-2xl h-96 flex flex-col items-center justify-center border-dashed border-2 cursor-pointer transition-colors
                    ${isDragActive ? 'border-primary bg-primary/5' : 'border-slate-300 hover:border-primary'}
                `}
                    >
                        <input {...getInputProps()} />
                        <div className="flex flex-col items-center gap-4 text-center p-8">
                            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center">
                                <FileUp className="w-10 h-10 text-slate-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold mb-2">Arraste e solte seus arquivos aqui</h3>
                                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                                    Suporta Imagens DICOM (.dcm), Vídeos de Postura (.mp4, .webm)
                                    e Imagens Clínicas (.jpg, .png).
                                </p>
                            </div>
                            <div className="flex gap-4 mt-4">
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <Activity className="w-4 h-4" /> DICOM
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <Video className="w-4 h-4" /> Vídeo
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <ImageIcon className="w-4 h-4" /> Imagens
                                </div>
                            </div>

                            <div className="mt-8 border-t pt-6 w-full max-w-md space-y-2">
                                <Button variant="secondary" className="w-full" onClick={() => setMode('clinical_posture')}>
                                    Nova Análise Postural (Foto)
                                </Button>
                                <Button variant="outline" className="w-full" onClick={() => setMode('dynamic_demo')}>
                                    Demo: Marcha Clínica (JSON)
                                </Button>
                                <Button variant="secondary" className="w-full border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100" onClick={() => setMode('dynamic_compare')}>
                                    Comparativo de Vídeo (Antes x Depois)
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {mode === 'dicom' && file && (
                <Suspense fallback={<LoadingFallback />}>
                    <div className="flex-1 overflow-hidden border rounded-lg bg-black">
                        <DicomViewer file={file} />
                    </div>
                </Suspense>
            )}

            {mode === 'pose' && file && (
                <Suspense fallback={<LoadingFallback />}>
                    <div className="flex-1 overflow-hidden border rounded-lg">
                        <PoseAnalyzer videoSrc={URL.createObjectURL(file)} />
                    </div>
                </Suspense>
            )}

            {mode === 'image' && file && (
                <Suspense fallback={<LoadingFallback />}>
                    <div className="flex-1 overflow-hidden">
                        <AssetViewer file={file} />
                    </div>
                </Suspense>
            )}

            {mode === 'clinical_posture' && (
                <Suspense fallback={<LoadingFallback />}>
                    <div className="flex-1 overflow-hidden border rounded-lg bg-white">
                        <ClinicalPostureAnalysis />
                    </div>
                </Suspense>
            )}

            {mode === 'dynamic_demo' && (
                <Suspense fallback={<LoadingFallback />}>
                    <div className="flex-1 overflow-y-auto p-4 border rounded-lg bg-white">
                        <DynamicAnalysisViewer data={MOCK_GAIT_DATA} />
                    </div>
                </Suspense>
            )}

            {mode === 'dynamic_compare' && (
                <Suspense fallback={<LoadingFallback />}>
                    <div className="flex-1 overflow-hidden bg-white border rounded-lg">
                        <DynamicComparisonPage />
                    </div>
                </Suspense>
            )}
        </div>
    );
};

export default ImageAnalysisDashboard;
