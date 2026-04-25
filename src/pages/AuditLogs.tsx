import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

import { useAuditLogs, useExportAuditLogs, useBackups } from "@/hooks/useAuditLogs";
import {
  Search,
  FileText,
  Download,
  Database,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Shield,
  Clock,
  HardDrive,
  CheckCircle,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import LogTableRow from "@/components/audit/LogTableRow";

const ACTION_LABELS: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive";
    icon: typeof Plus;
  }
> = {
  INSERT: { label: "Criação", variant: "default", icon: Plus },
  UPDATE: { label: "Atualização", variant: "secondary", icon: Edit },
  DELETE: { label: "Exclusão", variant: "destructive", icon: Trash2 },
  ROLE_CREATED: { label: "Função Criada", variant: "default", icon: Plus },
  ROLE_UPDATED: {
    label: "Função Atualizada",
    variant: "secondary",
    icon: Edit,
  },
  ROLE_DELETED: {
    label: "Função Removida",
    variant: "destructive",
    icon: Trash2,
  },
  INVITATION_CREATED: {
    label: "Convite Criado",
    variant: "default",
    icon: Plus,
  },
  INVITATION_USED: {
    label: "Convite Usado",
    variant: "secondary",
    icon: CheckCircle,
  },
  LOGIN_SUCCESS: {
    label: "Login Sucesso",
    variant: "default",
    icon: CheckCircle,
  },
  LOGIN_FAILURE: {
    label: "Login Falha",
    variant: "destructive",
    icon: AlertCircle,
  },
};

const TABLE_LABELS: Record<string, string> = {
  patients: "Pacientes",
  appointments: "Agendamentos",
  contas_financeiras: "Financeiro",
  profiles: "Perfis",
  user_roles: "Funções",
  session_packages: "Pacotes",
  eventos: "Eventos",
  leads: "Leads",
  exercises: "Exercícios",
  vouchers: "Vouchers",
  auth: "Autenticação",
  report: "Relatórios",
  evolutions: "Evoluções",
};

export default function AuditLogs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "audit";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [quickFilter, setQuickFilter] = useState<string>("all");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  const applyQuickFilter = (filter: string) => {
    setQuickFilter(filter);
    switch (filter) {
      case "logins":
        setActionFilter("all");
        setTableFilter("auth");
        break;
      case "clinical":
        setActionFilter("all");
        setTableFilter("evolutions");
        break;
      case "financial":
        setActionFilter("all");
        setTableFilter("contas_financeiras");
        break;
      case "failures":
        setActionFilter("LOGIN_FAILURE");
        setTableFilter("all");
        break;
      default:
        setActionFilter("all");
        setTableFilter("all");
    }
  };

  const setDatePreset = (preset: "today" | "week" | "month") => {
    const end = new Date();
    const start = new Date();
    if (preset === "today") {
      start.setHours(0, 0, 0, 0);
    } else if (preset === "week") {
      start.setDate(start.getDate() - 7);
    } else if (preset === "month") {
      start.setMonth(start.getMonth() - 1);
    }
    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  };

  const { mutate: exportLogs, isPending: isExporting } = useExportAuditLogs();
  const { logs, stats, isLoading, refetch, uniqueActions, uniqueTables } = useAuditLogs({
    action: actionFilter === "all" ? undefined : actionFilter,
    tableName: tableFilter === "all" ? undefined : tableFilter,
    searchTerm: searchTerm,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
  });
  const { backups, isLoading: backupsLoading, createBackup, stats: backupStats } = useBackups();

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Auditoria & Segurança</h1>
            <p className="text-muted-foreground">Logs de auditoria, segurança e backups</p>
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

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList>
            <TabsTrigger value="audit">
              <FileText className="h-4 w-4 mr-2" />
              Auditoria de Dados
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="h-4 w-4 mr-2" />
              Segurança
            </TabsTrigger>
            <TabsTrigger value="backup">
              <Database className="h-4 w-4 mr-2" />
              Backups
            </TabsTrigger>
          </TabsList>

          <TabsContent value="audit" className="space-y-4">
            {/* Quick Filters */}
            <div className="flex flex-wrap gap-2 mb-2">
              <Button
                variant={quickFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => applyQuickFilter("all")}
                className="rounded-full"
              >
                Tudo
              </Button>
              <Button
                variant={quickFilter === "logins" ? "default" : "outline"}
                size="sm"
                onClick={() => applyQuickFilter("logins")}
                className="rounded-full gap-1.5"
              >
                <Shield className="h-3.5 w-3.5" /> Logins
              </Button>
              <Button
                variant={quickFilter === "clinical" ? "default" : "outline"}
                size="sm"
                onClick={() => applyQuickFilter("clinical")}
                className="rounded-full gap-1.5"
              >
                <FileText className="h-3.5 w-3.5" /> Clínico
              </Button>
              <Button
                variant={quickFilter === "financial" ? "default" : "outline"}
                size="sm"
                onClick={() => applyQuickFilter("financial")}
                className="rounded-full gap-1.5"
              >
                <Download className="h-3.5 w-3.5" /> Financeiro
              </Button>
              <Button
                variant={quickFilter === "failures" ? "destructive" : "outline"}
                size="sm"
                onClick={() => applyQuickFilter("failures")}
                className="rounded-full gap-1.5"
              >
                <AlertCircle className="h-3.5 w-3.5" /> Só Falhas
              </Button>

              <Separator orientation="vertical" className="mx-1 h-8" />

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDatePreset("today")}
                className="text-xs"
              >
                Hoje
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDatePreset("week")}
                className="text-xs"
              >
                Últimos 7 dias
              </Button>
            </div>

            {/* Filters */}
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-base">Filtros Avançados</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome, e-mail ou descrição..."
                      value={searchTerm}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setSearchTerm(e.target.value)
                      }
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
                  <div className="flex flex-col gap-1">
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setStartDate(e.target.value)
                      }
                      className="text-xs"
                      placeholder="Início"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEndDate(e.target.value)
                      }
                      className="text-xs"
                      placeholder="Fim"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Logs Table */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Eventos ({logs.filter((l) => !l.action.startsWith("LOGIN_")).length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <LoadingSkeleton type="table" rows={8} />
                ) : logs.filter((l) => !l.action.startsWith("LOGIN_")).length === 0 ? (
                  <EmptyState
                    icon={FileText}
                    title="Nenhum log encontrado"
                    description="Não há eventos de dados registrados com esses filtros."
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
                        {logs
                          .filter((l) => !l.action.startsWith("LOGIN_"))
                          .map((log) => (
                            <LogTableRow key={log.id} log={log} />
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Total de Tentativas
                    </CardTitle>
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.logins.total}</div>
                  <p className="text-xs text-muted-foreground mt-1">Últimas 500 tentativas</p>
                </CardContent>
              </Card>

              <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Taxa de Sucesso
                    </CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.logins.successRate.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground mt-1">Logins bem-sucedidos</p>
                </CardContent>
              </Card>

              <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Atividades Suspeitas
                    </CardTitle>
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.logins.suspicious}</div>
                  <p className="text-xs text-muted-foreground mt-1">Falhas na última hora</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Tentativas de Login Recentes</CardTitle>
                <CardDescription>Acompanhe acessos e tentativas de autenticação</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <LoadingSkeleton type="table" rows={5} />
                ) : logs.filter((l) => l.action.startsWith("LOGIN_")).length === 0 ? (
                  <EmptyState
                    icon={Shield}
                    title="Nenhum registro de acesso"
                    description="Tentativas de login aparecerão aqui."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead>Email / Usuário</TableHead>
                          <TableHead>IP</TableHead>
                          <TableHead>Dispositivo / Navegador</TableHead>
                          <TableHead>Data/Hora</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs
                          .filter((l) => l.action.startsWith("LOGIN_"))
                          .map((log) => (
                            <TableRow key={log.id}>
                              <TableCell>
                                <Badge
                                  variant={
                                    log.action === "LOGIN_SUCCESS" ? "default" : "destructive"
                                  }
                                  className="gap-1"
                                >
                                  {log.action === "LOGIN_SUCCESS" ? (
                                    <CheckCircle className="h-3 w-3" />
                                  ) : (
                                    <XCircle className="h-3 w-3" />
                                  )}
                                  {log.action === "LOGIN_SUCCESS" ? "Sucesso" : "Falha"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">
                                  {(log.metadata as any)?.email || log.user_email || "-"}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {log.user_name || "Desconhecido"}
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {log.ip_address || "N/A"}
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                                {log.user_agent || "N/A"}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-xs">
                                {format(new Date(log.timestamp), "dd/MM/yyyy HH:mm", {
                                  locale: ptBR,
                                })}
                              </TableCell>
                            </TableRow>
                          ))}
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
                          ? format(new Date(backupStats.lastBackup.created_at), "dd/MM HH:mm", {
                              locale: ptBR,
                            })
                          : "Nunca"}
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
                    <CardDescription>Crie um backup manual dos dados do sistema</CardDescription>
                  </div>
                  <Button
                    onClick={() => createBackup.mutate("manual")}
                    disabled={createBackup.isPending}
                  >
                    <HardDrive className="h-4 w-4 mr-2" />
                    {createBackup.isPending ? "Criando..." : "Criar Backup Manual"}
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
                                {backup.backup_type === "daily"
                                  ? "Diário"
                                  : backup.backup_type === "weekly"
                                    ? "Semanal"
                                    : "Manual"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  backup.status === "completed"
                                    ? "default"
                                    : backup.status === "failed"
                                      ? "destructive"
                                      : backup.status === "expired"
                                        ? "secondary"
                                        : "outline"
                                }
                              >
                                {backup.status === "completed" && (
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                )}
                                {backup.status === "failed" && <XCircle className="h-3 w-3 mr-1" />}
                                {backup.status === "pending" && (
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                )}
                                {backup.status === "completed"
                                  ? "Concluído"
                                  : backup.status === "failed"
                                    ? "Falhou"
                                    : backup.status === "expired"
                                      ? "Expirado"
                                      : "Pendente"}
                              </Badge>
                            </TableCell>
                            <TableCell>{backup.tables_included?.length || 0} tabelas</TableCell>
                            <TableCell>{totalRecords.toLocaleString("pt-BR")} registros</TableCell>
                            <TableCell>
                              {format(new Date(backup.created_at), "dd/MM/yyyy HH:mm", {
                                locale: ptBR,
                              })}
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
