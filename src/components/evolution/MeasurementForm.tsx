import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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
  Heart,
  Thermometer,
  Wind,
  Stethoscope,
  Droplets,
  FileText,
  CheckSquare
} from 'lucide-react';
import { useCreateMeasurement } from '@/hooks/usePatientEvolution';
import { ClinicalTestCombobox, type ClinicalTest as ClinicalTestComboboxTest } from '@/components/ui/clinical-test-combobox';
import { CustomFieldsConfig, DEFAULT_MEASUREMENT_FIELDS, type CustomField } from './CustomFieldsConfig';
import { SaveMeasurementTemplateModal } from './SaveMeasurementTemplateModal';
import { MeasurementDiagramYBalance, Y_BALANCE_KEYS } from './MeasurementDiagramYBalance';
import { TestLibraryModal, type ClinicalTest } from '@/components/clinical/TestLibraryModal';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { fisioLogger as logger } from '@/lib/errors/logger';

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
  /** Teste completo da biblioteca (para exibir imagem/execução) */
  selectedTest?: ClinicalTest | ClinicalTestComboboxTest;
  // Dynamic fields
  custom_data: Record<string, string>;
}

// Color system constants for consistent styling
const _FORM_COLORS = {
  primary: {
    bg: 'bg-teal-600',
    hover: 'hover:bg-teal-700',
    text: 'text-teal-600',
    border: 'border-teal-200',
    bgSubtle: 'bg-teal-50',
    focusRing: 'focus-visible:ring-teal-400',
  },
  secondary: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-200',
    focusRing: 'focus-visible:ring-blue-400',
  },
  accent: {
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    border: 'border-orange-200',
  },
  neutral: {
    bg: 'bg-slate-50',
    bgSubtle: 'bg-slate-50/50',
    text: 'text-slate-600',
    textMuted: 'text-slate-500',
    border: 'border-slate-200',
    borderSubtle: 'border-slate-100',
  }
} as const;

// Standard focus classes for consistent interactive feedback
const inputFocusClasses = [
  "focus-visible:outline-none",
  "focus-visible:ring-2",
  "focus-visible:ring-teal-400",
  "focus-visible:ring-offset-2",
  "focus-visible:ring-offset-white",
  "transition-all duration-200"
].join(" ");

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
  const _navigate = useNavigate();
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
  const [testLibraryOpen, setTestLibraryOpen] = useState(false);

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

  const handleUpdateMeasurement = (index: number, field: keyof MeasurementInput, value: string | number | boolean | object) => {
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

  const handleSelectTest = (index: number, testId: string, test?: ClinicalTest | ClinicalTestComboboxTest) => {
    const updated = [...measurements];

    if (testId === "") {
      updated[index] = {
        ...updated[index],
        selectedTestId: "",
        selectedTest: undefined,
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
        selectedTest: test,
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
        selectedTest: test,
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

  /** Deriva value para gráficos quando há múltiplos campos em custom_data (média dos numéricos ou primeiro). */
  const deriveValueFromCustomData = (custom_data: Record<string, string>): number => {
    const nums = Object.values(custom_data)
      .map(v => parseFloat(v))
      .filter(n => !Number.isNaN(n));
    if (nums.length === 0) return 0;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  };

  const hasMultiFieldFromTemplate = (m: MeasurementInput) =>
    m.selectedTest?.fields_definition && m.selectedTest.fields_definition.length >= 3 && m.selectedTest?.layout_type !== 'y_balance';

  const isYBalanceTest = (test?: ClinicalTest) =>
    test?.layout_type === 'y_balance' ||
    (!!test?.name && /y\s*test|y\s*balance|ybt/i.test(test.name)) ||
    (!!test?.tags && test.tags.some(t => /y\s*balance|y\s*test|ybt/i.test(String(t))));

  const showYBalanceDiagram = (m: MeasurementInput) =>
    isYBalanceTest(m.selectedTest) || (!!m.measurement_name && /y\s*test|y\s*balance|ybt/i.test(m.measurement_name));

  const hasYBalanceValue = (m: MeasurementInput) =>
    showYBalanceDiagram(m) && Y_BALANCE_KEYS.some(k => (m.custom_data[k] ?? '').trim() !== '');

  const hasAnyValue = (m: MeasurementInput) =>
    m.value ||
    m.measurement_type === 'Personalizado' ||
    m.measurement_type === 'Sinais Vitais' ||
    (hasMultiFieldFromTemplate(m) && Object.values(m.custom_data).some(v => v !== '')) ||
    hasYBalanceValue(m);

  const handleSave = async () => {
    let savedCount = 0;
    for (const measurement of measurements) {
      if (measurement.measurement_name && hasAnyValue(measurement)) {
        try {
          const isMultiField = hasMultiFieldFromTemplate(measurement);
          const isYBalance = showYBalanceDiagram(measurement);
          const custom_data: Record<string, unknown> =
            measurement.measurement_type === 'Personalizado' ||
            measurement.measurement_type === 'Sinais Vitais' ||
            isMultiField ||
            isYBalance
              ? measurement.custom_data
              : {};
          const value =
            (isMultiField || isYBalance) && !measurement.value
              ? deriveValueFromCustomData(measurement.custom_data)
              : measurement.value
                ? parseFloat(measurement.value)
                : (measurement.measurement_type === 'Personalizado' || measurement.measurement_type === 'Sinais Vitais'
                  ? deriveValueFromCustomData(measurement.custom_data)
                  : 0);

          const payload = {
            patient_id: patientId,
            soap_record_id: soapRecordId,
            measurement_type: measurement.measurement_type,
            measurement_name: measurement.measurement_name,
            value: Number.isNaN(value) ? 0 : value,
            unit: measurement.unit,
            notes: measurement.notes,
            measured_at: new Date().toISOString(),
            custom_data,
          };

          await createMeasurement.mutateAsync(payload);
          savedCount++;
        } catch (error) {
          logger.error('Erro ao salvar medição', error, 'MeasurementForm');
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

  const handleAddTestFromLibrary = (test: ClinicalTest) => {
    // Adiciona um novo measurement com os dados do teste selecionado
    const newMeasurement: MeasurementInput = {
      measurement_type: test.category || 'Teste Funcional',
      measurement_name: test.name,
      value: '',
      unit: test.fields_definition?.find(f => f.id === 'value')?.unit || '',
      notes: '',
      selectedTestId: test.id,
      selectedTest: test,
      custom_data: {}
    };

    // Se o teste tem fields_definition, configura os campos automaticamente
    if (test.fields_definition && test.fields_definition.length > 0) {
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
        if (['measurement_name', 'value'].includes(f.id)) return { ...f, enabled: true };
        return { ...f, enabled: false };
      });
      setCustomFields(newCustomFields);
      newMeasurement.measurement_type = 'Personalizado';
    }

    setMeasurements([...measurements, newMeasurement]);
  };

  // Get enabled fields for rendering
  const enabledFields = customFields.filter(f => f.enabled);
  const hasCustomType = measurements.some(m => m.measurement_type === 'Personalizado');

  return (
    <Card className="border-teal-100/50 shadow-xl shadow-teal-900/5 overflow-hidden rounded-2xl bg-white">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl text-white shadow-lg shadow-teal-100">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-800">Registrar Medições</CardTitle>
              <p className="text-xs text-slate-500 font-medium">Capture dados clínicos com precisão</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setTestLibraryOpen(true)}
              size="sm"
              variant="outline"
              className="hidden sm:flex border-teal-200 text-teal-700 hover:bg-teal-50 hover:border-teal-300 font-semibold"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Biblioteca
            </Button>
            <Button
              onClick={handleAddMeasurement}
              size="sm"
              className="bg-teal-600 hover:bg-teal-700 font-semibold shadow-md shadow-teal-100"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Progress indicator for multiple measurements */}
      {measurements.length > 1 && (
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-600">
              Progresso do Registro
            </span>
            <span className="text-xs text-slate-500">
              {measurements.filter(m => m.measurement_name && hasAnyValue(m)).length} / {measurements.length}
            </span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-400 to-teal-500 rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${(measurements.filter(m => m.measurement_name && hasAnyValue(m)).length / measurements.length) * 100}%`
              }}
            />
          </div>
        </div>
      )}

      <CardContent className="p-6 space-y-6">
        {/* Mobile link for tests */}
        <Button onClick={() => setTestLibraryOpen(true)} size="sm" variant="outline" className="w-full sm:hidden border-teal-100 text-teal-700 font-bold">
          <BookOpen className="h-4 w-4 mr-2" />
          Biblioteca de Testes
        </Button>

        {/* Presets */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-teal-600" />
              <span className="text-sm font-semibold text-slate-700">
                Modelos Rápidos
              </span>
            </div>
            <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-600 border-slate-200">
              {presets.length} disponíveis
            </Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                onClick={() => handleQuickAdd(preset)}
                className={cn(
                  "h-auto py-3 px-3 flex flex-col items-center gap-1.5 group",
                  "border-slate-200 bg-white hover:border-teal-400 hover:bg-teal-50",
                  "hover:text-teal-700 hover:shadow-sm transition-all duration-200",
                  "focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2"
                )}
              >
                <span className="text-xs font-bold text-slate-700 text-center leading-tight">
                  {preset.label}
                </span>
                <Plus className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-teal-600" />
              </Button>
            ))}
          </div>
        </div>

        {/* Required Measurements Shortcuts */}
        {requiredMeasurements.length > 0 && (
          <div className="space-y-3 p-4 bg-orange-50/50 rounded-xl border border-orange-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-semibold text-orange-700">
                  Pendentes para esta patologia
                </span>
              </div>
              <Badge variant="secondary" className="text-[10px] bg-orange-100 text-orange-700 border-orange-300">
                {requiredMeasurements.length} obrigatória(s)
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {requiredMeasurements.map((req) => (
                <Button
                  key={req.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickFillRequired(req, measurements.length - 1)}
                  className={cn(
                    "h-auto py-2 px-3 font-semibold text-xs transition-all",
                    req.alert_level === 'high'
                      ? 'bg-red-50 text-red-700 border-red-300 hover:bg-red-600 hover:text-white hover:border-red-600'
                      : 'bg-white text-orange-700 border-orange-300 hover:bg-orange-600 hover:text-white hover:border-orange-600'
                  )}
                >
                  {req.measurement_name}
                </Button>
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
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full focus:opacity-100 focus:ring-2 focus:ring-teal-400 focus:ring-offset-2"
                    onClick={() => handleRemoveMeasurement(index)}
                    aria-label={`Remover medição ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}

                {/* Como realizar: imagem do teste ou texto de execução */}
                {measurement.selectedTest && (
                  <div className="mb-4 rounded-xl border border-teal-100 bg-teal-50/30 overflow-hidden" role="region" aria-label="Como realizar o teste">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-teal-100 bg-white/50">
                      <CheckSquare className="h-4 w-4 text-teal-600 shrink-0" aria-hidden />
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Como realizar o teste</span>
                    </div>
                    <div className="p-3">
                      {(measurement.selectedTest.image_url || measurement.selectedTest.media_urls?.[0]) ? (
                        <div className="space-y-2">
                          <img
                            src={measurement.selectedTest.image_url || measurement.selectedTest.media_urls?.[0]}
                            alt={`Execução: ${measurement.selectedTest.name}`}
                            className="w-full max-h-48 object-contain rounded-lg border border-slate-200 bg-white"
                          />
                          {measurement.selectedTest.execution && (
                            <Collapsible>
                              <CollapsibleTrigger className="flex items-center gap-2 text-xs font-bold text-teal-700 hover:text-teal-800">
                                <ChevronDown className="h-3.5 w-3.5" />
                                Ver instruções de execução
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <p className="mt-2 text-sm text-slate-600 whitespace-pre-line pt-2 border-t border-slate-100">
                                  {measurement.selectedTest.execution}
                                </p>
                              </CollapsibleContent>
                            </Collapsible>
                          )}
                        </div>
                      ) : measurement.selectedTest.execution ? (
                        <Collapsible defaultOpen>
                          <CollapsibleTrigger className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-900">
                            <ChevronDown className="h-3.5 w-3.5 transition-transform data-[state=open]:rotate-180" />
                            Instruções de execução
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <p className="mt-2 text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                              {measurement.selectedTest.execution}
                            </p>
                          </CollapsibleContent>
                        </Collapsible>
                      ) : (
                        <p className="text-sm text-slate-500 italic">Nenhuma mídia ou instrução cadastrada para este teste.</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                  {/* Test Search & Type */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5 text-teal-600" />
                        Teste da Biblioteca
                      </Label>
                      <ClinicalTestCombobox
                        value={measurement.selectedTestId}
                        onValueChange={(testId, test) => handleSelectTest(index, testId, test)}
                        placeholder="Pesquisar testes clínicos..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-600">Tipo</Label>
                      <Select
                        value={measurement.measurement_type}
                        onValueChange={(value) => handleUpdateMeasurement(index, 'measurement_type', value)}
                      >
                        <SelectTrigger className={cn("h-11 bg-white border-slate-200 font-medium", inputFocusClasses)}>
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
                      <Label htmlFor={`measurement-name-${index}`} className="text-xs font-semibold text-slate-600">Nome da Medição</Label>
                      <Input
                        id={`measurement-name-${index}`}
                        value={measurement.measurement_name}
                        onChange={(e) => handleUpdateMeasurement(index, 'measurement_name', e.target.value)}
                        placeholder="Ex: Flexão do joelho direito"
                        className={cn("h-11 bg-white border-slate-200 font-semibold text-slate-700", inputFocusClasses)}
                        aria-label="Nome da medição"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {showYBalanceDiagram(measurement) ? (
                        <div className="col-span-2 space-y-4">
                          <MeasurementDiagramYBalance
                            values={{
                              anterior: measurement.custom_data.anterior ?? '',
                              posteromedial: measurement.custom_data.posteromedial ?? '',
                              posterolateral: measurement.custom_data.posterolateral ?? '',
                            }}
                            unit={measurement.unit || 'cm'}
                            onChange={(key, value) => handleUpdateCustomData(index, key, value)}
                            compositeLabel="Composto (média)"
                            compositeValue={
                              [measurement.custom_data.anterior, measurement.custom_data.posteromedial, measurement.custom_data.posterolateral].every(
                                v => v !== '' && v != null
                              )
                                ? deriveValueFromCustomData(measurement.custom_data)
                                : null
                            }
                          />
                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            <Label
                              htmlFor={`ybalance-notes-${index}`}
                              className="text-xs font-semibold text-slate-600 flex items-center gap-1.5"
                            >
                              <FileText className="h-3.5 w-3.5 text-slate-400" />
                              Anotações
                              <span className="text-slate-400 font-normal">(opcional)</span>
                            </Label>
                            <Textarea
                              id={`ybalance-notes-${index}`}
                              value={measurement.notes}
                              onChange={(e) => handleUpdateMeasurement(index, 'notes', e.target.value)}
                              placeholder="Observações sobre esta medição..."
                              className={cn("min-h-[80px] resize-y bg-white border-slate-200 text-sm", inputFocusClasses)}
                              rows={3}
                            />
                          </div>
                        </div>
                      ) : hasMultiFieldFromTemplate(measurement) ? (
                        <div className="col-span-2 space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(measurement.selectedTest!.fields_definition!).map((field) => (
                              <div
                                key={field.id}
                                className={cn(
                                  "space-y-2 p-3 rounded-xl border transition-all duration-200",
                                  "bg-white border-slate-200 hover:border-teal-300 hover:shadow-sm",
                                  "focus-within:ring-2 focus-within:ring-teal-100 focus-within:border-teal-400"
                                )}
                              >
                                <Label
                                  htmlFor={`field-${field.id}-${index}`}
                                  className="text-xs font-semibold text-slate-600 flex items-center gap-1"
                                >
                                  {field.label}
                                  {field.unit && <span className="text-teal-600 lowercase tracking-normal bg-teal-50 px-1.5 py-0.5 rounded text-[11px]">({field.unit})</span>}
                                  {field.required && <span className="text-red-500 ml-0.5">*</span>}
                                </Label>
                                <Input
                                  id={`field-${field.id}-${index}`}
                                  type={field.type === 'number' ? 'number' : 'text'}
                                  step={field.type === 'number' ? '0.1' : undefined}
                                  value={measurement.custom_data[field.id] || ''}
                                  onChange={(e) => handleUpdateCustomData(index, field.id, e.target.value)}
                                  placeholder={field.description || field.unit ? `0` : '...'}
                                  className="h-11 bg-slate-50/50 border-slate-200 font-semibold text-slate-700"
                                  aria-label={field.label}
                                />
                              </div>
                            ))}
                          </div>
                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            <Label
                              htmlFor={`template-notes-${index}`}
                              className="text-xs font-semibold text-slate-600 flex items-center gap-1.5"
                            >
                              <FileText className="h-3.5 w-3.5 text-slate-400" />
                              Anotações
                              <span className="text-slate-400 font-normal">(opcional)</span>
                            </Label>
                            <Textarea
                              id={`template-notes-${index}`}
                              value={measurement.notes}
                              onChange={(e) => handleUpdateMeasurement(index, 'notes', e.target.value)}
                              placeholder="Observações sobre esta medição..."
                              className={cn("min-h-[80px] resize-y bg-white border-slate-200 text-sm", inputFocusClasses)}
                              rows={3}
                            />
                          </div>
                        </div>
                      ) : measurement.measurement_type === 'Personalizado' ? (
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
                                  <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                                    {field.label}
                                    {field.unit && <span className="text-teal-600 lowercase tracking-normal bg-teal-50 px-1.5 py-0.5 rounded text-[11px]">({field.unit})</span>}
                                    {field.required && <span className="text-red-500 ml-0.5">*</span>}
                                  </Label>

                                  {field.type === 'select' ? (
                                    <Select
                                      value={measurement.custom_data[fieldKey] || ''}
                                      onValueChange={(val) => handleUpdateCustomData(index, fieldKey, val)}
                                    >
                                      <SelectTrigger className={cn("h-11 bg-white font-medium border-slate-200", inputFocusClasses)}>
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
                                      className={cn("bg-white border-slate-200 font-medium", inputFocusClasses)}
                                      rows={3}
                                    />
                                  ) : (
                                    <Input
                                      type={field.type === 'number' ? 'number' : 'text'}
                                      step={field.type === 'number' ? '0.1' : undefined}
                                      value={measurement.custom_data[fieldKey] || ''}
                                      onChange={(e) => handleUpdateCustomData(index, fieldKey, e.target.value)}
                                      placeholder={field.description || "Digite..."}
                                      className={cn("h-11 bg-white border-slate-200 font-semibold", inputFocusClasses)}
                                    />
                                  )}
                                </motion.div>
                              );
                            })}
                          </AnimatePresence>
                        </>
                      ) : measurement.measurement_type === 'Sinais Vitais' ? (
                        <div className="col-span-2 space-y-4">
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                            {VITAL_SIGNS_FIELDS.map((field) => {
                              const Icon = field.icon;
                              return (
                                <div
                                  key={field.id}
                                  className={cn(
                                    "space-y-2 p-3 rounded-xl border transition-all duration-200",
                                    "bg-white border-slate-200 hover:border-teal-300 hover:shadow-sm",
                                    "focus-within:ring-2 focus-within:ring-teal-100 focus-within:border-teal-400"
                                  )}
                                >
                                  <Label
                                    htmlFor={`vital-${field.id}-${index}`}
                                    className="text-[11px] font-semibold text-slate-600 flex items-center justify-between"
                                  >
                                    <span className="flex items-center gap-1.5">
                                      <Icon className={cn("h-3.5 w-3.5", field.color)} />
                                      {field.label}
                                    </span>
                                    <span className="text-[11px] text-slate-400 font-normal lowercase">
                                      {field.unit}
                                    </span>
                                  </Label>
                                  <Input
                                    id={`vital-${field.id}-${index}`}
                                    type={field.type === 'number' ? 'number' : 'text'}
                                    value={measurement.custom_data[field.id] || ''}
                                    onChange={(e) => handleUpdateCustomData(index, field.id, e.target.value)}
                                    placeholder={field.placeholder}
                                    className="h-10 text-sm font-semibold text-slate-700 bg-slate-50/50 border-slate-200"
                                  />
                                </div>
                              );
                            })}
                          </div>
                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            <Label
                              htmlFor={`vital-notes-${index}`}
                              className="text-xs font-semibold text-slate-600 flex items-center gap-1.5"
                            >
                              <FileText className="h-3.5 w-3.5 text-slate-400" />
                              Notas Clínicas
                              <span className="text-slate-400 font-normal">(opcional)</span>
                            </Label>
                            <Textarea
                              id={`vital-notes-${index}`}
                              value={measurement.notes}
                              onChange={(e) => handleUpdateMeasurement(index, 'notes', e.target.value)}
                              placeholder="Observações sobre o estado geral do paciente durante a medição..."
                              className={cn("min-h-[80px] resize-y bg-white border-slate-200 text-sm", inputFocusClasses)}
                              rows={3}
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                              <Zap className="h-3.5 w-3.5 text-blue-500" />
                              Valor
                            </Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={measurement.value}
                              onChange={(e) => handleUpdateMeasurement(index, 'value', e.target.value)}
                              placeholder="0.0"
                              className={cn("h-11 bg-white border-slate-200 font-semibold text-slate-700", inputFocusClasses, "focus-visible:ring-blue-400")}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                              <Target className="h-3.5 w-3.5 text-teal-500" />
                              Unidade
                            </Label>
                            <Input
                              value={measurement.unit}
                              onChange={(e) => handleUpdateMeasurement(index, 'unit', e.target.value)}
                              placeholder="Ex: cm, graus"
                              className={cn("h-11 bg-white border-slate-200 font-medium text-slate-600", inputFocusClasses)}
                            />
                          </div>
                          <div className="col-span-2 space-y-2 pt-2">
                            <Label
                              htmlFor={`notes-${index}`}
                              className="text-xs font-semibold text-slate-600 flex items-center gap-1.5"
                            >
                              <FileText className="h-3.5 w-3.5 text-slate-400" />
                              Anotações
                              <span className="text-slate-400 font-normal">(opcional)</span>
                            </Label>
                            <Textarea
                              id={`notes-${index}`}
                              value={measurement.notes}
                              onChange={(e) => handleUpdateMeasurement(index, 'notes', e.target.value)}
                              placeholder="Observações importantes sobre esta medição..."
                              className={cn("min-h-[80px] resize-y bg-white border-slate-200 text-sm", inputFocusClasses)}
                              rows={3}
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
            type="button"
            onClick={handleSave}
            className={cn(
              "w-full h-12 bg-gradient-to-r from-teal-600 to-teal-700",
              "hover:from-teal-700 hover:to-teal-800 text-white font-semibold text-base",
              "shadow-lg shadow-teal-200 rounded-xl group",
              "focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2",
              "transition-all duration-200"
            )}
            disabled={createMeasurement.isPending || measurements.every(m => !m.measurement_name || !hasAnyValue(m))}
            aria-label="Efetivar registros de medição"
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

      <TestLibraryModal
        open={testLibraryOpen}
        onOpenChange={setTestLibraryOpen}
        onAddTest={handleAddTestFromLibrary}
        patientId={patientId}
      />
    </Card>
  );
};
