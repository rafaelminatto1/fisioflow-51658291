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
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Activity as ActivityIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActivityLabSession, RawForceDataPoint } from '@/types/activityLab';

interface ActivityLabChartProps {
  session: ActivityLabSession;
}

export const ActivityLabChart: React.FC<ActivityLabChartProps> = ({ session }) => {
  const data = (session.raw_force_data || session.rawForceData || []).map((point: RawForceDataPoint) => ({
    time: point.timestamp / 1000, // Convert ms to s
    force: point.value,
  }));

  const peakPoint = data.reduce((prev, current) => (prev.force > current.force) ? prev : current, { time: 0, force: 0 });

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border border-dashed">
        <p className="text-gray-500">Nenhum dado de força disponível para este teste.</p>
      </div>
    );
  }

  const exportToCSV = () => {
    const headers = ['Tempo (s)', 'Forca (kg)'];
    const csvRows = data.map(point => `${point.time.toFixed(3)},${point.force.toFixed(3)}`);
    const csvContent = [headers.join(','), ...csvRows].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `activity_lab_${session.protocol_name}_${session.id}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="w-full border-none shadow-lg bg-white overflow-hidden">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <ActivityIcon className="w-5 h-5 text-blue-600" />
            {session.protocol_name || session.protocolName || 'Curva de Força'}
          </CardTitle>
          <CardDescription className="font-medium text-slate-500">
            {session.body_part || session.bodyPart} | Lado: <span className="text-indigo-600 font-bold">{session.side}</span>
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-2 rounded-xl border-slate-200">
          <Download className="w-4 h-4" />
          Exportar CSV
        </Button>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="time" 
                label={{ value: 'Tempo (s)', position: 'bottom', offset: 0, className: "text-[10px] font-bold fill-slate-400 uppercase tracking-widest" }}
                type="number"
                domain={[0, 'auto']}
                tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }}
              />
              <YAxis 
                label={{ value: 'Força (kg)', angle: -90, position: 'insideLeft', className: "text-[10px] font-bold fill-slate-400 uppercase tracking-widest" }}
                domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.1)]}
                tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px' }}
                itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                labelStyle={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                formatter={(value: number) => [`${value.toFixed(2)} kg`, 'Força']}
                labelFormatter={(label: number) => `Tempo: ${label.toFixed(2)} s`}
              />
              <ReferenceLine y={peakPoint.force} label={{ position: 'right', value: `PICO: ${peakPoint.force.toFixed(1)}kg`, fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }} stroke="#ef4444" strokeDasharray="3 3" />
              <Line
                name="Força Muscular"
                type="monotone"
                dataKey="force"
                stroke="#2563eb"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
                animationDuration={1500}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Pico de Força</p>
            <p className="text-2xl font-black text-blue-700">{(session.peak_force || session.peakForce || 0).toFixed(1)} <span className="text-sm font-bold">kg</span></p>
          </div>
          <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Força Média</p>
            <p className="text-2xl font-black text-emerald-700">{(session.avg_force || session.avgForce || 0).toFixed(1)} <span className="text-sm font-bold">kg</span></p>
          </div>
          <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100/50">
            <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1">RFD (kg/s)</p>
            <p className="text-2xl font-black text-purple-700">{(session.rfd || session.rateOfForceDevelopment || 0).toFixed(1)}</p>
          </div>
          <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100/50">
            <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">Duração</p>
            <p className="text-2xl font-black text-amber-700">{(session.duration || 0).toFixed(1)} <span className="text-sm font-bold">s</span></p>
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap gap-x-6 gap-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            Dispositivo: <span className="text-slate-600">{session.device_model || session.deviceModel}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            Firmware: <span className="text-slate-600">{session.device_firmware || session.deviceFirmware || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            Bateria: <span className={cn(
              "font-black",
              (session.device_battery || 0) < 20 ? "text-red-500" : "text-emerald-500"
            )}>{session.device_battery || session.deviceBattery || 0}%</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            Amostragem: <span className="text-slate-600">{session.sample_rate || session.sampleRate || 80} Hz</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-600 font-medium uppercase">Pico de Força</p>
            <p className="text-xl font-bold">{(session.peak_force || session.peakForce || 0).toFixed(1)} kg</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-xs text-green-600 font-medium uppercase">Força Média</p>
            <p className="text-xl font-bold">{(session.avg_force || session.avgForce || 0).toFixed(1)} kg</p>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg">
            <p className="text-xs text-purple-600 font-medium uppercase">RFD (kg/s)</p>
            <p className="text-xl font-bold">{(session.rfd || session.rateOfForceDevelopment || 0).toFixed(1)}</p>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg">
            <p className="text-xs text-orange-600 font-medium uppercase">Duração</p>
            <p className="text-xl font-bold">{(session.duration || 0).toFixed(1)} s</p>
          </div>
        </div>
        
        <div className="mt-4 text-xs text-gray-400 flex flex-wrap gap-x-4">
          <span>Dispositivo: {session.device_model || session.deviceModel}</span>
          <span>Firmware: {session.device_firmware || session.deviceFirmware}</span>
          <span>Bateria: {session.device_battery || session.deviceBattery}%</span>
          <span>Simulado: {session.is_simulated ? 'Sim' : 'Não'}</span>
          <span>Frequência: {session.sample_rate || session.sampleRate || 80} Hz</span>
        </div>
      </CardContent>
    </Card>
  );
};
