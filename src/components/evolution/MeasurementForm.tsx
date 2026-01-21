import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Textarea } from '@/components/shared/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shared/ui/select';
import { Badge } from '@/components/shared/ui/badge';
import {
  Plus,
  Trash2,
  BookOpen,
  Settings2,
  Save,
  ChevronDown,
  ChevronUp,
  Zap,
  Target,
  Sparkles,
  ArrowRight,
  Activity as VitalIcon,
  Heart,
  Thermometer,
  Wind,
  Stethoscope,
  Droplets,
  FileText
} from 'lucide-react';
import { useCreateMeasurement, type EvolutionMeasurement } from '@/hooks/usePatientEvolution';
import { ClinicalTestCombobox, type ClinicalTest } from '@/components/ui/clinical-test-combobox';
import { CustomFieldsConfig, DEFAULT_MEASUREMENT_FIELDS, type CustomField } from './CustomFieldsConfig';
import { SaveMeasurementTemplateModal } from './SaveMeasurementTemplateModal';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/shared/ui/collapsible';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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
  selectedTestId?: string;
  // Dynamic fields
  custom_data: Record<string, string>;
}

const VITAL_SIGNS_FIELDS = [
  { id: 'bp', label: 'PA', fullLabel: 'Pressão Arterial', unit: 'mmHg', type: 'text', placeholder: '120/80', icon: Stethoscope, color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'hr', label: 'FC', fullLabel: 'Freq. Cardíaca', unit: 'bpm', type: 'number', placeholder: '70', icon: Heart, color: 'text-red-600', bg: 'bg-red-50' },
  { id: 'spo2', label: 'SpO2', fullLabel: 'Saturação', unit: '%', type: 'number', placeholder: '98', icon: Droplets, color: 'text-teal-600', bg: 'bg-teal-50' },
  { id: 'rr', label: 'FR', fullLabel: 'Freq. Respiratória', unit: 'rpm', type: 'number', placeholder: '16', icon: Wind, color: 'text-slate-600', bg: 'bg-slate-50' },
  { id: 'temp', label: 'Temp', fullLabel: 'Temperatura', unit: '°C', type: 'number', placeholder: '36.5', icon: Thermometer, color: 'text-orange-600', bg: 'bg-orange-50' },
];

export const MeasurementForm: React.FC<MeasurementFormProps> = ({
  patientId,
  soapRecordId,
  requiredMeasurements = []
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [measurements, setMeasurements] = useState<MeasurementInput[]>([
    {
      measurement_type: '',
      measurement_name: '',
      value: '',
      unit: '',
      notes: '',
      custom_data: {}
    }
  ]);

  // Custom fields configuration for "Personalizado" type
  const [customFields, setCustomFields] = useState<CustomField[]>(DEFAULT_MEASUREMENT_FIELDS);
  const [showFieldsConfig, setShowFieldsConfig] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);

  const createMeasurement = useCreateMeasurement();

  const measurementTypes = [
    'Amplitude de Movimento',
    'Dor (EVA)',
    'Força Muscular',
    'Teste Funcional',
    'Perimetria',
    'Goniometria',
    'Sinais Vitais',
    'Personalizado',
    'Outro'
  ];

  const presets = [
    { label: 'Sinais Vitais', type: 'Sinais Vitais', name: 'Checkup de Sinais' },
    { label: 'Fisioterapia Ortopédica', type: 'Amplitude de Movimento', name: 'Flexão' },
    { label: 'Esportiva (Hop Test)', type: 'Teste Funcional', name: 'Hop Test' },
    { label: 'Esportiva (Y Test)', type: 'Teste Funcional', name: 'Y Test' },
    { label: 'Dor (EVA)', type: 'Dor (EVA)', name: 'EVA' },
  ];

  const handleQuickAdd = (preset: { type: string, name: string }) => {
    setMeasurements([
      ...measurements,
      {
        measurement_type: preset.type,
        measurement_name: preset.name,
        value: '',
        unit: '',
        notes: '',
        custom_data: {}
      }
    ]);
  };

  const handleAddMeasurement = () => {
    setMeasurements([
      ...measurements,
      {
        measurement_type: '',
        measurement_name: '',
        value: '',
        unit: '',
        notes: '',
        custom_data: {}
      }
    ]);
  };

  const handleRemoveMeasurement = (index: number) => {
    setMeasurements(measurements.filter((_, i) => i !== index));
  };

  const handleUpdateMeasurement = (index: number, field: keyof MeasurementInput, value: any) => {
    const updated = [...measurements];
    updated[index] = { ...updated[index], [field]: value };
    setMeasurements(updated);
  };

  const handleUpdateCustomData = (index: number, key: string, value: string) => {
    const updated = [...measurements];
    updated[index].custom_data = {
      ...updated[index].custom_data,
      [key]: value
    };
    setMeasurements(updated);
  };

  const handleSelectTest = (index: number, testId: string, test?: ClinicalTest) => {
    const updated = [...measurements];

    if (testId === "") {
      updated[index] = {
        ...updated[index],
        selectedTestId: "",
      };
      setMeasurements(updated);
      return;
    }

    // Auto-configure form based on test template
    if (test?.fields_definition && test.fields_definition.length > 0) {
      // Set to Personalized type and enable specific fields
      const newCustomFields = customFields.map(f => {
        const templateField = test.fields_definition?.find(tf => tf.id === f.id || tf.label.toLowerCase() === f.label.toLowerCase());
        if (templateField) {
          return {
            ...f,
            enabled: true,
            required: templateField.required ?? f.required,
            unit: templateField.unit ?? f.unit
          };
        }
        // If not in template, keep enabled only if it's basic mandatory ones or disable
        if (['measurement_name', 'value'].includes(f.id)) return { ...f, enabled: true };
        return { ...f, enabled: false };
      });

      setCustomFields(newCustomFields);
      updated[index] = {
        ...updated[index],
        selectedTestId: testId,
        measurement_name: test.name,
        measurement_type: 'Personalizado',
        unit: test.fields_definition.find(f => f.id === 'value')?.unit || '',
      };

      toast.info(`Configuração de "${test.name}" aplicada automaticamente.`, {
        icon: <Sparkles className="h-4 w-4 text-teal-500" />
      });
    } else {
      updated[index] = {
        ...updated[index],
        selectedTestId: testId,
        measurement_name: test?.name || '',
        measurement_type: test?.category || 'Teste Funcional',
      };
    }

    setMeasurements(updated);
  };

  const handleQuickFillRequired = (req: { pathology_name: string; measurement_name: string; measurement_unit?: string }, index: number) => {
    handleUpdateMeasurement(index, 'measurement_type', req.pathology_name);
    handleUpdateMeasurement(index, 'measurement_name', req.measurement_name);
    handleUpdateMeasurement(index, 'unit', req.measurement_unit || '');
  };

  const handleSave = async () => {
    let savedCount = 0;
    for (const measurement of measurements) {
      if (measurement.measurement_name && (measurement.value || measurement.measurement_type === 'Personalizado' || measurement.measurement_type === 'Sinais Vitais')) {
        try {
          // Prepare payload
          const payload: any = {
            patient_id: patientId,
            soap_record_id: soapRecordId,
            measurement_type: measurement.measurement_type,
            measurement_name: measurement.measurement_name,
            value: measurement.value ? parseFloat(measurement.value) : 0,
            unit: measurement.unit,
            notes: measurement.notes,
            measured_at: new Date().toISOString(),
            custom_data: (measurement.measurement_type === 'Personalizado' || measurement.measurement_type === 'Sinais Vitais') ? measurement.custom_data : {}
          };

          await createMeasurement.mutateAsync(payload);
          savedCount++;
        } catch (error) {
          console.error('Erro ao salvar medição:', error);
        }
      }
    }

    if (savedCount > 0) {
      // Reset form
      setMeasurements([
        {
          measurement_type: '',
          measurement_name: '',
          value: '',
          unit: '',
          notes: '',
          custom_data: {}
        }
      ]);
    }
  };

  const handleTemplateSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['clinical-tests-combobox'] });
  };

  // Get enabled fields for rendering
  const enabledFields = customFields.filter(f => f.enabled);
  const hasCustomType = measurements.some(m => m.measurement_type === 'Personalizado');

  return (
    <Card className="border-teal-100/50 shadow-xl shadow-teal-900/5 overflow-hidden rounded-2xl bg-white">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-600 rounded-xl text-white shadow-lg shadow-teal-100">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-800">Registrar Medições</CardTitle>
              <p className="text-xs text-slate-500 font-medium">Capture dados clínicos com precisão</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => navigate('/clinical-tests')}
              size="sm"
              variant="outline"
              className="hidden sm:flex border-teal-100 text-teal-700 hover:bg-teal-50 font-bold"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Biblioteca
            </Button>
            <Button
              onClick={handleAddMeasurement}
              size="sm"
              className="bg-teal-600 hover:bg-teal-700 font-bold shadow-md shadow-teal-100"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Mobile link for tests */}
        <Button onClick={() => navigate('/clinical-tests')} size="sm" variant="outline" className="w-full sm:hidden border-teal-100 text-teal-700 font-bold">
          <BookOpen className="h-4 w-4 mr-2" />
          Biblioteca de Testes
        </Button>

        {/* Presets */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
            <Target className="h-3 w-3" />
            <span>Modelos Rápidos</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <Badge
                key={preset.label}
                variant="outline"
                className="cursor-pointer hover:bg-teal-600 hover:text-white hover:border-teal-600 transition-all px-3 py-1.5 font-bold text-slate-600 border-slate-200"
                onClick={() => handleQuickAdd(preset)}
              >
                {preset.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Required Measurements Shortcuts */}
        {requiredMeasurements.length > 0 && (
          <div className="space-y-3 p-4 bg-orange-50/50 rounded-xl border border-orange-100">
            <div className="flex items-center gap-2 text-[10px] font-bold text-orange-700 uppercase tracking-widest">
              <Sparkles className="h-3 w-3" />
              <span>Pendentes para esta patologia</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {requiredMeasurements.map((req) => (
                <Badge
                  key={req.id}
                  variant="outline"
                  className={cn(
                    "cursor-pointer font-bold px-3 py-1.5 transition-all",
                    req.alert_level === 'high'
                      ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-600 hover:text-white hover:border-red-600'
                      : 'bg-white text-orange-700 border-orange-200 hover:bg-orange-600 hover:text-white hover:border-orange-600'
                  )}
                  onClick={() => handleQuickFillRequired(req, measurements.length - 1)}
                >
                  {req.measurement_name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {measurements.map((measurement, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: -10 }}
                layout
                className="group relative border border-slate-100 rounded-2xl p-5 space-y-5 bg-slate-50/30 hover:bg-white hover:border-teal-100/50 hover:shadow-lg hover:shadow-teal-900/5 transition-all duration-300"
              >
                {measurements.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full"
                    onClick={() => handleRemoveMeasurement(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                  {/* Test Search & Type */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <BookOpen className="h-3 w-3 text-teal-600" />
                        Teste da Biblioteca
                      </Label>
                      <ClinicalTestCombobox
                        value={measurement.selectedTestId}
                        onValueChange={(testId, test) => handleSelectTest(index, testId, test)}
                        placeholder="Pesquisar testes clincos..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipo</Label>
                      <Select
                        value={measurement.measurement_type}
                        onValueChange={(value) => handleUpdateMeasurement(index, 'measurement_type', value)}
                      >
                        <SelectTrigger className="h-11 bg-white border-slate-200 font-medium">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {measurementTypes.map((type) => (
                            <SelectItem key={type} value={type} className="font-medium">
                              {type === 'Personalizado' ? (
                                <span className="flex items-center gap-2 text-teal-600 font-bold">
                                  <Sparkles className="h-3.5 w-3.5" />
                                  {type}
                                </span>
                              ) : type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Name & Primary Values */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nome da Medição</Label>
                      <Input
                        value={measurement.measurement_name}
                        onChange={(e) => handleUpdateMeasurement(index, 'measurement_name', e.target.value)}
                        placeholder="Ex: Flexão do joelho direito"
                        className="h-11 bg-white border-slate-200 font-bold text-slate-700"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {measurement.measurement_type === 'Personalizado' ? (
                        <>
                          <AnimatePresence mode="poplayout">
                            {enabledFields.map((field) => {
                              if (field.id === 'measurement_name') return null;

                              const fieldKey = field.id;

                              return (
                                <motion.div
                                  key={field.id}
                                  initial={{ opacity: 0, y: 5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className={cn("space-y-2", (field.type === 'textarea' || field.id === 'notes') ? 'col-span-2' : '')}
                                >
                                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                    {field.label}
                                    {field.unit && <span className="text-teal-600 lowercase tracking-normal bg-teal-50 px-1 rounded">({field.unit})</span>}
                                    {field.required && <span className="text-red-500 ml-0.5">*</span>}
                                  </Label>

                                  {field.type === 'select' ? (
                                    <Select
                                      value={measurement.custom_data[fieldKey] || ''}
                                      onValueChange={(val) => handleUpdateCustomData(index, fieldKey, val)}
                                    >
                                      <SelectTrigger className="h-11 bg-white font-medium border-slate-200">
                                        <SelectValue placeholder="Selecione..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {field.options?.map(opt => (
                                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : field.type === 'textarea' ? (
                                    <Textarea
                                      value={measurement.custom_data[fieldKey] || ''}
                                      onChange={(e) => handleUpdateCustomData(index, fieldKey, e.target.value)}
                                      placeholder={field.description || "Anotações..."}
                                      className="bg-white border-slate-200 font-medium"
                                      rows={2}
                                    />
                                  ) : (
                                    <Input
                                      type={field.type === 'number' ? 'number' : 'text'}
                                      step={field.type === 'number' ? '0.1' : undefined}
                                      value={measurement.custom_data[fieldKey] || ''}
                                      onChange={(e) => handleUpdateCustomData(index, fieldKey, e.target.value)}
                                      placeholder={field.description || "Digite..."}
                                      className="h-11 bg-white border-slate-200 font-bold"
                                    />
                                  )}
                                </motion.div>
                              );
                            })}
                          </AnimatePresence>
                        </>
                      ) : measurement.measurement_type === 'Sinais Vitais' ? (
                        <div className="col-span-2 grid grid-cols-2 lg:grid-cols-5 gap-3">
                          {VITAL_SIGNS_FIELDS.map((field) => {
                            const Icon = field.icon;
                            return (
                              <div key={field.id} className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-100/50 hover:border-teal-200 hover:bg-white transition-all cursor-text group/field">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between gap-1">
                                  <span className="flex items-center gap-1">
                                    <Icon className={cn("h-3 w-3", field.color)} />
                                    {field.label}
                                  </span>
                                  <span className="text-[9px] lowercase opacity-60 font-medium">({field.unit})</span>
                                </Label>
                                <Input
                                  type={field.type === 'number' ? 'number' : 'text'}
                                  value={measurement.custom_data[field.id] || ''}
                                  onChange={(e) => handleUpdateCustomData(index, field.id, e.target.value)}
                                  placeholder={field.placeholder}
                                  className="h-9 bg-white border-slate-200 font-bold text-slate-700 focus:border-teal-400 focus:ring-teal-100 transition-all px-2 shadow-sm"
                                />
                              </div>
                            );
                          })}
                          <div className="col-span-full space-y-2 mt-1">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Notas Clínicas (Sinais Vitais)</Label>
                            <Textarea
                              value={measurement.notes}
                              onChange={(e) => handleUpdateMeasurement(index, 'notes', e.target.value)}
                              placeholder="Observações sobre o estado geral do paciente durante a medição..."
                              className="bg-white border-slate-200 font-medium min-h-[60px]"
                              rows={2}
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-2 group/val">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 pl-1">
                              <Zap className="h-3 w-3 text-orange-500" />
                              Valor
                            </Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={measurement.value}
                              onChange={(e) => handleUpdateMeasurement(index, 'value', e.target.value)}
                              placeholder="0.0"
                              className="h-11 bg-white border-slate-200 font-bold text-slate-700 focus:border-orange-400 focus:ring-orange-100 transition-all shadow-sm"
                            />
                          </div>
                          <div className="space-y-2 group/unit">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 pl-1">
                              <Target className="h-3 w-3 text-blue-500" />
                              Unidade
                            </Label>
                            <Input
                              value={measurement.unit}
                              onChange={(e) => handleUpdateMeasurement(index, 'unit', e.target.value)}
                              placeholder="Ex: cm, graus, etc"
                              className="h-11 bg-white border-slate-200 font-medium text-slate-600 focus:border-blue-400 focus:ring-blue-100 transition-all shadow-sm"
                            />
                          </div>
                          <div className="col-span-2 space-y-2 group/notes">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 pl-1">
                              <FileText className="h-3 w-3 text-slate-400" />
                              Anotações
                            </Label>
                            <Textarea
                              value={measurement.notes}
                              onChange={(e) => handleUpdateMeasurement(index, 'notes', e.target.value)}
                              placeholder="Observações importantes sobre esta medição..."
                              className="bg-white border-slate-200 font-medium focus:border-teal-400 focus:ring-teal-100 transition-all shadow-sm"
                              rows={2}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Custom Fields Configuration */}
        {hasCustomType && (
          <div className="space-y-4">
            <Button
              variant="ghost"
              onClick={() => setShowFieldsConfig(!showFieldsConfig)}
              className="w-full justify-between h-12 bg-slate-50 border border-slate-100 text-slate-600 hover:bg-slate-100 font-bold rounded-xl px-4 group"
            >
              <span className="flex items-center gap-2">
                <Settings2 className={cn("h-4 w-4 transition-transform duration-300", showFieldsConfig && "rotate-90 text-teal-600")} />
                Configurar Estrutura de Campos
              </span>
              {showFieldsConfig ? <ChevronUp className="h-4 w-4 opacity-40" /> : <ChevronDown className="h-4 w-4 opacity-40 group-hover:translate-y-0.5 transition-transform" />}
            </Button>

            <AnimatePresence>
              {showFieldsConfig && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  className="overflow-hidden"
                >
                  <CustomFieldsConfig
                    fields={customFields}
                    onChange={setCustomFields}
                  />
                  <div className="mt-4 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSaveTemplateOpen(true)}
                      className="gap-2 font-bold text-teal-700 border-teal-100 bg-teal-50/50 hover:bg-teal-600 hover:text-white hover:border-teal-600 transition-all rounded-lg"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Salvar modelo personalizado
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className="pt-4 border-t border-slate-100">
          <Button
            onClick={handleSave}
            className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-bold text-base shadow-lg shadow-teal-100 rounded-xl group"
            disabled={createMeasurement.isPending || measurements.every(m => !m.measurement_name || (!m.value && m.measurement_type !== 'Personalizado'))}
          >
            {createMeasurement.isPending ? (
              <span className="flex items-center gap-2">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                  <Zap className="h-4 w-4" />
                </motion.div>
                Salvando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Efetivar Registros
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </span>
            )}
          </Button>
        </div>
      </CardContent>

      <SaveMeasurementTemplateModal
        open={saveTemplateOpen}
        onOpenChange={setSaveTemplateOpen}
        fields={customFields}
        onSaved={handleTemplateSaved}
      />
    </Card>
  );
};
