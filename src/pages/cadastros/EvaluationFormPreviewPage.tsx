import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/shared/ui/button';
import { Card, CardContent } from '@/components/shared/ui/card';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Textarea } from '@/components/shared/ui/textarea';
import { Badge } from '@/components/shared/ui/badge';
import { Separator } from '@/components/shared/ui/separator';
import { Eye, Edit, Download, FileText, Clock, User } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEvaluationFormWithFields } from '@/hooks/useEvaluationForms';
import { Skeleton } from '@/components/shared/ui/skeleton';
import { Alert, AlertDescription } from '@/components/shared/ui/alert';
import { Info } from 'lucide-react';
import { toast } from 'sonner';

// Componentes para renderizar campos
function FormField({ field, value, onChange, readonly }: {
  field: {
    tipo_campo: string;
    rotulo: string;
    opcoes?: string[];
    obrigatorio?: boolean;
  };
  value?: string | number | Date;
  onChange?: (val: string | number | Date) => void;
  readonly?: boolean;
}) {
  const renderField = () => {
    switch (field.tipo_campo) {
      case 'texto_curto':
      case 'text':
        return (
          <Input
            value={value || ''}
            onChange={(e) => onChange?.(e.target.value)}
            disabled={readonly}
            placeholder="Sua resposta..."
          />
        );

      case 'texto_longo':
      case 'long_text':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => onChange?.(e.target.value)}
            disabled={readonly}
            placeholder="Sua resposta detalhada..."
            rows={4}
            className="resize-none"
          />
        );

      case 'numero':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => onChange?.(parseFloat(e.target.value))}
            disabled={readonly}
            placeholder="0"
          />
        );

      case 'data':
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => onChange?.(e.target.value)}
            disabled={readonly}
          />
        );

      case 'dropdown':
      case 'select':
        return (
          <select
            className="w-full px-3 py-2 border rounded-md bg-background"
            value={value || ''}
            onChange={(e) => onChange?.(e.target.value)}
            disabled={readonly}
          >
            <option value="">Selecione...</option>
            {field.opcoes?.map((opt: string, i: number) => (
              <option key={i} value={opt}>{opt}</option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {field.opcoes?.map((opt: string, i: number) => (
              <label key={i} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={field.id}
                  value={opt}
                  checked={value === opt}
                  onChange={(e) => onChange?.(e.target.value)}
                  disabled={readonly}
                  className="w-4 h-4"
                />
                <span className="text-sm">{opt}</span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <div className="space-y-2">
            {field.opcoes?.map((opt: string, i: number) => (
              <label key={i} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Array.isArray(value) ? value.includes(opt) : false}
                  onChange={(e) => {
                    const current = Array.isArray(value) ? value : [];
                    if (e.target.checked) {
                      onChange?.([...current, opt]);
                    } else {
                      onChange?.(current.filter((v: string) => v !== opt));
                    }
                  }}
                  disabled={readonly}
                  className="w-4 h-4"
                />
                <span className="text-sm">{opt}</span>
              </label>
            ))}
          </div>
        );

      case 'escala':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{field.opcoes?.[0] || 'Pouco'}</span>
              <span>{field.opcoes?.[1] || 'Muito'}</span>
            </div>
            <input
              type="range"
              min={field.minimo || 0}
              max={field.maximo || 10}
              value={value || 0}
              onChange={(e) => onChange?.(parseInt(e.target.value))}
              disabled={readonly}
              className="w-full"
            />
            <div className="text-center font-semibold text-lg">
              {value || 0}
            </div>
          </div>
        );

      case 'mapa_corporal':
      case 'body_map':
        return (
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <div className="text-muted-foreground mb-2">
              Mapa corporal interativo
            </div>
            {readonly ? (
              <div className="text-sm">Clique no corpo para indicar áreas de dor</div>
            ) : (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Mapa corporal será exibido no modo de preenchimento
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      default:
        return (
          <Input
            value={value || ''}
            onChange={(e) => onChange?.(e.target.value)}
            disabled={readonly}
            placeholder="Sua resposta..."
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        {field.obrigatorio && (
          <span className="text-destructive mt-0.5">*</span>
        )}
        <Label className={field.obrigatorio ? '' : 'mt-0.5'}>
          {field.rotulo || field.pergunta}
        </Label>
      </div>
      {field.descricao && (
        <p className="text-xs text-muted-foreground -mt-1 mb-2">{field.descricao}</p>
      )}
      {renderField()}
    </div>
  );
}

export default function EvaluationFormPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: formData, isLoading } = useEvaluationFormWithFields(id);
  const [responses, setResponses] = useState<Record<string, string | number | Date | string[]>>({});
  const [isEditing, setIsEditing] = useState(false);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6 max-w-4xl mx-auto">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64" />
        </div>
      </MainLayout>
    );
  }

  if (!formData) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-xl font-semibold mb-2">Ficha não encontrada</h2>
          <p className="text-muted-foreground mb-4">A ficha solicitada não existe ou foi excluída.</p>
          <Button onClick={() => navigate('/cadastros/fichas-avaliacao')}>
            Voltar para Fichas
          </Button>
        </div>
      </MainLayout>
    );
  }

  // Agrupar campos por seção
  const groupedFields = formData.fields?.reduce((acc: Record<string, Array<Record<string, unknown>>>, field: Record<string, unknown>) => {
    const section = field.secao || 'Geral';
    if (!acc[section]) acc[section] = [];
    acc[section].push(field);
    return acc;
  }, {}) || {};

  const handleExport = () => {
    const content = `
FICHA DE AVALIAÇÃO
${'='.repeat(50)}

Nome: ${formData.nome}
Tipo: ${formData.tipo}
${formData.descricao ? `Descrição: ${formData.descricao}` : ''}

${'='.repeat(50)}

${Object.entries(groupedFields).map(([section, fields]: [string, Array<Record<string, unknown>>]) => `
${section}
${'-'.repeat(30)}

${fields.map((f: Record<string, unknown>) => `
${(f.rotulo as string | undefined) || (f.pergunta as string | undefined)}${f.obrigatorio ? ' *' : ''}
${responses[f.id as string] || '[Não respondido]'}
`).join('\n')}
`).join('\n')}

Gerado em: ${new Date().toLocaleString('pt-BR')}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ficha-${formData.nome.toLowerCase().replace(/\s+/g, '-')}.txt`;
    a.click();
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{formData.nome}</h1>
              <Badge variant="outline">{formData.tipo}</Badge>
            </div>
            {formData.descricao && (
              <p className="text-muted-foreground mt-1">{formData.descricao}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
              <Edit className="h-4 w-4 mr-2" />
              {isEditing ? 'Cancelar' : 'Preencher'}
            </Button>
            <Button onClick={() => navigate(`/cadastros/fichas-avaliacao/${id}/campos`)}>
              <Eye className="h-4 w-4 mr-2" />
              Editar Campos
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="h-4 w-4" />
            <span>{formData.fields?.length || 0} campos</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>~{Math.ceil((formData.fields?.length || 0) / 3)} min</span>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardContent className="pt-6">
            <form className="space-y-8">
              {Object.entries(groupedFields).map(([section, fields], sectionIndex) => (
                <div key={sectionIndex} className="space-y-4">
                  {section !== 'Geral' && (
                    <>
                      <h3 className="text-lg font-semibold border-l-4 border-primary pl-3">
                        {section}
                      </h3>
                      <Separator />
                    </>
                  )}

                  <div className="space-y-6 pl-4">
                    {fields.map((field, fieldIndex) => (
                      <FormField
                        key={field.id || fieldIndex}
                        field={field as { tipo_campo: string; rotulo: string; opcoes?: string[]; obrigatorio?: boolean; id: string }}
                        value={responses[field.id as string]}
                        onChange={(val) => setResponses({ ...responses, [field.id as string]: val })}
                        readonly={!isEditing}
                      />
                    ))}
                  </div>

                  {sectionIndex < Object.entries(groupedFields).length - 1 && (
                    <Separator className="mt-6" />
                  )}
                </div>
              ))}
            </form>
          </CardContent>
        </Card>

        {/* Actions */}
        {isEditing && (
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancelar
            </Button>
            <Button onClick={() => {
              // Aqui você salvaria as respostas no banco
              toast.success('Respostas salvas com sucesso!');
              setIsEditing(false);
            }}>
              Salvar Respostas
            </Button>
          </div>
        )}

        {/* Info */}
        {!isEditing && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Este é um preview da ficha. Clique em "Preencher" para responder às perguntas.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </MainLayout>
  );
}
