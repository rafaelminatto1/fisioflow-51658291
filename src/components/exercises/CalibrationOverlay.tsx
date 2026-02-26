import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Check, Maximize2, MoveHorizontal } from 'lucide-react';

interface CalibrationOverlayProps {
  isVisible: boolean;
  onComplete: () => void;
  onCancel: () => void;
  landmarks: any[]; // PoseLandmark[]
  width: number;
  height: number;
}

export const CalibrationOverlay: React.FC<CalibrationOverlayProps> = ({
  isVisible,
  onComplete,
  onCancel,
  landmarks,
  width,
  height,
}) => {
  if (!isVisible) return null;

  // Verificar critérios de calibração
  const isBodyVisible = landmarks.length >= 33; // 33 pontos detectados
  const confidence = landmarks.length > 0 ? (landmarks[0].visibility || 0) : 0;
  
  // Calcular enquadramento
  const nose = landmarks[0];
  const ankleL = landmarks[27];
  const ankleR = landmarks[28];
  
  const isCentered = nose && Math.abs(nose.x - 0.5) < 0.2; // Nariz próximo do centro horizontal
  const isDistanceOk = nose && (ankleL || ankleR) && (Math.abs(nose.y - (ankleL?.y || ankleR?.y)) > 0.4); // Corpo ocupa boa parte da altura

  const readyProgress = (isBodyVisible ? 25 : 0) + 
                       (confidence > 0.7 ? 25 : 0) + 
                       (isCentered ? 25 : 0) + 
                       (isDistanceOk ? 25 : 0);

  const isReady = readyProgress === 100;

  return (
    <div className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md bg-background/95 backdrop-blur">
        <CardContent className="p-6 space-y-6 text-center">
          <h2 className="text-2xl font-bold">Ajuste sua Posição</h2>
          
          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden border-2 border-dashed border-primary/50">
            {/* Desenho da silhueta ideal */}
            <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
              <svg viewBox="0 0 100 200" className="h-4/5 text-primary fill-current">
                <path d="M50 20c-8 0-15-7-15-15S42 0 50 0s15 7 15 15-7 15-15 15zm-25 40l-10 60h10l5-40 5 10v95h10v-90h10v90h10v-95l5-10 5 40h10l-10-60H25z" />
              </svg>
            </div>
            
            {/* Indicadores Visuais */}
            <div className="absolute top-4 left-4 right-4 flex justify-between text-xs font-bold text-white drop-shadow-md">
              <span className={isCentered ? "text-green-400" : "text-red-400"}>
                {isCentered ? <Check className="inline h-4 w-4 mr-1" /> : <MoveHorizontal className="inline h-4 w-4 mr-1" />}
                Centralizado
              </span>
              <span className={isDistanceOk ? "text-green-400" : "text-red-400"}>
                {isDistanceOk ? <Check className="inline h-4 w-4 mr-1" /> : <Maximize2 className="inline h-4 w-4 mr-1" />}
                Distância
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Calibração</span>
              <span className="font-bold">{readyProgress}%</span>
            </div>
            <Progress value={readyProgress} className="h-3" />
            <p className="text-sm text-muted-foreground mt-2">
              {!isBodyVisible ? "Corpo não detectado. Aumente a iluminação." :
               !isCentered ? "Fique no centro da câmera." :
               !isDistanceOk ? "Afaste-se para enquadrar corpo inteiro." :
               "Posição perfeita! Mantenha..."}
            </p>
          </div>

          <div className="flex gap-4 pt-4">
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Cancelar
            </Button>
            <Button 
              onClick={onComplete} 
              disabled={!isReady} 
              className={isReady ? "bg-green-600 hover:bg-green-700 flex-1" : "flex-1"}
            >
              {isReady ? "Começar Agora" : "Aguardando..."}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
