import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {

  ClipboardList,
  Activity,
  UserCheck,
  Plus,
  Check,
  Info
} from 'lucide-react';
import { useCreateStandardForm, useStandardFormExists, STANDARD_FORMS } from '@/hooks/useStandardForms';
import { useEvaluationForms, useImportEvaluationForm, EvaluationFormFieldFormData } from '@/hooks/useEvaluationForms';
import { toast } from 'sonner';

interface StandardFormCardProps {
  type: keyof typeof STANDARD_FORMS;
  onCreate: (type: keyof typeof STANDARD_FORMS) => void;
  onDuplicate: (type: keyof typeof STANDARD_FORMS) => void;
}

interface StandardFormField {
  tipo_campo: string;
  rotulo: string;
  pergunta?: string;
  opcoes?: string[] | undefined;
  ordem: number;
  obrigatorio: boolean;
  secao?: string;
  descricao?: string;
  minimo?: number;
  maximo?: number;
}

function StandardFormCard({ type, onCreate, onDuplicate }: StandardFormCardProps) {
  const { data: exists } = useStandardFormExists(type);
  const config = STANDARD_FORMS[type];

  const getIcon = () => {
    switch (type) {
      case 'ANAMNESE':
        return <ClipboardList className="h-8 w-8 text-blue-500" />;
      case 'AVALIACAO_POSTURAL':
        return <Activity className="h-8 w-8 text-green-500" />;
      case 'AVALIACAO_FUNCIONAL':
        return <UserCheck className="h-8 w-8 text-purple-500" />;
      default:
        return <ClipboardList className="h-8 w-8" />;
    }
  };

  // const getTypeLabel = () => {
  //   switch (type) {
  //     case 'ANAMNESE':
  //       return 'Anamnese';
  //     case 'AVALIACAO_POSTURAL':
  //       return 'Avaliação Postural';
  //     case 'AVALIACAO_FUNCIONAL':
  //       return 'Avaliação Funcional';
  //     default:
  //       return type;
  //   }
  // };

  const getFieldSections = () => {
    const sections = config.campos.reduce((acc, campo) => {
      acc[campo.secao] = (acc[campo.secao] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(sections).map(([sec, count]) => (
      <span key={sec} className="text-xs">
        {sec}: {count}
      </span>
    )).join(' • ');
  };

  return (
    <Card className={`transition-all ${exists ? 'border-green-500/30 bg-green-50/30 dark:bg-green-950/20' : 'hover:shadow-md'}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg">
              {getIcon()}
            </div>
            <div>
              <CardTitle className="text-lg">{config.nome}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {config.descricao}
              </p>
            </div>
          </div>
          {exists && (
            <Badge variant="outline" className="text-green-600 border-green-500/50">
              <Check className="h-3 w-3 mr-1" />
              Instalada
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Campos incluídos:</div>
          <div className="text-sm text-muted-foreground">
            {getFieldSections()}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Badge variant="secondary">
            {config.campos.length} campos
          </Badge>
          <Badge variant="secondary">
            {Object.keys(config.campos.reduce((acc, c) => ({ ...acc, [c.secao]: true }), {})).length} seções
          </Badge>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            className="w-full"
            variant={exists ? "outline" : "default"}
            onClick={() => onCreate(type)}
            disabled={!!exists}
          >
            {exists ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Instalada como Padrão
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Instalar como Padrão
              </>
            )}
          </Button>

          <Button
            className="w-full"
            variant="secondary"
            onClick={() => onDuplicate(type)}
          >
            <ClipboardList className="h-4 w-4 mr-2" />
            Criar Cópia Editável
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function StandardFormsManager() {
  const createMutation = useCreateStandardForm();
  const importMutation = useImportEvaluationForm();
  const { data: existingForms = [] } = useEvaluationForms();

  const handleCreateForm = async (type: keyof typeof STANDARD_FORMS) => {
    await createMutation.mutateAsync(type);
  };

  const handleDuplicateForm = async (type: keyof typeof STANDARD_FORMS) => {
    const config = STANDARD_FORMS[type];

    // Map standard fields to form fields
    const fields: EvaluationFormFieldFormData[] = config.campos.map((c: StandardFormField) => ({
      tipo_campo: c.tipo_campo,
      label: c.rotulo,
      placeholder: c.pergunta,
      opcoes: c.opcoes ? c.opcoes : undefined, // Check type compatibility
      ordem: c.ordem,
      obrigatorio: c.obrigatorio,
      grupo: c.secao,
      descricao: c.descricao,
      minimo: c.minimo,
      maximo: c.maximo,
    }));

    await importMutation.mutateAsync({
      nome: `${config.nome} (Personalizada)`,
      descricao: config.descricao,
      tipo: config.tipo, // Retains original category type for filtering
      fields: fields,
      referencias: null
    });
  };

  // Verificar quais fichas já existem
  const existingStandardForms = existingForms.filter(f =>
    f.nome === STANDARD_FORMS.ANAMNESE.nome ||
    f.nome === STANDARD_FORMS.AVALIACAO_POSTURAL.nome ||
    f.nome === STANDARD_FORMS.AVALIACAO_FUNCIONAL.nome
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Fichas Padrão</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Fichas prontas para uso criadas especialmente para fisioterapia
          </p>
        </div>
        {existingStandardForms.length > 0 && (
          <Badge variant="secondary">
            {existingStandardForms.length} de {Object.keys(STANDARD_FORMS).length} instaladas
          </Badge>
        )}
      </div>

      {existingStandardForms.length > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Você já tem {existingStandardForms.length} ficha(s) padrão instalada(s).
            As fichas podem ser personalizadas após a criação.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.keys(STANDARD_FORMS).map((type) => (
          <StandardFormCard
            key={type}
            type={type as keyof typeof STANDARD_FORMS}
            onCreate={handleCreateForm}
            onDuplicate={handleDuplicateForm}
          />
        ))}
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          As fichas padrão incluem campos comumente utilizados em fisioterapia.
          Após criar, você pode personalizar adicionando, removendo ou editando campos
          conforme sua necessidade.
        </AlertDescription>
      </Alert>
    </div>
  );
}
