import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import { useCreateMeasurement, type EvolutionMeasurement } from '@/hooks/usePatientEvolution';

interface MeasurementFormProps {
  patientId: string;
  soapRecordId?: string;
  requiredMeasurements?: Array<{
    id: string;
    pathology_name: string;
    measurement_name: string;
    measurement_unit?: string;
    alert_level: 'high' | 'medium' | 'low';
    instructions?: string;
  }>;
}

interface MeasurementInput {
  measurement_type: string;
  measurement_name: string;
  value: string;
  unit: string;
  notes: string;
}

export const MeasurementForm: React.FC<MeasurementFormProps> = ({
  patientId,
  soapRecordId,
  requiredMeasurements = []
}) => {
  const [measurements, setMeasurements] = useState<MeasurementInput[]>([
    {
      measurement_type: '',
      measurement_name: '',
      value: '',
      unit: '',
      notes: ''
    }
  ]);

  const createMeasurement = useCreateMeasurement();

  const measurementTypes = [
    'Amplitude de Movimento',
    'Dor (EVA)',
    'Força Muscular',
    'Teste Funcional',
    'Perimetria',
    'Goniometria',
    'Outro'
  ];

  const handleAddMeasurement = () => {
    setMeasurements([
      ...measurements,
      {
        measurement_type: '',
        measurement_name: '',
        value: '',
        unit: '',
        notes: ''
      }
    ]);
  };

  const handleRemoveMeasurement = (index: number) => {
    setMeasurements(measurements.filter((_, i) => i !== index));
  };

  const handleUpdateMeasurement = (index: number, field: keyof MeasurementInput, value: string) => {
    const updated = [...measurements];
    updated[index] = { ...updated[index], [field]: value };
    setMeasurements(updated);
  };

  const handleQuickFillRequired = (requiredMeasurement: any, index: number) => {
    handleUpdateMeasurement(index, 'measurement_type', requiredMeasurement.pathology_name);
    handleUpdateMeasurement(index, 'measurement_name', requiredMeasurement.measurement_name);
    handleUpdateMeasurement(index, 'unit', requiredMeasurement.measurement_unit || '');
  };

  const handleSave = async () => {
    for (const measurement of measurements) {
      if (measurement.measurement_name && measurement.value) {
        try {
          await createMeasurement.mutateAsync({
            patient_id: patientId,
            soap_record_id: soapRecordId,
            measurement_type: measurement.measurement_type,
            measurement_name: measurement.measurement_name,
            value: parseFloat(measurement.value),
            unit: measurement.unit,
            notes: measurement.notes,
            measured_at: new Date().toISOString()
          } as Omit<EvolutionMeasurement, 'id' | 'created_at'>);
        } catch (error) {
          console.error('Erro ao salvar medição:', error);
        }
      }
    }

    // Reset form
    setMeasurements([
      {
        measurement_type: '',
        measurement_name: '',
        value: '',
        unit: '',
        notes: ''
      }
    ]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Registrar Medições</span>
          <Button onClick={handleAddMeasurement} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick fill buttons for required measurements */}
        {requiredMeasurements.length > 0 && measurements.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Atalhos - Medições Obrigatórias:</Label>
            <div className="flex flex-wrap gap-2">
              {requiredMeasurements.map((req) => (
                <Badge
                  key={req.id}
                  variant={req.alert_level === 'high' ? 'destructive' : 'secondary'}
                  className="cursor-pointer hover:opacity-80"
                  onClick={() => handleQuickFillRequired(req, measurements.length - 1)}
                >
                  {req.measurement_name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {measurements.map((measurement, index) => (
          <div key={index} className="border rounded-lg p-4 space-y-3 relative">
            {measurements.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => handleRemoveMeasurement(index)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo de Medição</Label>
                <Select
                  value={measurement.measurement_type}
                  onValueChange={(value) => handleUpdateMeasurement(index, 'measurement_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {measurementTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Nome da Medição</Label>
                <Input
                  value={measurement.measurement_name}
                  onChange={(e) => handleUpdateMeasurement(index, 'measurement_name', e.target.value)}
                  placeholder="Ex: Flexão do joelho direito"
                />
              </div>

              <div className="space-y-2">
                <Label>Valor</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={measurement.value}
                  onChange={(e) => handleUpdateMeasurement(index, 'value', e.target.value)}
                  placeholder="Ex: 120"
                />
              </div>

              <div className="space-y-2">
                <Label>Unidade</Label>
                <Input
                  value={measurement.unit}
                  onChange={(e) => handleUpdateMeasurement(index, 'unit', e.target.value)}
                  placeholder="Ex: graus, cm, kg"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={measurement.notes}
                onChange={(e) => handleUpdateMeasurement(index, 'notes', e.target.value)}
                placeholder="Observações sobre a medição..."
                rows={2}
              />
            </div>
          </div>
        ))}

        <Button 
          onClick={handleSave} 
          className="w-full"
          disabled={createMeasurement.isPending || measurements.every(m => !m.measurement_name || !m.value)}
        >
          {createMeasurement.isPending ? 'Salvando...' : 'Salvar Medições'}
        </Button>
      </CardContent>
    </Card>
  );
};
