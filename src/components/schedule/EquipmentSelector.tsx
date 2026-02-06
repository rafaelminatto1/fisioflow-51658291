import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { defaultEquipments } from '@/lib/schedule/defaultEquipments';

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

 
