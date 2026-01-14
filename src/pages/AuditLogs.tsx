import { useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAuditLogs, useExportAuditLogs, useBackups } from '@/hooks/useAuditLogs';
import {
  Search, Eye, FileText, Download, Database, RefreshCw,
  Plus, Minus, Edit, Trash2, Shield, Clock, HardDrive,
  CheckCircle, AlertCircle, XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ACTION_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: typeof Plus }> = {
  INSERT: { label: 'Criação', variant: 'default', icon: Plus },
  UPDATE: { label: 'Atualização', variant: 'secondary', icon: Edit },
  DELETE: { label: 'Exclusão', variant: 'destructive', icon: Trash2 },
  ROLE_CREATED: { label: 'Função Criada', variant: 'default', icon: Plus },
  ROLE_UPDATED: { label: 'Função Atualizada', variant: 'secondary', icon: Edit },
  ROLE_DELETED: { label: 'Função Removida', variant: 'destructive', icon: Trash2 },
  INVITATION_CREATED: { label: 'Convite Criado', variant: 'default', icon: Plus },
  INVITATION_USED: { label: 'Convite Usado', variant: 'secondary', icon: CheckCircle },
};

const TABLE_LABELS: Record<string, string> = {
  patients: 'Pacientes',
  appointments: 'Agendamentos',
  contas_financeiras: 'Financeiro',
  profiles: 'Perfis',
  user_roles: 'Funções',
  session_packages: 'Pacotes',
  eventos: 'Eventos',
  leads: 'Leads',
  exercises: 'Exercícios',
  vouchers: 'Vouchers',
};

function DiffViewer({ oldData, newData, changes }: {
  oldData: Record<string, unknown>;
  newData: Record<string, unknown>;
  changes: Record<string, { old: unknown; new: unknown }> | null;
}) {
  if (changes && Object.keys(changes).length > 0) {
    return (
      <div className="space-y-2">
        {Object.entries(changes).map(([key, value]: [string, { old: unknown; new: unknown }]) => (
          <div key={key} className="text-sm border-b pb-2">
            <span className="font-medium text-muted-foreground">{key}:</span>
            <div className="flex gap-4 mt-1">
              <div className="flex items-center gap-1">
                <Minus className="h-3 w-3 text-destructive" />
                <code className="text-xs bg-destructive/10 px-1 rounded">
                  {JSON.stringify(value.old)}
                </code>
              </div>
              <div className="flex items-center gap-1">
                <Plus className="h-3 w-3 text-green-500" />
                <code className="text-xs bg-green-500/10 px-1 rounded">
                  {JSON.stringify(value.new)}
                </code>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {oldData && (
        <div>
          <h4 className="font-semibold mb-2 text-destructive">Dados Anteriores</h4>
          <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-60">
            {JSON.stringify(oldData, null, 2)}
          </pre>
        </div>
      )}
      {newData && (
        <div>
          <h4 className="font-semibold mb-2 text-green-500">Dados Novos</h4>
          <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-60">
            {JSON.stringify(newData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function AuditLogs() {
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const { logs, isLoading, refetch, uniqueTables, uniqueActions, stats } = useAuditLogs({
    action: actionFilter !== 'all' ? actionFilter : undefined,
    tableName: tableFilter !== 'all' ? tableFilter : undefined,
    searchTerm: searchTerm || undefined,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
  });

  const { mutate: exportLogs, isPending: isExporting } = useExportAuditLogs();
  const { backups, isLoading: backupsLoading, createBackup, stats: backupStats } = useBackups();

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Auditoria & Backup</h1>
            <p className="text-muted-foreground">
              Logs de auditoria e gerenciamento de backups
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button
              variant="outline"
              onClick={() => exportLogs(logs)}
              disabled={isExporting || logs.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total de Logs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-500/10">
                  <Plus className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.inserts}</p>
                  <p className="text-sm text-muted-foreground">Criações</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-yellow-500/10">
                  <Edit className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.updates}</p>
                  <p className="text-sm text-muted-foreground">Atualizações</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-destructive/10">
                  <Trash2 className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.deletes}</p>
                  <p className="text-sm text-muted-foreground">Exclusões</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="audit" className="space-y-4">
          <TabsList>
            <TabsTrigger value="audit">
              <Shield className="h-4 w-4 mr-2" />
              Logs de Auditoria
            </TabsTrigger>
            <TabsTrigger value="backup">
              <Database className="h-4 w-4 mr-2" />
              Backups
            </TabsTrigger>
          </TabsList>

          <TabsContent value="audit" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Filtros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar..."
                      value={searchTerm}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Ação" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as ações</SelectItem>
                      {uniqueActions.map((action) => (
                        <SelectItem key={action} value={action}>
                          {ACTION_LABELS[action]?.label || action}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={tableFilter} onValueChange={setTableFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tabela" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as tabelas</SelectItem>
                      {uniqueTables.map((table) => (
                        <SelectItem key={table} value={table}>
                          {TABLE_LABELS[table] || table}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
                    placeholder="Data início"
                  />
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
                    placeholder="Data fim"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Logs Table */}
            <Card>
              <CardHeader>
                <CardTitle>Eventos ({logs.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <LoadingSkeleton type="table" rows={8} />
                ) : logs.length === 0 ? (
                  <EmptyState
                    icon={FileText}
                    title="Nenhum log encontrado"
                    description="Não há eventos registrados com esses filtros."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data/Hora</TableHead>
                          <TableHead>Usuário</TableHead>
                          <TableHead>Ação</TableHead>
                          <TableHead>Tabela</TableHead>
                          <TableHead>Registro</TableHead>
                          <TableHead className="text-right">Detalhes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs.map((log) => {
                          const actionInfo = ACTION_LABELS[log.action] || {
                            label: log.action,
                            variant: 'outline' as const,
                            icon: FileText,
                          };
                          const ActionIcon = actionInfo.icon;

                          return (
                            <TableRow key={log.id}>
                              <TableCell className="whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  {log.timestamp
                                    ? format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss', {
                                      locale: ptBR,
                                    })
                                    : '-'}
                                </div>
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
                                <Badge variant={actionInfo.variant} className="gap-1">
                                  <ActionIcon className="h-3 w-3" />
                                  {actionInfo.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <code className="text-sm bg-muted px-2 py-1 rounded">
                                  {TABLE_LABELS[log.table_name] || log.table_name}
                                </code>
                              </TableCell>
                              <TableCell>
                                <code className="text-xs text-muted-foreground">
                                  {log.record_id?.substring(0, 8) || '-'}...
                                </code>
                              </TableCell>
                              <TableCell className="text-right">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                                    <DialogHeader>
                                      <DialogTitle>Detalhes do Log</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                          <span className="text-muted-foreground">ID:</span>
                                          <code className="ml-2 font-mono">{log.id}</code>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Registro:</span>
                                          <code className="ml-2 font-mono">{log.record_id || '-'}</code>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Ação:</span>
                                          <Badge variant={actionInfo.variant} className="ml-2">
                                            {actionInfo.label}
                                          </Badge>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Tabela:</span>
                                          <span className="ml-2">{TABLE_LABELS[log.table_name] || log.table_name}</span>
                                        </div>
                                      </div>

                                      <div className="border-t pt-4">
                                        <h4 className="font-semibold mb-3">Alterações</h4>
                                        <DiffViewer
                                          oldData={log.old_data}
                                          newData={log.new_data}
                                          changes={log.changes}
                                        />
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="backup" className="space-y-4">
            {/* Backup Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-primary/10">
                      <Database className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{backupStats.total}</p>
                      <p className="text-sm text-muted-foreground">Total Backups</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-green-500/10">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{backupStats.completed}</p>
                      <p className="text-sm text-muted-foreground">Concluídos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-destructive/10">
                      <XCircle className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{backupStats.failed}</p>
                      <p className="text-sm text-muted-foreground">Falhas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-blue-500/10">
                      <Clock className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {backupStats.lastBackup
                          ? format(new Date(backupStats.lastBackup.created_at), 'dd/MM HH:mm', { locale: ptBR })
                          : 'Nunca'}
                      </p>
                      <p className="text-sm text-muted-foreground">Último Backup</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Backup Actions */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Criar Backup</CardTitle>
                    <CardDescription>
                      Crie um backup manual dos dados do sistema
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => createBackup.mutate('manual')}
                    disabled={createBackup.isPending}
                  >
                    <HardDrive className="h-4 w-4 mr-2" />
                    {createBackup.isPending ? 'Criando...' : 'Criar Backup Manual'}
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {/* Backups List */}
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Backups</CardTitle>
              </CardHeader>
              <CardContent>
                {backupsLoading ? (
                  <LoadingSkeleton type="table" rows={5} />
                ) : backups.length === 0 ? (
                  <EmptyState
                    icon={Database}
                    title="Nenhum backup encontrado"
                    description="Crie seu primeiro backup clicando no botão acima."
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tabelas</TableHead>
                        <TableHead>Registros</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {backups.map((backup) => {
                        const totalRecords = backup.records_count
                          ? Object.values(backup.records_count).reduce((a, b) => a + b, 0)
                          : 0;

                        return (
                          <TableRow key={backup.id}>
                            <TableCell className="font-mono text-sm">
                              {backup.backup_name}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {backup.backup_type === 'daily' ? 'Diário' :
                                  backup.backup_type === 'weekly' ? 'Semanal' : 'Manual'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  backup.status === 'completed' ? 'default' :
                                    backup.status === 'failed' ? 'destructive' :
                                      backup.status === 'expired' ? 'secondary' : 'outline'
                                }
                              >
                                {backup.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                                {backup.status === 'failed' && <XCircle className="h-3 w-3 mr-1" />}
                                {backup.status === 'pending' && <AlertCircle className="h-3 w-3 mr-1" />}
                                {backup.status === 'completed' ? 'Concluído' :
                                  backup.status === 'failed' ? 'Falhou' :
                                    backup.status === 'expired' ? 'Expirado' : 'Pendente'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {backup.tables_included?.length || 0} tabelas
                            </TableCell>
                            <TableCell>
                              {totalRecords.toLocaleString('pt-BR')} registros
                            </TableCell>
                            <TableCell>
                              {format(new Date(backup.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}