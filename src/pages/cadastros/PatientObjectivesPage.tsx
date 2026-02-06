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
import { Target, Plus, Pencil, Trash2, Search } from 'lucide-react';
import {

  usePatientObjectives, 
  useCreatePatientObjective, 
  useUpdatePatientObjective, 
  useDeletePatientObjective,
  PatientObjective,
  PatientObjectiveFormData
} from '@/hooks/usePatientObjectives';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const CATEGORIAS = [
  { value: 'flexibilidade', label: 'Flexibilidade', color: 'bg-blue-500' },
  { value: 'força', label: 'Força', color: 'bg-red-500' },
  { value: 'postura', label: 'Postura', color: 'bg-purple-500' },
  { value: 'dor', label: 'Dor', color: 'bg-orange-500' },
  { value: 'composição', label: 'Composição Corporal', color: 'bg-green-500' },
  { value: 'funcional', label: 'Funcional', color: 'bg-cyan-500' },
  { value: 'cardio', label: 'Cardiovascular', color: 'bg-pink-500' },
  { value: 'reabilitação', label: 'Reabilitação', color: 'bg-yellow-500' },
  { value: 'prevenção', label: 'Prevenção', color: 'bg-teal-500' },
  { value: 'bem-estar', label: 'Bem-estar', color: 'bg-indigo-500' },
];

export default function PatientObjectivesPage() {
  const [search, setSearch] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingObjective, setEditingObjective] = useState<PatientObjective | null>(null);

  const [formData, setFormData] = useState<PatientObjectiveFormData>({
    nome: '',
    descricao: '',
    categoria: 'funcional',
    ativo: true,
  });

  const { data: objectives = [], isLoading } = usePatientObjectives();
  const createMutation = useCreatePatientObjective();
  const updateMutation = useUpdatePatientObjective();
  const deleteMutation = useDeletePatientObjective();

  const filteredObjectives = objectives.filter(o => {
    const matchesSearch = o.nome.toLowerCase().includes(search.toLowerCase());
    const matchesCategoria = !selectedCategoria || o.categoria === selectedCategoria;
    return matchesSearch && matchesCategoria;
  });

  const handleOpenDialog = (objective?: PatientObjective) => {
    if (objective) {
      setEditingObjective(objective);
      setFormData({
        nome: objective.nome,
        descricao: objective.descricao || '',
        categoria: objective.categoria || 'funcional',
        ativo: objective.ativo,
      });
    } else {
      setEditingObjective(null);
      setFormData({
        nome: '',
        descricao: '',
        categoria: 'funcional',
        ativo: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingObjective) {
      await updateMutation.mutateAsync({ id: editingObjective.id, ...formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
    
    setIsDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const getCategoriaInfo = (categoria: string | null) => {
    return CATEGORIAS.find(c => c.value === categoria) || { label: categoria, color: 'bg-gray-500' };
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Target className="h-8 w-8 text-primary" />
              Objetivos do Paciente
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie objetivos que podem ser atribuídos aos pacientes
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Objetivo
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar objetivos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedCategoria || "all"} onValueChange={(value) => setSelectedCategoria(value === "all" ? "" : value)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {CATEGORIAS.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : filteredObjectives.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum objetivo encontrado.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredObjectives.map((objective) => {
                    const catInfo = getCategoriaInfo(objective.categoria);
                    return (
                      <TableRow key={objective.id}>
                        <TableCell className="font-medium">{objective.nome}</TableCell>
                        <TableCell>
                          <Badge className={`${catInfo.color} text-white`}>
                            {catInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {objective.descricao || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(objective)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteId(objective.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
                {editingObjective ? 'Editar Objetivo' : 'Novo Objetivo'}
              </DialogTitle>
              <DialogDescription>
                Crie objetivos que podem ser atribuídos aos pacientes
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} id="objective-form" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Objetivo *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: Melhora da Flexibilidade"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria</Label>
                <Select
                  value={formData.categoria || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, categoria: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
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
                  placeholder="Descrição detalhada do objetivo"
                />
              </div>
            </form>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                form="objective-form"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingObjective ? 'Salvar' : 'Criar Objetivo'}
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
                Tem certeza que deseja excluir este objetivo? As atribuições existentes serão mantidas.
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
