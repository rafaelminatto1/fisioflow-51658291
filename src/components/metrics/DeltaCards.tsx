import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DynamicCompareMetrics } from '@/generated/types/dynamic_compare_metrics';
import { formatMetricValue } from './helpers';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';

interface DeltaCardsProps {
    data: DynamicCompareMetrics;
    mode?: "ALL" | "IMPROVED" | "WORSE" | "UNCHANGED";
    showConfidence?: boolean;
}

const DeltaCards: React.FC<DeltaCardsProps> = ({ data, mode = "ALL", showConfidence = false }) => {

    // Filter based on mode
    const filtereddeltas = data.metric_deltas.filter(d => {
        if (mode === "ALL") return true;
        return d.status === mode;
    });

    // Sort: IMPROVED first, then by absolute delta
    const sortedDeltas = [...filtereddeltas].sort((a, b) => {
        if (a.status === 'IMPROVED' && b.status !== 'IMPROVED') return -1;
        if (a.status !== 'IMPROVED' && b.status === 'IMPROVED') return 1;
        return Math.abs(b.delta || 0) - Math.abs(a.delta || 0);
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'IMPROVED': return 'bg-green-100 text-green-800 border-green-200';
            case 'WORSE': return 'bg-red-100 text-red-800 border-red-200';
            case 'UNCHANGED': return 'bg-slate-100 text-slate-800 border-slate-200';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getIcon = (status: string, delta: number | null) => {
        if (status === 'UNCHANGED' || delta === 0) return <Minus className="w-3 h-3" />;
        // This assumes improved depends on directionality, but typically UP is physically up? 
        // Actually delta is B - A. If delta > 0, value increased.
        // Icon should reflect Value Change, Color reflects Good/Bad.
        if ((delta || 0) > 0) return <ArrowUp className="w-3 h-3" />;
        return <ArrowDown className="w-3 h-3" />;
    };

    if (sortedDeltas.length === 0) {
        return <div className="text-muted-foreground text-sm italic">Nenhuma métrica encontrada para este filtro.</div>;
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {sortedDeltas.map((metric) => (
                <Card key={metric.key} className="shadow-sm">
                    <CardContent className="p-4 flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                            <span className="text-xs font-medium text-muted-foreground line-clamp-2 min-h-[2.5em]" title={metric.label}>
                                {metric.label}
                            </span>
                            {showConfidence && metric.confidence_0_100 && (
                                <span className={`text-[10px] ${metric.confidence_0_100 < 70 ? 'text-amber-500' : 'text-slate-400'}`}>
                                    {metric.confidence_0_100}% conf.
                                </span>
                            )}
                        </div>

                        <div className="flex items-baseline justify-between">
                            <span className="text-2xl font-bold">
                                {formatMetricValue(metric.value_B)}
                                <span className="text-xs font-normal text-muted-foreground ml-1">{metric.unit}</span>
                            </span>
                        </div>

                        <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-slate-400">
                                Prev: {formatMetricValue(metric.value_A)}
                            </span>
                            <Badge variant="outline" className={`text-[10px] px-1 py-0 h-5 gap-1 ${getStatusColor(metric.status)}`}>
                                {getIcon(metric.status, metric.delta)}
                                {metric.delta && metric.delta > 0 ? '+' : ''}{formatMetricValue(metric.delta, '')}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

export default DeltaCards;
