import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity as ActivityIcon } from 'lucide-react';
import type { ActivityLabSession } from '@/types/activityLab';
import { format } from 'date-fns';

interface ActivityLabComparisonChartProps {
  session1: ActivityLabSession;
  session2: ActivityLabSession;
}

export const ActivityLabComparisonChart: React.FC<ActivityLabComparisonChartProps> = ({ session1, session2 }) => {
  // Normalize data for comparison
  const data1 = (session1.raw_force_data || session1.rawForceData || []).map((point) => ({
    time: point.timestamp / 1000,
    force1: point.value,
  }));

  const data2 = (session2.raw_force_data || session2.rawForceData || []).map((point) => ({
    time: point.timestamp / 1000,
    force2: point.value,
  }));

  // Merge data based on time (approximated)
  // For a better comparison, we might want to align peaks or just plot them on the same time axis
  const combinedData: any[] = [];
  const maxLen = Math.max(data1.length, data2.length);
  
  for (let i = 0; i < maxLen; i++) {
    combinedData.push({
      time: i * (1/80), // 80Hz assumption if timestamps vary
      force1: data1[i]?.force1,
      force2: data2[i]?.force2,
    });
  }

  const peak1 = session1.peak_force || session1.peakForce || 0;
  const peak2 = session2.peak_force || session2.peakForce || 0;
  const diff = ((peak1 - peak2) / Math.max(peak1, peak2)) * 100;
  const asymmetry = Math.abs(diff).toFixed(1);

  return (
    <Card className="w-full border-none shadow-lg bg-white overflow-hidden">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <ActivityIcon className="w-5 h-5 text-indigo-600" />
              Comparativo de Testes
            </CardTitle>
            <CardDescription className="font-medium text-slate-500">
              {session1.protocol_name} vs {session2.protocol_name}
            </CardDescription>
          </div>
          <Badge className="bg-indigo-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
            Assimetria: {asymmetry}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={combinedData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="time" 
                label={{ value: 'Tempo (s)', position: 'bottom', offset: 0, className: "text-[10px] font-bold fill-slate-400 uppercase tracking-widest" }}
                tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }}
              />
              <YAxis 
                label={{ value: 'Força (kg)', angle: -90, position: 'insideLeft', className: "text-[10px] font-bold fill-slate-400 uppercase tracking-widest" }}
                tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px' }}
                itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                formatter={(value: number) => [`${value.toFixed(2)} kg`]}
              />
              <Legend verticalAlign="top" height={36}/>
              <Line
                name={`${session1.side} (${format(new Date(session1.created_at), 'dd/MM')})`}
                type="monotone"
                dataKey="force1"
                stroke="#2563eb"
                strokeWidth={3}
                dot={false}
              />
              <Line
                name={`${session2.side} (${format(new Date(session2.created_at), 'dd/MM')})`}
                type="monotone"
                dataKey="force2"
                stroke="#ef4444"
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-8">
          <div className="p-4 rounded-2xl border border-blue-100 bg-blue-50/30">
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">{session1.side} - {format(new Date(session1.created_at), 'dd/MM/yyyy')}</p>
            <div className="flex justify-between items-end">
              <div>
                <span className="text-2xl font-black text-blue-700">{peak1.toFixed(1)}</span>
                <span className="text-xs font-bold text-blue-500 ml-1">kg</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-400 block uppercase">RFD</span>
                <span className="text-sm font-black text-slate-600">{(session1.rfd || 0).toFixed(1)}</span>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-2xl border border-red-100 bg-red-50/30">
            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-2">{session2.side} - {format(new Date(session2.created_at), 'dd/MM/yyyy')}</p>
            <div className="flex justify-between items-end">
              <div>
                <span className="text-2xl font-black text-red-700">{peak2.toFixed(1)}</span>
                <span className="text-xs font-bold text-red-500 ml-1">kg</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-400 block uppercase">RFD</span>
                <span className="text-sm font-black text-slate-600">{(session2.rfd || 0).toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
