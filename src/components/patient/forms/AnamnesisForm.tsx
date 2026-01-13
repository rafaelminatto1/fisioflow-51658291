import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

interface LifestyleData {
    smoking?: boolean;
    alcohol?: boolean;
}

interface AnamnesisFormData {
    chiefComplaint?: string;
    currentHistory?: string;
    pastHistory?: string;
    familyHistory?: string;
    medications?: string;
    allergies?: string;
    physicalActivity?: string;
    lifestyle?: LifestyleData;
}

interface AnamnesisFormProps {
    data: AnamnesisFormData;
    onChange: (data: AnamnesisFormData) => void;
    readOnly?: boolean;
}

export const AnamnesisForm = ({ data, onChange, readOnly = false }: AnamnesisFormProps) => {
    const handleChange = (field: keyof AnamnesisFormData, value: string | LifestyleData) => {
        onChange({ ...data, [field]: value });
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Queixa e Histórico</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Queixa Principal (QP)</Label>
                        <Textarea
                            placeholder="O que trouxe o paciente à consulta?"
                            value={data.chiefComplaint || ''}
                            onChange={(e) => handleChange('chiefComplaint', e.target.value)}
                            readOnly={readOnly}
                            className="resize-none"
                            rows={3}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>História da Doença Atual (HDA)</Label>
                        <Textarea
                            placeholder="Início, evolução, fatores de melhora/piora..."
                            value={data.currentHistory || ''}
                            onChange={(e) => handleChange('currentHistory', e.target.value)}
                            readOnly={readOnly}
                            rows={5}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Histórico Médico Pregresso</Label>
                        <Textarea
                            placeholder="Doenças pré-existentes, tratamentos anteriores..."
                            value={data.pastHistory || ''}
                            onChange={(e) => handleChange('pastHistory', e.target.value)}
                            readOnly={readOnly}
                            rows={3}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Histórico Familiar</Label>
                        <Textarea
                            value={data.familyHistory || ''}
                            onChange={(e) => handleChange('familyHistory', e.target.value)}
                            readOnly={readOnly}
                            rows={2}
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Medicamentos e Alergias</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Medicamentos em Uso</Label>
                            <Textarea
                                placeholder="Liste os medicamentos..."
                                value={data.medications || ''}
                                onChange={(e) => handleChange('medications', e.target.value)}
                                readOnly={readOnly}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Alergias</Label>
                            <Textarea
                                placeholder="Liste as alergias..."
                                value={data.allergies || ''}
                                onChange={(e) => handleChange('allergies', e.target.value)}
                                readOnly={readOnly}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Estilo de Vida</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Atividade Física</Label>
                            <Input
                                value={data.physicalActivity || ''}
                                onChange={(e) => handleChange('physicalActivity', e.target.value)}
                                placeholder="Ex: Sedentário, Atleta amador..."
                                readOnly={readOnly}
                            />
                        </div>
                        <div className="flex flex-col gap-3 mt-4">
                            <div className="flex items-center space-x-2">
                                <Checkbox id="smoking"
                                    checked={data.lifestyle?.smoking || false}
                                    onCheckedChange={(c) => handleChange('lifestyle', { ...data.lifestyle, smoking: c })}
                                    disabled={readOnly}
                                />
                                <label htmlFor="smoking" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Tabagismo
                                </label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="alcohol"
                                    checked={data.lifestyle?.alcohol || false}
                                    onCheckedChange={(c) => handleChange('lifestyle', { ...data.lifestyle, alcohol: c })}
                                    disabled={readOnly}
                                />
                                <label htmlFor="alcohol" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Consumo de Álcool
                                </label>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
