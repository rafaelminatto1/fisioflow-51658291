import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ruler, Play, Square, Link2 } from 'lucide-react';
import { KP_NAMES } from '@/types/biomechanics';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';

interface DynamicGoniometerProps {
    currentAngle: number;
    angleHistory: { frame: number; angle: number }[];
    isRecording: boolean;
    linkedKP: [number | null, number | null, number | null];
    toggleRecording: () => void;
    clearGoniometer: () => void;
    linkKeypoint: (index: number, kpIdx: number | null) => void;
}

export const GoniometerPanel: React.FC<DynamicGoniometerProps> = ({
    currentAngle, angleHistory, isRecording, toggleRecording, clearGoniometer, linkedKP, linkKeypoint
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
        <Card className="border-none shadow-sm bg-orange-500/5 mt-4">
            <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-500 flex items-center gap-2">
                        <Ruler className="h-3 w-3" /> Ângulo Dinâmico
                    </h4>
                    <span className="text-xl font-black">{currentAngle}°</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    {["Vértice", "Ponto A", "Ponto B"].map((label, i) => (
                        <div key={i} className="flex flex-col gap-1 items-center">
                            <span className="text-[8px] text-muted-foreground uppercase">{label}</span>
                            <Button variant={linkedKP[i] !== null ? "default" : "outline"} size="icon" className="w-full h-8 flex flex-col items-center" onClick={() => cycleJoint(i)}>
                                {linkedKP[i] !== null ? <span className="text-[8px] font-black leading-tight truncate px-1">{KP_NAMES[linkedKP[i]!].replace('left', 'L').replace('right', 'R')}</span> : <Link2 className="h-3 w-3" />}
                            </Button>
                        </div>
                    ))}
                </div>

                <div className="flex gap-2">
                    <Button 
                        size="sm" 
                        variant={isRecording ? "destructive" : "default"} 
                        className={`flex-1 h-8 text-[10px] font-black ${!isRecording ? 'bg-green-600 hover:bg-green-700' : ''}`}
                        onClick={toggleRecording}
                    >
                        {isRecording ? <><Square className="w-3 h-3 mr-1 fill-current"/> Parar</> : <><Play className="w-3 h-3 mr-1 fill-current"/> Gravar Curva</>}
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-[10px]" onClick={clearGoniometer}>
                        Resetar
                    </Button>
                </div>

                {angleHistory.length > 0 && (
                    <div className="h-32 w-full mt-2 bg-background rounded-lg border border-border p-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={angleHistory}>
                                <XAxis dataKey="frame" hide />
                                <YAxis domain={['auto', 'auto']} hide />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#000', border: 'none', borderRadius: '8px', fontSize: '10px' }}
                                    itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                                    labelStyle={{ display: 'none' }}
                                />
                                <Line type="monotone" dataKey="angle" stroke="#f97316" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
