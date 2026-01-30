import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
    Trash2,
    Plus,
    FileText,
    Stethoscope,
    Heart,
    Pill,
    Scissors,
    Target,
    CircleDot,
    CheckCircle2,
    Cigarette,
    Wine,
    ClipboardList,
    Eye,
    ClipboardCheck,
    Dumbbell
} from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface LifestyleData {
    smoking?: boolean;
    alcohol?: boolean;
}

interface Surgery {
    name: string;
    date: string;
    surgeon: string;
    hospital: string;
    notes?: string;
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
    newSurgeries?: Surgery[];
    newGoals?: { description: string; targetDate: string }[];
    newPathologies?: { name: string; status: 'active' | 'treated'; diagnosedAt: string }[];
}

interface AnamnesisFormProps {
    data: AnamnesisFormData;
    onChange: (data: AnamnesisFormData) => void;
    readOnly?: boolean;
}

export const AnamnesisForm = ({ data, onChange, readOnly = false }: AnamnesisFormProps) => {
    const handleChange = (field: keyof AnamnesisFormData, value: string | number | boolean | string[]) => {
        onChange({ ...data, [field]: value });
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        Queixa e Histórico
                    </CardTitle>
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

            {/* Pathologies Section */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Stethoscope className="w-5 h-5 text-primary" />
                        Patologias e Diagnósticos
                    </CardTitle>
                    {!readOnly && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                const current = data.newPathologies || [];
                                handleChange('newPathologies', [...current, { name: '', status: 'active', diagnosedAt: '' }]);
                            }}
                            className="gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Adicionar Patologia
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    {!data.newPathologies || data.newPathologies.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/5">
                            <ClipboardList className="w-10 h-10 mb-3 opacity-20" />
                            <p className="text-sm italic">Nenhuma patologia registrada no momento.</p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nome da Patologia</TableHead>
                                        <TableHead className="w-[150px]">Status</TableHead>
                                        <TableHead className="w-[180px]">Diagnóstico</TableHead>
                                        {!readOnly && <TableHead className="w-[50px]"></TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.newPathologies.map((pathology, i) => (
                                        <TableRow key={i}>
                                            <TableCell>
                                                <Input
                                                    value={pathology.name}
                                                    onChange={(e) => {
                                                        const updated = [...(data.newPathologies || [])];
                                                        updated[i] = { ...updated[i], name: e.target.value };
                                                        handleChange('newPathologies', updated);
                                                    }}
                                                    placeholder="Ex: Hérnia de Disco"
                                                    readOnly={readOnly}
                                                    className="border-0 bg-transparent focus-visible:ring-1 focus-visible:ring-offset-0 h-8 p-0"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {readOnly ? (
                                                    <Badge
                                                        variant={pathology.status === 'active' ? 'destructive' : 'default'}
                                                        className={pathology.status === 'treated' ? 'bg-green-500 hover:bg-green-600' : ''}
                                                    >
                                                        {pathology.status === 'active' ? (
                                                            <><CircleDot className="w-3 h-3 mr-1" /> Ativa</>
                                                        ) : (
                                                            <><CheckCircle2 className="w-3 h-3 mr-1" /> Tratada</>
                                                        )}
                                                    </Badge>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const updated = [...(data.newPathologies || [])];
                                                            updated[i] = {
                                                                ...updated[i],
                                                                status: pathology.status === 'active' ? 'treated' : 'active'
                                                            };
                                                            handleChange('newPathologies', updated);
                                                        }}
                                                        className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-md"
                                                        aria-label={`Alternar status para ${pathology.status === 'active' ? 'tratada' : 'ativa'}`}
                                                    >
                                                        <Badge
                                                            variant={pathology.status === 'active' ? 'destructive' : 'default'}
                                                            className={`cursor-pointer transition-all hover:opacity-80 ${pathology.status === 'treated' ? 'bg-green-500 hover:bg-green-600' : ''}`}
                                                        >
                                                            {pathology.status === 'active' ? (
                                                                <><CircleDot className="w-3 h-3 mr-1" /> Ativa</>
                                                            ) : (
                                                                <><CheckCircle2 className="w-3 h-3 mr-1" /> Tratada</>
                                                            )}
                                                        </Badge>
                                                    </button>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="date"
                                                    value={pathology.diagnosedAt}
                                                    max={new Date().toISOString().split('T')[0]}
                                                    onChange={(e) => {
                                                        const updated = [...(data.newPathologies || [])];
                                                        updated[i] = { ...updated[i], diagnosedAt: e.target.value };
                                                        handleChange('newPathologies', updated);
                                                    }}
                                                    readOnly={readOnly}
                                                    className="border-0 bg-transparent focus-visible:ring-1 focus-visible:ring-offset-0 h-8 p-0"
                                                />
                                            </TableCell>
                                            {!readOnly && (
                                                <TableCell>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const updated = [...(data.newPathologies || [])];
                                                            updated.splice(i, 1);
                                                            handleChange('newPathologies', updated);
                                                        }}
                                                        className="text-destructive hover:bg-destructive/10 p-2 rounded-md"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Heart className="w-5 h-5 text-primary" />
                            Estilo de Vida
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>Atividade Física</Label>
                            <Input
                                value={data.physicalActivity || ''}
                                onChange={(e) => handleChange('physicalActivity', e.target.value)}
                                placeholder="Ex: Sedentário, Atleta amador..."
                                readOnly={readOnly}
                                className="transition-all focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-2">
                            <button
                                type="button"
                                disabled={readOnly}
                                onClick={() => handleChange('lifestyle', { ...data.lifestyle, smoking: !data.lifestyle?.smoking })}
                                className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all group ${data.lifestyle?.smoking
                                    ? 'border-primary bg-primary/5 text-primary'
                                    : 'border-muted hover:border-primary/50 text-muted-foreground'
                                    }`}
                            >
                                <div className={`p-3 rounded-full transition-colors ${data.lifestyle?.smoking ? 'bg-primary text-white' : 'bg-muted group-hover:bg-primary/10'
                                    }`}>
                                    <Cigarette className="w-5 h-5" />
                                </div>
                                <span className="text-sm font-semibold uppercase tracking-wider">Tabagismo</span>
                            </button>

                            <button
                                type="button"
                                disabled={readOnly}
                                onClick={() => handleChange('lifestyle', { ...data.lifestyle, alcohol: !data.lifestyle?.alcohol })}
                                className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all group ${data.lifestyle?.alcohol
                                    ? 'border-primary bg-primary/5 text-primary'
                                    : 'border-muted hover:border-primary/50 text-muted-foreground'
                                    }`}
                            >
                                <div className={`p-3 rounded-full transition-colors ${data.lifestyle?.alcohol ? 'bg-primary text-white' : 'bg-muted group-hover:bg-primary/10'
                                    }`}>
                                    <Wine className="w-5 h-5" />
                                </div>
                                <span className="text-sm font-semibold uppercase tracking-wider">Álcool</span>
                            </button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Pill className="w-5 h-5 text-primary" />
                            Medicamentos e Alergias
                        </CardTitle>
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
            </div>

            {/* Surgeries Section */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Scissors className="w-5 h-5 text-primary" />
                        Cirurgias Anteriores
                    </CardTitle>
                    {!readOnly && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                const current = data.newSurgeries || [];
                                handleChange('newSurgeries', [...current, { name: '', date: '', surgeon: '', hospital: '', notes: '' }]);
                            }}
                            className="gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Adicionar Cirurgia
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    {!data.newSurgeries || data.newSurgeries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/5">
                            <ClipboardList className="w-10 h-10 mb-3 opacity-20" />
                            <p className="text-sm italic">Nenhuma cirurgia registrada. Clique em "Adicionar Cirurgia" para começar.</p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[200px]">Nome da Cirurgia</TableHead>
                                        <TableHead className="w-[140px]">Data</TableHead>
                                        <TableHead>Cirurgião</TableHead>
                                        <TableHead>Hospital</TableHead>
                                        <TableHead>Observações</TableHead>
                                        {!readOnly && <TableHead className="w-[50px]"></TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.newSurgeries.map((surgery, i) => (
                                        <TableRow key={i}>
                                            <TableCell>
                                                <Input
                                                    value={surgery.name}
                                                    onChange={(e) => {
                                                        const updated = [...(data.newSurgeries || [])];
                                                        updated[i] = { ...updated[i], name: e.target.value };
                                                        handleChange('newSurgeries', updated);
                                                    }}
                                                    placeholder="Nome"
                                                    readOnly={readOnly}
                                                    className="border-0 bg-transparent focus-visible:ring-1 focus-visible:ring-offset-0 h-8 p-0"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="date"
                                                    value={surgery.date}
                                                    max={new Date().toISOString().split('T')[0]}
                                                    onChange={(e) => {
                                                        const updated = [...(data.newSurgeries || [])];
                                                        updated[i] = { ...updated[i], date: e.target.value };
                                                        handleChange('newSurgeries', updated);
                                                    }}
                                                    readOnly={readOnly}
                                                    className="border-0 bg-transparent focus-visible:ring-1 focus-visible:ring-offset-0 h-8 p-0"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    value={surgery.surgeon}
                                                    onChange={(e) => {
                                                        const updated = [...(data.newSurgeries || [])];
                                                        updated[i] = { ...updated[i], surgeon: e.target.value };
                                                        handleChange('newSurgeries', updated);
                                                    }}
                                                    placeholder="Cirurgião"
                                                    readOnly={readOnly}
                                                    className="border-0 bg-transparent focus-visible:ring-1 focus-visible:ring-offset-0 h-8 p-0"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    value={surgery.hospital}
                                                    onChange={(e) => {
                                                        const updated = [...(data.newSurgeries || [])];
                                                        updated[i] = { ...updated[i], hospital: e.target.value };
                                                        handleChange('newSurgeries', updated);
                                                    }}
                                                    placeholder="Hospital"
                                                    readOnly={readOnly}
                                                    className="border-0 bg-transparent focus-visible:ring-1 focus-visible:ring-offset-0 h-8 p-0"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    value={surgery.notes}
                                                    onChange={(e) => {
                                                        const updated = [...(data.newSurgeries || [])];
                                                        updated[i] = { ...updated[i], notes: e.target.value };
                                                        handleChange('newSurgeries', updated);
                                                    }}
                                                    placeholder="Obs..."
                                                    readOnly={readOnly}
                                                    className="border-0 bg-transparent focus-visible:ring-1 focus-visible:ring-offset-0 h-8 p-0"
                                                />
                                            </TableCell>
                                            {!readOnly && (
                                                <TableCell>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const updated = [...(data.newSurgeries || [])];
                                                            updated.splice(i, 1);
                                                            handleChange('newSurgeries', updated);
                                                        }}
                                                        className="text-destructive hover:bg-destructive/10 p-2 rounded-md"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Goals Section */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Target className="w-5 h-5 text-primary" />
                        Objetivos do Tratamento
                    </CardTitle>
                    {!readOnly && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                const current = data.newGoals || [];
                                handleChange('newGoals', [...current, { description: '', targetDate: '' }]);
                            }}
                            className="gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Adicionar Objetivo
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    {!data.newGoals || data.newGoals.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/5">
                            <ClipboardList className="w-10 h-10 mb-3 opacity-20" />
                            <p className="text-sm italic">Nenhum objetivo definido no momento.</p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Descrição do Objetivo</TableHead>
                                        <TableHead className="w-[180px]">Data Alvo</TableHead>
                                        {!readOnly && <TableHead className="w-[50px]"></TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.newGoals.map((goal, i) => (
                                        <TableRow key={i}>
                                            <TableCell>
                                                <Input
                                                    value={goal.description}
                                                    onChange={(e) => {
                                                        const updated = [...(data.newGoals || [])];
                                                        updated[i] = { ...updated[i], description: e.target.value };
                                                        handleChange('newGoals', updated);
                                                    }}
                                                    placeholder="Ex: Correr 5km sem dor"
                                                    readOnly={readOnly}
                                                    className="border-0 bg-transparent focus-visible:ring-1 focus-visible:ring-offset-0 h-8 p-0"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="date"
                                                    value={goal.targetDate}
                                                    min={new Date().toISOString().split('T')[0]}
                                                    onChange={(e) => {
                                                        const updated = [...(data.newGoals || [])];
                                                        updated[i] = { ...updated[i], targetDate: e.target.value };
                                                        handleChange('newGoals', updated);
                                                    }}
                                                    readOnly={readOnly}
                                                    className="border-0 bg-transparent focus-visible:ring-1 focus-visible:ring-offset-0 h-8 p-0"
                                                />
                                            </TableCell>
                                            {!readOnly && (
                                                <TableCell>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const updated = [...(data.newGoals || [])];
                                                            updated.splice(i, 1);
                                                            handleChange('newGoals', updated);
                                                        }}
                                                        className="text-destructive hover:bg-destructive/10 p-2 rounded-md"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

