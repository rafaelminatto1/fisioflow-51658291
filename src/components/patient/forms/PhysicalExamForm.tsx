import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';

interface PhysicalExamFormProps {
    data: any;
    onChange: (data: any) => void;
    readOnly?: boolean;
}

export const PhysicalExamForm = ({ data, onChange, readOnly = false }: PhysicalExamFormProps) => {
    const handleChange = (field: string, value: any) => {
        onChange({ ...data, [field]: value });
    };

    const addSpecialTest = () => {
        const currentTests = data.specialTests || [];
        handleChange('specialTests', [...currentTests, { name: '', result: 'negative', notes: '' }]);
    };

    const updateSpecialTest = (index: number, field: string, value: any) => {
        const newTests = [...(data.specialTests || [])];
        newTests[index] = { ...newTests[index], [field]: value };
        handleChange('specialTests', newTests);
    };

    const removeSpecialTest = (index: number) => {
        const newTests = [...(data.specialTests || [])];
        newTests.splice(index, 1);
        handleChange('specialTests', newTests);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Inspeção e Palpação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Inspeção Visual</Label>
                            <Textarea
                                placeholder="Observações visuais (edema, coloração, cicatrizes...)"
                                value={data.inspection || ''}
                                onChange={(e) => handleChange('inspection', e.target.value)}
                                readOnly={readOnly}
                                rows={4}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Palpação</Label>
                            <Textarea
                                placeholder="Dor, tensão muscular, temperatura..."
                                value={data.palpation || ''}
                                onChange={(e) => handleChange('palpation', e.target.value)}
                                readOnly={readOnly}
                                rows={4}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Postura e Marcha</Label>
                        <Textarea
                            placeholder="Análise postural e padrão de marcha..."
                            value={data.posture || ''}
                            onChange={(e) => handleChange('posture', e.target.value)}
                            readOnly={readOnly}
                            rows={2}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Testes Especiais</CardTitle>
                    {!readOnly && (
                        <Button onClick={addSpecialTest} variant="outline" size="sm">
                            <Plus className="w-4 h-4 mr-2" /> Adicionar Teste
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {(data.specialTests || []).map((test: any, i: number) => (
                            <div key={i} className="flex flex-col md:flex-row gap-3 items-start p-3 bg-muted/30 rounded-lg border">
                                <div className="flex-1 space-y-2 w-full">
                                    <Input
                                        placeholder="Nome do Teste (ex: Lachman)"
                                        value={test.name}
                                        onChange={(e) => updateSpecialTest(i, 'name', e.target.value)}
                                        readOnly={readOnly}
                                    />
                                </div>
                                <div className="w-full md:w-32">
                                    <select
                                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={test.result}
                                        onChange={(e) => updateSpecialTest(i, 'result', e.target.value)}
                                        disabled={readOnly}
                                    >
                                        <option value="positive">Positivo (+)</option>
                                        <option value="negative">Negativo (-)</option>
                                    </select>
                                </div>
                                <div className="flex-1 w-full">
                                    <Input
                                        placeholder="Observações..."
                                        value={test.notes || ''}
                                        onChange={(e) => updateSpecialTest(i, 'notes', e.target.value)}
                                        readOnly={readOnly}
                                    />
                                </div>
                                {!readOnly && (
                                    <Button variant="ghost" size="icon" onClick={() => removeSpecialTest(i)} className="text-destructive hover:bg-destructive/10">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        ))}
                        {(!data.specialTests || data.specialTests.length === 0) && (
                            <p className="text-muted-foreground text-center py-4 italic">Nenhum teste especial registrado.</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Amplitude de Movimento (ADM) e Força</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>ADM (Graus)</Label>
                            <Textarea
                                placeholder="Ex: Flexão Joelho D: 120º, E: 135º..."
                                value={JSON.stringify(data.rangeOfMotion || {}, null, 2).replace(/[\{\}"]/g, '')}
                                onChange={(e) => {
                                    // Simple text handler for now, ideally structured
                                    // For this demo we just keep it as text in the state if simplified
                                    // but for real implementation we ideally want structured inputs per joint
                                }}
                                readOnly={readOnly}
                            />
                            <p className="text-xs text-muted-foreground">Descreva as amplitudes de movimento mensuradas.</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Força Muscular (Grau 0-5)</Label>
                            <Textarea
                                placeholder="Ex: Quadríceps D: 4, E: 5..."
                                value={JSON.stringify(data.muscleStrength || {}, null, 2).replace(/[\{\}"]/g, '')}
                                onChange={(e) => { }}
                                readOnly={readOnly}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
