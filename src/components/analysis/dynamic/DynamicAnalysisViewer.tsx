import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
    LineChart, Line, CartesianGrid, ScatterChart, Scatter, ReferenceLine
} from 'recharts';
import { DynamicAnalysis, GaitMetrics, OverheadSquatMetrics, RombergMetrics } from '@/types/analysis/schemas';
import { DynamicCompareMetrics } from '@/types/analysis/dynamic_compare';

// Legacy data type with trial_type
interface LegacyAnalysisData {
  trial_type?: 'GAIT' | 'SQUAT_OVERHEAD' | 'ROMBERG';
}

interface DynamicAnalysisViewerProps {
    data: DynamicAnalysis | DynamicCompareMetrics | LegacyAnalysisData | Record<string, unknown>;
}

const DynamicAnalysisViewer: React.FC<DynamicAnalysisViewerProps> = ({ data }) => {
    // 1. Detect New Schema (Dynamic Compare)
    const isDynamicCompare = (d: unknown): d is DynamicCompareMetrics =>
        (d as DynamicCompareMetrics)?.schema_version?.includes('dynamic_compare');

    if (isDynamicCompare(data)) {
        const metrics = data;
        return (
            <div className="space-y-4">
                <Card>
                    <CardHeader><CardTitle>Metodologia & Qualidade</CardTitle></CardHeader>
                    <CardContent className="text-sm space-y-2">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Versão do Schema:</span>
                            <span className="font-mono">{metrics.schema_version}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Tipo de Teste:</span>
                            <span className="font-semibold">{metrics.test_type}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Confiança da Análise:</span>
                            <span className={`font-bold ${metrics.quality.analysis_confidence_overall_0_100 > 80 ? 'text-green-600' : 'text-amber-600'}`}>
                                {metrics.quality.analysis_confidence_overall_0_100}%
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Sincronização:</span>
                            <span>{metrics.synchronization.mode} (Ref: {metrics.synchronization.anchor.anchor_type})</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Dados Brutos (JSON)</CardTitle></CardHeader>
                    <CardContent>
                        <ScrollArea className="h-64 rounded border p-4 bg-slate-50">
                            <pre className="text-xs text-slate-800">{JSON.stringify(metrics, null, 2)}</pre>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // 2. Legacy Dashboards (Gait, Squat, Romberg)
    const legacyData = data as LegacyAnalysisData;
    if (legacyData?.trial_type === 'GAIT') return <GaitDashboard data={legacyData as GaitMetrics} />;
    if (legacyData?.trial_type === 'SQUAT_OVERHEAD') return <SquatDashboard data={legacyData as OverheadSquatMetrics} />;
    if (legacyData?.trial_type === 'ROMBERG') return <RombergDashboard data={legacyData as RombergMetrics} />;

    // 3. Generic Fallback
    return (
        <Card>
            <CardHeader><CardTitle>Detalhes da Análise</CardTitle></CardHeader>
            <CardContent>
                <ScrollArea className="h-64 rounded border p-4">
                    <pre className="text-xs">{JSON.stringify(data, null, 2)}</pre>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};

// --- LEGACY DASHBOARDS (Keep for backward compatibility) ---

const GaitDashboard: React.FC<{ data: GaitMetrics }> = ({ data }) => {
    const symmetryData = [
        { name: 'Passo (Tempo)', value: data.summary.symmetry_step_time_pct || 0 },
        { name: 'Passo (Comp.)', value: data.summary.symmetry_step_length_pct || 0 },
    ];

    const valgusData = [
        { name: 'Esq', value: data.summary.knee_valgus_deg_peak_L || 0, fill: '#3b82f6' },
        { name: 'Dir', value: data.summary.knee_valgus_deg_peak_R || 0, fill: '#ef4444' },
    ];

    const timeSeriesData = data.timeseries?.samples.map(s => ({
        time: s.t_ms / 1000,
        pelvic: s.pelvic_obliquity_deg || 0,
        trunk: s.trunk_lean_frontal_deg || 0
    })) || [];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
                <CardHeader><CardTitle className="text-sm">Parâmetros Espaço-Temporais</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs text-muted-foreground">Cadência</p>
                        <p className="text-2xl font-bold">{data.summary.cadence_spm?.toFixed(0) || '-'}<span className="text-xs font-normal text-muted-foreground"> spm</span></p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Velocidade</p>
                        <p className="text-2xl font-bold">{((data.summary.gait_speed_mm_s || 0) / 1000).toFixed(2) || '-'}<span className="text-xs font-normal text-muted-foreground"> m/s</span></p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Duplo Apoio</p>
                        <p className="text-2xl font-bold">{data.summary.double_support_pct?.toFixed(1) || '-'}<span className="text-xs font-normal text-muted-foreground"> %</span></p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle className="text-sm">Índice de Simetria (%)</CardTitle></CardHeader>
                <CardContent className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={symmetryData} layout="vertical">
                            <XAxis type="number" domain={[80, 100]} hide />
                            <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <ReferenceLine x={100} stroke="green" />
                            <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle className="text-sm">Valgo Dinâmico (Pico)</CardTitle></CardHeader>
                <CardContent className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={valgusData}>
                            <XAxis dataKey="name" />
                            <YAxis unit="°" />
                            <Tooltip />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {timeSeriesData.length > 0 && (
                <Card className="md:col-span-2 lg:col-span-3">
                    <CardHeader><CardTitle className="text-sm">Cinemática Tóraco-Pélvica</CardTitle></CardHeader>
                    <CardContent className="h-60">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={timeSeriesData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="time" unit="s" />
                                <YAxis unit="°" />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="pelvic" name="Obliquidade Pélvica" stroke="#8884d8" dot={false} />
                                <Line type="monotone" dataKey="trunk" name="Inclinação Tronco" stroke="#82ca9d" dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

const SquatDashboard: React.FC<{ data: OverheadSquatMetrics }> = ({ data }) => {
    const repData = data.reps.map(r => ({
        rep: r.rep_index,
        valgusL: r.knee_valgus_deg_at_bottom_L || 0,
        valgusR: r.knee_valgus_deg_at_bottom_R || 0,
        depth: r.depth_score_0_100 || 0,
        trunk: r.trunk_lean_sagittal_deg_at_bottom || 0
    }));

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
                <CardHeader><CardTitle className="text-sm">Scores Médios</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs text-muted-foreground">Profundidade</p>
                        <p className="text-2xl font-bold">{data.summary.depth_score_mean_0_100?.toFixed(0)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Fluidez</p>
                        <p className="text-2xl font-bold">{data.summary.smoothness_mean_0_100?.toFixed(0)}</p>
                    </div>
                    <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">Repetições</p>
                        <p className="text-lg">{data.summary.rep_count}</p>
                    </div>
                </CardContent>
            </Card>

            <Card className="md:col-span-2">
                <CardHeader><CardTitle className="text-sm">Valgo por Repetição (No fundo)</CardTitle></CardHeader>
                <CardContent className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={repData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="rep" label={{ value: 'Rep', position: 'insideBottom', offset: -5 }} />
                            <YAxis unit="°" />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="valgusL" name="Valgo Esq" fill="#3b82f6" />
                            <Bar dataKey="valgusR" name="Valgo Dir" fill="#ef4444" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card className="md:col-span-3">
                <CardHeader><CardTitle className="text-sm">Inclinação do Tronco (Sagital)</CardTitle></CardHeader>
                <CardContent className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={repData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="rep" />
                            <YAxis unit="°" domain={[0, 'auto']} />
                            <Tooltip />
                            <Line type="monotone" dataKey="trunk" stroke="#ff7300" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
};

const RombergDashboard: React.FC<{ data: RombergMetrics }> = ({ data }) => {
    const swayData = [
        { name: 'Olhos Abertos', area: data.summary.sway_area_mm2_EO || 0, velocity: data.summary.sway_velocity_mm_s_EO || 0 },
        { name: 'Olhos Fechados', area: data.summary.sway_area_mm2_EC || 0, velocity: data.summary.sway_velocity_mm_s_EC || 0 },
    ];

    const scatterData = data.timeseries?.samples.map(s => ({
        x: s.com_ml_mm || 0,
        y: s.com_ap_mm || 0,
        segment: s.segment
    })) || [];

    const samplesEO = scatterData.filter(d => d.segment === 'EO');
    const samplesEC = scatterData.filter(d => d.segment === 'EC');

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
                <CardHeader><CardTitle className="text-sm">Índice de Romberg</CardTitle></CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <div>
                        <p className="text-xs text-muted-foreground">Razão (EC / EO)</p>
                        <p className="text-4xl font-bold">{data.summary.romberg_ratio_EC_over_EO?.toFixed(2) || '-'}</p>
                        <p className="text-xs text-muted-foreground">Valores &gt; 1.0 indicam maior oscilação sem visão.</p>
                    </div>
                </CardContent>
            </Card>

            <Card className="md:col-span-2">
                <CardHeader><CardTitle className="text-sm">Área de Oscilação (mm²)</CardTitle></CardHeader>
                <CardContent className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={swayData} layout="vertical">
                            <XAxis type="number" />
                            <YAxis dataKey="name" type="category" width={120} />
                            <Tooltip />
                            <Bar dataKey="area" fill="#8884d8" barSize={30} label={{ position: 'right' }} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card className="md:col-span-3 lg:col-span-2 row-span-2">
                <CardHeader><CardTitle className="text-sm">Estabilometria (Caminho do CoP)</CardTitle></CardHeader>
                <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart>
                            <CartesianGrid />
                            <XAxis type="number" dataKey="x" name="ML (mm)" unit="mm" domain={[-50, 50]} />
                            <YAxis type="number" dataKey="y" name="AP (mm)" unit="mm" domain={[-50, 50]} />
                            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                            <Legend />
                            <Scatter name="Olhos Abertos" data={samplesEO} fill="#3b82f6" line={{ stroke: '#3b82f6', strokeWidth: 1 }} shape="circle" />
                            <Scatter name="Olhos Fechados" data={samplesEC} fill="#ef4444" line={{ stroke: '#ef4444', strokeWidth: 1 }} shape="cross" />
                        </ScatterChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
};

export default DynamicAnalysisViewer;
