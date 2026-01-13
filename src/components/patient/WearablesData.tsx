import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWearables } from '@/hooks/useWearables';
import { Heart, Moon, Footprints, Plus, Watch } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WearablesDataProps {
    patientId: string;
}

type Period = '7d' | '30d' | '90d';
type MetricType = 'heart_rate' | 'steps' | 'sleep' | 'weight' | 'spo2';

export function WearablesData({ patientId }: WearablesDataProps) {
    const { wearableData, addWearableData, isAdding } = useWearables(patientId);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [_period, setPeriod] = useState<Period>('7d');
    const [_selectedMetric, setSelectedMetric] = useState<MetricType>('heart_rate');
    const [newData, setNewData] = useState({
        source: 'manual',
        data_type: 'heart_rate',
        value: '',
        unit: 'bpm'
    });

    const handleSubmit = async () => {
        if (!newData.value) return;

        await addWearableData({
            patient_id: patientId,
            source: newData.source,
            data_type: newData.data_type,
            value: Number(newData.value),
            unit: newData.unit,
            timestamp: new Date().toISOString()
        }, {
            onSuccess: () => {
                setIsAddOpen(false);
                setNewData(prev => ({ ...prev, value: '' }));
            }
        });
    };

    const getDataByType = (type: string) => {
        return wearableData
            .filter(d => d.data_type === type)
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    };

    const heartRateData = getDataByType('heart_rate');
    const stepsData = getDataByType('steps');
    const sleepData = getDataByType('sleep');

    const latestHeartRate = heartRateData[heartRateData.length - 1];
    const latestSteps = stepsData[stepsData.length - 1];
    const latestSleep = sleepData[sleepData.length - 1];

    const formatDate = (date: string) => format(new Date(date), 'dd/MM HH:mm', { locale: ptBR });

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Watch className="h-5 w-5 text-primary" />
                    Dados de Wearables
                </h2>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Adicionar Dado
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Adicionar Dado Manual</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Tipo de Dado</Label>
                                <Select
                                    value={newData.data_type}
                                    onValueChange={(val) => setNewData(prev => ({
                                        ...prev,
                                        data_type: val,
                                        unit: val === 'heart_rate' ? 'bpm' : val === 'steps' ? 'steps' : val === 'weight' ? 'kg' : val === 'spo2' ? '%' : 'hours'
                                    }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="heart_rate">Frequência Cardíaca</SelectItem>
                                        <SelectItem value="steps">Passos</SelectItem>
                                        <SelectItem value="sleep">Sono</SelectItem>
                                        <SelectItem value="weight">Peso</SelectItem>
                                        <SelectItem value="spo2">SpO2</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Valor ({newData.unit})</Label>
                                <Input
                                    type="number"
                                    value={newData.value}
                                    onChange={(e) => setNewData(prev => ({ ...prev, value: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Fonte</Label>
                                <Select
                                    value={newData.source}
                                    onValueChange={(val) => setNewData(prev => ({ ...prev, source: val }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="manual">Manual</SelectItem>
                                        <SelectItem value="apple">Apple Health</SelectItem>
                                        <SelectItem value="google">Google Fit</SelectItem>
                                        <SelectItem value="fitbit">Fitbit</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSubmit} disabled={isAdding}>
                                {isAdding ? 'Salvando...' : 'Salvar'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Heart Rate Card */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Frequência Cardíaca</CardTitle>
                        <Heart className="h-4 w-4 text-rose-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {latestHeartRate ? `${latestHeartRate.value} bpm` : '--'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {latestHeartRate ? `Última leitura: ${formatDate(latestHeartRate.timestamp)}` : 'Sem dados recentes'}
                        </p>
                    </CardContent>
                </Card>

                {/* Steps Card */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Passos</CardTitle>
                        <Footprints className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {latestSteps ? latestSteps.value.toLocaleString() : '--'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {latestSteps ? `Última leitura: ${formatDate(latestSteps.timestamp)}` : 'Sem dados recentes'}
                        </p>
                    </CardContent>
                </Card>

                {/* Sleep Card */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Sono</CardTitle>
                        <Moon className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {latestSleep ? `${latestSleep.value}h` : '--'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {latestSleep ? `Última leitura: ${formatDate(latestSleep.timestamp)}` : 'Sem dados recentes'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Histórico de Frequência Cardíaca</CardTitle>
                    <CardDescription>Variação dos últimos registros</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                    {heartRateData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={heartRateData.slice(-20)}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis
                                    dataKey="timestamp"
                                    tickFormatter={(val) => format(new Date(val), 'dd/MM HH:mm')}
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    domain={['dataMin - 10', 'dataMax + 10']}
                                />
                                <Tooltip
                                    labelFormatter={(val) => format(new Date(val), 'dd/MM/yyyy HH:mm:ss')}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#e11d48"
                                    strokeWidth={2}
                                    dot={{ r: 4, fill: "#e11d48" }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            Nenhum dado de frequência cardíaca disponível
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
