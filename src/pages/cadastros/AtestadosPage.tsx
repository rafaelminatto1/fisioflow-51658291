import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, FileText, Copy, Trash2, Edit, Info } from 'lucide-react';
import { useAtestadoTemplates, useCreateAtestadoTemplate, useUpdateAtestadoTemplate, useDeleteAtestadoTemplate, AtestadoTemplate } from '@/hooks/useDocumentTemplates';
import { useToast } from '@/hooks/use-toast';

const VARIAVEIS_DISPONIVEIS = [
  { key: '#cliente-nome', description: 'Nome completo do paciente' },
  { key: '#cliente-cpf', description: 'CPF do paciente' },
  { key: '#data-hoje', description: 'Data atual' },
  { key: '#hora-atual', description: 'Hora atual' },
  { key: '#clinica-cidade', description: 'Cidade da clínica' },
  { key: '#profissional-nome', description: 'Nome do profissional' },
  { key: '#profissional-registro', description: 'Registro do profissional' },
];

export default function AtestadosPage() {
  const { data: templates = [], isLoading } = useAtestadoTemplates();
  const createTemplate = useCreateAtestadoTemplate();
  const updateTemplate = useUpdateAtestadoTemplate();
  const deleteTemplate = useDeleteAtestadoTemplate();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AtestadoTemplate | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    conteudo: '',
    ativo: true,
  });

  const handleOpenModal = (template?: AtestadoTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        nome: template.nome,
        descricao: template.descricao || '',
        conteudo: template.conteudo,
        ativo: template.ativo,
      });
    } else {
      setEditingTemplate(null);
      setFormData({ nome: '', descricao: '', conteudo: '', ativo: true });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTemplate(null);
    setFormData({ nome: '', descricao: '', conteudo: '', ativo: true });
  };

  const handleSave = async () => {
    if (!formData.nome.trim() || !formData.conteudo.trim()) {
      toast({ title: 'Preencha nome e conteúdo.', variant: 'destructive' });
      return;
    }

    try {
      if (editingTemplate) {
        await updateTemplate.mutateAsync({ id: editingTemplate.id, ...formData });
        toast({ title: 'Template atualizado com sucesso.' });
      } else {
        await createTemplate.mutateAsync(formData);
        toast({ title: 'Template criado com sucesso.' });
      }
      handleCloseModal();
    } catch {
      toast({ title: 'Erro ao salvar template.', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Confirma exclusão do template?')) return;
    try {
      await deleteTemplate.mutateAsync(id);
      toast({ title: 'Template excluído com sucesso.' });
    } catch {
      toast({ title: 'Erro ao excluir template.', variant: 'destructive' });
    }
  };

  const handleInsertVariable = (variable: string) => {
    setFormData((prev) => ({
      ...prev,
      conteudo: prev.conteudo + variable,
    }));
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Modelos de Atestados
            </h1>
            <p className="text-muted-foreground">Gerencie templates de atestados com variáveis dinâmicas</p>
          </div>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Template
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : templates.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum template cadastrado.</p>
              <Button className="mt-4" onClick={() => handleOpenModal()}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeiro Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id} className={!template.ativo ? 'opacity-60' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{template.nome}</CardTitle>
                      {template.descricao && (
                        <CardDescription className="mt-1">{template.descricao}</CardDescription>
                      )}
                    </div>
                    <Badge variant={template.ativo ? 'default' : 'secondary'}>
                      {template.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{template.conteudo}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenModal(template)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(template.conteudo);
                        toast({ title: 'Conteúdo copiado!' });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(template.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Modal de criação/edição */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? 'Editar Template' : 'Novo Template'}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[65vh] pr-4">
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome do Template *</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData((p) => ({ ...p, nome: e.target.value }))}
                      placeholder="Ex: Atestado de Comparecimento"
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-7">
                    <Switch
                      id="ativo"
                      checked={formData.ativo}
                      onCheckedChange={(checked) => setFormData((p) => ({ ...p, ativo: checked }))}
                    />
                    <Label htmlFor="ativo">Ativo</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Input
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData((p) => ({ ...p, descricao: e.target.value }))}
                    placeholder="Breve descrição do template"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="conteudo">Conteúdo *</Label>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Info className="h-4 w-4 mr-1" />
                          Variáveis Disponíveis
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Variáveis Dinâmicas</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-2">
                          {VARIAVEIS_DISPONIVEIS.map((v) => (
                            <div
                              key={v.key}
                              className="flex items-center justify-between p-2 rounded-md bg-secondary/50 hover:bg-secondary cursor-pointer"
                              onClick={() => handleInsertVariable(v.key)}
                            >
                              <code className="text-sm font-mono text-primary">{v.key}</code>
                              <span className="text-xs text-muted-foreground">{v.description}</span>
                            </div>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <Textarea
                    id="conteudo"
                    value={formData.conteudo}
                    onChange={(e) => setFormData((p) => ({ ...p, conteudo: e.target.value }))}
                    placeholder="Digite o conteúdo do atestado. Use variáveis como #cliente-nome para personalização automática."
                    className="min-h-[200px] font-mono text-sm"
                  />
                </div>
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={handleCloseModal}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={createTemplate.isPending || updateTemplate.isPending}>
                {editingTemplate ? 'Salvar Alterações' : 'Criar Template'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
