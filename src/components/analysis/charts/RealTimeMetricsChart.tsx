import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent } from "@/components/ui/card";
import { JointAngle } from '../../../types/biomechanics';

interface RealTimeMetricsChartProps {
    data: Array<{ frame: number } & Record<string, number>>;
    selectedAngles: string[];
}

export const RealTimeMetricsChart: React.FC<RealTimeMetricsChartProps> = ({ data, selectedAngles }) => {
    // Keep only last 100 data points for performance
    const chartData = data.slice(-100);

    return (
        <Card className="border-none bg-slate-950/40 backdrop-blur-xl shadow-2xl overflow-hidden rounded-[2rem]">
            <CardContent className="p-4 h-[200px]">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-4 px-2">Angle Variation Trend</h4>
                <ResponsiveContainer width="100%" height="80%">
                    <LineChart data={chartData}>
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
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
};
