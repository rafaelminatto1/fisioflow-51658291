import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader } from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Textarea } from '@/components/shared/ui/textarea';
import { Switch } from '@/components/shared/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/shared/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/web/ui/alert-dialog';
import { Plus, Pencil, Trash2, DoorOpen, Search, Users } from 'lucide-react';
import { useSalas, useCreateSala, useUpdateSala, useDeleteSala, Sala, SalaFormData } from '@/hooks/useSalas';
import { Skeleton } from '@/components/shared/ui/skeleton';
import { Badge } from '@/components/shared/ui/badge';

const COLORS = [
  { value: '#3b82f6', label: 'Azul' },
  { value: '#10b981', label: 'Verde' },
  { value: '#8b5cf6', label: 'Roxo' },
  { value: '#f59e0b', label: 'Laranja' },
  { value: '#ef4444', label: 'Vermelho' },
  { value: '#ec4899', label: 'Rosa' },
  { value: '#06b6d4', label: 'Ciano' },
  { value: '#84cc16', label: 'Lima' },
];

const defaultFormData: SalaFormData = {
  nome: '',
  capacidade: 1,
  descricao: '',
  cor: '#3b82f6',
  equipamentos: [],
  ativo: true,
};

export default function SalasPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Sala | null>(null);
  const [formData, setFormData] = useState<SalaFormData>(defaultFormData);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [equipamentoInput, setEquipamentoInput] = useState('');

  const { data: salas, isLoading } = useSalas();
  const createMutation = useCreateSala();
  const updateMutation = useUpdateSala();
  const deleteMutation = useDeleteSala();

  const filteredData = salas?.filter(item => {
    const matchesSearch = item.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = showInactive ? true : item.ativo;
    return matchesSearch && matchesStatus;
  });

  const handleOpenDialog = (item?: Sala) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        nome: item.nome,
        capacidade: item.capacidade,
        descricao: item.descricao || '',
        cor: item.cor,
        equipamentos: item.equipamentos || [],
        ativo: item.ativo,
      });
    } else {
      setEditingItem(null);
      setFormData(defaultFormData);
    }
    setEquipamentoInput('');
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (editingItem) {
      await updateMutation.mutateAsync({ id: editingItem.id, ...formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
    setIsDialogOpen(false);
    setFormData(defaultFormData);
    setEditingItem(null);
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  const addEquipamento = () => {
    if (equipamentoInput.trim()) {
      setFormData({
        ...formData,
        equipamentos: [...(formData.equipamentos || []), equipamentoInput.trim()],
      });
      setEquipamentoInput('');
    }
  };

  const removeEquipamento = (index: number) => {
    setFormData({
      ...formData,
      equipamentos: formData.equipamentos?.filter((_, i) => i !== index) || [],
    });
  };

  return (
    <MainLayout>
      <div className="space-y-4 p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <DoorOpen className="h-6 w-6 text-primary" />
              Salas de Atendimento
            </h1>
            <p className="text-sm text-muted-foreground">
              Configure as salas e espaços da clínica
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Nova Sala
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar sala..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={showInactive}
                  onCheckedChange={setShowInactive}
                  id="show-inactive"
                />
                <Label htmlFor="show-inactive" className="text-sm">
                  Mostrar inativas
                </Label>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : filteredData?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma sala encontrada
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredData?.map((item) => (
                  <Card
                    key={item.id}
                    className="relative overflow-hidden"
                    style={{ borderLeftColor: item.cor, borderLeftWidth: '4px' }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{item.nome}</h3>
                            <Badge variant={item.ativo ? 'default' : 'secondary'} className="text-xs">
                              {item.ativo ? 'Ativa' : 'Inativa'}
                            </Badge>
                          </div>
                          {item.descricao && (
                            <p className="text-sm text-muted-foreground mb-2">{item.descricao}</p>
                          )}
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>Capacidade: {item.capacidade}</span>
                          </div>
                          {item.equipamentos && item.equipamentos.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {item.equipamentos.slice(0, 3).map((eq, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {eq}
                                </Badge>
                              ))}
                              {item.equipamentos.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{item.equipamentos.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Deseja remover a sala "{item.nome}"?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(item.id)}>
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Editar Sala' : 'Nova Sala'}
            </DialogTitle>
            <DialogDescription>
              Configure os detalhes da sala de atendimento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Sala 01"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacidade">Capacidade</Label>
                <Input
                  id="capacidade"
                  type="number"
                  min="1"
                  value={formData.capacidade}
                  onChange={(e) => setFormData({ ...formData, capacidade: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        formData.cor === color.value
                          ? 'border-foreground scale-110'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.value }}
                      onClick={() => setFormData({ ...formData, cor: color.value })}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao || ''}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição da sala"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Equipamentos</Label>
              <div className="flex gap-2">
                <Input
                  value={equipamentoInput}
                  onChange={(e) => setEquipamentoInput(e.target.value)}
                  placeholder="Ex: Maca, Bola Suíça"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addEquipamento())}
                />
                <Button type="button" variant="secondary" onClick={addEquipamento}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formData.equipamentos && formData.equipamentos.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.equipamentos.map((eq, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {eq}
                      <button
                        type="button"
                        onClick={() => removeEquipamento(i)}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                id="ativo"
              />
              <Label htmlFor="ativo">Ativa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.nome || createMutation.isPending || updateMutation.isPending}
            >
              {editingItem ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
