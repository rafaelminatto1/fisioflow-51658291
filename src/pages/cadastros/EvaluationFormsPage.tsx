import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { ClipboardList, Plus, Pencil, Trash2, Search, Eye, Settings, BookOpen, Copy, Download, Upload, Play, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import {
  useEvaluationForms,
  useCreateEvaluationForm,
  useUpdateEvaluationForm,
  useDeleteEvaluationForm,
  useDuplicateEvaluationForm,
  EvaluationFormFormData
} from '@/hooks/useEvaluationForms';
import { EvaluationForm, TemplateFilters, EvaluationTemplate } from '@/types/clinical-forms';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';
import { StandardFormsManager } from '@/components/clinical/StandardFormsManager';
import { useImportEvaluationForm, EvaluationFormImportData } from '@/hooks/useEvaluationForms';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { DynamicFieldRenderer } from '@/components/evaluation/DynamicFieldRenderer';
import { TemplateField } from '@/components/evaluation/EvaluationTemplateSelector';
// New components
import { PageHeader } from '@/components/evaluation/PageHeader';
import { TemplateGrid } from '@/components/evaluation/TemplateGrid';
import { TemplateFilters as TemplateFiltersComponent } from '@/components/evaluation/TemplateFilters';
import { useToggleFavorite } from '@/hooks/useTemplateFavorites';
import { useTemplateStats } from '@/hooks/useTemplateStats';

interface EvaluationFormField {
  tipo_campo: string;
  label: string;
  placeholder?: string;
  opcoes: string | string[];
  ordem: number;
  obrigatorio: boolean;
  grupo?: string;
  descricao?: string;
  minimo?: number;
  maximo?: number;
}

const TIPOS_FICHA = [
  { value: 'anamnese', label: 'Anamnese' },
  { value: 'avaliacao_postural', label: 'Avaliação Postural' },
  { value: 'avaliacao_funcional', label: 'Avaliação Funcional' },
  { value: 'esportiva', label: 'Fisioterapia Esportiva' },
  { value: 'ortopedica', label: 'Fisioterapia Ortopédica' },
  { value: 'neurologica', label: 'Fisioterapia Neurológica' },
  { value: 'respiratoria', label: 'Fisioterapia Respiratória' },
  { value: 'padrao', label: 'Padrão' },
  { value: 'custom', label: 'Personalizada' },
];

export default function EvaluationFormsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'minhas' | 'padrao'>('minhas');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<EvaluationForm | null>(null);
  const [previewForm, setPreviewForm] = useState<EvaluationForm | null>(null);

  // New: Filters state
  const [filters, setFilters] = useState<TemplateFilters>({
    search: '',
    category: undefined,
    favorites: false,
    sortBy: 'name',
  });

  // New: Hooks for favorites and stats
  const toggleFavoriteMutation = useToggleFavorite();
  const { data: stats } = useTemplateStats();

  const importMutation = useImportEvaluationForm();

  const [formData, setFormData] = useState<EvaluationFormFormData>({
    nome: '',
    tipo: 'anamnese',
    descricao: '',
    referencias: '',
    ativo: true,
  });

  // Fetch all forms (for the table view)
  const { data: forms = [], isLoading } = useEvaluationForms(filters.category);

  // Build favorites set for quick lookup
  const favoritesSet = useMemo(
    () => new Set(forms.filter(f => f.is_favorite).map(f => f.id)),
    [forms]
  );

  // Apply filters and sorting
  const filteredForms = useMemo(() => {
    let result = [...forms];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(f =>
        f.nome.toLowerCase().includes(searchLower) ||
        f.descricao?.toLowerCase().includes(searchLower)
      );
    }

    // Favorites filter
    if (filters.favorites) {
      result = result.filter(f => f.is_favorite);
    }

    // Sorting
    switch (filters.sortBy) {
      case 'recent':
        result.sort((a, b) => {
          if (!a.last_used_at) return 1;
          if (!b.last_used_at) return -1;
          return new Date(b.last_used_at).getTime() - new Date(a.last_used_at).getTime();
        });
        break;
      case 'usage':
        result.sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));
        break;
      case 'name':
      default:
        result.sort((a, b) => a.nome.localeCompare(b.nome));
        break;
    }

    return result;
  }, [forms, filters]);

  // Quick access templates (favorites + recently used)
  const quickAccessTemplates = useMemo(() => {
    const favorites = forms.filter(f => f.is_favorite);
    const recentlyUsed = forms
      .filter(f => f.last_used_at && !f.is_favorite)
      .sort((a, b) => new Date(b.last_used_at!).getTime() - new Date(a.last_used_at!).getTime())
      .slice(0, 6 - favorites.length);

    return [...favorites, ...recentlyUsed].slice(0, 6);
  }, [forms]);

  const handleOpenDialog = (form?: EvaluationForm) => {
    if (form) {
      setEditingForm(form);
      setFormData({
        nome: form.nome,
        tipo: form.tipo,
        descricao: form.descricao || '',
        referencias: form.referencias || '',
        ativo: form.ativo,
      });
    } else {
      setEditingForm(null);
      setFormData({
        nome: '',
        tipo: 'anamnese',
        descricao: '',
        referencias: '',
        ativo: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingForm) {
      await updateMutation.mutateAsync({ id: editingForm.id, ...formData });
    } else {
      const result = await createMutation.mutateAsync(formData);
      // Navigate to form builder after creation
      if (result?.id) {
        navigate(`/cadastros/fichas-avaliacao/${result.id}/campos`);
        return;
      }
    }

    setIsDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  // New: Use template directly (navigate to patient evaluation)
  const handleUseTemplate = (templateId: string) => {
    // For now, navigate to form builder. In the future, this could:
    // 1. Open a patient selector modal
    // 2. Navigate directly to evaluation page with template pre-selected
    toast.success('Template selecionado! Redirecionando para configuração...');
    navigate(`/cadastros/fichas-avaliacao/${templateId}/campos`);
  };

  // New: Toggle favorite
  const handleToggleFavorite = (templateId: string) => {
    const template = forms.find(f => f.id === templateId);
    if (template) {
      toggleFavoriteMutation.mutate({
        templateId,
        isFavorite: template.is_favorite || false,
      });
    }
  };

  const handleExport = (form: EvaluationForm) => {
    const exportData: EvaluationFormImportData = {
      nome: form.nome,
      descricao: form.descricao,
      tipo: form.tipo,
      referencias: form.referencias,
      fields: (form.evaluation_form_fields || []).map((f: EvaluationFormField) => ({
        tipo_campo: f.tipo_campo,
        label: f.label,
        placeholder: f.placeholder,
        opcoes: typeof f.opcoes === 'string' ? JSON.parse(f.opcoes) : f.opcoes,
        ordem: f.ordem,
        obrigatorio: f.obrigatorio,
        grupo: f.grupo,
        descricao: f.descricao,
        minimo: f.minimo,
        maximo: f.maximo,
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${form.nome.toLowerCase().replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Template exportado com sucesso.');
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        await importMutation.mutateAsync(json);
      } catch (error) {
        console.error(error);
        toast.error('Erro ao ler arquivo JSON. Verifique o formato.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header with Stats */}
        <PageHeader
          title="Fichas de Avaliação"
          description="Crie fichas personalizáveis ou use modelos prontos para avaliação de pacientes"
          icon={ClipboardList}
          stats={stats ? {
            total: stats.total,
            favorites: stats.favorites,
            recentlyUsed: stats.recentlyUsed,
          } : undefined}
          action={
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Ficha
            </Button>
          }
        />

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'minhas' | 'padrao')}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="minhas">Minhas Fichas</TabsTrigger>
            <TabsTrigger value="padrao">Fichas Padrão</TabsTrigger>
          </TabsList>

          <TabsContent value="minhas" className="space-y-6 mt-4">
            {/* Filters */}
            <TemplateFiltersComponent
              filters={filters}
              onFiltersChange={setFilters}
              totalCount={forms.length}
              favoritesCount={favoritesSet.size}
            />

            {/* Quick Access Section - Favorites + Recently Used */}
            {quickAccessTemplates.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Acesso Rápido</h2>
                  <Badge variant="secondary" className="text-xs">
                    Favoritos e Recentes
                  </Badge>
                </div>
                <TemplateGrid
                  templates={quickAccessTemplates}
                  favorites={favoritesSet}
                  isLoading={isLoading}
                  onToggleFavorite={handleToggleFavorite}
                  onEdit={(id) => navigate(`/cadastros/fichas-avaliacao/${id}/campos`)}
                  onDuplicate={(id) => duplicateMutation.mutate(id)}
                  onDelete={setDeleteId}
                  onPreview={setPreviewForm}
                  onUse={handleUseTemplate}
                  maxItems={6}
                />
              </div>
            )}

            <Separator />

            {/* Full List - Table View */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Todos os Templates ({filteredForms.length})</h2>
                <div className="flex gap-2">
                  <input
                    type="file"
                    id="import-file"
                    className="hidden"
                    accept=".json"
                    onChange={handleImportFile}
                  />
                  <Button variant="outline" size="sm" onClick={() => document.getElementById('import-file')?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Importar
                  </Button>
                </div>
              </div>

              <Card>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Carregando...</div>
                  ) : filteredForms.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-4xl mb-2">📋</div>
                      <p className="text-muted-foreground">
                        {filters.favorites
                          ? 'Nenhum template favorito encontrado'
                          : 'Nenhuma ficha encontrada'}
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[10px]"></TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead className="w-[60px] text-center">Ref</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Campos</TableHead>
                          <TableHead>Uso</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredForms.map((form) => (
                          <TableRow key={form.id}>
                            <TableCell>
                              {form.is_favorite && (
                                <span className="text-yellow-500">⭐</span>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{form.nome}</TableCell>
                            <TableCell className="text-center">
                              {form.referencias && (
                                <TooltipProvider>
                                  <Tooltip delayDuration={300}>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center justify-center cursor-help">
                                        <BookOpen className="h-4 w-4 text-primary/70" />
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs p-3">
                                      <p className="font-semibold text-xs mb-1">Referências:</p>
                                      <p className="text-xs text-muted-foreground">{form.referencias}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {TIPOS_FICHA.find(t => t.value === form.tipo)?.label || form.tipo}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {(form.evaluation_form_fields?.length || 0)} campos
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {form.usage_count ? (
                                <span>{form.usage_count}x</span>
                              ) : (
                                <span className="text-xs">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleUseTemplate(form.id)}
                                        className="hover:bg-primary/10 hover:text-primary"
                                      >
                                        <Play className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Usar Template</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => duplicateMutation.mutate(form.id)}
                                        disabled={duplicateMutation.isPending}
                                      >
                                        <Copy className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Duplicar</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleExport(form)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setPreviewForm(form)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => navigate(`/cadastros/fichas-avaliacao/${form.id}/campos`)}
                                >
                                  <Settings className="h-4 w-4" />
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenDialog(form)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteId(form.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="padrao" className="mt-4">
            <StandardFormsManager />
          </TabsContent>
        </Tabs>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingForm ? 'Editar Ficha' : 'Nova Ficha de Avaliação'}
              </DialogTitle>
              <DialogDescription>
                {editingForm
                  ? 'Edite as informações básicas da ficha'
                  : 'Preencha os dados e configure os campos da avaliação'
                }
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} id="evaluation-form-form" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="nome">Nome da Ficha *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Ex: Anamnese Fisioterapia Esportiva"
                    required
                  />
                </div>

                <div className="col-span-2 md:col-span-1 space-y-2">
                  <Label htmlFor="tipo">Tipo *</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, tipo: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_FICHA.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  value={formData.descricao || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Breve descrição da finalidade desta ficha"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="referencias" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Referências Científicas
                </Label>
                <Textarea
                  id="referencias"
                  value={formData.referencias || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, referencias: e.target.value }))}
                  placeholder="Cite as referências bibliográficas, artigos ou diretrizes utilizadas (Opcional)"
                  rows={3}
                />
                <p className="text-[0.8rem] text-muted-foreground">
                  Estas referências serão exibidas durante o preenchimento da avaliação para consulta rápida.
                </p>
              </div>
            </form>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                form="evaluation-form-form"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingForm ? 'Salvar Alterações' : 'Criar e Configurar Campos'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir esta ficha? Todos os campos e respostas associadas serão perdidos permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir Definitivamente
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Preview Sheet */}
        <Sheet open={!!previewForm} onOpenChange={() => setPreviewForm(null)}>
          <SheetContent className="overflow-y-auto sm:max-w-xl w-full">
            <SheetHeader className="mb-6">
              <SheetTitle>{previewForm?.nome}</SheetTitle>
              <SheetDescription>
                {previewForm?.descricao}
                {previewForm?.referencias && (
                  <div className="mt-2 p-2 bg-muted/50 rounded-md text-xs border">
                    <div className="flex items-center gap-2 mb-1 text-primary">
                      <BookOpen className="h-3 w-3" />
                      <span className="font-semibold">Referências Científicas:</span>
                    </div>
                    {previewForm.referencias}
                  </div>
                )}
              </SheetDescription>
            </SheetHeader>
            {previewForm && (
              <div className="pb-10">
                <DynamicFieldRenderer
                  fields={(previewForm.evaluation_form_fields || []).map((f: EvaluationFormField) => ({
                    ...f,
                    section: f.grupo,
                    min: f.minimo,
                    max: f.maximo,
                    description: f.descricao,
                    opcoes: typeof f.opcoes === 'string' ? JSON.parse(f.opcoes) : f.opcoes,
                  })).sort((a: EvaluationFormField, b: EvaluationFormField) => a.ordem - b.ordem)}
                  values={{}}
                  onChange={() => { }}
                  readOnly={true}
                />
                <div className="mt-6 pt-6 border-t flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setPreviewForm(null)}>
                    Fechar
                  </Button>
                  <Button onClick={() => {
                    if (previewForm) {
                      setPreviewForm(null);
                      handleUseTemplate(previewForm.id);
                    }
                  }}>
                    <Play className="h-4 w-4 mr-2" />
                    Usar Este Template
                  </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </MainLayout>
  );
}
