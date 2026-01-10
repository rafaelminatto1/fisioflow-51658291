import { useState } from 'react';
import { toast } from 'sonner';
import { useExerciseTemplates, useTemplateItems } from '@/hooks/useExerciseTemplates';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, FileText, Search, Sparkles } from 'lucide-react';
import { TemplateModal } from './TemplateModal';
import { TemplateDetailsModal } from './TemplateDetailsModal';
import type { ExerciseTemplate } from '@/hooks/useExerciseTemplates';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function TemplateManager() {
  const [activeTab, setActiveTab] = useState<'patologia' | 'pos_operatorio'>('patologia');
  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [editTemplate, setEditTemplate] = useState<ExerciseTemplate | null>(null);
  const [viewTemplate, setViewTemplate] = useState<ExerciseTemplate | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [importing, setImporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Use createTemplateAsync exposed from the updated hook
  const { templates, loading, deleteTemplate, createTemplateAsync } = useExerciseTemplates(activeTab);

  const filteredTemplates = templates.filter(t =>
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.condition_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.template_variant?.toLowerCase().includes(search.toLowerCase())
  );

  // Agrupar por condição
  const groupedTemplates = filteredTemplates.reduce((acc, template) => {
    const key = template.condition_name;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(template);
    return acc;
  }, {} as Record<string, ExerciseTemplate[]>);

  const importDefaultTemplates = async () => {
    try {
      setImporting(true);
      const { defaultTemplates } = await import('@/lib/data/defaultTemplates');

      let count = 0;
      for (const template of defaultTemplates) {
        // Check if template with same name already exists to avoid duplicates
        const exists = templates.some(t => t.name === template.name);
        if (!exists) {
          // Create the template
          const newTemplate = await createTemplateAsync({
            name: template.name,
            description: template.description,
            category: template.category,
            condition_name: template.condition_name,
            template_variant: template.template_variant
          });

          // Note: In a real implementation we would also add the items here.
          // Since createTemplateAsync returns the created template, we could use its ID.
          // However, properly seeding items requires exercise IDs which might be dynamic.
          // For now we just create the template headers as per request.
          // To implement items properly we'd need to lookup exercise IDs by name or create placeholders.
          count++;
        }
      }

      if (count > 0) {
        toast.success(`${count} templates importados com sucesso!`);
      } else {
        toast.info('Todos os templates do sistema já foram importados.');
      }
      setShowImportModal(false);
    } catch (error) {
      console.error('Erro ao importar templates:', error);
      toast.error('Erro ao importar templates.');
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteTemplate(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold">Templates de Exercícios</h2>
            <p className="text-muted-foreground">
              Organize exercícios por patologia ou pós-operatório
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowImportModal(true)} disabled={importing}>
              <Sparkles className="h-4 w-4 mr-2" />
              Templates do Sistema
            </Button>
            <Button onClick={() => setShowNewModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Template
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="mb-4">
            <TabsTrigger value="patologia">Patologias</TabsTrigger>
            <TabsTrigger value="pos_operatorio">Pós-Operatórios</TabsTrigger>
          </TabsList>

          <div className="mb-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar templates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <TabsContent value={activeTab} className="space-y-6">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : Object.keys(groupedTemplates).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {search ? 'Nenhum template encontrado' : 'Nenhum template cadastrado'}
              </div>
            ) : (
              Object.entries(groupedTemplates).map(([condition, templates]) => (
                <Card key={condition} className="p-4">
                  <h3 className="text-lg font-semibold mb-3">{condition}</h3>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {templates.map((template) => (
                      <Card key={template.id} className="p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium">{template.name}</h4>
                            {template.template_variant && (
                              <Badge variant="outline" className="mt-1">
                                {template.template_variant}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {template.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {template.description}
                          </p>
                        )}

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setViewTemplate(template)}
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            Ver
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditTemplate(template)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(template.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </Card>

      <TemplateModal
        open={showNewModal || !!editTemplate}
        onOpenChange={(open) => {
          if (!open) {
            setShowNewModal(false);
            setEditTemplate(null);
          }
        }}
        template={editTemplate || undefined}
        defaultCategory={activeTab}
      />

      {viewTemplate && (
        <TemplateDetailsModal
          open={!!viewTemplate}
          onOpenChange={(open) => !open && setViewTemplate(null)}
          template={viewTemplate}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este template? Todos os exercícios associados serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
