/**
 * AI Treatment Recommendations Component
 *
 * Provides AI-generated treatment plans and recommendations
 * based on patient data and clinical information.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

  Sparkles,
  RefreshCw,
  FileText,
  Clock,
  Target,
  Activity,
  GraduationCap,
  Stethoscope,
  Download,
} from 'lucide-react';
import { useAITreatmentRecommendations } from '@/hooks/useAIInsights';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ============================================================================
// TYPES
// ============================================================================

interface AITreatmentRecommendationsProps {
  patientId: string;
  patientName: string;
  diagnosis?: string;
  primaryComplaint?: string;
  sessionCount?: number;
  onPrint?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AITreatmentRecommendations({
  patientId: _patientId,
  patientName: _patientName,
  diagnosis,
  primaryComplaint,
  sessionCount,
  onPrint,
}: AITreatmentRecommendationsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    diagnosis: diagnosis || '',
    primaryComplaint: primaryComplaint || '',
    sessionCount: sessionCount?.toString() || '',
    additionalInfo: '',
  });

  const recommendations = useAITreatmentRecommendations({
    patientId,
    patientName,
    diagnosis: formData.diagnosis || undefined,
    primaryComplaint: formData.primaryComplaint || undefined,
    sessionCount: formData.sessionCount ? parseInt(formData.sessionCount, 10) : undefined,
    language: 'pt-BR',
  });

  const handleGenerate = () => {
    if (formData.diagnosis || formData.primaryComplaint) {
      recommendations.generate();
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowForm(false);
    handleGenerate();
  };

  const sections = [
    { icon: Target, label: 'Objetivos', id: 'objetivos' },
    { icon: Activity, label: 'Intervenções', id: 'intervencoes' },
    { icon: Clock, label: 'Frequência', id: 'frequencia' },
    { icon: GraduationCap, label: 'Critérios de Alta', id: 'alta' },
  ];

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Plano de Tratamento IA</CardTitle>
              <CardDescription>Recomendações baseadas em evidências</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowForm(!showForm)}
              className="gap-1.5"
            >
              <Stethoscope className="h-4 w-4" />
              {showForm ? 'Ocultar' : 'Dados'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0"
            >
              {isExpanded ? '▲' : '▼'}
            </Button>
          </div>
        </div>

        {/* Data Input Form */}
        {showForm && (
          <form onSubmit={handleFormSubmit} className="mt-4 space-y-4 p-4 bg-muted/50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="diagnosis">Diagnóstico</Label>
                <Input
                  id="diagnosis"
                  value={formData.diagnosis}
                  onChange={e => setFormData({ ...formData, diagnosis: e.target.value })}
                  placeholder="Ex: Lombalgia crônica"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sessionCount">Sessões Realizadas</Label>
                <Input
                  id="sessionCount"
                  type="number"
                  value={formData.sessionCount}
                  onChange={e => setFormData({ ...formData, sessionCount: e.target.value })}
                  placeholder="Ex: 6"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="primaryComplaint">Queixa Principal</Label>
              <Input
                id="primaryComplaint"
                value={formData.primaryComplaint}
                onChange={e => setFormData({ ...formData, primaryComplaint: e.target.value })}
                placeholder="Ex: Dor lombar há 3 meses, piora ao sentar"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="additionalInfo">Informações Adicionais</Label>
              <Textarea
                id="additionalInfo"
                value={formData.additionalInfo}
                onChange={e => setFormData({ ...formData, additionalInfo: e.target.value })}
                placeholder="Ex: Trabalha sentado, pratica caminhada 2x/semana..."
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="gap-1.5">
                <Sparkles className="h-4 w-4" />
                Gerar Plano
              </Button>
            </div>
          </form>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Generate Button */}
          {!recommendations.completion && !showForm && (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground mb-4">
                Gere um plano de tratamento personalizado com IA
              </p>
              <Button
                onClick={handleGenerate}
                disabled={recommendations.isGenerating}
                className="gap-1.5"
              >
                <Sparkles className="h-4 w-4" />
                Gerar Recomendações
              </Button>
            </div>
          )}

          {/* Loading State */}
          {recommendations.isGenerating && !recommendations.completion && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Gerando plano de tratamento...</span>
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          )}

          {/* Recommendations Content */}
          {recommendations.completion && (
            <div className="space-y-4">
              {/* Quick Actions */}
              <div className="flex items-center justify-between pb-3 border-b">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Gerado em {format(new Date(), 'HH:mm', { locale: ptBR })}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => recommendations.generate()}
                    disabled={recommendations.isGenerating}
                    className="gap-1"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Regenerar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onPrint}
                    className="gap-1"
                  >
                    <Download className="h-3 w-3" />
                    Exportar
                  </Button>
                </div>
              </div>

              {/* Section Navigation */}
              <div className="flex flex-wrap gap-2">
                {sections.map(section => (
                  <Badge
                    key={section.id}
                    variant="outline"
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => {
                      document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    <section.icon className="h-3 w-3 mr-1" />
                    {section.label}
                  </Badge>
                ))}
              </div>

              {/* Markdown Content */}
              <ScrollArea className="h-[400px] pr-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => (
                        <h1 id="objetivos" className="text-xl font-bold mt-4 mb-3 flex items-center gap-2">
                          <Target className="h-5 w-5 text-primary" />
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => {
                        const sectionId = children?.toString().toLowerCase().includes('objetivo')
                          ? 'objetivos'
                          : children?.toString().toLowerCase().includes('interven')
                            ? 'intervencoes'
                            : children?.toString().toLowerCase().includes('frequ')
                              ? 'frequencia'
                              : children?.toString().toLowerCase().includes('alta')
                                ? 'alta'
                                : undefined;
                        return (
                          <h2
                            id={sectionId}
                            className="text-lg font-semibold mt-4 mb-2 flex items-center gap-2"
                          >
                            {children}
                          </h2>
                        );
                      },
                      h3: ({ children }) => <h3 className="text-base font-medium mt-3 mb-2">{children}</h3>,
                      p: ({ children }) => <p className="text-sm leading-relaxed mb-2">{children}</p>,
                      ul: ({ children }) => <ul className="text-sm list-disc ml-4 space-y-1 mb-2">{children}</ul>,
                      ol: ({ children }) => <ol className="text-sm list-decimal ml-4 space-y-1 mb-2">{children}</ol>,
                      li: ({ children }) => <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{children}</span>
                      </li>,
                      strong: ({ children }) => <strong className="font-semibold text-primary">{children}</strong>,
                    }}
                  >
                    {recommendations.completion}
                  </ReactMarkdown>
                </div>
              </ScrollArea>

              {/* Disclaimer */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  <strong>Aviso:</strong> Estas recomendações são geradas por IA e devem ser validadas
                  por um profissional de saúde qualificado. Considere sempre o contexto clínico
                  individual do paciente.
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {recommendations.error && (
            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300">
                Erro ao gerar recomendações: {recommendations.error.message}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerate}
                className="mt-2"
              >
                Tentar Novamente
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ============================================================================
// MINI VERSION FOR SIDEBAR
// ============================================================================

interface AITreatmentMiniProps {
  patientId: string;
  patientName: string;
  onOpen: () => void;
}

export function AITreatmentMini({ patientId: _patientId, patientName: _patientName, onOpen }: AITreatmentMiniProps) {
  return (
    <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={onOpen}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
            <FileText className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">Plano de Tratamento IA</p>
            <p className="text-xs text-muted-foreground">Gerar recomendações personalizadas</p>
          </div>
          <Sparkles className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}
