import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Minus, RotateCcw } from 'lucide-react';

interface ROMData {
  id: string;
  joint: string;
  movement: string;
  active_rom: number;
  passive_rom: number;
  normal_range: string;
  limitation: 'none' | 'mild' | 'moderate' | 'severe';
  pain_with_motion: boolean;
  end_feel: string;
  notes: string;
}

interface RangeOfMotionProps {
  data: ROMData[];
  onChange: (data: ROMData[]) => void;
  className?: string;
}

const joints = [
  { value: 'cervical', label: 'Coluna Cervical', movements: ['Flexão', 'Extensão', 'Inclinação Lateral D', 'Inclinação Lateral E', 'Rotação D', 'Rotação E'] },
  { value: 'shoulder', label: 'Ombro', movements: ['Flexão', 'Extensão', 'Abdução', 'Adução', 'Rotação Interna', 'Rotação Externa'] },
  { value: 'elbow', label: 'Cotovelo', movements: ['Flexão', 'Extensão', 'Pronação', 'Supinação'] },
  { value: 'wrist', label: 'Punho', movements: ['Flexão', 'Extensão', 'Desvio Radial', 'Desvio Ulnar'] },
  { value: 'hip', label: 'Quadril', movements: ['Flexão', 'Extensão', 'Abdução', 'Adução', 'Rotação Interna', 'Rotação Externa'] },
  { value: 'knee', label: 'Joelho', movements: ['Flexão', 'Extensão'] },
  { value: 'ankle', label: 'Tornozelo', movements: ['Dorsiflexão', 'Plantiflexão', 'Inversão', 'Eversão'] },
  { value: 'lumbar', label: 'Coluna Lombar', movements: ['Flexão', 'Extensão', 'Inclinação Lateral D', 'Inclinação Lateral E', 'Rotação D', 'Rotação E'] }
];

const normalRanges: Record<string, Record<string, string>> = {
  cervical: {
    'Flexão': '0-45°',
    'Extensão': '0-45°',
    'Inclinação Lateral D': '0-45°',
    'Inclinação Lateral E': '0-45°',
    'Rotação D': '0-60°',
    'Rotação E': '0-60°'
  },
  shoulder: {
    'Flexão': '0-180°',
    'Extensão': '0-60°',
    'Abdução': '0-180°',
    'Adução': '0-45°',
    'Rotação Interna': '0-70°',
    'Rotação Externa': '0-90°'
  },
  elbow: {
    'Flexão': '0-145°',
    'Extensão': '145-0°',
    'Pronação': '0-80°',
    'Supinação': '0-80°'
  },
  wrist: {
    'Flexão': '0-80°',
    'Extensão': '0-70°',
    'Desvio Radial': '0-20°',
    'Desvio Ulnar': '0-30°'
  },
  hip: {
    'Flexão': '0-120°',
    'Extensão': '0-30°',
    'Abdução': '0-45°',
    'Adução': '0-30°',
    'Rotação Interna': '0-45°',
    'Rotação Externa': '0-45°'
  },
  knee: {
    'Flexão': '0-135°',
    'Extensão': '135-0°'
  },
  ankle: {
    'Dorsiflexão': '0-20°',
    'Plantiflexão': '0-50°',
    'Inversão': '0-35°',
    'Eversão': '0-15°'
  },
  lumbar: {
    'Flexão': '0-60°',
    'Extensão': '0-25°',
    'Inclinação Lateral D': '0-25°',
    'Inclinação Lateral E': '0-25°',
    'Rotação D': '0-30°',
    'Rotação E': '0-30°'
  }
};

const endFeels = [
  'Capsular',
  'Ósseo',
  'Muscular',
  'Ligamentar',
  'Vazio',
  'Espástico',
  'Normal'
];

export function RangeOfMotion({ data, onChange, className }: RangeOfMotionProps) {
  const [selectedJoint, setSelectedJoint] = useState<string>('');
  const [selectedMovement, setSelectedMovement] = useState<string>('');

  const addROMEntry = () => {
    if (!selectedJoint || !selectedMovement) return;

    const joint = joints.find(j => j.value === selectedJoint);
    if (!joint) return;

    const normalRange = normalRanges[selectedJoint]?.[selectedMovement] || '';

    const newEntry: ROMData = {
      id: Date.now().toString(),
      joint: joint.label,
      movement: selectedMovement,
      active_rom: 0,
      passive_rom: 0,
      normal_range: normalRange,
      limitation: 'none',
      pain_with_motion: false,
      end_feel: '',
      notes: ''
    };

    onChange([...data, newEntry]);
    setSelectedMovement('');
  };

  const updateROMEntry = (id: string, updates: Partial<ROMData>) => {
    onChange(data.map(entry => entry.id === id ? { ...entry, ...updates } : entry));
  };

  const removeROMEntry = (id: string) => {
    onChange(data.filter(entry => entry.id !== id));
  };

  const getLimitationColor = (limitation: ROMData['limitation']) => {
    switch (limitation) {
      case 'none': return 'bg-green-100 text-green-800';
      case 'mild': return 'bg-yellow-100 text-yellow-800';
      case 'moderate': return 'bg-orange-100 text-orange-800';
      case 'severe': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateLimitation = (active: number, normal: string): ROMData['limitation'] => {
    const normalValue = parseInt(normal.split('-')[1]?.replace('°', '') || '0');
    if (!normalValue) return 'none';

    const percentage = (active / normalValue) * 100;
    if (percentage >= 90) return 'none';
    if (percentage >= 75) return 'mild';
    if (percentage >= 50) return 'moderate';
    return 'severe';
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <RotateCcw className="w-5 h-5" />
            Amplitude de Movimento (ADM)
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Avaliação goniométrica das articulações
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add New ROM Entry */}
          <div className="flex gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex-1">
              <label className="text-sm font-medium">Articulação</label>
              <Select value={selectedJoint} onValueChange={setSelectedJoint}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a articulação" />
                </SelectTrigger>
                <SelectContent>
                  {joints.map((joint) => (
                    <SelectItem key={joint.value} value={joint.value}>
                      {joint.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1">
              <label className="text-sm font-medium">Movimento</label>
              <Select value={selectedMovement} onValueChange={setSelectedMovement}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o movimento" />
                </SelectTrigger>
                <SelectContent>
                  {selectedJoint && joints.find(j => j.value === selectedJoint)?.movements.map((movement) => (
                    <SelectItem key={movement} value={movement}>
                      {movement}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={addROMEntry} disabled={!selectedJoint || !selectedMovement}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </div>

          {/* ROM Entries */}
          <div className="space-y-4">
            {data.map((entry) => {
              const limitation = calculateLimitation(entry.active_rom, entry.normal_range);
              
              return (
                <Card key={entry.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-medium">{entry.joint} - {entry.movement}</h4>
                        <Badge variant="outline" className="mt-1">
                          Normal: {entry.normal_range}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeROMEntry(entry.id)}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">ADM Ativa (°)</label>
                        <Input
                          type="number"
                          value={entry.active_rom}
                          onChange={(e) => updateROMEntry(entry.id, { active_rom: parseInt(e.target.value) || 0 })}
                          min="0"
                          max="360"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-muted-foreground">ADM Passiva (°)</label>
                        <Input
                          type="number"
                          value={entry.passive_rom}
                          onChange={(e) => updateROMEntry(entry.id, { passive_rom: parseInt(e.target.value) || 0 })}
                          min="0"
                          max="360"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Limitação</label>
                        <div className="pt-2">
                          <Badge className={getLimitationColor(limitation)}>
                            {limitation === 'none' ? 'Normal' : 
                             limitation === 'mild' ? 'Leve' :
                             limitation === 'moderate' ? 'Moderada' : 'Severa'}
                          </Badge>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Sensação Final</label>
                        <Select
                          value={entry.end_feel}
                          onValueChange={(value) => updateROMEntry(entry.id, { end_feel: value })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Selecionar" />
                          </SelectTrigger>
                          <SelectContent>
                            {endFeels.map((feel) => (
                              <SelectItem key={feel} value={feel}>
                                {feel}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 mb-3">
                      <Checkbox
                        id={`pain-${entry.id}`}
                        checked={entry.pain_with_motion}
                        onCheckedChange={(checked) => 
                          updateROMEntry(entry.id, { pain_with_motion: !!checked })
                        }
                      />
                      <label htmlFor={`pain-${entry.id}`} className="text-sm">
                        Dor durante o movimento
                      </label>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Observações</label>
                      <Textarea
                        value={entry.notes}
                        onChange={(e) => updateROMEntry(entry.id, { notes: e.target.value })}
                        placeholder="Compensações, padrões alterados, observações específicas..."
                        rows={2}
                        className="mt-1"
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {data.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <RotateCcw className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma avaliação de ADM registrada</p>
                <p className="text-sm">Adicione articulações e movimentos para começar</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}