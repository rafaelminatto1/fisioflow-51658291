import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building2,
  Users,
  Settings,
  Save,
  UserPlus,
  Trash2,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useOrganizationMembers } from '@/hooks/useOrganizationMembers';
import type { OrganizationMember } from '@/lib/api/workers-client';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  fisioterapeuta: 'Fisioterapeuta',
  estagiario: 'Estagiário',
  paciente: 'Paciente',
};

const ROLE_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  admin: 'default',
  fisioterapeuta: 'secondary',
  estagiario: 'outline',
  paciente: 'outline',
};

export default function OrganizationSettings() {
  const { currentOrganization, isCurrentOrgLoading, updateOrganization, isUpdating } = useOrganizations();
  const { members, isLoading: isMembersLoading, addMember, removeMember, isAdding, isRemoving } =
    useOrganizationMembers(currentOrganization?.id);

  // Form state — clinic data
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [formDirty, setFormDirty] = useState(false);

  // Sync form with loaded org data
  if (currentOrganization && !formDirty) {
    if (orgName !== currentOrganization.name) setOrgName(currentOrganization.name);
    if (orgSlug !== (currentOrganization.slug ?? '')) setOrgSlug(currentOrganization.slug ?? '');
  }

  // Invite member modal
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteUserId, setInviteUserId] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'fisioterapeuta' | 'estagiario' | 'paciente'>('fisioterapeuta');

  // Remove member confirm
  const [removeTarget, setRemoveTarget] = useState<OrganizationMember | null>(null);

  const handleSaveClinic = () => {
    if (!currentOrganization) return;
    updateOrganization({ id: currentOrganization.id, name: orgName, slug: orgSlug });
    setFormDirty(false);
  };

  const handleInvite = () => {
    if (!inviteUserId.trim() && !inviteEmail.trim()) return;
    addMember({
      organization_id: currentOrganization?.id,
      user_id: inviteUserId.trim() || inviteEmail.trim(),
      role: inviteRole,
    });
    setInviteOpen(false);
    setInviteEmail('');
    setInviteUserId('');
    setInviteRole('fisioterapeuta');
  };

  const handleRemoveConfirm = () => {
    if (!removeTarget) return;
    removeMember(removeTarget.id);
    setRemoveTarget(null);
  };

  if (isCurrentOrgLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Configurações da Organização</h1>
            <p className="text-sm text-muted-foreground">
              {currentOrganization?.name ?? 'Gerenciar configurações da clínica'}
            </p>
          </div>
        </div>

        <Tabs defaultValue="clinic">
          <TabsList>
            <TabsTrigger value="clinic" className="gap-2">
              <Building2 className="h-4 w-4" />
              Dados da Clínica
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-2">
              <Users className="h-4 w-4" />
              Equipe
              {members && members.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{members.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-2">
              <Settings className="h-4 w-4" />
              Integrações
            </TabsTrigger>
          </TabsList>

          {/* ─── Tab 1: Dados da Clínica ─── */}
          <TabsContent value="clinic" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações da Clínica</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="org-name">Nome da Clínica</Label>
                  <Input
                    id="org-name"
                    value={orgName}
                    onChange={e => { setOrgName(e.target.value); setFormDirty(true); }}
                    placeholder="Nome da sua clínica"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-slug">Slug (identificador único)</Label>
                  <Input
                    id="org-slug"
                    value={orgSlug}
                    onChange={e => { setOrgSlug(e.target.value.toLowerCase().replace(/\s+/g, '-')); setFormDirty(true); }}
                    placeholder="minha-clinica"
                  />
                  <p className="text-xs text-muted-foreground">
                    Usado em URLs e integrações. Apenas letras minúsculas, números e hifens.
                  </p>
                </div>
                <Button
                  onClick={handleSaveClinic}
                  disabled={isUpdating || !formDirty || !orgName.trim()}
                  className="gap-2"
                >
                  {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar Alterações
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Tab 2: Equipe ─── */}
          <TabsContent value="team" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Membros da Equipe</CardTitle>
                <Button size="sm" onClick={() => setInviteOpen(true)} className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Convidar Membro
                </Button>
              </CardHeader>
              <CardContent>
                {isMembersLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : !members || members.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum membro encontrado. Convide alguém para a equipe.
                  </p>
                ) : (
                  <div className="divide-y">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary text-sm">
                            {(member.user?.name ?? member.user_id ?? '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{member.user?.name ?? member.user_id}</p>
                            <p className="text-xs text-muted-foreground">{member.user?.email ?? ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={ROLE_VARIANTS[member.role] ?? 'outline'}>
                            {ROLE_LABELS[member.role] ?? member.role}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setRemoveTarget(member)}
                            disabled={isRemoving}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Tab 3: Integrações ─── */}
          <TabsContent value="integrations" className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <Settings className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">Integrações Externas</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Configure webhooks, Google Calendar, WhatsApp e outras integrações.
                      </p>
                      <Button variant="link" size="sm" className="px-0 h-auto mt-2 gap-1 text-xs" asChild>
                        <a href="/integrations">
                          Ir para Integrações <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                      <Settings className="h-5 w-5 text-red-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">Segurança e Acesso</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        2FA, logs de acesso, permissões avançadas e políticas de senha.
                      </p>
                      <Button variant="link" size="sm" className="px-0 h-auto mt-2 gap-1 text-xs" asChild>
                        <a href="/settings/security">
                          Ir para Segurança <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Invite Member Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar Membro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="invite-user-id">ID do Usuário ou E-mail</Label>
              <Input
                id="invite-user-id"
                value={inviteUserId || inviteEmail}
                onChange={e => {
                  const v = e.target.value;
                  if (v.includes('@')) { setInviteEmail(v); setInviteUserId(''); }
                  else { setInviteUserId(v); setInviteEmail(''); }
                }}
                placeholder="usuario@email.com ou UUID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Função</Label>
              <Select value={inviteRole} onValueChange={v => setInviteRole(v as typeof inviteRole)}>
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="fisioterapeuta">Fisioterapeuta</SelectItem>
                  <SelectItem value="estagiario">Estagiário</SelectItem>
                  <SelectItem value="paciente">Paciente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
            <Button onClick={handleInvite} disabled={isAdding || (!inviteUserId.trim() && !inviteEmail.trim())} className="gap-2">
              {isAdding && <Loader2 className="h-4 w-4 animate-spin" />}
              Convidar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirm */}
      <AlertDialog open={!!removeTarget} onOpenChange={open => !open && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Membro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover{' '}
              <strong>{removeTarget?.user?.name ?? removeTarget?.user_id}</strong> da equipe?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
