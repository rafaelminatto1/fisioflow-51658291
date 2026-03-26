import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ruler, Play, Square, Link2, Activity, RotateCcw } from 'lucide-react';
import { KP_NAMES } from '@/types/biomechanics';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';

interface DynamicGoniometerProps {
    currentAngle: number;
    angleHistory: { frame: number; angle: number }[];
    isRecording: boolean;
    linkedKP: [number | null, number | null, number | null];
    toggleRecording: () => void;
    clearGoniometer: () => void;
    linkKeypoint: (index: number, kpIdx: number | null) => void;
    onPointClick?: (frame: number) => void;
}

export const GoniometerPanel: React.FC<DynamicGoniometerProps> = ({
    currentAngle, angleHistory, isRecording, toggleRecording, clearGoniometer, linkedKP, linkKeypoint, onPointClick
}) => {
    
    // Simplistic UI to pick joints. In a full version this would be a dropdown.
    // For now we click to cycle through common lower body joints.
    const lowerBodyJoints = [11, 12, 13, 14, 15, 16]; // Hip, Knee, Ankle L/R
    const cycleJoint = (idx: number) => {
        const current = linkedKP[idx];
        const next = current === null ? lowerBodyJoints[0] : lowerBodyJoints[(lowerBodyJoints.indexOf(current) + 1) % lowerBodyJoints.length];
        linkKeypoint(idx, next);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
        >
            <Card className="border-none shadow-2xl bg-slate-900/40 backdrop-blur-xl border border-white/5 overflow-hidden">
                <CardContent className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-500 flex items-center gap-2">
                            <Ruler className="h-3.5 w-3.5" /> Goniometria Dinâmica
                        </h4>
                        <motion.span 
                            key={currentAngle}
                            initial={{ scale: 1.2, color: '#f97316' }}
                            animate={{ scale: 1, color: '#fff' }}
                            className="text-2xl font-black text-white"
                        >
                            {currentAngle}°
                        </motion.span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        {["Vértice", "Ponto A", "Ponto B"].map((label, i) => (
                            <div key={i} className="flex flex-col gap-1.5 items-center">
                                <span className="text-[8px] text-muted-foreground uppercase font-black tracking-widest">{label}</span>
                                <Button 
                                    variant={linkedKP[i] !== null ? "default" : "outline"} 
                                    size="icon" 
                                    className={`w-full h-10 flex flex-col items-center rounded-xl transition-all ${linkedKP[i] !== null ? 'bg-orange-600 border-none shadow-[0_0_10px_rgba(249,115,22,0.3)]' : 'border-white/5 hover:bg-white/5'}`} 
                                    onClick={() => cycleJoint(i)}
                                >
                                    {linkedKP[i] !== null ? (
                                        <span className="text-[8px] font-black leading-tight uppercase px-1">
                                            {KP_NAMES[linkedKP[i]!].replace('left', 'L').replace('right', 'R')}
                                        </span>
                                    ) : (
                                        <Link2 className="h-3.5 w-3.5 text-white/40" />
                                    )}
                                </Button>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <Button 
                            size="sm" 
                            variant={isRecording ? "destructive" : "default"} 
                            className={`flex-1 h-9 text-[10px] font-black uppercase tracking-widest transition-all ${!isRecording ? 'bg-green-600 hover:bg-green-700 border-none shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'shadow-[0_0_15px_rgba(239,68,68,0.3)]'}`}
                            onClick={toggleRecording}
                        >
                            {isRecording ? <><Square className="w-3 h-3 mr-2 mb-0.5 fill-current"/> Parar</> : <><Play className="w-3 h-3 mr-2 mb-0.5 fill-current"/> Gravar Curva</>}
                        </Button>
                        <Button size="icon" variant="outline" className="h-9 w-9 border-white/5 hover:bg-white/5" onClick={clearGoniometer}>
                            <RotateCcw className="h-4 w-4" />
                        </Button>
                    </div>

                    <AnimatePresence>
                        {angleHistory.length > 0 && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-2"
                            >
                                <div className="h-40 w-full mt-2 bg-slate-950/50 rounded-2xl border border-white/5 p-4 relative group/chart">
                                    <div className="absolute top-2 left-3 flex items-center gap-2 pointer-events-none">
                                        <Activity className="h-3 w-3 text-orange-500" />
                                        <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Série Temporal (Frames)</span>
                                    </div>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart 
                                            data={angleHistory}
                                            onClick={(data: any) => {
                                                if (data && data.activePayload && onPointClick) {
                                                    onPointClick(data.activePayload[0].payload.frame);
                                                }
                                            }}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <XAxis dataKey="frame" hide />
                                            <YAxis domain={['auto', 'auto']} hide />
                                            <Tooltip
                                                contentStyle={{ 
                                                    backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                                                    backdropFilter: 'blur(10px)',
                                                    border: '1px solid rgba(255,255,255,0.1)', 
                                                    borderRadius: '12px', 
                                                    fontSize: '10px' 
                                                }}
                                                itemStyle={{ color: '#f97316', fontWeight: '900' }}
                                                labelStyle={{ color: '#64748b', marginBottom: '4px' }}
                                                labelFormatter={(val) => `FRAME: ${val}`}
                                            />
                                            <Line 
                                                type="monotone" 
                                                dataKey="angle" 
                                                stroke="#f97316" 
                                                strokeWidth={3} 
                                                dot={false}
                                                activeDot={{ r: 6, fill: '#f97316', stroke: '#fff', strokeWidth: 2 }}
                                                animationDuration={1000}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                                <p className="text-[8px] text-center text-muted-foreground/60 font-medium uppercase tracking-[0.2em]">
                                    Clique no gráfico para sincronizar timeline
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </CardContent>
            </Card>
        </motion.div>
    );
};
