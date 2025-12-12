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
import { ClipboardList, Plus, Pencil, Trash2, Search, Eye, Settings } from 'lucide-react';
import { 
  useEvaluationForms, 
  useCreateEvaluationForm, 
  useUpdateEvaluationForm, 
  useDeleteEvaluationForm,
  EvaluationForm,
  EvaluationFormFormData
} from '@/hooks/useEvaluationForms';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';

const TIPOS_FICHA = [
  { value: 'anamnese', label: 'Anamnese' },
  { value: 'avaliacao_postural', label: 'Avaliação Postural' },
  { value: 'avaliacao_funcional', label: 'Avaliação Funcional' },
  { value: 'custom', label: 'Personalizada' },
];

export default function EvaluationFormsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedTipo, setSelectedTipo] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<EvaluationForm | null>(null);

  const [formData, setFormData] = useState<EvaluationFormFormData>({
    nome: '',
    tipo: 'anamnese',
    descricao: '',
    ativo: true,
  });

  const { data: forms = [], isLoading } = useEvaluationForms(selectedTipo || undefined);
  const createMutation = useCreateEvaluationForm();
  const updateMutation = useUpdateEvaluationForm();
  const deleteMutation = useDeleteEvaluationForm();

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
        ativo: form.ativo,
      });
    } else {
      setEditingForm(null);
      setFormData({
        nome: '',
        tipo: 'anamnese',
        descricao: '',
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
              Crie fichas personalizáveis para avaliação de pacientes
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Ficha
          </Button>
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
              <Select value={selectedTipo} onValueChange={setSelectedTipo}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os tipos</SelectItem>
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
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredForms.map((form) => (
                    <TableRow key={form.id}>
                      <TableCell className="font-medium">{form.nome}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {TIPOS_FICHA.find(t => t.value === form.tipo)?.label || form.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {form.descricao || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
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
                            onClick={() => navigate(`/cadastros/fichas-avaliacao/${form.id}/preview`)}
                            title="Pré-visualizar"
                          >
                            <Eye className="h-4 w-4" />
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

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingForm ? 'Editar Ficha' : 'Nova Ficha de Avaliação'}
              </DialogTitle>
              <DialogDescription>
                {editingForm 
                  ? 'Edite as informações básicas da ficha'
                  : 'Após criar a ficha, você poderá adicionar os campos'
                }
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} id="evaluation-form-form" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Ficha *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: Anamnese Fisioterapia"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, tipo: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_FICHA.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  value={formData.descricao || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Breve descrição da ficha"
                />
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
                {editingForm ? 'Salvar' : 'Criar e Configurar Campos'}
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
                Tem certeza que deseja excluir esta ficha? Todos os campos e respostas serão perdidos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
