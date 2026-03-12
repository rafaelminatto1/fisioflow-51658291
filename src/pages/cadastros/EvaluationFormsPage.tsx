import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CustomModal,
  CustomModalHeader,
  CustomModalTitle,
  CustomModalBody,
  CustomModalFooter,
} from '@/components/ui/custom-modal';
import { ClipboardList, Plus, Pencil, Trash2, Eye, Settings, BookOpen, Copy, Download, Upload, Play, Sparkles, Loader2, Save, FileText, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useEvaluationForms,
  useCreateEvaluationForm,
  useUpdateEvaluationForm,
  useDeleteEvaluationForm,
  useDuplicateEvaluationForm,
  EvaluationFormFormData
} from '@/hooks/useEvaluationForms';
import { EvaluationForm, TemplateFilters } from '@/types/clinical-forms';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';
import { StandardFormsManager } from '@/components/clinical/StandardFormsManager';
import { useImportEvaluationForm, EvaluationFormImportData } from '@/hooks/useEvaluationForms';
import { DynamicFieldRenderer } from '@/components/evaluation/DynamicFieldRenderer';
// New components
import { PageHeader } from '@/components/evaluation/PageHeader';
import { TemplateGrid } from '@/components/evaluation/TemplateGrid';
import { TemplateFilters as TemplateFiltersComponent } from '@/components/evaluation/TemplateFilters';
import { useToggleFavorite } from '@/hooks/useTemplateFavorites';
import { useTemplateStats } from '@/hooks/useTemplateStats';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

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
  const isMobile = useIsMobile();
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
  const createMutation = useCreateEvaluationForm();
  const updateMutation = useUpdateEvaluationForm();
  const deleteMutation = useDeleteEvaluationForm();
  const duplicateMutation = useDuplicateEvaluationForm();

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
        logger.error('Erro ao ler arquivo JSON', error, 'EvaluationFormsPage');
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
            <Button onClick={() => handleOpenDialog()} className="rounded-xl shadow-lg gap-2">
              <Plus className="h-4 w-4" />
              Nova Ficha
            </Button>
          }
        />

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'minhas' | 'padrao')}>
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-slate-100 p-1 rounded-xl">
            <TabsTrigger value="minhas" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Minhas Fichas</TabsTrigger>
            <TabsTrigger value="padrao" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Fichas Padrão</TabsTrigger>
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
                  <h2 className="text-lg font-bold text-slate-800">Acesso Rápido</h2>
                  <Badge variant="secondary" className="text-[10px] font-bold uppercase rounded-lg h-5 px-2 bg-slate-100 text-slate-500">
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

            <Separator className="bg-slate-100" />

            {/* Full List - Table View */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-800">Todos os Templates ({filteredForms.length})</h2>
                <div className="flex gap-2">
                  <input
                    type="file"
                    id="import-file"
                    className="hidden"
                    accept=".json"
                    onChange={handleImportFile}
                  />
                  <Button variant="outline" size="sm" onClick={() => document.getElementById('import-file')?.click()} className="rounded-xl h-9 border-slate-200 hover:bg-slate-50">
                    <Upload className="h-4 w-4 mr-2" />
                    Importar
                  </Button>
                </div>
              </div>

              <Card className="border-slate-100 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : filteredForms.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="h-8 w-8 text-slate-300" />
                      </div>
                      <p className="text-muted-foreground font-medium">
                        {filters.favorites
                          ? 'Nenhum template favorito encontrado'
                          : 'Nenhuma ficha encontrada'}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent border-slate-100">
                            <TableHead className="w-[10px]"></TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider">Nome</TableHead>
                            <TableHead className="w-[60px] text-center font-bold text-xs uppercase tracking-wider">Ref</TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider">Tipo</TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider">Campos</TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider">Uso</TableHead>
                            <TableHead className="text-right font-bold text-xs uppercase tracking-wider pr-6">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredForms.map((form) => (
                            <TableRow key={form.id} className="hover:bg-slate-50/50 border-slate-100">
                              <TableCell className="pl-4">
                                {form.is_favorite && (
                                  <span className="text-yellow-500">⭐</span>
                                )}
                              </TableCell>
                              <TableCell className="font-bold text-slate-700">{form.nome}</TableCell>
                              <TableCell className="text-center">
                                {form.referencias && (
                                  <TooltipProvider>
                                    <Tooltip delayDuration={300}>
                                      <TooltipTrigger asChild>
                                        <div className="flex items-center justify-center cursor-help">
                                          <BookOpen className="h-4 w-4 text-primary/70" />
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-xs p-3 rounded-xl shadow-xl">
                                        <p className="font-bold text-xs mb-1 uppercase tracking-widest text-slate-500">Referências:</p>
                                        <p className="text-xs text-muted-foreground">{form.referencias}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="rounded-lg bg-blue-50 text-blue-700 border-blue-100">
                                  {TIPOS_FICHA.find(t => t.value === form.tipo)?.label || form.tipo}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-slate-500 text-sm font-medium">
                                {(form.evaluation_form_fields?.length || 0)} campos
                              </TableCell>
                              <TableCell className="text-slate-500 text-sm font-bold">
                                {form.usage_count ? (
                                  <span>{form.usage_count}x</span>
                                ) : (
                                  <span className="text-xs font-normal opacity-40">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right pr-6">
                                <div className="flex items-center justify-end gap-1">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleUseTemplate(form.id)}
                                          className="h-8 w-8 rounded-lg hover:bg-emerald-50 hover:text-emerald-600"
                                        >
                                          <Play className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent className="rounded-lg">Usar Template</TooltipContent>
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
                                          className="h-8 w-8 rounded-lg text-slate-400 hover:text-primary"
                                        >
                                          <Copy className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent className="rounded-lg">Duplicar</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>

                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleExport(form)}
                                    className="h-8 w-8 rounded-lg text-slate-400"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>

                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setPreviewForm(form)}
                                    className="h-8 w-8 rounded-lg text-slate-400"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>

                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => navigate(`/cadastros/fichas-avaliacao/${form.id}/campos`)}
                                    className="h-8 w-8 rounded-lg text-slate-400 hover:text-primary"
                                  >
                                    <Settings className="h-4 w-4" />
                                  </Button>

                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleOpenDialog(form)}
                                    className="h-8 w-8 rounded-lg text-slate-400 hover:text-primary"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>

                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setDeleteId(form.id)}
                                    className="h-8 w-8 rounded-lg text-slate-400 hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="padrao" className="mt-4">
            <StandardFormsManager />
          </TabsContent>
        </Tabs>

        {/* Create/Edit Modal - Refactored to CustomModal */}
        <CustomModal 
          open={isDialogOpen} 
          onOpenChange={setIsDialogOpen}
          isMobile={isMobile}
          contentClassName="max-w-2xl h-[90vh]"
        >
          <CustomModalHeader onClose={() => setIsDialogOpen(false)}>
            <CustomModalTitle className="flex items-center gap-2">
              {editingForm ? <Pencil className="h-5 w-5 text-primary" /> : <Plus className="h-5 w-5 text-primary" />}
              {editingForm ? 'Editar Ficha' : 'Nova Ficha de Avaliação'}
            </CustomModalTitle>
          </CustomModalHeader>

          <CustomModalBody className="p-0 sm:p-0">
            <div className="p-6 space-y-6">
              <p className="text-sm text-muted-foreground">
                {editingForm
                  ? 'Edite as informações básicas da ficha de avaliação.'
                  : 'Preencha os dados básicos para criar uma nova estrutura de avaliação clínica.'
                }
              </p>

              <form onSubmit={handleSubmit} id="evaluation-form-form" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-1 md:col-span-2 space-y-2">
                    <Label htmlFor="nome" className="font-bold text-xs uppercase text-slate-500">Nome da Ficha *</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                      placeholder="Ex: Anamnese Fisioterapia Esportiva"
                      required
                      className="rounded-xl border-slate-200 h-11 font-semibold"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tipo" className="font-bold text-xs uppercase text-slate-500">Tipo / Categoria *</Label>
                    <Select
                      value={formData.tipo}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, tipo: value }))}
                    >
                      <SelectTrigger className="rounded-xl border-slate-200 h-11">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_FICHA.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="descricao" className="font-bold text-xs uppercase text-slate-500">Descrição Breve</Label>
                    <Input
                      id="descricao"
                      value={formData.descricao || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                      placeholder="Finalidade desta ficha"
                      className="rounded-xl border-slate-200 h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="referencias" className="flex items-center gap-2 font-bold text-xs uppercase text-slate-500">
                    <BookOpen className="h-3.5 w-3.5" />
                    Referências Científicas
                  </Label>
                  <Textarea
                    id="referencias"
                    value={formData.referencias || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, referencias: e.target.value }))}
                    placeholder="Cite as referências bibliográficas, artigos ou diretrizes utilizadas (Opcional)"
                    rows={4}
                    className="rounded-xl border-slate-200 resize-none bg-slate-50/50"
                  />
                  <p className="text-[10px] text-slate-400 italic">
                    Estas referências serão exibidas como consulta rápida durante o atendimento.
                  </p>
                </div>
              </form>
            </div>
          </CustomModalBody>

          <CustomModalFooter isMobile={isMobile} className="bg-slate-50">
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl h-11 px-6 font-bold text-slate-500">
              Cancelar
            </Button>
            <Button
              type="submit"
              form="evaluation-form-form"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="rounded-xl h-11 px-8 gap-2 bg-slate-900 text-white shadow-xl shadow-slate-900/10 font-bold uppercase tracking-wider transition-all hover:scale-105"
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                editingForm ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />
              )}
              {editingForm ? 'Salvar Alterações' : 'Criar e Configurar'}
            </Button>
          </CustomModalFooter>
        </CustomModal>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent className="rounded-3xl p-6">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-bold">Confirmar exclusão?</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-500">
                Tem certeza que deseja excluir esta ficha? Todos os campos e respostas associadas serão perdidos permanentemente. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-6 gap-2">
              <AlertDialogCancel className="rounded-xl border-slate-200">Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
                Excluir Definitivamente
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Preview Modal - Refactored from Sheet to CustomModal */}
        <CustomModal 
          open={!!previewForm} 
          onOpenChange={() => setPreviewForm(null)}
          isMobile={isMobile}
          contentClassName="max-w-3xl h-[95vh]"
        >
          <CustomModalHeader onClose={() => setPreviewForm(null)}>
            <div className="flex flex-col gap-1">
              <Badge className="w-fit rounded-lg bg-emerald-50 text-emerald-700 border-emerald-100 uppercase text-[10px] font-bold">Pré-visualização</Badge>
              <CustomModalTitle className="text-2xl font-bold text-slate-800 leading-tight">
                {previewForm?.nome}
              </CustomModalTitle>
            </div>
          </CustomModalHeader>

          <CustomModalBody className="p-0 sm:p-0">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                {previewForm?.descricao && (
                  <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    {previewForm.descricao}
                  </p>
                )}

                {previewForm?.referencias && (
                  <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                    <div className="flex items-center gap-2 mb-2 text-primary font-bold text-xs uppercase tracking-widest">
                      <BookOpen className="h-4 w-4" />
                      Referências Científicas
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed italic">{previewForm.referencias}</p>
                  </div>
                )}

                <div className="border-t border-slate-100 pt-6">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                    <Eye className="h-3.5 w-3.5" />
                    Simulação do Formulário
                  </h4>
                  {previewForm && (
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
                  )}
                </div>
              </div>
            </ScrollArea>
          </CustomModalBody>

          <CustomModalFooter isMobile={isMobile} className="bg-slate-50 border-t-0">
            <Button variant="ghost" onClick={() => setPreviewForm(null)} className="rounded-xl h-11 px-6 font-bold text-slate-500">
              Fechar Visualização
            </Button>
            <div className="flex-1" />
            <Button 
              onClick={() => {
                if (previewForm) {
                  const id = previewForm.id;
                  setPreviewForm(null);
                  handleUseTemplate(id);
                }
              }}
              className="rounded-xl h-11 px-8 gap-2 bg-emerald-600 text-white shadow-xl shadow-emerald-600/10 font-bold uppercase tracking-wider transition-all hover:scale-105"
            >
              <CheckCircle2 className="h-4 w-4" />
              Usar Este Template
            </Button>
          </CustomModalFooter>
        </CustomModal>
      </div>
    </MainLayout>
  );
}
