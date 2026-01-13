import { useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useInvitations } from '@/hooks/useInvitations';
import { Search, XCircle, Copy, CheckCircle } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';

type AppRole = 'admin' | 'fisioterapeuta' | 'estagiario' | 'paciente';

const ROLES: { value: AppRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'fisioterapeuta', label: 'Fisioterapeuta' },
  { value: 'estagiario', label: 'Estagiário' },
  { value: 'paciente', label: 'Paciente' },
];

export default function InvitationManagement() {
  const { invitations, isLoading, revokeInvitation } = useInvitations();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const getInvitationStatus = (invitation: { used_at?: string | Date; expires_at: string | Date }) => {
    if (invitation.used_at) return 'used';
    if (isPast(new Date(invitation.expires_at))) return 'expired';
    return 'pending';
  };

  const filteredInvitations = invitations.filter((invitation) => {
    const matchesSearch = invitation.email.toLowerCase().includes(search.toLowerCase());
    const status = getInvitationStatus(invitation);
    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const copyInviteLink = (token: string) => {
    const inviteUrl = `${window.location.origin}/auth?invite=${token}`;
    navigator.clipboard.writeText(inviteUrl);
    toast({ title: 'Link de convite copiado' });
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
        <div>
          <h1 className="text-3xl font-bold">Gerenciamento de Convites</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie convites de usuários
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
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyInviteLink(invitation.token)}
                                >
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copiar Link
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => revokeInvitation(invitation.id)}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Revogar
                                </Button>
                              </>
                            )}
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
    </MainLayout>
  );
}
