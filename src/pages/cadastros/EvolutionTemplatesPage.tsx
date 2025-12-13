import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Plus, Pencil, Trash2, Search, Copy } from 'lucide-react';
import { 
  useEvolutionTemplates, 
  useCreateEvolutionTemplate, 
  useUpdateEvolutionTemplate, 
  useDeleteEvolutionTemplate,
  EvolutionTemplate,
  EvolutionTemplateFormData
} from '@/hooks/useEvolutionTemplates';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const TIPOS_EVOLUCAO = [
  { value: 'fisioterapia', label: 'Fisioterapia' },
  { value: 'pilates', label: 'Pilates' },
  { value: 'rpg', label: 'RPG' },
  { value: 'acupuntura', label: 'Acupuntura' },
  { value: 'massoterapia', label: 'Massoterapia' },
];

const VARIAVEIS_DISPONIVEIS = [
  { var: '#paciente-nome', desc: 'Nome do paciente' },
  { var: '#data-sessao', desc: 'Data da sessão' },
  { var: '#profissional-nome', desc: 'Nome do profissional' },
  { var: '#queixa-principal', desc: 'Queixa principal' },
  { var: '#nivel-dor', desc: 'Nível de dor (0-10)' },
];

export default function EvolutionTemplatesPage() {
  const [search, setSearch] = useState('');
  const [selectedTipo, setSelectedTipo] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<EvolutionTemplate | null>(null);

  const [formData, setFormData] = useState<EvolutionTemplateFormData>({
    nome: '',
    tipo: 'fisioterapia',
    descricao: '',
    conteudo: '',
    campos_padrao: [],
    ativo: true,
  });

  const { data: templates = [], isLoading } = useEvolutionTemplates(selectedTipo || undefined);
  const createMutation = useCreateEvolutionTemplate();
  const updateMutation = useUpdateEvolutionTemplate();
  const deleteMutation = useDeleteEvolutionTemplate();

  const filteredTemplates = templates.filter(t =>
    t.nome.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenDialog = (template?: EvolutionTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        nome: template.nome,
        tipo: template.tipo,
        descricao: template.descricao || '',
        conteudo: template.conteudo,
        campos_padrao: template.campos_padrao || [],
        ativo: template.ativo,
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        nome: '',
        tipo: 'fisioterapia',
        descricao: '',
        conteudo: '',
        campos_padrao: [],
        ativo: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingTemplate) {
      await updateMutation.mutateAsync({ id: editingTemplate.id, ...formData });
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

  const insertVariable = (variable: string) => {
    setFormData(prev => ({
      ...prev,
      conteudo: prev.conteudo + variable
    }));
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FileText className="h-8 w-8 text-primary" />
              Templates de Evolução
            </h1>
            <p className="text-muted-foreground mt-1">
              Crie modelos de evolução para agilizar a documentação clínica
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Template
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar templates..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedTipo || "all"} onValueChange={(value) => setSelectedTipo(value === "all" ? "" : value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {TIPOS_EVOLUCAO.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum template encontrado.
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
                  {filteredTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.nome}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {TIPOS_EVOLUCAO.find(t => t.value === template.tipo)?.label || template.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {template.descricao || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(template)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(template.id)}
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
          <DialogContent className="max-w-3xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Editar Template' : 'Novo Template de Evolução'}
              </DialogTitle>
              <DialogDescription>
                Crie um modelo para agilizar o registro de evoluções
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} id="evolution-template-form">
              <ScrollArea className="max-h-[60vh] pr-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome do Template *</Label>
                      <Input
                        id="nome"
                        value={formData.nome}
                        onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                        placeholder="Ex: Evolução Padrão Fisioterapia"
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
                          {TIPOS_EVOLUCAO.map(t => (
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
                      value={formData.descricao}
                      onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                      placeholder="Breve descrição do template"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="conteudo">Conteúdo do Template *</Label>
                      <div className="flex items-center gap-1 flex-wrap">
                        {VARIAVEIS_DISPONIVEIS.map(v => (
                          <Button
                            key={v.var}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => insertVariable(v.var)}
                            title={v.desc}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            {v.var}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <Textarea
                      id="conteudo"
                      value={formData.conteudo}
                      onChange={(e) => setFormData(prev => ({ ...prev, conteudo: e.target.value }))}
                      placeholder="Digite o conteúdo do template. Use variáveis como #paciente-nome para personalização automática."
                      rows={10}
                      required
                    />
                  </div>
                </div>
              </ScrollArea>
            </form>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                form="evolution-template-form"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingTemplate ? 'Salvar' : 'Criar Template'}
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
                Tem certeza que deseja excluir este template? Esta ação não pode ser desfeita.
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
