import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Card, CardContent } from "@/components/ui/card";

interface RealTimeMetricsChartProps {
    data: Array<{ frame: number } & Record<string, number>>;
    selectedAngles: string[];
}

export const RealTimeMetricsChart: React.FC<RealTimeMetricsChartProps> = ({ data, selectedAngles }) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [chartSize, setChartSize] = React.useState({ width: 0, height: 0 });

    React.useEffect(() => {
        const element = containerRef.current;
        if (!element || typeof ResizeObserver === "undefined") return;

        const updateSize = (width: number, height: number) => {
            const nextWidth = Math.floor(width);
            const nextHeight = Math.floor(height);

            setChartSize((prev) =>
                prev.width === nextWidth && prev.height === nextHeight
                    ? prev
                    : { width: nextWidth, height: nextHeight },
            );
        };

        updateSize(element.clientWidth, element.clientHeight);

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            updateSize(entry.contentRect.width, entry.contentRect.height);
        });

        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    // Keep only last 100 data points for performance
    const chartData = data.slice(-100);
    const canRenderChart = chartSize.width > 24 && chartSize.height > 24 && chartData.length > 0;

    return (
        <Card className="border-none bg-slate-950/40 backdrop-blur-xl shadow-2xl overflow-hidden rounded-[2rem]">
            <CardContent className="p-4 h-[200px]">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-4 px-2">Angle Variation Trend</h4>
                <div ref={containerRef} className="h-[calc(100%-2rem)] min-h-[120px] min-w-0">
                    {canRenderChart ? (
                    <LineChart width={chartSize.width} height={chartSize.height} data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                        <XAxis 
                            dataKey="frame" 
                            hide 
                            stroke="#ffffff20"
                        />
                        <YAxis 
                            domain={[0, 180]} 
                            stroke="#ffffff20" 
                            fontSize={10}
                            tickFormatter={(val) => `${val}°`}
                        />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', fontSize: '10px' }}
                            itemStyle={{ fontWeight: 'black' }}
                        />
                        {selectedAngles.map((angleName, index) => (
                            <Line
                                key={angleName}
                                type="monotone"
                                dataKey={angleName}
                                stroke={index === 0 ? "#818cf8" : index === 1 ? "#34d399" : "#fbbf24"}
                                strokeWidth={2}
                                dot={false}
                                isAnimationActive={false}
                            />
                        ))}
                    </LineChart>
                    ) : (
                    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 text-[10px] font-bold uppercase tracking-widest text-white/30">
                        Aguardando dados
                    </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
