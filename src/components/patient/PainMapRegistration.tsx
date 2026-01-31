import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { PatientService } from '@/lib/services/PatientService';
import { Activity } from 'lucide-react';
import { fisioLogger as logger } from '@/lib/errors/logger';

interface PainMapRegistrationProps {
    patientId: string;
    onSuccess?: () => void;
}

const BODY_PARTS = [
    'Cabeça', 'Pescoço', 'Ombro (D)', 'Ombro (E)', 'Braço (D)', 'Braço (E)',
    'Cotovelo (D)', 'Cotovelo (E)', 'Pulso (D)', 'Pulso (E)', 'Mão (D)', 'Mão (E)',
    'Coluna Cervical', 'Coluna Torácica', 'Coluna Lombar', 'Abdominais',
    'Quadril (D)', 'Quadril (E)', 'Coxa (D)', 'Coxa (E)', 'Joelho (D)', 'Joelho (E)',
    'Tornozelo (D)', 'Tornozelo (E)', 'Pé (D)', 'Pé (E)'
];

const PAIN_TYPES = [
    'Aguda', 'Latejante', 'Queimação', 'Formigamento', 'Cansaço/Peso', 'Pontada', 'Constantemente Presente'
];

export const PainMapRegistration: React.FC<PainMapRegistrationProps> = ({ patientId, onSuccess }) => {
    const [level, setLevel] = useState(0);
    const [bodyPart, setBodyPart] = useState('');
    const [painType, setPainType] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleSave = async () => {
        if (!bodyPart || !painType) {
            toast({
                title: "Campos obrigatórios",
                description: "Por favor, selecione a região e o tipo de dor.",
                variant: "destructive"
            });
            return;
        }

        try {
            setLoading(true);
            await PatientService.savePainRecord(patientId, level, painType, bodyPart, notes);
            toast({
                title: "Registro salvo",
                description: "Seu registro de dor foi salvo com sucesso.",
            });
            setLevel(0);
            setBodyPart('');
            setPainType('');
            setNotes('');
            if (onSuccess) onSuccess();
        } catch (error) {
            logger.error('Error saving pain record', error, 'PainMapRegistration');
            toast({
                title: "Erro ao salvar",
                description: "Não foi possível salvar seu registro. Tente novamente.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Registrar Dor
                </CardTitle>
                <CardDescription>
                    Informe como você está se sentindo hoje para que possamos ajustar seu tratamento.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Nível de Dor (EVA: 0 - 10)</label>
                    <div className="flex items-center gap-4">
                        <Slider
                            value={[level]}
                            onValueChange={(v) => setLevel(v[0])}
                            max={10}
                            step={1}
                            className="flex-1"
                        />
                        <span className={cn(
                            "text-lg font-bold h-10 w-10 flex items-center justify-center rounded-full border-2",
                            level === 0 ? "text-green-500 border-green-500" :
                                level < 4 ? "text-yellow-500 border-yellow-500" :
                                    level < 7 ? "text-orange-500 border-orange-500" :
                                        "text-red-500 border-red-500"
                        )}>
                            {level}
                        </span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground px-1">
                        <span>Sem dor</span>
                        <span>Moderada</span>
                        <span>Intensa</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Região do Corpo</label>
                        <Select value={bodyPart} onValueChange={setBodyPart}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione a região" />
                            </SelectTrigger>
                            <SelectContent>
                                {BODY_PARTS.map(part => (
                                    <SelectItem key={part} value={part}>{part}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Tipo de Dor</label>
                        <Select value={painType} onValueChange={setPainType}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                {PAIN_TYPES.map(type => (
                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Observações (opcional)</label>
                    <Textarea
                        placeholder="Descreva mais detalhes sobre o que está sentindo..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </div>

                <Button
                    className="w-full"
                    disabled={loading}
                    onClick={handleSave}
                >
                    {loading ? "Salvando..." : "Salvar Registro"}
                </Button>
            </CardContent>
        </Card>
    );
};

// Helper for conditional classes if not already available
function cn(...classes: (string | boolean | undefined | null | number)[]) {
    return classes.filter(Boolean).join(' ');
}
