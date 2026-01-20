import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SmartTextarea } from '@/components/ui/SmartTextarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Eye,
  Brain,
  ClipboardList,
  Save,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { ConductReplication } from './ConductReplication';
import { cn } from '@/lib/utils';

interface SOAPData {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

interface SOAPFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  description: string;
  isActive: boolean;
  onFocus: () => void;
  disabled?: boolean;
}

const SOAPField = React.memo(({
  value,
  onChange,
  placeholder,
  description,
  isActive,
  onFocus,
  disabled
}: SOAPFieldProps) => {
  const [localValue, setLocalValue] = useState(value);
  const lastSentValue = useRef(value);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (value !== localValue && value !== lastSentValue.current) {
      setLocalValue(value);
      lastSentValue.current = value;
    }
  }, [value]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      lastSentValue.current = newValue;
      onChange(newValue);
    }, 300);
  }, [onChange]);

  return (
    <>
      <SmartTextarea
        placeholder={placeholder}
        value={localValue}
        onChange={handleChange}
        onFocus={onFocus}
        disabled={disabled}
        rows={isActive ? 5 : 3}
        className={isActive ? 'min-h-[120px]' : ''}
      />
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </>
  );
});

SOAPField.displayName = 'SOAPField';

interface SOAPFormPanelProps {
  patientId: string;
  data: SOAPData;
  onChange: (data: SOAPData) => void;
  onSave?: () => void;
  isSaving?: boolean;
  disabled?: boolean;
  showReplication?: boolean;
  autoSaveEnabled?: boolean;
  lastSaved?: Date | null;
}

const SOAP_SECTIONS = [
  {
    key: 'subjective' as const,
    label: 'Subjetivo',
    icon: User,
    placeholder: 'Queixas do paciente, como se sente, o que relata...',
    description: 'Relato do paciente sobre sintomas e sensações',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/5',
  },
  {
    key: 'objective' as const,
    label: 'Objetivo',
    icon: Eye,
    placeholder: 'Achados clínicos, exame físico, medições...',
    description: 'Dados mensuráveis e observáveis pelo profissional',
    color: 'text-green-500',
    bgColor: 'bg-green-500/5',
  },
  {
    key: 'assessment' as const,
    label: 'Avaliação',
    icon: Brain,
    placeholder: 'Análise clínica, diagnóstico funcional, progresso...',
    description: 'Interpretação dos dados subjetivos e objetivos',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/5',
  },
  {
    key: 'plan' as const,
    label: 'Plano',
    icon: ClipboardList,
    placeholder: 'Conduta, exercícios, orientações, próximos passos...',
    description: 'Intervenções planejadas e orientações',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/5',
  },
];

export const SOAPFormPanel: React.FC<SOAPFormPanelProps> = ({
  patientId,
  data,
  onChange,
  onSave,
  isSaving = false,
  disabled = false,
  showReplication = true,
  autoSaveEnabled = false,
  lastSaved,
}) => {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const handleFieldChange = useCallback((key: keyof SOAPData, value: string) => {
    onChange({ ...data, [key]: value });
  }, [data, onChange]);

  const handleSelectConduct = (conductText: string) => {
    handleFieldChange('plan', conductText);
  };

  const getCompletionStatus = () => {
    const filled = SOAP_SECTIONS.filter(s => data[s.key]?.trim().length > 0).length;
    return {
      filled,
      total: SOAP_SECTIONS.length,
      percentage: Math.round((filled / SOAP_SECTIONS.length) * 100),
    };
  };

  const completion = getCompletionStatus();

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="h-5 w-5 text-primary" />
            Registro SOAP
          </CardTitle>
          <div className="flex items-center gap-2">
            {autoSaveEnabled && lastSaved && (
              <Badge variant="outline" className="text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                Salvo {lastSaved.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </Badge>
            )}
            <Badge
              variant={completion.percentage === 100 ? 'default' : 'secondary'}
              className="text-xs"
            >
              {completion.filled}/{completion.total} campos
            </Badge>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-2">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${completion.percentage}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto space-y-4">
        {SOAP_SECTIONS.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.key;
          const hasContent = data[section.key]?.trim().length > 0;

          return (
            <div
              key={section.key}
              className={cn(
                'rounded-lg border transition-all',
                isActive && 'ring-2 ring-primary/20',
                section.bgColor
              )}
            >
              <div
                className="flex items-center gap-2 p-3 cursor-pointer"
                onClick={() => setActiveSection(isActive ? null : section.key)}
              >
                <Icon className={cn('h-4 w-4', section.color)} />
                <span className="font-medium text-sm">{section.label}</span>
                {hasContent && (
                  <CheckCircle2 className="h-3 w-3 text-green-500 ml-auto" />
                )}
              </div>
              <div className="px-3 pb-3">
                <SOAPField
                  value={data[section.key]}
                  onChange={(val) => handleFieldChange(section.key, val)}
                  placeholder={section.placeholder}
                  description={section.description}
                  isActive={isActive}
                  onFocus={() => setActiveSection(section.key)}
                  disabled={disabled}
                />
              </div>
            </div>
          );
        })}

        <Separator />

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          {showReplication && (
            <ConductReplication
              patientId={patientId}
              onSelectConduct={handleSelectConduct}
            />
          )}

          <div className="flex-1" />

          {onSave && (
            <Button onClick={onSave} disabled={disabled || isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Evolução
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
