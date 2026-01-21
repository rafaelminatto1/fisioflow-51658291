import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Label } from '@/components/shared/ui/label';
import { Input } from '@/components/shared/ui/input';
import { Textarea } from '@/components/shared/ui/textarea';
import { Button } from '@/components/shared/ui/button';
import {
    Plus,
    Trash2,
    Eye,
    ClipboardCheck,
    Dumbbell,
    CircleDot,
    CheckCircle2
} from 'lucide-react';
import { Badge } from '@/components/shared/ui/badge';

interface SpecialTest {
    name: string;
    result: string;
    notes: string;
}

interface PhysicalExamFormData {
    inspection?: string;
    palpation?: string;
    posture?: string;
    specialTests?: SpecialTest[];
    rangeOfMotion?: string;
    muscleStrength?: string;
}

interface PhysicalExamFormProps {
    data: PhysicalExamFormData;
    onChange: (data: PhysicalExamFormData) => void;
    readOnly?: boolean;
}

export const PhysicalExamForm = ({ data, onChange, readOnly = false }: PhysicalExamFormProps) => {
    const handleChange = (field: keyof PhysicalExamFormData, value: string | SpecialTest[]) => {
        onChange({ ...data, [field]: value });
    };

    const addSpecialTest = () => {
        const currentTests = data.specialTests || [];
        handleChange('specialTests', [...currentTests, { name: '', result: 'negative', notes: '' }]);
    };

    const updateSpecialTest = (index: number, field: keyof SpecialTest, value: string) => {
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
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Eye className="w-5 h-5 text-primary" />
                        Inspeção e Palpação
                    </CardTitle>
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
                    <CardTitle className="text-lg flex items-center gap-2">
                        <ClipboardCheck className="w-5 h-5 text-primary" />
                        Testes Especiais
                    </CardTitle>
                    {!readOnly && (
                        <Button onClick={addSpecialTest} variant="outline" size="sm">
                            <Plus className="w-4 h-4 mr-2" /> Adicionar Teste
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {(data.specialTests || []).map((test, i) => (
                            <div key={i} className="flex flex-col md:flex-row gap-3 items-start p-3 bg-muted/30 rounded-lg border">
                                <div className="flex-1 space-y-2 w-full">
                                    <Input
                                        placeholder="Nome do Teste (ex: Lachman)"
                                        value={test.name}
                                        onChange={(e) => updateSpecialTest(i, 'name', e.target.value)}
                                        readOnly={readOnly}
                                    />
                                </div>
                                <div className="w-full md:w-36 flex items-center justify-center">
                                    {readOnly ? (
                                        <Badge
                                            variant={test.result === 'positive' ? 'destructive' : 'default'}
                                            className={test.result === 'negative' ? 'bg-green-500 hover:bg-green-600' : ''}
                                        >
                                            {test.result === 'positive' ? (
                                                <><CircleDot className="w-3 h-3 mr-1" /> Positivo</>
                                            ) : (
                                                <><CheckCircle2 className="w-3 h-3 mr-1" /> Negativo</>
                                            )}
                                        </Badge>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => updateSpecialTest(i, 'result', test.result === 'positive' ? 'negative' : 'positive')}
                                            className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-md"
                                            aria-label={`Alternar resultado para ${test.result === 'positive' ? 'negativo' : 'positivo'}`}
                                        >
                                            <Badge
                                                variant={test.result === 'positive' ? 'destructive' : 'default'}
                                                className={`cursor-pointer transition-all hover:opacity-80 py-1.5 px-3 ${test.result === 'negative' ? 'bg-green-500 hover:bg-green-600 font-bold' : 'font-bold'
                                                    }`}
                                            >
                                                {test.result === 'positive' ? (
                                                    <><CircleDot className="w-3 h-3 mr-1" /> Positivo (+)</>
                                                ) : (
                                                    <><CheckCircle2 className="w-3 h-3 mr-1" /> Negativo (-)</>
                                                )}
                                            </Badge>
                                        </button>
                                    )}
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
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Dumbbell className="w-5 h-5 text-primary" />
                        Amplitude de Movimento (ADM) e Força
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>ADM (Graus)</Label>
                            <Textarea
                                placeholder="Ex: Flexão Joelho D: 120º, E: 135º..."
                                value={typeof data.rangeOfMotion === 'string' ? data.rangeOfMotion : ''}
                                onChange={(e) => handleChange('rangeOfMotion', e.target.value)}
                                readOnly={readOnly}
                            />
                            <p className="text-xs text-muted-foreground">Descreva as amplitudes de movimento mensuradas.</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Força Muscular (Grau 0-5)</Label>
                            <Textarea
                                placeholder="Ex: Quadríceps D: 4, E: 5..."
                                value={typeof data.muscleStrength === 'string' ? data.muscleStrength : ''}
                                onChange={(e) => handleChange('muscleStrength', e.target.value)}
                                readOnly={readOnly}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
