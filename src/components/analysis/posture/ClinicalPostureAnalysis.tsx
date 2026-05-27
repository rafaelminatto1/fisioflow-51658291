import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Upload, Play, ChevronRight, Cpu } from "lucide-react";
import { detectPoseInImage } from "@/services/ai/poseDetectionService";
import { UnifiedLandmark } from "@/utils/geometry";
import { calculatePostureMetrics, PostureReport } from "@/utils/postureMetrics";
import LandmarkEditor from "./LandmarkEditor";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { Badge } from "@/components/ui/badge";

type Step = "upload" | "analysis" | "report";
type ViewType = "front" | "side" | "back";

// HUD Régua Analógica de Desvio Postural
const DeviationRuler = ({ value, label, status, unit = "°" }: { value: number; label: string; status: string; unit?: string }) => {
  const min = -10;
  const max = 10;
  const percent = Math.min(Math.max(((value - min) / (max - min)) * 100, 0), 100);

  let needleColor = "bg-emerald-500";
  let textColor = "text-emerald-600";
  let statusText = "Alinhamento Ideal";
  
  if (status === "warning") {
    needleColor = "bg-orange-500";
    textColor = "text-orange-500";
    statusText = "Desvio Leve";
  } else if (status === "abnormal") {
    needleColor = "bg-red-600";
    textColor = "text-red-600";
    statusText = "Desvio Clínico";
  }

  return (
    <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-sm">
      <div className="flex justify-between items-center">
        <span className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</span>
        <span className={`text-sm font-black font-mono ${textColor}`}>
          {value > 0 ? `+${value}` : value}{unit}
        </span>
      </div>
      
      {/* Régua Analógica */}
      <div className="relative h-6 bg-slate-200/50 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-300/30 dark:border-slate-700/50">
        <div className="absolute inset-y-0 left-1/4 right-1/4 bg-emerald-500/5 border-x border-emerald-500/10" />
        <div className="absolute inset-y-0 left-0 w-1/4 bg-red-500/5" />
        <div className="absolute inset-y-0 right-0 w-1/4 bg-red-500/5" />
        
        {/* Marcações */}
        <div className="absolute inset-0 flex justify-between px-3 text-[7px] text-slate-400 font-mono font-bold select-none pointer-events-none items-center">
          <span>-10°</span>
          <span>-5°</span>
          <span>0°</span>
          <span>+5°</span>
          <span>+10°</span>
        </div>

        {/* Agulha de Desvio */}
        <div 
          className={`absolute top-0 bottom-0 w-1 ${needleColor} shadow-[0_0_8px_rgba(0,0,0,0.15)] rounded-full transition-all duration-700 ease-out`}
          style={{ left: `calc(${percent}% - 2px)` }}
        />
      </div>

      <div className="flex justify-between items-center text-[9px] uppercase font-black tracking-widest text-slate-400">
        <span>Esquerda</span>
        <span className={`font-black ${textColor}`}>
          {statusText}
        </span>
        <span>Direita</span>
      </div>
    </div>
  );
};

const ClinicalPostureAnalysis = () => {
  const [step, setStep] = useState<Step>("upload");
  const [selectedView, setSelectedView] = useState<ViewType>("front");
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
      setStep("upload"); // Stay or auto-advance?
    }
  };

  // 2. Run Analysis
  const handleRunAnalysis = async () => {
    if (!imageFile || !previewUrl) return;

    setIsProcessing(true);
    try {
      // Need DOM element for MediaPipe
      const img = document.createElement("img");
      img.src = previewUrl;
      await img.decode();

      const detected = await detectPoseInImage(img);
      if (detected.length === 0) {
        toast({ variant: "destructive", title: "Nenhuma pessoa detectada." });
      } else {
        setLandmarks(detected);
        // Auto calculate
        const rep = calculatePostureMetrics(detected, selectedView);
        setReport(rep);
        setStep("analysis");
        toast({
          title: "Análise concluída",
          description: "Verifique os pontos e métricas.",
        });
      }
    } catch (error) {
      logger.error("Error in posture analysis", error, "ClinicalPostureAnalysis");
      toast({
        variant: "destructive",
        title: "Erro na análise AI",
        description: String(error),
      });
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

  // Cálculo da pontuação de simetria postural baseado nos desvios das métricas
  const { overallScore, circumference, strokeDashoffset, gaugeColor, bgGaugeColor, textColor } = useMemo(() => {
    const metrics = report?.metrics || [];
    if (metrics.length === 0) {
      return {
        overallScore: 100,
        circumference: 2 * Math.PI * 60,
        strokeDashoffset: 0,
        gaugeColor: "stroke-emerald-500",
        bgGaugeColor: "bg-emerald-500/10",
        textColor: "text-emerald-500"
      };
    }

    const totalDev = metrics.reduce((acc, m) => acc + Math.min(Math.abs(m.value), 15), 0);
    const avgDev = totalDev / metrics.length;
    const score = Math.max(0, Math.round(100 - (avgDev * 6.6))); // 15 graus de desvio médio = 0% de simetria

    const radius = 60;
    const circ = 2 * Math.PI * radius;
    const offset = circ - (score / 100) * circ;

    let gColor = "stroke-emerald-500";
    let bgGColor = "bg-emerald-500/10";
    let txtColor = "text-emerald-500";

    if (score < 75) {
      gColor = "stroke-orange-500";
      bgGColor = "bg-orange-500/10";
      txtColor = "text-orange-500";
    }
    if (score < 50) {
      gColor = "stroke-red-500";
      bgGColor = "bg-red-500/10";
      txtColor = "text-red-500";
    }

    return {
      overallScore: score,
      circumference: circ,
      strokeDashoffset: offset,
      gaugeColor: gColor,
      bgGaugeColor: bgGColor,
      textColor: txtColor
    };
  }, [report]);

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      {/* Header / Stepper */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold">Análise Postural Clínica</h2>
          <p className="text-muted-foreground text-sm">Avaliação biomecânica assistida por IA</p>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-1">
          <Button
            variant={step === "upload" ? "default" : "ghost"}
            size="sm"
            onClick={() => setStep("upload")}
          >
            1. Imagem
          </Button>
          <ChevronRight className="w-4 h-4 self-center text-slate-500" />
          <Button
            variant={step === "analysis" ? "default" : "ghost"}
            size="sm"
            disabled={!landmarks.length}
            onClick={() => setStep("analysis")}
          >
            2. Ajustes
          </Button>
          <ChevronRight className="w-4 h-4 self-center text-slate-500" />
          <Button
            variant={step === "report" ? "default" : "ghost"}
            size="sm"
            disabled={!report}
            onClick={() => setStep("report")}
          >
            3. Relatório
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      {step === "report" && report ? (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-y-auto pr-2 pb-6 animate-in fade-in duration-300">
          {/* Coluna Esquerda: Score de Simetria e Resumo */}
          <div className="space-y-6">
            <Card className="border-none bg-slate-900 text-white rounded-[2rem] shadow-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Cpu className="h-40 w-40" />
              </div>
              <div className="flex flex-col items-center justify-center text-center space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Simetria Postural Global
                </h3>
                
                {/* SVG Gauge Animado */}
                <div className="relative h-36 w-36 flex items-center justify-center">
                  <svg className="h-full w-full transform -rotate-90">
                    <circle
                      cx="72"
                      cy="72"
                      r="60"
                      className="stroke-slate-800"
                      strokeWidth="10"
                      fill="transparent"
                    />
                    <circle
                      cx="72"
                      cy="72"
                      r="60"
                      className={`${gaugeColor} transition-all duration-1000 ease-out`}
                      strokeWidth="10"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-3xl font-black tracking-tighter tabular-nums text-white">
                      {overallScore}%
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
                      Score Geral
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-slate-300 max-w-xs leading-relaxed">
                    O score geral quantifica o alinhamento corporal em relação às linhas anatômicas de referência (fórmula ponderada dos desvios).
                  </p>
                  <div className="pt-2">
                    <Badge variant="outline" className={`border-none ${bgGaugeColor} ${textColor} font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-wider`}>
                      {overallScore >= 75 ? "Simetria Excelente" : overallScore >= 50 ? "Simetria Funcional" : "Assimetria Clínica"}
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-5 border-none shadow-sm bg-slate-50 dark:bg-slate-900/50 rounded-[2rem]">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">
                Evidências Clínicas Aplicadas
              </h4>
              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/50 dark:border-slate-800">
                  <p className="font-bold text-slate-700 dark:text-slate-300">Protocolo de Fotogrametria SAPO</p>
                  <p className="mt-1">Medição e análise angular assistida por computador em conformidade com as diretrizes do Portal SAPO (São Paulo, Brasil).</p>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/50 dark:border-slate-800">
                  <p className="font-bold text-slate-700 dark:text-slate-300">Referências e Tolerância de Desvio</p>
                  <p className="mt-1">Limites de normalidade estabelecidos por Karachalios et al. (1999). Desvios superiores a 3° justificam acompanhamento clínico e exercícios de reeducação postural ativa.</p>
                </div>
              </div>
            </Card>

            <Button 
              onClick={() => window.print()}
              variant="outline" 
              className="w-full rounded-2xl gap-2 font-bold py-5 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
            >
              Exportar Relatório Clínico (PDF)
            </Button>
          </div>

          {/* Coluna Central e Direita (2/3 de largura): Relatório Gráfico */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 border-none shadow-sm bg-white dark:bg-slate-950 rounded-[2rem]">
              <div className="flex justify-between items-center border-b pb-4 mb-6">
                <div>
                  <h3 className="text-lg font-black tracking-tight">Relatório de Fotogrametria AI ({selectedView === "front" ? "Vista Frontal" : selectedView === "side" ? "Vista Lateral" : "Vista Posterior"})</h3>
                  <p className="text-xs text-slate-500">Métricas angulares calculadas automaticamente a partir dos marcos anatômicos.</p>
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-1">
                  <Button
                    variant={selectedView === "front" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => {
                      setSelectedView("front");
                      const rep = calculatePostureMetrics(landmarks, "front");
                      setReport(rep);
                    }}
                    className="h-7 text-xs px-3"
                  >
                    Frontal
                  </Button>
                  <Button
                    variant={selectedView === "side" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => {
                      setSelectedView("side");
                      const rep = calculatePostureMetrics(landmarks, "side");
                      setReport(rep);
                    }}
                    className="h-7 text-xs px-3"
                  >
                    Lateral
                  </Button>
                  <Button
                    variant={selectedView === "back" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => {
                      setSelectedView("back");
                      const rep = calculatePostureMetrics(landmarks, "back");
                      setReport(rep);
                    }}
                    className="h-7 text-xs px-3"
                  >
                    Posterior
                  </Button>
                </div>
              </div>

              {/* Grid das Métricas Reguadas */}
              {report.metrics.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {report.metrics.map((m, i) => (
                    <DeviationRuler
                      key={i}
                      value={m.value}
                      label={m.label}
                      status={m.status}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <p>Sem métricas disponíveis para esta vista.</p>
                  <p className="text-xs mt-1">Carregue uma nova foto ou realize a detecção de pontos.</p>
                </div>
              )}
            </Card>

            {/* Imagem do Paciente com Overlays dos Landmarks (Estático) */}
            <Card className="p-6 border-none shadow-sm bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] flex flex-col items-center justify-center">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 self-start">
                Mapeamento Esquelético da Análise
              </h4>
              <div 
                className="relative shadow-md border border-slate-200/50 dark:border-slate-800 rounded-2xl bg-black overflow-hidden flex items-center justify-center max-w-md w-full"
                style={{ minHeight: "360px" }}
              >
                {previewUrl && (
                  <LandmarkEditor
                    imageUrl={previewUrl}
                    landmarks={landmarks}
                    onLandmarksChange={() => {}}
                    editable={false}
                  />
                )}
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex gap-6 overflow-hidden">
          {/* Left: Input / Controls */}
          <Card className="w-1/3 p-4 flex flex-col gap-4 overflow-y-auto">
            {/* View Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Vista</label>
              <Tabs value={selectedView} onValueChange={(v) => {
                setSelectedView(v as ViewType);
                if (landmarks.length > 0) {
                  const rep = calculatePostureMetrics(landmarks, v as ViewType);
                  setReport(rep);
                }
              }}>
                <TabsList className="w-full">
                  <TabsTrigger value="front" className="flex-1">
                    Frontal
                  </TabsTrigger>
                  <TabsTrigger value="side" className="flex-1">
                    Lateral
                  </TabsTrigger>
                  <TabsTrigger value="back" className="flex-1">
                    Posterior
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Upload */}
            <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              {previewUrl ? (
                <OptimizedImage
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-40 rounded"
                  aspectRatio="auto"
                />
              ) : (
                <>
                  <Upload className="w-8 h-8 text-slate-500 mb-2" />
                  <span className="text-sm text-slate-500">Clique para enviar foto</span>
                </>
              )}
            </div>

            <Button
              onClick={handleRunAnalysis}
              disabled={!imageFile || isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <Loader2 className="animate-spin w-4 h-4 mr-2" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              {landmarks.length > 0 ? "Re-analisar" : "Detectar Landmarks (AI)"}
            </Button>

            {/* Metrics Preview (Mini) */}
            {report && (
              <div className="space-y-2 mt-4 animate-in fade-in duration-300">
                <h3 className="font-semibold border-b pb-1">Métricas em Tempo Real</h3>
                {report.metrics.map((m, i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <span>{m.label}</span>
                    <span
                      className={`font-mono font-bold ${
                        m.status === "normal"
                          ? "text-emerald-600"
                          : m.status === "warning"
                            ? "text-orange-500"
                            : "text-red-600"
                      }`}
                    >
                      {m.value}
                      {m.unit}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Right: Visualization */}
          <Card className="flex-1 bg-slate-50 dark:bg-slate-900/10 flex items-center justify-center overflow-auto p-4 border aspect-[3/4] relative">
            {previewUrl ? (
              <div
                className="relative shadow-lg border-2 border-slate-200/50 dark:border-slate-800 bg-white dark:bg-black"
                style={{ minHeight: "400px" }}
              >
                {/* Landmark Editor Component */}
                <LandmarkEditor
                  imageUrl={previewUrl}
                  landmarks={landmarks}
                  onLandmarksChange={handleLandmarkUpdate}
                  editable={true}
                />
              </div>
            ) : (
              <div className="text-slate-500 flex flex-col items-center">
                <Upload className="w-12 h-12 mb-2 opacity-50" />
                <p>Carregue uma imagem para começar</p>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default ClinicalPostureAnalysis;
