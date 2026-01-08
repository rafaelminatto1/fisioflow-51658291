import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, XCircle, MinusCircle, Info } from 'lucide-react';

import { DynamicCompareMetrics } from '@/generated/types/dynamic_compare_metrics';
import { goalProfiles } from '@/lib/goals/goalProfiles';
import { evaluateGoals } from '@/lib/goals/goalEngine';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface GoalPanelProps {
    compareData: DynamicCompareMetrics;
    promSnapshot?: Record<string, number | null>;
}

const GoalPanel: React.FC<GoalPanelProps> = ({ compareData, promSnapshot }) => {
    // Default to ACL or first relevant profile
    const [selectedProfileId, setSelectedProfileId] = useState<string>("acl_rts_readiness");

    const availableProfiles = Object.values(goalProfiles).filter(p =>
        // Only show profiles relevant to the test type (if we want to be strict)
        // Or show all. Let's show all for now but allow user to enable.
        true
    );

    const profile = goalProfiles[selectedProfileId];

    const evaluation = useMemo(() => {
        if (!profile) return null;
        return evaluateGoals(compareData, profile, promSnapshot);
    }, [compareData, profile, promSnapshot]);

    if (!profile) return null;

    return (
        <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            Metas Clínicas (Goal Profile)
                            {evaluation?.overallStatus === "ON_TRACK" && <Badge className="bg-green-500">No Caminho</Badge>}
                            {evaluation?.overallStatus === "NEEDS_FOCUS" && <Badge variant="destructive">Requer Atenção</Badge>}
                        </CardTitle>
                        <CardDescription>{profile.description}</CardDescription>
                    </div>
                    <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {availableProfiles.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Valid Warnings */}
                    {evaluation?.overallStatus === "NA" && (
                        <div className="bg-amber-50 p-2 text-amber-800 text-xs rounded mb-2">
                            Atenção: A confiança da análise é muito baixa para validar este perfil de metas.
                        </div>
                    )}

                    {/* Targets List */}
                    <div className="grid gap-2">
                        {evaluation?.targets.map((res) => (
                            <div key={res.key} className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium">{res.label}</span>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span>Atual: <b>{res.currentValue}</b></span>
                                        <span>•</span>
                                        <span>Alvo: {res.targetDisplay}</span>
                                    </div>
                                    {res.rationale && <span className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">{res.rationale}</span>}
                                </div>

                                <Badge variant="outline" className={`
                                    ${res.status === 'MET' ? 'bg-green-100 text-green-700 border-green-200' : ''}
                                    ${res.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : ''}
                                    ${res.status === 'NOT_MET' ? 'bg-red-100 text-red-700 border-red-200' : ''}
                                    ${res.status === 'NA' ? 'bg-gray-100 text-gray-500 border-gray-200' : ''}
                                `}>
                                    {res.status === 'MET' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                    {res.status === 'PARTIAL' && <Info className="w-3 h-3 mr-1" />}
                                    {res.status === 'NOT_MET' && <XCircle className="w-3 h-3 mr-1" />}
                                    {res.status === 'NA' && <MinusCircle className="w-3 h-3 mr-1" />}
                                    {res.status}
                                </Badge>
                            </div>
                        ))}
                    </div>

                    {/* Evidence Footer */}
                    {profile.evidence && (
                        <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
                            <p className="font-semibold mb-1">Evidências Relacionadas:</p>
                            <ul className="list-disc pl-4 space-y-1">
                                {profile.evidence.map((e, i) => (
                                    <li key={i}>
                                        <span className="font-medium">{e.label}:</span> {e.source}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default GoalPanel;
