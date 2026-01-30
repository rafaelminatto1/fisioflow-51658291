import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Camera, CameraOff, Activity, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/errors/logger';

interface MovementMetrics {
  angleAccuracy: number;
  rangeOfMotion: number;
  speed: number;
  stability: number;
  posture: 'excelente' | 'boa' | 'atenção' | 'ruim';
}

export const MovementAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [metrics, setMetrics] = useState<MovementMetrics>({
    angleAccuracy: 0,
    rangeOfMotion: 0,
    speed: 0,
    stability: 0,
    posture: 'boa'
  });
  const [feedback, setFeedback] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startAnalysis = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 1280, 
          height: 720,
          facingMode: 'user'
        } 
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      setIsAnalyzing(true);
      simulateAnalysis();
      
      toast({
        title: "Análise iniciada",
        description: "Posicione-se na frente da câmera",
      });
    } catch (error) {
      logger.error('Erro ao acessar câmera', error, 'MovementAnalysis');
      toast({
        title: "Erro",
        description: "Não foi possível acessar a câmera",
        variant: "destructive",
      });
    }
  };

  const stopAnalysis = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsAnalyzing(false);
    toast({
      title: "Análise finalizada",
      description: "Relatório salvo com sucesso",
    });
  };

  // Simula análise de movimento com IA
  const simulateAnalysis = () => {
    const interval = setInterval(() => {
      const newMetrics: MovementMetrics = {
        angleAccuracy: Math.floor(Math.random() * 40) + 60,
        rangeOfMotion: Math.floor(Math.random() * 40) + 60,
        speed: Math.floor(Math.random() * 40) + 60,
        stability: Math.floor(Math.random() * 40) + 60,
        posture: ['excelente', 'boa', 'atenção'][Math.floor(Math.random() * 3)] as MovementMetrics['posture']
      };

      setMetrics(newMetrics);

      // Gera feedback baseado nas métricas
      const newFeedback: string[] = [];
      if (newMetrics.angleAccuracy < 70) {
        newFeedback.push("⚠️ Atenção ao ângulo do movimento");
      }
      if (newMetrics.stability < 70) {
        newFeedback.push("⚠️ Mantenha mais estabilidade");
      }
      if (newMetrics.angleAccuracy > 85 && newMetrics.stability > 85) {
        newFeedback.push("✅ Excelente execução!");
      }

      setFeedback(newFeedback);
    }, 2000);

    return () => clearInterval(interval);
  };

  const getPostureColor = (posture: string) => {
    const colors = {
      excelente: 'bg-green-100 text-green-800',
      boa: 'bg-blue-100 text-blue-800',
      atenção: 'bg-yellow-100 text-yellow-800',
      ruim: 'bg-red-100 text-red-800'
    };
    return colors[posture as keyof typeof colors];
  };

  const getProgressColor = (value: number) => {
    if (value >= 85) return 'bg-green-500';
    if (value >= 70) return 'bg-blue-500';
    if (value >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Análise de Movimento em Tempo Real
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Vídeo com Overlay */}
          <div className="relative bg-muted rounded-lg overflow-hidden aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
            />
            {!isAnalyzing && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Camera className="w-12 h-12 text-muted-foreground" />
              </div>
            )}
            
            {/* Badge de Postura */}
            {isAnalyzing && (
              <div className="absolute top-4 right-4">
                <Badge className={getPostureColor(metrics.posture)}>
                  Postura: {metrics.posture}
                </Badge>
              </div>
            )}
          </div>

          {/* Métricas */}
          <div className="space-y-4">
            <h4 className="font-semibold">Métricas em Tempo Real</h4>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Precisão Angular</span>
                  <span className="font-semibold">{metrics.angleAccuracy}%</span>
                </div>
                <Progress value={metrics.angleAccuracy} className={getProgressColor(metrics.angleAccuracy)} />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Amplitude de Movimento</span>
                  <span className="font-semibold">{metrics.rangeOfMotion}%</span>
                </div>
                <Progress value={metrics.rangeOfMotion} className={getProgressColor(metrics.rangeOfMotion)} />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Velocidade</span>
                  <span className="font-semibold">{metrics.speed}%</span>
                </div>
                <Progress value={metrics.speed} className={getProgressColor(metrics.speed)} />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Estabilidade</span>
                  <span className="font-semibold">{metrics.stability}%</span>
                </div>
                <Progress value={metrics.stability} className={getProgressColor(metrics.stability)} />
              </div>
            </div>

            {/* Feedback em Tempo Real */}
            {isAnalyzing && feedback.length > 0 && (
              <div className="space-y-2 p-3 bg-muted rounded-lg">
                <h5 className="font-semibold text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Feedback
                </h5>
                {feedback.map((item, index) => (
                  <p key={index} className="text-sm">{item}</p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Controles */}
        <div className="flex items-center justify-center gap-4">
          {!isAnalyzing ? (
            <Button onClick={startAnalysis} className="bg-primary">
              <Camera className="w-4 h-4 mr-2" />
              Iniciar Análise
            </Button>
          ) : (
            <>
              <Button variant="destructive" onClick={stopAnalysis}>
                <CameraOff className="w-4 h-4 mr-2" />
                Finalizar Análise
              </Button>
              <Button variant="outline">
                <CheckCircle className="w-4 h-4 mr-2" />
                Salvar Relatório
              </Button>
            </>
          )}
        </div>

        {isAnalyzing && (
          <div className="text-center text-sm text-muted-foreground">
            Tempo de análise: 00:00:00
          </div>
        )}
      </CardContent>
    </Card>
  );
};
