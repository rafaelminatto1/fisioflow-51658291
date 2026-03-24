import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Beaker } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

const PHAST_TESTS = [
    { id: 'hop_test', name: 'Hop Test (Distância)', unit: 'cm', desc: 'Assimetria Aceitável: < 10%' },
    { id: 'thomas_test', name: 'Teste de Thomas', unit: '°', desc: 'Assimetria Aceitável: < 15%' },
    { id: 'navicular_drop', name: 'Drop Navicular', unit: 'mm', desc: 'Assimetria Aceitável: < 15%' },
];

export const PhastTestsPanel: React.FC = () => {
    const [selectedTest, setSelectedTest] = useState(PHAST_TESTS[0].id);
    const [leftVal, setLeftVal] = useState<string>('');
    const [rightVal, setRightVal] = useState<string>('');

    const calcAsymmetry = () => {
        const l = parseFloat(leftVal);
        const r = parseFloat(rightVal);
        if (isNaN(l) || isNaN(r) || (l === 0 && r === 0)) return null;
        const max = Math.max(l, r);
        const diff = Math.abs(l - r);
        return ((diff / max) * 100).toFixed(1);
    };

    const asymmetry = calcAsymmetry();
    const currentTest = PHAST_TESTS.find(t => t.id === selectedTest)!;

    return (
        <Card className="border-none shadow-sm bg-purple-500/5 mt-4">
            <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-500 flex items-center gap-2">
                        <Activity className="h-3 w-3" /> Bateria Phast
                    </h4>
                    <Badge variant="outline" className="text-[8px] uppercase font-black text-purple-500 border-purple-500/20">
                        +50 Disponíveis na Pro
                    </Badge>
                </div>

                <div className="grid grid-cols-3 gap-1 mb-2">
                    {PHAST_TESTS.map(t => (
                        <Button 
                            key={t.id} 
                            variant={selectedTest === t.id ? "default" : "outline"} 
                            size="sm" 
                            className={`h-8 text-[9px] font-bold ${selectedTest === t.id ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                            onClick={() => setSelectedTest(t.id)}
                        >
                            <span className="truncate">{t.name.split(' (')[0]}</span>
                        </Button>
                    ))}
                </div>

                <div className="space-y-2">
                    <p className="text-[9px] font-bold text-muted-foreground">{currentTest.desc}</p>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Esquerda ({currentTest.unit})</label>
                            <input 
                                type="number" 
                                className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm shadow-purple-500/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple-500"
                                value={leftVal}
                                onChange={e => setLeftVal(e.target.value)}
                                placeholder="0"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Direita ({currentTest.unit})</label>
                            <input 
                                type="number" 
                                className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm shadow-purple-500/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple-500"
                                value={rightVal}
                                onChange={e => setRightVal(e.target.value)}
                                placeholder="0"
                            />
                        </div>
                    </div>
                </div>

                {asymmetry !== null && (
                    <div className={`p-3 rounded-lg text-center border mt-2 ${Number(asymmetry) > 15 ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-green-500/10 border-green-500/20 text-green-500'}`}>
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <Beaker className="h-4 w-4" />
                            <p className="text-[12px] font-black uppercase tracking-widest">
                                Assimetria: {asymmetry}%
                            </p>
                        </div>
                        <p className="text-[9px] font-bold">
                            {Number(asymmetry) > 15 ? 'ALERTA: Alto Risco de Lesão Identificado' : 'STATUS: Margem Clínica Aceitável'}
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
