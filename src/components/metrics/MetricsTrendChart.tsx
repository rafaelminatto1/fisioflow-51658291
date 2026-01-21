import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shared/ui/select';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { format } from 'date-fns';

export interface TrendSeriesPoint {
    date: string; // ISO
    compare_id: string;
    test_type: string;
    values: Record<string, number | null>;
}

interface MetricsTrendChartProps {
    series: TrendSeriesPoint[];
    availableKeys: { key: string; label: string; unit: string }[];
    height?: number;
}

const MetricsTrendChart: React.FC<MetricsTrendChartProps> = ({
    series,
    availableKeys,
    height = 300
}) => {
    const [selectedKey, setSelectedKey] = useState<string>(availableKeys[0]?.key || '');

    const selectedMetricInfo = availableKeys.find(k => k.key === selectedKey);

    // Prepare data for Recharts
    const chartData = series.map(point => ({
        dateStr: format(new Date(point.date), 'dd/MM/yy'),
        fullDate: format(new Date(point.date), 'PP p'),
        value: point.values[selectedKey] ?? null,
        unit: selectedMetricInfo?.unit,
        ...point
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (!selectedKey || series.length === 0) {
        return (
            <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                    Dados insuficientes para gerar gráfico de tendência.
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-medium">Evolução Temporal</CardTitle>
                <Select value={selectedKey} onValueChange={setSelectedKey}>
                    <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder="Selecione uma métrica" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableKeys.map((k) => (
                            <SelectItem key={k.key} value={k.key}>
                                {k.label} ({k.unit})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent>
                <div style={{ height }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="dateStr" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} unit={selectedMetricInfo?.unit ? ` ${selectedMetricInfo.unit}` : ''} />
                            <Tooltip
                                labelFormatter={(label, payload) => payload[0]?.payload.fullDate || label}
                                formatter={(value: number) => [value.toFixed(2), selectedMetricInfo?.label]}
                            />
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke="#2563eb"
                                strokeWidth={2}
                                activeDot={{ r: 6 }}
                                dot={{ r: 4 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
};

export default MetricsTrendChart;
