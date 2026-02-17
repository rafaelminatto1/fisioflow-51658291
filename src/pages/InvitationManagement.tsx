import { FormEvent, useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { EmptyState } from '@/components/ui/empty-state';
import { useInvitations, AppRole, Invitation } from '@/hooks/useInvitations';
import { Search, XCircle, Copy, CheckCircle, Plus, Pencil, Loader2, Mail, Trash2 } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { emailSchema } from '@/lib/validations/auth';

interface CreateInvitationFormState {
  email: string;
  role: AppRole;
}

interface EditInvitationFormState {
  email: string;
  role: AppRole;
  expiresAt: string;
}

const ROLES: { value: AppRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'fisioterapeuta', label: 'Fisioterapeuta' },
  { value: 'estagiario', label: 'Estagiário' },
  { value: 'paciente', label: 'Paciente' },
];

export default function InvitationManagement() {
  const {
    invitations,
    isLoading,
    createInvitation,
    updateInvitation,
    deleteInvitation,
    isCreating,
    isUpdating,
    isDeleting,
  } = useInvitations();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteInvitationId, setDeleteInvitationId] = useState<string | null>(null);
  const [editingInvitation, setEditingInvitation] = useState<Invitation | null>(null);
  const [createForm, setCreateForm] = useState<CreateInvitationFormState>({
    email: '',
    role: 'fisioterapeuta',
  });
  const [editForm, setEditForm] = useState<EditInvitationFormState>({
    email: '',
    role: 'fisioterapeuta',
    expiresAt: '',
  });

  const getInvitationStatus = (invitation: { used_at?: string | Date; expires_at: string | Date }) => {
    if (invitation.used_at) return 'used';
    if (isPast(new Date(invitation.expires_at))) return 'expired';
    return 'pending';
  };

  const toLocalDateTimeValue = (isoDate: string) => {
    const parsed = new Date(isoDate);
    if (Number.isNaN(parsed.getTime())) return '';
    return format(parsed, "yyyy-MM-dd'T'HH:mm");
  };

  const parseEmail = (email: string): string => {
    const result = emailSchema.safeParse(email.trim());
    if (!result.success) {
      throw new Error(result.error.errors[0]?.message || 'Email inválido');
    }
    return result.data.toLowerCase();
  };

  const parseExpiresAt = (expiresAt: string): string => {
    const parsed = new Date(expiresAt);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error('Data de expiração inválida');
    }
    return parsed.toISOString();
  };

  const clearCreateForm = () => {
    setCreateForm({
      email: '',
      role: 'fisioterapeuta',
    });
  };

  const openEditDialog = (invitation: Invitation) => {
    setEditingInvitation(invitation);
    setEditForm({
      email: invitation.email,
      role: invitation.role,
      expiresAt: toLocalDateTimeValue(invitation.expires_at),
    });
    setEditDialogOpen(true);
  };

  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setEditingInvitation(null);
    setEditForm({
      email: '',
      role: 'fisioterapeuta',
      expiresAt: '',
    });
  };

  const handleCreateInvitation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    let normalizedEmail = '';
    try {
      normalizedEmail = parseEmail(createForm.email);
    } catch (error) {
      if (error instanceof Error) {
        toast({
          title: 'Dados inválidos',
          description: error.message,
          variant: 'destructive',
        });
      }
      return;
    }

    try {
      await createInvitation({
        email: normalizedEmail,
        role: createForm.role,
      });

      setCreateDialogOpen(false);
      clearCreateForm();
    } catch {
      // Error toast is handled inside useInvitations.
    }
  };

  const handleUpdateInvitation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingInvitation) return;

    let normalizedEmail = '';
    let expiresAtIso = '';
    try {
      normalizedEmail = parseEmail(editForm.email);
      expiresAtIso = parseExpiresAt(editForm.expiresAt);
    } catch (error) {
      if (error instanceof Error) {
        toast({
          title: 'Dados inválidos',
          description: error.message,
          variant: 'destructive',
        });
      }
      return;
    }

    try {
      await updateInvitation({
        invitationId: editingInvitation.id,
        email: normalizedEmail,
        role: editForm.role,
        expiresAt: expiresAtIso,
      });

      closeEditDialog();
    } catch {
      // Error toast is handled inside useInvitations.
    }
  };

  const handleDeleteInvitation = async () => {
    if (!deleteInvitationId) return;

    try {
      await deleteInvitation(deleteInvitationId);
      setDeleteInvitationId(null);
    } catch {
      // Error toast is handled inside useInvitations.
    }
  };

  const filteredInvitations = invitations.filter((invitation) => {
    const matchesSearch = invitation.email.toLowerCase().includes(search.toLowerCase());
    const status = getInvitationStatus(invitation);
    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const invitationToDelete = useMemo(
    () => invitations.find((invitation) => invitation.id === deleteInvitationId) || null,
    [deleteInvitationId, invitations]
  );

  const copyInviteLink = async (token: string) => {
    const inviteUrl = `${window.location.origin}/auth?invite=${token}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast({ title: 'Link de convite copiado' });
    } catch {
      toast({
        title: 'Erro ao copiar link',
        description: 'Copie manualmente o link de convite',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'used':
        return <Badge variant="secondary">Usado</Badge>;
      case 'expired':
        return <Badge variant="outline">Expirado</Badge>;
      case 'pending':
        return <Badge>Pendente</Badge>;
      default:
        return null;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gerenciamento de Convites</h1>
            <p className="text-muted-foreground">
              Visualize e gerencie convites de usuários
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Convite
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="used">Usados</SelectItem>
                  <SelectItem value="expired">Expirados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Convites ({filteredInvitations.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando convites...
              </div>
            ) : filteredInvitations.length === 0 ? (
              <EmptyState
                icon={Mail}
                title="Nenhum convite encontrado"
                description="Crie um novo convite ou ajuste os filtros para visualizar resultados."
                action={{
                  label: 'Criar convite',
                  onClick: () => setCreateDialogOpen(true),
                }}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead>Expira em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvitations.map((invitation) => {
                    const status = getInvitationStatus(invitation);
                    const roleInfo = ROLES.find((r) => r.value === invitation.role);

                    return (
                      <TableRow key={invitation.id}>
                        <TableCell className="font-medium">{invitation.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{roleInfo?.label || invitation.role}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(status)}</TableCell>
                        <TableCell>
                          {format(new Date(invitation.created_at), 'dd/MM/yyyy HH:mm', {
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell>
                          {format(new Date(invitation.expires_at), 'dd/MM/yyyy HH:mm', {
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            {status === 'pending' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyInviteLink(invitation.token)}
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copiar Link
                              </Button>
                            )}
                            {status !== 'used' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(invitation)}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                              </Button>
                            )}
                            <Button
                              variant={status === 'pending' ? 'destructive' : 'outline'}
                              size="sm"
                              onClick={() => setDeleteInvitationId(invitation.id)}
                            >
                              {status === 'pending' ? (
                                <XCircle className="h-4 w-4 mr-2" />
                              ) : (
                                <Trash2 className="h-4 w-4 mr-2" />
                              )}
                              {status === 'pending' ? 'Revogar' : 'Excluir'}
                            </Button>
                            {status === 'used' && (
                              <Button variant="ghost" size="sm" disabled>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Utilizado
                              </Button>
                            )}
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
      </div>

      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) clearCreateForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Convite</DialogTitle>
            <DialogDescription>
              Crie um convite para adicionar um usuário ao sistema.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateInvitation} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-invite-email">Email</Label>
              <Input
                id="new-invite-email"
                type="email"
                placeholder="usuario@exemplo.com"
                value={createForm.email}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-invite-role">Função</Label>
              <Select
                value={createForm.role}
                onValueChange={(value) => setCreateForm((prev) => ({ ...prev, role: value as AppRole }))}
              >
                <SelectTrigger id="new-invite-role">
                  <SelectValue placeholder="Selecione a função" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreateDialogOpen(false);
                  clearCreateForm();
                }}
                disabled={isCreating}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar Convite
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={(open) => (!open ? closeEditDialog() : setEditDialogOpen(true))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Convite</DialogTitle>
            <DialogDescription>
              Atualize email, função e validade do convite selecionado.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateInvitation} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-invite-email">Email</Label>
              <Input
                id="edit-invite-email"
                type="email"
                placeholder="usuario@exemplo.com"
                value={editForm.email}
                onChange={(event) => setEditForm((prev) => ({ ...prev, email: event.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-invite-role">Função</Label>
              <Select
                value={editForm.role}
                onValueChange={(value) => setEditForm((prev) => ({ ...prev, role: value as AppRole }))}
              >
                <SelectTrigger id="edit-invite-role">
                  <SelectValue placeholder="Selecione a função" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-invite-expiration">Expira em</Label>
              <Input
                id="edit-invite-expiration"
                type="datetime-local"
                value={editForm.expiresAt}
                onChange={(event) => setEditForm((prev) => ({ ...prev, expiresAt: event.target.value }))}
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeEditDialog} disabled={isUpdating}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteInvitationId} onOpenChange={() => setDeleteInvitationId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {invitationToDelete && getInvitationStatus(invitationToDelete) === 'pending'
                ? 'Revogar convite pendente?'
                : 'Excluir convite?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {invitationToDelete
                ? `Esta ação removerá o convite de ${invitationToDelete.email}.`
                : 'Esta ação não pode ser desfeita.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteInvitation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
