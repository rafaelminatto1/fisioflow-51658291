import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Compass, Smartphone, RotateCcw, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="border-none shadow-xl bg-slate-900/40 backdrop-blur-xl border border-white/5 overflow-hidden">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-500 flex items-center gap-2">
              <Compass className="h-3.5 w-3.5 animate-pulse" /> Inclinômetro Premium
            </h4>
            {isSupported && permissionGranted && (
              <Badge variant="outline" className="text-[8px] bg-green-500/10 text-green-500 border-none">LIVE</Badge>
            )}
          </div>
        
        <AnimatePresence mode="wait">
          {!isSupported ? (
            <motion.p 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-[9px] text-muted-foreground bg-white/5 p-2 rounded-lg"
            >
              Hardware não detectado. Use em um dispositivo com giroscópio.
            </motion.p>
          ) : !permissionGranted ? (
            <Button size="sm" variant="outline" 
              className="w-full text-[9px] font-black h-9 bg-orange-500/10 border-orange-500/20 text-orange-500 hover:bg-orange-500 hover:text-white transition-all uppercase" 
              onClick={requestPermission}
            >
              <Smartphone className="w-4 h-4 mr-2" /> Solicitar Acesso Sensor
            </Button>
          ) : (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="space-y-4"
            >
              <div className="relative flex flex-col items-center justify-center p-6 bg-gradient-to-b from-white/5 to-transparent rounded-2xl border border-white/5 shadow-inner">
                {/* Visual Gauge Component */}
                <div className="absolute inset-0 flex items-center justify-center opacity-10">
                   <div className="w-32 h-32 border-4 border-dashed border-orange-500 rounded-full animate-[spin_10s_linear_infinite]" />
                </div>
                <span className="text-4xl font-black text-white drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">{angle}°</span>
                <span className="text-[8px] text-orange-400 font-bold uppercase tracking-tighter mt-1 bg-orange-500/10 px-2 py-0.5 rounded-full">Pitch / Tilt Digital</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant={leftAngle !== null ? "default" : "outline"}
                  size="sm" 
                  className={`h-9 text-[10px] font-black uppercase transition-all ${leftAngle !== null ? 'bg-orange-600 border-none' : 'border-white/10 hover:bg-white/5'}`}
                  onClick={() => setLeftAngle(angle)}
                >
                  ESQ: {leftAngle !== null ? `${leftAngle}°` : "CAPTURAR"}
                </Button>
                <Button 
                  variant={rightAngle !== null ? "default" : "outline"}
                  size="sm" 
                  className={`h-9 text-[10px] font-black uppercase transition-all ${rightAngle !== null ? 'bg-orange-600 border-none' : 'border-white/10 hover:bg-white/5'}`}
                  onClick={() => setRightAngle(angle)}
                >
                  DIR: {rightAngle !== null ? `${rightAngle}°` : "CAPTURAR"}
                </Button>
              </div>

              {asymmetry !== null && (
                <motion.div 
                  initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 ${Number(asymmetry) > 15 
                    ? 'bg-red-500/10 border-red-500/20 text-red-500' 
                    : 'bg-green-500/10 border-green-500/20 text-green-500'}`}
                >
                  <div className="flex items-center gap-2">
                    {Number(asymmetry) > 15 ? <ShieldAlert className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                    <p className="text-[11px] font-black uppercase tracking-widest">
                      ASSIMETRIA: {asymmetry}%
                    </p>
                  </div>
                  <div className="w-full bg-black/20 h-1.5 rounded-full overflow-hidden">
                    <motion.div 
                        initial={{ width: 0 }} animate={{ width: `${Math.min(100, Number(asymmetry) * 2)}%` }}
                        className={`h-full ${Number(asymmetry) > 15 ? 'bg-red-500' : 'bg-green-500'}`}
                    />
                  </div>
                  <p className="text-[8px] font-bold uppercase opacity-80 mt-1">
                    {Number(asymmetry) > 15 ? 'ZONE: RISCO DE LESÃO ELEVADO' : 'ZONE: MARGEM CLÍNICA SEGURA'}
                  </p>
                </motion.div>
              )}
              
              <AnimatePresence>
                {(leftAngle !== null || rightAngle !== null) && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Button variant="ghost" size="sm" 
                      className="w-full h-8 text-[9px] font-black text-muted-foreground hover:text-white uppercase tracking-tighter" 
                      onClick={() => { setLeftAngle(null); setRightAngle(null); }}>
                      <RotateCcw className="w-3 h-3 mr-1" /> Resetar Sessão
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  </motion.div>
);
};
