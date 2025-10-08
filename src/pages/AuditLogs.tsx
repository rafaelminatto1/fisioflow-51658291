import { useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { Search, Eye, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ACTION_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  ROLE_CREATED: { label: 'Função Criada', variant: 'default' },
  ROLE_UPDATED: { label: 'Função Atualizada', variant: 'secondary' },
  ROLE_DELETED: { label: 'Função Removida', variant: 'destructive' },
  INVITATION_CREATED: { label: 'Convite Criado', variant: 'default' },
  INVITATION_USED: { label: 'Convite Usado', variant: 'secondary' },
};

export default function AuditLogs() {
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const { logs, isLoading } = useAuditLogs(
    actionFilter !== 'all' ? { action: actionFilter } : undefined
  );

  const filteredLogs = logs.filter((log) => {
    return tableFilter === 'all' || log.table_name === tableFilter;
  });

  const uniqueTables = Array.from(new Set(logs.map((log) => log.table_name)));

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Logs de Auditoria</h1>
          <p className="text-muted-foreground">
            Visualize todas as ações de segurança do sistema
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Filtrar por ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  {Object.entries(ACTION_LABELS).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={tableFilter} onValueChange={setTableFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por tabela" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as tabelas</SelectItem>
                  {uniqueTables.map((table) => (
                    <SelectItem key={table} value={table}>
                      {table}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Eventos de Segurança ({filteredLogs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingSkeleton type="table" rows={8} />
            ) : filteredLogs.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Nenhum log encontrado"
                description="Não há eventos de segurança registrados com esses filtros."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Tabela</TableHead>
                    <TableHead className="text-right">Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => {
                    const actionInfo = ACTION_LABELS[log.action] || {
                      label: log.action,
                      variant: 'outline' as const,
                    };

                    return (
                      <TableRow key={log.id}>
                        <TableCell>
                          {log.timestamp
                            ? format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss', {
                                locale: ptBR,
                              })
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {log.user_name || 'Sistema'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {log.user_email || '-'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={actionInfo.variant}>
                            {actionInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <code className="text-sm">{log.table_name}</code>
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Eye
                                className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-foreground inline-block"
                                onClick={() => setSelectedLog(log)}
                              />
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Detalhes do Log</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-semibold mb-2">Informações Gerais</h4>
                                  <dl className="grid grid-cols-2 gap-2 text-sm">
                                    <dt className="text-muted-foreground">ID:</dt>
                                    <dd className="font-mono">{log.id}</dd>
                                    <dt className="text-muted-foreground">Ação:</dt>
                                    <dd>{actionInfo.label}</dd>
                                    <dt className="text-muted-foreground">Tabela:</dt>
                                    <dd>{log.table_name}</dd>
                                  </dl>
                                </div>
                                {log.old_data && (
                                  <div>
                                    <h4 className="font-semibold mb-2">Dados Antigos</h4>
                                    <pre className="bg-muted p-3 rounded text-xs overflow-auto">
                                      {JSON.stringify(log.old_data, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {log.new_data && (
                                  <div>
                                    <h4 className="font-semibold mb-2">Dados Novos</h4>
                                    <pre className="bg-muted p-3 rounded text-xs overflow-auto">
                                      {JSON.stringify(log.new_data, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
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
