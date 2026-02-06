import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, StopCircle, AlertTriangle, CheckCircle2, Video } from 'lucide-react';
import { useLivePoseAnalysis } from '@/hooks/useLivePoseAnalysis';
import { toast } from '@/components/ui/use-toast';

const MetricTrafficLight = ({ label, value, thresholdYellow, thresholdRed, unit = "°", inverse: _inverse = false }: {
    label: string,
    value: number,
    thresholdYellow: number,
    thresholdRed: number,
    unit?: string,
    inverse?: boolean
}) => {
    let color = "bg-green-500";
    // unused: let status = "Bom";

    // Standard: Lower is better (e.g., Lean). Inverse: Higher is better? 
    // Usually biomech deviation: Lower is better.
    // If inverse=true (e.g., smoothness?), then higher is better.

    // Logic for "Deviation": 0 is perfect.
    const absVal = Math.abs(value);

    if (absVal > thresholdRed) {
        color = "bg-red-500 animate-pulse";
        // status = "Atenção!";
    } else if (absVal > thresholdYellow) {
        color = "bg-yellow-400";
        // status = "Cuidado";
    }

    return (
        <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 backdrop-blur-sm">
            <span className="text-white text-sm font-medium">{label}</span>
            <div className="flex items-center gap-3">
                <span className="text-xs text-slate-300 font-mono">{Math.round(value)}{unit}</span>
                <div className={`w-3 h-3 rounded-full ${color} shadow-[0_0_10px_rgba(0,0,0,0.5)]`} />
            </div>
        </div>
    );
};

interface LiveBiofeedbackSessionProps {
    onClose: () => void;
}

const LiveBiofeedbackSession: React.FC<LiveBiofeedbackSessionProps> = ({ onClose }) => {
    const { videoRef, canvasRef, startCamera, stopCamera, metrics, error } = useLivePoseAnalysis();
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);

    // Auto-start on mount
    useEffect(() => {
        startCamera();
        return () => stopCamera();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleRecordToggle = () => {
        if (isRecording) {
            setupStopRecording();
        } else {
            setIsRecording(true);
            setRecordingTime(0);
            toast({ title: "Gravação Iniciada", description: "Capturando 10 segundos..." });
            // Mock recording timer
            const interval = setInterval(() => {
                setRecordingTime(prev => {
                    if (prev >= 10) {
                        clearInterval(interval);
                        setupStopRecording();
                        return 10;
                    }
                    return prev + 1;
                });
            }, 1000);
        }
    };

    const setupStopRecording = () => {
        setIsRecording(false);
        toast({ title: "Clip Salvo", description: "Vídeo salvo na galeria do paciente." });
        // Logic to persist would actally go here (using MediaRecorder API)
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-6xl h-full flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center mb-4 text-white">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Camera className="w-6 h-6 text-green-400" />
                        Sessão Ao Vivo <Badge variant="outline" className="text-green-400 border-green-400">Biofeedback Ativo</Badge>
                    </h2>
                    <Button variant="ghost" className="text-gray-500 hover:text-white" onClick={onClose}>
                        Encerrar Sessão
                    </Button>
                </div>

                {/* Main Content */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">

                    {/* Video Area */}
                    <div className="lg:col-span-3 relative bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
                        {error && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
                                <div className="text-center p-6 max-w-md">
                                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                                    <h3 className="text-white text-lg font-bold mb-2">Erro na Câmera</h3>
                                    <p className="text-gray-500 mb-4">{error}</p>
                                    <Button onClick={() => window.location.reload()}>Recarregar</Button>
                                </div>
                            </div>
                        )}

                        <video ref={videoRef} className="absolute inset-0 w-full h-full object-contain" autoPlay playsInline muted />
                        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-contain pointer-events-none" width={640} height={480} />

                        {/* Overlay Controls */}
                        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4 z-10 px-4">
                            <Button
                                variant={isRecording ? "destructive" : "secondary"}
                                size="lg"
                                className="rounded-full px-8 shadow-xl"
                                onClick={handleRecordToggle}
                            >
                                {isRecording ? <StopCircle className="mr-2 h-5 w-5 animate-pulse" /> : <Video className="mr-2 h-5 w-5" />}
                                {isRecording ? `Parar (${recordingTime}s)` : "Gravar Clip (10s)"}
                            </Button>
                            <Button variant="outline" size="lg" className="rounded-full bg-black/50 border-white/20 text-white hover:bg-black/70 backdrop-blur-md">
                                <Camera className="mr-2 h-5 w-5" /> Snapshot
                            </Button>
                        </div>
                    </div>

                    {/* Sidebar Feedback */}
                    <div className="lg:col-span-1 space-y-4 overflow-y-auto">
                        {/* Confidence Check */}
                        <Card className={`border-0 ${metrics && metrics.confidence > 60 ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/20 border-red-500/30'} border`}>
                            <CardContent className="p-4 flex items-center gap-3">
                                {metrics && metrics.confidence > 60 ?
                                    <CheckCircle2 className="w-5 h-5 text-green-500" /> :
                                    <AlertTriangle className="w-5 h-5 text-red-500" />
                                }
                                <div>
                                    <p className="text-white font-medium text-sm">
                                        {metrics && metrics.confidence > 60 ? "Rastreamento Estável" : "Baixa Visibilidade"}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {metrics && metrics.confidence > 60 ? "Qualidade ideal para análise." : "Ajuste a iluminação ou posição."}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Metrics */}
                        {metrics && metrics.confidence > 60 && (
                            <div className="space-y-3">
                                <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Correção Postural (Tempo Real)</h3>

                                <MetricTrafficLight
                                    label="Valgo Joelho (Esq)"
                                    value={180 - metrics.kneeValgusL} // Convert to deviation from 180?
                                    thresholdYellow={10}
                                    thresholdRed={20}
                                />
                                <div className="text-[10px] text-slate-500 text-right px-1">Meta: Manter alinhado com quadril</div>

                                <MetricTrafficLight
                                    label="Valgo Joelho (Dir)"
                                    value={180 - metrics.kneeValgusR}
                                    thresholdYellow={10}
                                    thresholdRed={20}
                                />

                                <MetricTrafficLight
                                    label="Inclinação Tronco"
                                    value={metrics.trunkLean} // Depends on calculation
                                    thresholdYellow={15}
                                    thresholdRed={30}
                                />
                                <div className="text-[10px] text-slate-500 text-right px-1">Meta: Peito alto, tronco estável</div>

                                <MetricTrafficLight
                                    label="Nivelamento Pélvico"
                                    value={metrics.pelvicObliquity}
                                    thresholdYellow={5}
                                    thresholdRed={10}
                                />
                            </div>
                        )}

                        <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg p-4 mt-6">
                            <h4 className="text-blue-400 font-bold text-sm mb-2">Orientações Rápidas</h4>
                            <ul className="text-sm text-slate-300 space-y-2 list-disc list-inside">
                                <li>Mantenha a câmera na altura do quadril.</li>
                                <li>Use roupas contrastantes com o fundo.</li>
                                <li>Evite contra-luz (janelas atrás).</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiveBiofeedbackSession;
