/**
 * DocumentAIUploader - Componente de upload de documentos médicos com IA
 * Parte do FASE 3 - Análise Multimodal de Documentos
 *
 * Recursos:
 * - Upload de PDFs e imagens
 * - Análise automática com IA
 * - Extração de diagnósticos, medicamentos, contraindicações
 * - Alertas de segurança
 * - Suporte a múltiplos arquivos
 *
 * @module components/patient/DocumentAIUploader
 */

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  Upload,
  X,
  AlertTriangle,
  CheckCircle2,
  FileImage,
  File,
  Loader2,
  Download,
  Eye,
  Trash2,
  AlertCircle,
  Pill,
  Activity,
  FileWarning,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Tipos
export interface DocumentAIUploaderProps {
  patientId: string;
  onAnalysisComplete?: (result: DocumentAnalysisResult) => void;
  onError?: (error: Error) => void;
  language?: 'pt-BR' | 'en';
  className?: string;
  maxFileSize?: number; // em bytes, padrão 50MB
  maxFiles?: number;
}

export type DocumentType =
  | 'medical_report'
  | 'exam_result'
  | 'prescription'
  | 'diagnosis'
  | 'discharge_summary'
  | 'surgery_report'
  | 'imaging'
  | 'lab_results'
  | 'other';

export interface ExtractedDiagnosis {
  name: string;
  code?: string;
  description?: string;
  severity?: 'leve' | 'moderada' | 'grave';
  relevanceToPhysiotherapy: 'alta' | 'media' | 'baixa';
}

export interface ExtractedMedication {
  name: string;
  dosage?: string;
  frequency?: string;
  purpose?: string;
  physiotherapyRelevance: string;
}

export interface ExtractedContraindication {
  type: 'absolute' | 'relative' | 'precaution';
  category: 'movement' | 'exercise' | 'technique' | 'modality' | 'position';
  description: string;
  recommendation: string;
}

export interface PhysiotherapistAlert {
  level: 'critical' | 'important' | 'informational';
  title: string;
  description: string;
  actionRequired: string;
}

export interface DocumentAnalysisResult {
  documentId: string;
  documentType: DocumentType;
  fileName: string;
  diagnoses: ExtractedDiagnosis[];
  medications: ExtractedMedication[];
  contraindications: ExtractedContraindication[];
  alerts: PhysiotherapistAlert[];
  summary: string;
  recommendations: string[];
}

interface FileWithPreview extends File {
  preview?: string;
  id: string;
}

// ============================================================================
// COMPONENTE
// ============================================================================

export function DocumentAIUploader({
  patientId,
  onAnalysisComplete,
  onError,
  language = 'pt-BR',
  className,
  maxFileSize = 50 * 1024 * 1024, // 50MB
  maxFiles = 10
}: DocumentAIUploaderProps) {

  // Estados
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [selectedDocumentType, setSelectedDocumentType] = useState<DocumentType>('other');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<{ current: number; total: number; message: string }>({
    current: 0,
    total: 0,
    message: ''
  });
  const [results, setResults] = useState<DocumentAnalysisResult[]>([]);
  const [expandedResult, setExpandedResult] = useState<string | null>(null);

  // Labels traduzíveis
  const labels = {
    title: language === 'pt-BR' ? 'Upload de Documentos Médicos' : 'Medical Document Upload',
    description: language === 'pt-BR'
      ? 'Faça upload de exames, laudos, receitas e outros documentos para análise automática com IA'
      : 'Upload exams, reports, prescriptions and other documents for automatic AI analysis',
    dragDrop: language === 'pt-BR'
      ? 'Arraste e solte arquivos aqui ou clique para selecionar'
      : 'Drag and drop files here or click to select',
    supportedFormats: language === 'pt-BR'
      ? 'Formatos suportados: PDF, Imagens (JPG, PNG, GIF)'
      : 'Supported formats: PDF, Images (JPG, PNG, GIF)',
    maxSize: language === 'pt-BR'
      ? `Tamanho máximo: ${Math.round(maxFileSize / 1024 / 1024)}MB por arquivo`
      : `Maximum size: ${Math.round(maxFileSize / 1024 / 1024)}MB per file`,
    selectType: language === 'pt-BR' ? 'Tipo de Documento' : 'Document Type',
    analyze: language === 'pt-BR' ? 'Analisar Documentos' : 'Analyze Documents',
    analyzing: language === 'pt-BR' ? 'Analisando...' : 'Analyzing...',
    remove: language === 'pt-BR' ? 'Remover' : 'Remove',
    clear: language === 'pt-BR' ? 'Limpar' : 'Clear',
    download: language === 'pt-BR' ? 'Baixar Relatório' : 'Download Report',
    view: language === 'pt-BR' ? 'Ver Detalhes' : 'View Details',
    hide: language === 'pt-BR' ? 'Ocultar' : 'Hide',

    // Abas
    diagnoses: language === 'pt-BR' ? 'Diagnósticos' : 'Diagnoses',
    medications: language === 'pt-BR' ? 'Medicações' : 'Medications',
    contraindications: language === 'pt-BR' ? 'Contraindicações' : 'Contraindications',
    alerts: language === 'pt-BR' ? 'Alertas' : 'Alerts',
    summary: language === 'pt-BR' ? 'Resumo' : 'Summary',

    // Tipos de documento
    types: {
      medical_report: language === 'pt-BR' ? 'Relatório Médico' : 'Medical Report',
      exam_result: language === 'pt-BR' ? 'Resultado de Exame' : 'Exam Result',
      prescription: language === 'pt-BR' ? 'Receita Médica' : 'Prescription',
      diagnosis: language === 'pt-BR' ? 'Diagnóstico' : 'Diagnosis',
      discharge_summary: language === 'pt-BR' ? 'Sumário de Alta' : 'Discharge Summary',
      surgery_report: language === 'pt-BR' ? 'Relatório Cirúrgico' : 'Surgery Report',
      imaging: language === 'pt-BR' ? 'Imagem' : 'Imaging',
      lab_results: language === 'pt-BR' ? 'Resultados de Laboratório' : 'Lab Results',
      other: language === 'pt-BR' ? 'Outro' : 'Other'
    }
  };

  // ============================================================================
  // DROPZONE
  // ============================================================================

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Validar tamanho
    const validFiles = acceptedFiles.filter(file => file.size <= maxFileSize);

    if (validFiles.length < acceptedFiles.length) {
      toast.error(
        language === 'pt-BR'
          ? 'Alguns arquivos excedem o tamanho máximo'
          : 'Some files exceed maximum size'
      );
    }

    // Validar quantidade
    if (files.length + validFiles.length > maxFiles) {
      toast.error(
        language === 'pt-BR'
          ? `Máximo de ${maxFiles} arquivos permitidos`
          : `Maximum ${maxFiles} files allowed`
      );
      return;
    }

    // Adicionar previews para imagens
    const filesWithPreview = validFiles.map(file => ({
      ...file,
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    })) as FileWithPreview[];

    setFiles(prev => [...prev, ...filesWithPreview]);

    // Mostrar erros de rejeição
    rejectedFiles.forEach(({ file, errors }: any) => {
      const error = errors[0];
      if (error.code === 'file-too-large') {
        toast.error(
          language === 'pt-BR'
            ? `${file.name}: Arquivo muito grande`
            : `${file.name}: File too large`
        );
      } else if (error.code === 'file-invalid-type') {
        toast.error(
          language === 'pt-BR'
            ? `${file.name}: Tipo não suportado`
            : `${file.name}: Unsupported type`
        );
      }
    });
  }, [files.length, maxFileSize, maxFiles, language]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp']
    },
    maxSize: maxFileSize,
    multiple: true
  });

  // ============================================================================
  // FUNÇÕES
  // ============================================================================

  const removeFile = (id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const clearFiles = () => {
    files.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    setFiles([]);
    setResults([]);
    setExpandedResult(null);
  };

  const handleAnalyze = async () => {
    if (files.length === 0) return;

    setAnalyzing(true);
    setAnalysisProgress({ current: 0, total: files.length, message: 'Iniciando...' });
    setResults([]);

    try {
      const { analyzeMedicalDocument } = await import('@/lib/ai/document-analysis');

      const newResults: DocumentAnalysisResult[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setAnalysisProgress({
          current: i + 1,
          total: files.length,
          message: `Analisando ${file.name}...`
        });

        try {
          const result = await analyzeMedicalDocument(file, {
            patientId,
            documentType: selectedDocumentType,
            language,
            onProgress: (progress, stage) => {
              console.log(`${file.name}: ${stage} (${progress}%)`);
            }
          });

          newResults.push({
            documentId: result.documentId,
            documentType: result.documentType,
            fileName: file.name,
            diagnoses: result.diagnoses,
            medications: result.medications,
            contraindications: result.contraindications,
            alerts: result.physiotherapistAlerts,
            summary: result.documentSummary,
            recommendations: result.recommendations
          });

        } catch (error) {
          console.error(`Erro ao analisar ${file.name}:`, error);
          toast.error(
            language === 'pt-BR'
              ? `Erro ao analisar ${file.name}`
              : `Error analyzing ${file.name}`
          );
        }
      }

      setResults(newResults);

      if (newResults.length > 0) {
        toast.success(
          language === 'pt-BR'
            ? `${newResults.length} documento(s) analisado(s) com sucesso`
            : `${newResults.length} document(s) analyzed successfully`
        );
        onAnalysisComplete?.(newResults[0]);
      }

    } catch (error) {
      console.error('Erro na análise:', error);
      toast.error(
        language === 'pt-BR'
          ? 'Erro ao analisar documentos'
          : 'Error analyzing documents'
      );
      onError?.(error as Error);
    } finally {
      setAnalyzing(false);
    }
  };

  const getSeverityColor = (level: string) => {
    switch (level) {
      case 'critical':
      case 'grave':
        return 'bg-red-500/10 text-red-700 border-red-500/20';
      case 'important':
      case 'alta':
        return 'bg-orange-500/10 text-orange-700 border-orange-500/20';
      case 'warning':
      case 'media':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
      default:
        return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
    }
  };

  // ============================================================================
  // RENDERIZAÇÃO
  // ============================================================================

  return (
    <div className={cn('w-full max-w-6xl mx-auto space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {labels.title}
          </CardTitle>
          <CardDescription>{labels.description}</CardDescription>
        </CardHeader>
      </Card>

      {/* Upload area */}
      <Card>
        <CardContent className="p-6 space-y-4">
          {/* Tipo de documento */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium min-w-[150px]">{labels.selectType}</label>
            <Select value={selectedDocumentType} onValueChange={(v) => setSelectedDocumentType(v as DocumentType)}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(labels.types).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
            )}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">{labels.dragDrop}</p>
            <p className="text-xs text-muted-foreground">{labels.supportedFormats}</p>
            <p className="text-xs text-muted-foreground mt-1">{labels.maxSize}</p>
          </div>

          {/* Lista de arquivos */}
          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {language === 'pt-BR' ? 'Arquivos selecionados' : 'Selected files'} ({files.length})
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFiles}
                  disabled={analyzing}
                >
                  {labels.clear}
                </Button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {files.map(file => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg group"
                  >
                    {file.preview ? (
                      <img
                        src={file.preview}
                        alt={file.name}
                        className="h-12 w-12 object-cover rounded"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(file.id)}
                      disabled={analyzing}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botão de análise */}
          {files.length > 0 && (
            <Button
              onClick={handleAnalyze}
              disabled={analyzing}
              size="lg"
              className="w-full"
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  {labels.analyzing} ({analysisProgress.current}/{analysisProgress.total})
                </>
              ) : (
                <>
                  <Activity className="h-5 w-5 mr-2" />
                  {labels.analyze}
                </>
              )}
            </Button>
          )}

          {/* Progresso */}
          {analyzing && (
            <div className="space-y-2">
              <Progress
                value={(analysisProgress.current / analysisProgress.total) * 100}
                className="h-2"
              />
              <p className="text-xs text-center text-muted-foreground">{analysisProgress.message}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resultados */}
      {results.length > 0 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                {language === 'pt-BR' ? 'Resultados da Análise' : 'Analysis Results'}
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Alertas críticos primeiro */}
          {results.some(r => r.alerts.some(a => a.level === 'critical')) && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>
                {language === 'pt-BR' ? 'Atenção: Alertas Críticos' : 'Warning: Critical Alerts'}
              </AlertTitle>
              <AlertDescription>
                {results.flatMap(r => r.alerts.filter(a => a.level === 'critical')).map((alert, i) => (
                  <div key={i} className="mt-2 p-3 bg-background/50 rounded">
                    <p className="font-medium">{alert.title}</p>
                    <p className="text-sm mt-1">{alert.description}</p>
                    <p className="text-sm mt-1 font-medium">{alert.actionRequired}</p>
                  </div>
                ))}
              </AlertDescription>
            </Alert>
          )}

          {/* Resultados por documento */}
          {results.map((result, resultIndex) => (
            <Card key={result.documentId} className="overflow-hidden">
              <CardHeader
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setExpandedResult(expandedResult === result.documentId ? null : result.documentId)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-lg">{result.fileName}</CardTitle>
                      <CardDescription>{labels.types[result.documentType]}</CardDescription>
                    </div>
                  </div>
                  {expandedResult === result.documentId ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>

              {expandedResult === result.documentId && (
                <CardContent className="pt-6">
                  <Tabs defaultValue={labels.diagnoses} className="w-full">
                    <TabsList className="grid w-full grid-cols-5">
                      <TabsTrigger value={labels.diagnoses}>
                        {labels.diagnoses} ({result.diagnoses.length})
                      </TabsTrigger>
                      <TabsTrigger value={labels.medications}>
                        {labels.medications} ({result.medications.length})
                      </TabsTrigger>
                      <TabsTrigger value={labels.contraindications}>
                        {labels.contraindications} ({result.contraindications.length})
                      </TabsTrigger>
                      <TabsTrigger value={labels.alerts}>
                        {labels.alerts} ({result.alerts.length})
                      </TabsTrigger>
                      <TabsTrigger value={labels.summary}>{labels.summary}</TabsTrigger>
                    </TabsList>

                    {/* Diagnósticos */}
                    <TabsContent value={labels.diagnoses} className="space-y-3">
                      {result.diagnoses.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          {language === 'pt-BR' ? 'Nenhum diagnóstico encontrado' : 'No diagnoses found'}
                        </p>
                      ) : (
                        result.diagnoses.map((diag, i) => (
                          <div key={i} className="p-3 border rounded-lg space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="font-medium">{diag.name}</p>
                                {diag.code && (
                                  <Badge variant="outline" className="text-xs mt-1">
                                    {diag.code}
                                  </Badge>
                                )}
                              </div>
                              <Badge className={getSeverityColor(diag.relevanceToPhysiotherapy)}>
                                {diag.relevanceToPhysiotherapy}
                              </Badge>
                            </div>
                            {diag.description && (
                              <p className="text-sm text-muted-foreground">{diag.description}</p>
                            )}
                            {diag.severity && (
                              <Badge variant="outline" className="text-xs">
                                {diag.severity}
                              </Badge>
                            )}
                          </div>
                        ))
                      )}
                    </TabsContent>

                    {/* Medicações */}
                    <TabsContent value={labels.medications} className="space-y-3">
                      {result.medications.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          {language === 'pt-BR' ? 'Nenhuma medicação encontrada' : 'No medications found'}
                        </p>
                      ) : (
                        result.medications.map((med, i) => (
                          <div key={i} className="p-3 border rounded-lg space-y-2">
                            <div className="flex items-start gap-3">
                              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                <Pill className="h-5 w-5 text-blue-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium">{med.name}</p>
                                {med.dosage && med.frequency && (
                                  <p className="text-sm text-muted-foreground">
                                    {med.dosage} - {med.frequency}
                                  </p>
                                )}
                                {med.purpose && (
                                  <p className="text-xs text-muted-foreground mt-1">{med.purpose}</p>
                                )}
                              </div>
                            </div>
                            {med.physiotherapyRelevance && (
                              <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription className="text-xs">
                                  {med.physiotherapyRelevance}
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                        ))
                      )}
                    </TabsContent>

                    {/* Contraindicações */}
                    <TabsContent value={labels.contraindications} className="space-y-3">
                      {result.contraindications.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          {language === 'pt-BR'
                            ? 'Nenhuma contraindicação encontrada'
                            : 'No contraindications found'}
                        </p>
                      ) : (
                        result.contraindications.map((contra, i) => (
                          <Alert key={i} variant={contra.type === 'absolute' ? 'destructive' : 'default'}>
                            <FileWarning className="h-4 w-4" />
                            <AlertDescription>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge className={getSeverityColor(contra.type)}>
                                    {contra.type}
                                  </Badge>
                                  <Badge variant="outline">{contra.category}</Badge>
                                </div>
                                <p className="font-medium">{contra.description}</p>
                                <p className="text-sm text-muted-foreground">{contra.recommendation}</p>
                              </div>
                            </AlertDescription>
                          </Alert>
                        ))
                      )}
                    </TabsContent>

                    {/* Alertas */}
                    <TabsContent value={labels.alerts} className="space-y-3">
                      {result.alerts.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          {language === 'pt-BR' ? 'Nenhum alerta' : 'No alerts'}
                        </p>
                      ) : (
                        result.alerts.map((alert, i) => (
                          <Alert
                            key={i}
                            variant={alert.level === 'critical' ? 'destructive' : 'default'}
                          >
                            {alert.level === 'critical' ? (
                              <AlertTriangle className="h-4 w-4" />
                            ) : alert.level === 'important' ? (
                              <AlertCircle className="h-4 w-4" />
                            ) : (
                              <Activity className="h-4 w-4" />
                            )}
                            <AlertDescription>
                              <div className="space-y-1">
                                <p className="font-medium">{alert.title}</p>
                                <p className="text-sm">{alert.description}</p>
                                <p className="text-sm font-medium mt-2">{alert.actionRequired}</p>
                              </div>
                            </AlertDescription>
                          </Alert>
                        ))
                      )}
                    </TabsContent>

                    {/* Resumo */}
                    <TabsContent value={labels.summary} className="space-y-4">
                      <div className="prose prose-sm max-w-none">
                        <p>{result.summary}</p>
                      </div>

                      {result.recommendations.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-medium flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            {language === 'pt-BR' ? 'Recomendações' : 'Recommendations'}
                          </h4>
                          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                            {result.recommendations.map((rec, i) => (
                              <li key={i}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default DocumentAIUploader;
