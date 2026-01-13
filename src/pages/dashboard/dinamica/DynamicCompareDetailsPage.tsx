import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

import { parseDynamicCompare } from '@/lib/validation/dynamicCompare';
import { DynamicCompareMetrics } from '@/generated/types/dynamic_compare_metrics';
import DeltaCards from '@/components/metrics/DeltaCards';
import MetricsTrendChart, { TrendSeriesPoint } from '@/components/metrics/MetricsTrendChart';
import GoalPanel from '@/components/goals/GoalPanel';

// Mock Data Loader (Replace with real fetch)
const fetchCompareData = async (_id: string): Promise<Record<string, unknown>> => {
    // Simulating API latency
    await new Promise(r => setTimeout(r, 800));

    // Return mock data compliant with schema
    return {
        schema_version: "dynamic_compare@1.0.0",
        compare_type: "DYNAMIC_COMPARE",
        created_at: new Date().toISOString(),
        test_type: "GAIT",
        trial_A: { label: "Pre-Op", captured_at: "2025-01-01T10:00:00Z", source_asset_ids: ["a1"] },
        trial_B: { label: "Post-Op (6 weeks)", captured_at: "2025-02-15T10:00:00Z", source_asset_ids: ["b1"] },
        synchronization: { mode: "AUTO", anchor: { anchor_type: "Heel Strike", trial_A: { frame_index: 0, t_ms: 0 }, trial_B: { frame_index: 0, t_ms: 0 } } },
        metric_deltas: [
            { key: "gait.cadence", label: "Cadência", unit: "spm", value_A: 98, value_B: 108, delta: 10, directionality: "HIGHER_IS_BETTER", status: "IMPROVED", confidence_0_100: 95 },
            { key: "gait.velocity", label: "Velocidade Média", unit: "m/s", value_A: 0.8, value_B: 1.1, delta: 0.3, directionality: "HIGHER_IS_BETTER", status: "IMPROVED", confidence_0_100: 92 },
            { key: "gait.symmetry", label: "Simetria de Passo", unit: "%", value_A: 85, value_B: 94, delta: 9, directionality: "HIGHER_IS_BETTER", status: "IMPROVED", confidence_0_100: 88 },
            { key: "gait.knee_valgus_L", label: "Valgo Joelho (Esq)", unit: "deg", value_A: 12, value_B: 11, delta: -1, directionality: "LOWER_IS_BETTER", status: "UNCHANGED", confidence_0_100: 80 }
        ],
        summary: {
            improvements: ["Aumento significativo na cadência."],
            still_to_improve: ["Valgo dinâmico residual."],
            key_findings: ["Paciente demonstra boa recuperação."],
            metrics_table_markdown: "| Métrica | Valor | Status |\n|---|---|---|\n| Cadência | 108 | Melhorou |"
        },
        quality: {
            analysis_confidence_overall_0_100: 89,
            warnings: []
        }
    };
};

const DynamicCompareDetailsPage = () => {
    const { id } = useParams<{ id: string }>();
    const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
    const [data, setData] = useState<DynamicCompareMetrics | null>(null);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        if (!id) return;
        setStatus('loading');

        fetchCompareData(id)
            .then(raw => {
                try {
                    // Validating with our Schema-First pipeline
                    const validData = parseDynamicCompare(raw);
                    setData(validData);
                    setStatus('success');
                } catch {
                    console.error(e);
                    setError((e as Error).message);
                    setStatus('error');
                }
            })
            .catch(e => {
                setError(e.message);
                setStatus('error');
            });
    }, [id]);

    if (status === 'loading') {
        return <div className="flex items-center justify-center p-20"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>;
    }

    if (status === 'error') {
        return (
            <div className="p-6">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erro de Validação</AlertTitle>
                    <AlertDescription className="whitespace-pre-wrap font-mono text-xs mt-2">
                        {error}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    if (!data) return null;

    // Trend Mock
    const trendSeries: TrendSeriesPoint[] = [
        { date: "2025-01-01", compare_id: "c1", test_type: "GAIT", values: { "gait.cadence": 98, "gait.velocity": 0.8 } },
        { date: "2025-01-15", compare_id: "c2", test_type: "GAIT", values: { "gait.cadence": 102, "gait.velocity": 0.9 } },
        { date: "2025-02-15", compare_id: "c3", test_type: "GAIT", values: { "gait.cadence": 108, "gait.velocity": 1.1 } },
    ];

    // Extract available keys from current data for the dropdown
    const availableKeys = data.metric_deltas.map(d => ({ key: d.key, label: d.label, unit: d.unit || '' }));

    return (
        <div className="container mx-auto p-6 space-y-6 max-w-7xl">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold">Detalhes da Comparação</h1>
                    <p className="text-muted-foreground flex items-center gap-2 mt-1">
                        {data.test_type} • {new Date(data.created_at).toLocaleDateString()}
                        <Badge variant="outline" className={data.quality.analysis_confidence_overall_0_100 > 80 ? 'border-green-500 text-green-700' : 'border-amber-500'}>
                            Confiança: {data.quality.analysis_confidence_overall_0_100}%
                        </Badge>
                    </p>
                </div>
                <Button variant="outline">Voltar</Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Card A vs B Info */}
                <Card>
                    <CardHeader><CardTitle className="text-sm">Sessão A (Base)</CardTitle></CardHeader>
                    <CardContent>
                        <p className="font-medium">{data.trial_A.label}</p>
                        <p className="text-xs text-muted-foreground">{new Date(data.trial_A.captured_at).toLocaleString()}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="text-sm">Sessão B (Atual)</CardTitle></CardHeader>
                    <CardContent>
                        <p className="font-medium">{data.trial_B.label}</p>
                        <p className="text-xs text-muted-foreground">{new Date(data.trial_B.captured_at).toLocaleString()}</p>
                    </CardContent>
                </Card>
            </div>

            <div>
                <h3 className="text-lg font-semibold mb-3">Deltas Principais</h3>
                <DeltaCards data={data} mode="ALL" showConfidence />
            </div>

            <div className="mb-6">
                <GoalPanel
                    compareData={data}
                    promSnapshot={{ "prom.acl_rsi_0_100": 68, "prom.ikdc_0_100": 78 }}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <MetricsTrendChart series={trendSeries} availableKeys={availableKeys} height={350} />
                </div>
                <div>
                    <Card className="h-full">
                        <CardHeader><CardTitle>Resumo Clínico</CardTitle></CardHeader>
                        <CardContent className="prose prose-sm dark:prose-invert">
                            <h4 className="text-green-700 font-medium m-0">Melhorias</h4>
                            <ul className="mt-1 mb-4">
                                {data.summary.improvements?.map((im, i) => <li key={i}>{im}</li>)}
                            </ul>
                            {data.summary.metrics_table_markdown && (
                                <ReactMarkdown>{data.summary.metrics_table_markdown}</ReactMarkdown>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default DynamicCompareDetailsPage;
