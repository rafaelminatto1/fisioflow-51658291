import { useState } from 'react';
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
import { ClipboardList, Plus, Pencil, Trash2, Search, Eye, Settings, BookOpen, Copy, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  useEvaluationForms,
  useCreateEvaluationForm,
  useUpdateEvaluationForm,
  useDeleteEvaluationForm,
  useDuplicateEvaluationForm,
  EvaluationFormFormData
} from '@/hooks/useEvaluationForms';
import { EvaluationForm } from '@/types/clinical-forms';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';
import { StandardFormsManager } from '@/components/clinical/StandardFormsManager';
import { useImportEvaluationForm, EvaluationFormImportData } from '@/hooks/useEvaluationForms';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { DynamicFieldRenderer } from '@/components/evaluation/DynamicFieldRenderer';
import { TemplateField } from '@/components/evaluation/EvaluationTemplateSelector';

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
  const [search, setSearch] = useState('');
  const [selectedTipo, setSelectedTipo] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<EvaluationForm | null>(null);
  const [previewForm, setPreviewForm] = useState<EvaluationForm | null>(null);
  const importMutation = useImportEvaluationForm();

  const [formData, setFormData] = useState<EvaluationFormFormData>({
    nome: '',
    tipo: 'anamnese',
    descricao: '',
    referencias: '',
    ativo: true,
  });

  const { data: forms = [], isLoading } = useEvaluationForms(selectedTipo || undefined);
  const createMutation = useCreateEvaluationForm();
  const updateMutation = useUpdateEvaluationForm();
  const deleteMutation = useDeleteEvaluationForm();
  const duplicateMutation = useDuplicateEvaluationForm();

  const filteredForms = forms.filter(f =>
    f.nome.toLowerCase().includes(search.toLowerCase())
  );

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

  const handleExport = (form: EvaluationForm) => {
    const exportData: EvaluationFormImportData = {
      nome: form.nome,
      descricao: form.descricao,
      tipo: form.tipo,
      referencias: form.referencias,
      fields: (form.evaluation_form_fields || []).map((f: any) => ({
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <ClipboardList className="h-8 w-8 text-primary" />
              Fichas de Avaliação
            </h1>
            <p className="text-muted-foreground mt-1">
              Crie fichas personalizáveis ou use modelos prontos para avaliação de pacientes
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'minhas' | 'padrao')}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="minhas">Minhas Fichas</TabsTrigger>
            <TabsTrigger value="padrao">Fichas Padrão</TabsTrigger>
          </TabsList>

          <TabsContent value="minhas" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Gerencie suas fichas de avaliação personalizadas
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Ficha
              </Button>
              <div className="flex gap-2 ml-2">
                <input
                  type="file"
                  id="import-file"
                  className="hidden"
                  accept=".json"
                  onChange={handleImportFile}
                />
                <Button variant="outline" onClick={() => document.getElementById('import-file')?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar fichas..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={selectedTipo || "all"} onValueChange={(value) => setSelectedTipo(value === "all" ? "" : value)}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Todos os tipos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      {TIPOS_FICHA.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Carregando...</div>
                ) : filteredForms.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma ficha encontrada.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead className="w-[50px] text-center">Ref</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredForms.map((form) => (
                        <TableRow key={form.id}>
                          <TableCell className="font-medium">{form.nome}</TableCell>
                          <TableCell className="text-center">
                            {form.referencias && (
                              <TooltipProvider>
                                <Tooltip delayDuration={300}>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center justify-center cursor-help">
                                      <BookOpen className="h-4 w-4 text-primary/70" />
                                      <span className="sr-only">Ver referências</span>
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
                          <TableCell className="max-w-xs truncate text-muted-foreground text-sm">
                            {form.descricao || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => duplicateMutation.mutate(form.id)}
                                      disabled={duplicateMutation.isPending}
                                      className="hover:bg-primary/10 hover:text-primary"
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Duplicar Template</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleExport(form)}
                                title="Exportar JSON"
                              >
                                <Download className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setPreviewForm(form)}
                                title="Pré-visualizar"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/cadastros/fichas-avaliacao/${form.id}/campos`)}
                                title="Configurar campos"
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
                  fields={(previewForm.evaluation_form_fields || []).map((f: any) => ({
                    ...f,
                    section: f.grupo,
                    min: f.minimo,
                    max: f.maximo,
                    description: f.descricao,
                    opcoes: typeof f.opcoes === 'string' ? JSON.parse(f.opcoes) : f.opcoes,
                  })).sort((a: any, b: any) => a.ordem - b.ordem)}
                  values={{}}
                  onChange={() => { }}
                  readOnly={true}
                />
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </MainLayout>
  );
}
