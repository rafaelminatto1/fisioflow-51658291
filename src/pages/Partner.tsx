import React, { useState } from 'react';
import { useEmpresasParceiras } from '@/hooks/useEmpresasParceiras';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Textarea } from '@/components/shared/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/shared/ui/dialog';
import { Badge } from '@/components/shared/ui/badge';
import { Users, Plus, Mail, Phone, MapPin, Building2, Edit, Trash2, Star } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { EmptyState } from '@/components/ui/empty-state';
import { supabase } from '@/integrations/supabase/client';

interface Partner {
  id: string;
  name: string;
  type: string;
  contact: string;
  email: string;
  phone: string;
  address: string;
  description: string;
  rating: number;
  isActive: boolean;
}

const Partner = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);

  const { data: empresas = [], refetch } = useEmpresasParceiras();
  
  const partners = empresas.map(e => ({
    id: e.id,
    name: e.nome,
    type: 'Empresa Parceira',
    contact: e.contato || '',
    email: e.email || '',
    phone: e.telefone || '',
    address: '',
    description: e.observacoes || '',
    rating: 0,
    isActive: e.ativo
  }));

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    contact: '',
    email: '',
    phone: '',
    address: '',
    description: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.contact) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha nome e contato.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const empresaData = {
        nome: formData.name,
        contato: formData.contact,
        email: formData.email || null,
        telefone: formData.phone || null,
        observacoes: formData.description || null,
        ativo: true
      };

      if (editingPartner) {
        const { error } = await supabase
          .from('empresas_parceiras')
          .update(empresaData)
          .eq('id', editingPartner.id);
        
        if (error) throw error;
        toast({ title: 'Parceiro atualizado com sucesso' });
      } else {
        const { error } = await supabase
          .from('empresas_parceiras')
          .insert(empresaData);
        
        if (error) throw error;
        toast({ title: 'Parceiro adicionado com sucesso' });
      }

      refetch();
      resetForm();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro';
      toast({
        title: 'Erro ao salvar',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  const handleEdit = (partner: Partner) => {
    setEditingPartner(partner);
    setFormData({
      name: partner.name,
      type: partner.type,
      contact: partner.contact,
      email: partner.email,
      phone: partner.phone,
      address: partner.address,
      description: partner.description
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('empresas_parceiras')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast({ title: 'Parceiro removido' });
      refetch();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro';
      toast({
        title: 'Erro ao deletar',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      contact: '',
      email: '',
      phone: '',
      address: '',
      description: ''
    });
    setEditingPartner(null);
    setIsAddDialogOpen(false);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <section className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary grid place-items-center shadow-medical">
              <Users className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Parceiros</h1>
              <p className="text-muted-foreground">
                Rede de parceiros e colaboradores
              </p>
            </div>
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Novo Parceiro
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingPartner ? 'Editar' : 'Novo'} Parceiro</DialogTitle>
                <DialogDescription>
                  Cadastre informações do parceiro ou colaborador
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Nome da empresa/profissional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo *</Label>
                    <Input
                      id="type"
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                      placeholder="Ex: Clínica, Academia, Médico"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact">Pessoa de Contato *</Label>
                  <Input
                    id="contact"
                    name="contact"
                    value={formData.contact}
                    onChange={handleInputChange}
                    placeholder="Nome do responsável"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Endereço completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Informações sobre o parceiro"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit}>
                  {editingPartner ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </section>

        {partners.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum parceiro cadastrado"
            description="Comece adicionando seu primeiro parceiro ou colaborador"
            action={{
              label: 'Adicionar Parceiro',
              onClick: () => setIsAddDialogOpen(true)
            }}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {partners.map((partner) => (
              <Card key={partner.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{partner.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Building2 className="w-3 h-3" />
                        {partner.type}
                      </CardDescription>
                    </div>
                    <Badge variant={partner.isActive ? 'default' : 'secondary'}>
                      {partner.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      {partner.contact}
                    </div>
                    {partner.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        {partner.email}
                      </div>
                    )}
                    {partner.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        {partner.phone}
                      </div>
                    )}
                    {partner.address && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span className="line-clamp-1">{partner.address}</span>
                      </div>
                    )}
                  </div>

                  {partner.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 pt-2 border-t">
                      {partner.description}
                    </p>
                  )}

                  {partner.rating > 0 && (
                    <div className="flex items-center gap-1 pt-2">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{partner.rating.toFixed(1)}</span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEdit(partner)}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(partner.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Partner;