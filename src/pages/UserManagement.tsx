import { useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { EmptyState } from '@/components/web/ui/empty-state';
import { LoadingSkeleton } from '@/components/web/ui/loading-skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/web/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/shared/ui/dialog';
import { useUsers } from '@/hooks/useUsers';
import { Search, UserPlus, UserMinus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type AppRole = 'admin' | 'fisioterapeuta' | 'estagiario' | 'paciente';

const ROLES: { value: AppRole; label: string; variant: 'default' | 'secondary' | 'outline' }[] = [
  { value: 'admin', label: 'Admin', variant: 'default' },
  { value: 'fisioterapeuta', label: 'Fisioterapeuta', variant: 'secondary' },
  { value: 'estagiario', label: 'Estagiário', variant: 'outline' },
  { value: 'paciente', label: 'Paciente', variant: 'outline' },
];

export default function UserManagement() {
  const { users, isLoading, addRole, removeRole } = useUsers();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<AppRole>('paciente');

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.full_name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());

    const matchesRole =
      roleFilter === 'all' || user.roles.includes(roleFilter as AppRole);

    return matchesSearch && matchesRole;
  });

  const handleAddRole = (userId: string) => {
    addRole({ userId, role: newRole });
    setSelectedUser(null);
  };

  const handleRemoveRole = (userId: string, role: AppRole) => {
    removeRole({ userId, role });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gerenciamento de Usuários</h1>
          <p className="text-muted-foreground">
            Gerencie usuários e suas funções no sistema
          </p>
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
                  placeholder="Buscar por nome ou email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as funções</SelectItem>
                  {ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usuários ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingSkeleton type="table" rows={5} />
            ) : filteredUsers.length === 0 ? (
              <EmptyState
                icon={UserPlus}
                title="Nenhum usuário encontrado"
                description="Ajuste os filtros ou aguarde novos usuários se cadastrarem."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Funções</TableHead>
                    <TableHead>Cadastrado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <div className="flex gap-2 flex-wrap">
                          {user.roles.length === 0 ? (
                            <Badge variant="outline">Sem função</Badge>
                          ) : (
                            user.roles.map((role) => {
                              const roleInfo = ROLES.find((r) => r.value === role);
                              return (
                                <Badge
                                  key={role}
                                  variant={roleInfo?.variant || 'outline'}
                                  className="gap-1"
                                >
                                  {roleInfo?.label || role}
                                  <UserMinus
                                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                                    onClick={() => handleRemoveRole(user.id, role)}
                                  />
                                </Badge>
                              );
                            })
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(user.created_at), 'dd/MM/yyyy', {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog
                          open={selectedUser === user.id}
                          onOpenChange={(open) =>
                            setSelectedUser(open ? user.id : null)
                          }
                        >
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <UserPlus className="h-4 w-4 mr-2" />
                              Adicionar Função
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>
                                Adicionar Função para {user.full_name}
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                              <Select
                                value={newRole}
                                onValueChange={(value) => setNewRole(value as AppRole)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione uma função" />
                                </SelectTrigger>
                                <SelectContent>
                                  {ROLES.map((role) => (
                                    <SelectItem
                                      key={role.value}
                                      value={role.value}
                                      disabled={user.roles.includes(role.value)}
                                    >
                                      {role.label}
                                      {user.roles.includes(role.value) && ' (já possui)'}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                onClick={() => handleAddRole(user.id)}
                                className="w-full"
                              >
                                Adicionar Função
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
