import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useOrganizationMembers } from '@/hooks/useOrganizationMembers';
import { Building2, Users, Settings, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export const OrganizationManager = () => {
  const { currentOrganization, isLoading } = useOrganizations();
  const { members, isLoading: membersLoading } = useOrganizationMembers(currentOrganization?.id);
  const [newOrgOpen, setNewOrgOpen] = useState(false);

  if (isLoading) {
    return <div>Carregando organização...</div>;
  }

  if (!currentOrganization) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sem Organização</CardTitle>
          <CardDescription>
            Você não está vinculado a nenhuma organização ainda.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={newOrgOpen} onOpenChange={setNewOrgOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Criar Organização
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Organização</DialogTitle>
              </DialogHeader>
              <CreateOrganizationForm onClose={() => setNewOrgOpen(false)} />
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Informações da Organização */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-primary" />
              <div>
                <CardTitle>{currentOrganization.name}</CardTitle>
                <CardDescription>@{currentOrganization.slug}</CardDescription>
              </div>
            </div>
            <Badge variant={currentOrganization.active ? 'default' : 'secondary'}>
              {currentOrganization.active ? 'Ativa' : 'Inativa'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div>
              <Label>Configurações</Label>
              <pre className="mt-2 rounded-lg bg-muted p-4 text-sm">
                {JSON.stringify(currentOrganization.settings, null, 2)}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Membros da Organização */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <CardTitle>Membros</CardTitle>
            </div>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Membro
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {membersLoading ? (
            <div>Carregando membros...</div>
          ) : (
            <div className="space-y-4">
              {members?.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex-1">
                    <p className="font-medium">Membro ID: {member.user_id.slice(0, 8)}</p>
                    <p className="text-sm text-muted-foreground">
                      Entrou em: {new Date(member.joined_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline">{member.role}</Badge>
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {members?.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum membro encontrado
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const CreateOrganizationForm = ({ onClose }: { onClose: () => void }) => {
  const { createOrganization, isCreating } = useOrganizations();
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createOrganization(formData, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Nome da Organização</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Activity Fisioterapia"
          required
        />
      </div>
      <div>
        <Label htmlFor="slug">Identificador (slug)</Label>
        <Input
          id="slug"
          value={formData.slug}
          onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
          placeholder="activity-fisio"
          required
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isCreating}>
          {isCreating ? 'Criando...' : 'Criar Organização'}
        </Button>
      </div>
    </form>
  );
};
