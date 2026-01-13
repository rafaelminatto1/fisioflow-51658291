import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface Equipment {
  id: string;
  name: string;
  icon: string;
  hasParameters: boolean;
  parameters?: EquipmentParameter[];
}

export interface EquipmentParameter {
  id: string;
  label: string;
  type: 'number' | 'select' | 'text';
  unit?: string;
  options?: string[];
  defaultValue?: string | number;
}

export interface SelectedEquipment {
  equipmentId: string;
  parameters?: Record<string, string | number>;
}

const defaultEquipments: Equipment[] = [
  {
    id: 'laser',
    name: 'Laser',
    icon: '🔴',
    hasParameters: true,
    parameters: [
      { id: 'power', label: 'Potência', type: 'select', options: ['3J', '4J', '6J', '8J'], defaultValue: '4J' },
      { id: 'time', label: 'Tempo', type: 'number', unit: 'seg', defaultValue: 30 },
      { id: 'points', label: 'Pontos', type: 'number', defaultValue: 10 },
    ]
  },
  {
    id: 'ultrassom',
    name: 'Ultrassom',
    icon: '🔊',
    hasParameters: true,
    parameters: [
      { id: 'frequency', label: 'Frequência', type: 'select', options: ['1MHz', '3MHz'], defaultValue: '1MHz' },
      { id: 'intensity', label: 'Intensidade', type: 'number', unit: 'W/cm²', defaultValue: 1.0 },
      { id: 'time', label: 'Tempo', type: 'number', unit: 'min', defaultValue: 5 },
      { id: 'mode', label: 'Modo', type: 'select', options: ['Contínuo', 'Pulsado'], defaultValue: 'Contínuo' },
    ]
  },
  {
    id: 'tens',
    name: 'TENS',
    icon: '⚡',
    hasParameters: true,
    parameters: [
      { id: 'frequency', label: 'Frequência', type: 'number', unit: 'Hz', defaultValue: 100 },
      { id: 'time', label: 'Tempo', type: 'number', unit: 'min', defaultValue: 20 },
      { id: 'intensity', label: 'Intensidade', type: 'text', defaultValue: 'Confortável' },
    ]
  },
  {
    id: 'corrente_russa',
    name: 'Corrente Russa',
    icon: '💪',
    hasParameters: true,
    parameters: [
      { id: 'frequency', label: 'Frequência', type: 'select', options: ['2500Hz', '5000Hz'], defaultValue: '2500Hz' },
      { id: 'time', label: 'Tempo', type: 'number', unit: 'min', defaultValue: 15 },
      { id: 'rise', label: 'Rise/Decay', type: 'text', defaultValue: '3/3' },
    ]
  },
  {
    id: 'ondas_curtas',
    name: 'Ondas Curtas',
    icon: '📡',
    hasParameters: true,
    parameters: [
      { id: 'mode', label: 'Modo', type: 'select', options: ['Contínuo', 'Pulsado'], defaultValue: 'Pulsado' },
      { id: 'time', label: 'Tempo', type: 'number', unit: 'min', defaultValue: 20 },
      { id: 'intensity', label: 'Intensidade', type: 'text', defaultValue: 'Calor agradável' },
    ]
  },
  {
    id: 'infravermelho',
    name: 'Infravermelho',
    icon: '🔥',
    hasParameters: true,
    parameters: [
      { id: 'time', label: 'Tempo', type: 'number', unit: 'min', defaultValue: 15 },
      { id: 'distance', label: 'Distância', type: 'number', unit: 'cm', defaultValue: 50 },
    ]
  },
  {
    id: 'crioterapia',
    name: 'Crioterapia',
    icon: '❄️',
    hasParameters: true,
    parameters: [
      { id: 'time', label: 'Tempo', type: 'number', unit: 'min', defaultValue: 20 },
      { id: 'method', label: 'Método', type: 'select', options: ['Bolsa de gelo', 'Spray', 'Imersão'], defaultValue: 'Bolsa de gelo' },
    ]
  },
  {
    id: 'maca',
    name: 'Maca',
    icon: '🛏️',
    hasParameters: false,
  },
];

interface EquipmentSelectorProps {
  selectedEquipments: SelectedEquipment[];
  onSelectionChange: (equipments: SelectedEquipment[]) => void;
  disabled?: boolean;
}

export const EquipmentSelector: React.FC<EquipmentSelectorProps> = ({
  selectedEquipments,
  onSelectionChange,
  disabled = false
}) => {
  const isSelected = (equipmentId: string) =>
    selectedEquipments.some(e => e.equipmentId === equipmentId);

  const toggleEquipment = (equipment: Equipment) => {
    if (disabled) return;
    
    if (isSelected(equipment.id)) {
      onSelectionChange(selectedEquipments.filter(e => e.equipmentId !== equipment.id));
    } else {
      const defaultParams: Record<string, string | number> = {};
      equipment.parameters?.forEach(param => {
        if (param.defaultValue !== undefined) {
          defaultParams[param.id] = param.defaultValue;
        }
      });
      
      onSelectionChange([...selectedEquipments, { 
        equipmentId: equipment.id, 
        parameters: defaultParams 
      }]);
    }
  };

  const updateParameter = (equipmentId: string, paramId: string, value: string | number) => {
    onSelectionChange(selectedEquipments.map(e => {
      if (e.equipmentId === equipmentId) {
        return {
          ...e,
          parameters: { ...e.parameters, [paramId]: value }
        };
      }
      return e;
    }));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {defaultEquipments.map((equipment) => (
          <button
            key={equipment.id}
            type="button"
            onClick={() => toggleEquipment(equipment)}
            disabled={disabled}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all",
              isSelected(equipment.id) 
                ? "bg-primary text-primary-foreground border-primary" 
                : "bg-background hover:bg-muted border-border",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <span>{equipment.icon}</span>
            <span>{equipment.name}</span>
          </button>
        ))}
      </div>

      {/* Parameters for selected equipments */}
      {selectedEquipments.length > 0 && (
        <div className="space-y-3 mt-3">
          {selectedEquipments.map((selected) => {
            const equipment = defaultEquipments.find(e => e.id === selected.equipmentId);
            if (!equipment?.hasParameters) return null;

            return (
              <div key={selected.equipmentId} className="bg-muted/40 rounded-lg p-3 border">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="text-xs">
                    {equipment.icon} {equipment.name}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {equipment.parameters?.map((param) => (
                    <div key={param.id} className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        {param.label} {param.unit && `(${param.unit})`}
                      </Label>
                      {param.type === 'select' ? (
                        <Select
                          value={String(selected.parameters?.[param.id] || param.defaultValue || '')}
                          onValueChange={(value) => updateParameter(selected.equipmentId, param.id, value)}
                          disabled={disabled}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {param.options?.map((option) => (
                              <SelectItem key={option} value={option}>{option}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          type={param.type}
                          value={selected.parameters?.[param.id] ?? param.defaultValue ?? ''}
                          onChange={(e) => updateParameter(
                            selected.equipmentId, 
                            param.id, 
                            param.type === 'number' ? Number(e.target.value) : e.target.value
                          )}
                          disabled={disabled}
                          className="h-8 text-xs"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export { defaultEquipments };
