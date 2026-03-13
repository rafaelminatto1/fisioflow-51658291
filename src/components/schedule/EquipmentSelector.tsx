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
  const compactFieldClass =
    "h-9 rounded-xl border border-border/70 bg-gradient-to-b from-background to-muted/20 text-xs shadow-[0_12px_24px_-22px_rgba(15,23,42,0.35)] focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:border-primary/30";

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
              "flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm shadow-[0_14px_24px_-22px_rgba(15,23,42,0.32)] transition-[transform,box-shadow,border-color,background-color]",
              isSelected(equipment.id) 
                ? "border-primary/20 bg-gradient-to-b from-primary to-primary/90 text-primary-foreground shadow-[0_18px_30px_-22px_rgba(37,99,235,0.55)]" 
                : "border-border/70 bg-gradient-to-b from-background to-muted/20 hover:-translate-y-px hover:border-primary/20 hover:bg-primary/[0.04]",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <span className="text-base">{equipment.icon}</span>
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
              <div key={selected.equipmentId} className="rounded-[22px] border border-border/70 bg-gradient-to-b from-background to-muted/25 p-4 shadow-[0_18px_32px_-28px_rgba(15,23,42,0.35)]">
                <div className="mb-3 flex items-center gap-2">
                  <Badge variant="secondary" className="rounded-full border border-primary/10 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
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
                          <SelectTrigger className={compactFieldClass}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-[20px] border border-border/70 bg-background/95 p-1 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.45)] backdrop-blur-xl">
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
                          className={compactFieldClass}
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

 
