import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Compass, Smartphone } from 'lucide-react';
import { useDeviceInclinometer } from '@/hooks/biomechanics/useDeviceInclinometer';

export const InclinometerPanel: React.FC = () => {
  const { angle, isSupported, permissionGranted, requestPermission } = useDeviceInclinometer();
  const [leftAngle, setLeftAngle] = useState<number | null>(null);
  const [rightAngle, setRightAngle] = useState<number | null>(null);

  const calculateAsymmetry = () => {
    if (leftAngle === null || rightAngle === null) return null;
    const max = Math.max(Math.abs(leftAngle), Math.abs(rightAngle));
    if (max === 0) return 0;
    const diff = Math.abs(Math.abs(leftAngle) - Math.abs(rightAngle));
    return ((diff / max) * 100).toFixed(1);
  };

  const asymmetry = calculateAsymmetry();

  return (
    <Card className="border-none shadow-sm bg-orange-500/5">
      <CardContent className="p-4 space-y-3">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-500 flex items-center gap-2">
          <Compass className="h-3 w-3" /> Inclinômetro Físico
        </h4>
        
        {!isSupported && (
          <p className="text-[9px] text-muted-foreground">Inclinômetro não suportado neste dispositivo.</p>
        )}

        {isSupported && !permissionGranted && (
          <Button size="sm" variant="outline" className="w-full text-[9px] font-bold h-7" onClick={requestPermission}>
            <Smartphone className="w-3 h-3 mr-1" /> Ativar Inclinômetro
          </Button>
        )}

        {isSupported && permissionGranted && (
          <div className="space-y-3">
            <div className="flex flex-col items-center justify-center p-4 bg-background rounded-lg border border-border">
              <span className="text-3xl font-black text-foreground">{angle}°</span>
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1">Ao Vivo</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant={leftAngle !== null ? "default" : "outline"}
                size="sm" 
                className="h-8 text-[10px]"
                onClick={() => setLeftAngle(angle)}
              >
                Esq: {leftAngle !== null ? `${leftAngle}°` : "Capturar"}
              </Button>
              <Button 
                variant={rightAngle !== null ? "default" : "outline"}
                size="sm" 
                className="h-8 text-[10px]"
                onClick={() => setRightAngle(angle)}
              >
                Dir: {rightAngle !== null ? `${rightAngle}°` : "Capturar"}
              </Button>
            </div>

            {asymmetry !== null && (
              <div className={`p-2 rounded-md text-center border ${Number(asymmetry) > 15 ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-green-500/10 border-green-500/20 text-green-500'}`}>
                <p className="text-[10px] font-black uppercase tracking-widest">
                  Assimetria: {asymmetry}%
                </p>
                <p className="text-[8px] mt-0.5">
                  {Number(asymmetry) > 15 ? 'Alerta: Risco de Lesão' : 'Margem Aceitável'}
                </p>
              </div>
            )}
            
            {(leftAngle !== null || rightAngle !== null) && (
              <Button variant="ghost" size="sm" className="w-full h-6 text-[9px] text-muted-foreground hover:text-foreground" onClick={() => { setLeftAngle(null); setRightAngle(null); }}>
                Resetar Capturas
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
