import React, { useState } from 'react';
import { FileText, Trash2 } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/shared/ui/dialog';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import {
  useEventoTemplates,
  useCreateEventoFromTemplate,
  useDeleteTemplate,
} from '@/hooks/useEventoTemplates';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/shared/ui/badge';

interface CreateFromTemplateButtonProps {
  onEventoCreated?: () => void;
}

export const CreateFromTemplateButton: React.FC<CreateFromTemplateButtonProps> = ({
  onEventoCreated,
}) => {
  const [open, setOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [nomeEvento, setNomeEvento] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [local, setLocal] = useState('');

  const { data: templates, isLoading } = useEventoTemplates();
  const createEvento = useCreateEventoFromTemplate();
  const deleteTemplate = useDeleteTemplate();

  const handleCreate = () => {
    if (!selectedTemplate || !nomeEvento || !dataInicio || !dataFim) return;

    createEvento.mutate(
      {
        templateId: selectedTemplate,
        nomeEvento,
        dataInicio,
        dataFim,
        local,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setSelectedTemplate(null);
          setNomeEvento('');
          setDataInicio('');
          setDataFim('');
          setLocal('');
          onEventoCreated?.();
        },
      }
    );
  };

  const handleDeleteTemplate = (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Deseja excluir este template?')) {
      deleteTemplate.mutate(templateId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Criar de Template</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Evento a partir de Template</DialogTitle>
          <DialogDescription>
            Selecione um template e preencha as informações específicas do novo evento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Lista de Templates */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Selecione um Template</h3>

            {isLoading && <LoadingSkeleton type="card" rows={2} />}

            {!isLoading && templates && templates.length === 0 && (
              <EmptyState
                icon={FileText}
                title="Nenhum template disponível"
                description="Crie templates a partir de eventos existentes para reutilizar configurações."
              />
            )}

            {!isLoading && templates && templates.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {templates.map((template) => (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-all ${
                      selectedTemplate === template.id
                        ? 'ring-2 ring-primary'
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">{template.nome}</CardTitle>
                          <CardDescription className="text-xs mt-1">
                            {template.categoria}
                          </CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={(e) => handleDeleteTemplate(template.id, e)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {template.descricao && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {template.descricao}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {template.gratuito && (
                          <Badge variant="secondary" className="text-xs">
                            Gratuito
                          </Badge>
                        )}
                        {template.checklist_padrao &&
                          Array.isArray(template.checklist_padrao) &&
                          template.checklist_padrao.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {template.checklist_padrao.length} itens no checklist
                            </Badge>
                          )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Formulário de Novo Evento */}
          {selectedTemplate && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-sm font-semibold">Informações do Novo Evento</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome-evento">Nome do Evento *</Label>
                  <Input
                    id="nome-evento"
                    value={nomeEvento}
                    onChange={(e) => setNomeEvento(e.target.value)}
                    placeholder="Ex: Corrida de Rua 2025"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="local">Local</Label>
                  <Input
                    id="local"
                    value={local}
                    onChange={(e) => setLocal(e.target.value)}
                    placeholder="Ex: Parque Ibirapuera"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data-inicio">Data de Início *</Label>
                  <Input
                    id="data-inicio"
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data-fim">Data de Término *</Label>
                  <Input
                    id="data-fim"
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                  />
                </div>
              </div>

              <Button
                onClick={handleCreate}
                disabled={!nomeEvento || !dataInicio || !dataFim || createEvento.isPending}
                className="w-full"
              >
                {createEvento.isPending ? 'Criando...' : 'Criar Evento'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
